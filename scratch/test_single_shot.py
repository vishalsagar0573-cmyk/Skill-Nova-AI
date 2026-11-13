import subprocess
import os
import shutil
import time

screenshots_dir = r'C:\Users\visha\.gemini\antigravity\brain\6659bd04-566d-4abb-8b4b-076f7e49075d\screenshots'
os.makedirs(screenshots_dir, exist_ok=True)
chrome_exe = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
temp_dir = r'C:\Users\visha\AppData\Local\Temp'

vite_proc = subprocess.Popen(
    ['npx.cmd', 'vite', 'preview', '--port', '5173'],
    cwd=r'c:\Users\visha\OneDrive\Desktop\mp\frontend',
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

time.sleep(3)

filename = 'test_preview_shot.png'
temp_profile = os.path.join(temp_dir, f'chrome_profile_{filename}')
if os.path.exists(temp_profile):
    shutil.rmtree(temp_profile, ignore_errors=True)
temp_out = os.path.join(temp_dir, filename)

cmd = [
    chrome_exe,
    '--headless=old',
    '--no-sandbox',
    f'--user-data-dir={temp_profile}',
    '--virtual-time-budget=3000',
    '--window-size=1920,1080',
    f'--screenshot={temp_out}',
    'http://localhost:5173/'
]

res = subprocess.run(cmd, capture_output=True, text=True)
print('CHROME STDERR:', res.stderr[:300])

vite_proc.terminate()
try:
    vite_proc.wait(timeout=2)
except Exception:
    vite_proc.kill()

if os.path.exists(temp_out):
    print('SUCCESS! Captured size:', os.path.getsize(temp_out))
else:
    print('Capture failed.')
