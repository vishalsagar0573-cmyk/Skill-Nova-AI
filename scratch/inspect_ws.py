import subprocess, tempfile, json, time, urllib.request, os, socket, base64

chrome_exe = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
temp_profile = tempfile.mkdtemp()

proc = subprocess.Popen([
    chrome_exe,
    '--headless=old',
    '--no-sandbox',
    '--remote-debugging-port=9227',
    f'--user-data-dir={temp_profile}',
    '--window-size=1440,900',
    'http://localhost:5173/test-auth-light.html'
])
time.sleep(3)

try:
    tabs = json.loads(urllib.request.urlopen('http://localhost:9227/json').read())
    target_tab = [t for t in tabs if 'localhost:5173' in t.get('url', '')][0]
    
    ws_url = target_tab['webSocketDebuggerUrl']
    parts = ws_url.replace('ws://', '').split('/', 1)
    host, port = parts[0].split(':')
    path = '/' + parts[1]
    
    s = socket.create_connection((host, int(port)))
    key = base64.b64encode(os.urandom(16)).decode('utf-8')
    handshake = f'GET {path} HTTP/1.1\r\nHost: {host}:{port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n'
    s.sendall(handshake.encode('utf-8'))
    resp = s.recv(4096)
    
    eval_code = 'JSON.stringify({ className: document.documentElement.className, appBg: getComputedStyle(document.documentElement).getPropertyValue("--color-app-bg"), bodyBg: getComputedStyle(document.body).backgroundColor, divBg: getComputedStyle(document.querySelector(".min-h-screen")).backgroundColor, elAtPoint: document.elementFromPoint(270, 200).className, elTag: document.elementFromPoint(270, 200).tagName })'
    msg = json.dumps({'id': 1, 'method': 'Runtime.evaluate', 'params': {'expression': eval_code}}).encode('utf-8')
    
    if len(msg) < 126:
        header = bytearray([0x81, 0x80 | len(msg)])
    else:
        header = bytearray([0x81, 0x80 | 126, (len(msg) >> 8) & 0xFF, len(msg) & 0xFF])
        
    mask = os.urandom(4)
    header.extend(mask)
    masked_payload = bytearray(b ^ mask[i % 4] for i, b in enumerate(msg))
    s.sendall(header + masked_payload)
    
    raw = s.recv(4096)
    json_start = raw.find(b'{"id":1')
    if json_start != -1:
        res_data = json.loads(raw[json_start:].decode('utf-8', errors='ignore'))
        val_str = res_data.get('result', {}).get('result', {}).get('value')
        print('EVAL RESULT:', val_str)
    else:
        print('Raw response:', raw)
    s.close()
finally:
    proc.terminate()
