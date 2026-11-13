import subprocess
import os
import json

chrome_exe = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
temp_profile = r'C:\Users\visha\AppData\Local\Temp\chrome_profile_auth_light_desktop.png'

cmd = [
    chrome_exe,
    '--headless=old',
    '--no-sandbox',
    f'--user-data-dir={temp_profile}',
    '--dump-dom',
    'http://localhost:5173/'
]

res = subprocess.run(cmd, capture_output=True, text=True)
with open(r'C:\Users\visha\AppData\Local\Temp\rendered_dom.html', 'w', encoding='utf-8') as f:
    f.write(res.stdout)

print('DOM size:', len(res.stdout))
