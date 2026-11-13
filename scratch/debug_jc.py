import subprocess, os, sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
from services.auth import create_access_token

token = create_access_token(data={'sub': 'vishalsagar321@gmail.com'})
chrome_exe = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
cmd = [
    chrome_exe,
    '--headless=new',
    '--no-sandbox',
    '--virtual-time-budget=6000',
    '--dump-dom',
    f'http://localhost:5173/auth-helper.html?token={token}&target=/job-compatibility'
]
res = subprocess.run(cmd, capture_output=True, text=True)
print('Length of DOM:', len(res.stdout))
print('Contains AI Engineer:', 'AI Engineer' in res.stdout)
print('Contains Best Match:', 'Best Match' in res.stdout)
for line in res.stdout.splitlines():
    if 'AI Engineer' in line or 'Best Match' in line or 'opacity' in line:
        print('Line:', line[:120])
