# Stage 1 Verification Suite: Transport, Security, and Evidence Lifecycle
import sys
import os
import unittest
import socket
from unittest.mock import patch, MagicMock

sys.path.append('backend')

from services.evidence import (
    is_ip_safe,
    is_whitelisted_domain,
    PinnedIPAdapter,
    PinnedHTTPSConnection,
    fetch_verified_url_content,
    SecurityError,
    RateLimitExceededException,
    InconclusiveNetworkException,
    verify_reviewer_authorization,
    EvidenceService,
    MENTOR_DEPARTMENT_MAP
)
from models.user import User
from models.student_profile import StudentProfile
from models.competency_profile import CompetencyProfile
from database import SessionLocal

class TestStage1SecurityAndTransport(unittest.TestCase):

    def test_01_ssrf_and_private_ip_blocking(self):
        print('\n--- Test 1: SSRF & Private IP Blocking ---')
        # Private & Loopback IPv4
        self.assertFalse(is_ip_safe('127.0.0.1'))
        self.assertFalse(is_ip_safe('10.0.0.5'))
        self.assertFalse(is_ip_safe('172.16.5.1'))
        self.assertFalse(is_ip_safe('192.168.1.100'))
        self.assertFalse(is_ip_safe('169.254.169.254')) # AWS metadata IP
        self.assertFalse(is_ip_safe('0.0.0.0'))
        
        # IPv6 Loopback & Link-local
        self.assertFalse(is_ip_safe('::1'))
        self.assertFalse(is_ip_safe('fe80::1'))
        self.assertFalse(is_ip_safe('::ffff:127.0.0.1')) # IPv4 mapped IPv6
        
        # Valid Public IP
        self.assertTrue(is_ip_safe('140.82.121.4')) # GitHub
        self.assertTrue(is_ip_safe('8.8.8.8')) # Google DNS
        print('SSRF checks: all private/loopback/cloud-metadata IPs blocked.')

    def test_02_domain_whitelist(self):
        print('\n--- Test 2: Domain Whitelist Validation ---')
        self.assertTrue(is_whitelisted_domain('github.com'))
        self.assertTrue(is_whitelisted_domain('api.github.com'))
        self.assertTrue(is_whitelisted_domain('raw.githubusercontent.com'))
        self.assertTrue(is_whitelisted_domain('student.github.io'))
        self.assertTrue(is_whitelisted_domain('my-project.vercel.app'))
        self.assertTrue(is_whitelisted_domain('app.onrender.com'))
        
        # Blocked domains
        self.assertFalse(is_whitelisted_domain('evil-hacker.com'))
        self.assertFalse(is_whitelisted_domain('internal-service.local'))
        self.assertFalse(is_whitelisted_domain('169.254.169.254'))
        self.assertFalse(is_whitelisted_domain(''))
        print('Domain whitelist: only approved domains and permitted subdomains allowed.')

    def test_03_dns_pinning_and_socket_peer_verification(self):
        print('\n--- Test 3: Live DNS Pinning & Socket Peer Verification ---')
        # Fetch robots.txt from GitHub using DNS-pinned transport
        url = 'https://github.com/robots.txt'
        status_code, content, pinned_ip, headers = fetch_verified_url_content(url, timeout=(5.0, 5.0))
        self.assertEqual(status_code, 200)
        self.assertTrue(len(content) > 0)
        self.assertTrue(is_ip_safe(pinned_ip))
        print(f'DNS pinned to {pinned_ip}, verified status {status_code}, content length {len(content)} bytes.')

    def test_04_insecure_scheme_and_ssrf_rejection(self):
        print('\n--- Test 4: Insecure Scheme & SSRF Target Rejection ---')
        with self.assertRaises(SecurityError):
            fetch_verified_url_content('http://github.com/robots.txt') # Insecure http://
            
        with self.assertRaises(SecurityError):
            fetch_verified_url_content('https://127.0.0.1:8000/internal') # Private IP / Non-whitelisted

        with self.assertRaises(SecurityError):
            fetch_verified_url_content('https://evil-attacker.org/payload') # Non-whitelisted domain
        print('Rejected insecure schemes and unauthorized domains.')

    def test_05_rate_limit_and_timeout_classification(self):
        print('\n--- Test 5: Rate-Limit & Transient Network Inconclusive Classification ---')
        # Mocking 429 response
        with patch('socket.getaddrinfo') as mock_dns, patch('requests.Session.get') as mock_get:
            mock_dns.return_value = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('140.82.121.4', 443))]
            mock_resp = MagicMock()
            mock_resp.status_code = 429
            mock_resp.headers = {'Retry-After': '90'}
            mock_resp.raw.connection.sock.getpeername.return_value = ('140.82.121.4', 443)
            mock_get.return_value = mock_resp
            
            with self.assertRaises(RateLimitExceededException) as cm:
                fetch_verified_url_content('https://github.com/test/repo')
            self.assertEqual(cm.exception.retry_after, 90)
            print('HTTP 429 correctly raised RateLimitExceededException with retry_after=90.')

    def test_06_mentor_authorization_fail_closed(self):
        print('\n--- Test 6: Mentor Department Authorization Strict Fail-Closed ---')
        os.environ['ADMIN_EMAILS'] = 'admin@skillnova.ai'
        os.environ['MENTOR_FACULTY_EMAILS'] = 'mentor@skillnova.ai,unmapped_mentor@skillnova.ai'
        
        student_profile_cse = StudentProfile(id=1, user_id=101, department='Computer Science and Engineering')
        student_profile_aiml = StudentProfile(id=2, user_id=102, department='Artificial Intelligence and Machine Learning')
        
        admin_user = User(id=999, email='admin@skillnova.ai', is_active=True, is_verified=True)
        cse_mentor = User(id=201, email='mentor@skillnova.ai', is_active=True, is_verified=True)
        unmapped_mentor = User(id=202, email='unmapped_mentor@skillnova.ai', is_active=True, is_verified=True)
        student_user = User(id=101, email='student@skillnova.ai', is_active=True, is_verified=True)
        inactive_user = User(id=301, email='admin@skillnova.ai', is_active=False, is_verified=True)
        
        # 1. Admin can review any department
        self.assertTrue(verify_reviewer_authorization(admin_user, student_profile_cse))
        self.assertTrue(verify_reviewer_authorization(admin_user, student_profile_aiml))
        
        # 2. CSE mentor can review CSE student
        self.assertTrue(verify_reviewer_authorization(cse_mentor, student_profile_cse))
        
        # 3. CSE mentor CANNOT review AIML student (403 Forbidden)
        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as ctx:
            verify_reviewer_authorization(cse_mentor, student_profile_aiml)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn('Mentor scope restriction', ctx.exception.detail)
        
        # 4. Unmapped mentor MUST FAIL CLOSED (403 Forbidden)
        with self.assertRaises(HTTPException) as ctx:
            verify_reviewer_authorization(unmapped_mentor, student_profile_cse)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn('Mentor scope restriction', ctx.exception.detail)
        print('Unmapped mentor strictly failed closed with HTTP 403 Forbidden.')
        
        # 5. Universal self-approval blocked (403 Forbidden)
        student_as_reviewer = User(id=101, email='admin@skillnova.ai', is_active=True, is_verified=True)
        with self.assertRaises(HTTPException) as ctx:
            verify_reviewer_authorization(student_as_reviewer, student_profile_cse)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn('Self-approval prohibited', ctx.exception.detail)
        print('Self-approval unconditionally blocked.')
        
        # 6. Inactive account blocked (403 Forbidden)
        with self.assertRaises(HTTPException) as ctx:
            verify_reviewer_authorization(inactive_user, student_profile_cse)
        self.assertEqual(ctx.exception.status_code, 403)
        print('Inactive reviewer blocked.')

    def test_07_evidence_submission_lifecycle(self):
        print('\n--- Test 7: Evidence Submission Lifecycle & Row Lock Mutation ---')
        db = SessionLocal()
        try:
            # Test user Thanvith MK (ID 13)
            user_id = 13
            payload = {
                'url': 'https://github.com/thanvith/python-portfolio',
                'skill_identifier': 'python',
                'canonical_skill': 'Python',
                'task_type': 'skill_step',
                'notes': 'Implemented robust Python backend data structures and algorithms.',
                'expected_owner': 'thanvith'
            }
            
            # Mock fetch_verified_url_content and inspect_github_repository to isolate DB mutation
            with patch('services.evidence.fetch_verified_url_content') as mock_fetch, \
                 patch('services.evidence.inspect_github_repository') as mock_repo:
                
                mock_fetch.return_value = (200, b'ok', '140.82.121.4', {})
                mock_repo.return_value = (True, ['main.py', 'requirements.txt'], None)
                
                result = EvidenceService.submit_step_evidence(user_id, payload, db)
                self.assertEqual(result['status'], 'Pending Review')
                self.assertEqual(result['skill_identifier'], 'python')
                self.assertEqual(result['automated_checks']['dns_pinned_ip'], '140.82.121.4')
                self.assertIn('main.py', result['automated_checks']['technology_files_detected'])
                print('Evidence submission succeeded: Status is Pending Review (never auto-verified).')
                
                # Check that CompetencyProfile.competency_json has recorded the submission
                comp = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == user_id).first()
                self.assertIn('submitted_evidence', comp.competency_json)
                self.assertIn('python', comp.competency_json['submitted_evidence'])
                
                # Now test Mentor Review Approval
                admin_user = User(id=999, email='admin@skillnova.ai', is_active=True, is_verified=True)
                os.environ['ADMIN_EMAILS'] = 'admin@skillnova.ai'
                
                review_payload = {
                    'skill_identifier': 'python',
                    'decision': 'Approved',
                    'reviewer_notes': 'Verified high quality code structure, passing all test cases.'
                }
                
                review_res = EvidenceService.review_step_evidence(admin_user, user_id, review_payload, db)
                self.assertEqual(review_res['status'], 'Verified')
                print('Mentor review completed: status elevated to Verified.')
                
                # Verify tri-layer synchronization
                db.refresh(comp)
                self.assertEqual(comp.competency_json['submitted_evidence']['python']['status'], 'Verified')
                self.assertTrue(any(v['skill_identifier'] == 'python' for v in comp.competency_json.get('verified_skills', [])))
                self.assertIn('Python', comp.competency_json.get('skills', []))
                print('Tri-layer synchronization confirmed: submitted_evidence, verified_skills, and skills arrays updated.')
                
        finally:
            try:
                comp = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == user_id).first()
                if comp and comp.competency_json:
                    cj = dict(comp.competency_json)
                    if 'submitted_evidence' in cj:
                        cj['submitted_evidence'].pop('python', None)
                    if 'verified_skills' in cj:
                        cj['verified_skills'] = [v for v in cj['verified_skills'] if v.get('skill_identifier') != 'python']
                    comp.competency_json = cj
                    from sqlalchemy.orm.attributes import flag_modified
                    flag_modified(comp, 'competency_json')
                    db.commit()
            except Exception:
                db.rollback()
            db.close()

    def test_08_unsafe_redirect_blocking(self):
        print('\n--- Test 8: Unsafe Redirect Blocking ---')
        # Simulate redirect to internal loopback
        with patch('socket.getaddrinfo') as mock_dns, patch('requests.Session.get') as mock_get:
            mock_dns.side_effect = [
                [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('140.82.121.4', 443))], # First hop ok
                [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('127.0.0.1', 443))]    # Second hop to loopback
            ]
            mock_resp1 = MagicMock()
            mock_resp1.is_redirect = True
            mock_resp1.status_code = 302
            mock_resp1.headers = {'Location': 'https://github.com/internal-redirect'}
            mock_resp1.raw.connection.sock.getpeername.return_value = ('140.82.121.4', 443)
            
            mock_get.return_value = mock_resp1
            
            with self.assertRaises(SecurityError) as ctx:
                fetch_verified_url_content('https://github.com/test')
            self.assertIn('restricted/private address space', str(ctx.exception))
            print('Redirect to loopback address blocked by SSRF check.')

    def test_09_stream_size_cap(self):
        print('\n--- Test 9: Response Body Streaming Size Cap (1.0 MB) ---')
        with patch('socket.getaddrinfo') as mock_dns, patch('requests.Session.get') as mock_get:
            mock_dns.return_value = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('140.82.121.4', 443))]
            mock_resp = MagicMock()
            mock_resp.is_redirect = False
            mock_resp.status_code = 200
            mock_resp.headers = {'Content-Length': '2000000'}
            mock_resp.raw.connection.sock.getpeername.return_value = ('140.82.121.4', 443)
            # Generator yielding chunks exceeding 1 MB
            mock_resp.iter_content.return_value = [b'A' * 600000, b'B' * 600000]
            mock_get.return_value = mock_resp
            
            with self.assertRaises(SecurityError) as ctx:
                fetch_verified_url_content('https://github.com/large/repo')
            self.assertIn('exceeded 1.0 MB limit', str(ctx.exception))
            print('Response body streaming cap enforced: >1MB stream rejected.')

    def test_10_network_timeout_inconclusive_submission(self):
        print('\n--- Test 10: Transient Timeout Yields Inconclusive Status ---')
        db = SessionLocal()
        try:
            user_id = 13
            payload = {
                'url': 'https://github.com/thanvith/timeout-repo',
                'skill_identifier': 'django',
                'canonical_skill': 'Django',
                'task_type': 'skill_step',
                'notes': 'Testing transient network timeout.'
            }
            with patch('services.evidence.fetch_verified_url_content') as mock_fetch:
                mock_fetch.side_effect = InconclusiveNetworkException('Connection timed out contacting github.com', retry_after=45)
                
                result = EvidenceService.submit_step_evidence(user_id, payload, db)
                self.assertEqual(result['status'], 'Inconclusive')
                self.assertEqual(result['retry_after'], 45)
                self.assertEqual(result['automated_checks']['status'], 'inconclusive')
                print('Transient network failure correctly stored as Inconclusive (never rejected).')
        finally:
            try:
                comp = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == user_id).first()
                if comp and comp.competency_json:
                    cj = dict(comp.competency_json)
                    if 'submitted_evidence' in cj:
                        cj['submitted_evidence'].pop('django', None)
                    comp.competency_json = cj
                    from sqlalchemy.orm.attributes import flag_modified
                    flag_modified(comp, 'competency_json')
                    db.commit()
            except Exception:
                db.rollback()
            db.close()

    def test_11_pending_reviews_authorization(self):
        print('\n--- Test 11: Pending Reviews Retrieval & Scope Enforcement ---')
        db = SessionLocal()
        try:
            admin_user = User(id=999, email='admin@skillnova.ai', is_active=True, is_verified=True)
            cse_mentor = User(id=201, email='mentor@skillnova.ai', is_active=True, is_verified=True)
            aiml_mentor = User(id=203, email='faculty@skillnova.ai', is_active=True, is_verified=True)
            unmapped_mentor = User(id=202, email='unmapped_mentor@skillnova.ai', is_active=True, is_verified=True)
            student_user = User(id=13, email='thanvith@gmail.com', is_active=True, is_verified=True)
            
            os.environ['ADMIN_EMAILS'] = 'admin@skillnova.ai'
            os.environ['MENTOR_FACULTY_EMAILS'] = 'mentor@skillnova.ai,faculty@skillnova.ai,unmapped_mentor@skillnova.ai'
            
            # Admin can query pending reviews
            admin_reviews = EvidenceService.get_pending_reviews(admin_user, db)
            self.assertIsInstance(admin_reviews, list)
            
            # Unmapped mentor gets empty list (fails closed)
            unmapped_reviews = EvidenceService.get_pending_reviews(unmapped_mentor, db)
            self.assertEqual(unmapped_reviews, [])
            
            # Student calling get_pending_reviews raises 403 Forbidden
            from fastapi import HTTPException
            with self.assertRaises(HTTPException) as ctx:
                EvidenceService.get_pending_reviews(student_user, db)
            self.assertEqual(ctx.exception.status_code, 403)
            print('Pending reviews access control verified (students blocked, unmapped mentors fail closed).')
        finally:
            db.close()

if __name__ == '__main__':
    unittest.main()
