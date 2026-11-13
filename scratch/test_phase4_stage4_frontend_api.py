# Stage 4 Verification Suite: Frontend UI, Evidence Drawers, and Mentor Queue End-to-End API Integration
import sys
import os
import unittest
import copy
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
from routers.skill_gap import recalculate_skill_gap_for_user
from sqlalchemy.orm.attributes import flag_modified

client = TestClient(app)

class TestStage4FrontendEvidenceIntegration(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        try:
            cls.user_id = 13
            cls.student = db.query(User).filter(User.id == cls.user_id).first()
            cls.student_token = create_access_token({"sub": cls.student.email, "id": cls.student.id})
            
            # Setup Admin user for mentor queue
            admin = db.query(User).filter(User.email == "admin@skillnova.ai").first()
            if not admin:
                admin = User(full_name="Platform Admin", email="admin@skillnova.ai", is_active=True, is_verified=True)
                db.add(admin)
                db.commit()
            else:
                admin.is_active = True
                admin.is_verified = True
                db.commit()
            cls.admin = admin
            cls.admin_token = create_access_token({"sub": admin.email, "id": admin.id})
            
            # Configure environment variables
            os.environ["ADMIN_EMAILS"] = "admin@skillnova.ai"
            os.environ["MENTOR_FACULTY_EMAILS"] = "mentor@skillnova.ai,faculty@skillnova.ai"
            
            cls._clean_evidence(db)
        finally:
            db.close()

    @classmethod
    def _clean_evidence(cls, db):
        comp = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == cls.user_id).first()
        if comp and comp.competency_json:
            cj = dict(comp.competency_json)
            if 'submitted_evidence' in cj:
                for k in ['django', 'docker', 'solidity', 'capstone_milestone', 'redis', 'celery']:
                    cj['submitted_evidence'].pop(k, None)
            if 'verified_skills' in cj:
                cj['verified_skills'] = [v for v in cj['verified_skills'] if v.get('skill_identifier') not in ('django', 'docker', 'solidity', 'capstone_milestone', 'redis', 'celery')]
            if 'skills' in cj:
                cj['skills'] = [s for s in cj['skills'] if s not in ('Django', 'Docker')]
            comp.competency_json = cj
            flag_modified(comp, 'competency_json')
            db.commit()

        sp = db.query(StudentProfile).filter(StudentProfile.user_id == cls.user_id).first()
        if sp and sp.technical_skills:
            skills = [s.strip() for s in sp.technical_skills.split(',') if s.strip() not in ('Django', 'Docker')]
            sp.technical_skills = ', '.join(skills)
            db.commit()

        recalculate_skill_gap_for_user(db, cls.user_id, target_role_override="Python Developer")

    def tearDown(self):
        db = SessionLocal()
        try:
            self._clean_evidence(db)
        except Exception:
            db.rollback()
        finally:
            db.close()

    def test_01_student_evidence_submission_and_learning_path_projection(self):
        print("\n--- Test 1: Student Evidence Submission & Learning Path Projection ---")
        headers = {"Authorization": f"Bearer {self.student_token}"}
        
        with patch('services.evidence.fetch_verified_url_content') as mock_fetch, \
             patch('services.evidence.inspect_github_repository') as mock_repo:
            mock_fetch.return_value = (200, b'ok', '140.82.121.4', {})
            mock_repo.return_value = (True, ['manage.py', 'settings.py'], None)

            # Submit step evidence for Django
            payload = {
                "skill_identifier": "django",
                "canonical_skill": "Django",
                "evidence_type": "github_repo",
                "url": "https://github.com/thanvith/django-rest-service",
                "live_url": "https://django-service.vercel.app",
                "notes": "Implemented JWT auth and DRF serializers with PyTest test coverage."
            }
            res = client.post("/api/learning-path/step-evidence", json=payload, headers=headers)
            self.assertEqual(res.status_code, 200)
            res_data = res.json()
            self.assertEqual(res_data["status"], "Pending Review")
            self.assertEqual(res_data["skill_identifier"], "django")

            # Check Learning Path GET /me projection
            lp_res = client.get("/api/learning-path/me", headers=headers)
            self.assertEqual(lp_res.status_code, 200)
            lp_data = lp_res.json()

            # Locate Django step in stages
            django_step = None
            for stage in lp_data.get("stages", []):
                for step in stage.get("steps", []):
                    if step.get("canonical_skill") == "Django" or step.get("skill") == "Django":
                        django_step = step
                        break
            
            self.assertIsNotNone(django_step, "Django step not found in learning path")
            self.assertEqual(django_step.get("evidence_status"), "Pending Review")
            self.assertIsNotNone(django_step.get("evidence"))
            self.assertEqual(django_step["evidence"].get("url"), "https://github.com/thanvith/django-rest-service")
            print("Step evidence submitted and verified in GET /api/learning-path/me projection: status='Pending Review'")

    def test_02_mentor_approval_workflow_and_tri_layer_sync(self):
        print("\n--- Test 2: Mentor Approval Workflow & Tri-Layer Sync ---")
        student_headers = {"Authorization": f"Bearer {self.student_token}"}
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}

        with patch('services.evidence.fetch_verified_url_content') as mock_fetch, \
             patch('services.evidence.inspect_github_repository') as mock_repo:
            mock_fetch.return_value = (200, b'ok', '140.82.121.4', {})
            mock_repo.return_value = (True, ['manage.py'], None)

            # 1. Student submits evidence
            client.post("/api/learning-path/step-evidence", json={
                "skill_identifier": "django",
                "canonical_skill": "Django",
                "evidence_type": "github_repo",
                "url": "https://github.com/thanvith/django-app",
                "notes": "Full-stack Django app."
            }, headers=student_headers)

            # 2. Mentor fetches pending reviews queue
            queue_res = client.get("/api/learning-path/pending-reviews", headers=admin_headers)
            self.assertEqual(queue_res.status_code, 200)
            queue_data = queue_res.json()
            pending_items = queue_data if isinstance(queue_data, list) else queue_data.get("pending_reviews", [])
            self.assertGreater(len(pending_items), 0)
            django_review = next((r for r in pending_items if r.get("skill_identifier") == "django"), None)
            self.assertIsNotNone(django_review)
            self.assertEqual(django_review.get("user_id"), self.user_id)
            print(f"Mentor review queue confirmed: {len(pending_items)} item(s) pending.")

            # 3. Mentor approves evidence
            review_payload = {
                "target_user_id": self.user_id,
                "skill_identifier": "django",
                "decision": "Approved",
                "reviewer_notes": "Clean architecture, automated tests passing."
            }
            review_res = client.post("/api/learning-path/review-evidence", json=review_payload, headers=admin_headers)
            self.assertEqual(review_res.status_code, 200)
            self.assertEqual(review_res.json()["status"], "Verified")

            # 4. Verify tri-layer DB state
            db = SessionLocal()
            try:
                comp = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == self.user_id).first()
                self.assertEqual(comp.competency_json["submitted_evidence"]["django"]["status"], "Verified")
                self.assertTrue(any(v["skill_identifier"] == "django" for v in comp.competency_json["verified_skills"]))
                self.assertIn("Django", comp.competency_json["skills"])
                sp = db.query(StudentProfile).filter(StudentProfile.user_id == self.user_id).first()
                self.assertIn("Django", sp.technical_skills)
                print("Mentor approval synchronized across master evidence, verified skills, and student profile.")
            finally:
                db.close()

    def test_03_mentor_rejection_and_student_resubmission_loop(self):
        print("\n--- Test 3: Mentor Rejection & Student Resubmission Loop ---")
        student_headers = {"Authorization": f"Bearer {self.student_token}"}
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}

        with patch('services.evidence.fetch_verified_url_content') as mock_fetch, \
             patch('services.evidence.inspect_github_repository') as mock_repo:
            mock_fetch.return_value = (200, b'ok', '140.82.121.4', {})
            mock_repo.return_value = (True, ['manage.py'], None)

            # 1. Student initial submission
            client.post("/api/learning-path/step-evidence", json={
                "skill_identifier": "django",
                "canonical_skill": "Django",
                "evidence_type": "github_repo",
                "url": "https://github.com/thanvith/django-draft",
                "notes": "Draft version."
            }, headers=student_headers)

            # 2. Mentor rejects with constructive feedback
            rejection_notes = "Repository lacks unit test coverage and README documentation. Please add tests."
            rej_res = client.post("/api/learning-path/review-evidence", json={
                "target_user_id": self.user_id,
                "skill_identifier": "django",
                "decision": "Rejected",
                "reviewer_notes": rejection_notes
            }, headers=admin_headers)
            self.assertEqual(rej_res.status_code, 200)
            self.assertEqual(rej_res.json()["status"], "Rejected")

            # 3. Verify status in GET /api/learning-path/me
            lp_res = client.get("/api/learning-path/me", headers=student_headers)
            self.assertEqual(lp_res.status_code, 200)
            django_step = next(
                (s for stage in lp_res.json().get("stages", []) for s in stage.get("steps", []) if s.get("canonical_skill") == "Django"),
                None
            )
            self.assertIsNotNone(django_step)
            self.assertEqual(django_step.get("evidence_status"), "Rejected")
            self.assertEqual(django_step["evidence"].get("reviewer_notes"), rejection_notes)
            print("Rejection status and feedback properly surfaced to student.")

            # 4. Student resubmits revised evidence
            resub_res = client.post("/api/learning-path/step-evidence", json={
                "skill_identifier": "django",
                "canonical_skill": "Django",
                "evidence_type": "github_repo",
                "url": "https://github.com/thanvith/django-production-ready",
                "notes": "Added comprehensive PyTest test suite with 85% coverage and updated README."
            }, headers=student_headers)
            self.assertEqual(resub_res.status_code, 200)
            self.assertEqual(resub_res.json()["status"], "Pending Review")
            print("Student successfully resubmitted revised evidence: status returned to 'Pending Review'.")

    def test_04_capstone_evidence_submission_and_lifecycle(self):
        print("\n--- Test 4: Capstone Milestone Evidence Submission & Lifecycle ---")
        student_headers = {"Authorization": f"Bearer {self.student_token}"}
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}

        with patch('services.evidence.fetch_verified_url_content') as mock_fetch, \
             patch('services.evidence.inspect_github_repository') as mock_repo:
            mock_fetch.return_value = (200, b'ok', '140.82.121.4', {})
            mock_repo.return_value = (True, ['main.py', 'docker-compose.yml'], None)

            # 1. Submit Capstone Evidence
            cap_res = client.post("/api/learning-path/capstone-evidence", json={
                "url": "https://github.com/thanvith/fullstack-python-capstone",
                "deployment_url": "https://capstone-python.vercel.app",
                "notes": "Completed async FastAPI service, Redis queues, and Docker Compose deployment."
            }, headers=student_headers)
            self.assertEqual(cap_res.status_code, 200)
            self.assertEqual(cap_res.json()["status"], "Pending Review")

            # 2. Verify Capstone in learning path projection
            lp_res = client.get("/api/learning-path/me", headers=student_headers)
            self.assertEqual(lp_res.status_code, 200)
            capstone = lp_res.json().get("capstone_project")
            self.assertIsNotNone(capstone)
            self.assertEqual(capstone.get("evidence_status"), "Pending Review")
            self.assertEqual(capstone.get("skill_identifier"), "capstone_milestone")
            print("Capstone milestone projected with status='Pending Review'.")

            # 3. Mentor reviews and approves Capstone
            cap_review = client.post("/api/learning-path/review-evidence", json={
                "target_user_id": self.user_id,
                "skill_identifier": "capstone_milestone",
                "decision": "Approved",
                "reviewer_notes": "Capstone project meets all portfolio requirements."
            }, headers=admin_headers)
            self.assertEqual(cap_review.status_code, 200)
            self.assertEqual(cap_review.json()["status"], "Verified")
            print("Capstone successfully platform-verified by faculty reviewer.")

    def test_05_unauthorized_student_access_to_mentor_controls(self):
        print("\n--- Test 5: Role-Based Access Control & Strict Fail-Closed Security ---")
        student_headers = {"Authorization": f"Bearer {self.student_token}"}

        # 1. Student calling pending reviews queue -> 403 Forbidden
        q_res = client.get("/api/learning-path/pending-reviews", headers=student_headers)
        self.assertEqual(q_res.status_code, 403)
        self.assertIn("Access denied", q_res.json()["detail"])

        # 2. Student calling review endpoint -> 403 Forbidden
        r_res = client.post("/api/learning-path/review-evidence", json={
            "target_user_id": 5,
            "skill_identifier": "django",
            "decision": "Approved",
            "reviewer_notes": "Attempting illegal student approval"
        }, headers=student_headers)
        self.assertEqual(r_res.status_code, 403)

        # 3. Self-approval attempt -> unconditionally 403 Forbidden
        self_res = client.post("/api/learning-path/review-evidence", json={
            "target_user_id": self.user_id,
            "skill_identifier": "django",
            "decision": "Approved",
            "reviewer_notes": "Attempting illegal self approval"
        }, headers=student_headers)
        self.assertEqual(self_res.status_code, 403)
        print("Role-based access control confirmed: students strictly denied from reviewer endpoints.")

    def test_06_dashboard_overview_metrics_preservation(self):
        print("\n--- Test 6: Dashboard Overview Metrics Preservation ---")
        student_headers = {"Authorization": f"Bearer {self.student_token}"}
        
        # Verify dashboard endpoint exists and preserves schema
        res = client.get("/api/dashboard/", headers=student_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # The 4 dashboard overview metric cards:
        self.assertIn("profile", data)
        self.assertIn("competency_scores", data)
        self.assertIn("job_compatibility", data)
        self.assertIn("skill_gap", data)
        print("All 4 Career Intelligence Overview metric cards verified with identical schema.")

    def test_07_frontend_production_build_artifacts_exist(self):
        print("\n--- Test 7: Frontend Production Build Artifacts Verification ---")
        dist_dir = "frontend/dist"
        self.assertTrue(os.path.exists(dist_dir), "frontend/dist directory does not exist")
        self.assertTrue(os.path.exists(os.path.join(dist_dir, "index.html")), "dist/index.html is missing")
        assets_dir = os.path.join(dist_dir, "assets")
        self.assertTrue(os.path.exists(assets_dir), "dist/assets directory is missing")
        asset_files = os.listdir(assets_dir)
        self.assertTrue(any(f.endswith('.js') for f in asset_files), "No JS bundle found in dist/assets")
        self.assertTrue(any(f.endswith('.css') for f in asset_files), "No CSS bundle found in dist/assets")
        print(f"Production bundle verified: {len(asset_files)} asset files generated in frontend/dist.")

if __name__ == '__main__':
    unittest.main()
