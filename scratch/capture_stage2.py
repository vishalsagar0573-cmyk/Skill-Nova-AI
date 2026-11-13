import subprocess
import os
import shutil
import time

screenshots_dir = r'C:\Users\visha\.gemini\antigravity\brain\6659bd04-566d-4abb-8b4b-076f7e49075d\screenshots'
os.makedirs(screenshots_dir, exist_ok=True)
chrome_exe = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
temp_dir = r'C:\Users\visha\AppData\Local\Temp'

# Copy helper test pages to dist so vite preview serves them
for test_file in ['test-login-light.html', 'test-login-dark.html', 'test-register-light.html', 'test-register-dark.html']:
    src = os.path.join(r'c:\Users\visha\OneDrive\Desktop\mp\frontend\public', test_file)
    dst = os.path.join(r'c:\Users\visha\OneDrive\Desktop\mp\frontend\dist', test_file)
    if os.path.exists(src):
        shutil.copy2(src, dst)

print('Starting Vite preview...')
vite_proc = subprocess.Popen(
    ['npx.cmd', 'vite', 'preview', '--port', '5173'],
    cwd=r'c:\Users\visha\OneDrive\Desktop\mp\frontend',
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

time.sleep(3)

targets = [
    ('login_light_desktop.png', 'http://localhost:5173/test-login-light.html', '1920,1080'),
    ('login_dark_desktop.png', 'http://localhost:5173/test-login-dark.html', '1920,1080'),
    ('login_light_laptop.png', 'http://localhost:5173/test-login-light.html', '1440,900'),
    ('login_dark_laptop.png', 'http://localhost:5173/test-login-dark.html', '1440,900'),
    ('register_light_desktop.png', 'http://localhost:5173/test-register-light.html', '1920,1080'),
    ('register_dark_desktop.png', 'http://localhost:5173/test-register-dark.html', '1920,1080'),
    ('login_mobile_light.png', 'http://localhost:5173/test-login-light.html', '390,844'),
    ('login_mobile_dark.png', 'http://localhost:5173/test-login-dark.html', '390,844')
]

for filename, url, window_size in targets:
    temp_profile = os.path.join(temp_dir, f'chrome_profile_{filename}')
    if os.path.exists(temp_profile):
        shutil.rmtree(temp_profile, ignore_errors=True)
    temp_out = os.path.join(temp_dir, filename)
    cmd = [
        chrome_exe,
        '--headless=new',
        '--no-sandbox',
        f'--user-data-dir={temp_profile}',
        '--virtual-time-budget=4000',
        f'--window-size={window_size}',
        f'--screenshot={temp_out}',
        url
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    final_out = os.path.join(screenshots_dir, filename)
    if os.path.exists(temp_out):
        shutil.copy2(temp_out, final_out)
        print(f'Captured: {filename} -> size {os.path.getsize(final_out)} bytes')
    else:
        print(f'Failed to capture: {filename}. Error: {res.stderr[:200]}')

vite_proc.terminate()
try:
    vite_proc.wait(timeout=2)
except Exception:
    vite_proc.kill()
print('All screenshot tasks finished.')
