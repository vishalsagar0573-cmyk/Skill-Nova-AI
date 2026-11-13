import subprocess
import os
import shutil
import sys
import time

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
from services.auth import create_access_token

token = create_access_token(data={'sub': 'vishalsagar321@gmail.com'})
print(f"Generated token for verification: {token[:20]}...")

screenshots_dir = r'C:\Users\visha\.gemini\antigravity\brain\6659bd04-566d-4abb-8b4b-076f7e49075d\screenshots'
os.makedirs(screenshots_dir, exist_ok=True)
chrome_exe = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
temp_dir = r'C:\Users\visha\AppData\Local\Temp'

# Test routes to verify
pages = [
    ('dashboard', '/'),
    ('competency_profile', '/competency-profile'),
    ('career_prediction', '/career-prediction'),
    ('skill_gap', '/skill-gap'),
    ('learning_path', '/learning-path'),
    ('job_compatibility', '/job-compatibility')
]

themes = ['light', 'dark']
window_size = '1440,900'

results = []

for page_name, route in pages:
    for theme in themes:
        filename = f"verify_{page_name}_{theme}.png"
        helper_url = f"http://localhost:5173/auth-helper.html?token={token}&theme={theme}&target={route}"
        
        temp_profile = os.path.join(temp_dir, f"chrome_prof_{page_name}_{theme}")
        if os.path.exists(temp_profile):
            shutil.rmtree(temp_profile, ignore_errors=True)
        temp_out = os.path.join(temp_dir, filename)
        
        cmd = [
            chrome_exe,
            '--headless=new',
            '--no-sandbox',
            f'--user-data-dir={temp_profile}',
            '--virtual-time-budget=5000',
            f'--window-size={window_size}',
            f'--screenshot={temp_out}',
            helper_url
        ]
        
        res = subprocess.run(cmd, capture_output=True, text=True)
        final_out = os.path.join(screenshots_dir, filename)
        if os.path.exists(temp_out):
            shutil.copy2(temp_out, final_out)
            size = os.path.getsize(final_out)
            print(f"Captured: {filename} ({size} bytes)")
            results.append({'file': filename, 'status': 'success', 'size': size})
        else:
            print(f"FAILED: {filename}. Error: {res.stderr[:200]}")
            results.append({'file': filename, 'status': 'failed', 'error': res.stderr[:200]})

print("\n--- Summary of Captures ---")
for r in results:
    print(r)
