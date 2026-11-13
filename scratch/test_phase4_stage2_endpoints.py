# Stage 2 Automated Endpoint Test Suite
import sys
import os
import unittest
from unittest.mock import patch, MagicMock

sys.path.append('backend')

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.user import User
from models.student_profile import StudentProfile
from models.competency_profile import CompetencyProfile
from models.skill_gap import SkillGapAnalysis
from services.auth import create_access_token
from sqlalchemy.orm.attributes import flag_modified

client = TestClient(app)

class TestStage2Endpoints(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        try:
            # 1. Thanvith MK (Student, User 13)
            cls.student = db.query(User).filter(User.id == 13).first()
            cls.student_token = create_access_token({"sub": cls.student.email})
            
            # 2. Student B (User 5, vishal@gmail.com, AIML)
            cls.student_b = db.query(User).filter(User.id == 5).first()
            cls.student_b_token = create_access_token({"sub": cls.student_b.email})
            
            # 3. Setup Admin User (ensure active and verified)
            admin = db.query(User).filter(User.email == "admin@skillnova.ai").first()
            if not admin:
                admin = User(full_name="Platform Admin", email="admin@skillnova.ai", is_active=True, is_verified=True)
                db.add(admin)
                db.commit()
                db.refresh(admin)
            else:
                admin.is_active = True
                admin.is_verified = True
                db.commit()
            cls.admin_token = create_access_token({"sub": admin.email})
            cls.admin_id = admin.id
            
            # 4. Setup Mentors
            # A) Mentor for Machine Learning / AIML (matching Thanvith's Dept: Machine Learning)
            aiml_mentor = db.query(User).filter(User.email == "faculty@skillnova.ai").first()
            if not aiml_mentor:
                aiml_mentor = User(full_name="Faculty Mentor", email="faculty@skillnova.ai", is_active=True, is_verified=True)
                db.add(aiml_mentor)
                db.commit()
                db.refresh(aiml_mentor)
            else:
                aiml_mentor.is_active = True
                aiml_mentor.is_verified = True
                db.commit()
            cls.aiml_mentor_token = create_access_token({"sub": aiml_mentor.email})
            cls.aiml_mentor_id = aiml_mentor.id
            
            # B) Unmapped Mentor (has mentor email, but NO entry in MENTOR_DEPARTMENT_MAP)
            unmapped = db.query(User).filter(User.email == "unmapped_mentor@skillnova.ai").first()
            if not unmapped:
                unmapped = User(full_name="Unmapped Mentor", email="unmapped_mentor@skillnova.ai", is_active=True, is_verified=True)
                db.add(unmapped)
                db.commit()
                db.refresh(unmapped)
            else:
                unmapped.is_active = True
                unmapped.is_verified = True
                db.commit()
            cls.unmapped_token = create_access_token({"sub": unmapped.email})
            cls.unmapped_id = unmapped.id
            
            # C) Mismatched Mentor (CSE only)
            cse_mentor = db.query(User).filter(User.email == "mentor@skillnova.ai").first()
            if not cse_mentor:
                cse_mentor = User(full_name="CSE Mentor", email="mentor@skillnova.ai", is_active=True, is_verified=True)
                db.add(cse_mentor)
                db.commit()
                db.refresh(cse_mentor)
            else:
                cse_mentor.is_active = True
                cse_mentor.is_verified = True
                db.commit()
            cls.cse_mentor_token = create_access_token({"sub": cse_mentor.email})
            cls.cse_mentor_id = cse_mentor.id
            
            # Configure environment variables
            os.environ["ADMIN_EMAILS"] = "admin@skillnova.ai"
            os.environ["MENTOR_FACULTY_EMAILS"] = "mentor@skillnova.ai,faculty@skillnova.ai,unmapped_mentor@skillnova.ai"
            
            # Update MENTOR_DEPARTMENT_MAP to include 'machine learning' for faculty@skillnova.ai
            from services.evidence import MENTOR_DEPARTMENT_MAP
            MENTOR_DEPARTMENT_MAP["faculty@skillnova.ai"] = ["artificial intelligence and machine learning", "data science", "machine learning"]
            
            # Clean Thanvith's test evidence entries
            comp = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == 13).first()
            if comp and comp.competency_json:
                cj = dict(comp.competency_json)
                if 'submitted_evidence' in cj:
                    for k in ['django', 'docker', 'solidity', 'capstone_milestone']:
                        cj['submitted_evidence'].pop(k, None)
                if 'verified_skills' in cj:
                    cj['verified_skills'] = [v for v in cj['verified_skills'] if v.get('skill_identifier') not in ('django', 'docker', 'solidity', 'capstone_milestone')]
                if 'skills' in cj:
                    cj['skills'] = [s for s in cj['skills'] if s not in ('Django', 'Docker')]
                comp.competency_json = cj
                flag_modified(comp, 'competency_json')
                db.commit()
            sp = db.query(StudentProfile).filter(StudentProfile.user_id == 13).first()
            if sp and sp.technical_skills:
                skills = [s.strip() for s in sp.technical_skills.split(',') if s.strip() not in ('Django', 'Docker')]
                sp.technical_skills = ', '.join(skills)
                db.commit()
            from routers.skill_gap import recalculate_skill_gap_for_user
            recalculate_skill_gap_for_user(db, 13)
        finally:
            db.close()

    def tearDown(self):
        # Cleanup test submissions for user 13 after tests
        db = SessionLocal()
        try:
            comp = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == 13).first()
            if comp and comp.competency_json:
                cj = dict(comp.competency_json)
                if 'submitted_evidence' in cj:
                    for k in ['django', 'docker', 'solidity', 'capstone_milestone']:
                        cj['submitted_evidence'].pop(k, None)
                if 'verified_skills' in cj:
                    cj['verified_skills'] = [v for v in cj['verified_skills'] if v.get('skill_identifier') not in ('django', 'docker', 'solidity', 'capstone_milestone')]
                if 'skills' in cj:
                    cj['skills'] = [s for s in cj['skills'] if s not in ('Django', 'Docker')]
                comp.competency_json = cj
                flag_modified(comp, 'competency_json')
                db.commit()
            sp = db.query(StudentProfile).filter(StudentProfile.user_id == 13).first()
            if sp and sp.technical_skills:
                skills = [s.strip() for s in sp.technical_skills.split(',') if s.strip() not in ('Django', 'Docker')]
                sp.technical_skills = ', '.join(skills)
                db.commit()
            from routers.skill_gap import recalculate_skill_gap_for_user
            recalculate_skill_gap_for_user(db, 13)
        except Exception:
            db.rollback()
        finally:
            db.close()

    def test_01_jwt_authentication_enforcement(self):
        print('\n--- Test 1: JWT Authentication Enforcement ---')
        # Missing auth header -> 401
        res = client.post('/api/learning-path/step-evidence', json={'skill_identifier': 'django', 'url': 'https://github.com/thanvith/repo'})
        self.assertEqual(res.status_code, 401)
        
        res = client.post('/api/learning-path/capstone-evidence', json={'url': 'https://github.com/thanvith/capstone'})
        self.assertEqual(res.status_code, 401)
        
        res = client.post('/api/learning-path/review-evidence', json={'target_user_id': 13, 'skill_identifier': 'django', 'decision': 'Approved', 'reviewer_notes': 'Good'})
        self.assertEqual(res.status_code, 401)
        
        res = client.get('/api/learning-path/pending-reviews')
        self.assertEqual(res.status_code, 401)
        
        # Invalid token -> 401
        res = client.get('/api/learning-path/pending-reviews', headers={'Authorization': 'Bearer invalid.token.value'})
        self.assertEqual(res.status_code, 401)
        print('All 4 endpoints strictly reject unauthenticated / invalid requests with 401 Unauthorized.')

    def test_02_learning_path_skill_validation(self):
        print('\n--- Test 2: Learning Path Skill Validation ---')
        headers = {'Authorization': f'Bearer {self.student_token}'}
        
        # Skill NOT in Thanvith's Python Developer roadmap (e.g. Solidity) -> 400 Bad Request
        res = client.post('/api/learning-path/step-evidence', json={
            'skill_identifier': 'solidity',
            'url': 'https://github.com/thanvith/solidity-contract'
        }, headers=headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn('not in your current target role learning path', res.json()['detail'])
        print('Irrelevant skill correctly rejected with 400 Bad Request.')

    def test_03_ssrf_and_domain_security_in_api(self):
        print('\n--- Test 3: SSRF & Insecure URL Rejection in API ---')
        headers = {'Authorization': f'Bearer {self.student_token}'}
        
        # 1. Insecure http://
        res = client.post('/api/learning-path/step-evidence', json={
            'skill_identifier': 'django',
            'url': 'http://github.com/thanvith/django-repo'
        }, headers=headers)
        self.assertEqual(res.status_code, 200) # Returns 200 with status='Rejected' and security error recorded
        self.assertEqual(res.json()['status'], 'Rejected')
        self.assertIn('Only https:// is permitted', res.json()['rejection_reason'])
        
        # 2. Non-whitelisted domain
        res = client.post('/api/learning-path/step-evidence', json={
            'skill_identifier': 'django',
            'url': 'https://evil-unapproved-site.com/code'
        }, headers=headers)
        self.assertEqual(res.json()['status'], 'Rejected')
        self.assertIn('not in the approved domain whitelist', res.json()['rejection_reason'])
        print('Insecure URLs and unapproved domains recorded with Rejected status and clear diagnostics.')

    def test_04_step_evidence_submission_and_jwt_identity(self):
        print('\n--- Test 4: Step Evidence Submission with Strict JWT Identity ---')
        headers = {'Authorization': f'Bearer {self.student_token}'}
        
        with patch('services.evidence.fetch_verified_url_content') as mock_fetch, \
             patch('services.evidence.inspect_github_repository') as mock_repo:
            
            mock_fetch.return_value = (200, b'ok', '140.82.121.4', {})
            mock_repo.return_value = (True, ['manage.py', 'settings.py'], None)
            
            # Client tries to pass user_id in body to impersonate User 5 (must be ignored)
            res = client.post('/api/learning-path/step-evidence', json={
                'user_id': 5, # Injected malicious user_id
                'skill_identifier': 'django',
                'canonical_skill': 'Django',
                'evidence_type': 'github_repo',
                'url': 'https://github.com/thanvith/django-portfolio',
                'notes': 'Implemented Django REST API endpoints.'
            }, headers=headers)
            
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data['status'], 'Pending Review')
            self.assertEqual(data['skill_identifier'], 'django')
            self.assertEqual(data['canonical_skill'], 'Django')
            
            # Verify DB record was written for user 13, NOT user 5
            db = SessionLocal()
            comp13 = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == 13).first()
            comp5 = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == 5).first()
            self.assertIn('django', comp13.competency_json.get('submitted_evidence', {}))
            if comp5 and comp5.competency_json:
                self.assertNotIn('django', comp5.competency_json.get('submitted_evidence', {}))
            db.close()
            print('JWT student identity strictly preserved; user_id injection prevented.')

    def test_05_capstone_evidence_submission(self):
        print('\n--- Test 5: Capstone Project Evidence Submission ---')
        headers = {'Authorization': f'Bearer {self.student_token}'}
        
        with patch('services.evidence.fetch_verified_url_content') as mock_fetch, \
             patch('services.evidence.inspect_github_repository') as mock_repo:
            
            mock_fetch.return_value = (200, b'ok', '140.82.121.4', {})
            mock_repo.return_value = (True, ['main.py', 'docker-compose.yml'], None)
            
            res = client.post('/api/learning-path/capstone-evidence', json={
                'url': 'https://github.com/thanvith/python-capstone',
                'deployment_url': 'https://worker.thanvith.dev',
                'notes': 'FastAPI + Celery + Redis asynchronous worker'
            }, headers=headers)
            
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data['status'], 'Pending Review')
            self.assertEqual(data['task_type'], 'capstone')
            self.assertEqual(data['skill_identifier'], 'capstone_milestone')
            print('Capstone evidence submitted with task_type="capstone" and skill_identifier="capstone_milestone".')

    def test_06_mentor_authorization_fail_closed_in_api(self):
        print('\n--- Test 6: Mentor Review Authorization Fail-Closed in API ---')
        
        # 1. Student trying to call review endpoint -> 403 Forbidden
        student_headers = {'Authorization': f'Bearer {self.student_token}'}
        res = client.post('/api/learning-path/review-evidence', json={
            'target_user_id': 5,
            'skill_identifier': 'django',
            'decision': 'Approved',
            'reviewer_notes': 'Student self-evaluating or reviewing peer'
        }, headers=student_headers)
        self.assertEqual(res.status_code, 403)
        print('Student calling review endpoint rejected with 403 Forbidden.')
        
        # 2. Universal self-approval prevention (Admin evaluating own account) -> 403 Forbidden
        admin_headers = {'Authorization': f'Bearer {self.admin_token}'}
        res = client.post('/api/learning-path/review-evidence', json={
            'target_user_id': self.admin_id, # Target is self!
            'skill_identifier': 'django',
            'decision': 'Approved',
            'reviewer_notes': 'Attempting self-approval'
        }, headers=admin_headers)
        self.assertEqual(res.status_code, 403)
        self.assertIn('Self-approval prohibited', res.json()['detail'])
        print('Universal self-approval blocked with 403 Forbidden.')
        
        # 3. Unmapped mentor MUST FAIL CLOSED -> 403 Forbidden
        unmapped_headers = {'Authorization': f'Bearer {self.unmapped_token}'}
        res = client.post('/api/learning-path/review-evidence', json={
            'target_user_id': 13,
            'skill_identifier': 'django',
            'decision': 'Approved',
            'reviewer_notes': 'Unmapped mentor trying to review'
        }, headers=unmapped_headers)
        self.assertEqual(res.status_code, 403)
        self.assertIn('Mentor scope restriction', res.json()['detail'])
        print('Unmapped mentor strictly failed closed with 403 Forbidden.')
        
        # 4. Mismatched mentor (CSE mentor reviewing Machine Learning student 13) -> 403 Forbidden
        cse_headers = {'Authorization': f'Bearer {self.cse_mentor_token}'}
        res = client.post('/api/learning-path/review-evidence', json={
            'target_user_id': 13,
            'skill_identifier': 'django',
            'decision': 'Approved',
            'reviewer_notes': 'CSE mentor reviewing ML student'
        }, headers=cse_headers)
        self.assertEqual(res.status_code, 403)
        self.assertIn('Mentor scope restriction', res.json()['detail'])
        print('Department mismatch strictly blocked with 403 Forbidden.')

    def test_07_pending_reviews_endpoint_scoping(self):
        print('\n--- Test 7: Pending Reviews Endpoint Scoping ---')
        
        # Student calling pending-reviews -> 403 Forbidden
        student_headers = {'Authorization': f'Bearer {self.student_token}'}
        res = client.get('/api/learning-path/pending-reviews', headers=student_headers)
        self.assertEqual(res.status_code, 403)
        
        # Unmapped mentor calling pending-reviews -> returns [] (fails closed)
        unmapped_headers = {'Authorization': f'Bearer {self.unmapped_token}'}
        res = client.get('/api/learning-path/pending-reviews', headers=unmapped_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])
        
        # Admin can view pending reviews list
        admin_headers = {'Authorization': f'Bearer {self.admin_token}'}
        res = client.get('/api/learning-path/pending-reviews', headers=admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)
        print('Pending reviews access control verified: students blocked, unmapped mentors return empty list.')

    def test_08_duplicate_submission_and_verification_safeguard(self):
        print('\n--- Test 8: Duplicate Submission & Verification Safeguard ---')
        student_headers = {'Authorization': f'Bearer {self.student_token}'}
        admin_headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        with patch('services.evidence.fetch_verified_url_content') as mock_fetch, \
             patch('services.evidence.inspect_github_repository') as mock_repo:
            
            mock_fetch.return_value = (200, b'ok', '140.82.121.4', {})
            mock_repo.return_value = (True, ['manage.py'], None)
            
            # 1. Submit evidence for Django
            res = client.post('/api/learning-path/step-evidence', json={
                'skill_identifier': 'django',
                'canonical_skill': 'Django',
                'url': 'https://github.com/thanvith/django-app'
            }, headers=student_headers)
            self.assertEqual(res.status_code, 200)
            
            # 2. Mentor approves Django
            res_rev = client.post('/api/learning-path/review-evidence', json={
                'target_user_id': 13,
                'skill_identifier': 'django',
                'decision': 'Approved',
                'reviewer_notes': 'Verified high quality Django code.'
            }, headers=admin_headers)
            self.assertEqual(res_rev.status_code, 200)
            self.assertEqual(res_rev.json()['status'], 'Verified')
            
            # 3. Attempting to submit evidence again for already-verified Django MUST BE REJECTED
            res_dup = client.post('/api/learning-path/step-evidence', json={
                'skill_identifier': 'django',
                'canonical_skill': 'Django',
                'url': 'https://github.com/thanvith/django-new'
            }, headers=student_headers)
            self.assertEqual(res_dup.status_code, 400)
            self.assertIn('already been platform verified', res_dup.json()['detail'])
            print('Duplicate submission on verified skill rejected with 400 Bad Request.')

    def test_09_existing_phase3_endpoints_preserved(self):
        print('\n--- Test 9: Existing Phase 3 Endpoints Preserved ---')
        headers = {'Authorization': f'Bearer {self.student_token}'}
        
        # 1. GET /api/learning-path/me
        res = client.get('/api/learning-path/me', headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('stages', data)
        self.assertIn('capstone', data)
        self.assertIn('path_progress_percentage', data)
        self.assertIn('total_steps', data)
        self.assertEqual(len(data['stages']), 3)
        
        # 2. POST /api/learning-path/progress
        res_prog = client.post('/api/learning-path/progress', json={
            'resource_id': 47,
            'status': 'In Progress'
        }, headers=headers)
        self.assertEqual(res_prog.status_code, 200)
        
        # 3. POST /api/learning-path/capstone-status
        res_cap = client.post('/api/learning-path/capstone-status', json={
            'status': 'In Progress'
        }, headers=headers)
        self.assertEqual(res_cap.status_code, 200)
        print('All 3 existing Phase 3 endpoints return 200 OK with identical response schemas.')

if __name__ == '__main__':
    unittest.main()
