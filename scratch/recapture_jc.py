import subprocess, os, shutil, sys, time
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
from services.auth import create_access_token

token = create_access_token(data={'sub': 'vishalsagar321@gmail.com'})
screenshots_dir = r'C:\Users\visha\.gemini\antigravity\brain\6659bd04-566d-4abb-8b4b-076f7e49075d\screenshots'
chrome_exe = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
temp_dir = r'C:\Users\visha\AppData\Local\Temp'

for theme in ['light', 'dark']:
    filename = f"verify_job_compatibility_{theme}.png"
    helper_url = f"http://localhost:5173/auth-helper.html?token={token}&theme={theme}&target=/job-compatibility"
    temp_profile = os.path.join(temp_dir, f"chrome_prof_jc_{theme}")
    if os.path.exists(temp_profile):
        shutil.rmtree(temp_profile, ignore_errors=True)
    temp_out = os.path.join(temp_dir, filename)
    cmd = [
        chrome_exe,
        '--headless=new',
        '--no-sandbox',
        f'--user-data-dir={temp_profile}',
        '--virtual-time-budget=10000',
        '--run-all-compositor-stages-before-draw',
        '--window-size=1440,900',
        f'--screenshot={temp_out}',
        helper_url
    ]
    subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(temp_out):
        shutil.copy2(temp_out, os.path.join(screenshots_dir, filename))
        print(f"Captured {filename} ({os.path.getsize(temp_out)} bytes)")
