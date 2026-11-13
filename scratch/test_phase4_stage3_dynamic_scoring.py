# Stage 3 Verification Suite: Dynamic Scoring, Unidirectional Carry-Forward, and Profile Resilience
import sys
import os
import unittest
import copy
import hashlib
from unittest.mock import patch, MagicMock

sys.path.append('backend')

from database import SessionLocal
from models.user import User
from models.student_profile import StudentProfile
from models.competency_profile import CompetencyProfile
from models.skill_gap import SkillGapAnalysis
from services.evidence import EvidenceService
from services.scoring import ScoringEngine
from routers.skill_gap import recalculate_skill_gap_for_user
from routers.competency_profile import generate_competency_profile
from ml.prediction.predict import predictor
from sqlalchemy.orm.attributes import flag_modified

class TestStage3DynamicScoringAndSkillGap(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        try:
            cls.user_id = 13
            os.environ["ADMIN_EMAILS"] = "admin@skillnova.ai"
            os.environ["MENTOR_FACULTY_EMAILS"] = "mentor@skillnova.ai,faculty@skillnova.ai"
            
            # Setup Admin user for reviews
            admin = db.query(User).filter(User.email == "admin@skillnova.ai").first()
            if not admin:
                admin = User(full_name="Platform Admin", email="admin@skillnova.ai", is_active=True, is_verified=True)
                db.add(admin)
                db.commit()
            else:
                admin.is_active = True
                admin.is_verified = True
                db.commit()
            
            # Clean Thanvith's test evidence
            cls._clean_test_evidence(db)
        finally:
            db.close()

    def get_admin(self, db):
        admin = db.query(User).filter(User.email == "admin@skillnova.ai").first()
        if not admin.is_active or not admin.is_verified:
            admin.is_active = True
            admin.is_verified = True
            db.commit()
            db.refresh(admin)
        return admin

    def get_student(self, db):
        return db.query(User).filter(User.id == self.user_id).first()

    @classmethod
    def _clean_test_evidence(cls, db):
        comp = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == cls.user_id).first()
        if comp and comp.competency_json:
            cj = dict(comp.competency_json)
            if 'submitted_evidence' in cj:
                for k in ['django', 'docker', 'python', 'capstone_milestone']:
                    cj['submitted_evidence'].pop(k, None)
            if 'verified_skills' in cj:
                cj['verified_skills'] = [v for v in cj['verified_skills'] if v.get('skill_identifier') not in ('django', 'docker', 'python', 'capstone_milestone')]
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

    def tearDown(self):
        db = SessionLocal()
        try:
            self._clean_test_evidence(db)
            # Restore Thanvith's preferred role to Python Developer
            sp = db.query(StudentProfile).filter(StudentProfile.user_id == self.user_id).first()
            if sp and sp.preferred_job_role != "Python Developer":
                sp.preferred_job_role = "Python Developer"
                db.commit()
            recalculate_skill_gap_for_user(db, self.user_id, target_role_override="Python Developer")
        except Exception:
            db.rollback()
        finally:
            db.close()

    def test_01_tri_layer_synchronization_and_provenance(self):
        print('\n--- Test 1: Tri-Layer Synchronization & Provenance Audit Trail ---')
        db = SessionLocal()
        try:
            admin = self.get_admin(db)
            # 1. Submit evidence for Django
            payload = {
                'url': 'https://github.com/thanvith/django-rest-api',
                'skill_identifier': 'django',
                'canonical_skill': 'Django',
                'task_type': 'skill_step',
                'notes': 'Production-ready Django REST framework API.'
            }
            with patch('services.evidence.fetch_verified_url_content') as mock_fetch, \
                 patch('services.evidence.inspect_github_repository') as mock_repo:
                mock_fetch.return_value = (200, b'ok', '140.82.121.4', {})
                mock_repo.return_value = (True, ['manage.py'], None)
                EvidenceService.submit_step_evidence(self.user_id, payload, db)

            # 2. Mentor approves evidence
            review_payload = {
                'skill_identifier': 'django',
                'decision': 'Approved',
                'reviewer_notes': 'Verified test suite and model structure.'
            }
            review_res = EvidenceService.review_step_evidence(admin, self.user_id, review_payload, db)
            self.assertEqual(review_res['status'], 'Verified')

            # 3. Assert Layer 1: CompetencyProfile.competency_json["submitted_evidence"]
            comp = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == self.user_id).first()
            self.assertEqual(comp.competency_json['submitted_evidence']['django']['status'], 'Verified')

            # 4. Assert Layer 2: CompetencyProfile.competency_json["verified_skills"]
            verified_entry = next((v for v in comp.competency_json.get('verified_skills', []) if v.get('skill_identifier') == 'django'), None)
            self.assertIsNotNone(verified_entry)
            self.assertEqual(verified_entry['canonical_skill'], 'Django')
            self.assertEqual(verified_entry['verified_by'], admin.email)
            self.assertIsNotNone(verified_entry['verified_at'])

            # 5. Assert Layer 3: CompetencyProfile.competency_json["skills"] and StudentProfile.technical_skills
            self.assertIn('Django', comp.competency_json.get('skills', []))
            sp = db.query(StudentProfile).filter(StudentProfile.user_id == self.user_id).first()
            self.assertIn('Django', sp.technical_skills)
            print('Tri-layer synchronization confirmed across master evidence, verified skills, and student technical skills.')
        finally:
            db.close()

    def test_02_scoring_determinism_and_idempotency(self):
        print('\n--- Test 2: Scoring Determinism & Idempotency ---')
        db = SessionLocal()
        try:
            admin = self.get_admin(db)
            comp = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == self.user_id).first()
            score_engine = ScoringEngine()
            
            # Record scores before verification
            initial_backend = comp.backend_score or 0
            
            # Submit and verify Django
            payload = {'url': 'https://github.com/thanvith/django-app', 'skill_identifier': 'django', 'canonical_skill': 'Django', 'task_type': 'skill_step'}
            with patch('services.evidence.fetch_verified_url_content') as mock_fetch, \
                 patch('services.evidence.inspect_github_repository') as mock_repo:
                mock_fetch.return_value = (200, b'ok', '140.82.121.4', {})
                mock_repo.return_value = (True, ['manage.py'], None)
                EvidenceService.submit_step_evidence(self.user_id, payload, db)

            review_payload = {'skill_identifier': 'django', 'decision': 'Approved', 'reviewer_notes': 'Approved'}
            EvidenceService.review_step_evidence(admin, self.user_id, review_payload, db)

            db.refresh(comp)
            elevated_backend = comp.backend_score
            self.assertGreaterEqual(elevated_backend, initial_backend)
            
            # Re-evaluating ScoringEngine with same profile produces deterministic identical score
            scores_dict, _ = score_engine.calculate_all(comp.competency_json)
            self.assertEqual(scores_dict['backend_score'], elevated_backend)
            
            # Verify 100-point ceiling constraint
            self.assertLessEqual(comp.overall_score, 100.0)
            self.assertLessEqual(comp.backend_score, 100.0)
            print(f'Scoring determinism confirmed. Backend score: {elevated_backend}/100, bounded by ceiling.')
        finally:
            db.close()

    def test_03_profile_regeneration_preserves_verified_evidence(self):
        print('\n--- Test 3: Profile Regeneration Preserves Evidence Provenance ---')
        db = SessionLocal()
        try:
            admin = self.get_admin(db)
            student = self.get_student(db)
            # 1. Submit and verify Django
            payload = {'url': 'https://github.com/thanvith/django-api', 'skill_identifier': 'django', 'canonical_skill': 'Django', 'task_type': 'skill_step'}
            with patch('services.evidence.fetch_verified_url_content') as mock_fetch, \
                 patch('services.evidence.inspect_github_repository') as mock_repo:
                mock_fetch.return_value = (200, b'ok', '140.82.121.4', {})
                mock_repo.return_value = (True, ['manage.py'], None)
                EvidenceService.submit_step_evidence(self.user_id, payload, db)

            EvidenceService.review_step_evidence(admin, self.user_id, {'skill_identifier': 'django', 'decision': 'Approved', 'reviewer_notes': 'Good'}, db)

            # 2. Trigger generate_competency_profile() (simulate student re-uploading resume or re-generating)
            regenerated = generate_competency_profile(db=db, current_user=student)

            # 3. Assert verified_skills and submitted_evidence survived regeneration intact
            self.assertIn('submitted_evidence', regenerated.competency_json)
            self.assertIn('django', regenerated.competency_json['submitted_evidence'])
            self.assertEqual(regenerated.competency_json['submitted_evidence']['django']['status'], 'Verified')
            
            self.assertIn('verified_skills', regenerated.competency_json)
            self.assertTrue(any(v['skill_identifier'] == 'django' for v in regenerated.competency_json['verified_skills']))
            self.assertIn('Django', regenerated.competency_json['skills'])
            print('Profile regeneration preserved all master evidence records and verified provenance.')
        finally:
            db.close()

    def test_04_cross_role_evidence_carry_forward(self):
        print('\n--- Test 4: Cross-Role Evidence Carry-Forward Resilience ---')
        db = SessionLocal()
        try:
            admin = self.get_admin(db)
            # 1. Submit and verify Docker (a multi-role skill shared between Python Developer and ML Engineer)
            payload = {'url': 'https://github.com/thanvith/docker-containers', 'skill_identifier': 'docker', 'canonical_skill': 'Docker', 'task_type': 'skill_step'}
            with patch('services.evidence.fetch_verified_url_content') as mock_fetch, \
                 patch('services.evidence.inspect_github_repository') as mock_repo:
                mock_fetch.return_value = (200, b'ok', '140.82.121.4', {})
                mock_repo.return_value = (True, ['Dockerfile'], None)
                EvidenceService.submit_step_evidence(self.user_id, payload, db)

            EvidenceService.review_step_evidence(admin, self.user_id, {'skill_identifier': 'docker', 'decision': 'Approved', 'reviewer_notes': 'Verified Dockerfile'}, db)

            # 2. Submit Capstone Evidence
            capstone_payload = {'url': 'https://github.com/thanvith/capstone-proj', 'skill_identifier': 'capstone_milestone', 'canonical_skill': 'Python Developer Capstone', 'task_type': 'capstone'}
            with patch('services.evidence.fetch_verified_url_content') as mock_fetch, \
                 patch('services.evidence.inspect_github_repository') as mock_repo:
                mock_fetch.return_value = (200, b'ok', '140.82.121.4', {})
                mock_repo.return_value = (True, ['main.py'], None)
                EvidenceService.submit_step_evidence(self.user_id, capstone_payload, db)

            # Capstone is in Pending Review
            comp = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == self.user_id).first()
            self.assertEqual(comp.competency_json['submitted_evidence']['capstone_milestone']['status'], 'Pending Review')

            # 3. Change Target Role to Machine Learning Engineer
            new_gap = recalculate_skill_gap_for_user(db, self.user_id, target_role_override="Machine Learning Engineer")
            self.assertEqual(new_gap.target_role, "Machine Learning Engineer")

            # 4. Assert Docker in new action plan reflects Verified status and master evidence projection
            docker_task = next((t for t in new_gap.action_plan_json if t.get('skill_identifier') == 'docker'), None)
            if docker_task:
                self.assertEqual(docker_task.get('status'), 'Completed')
                self.assertIsNotNone(docker_task.get('evidence'))
                self.assertEqual(docker_task['evidence']['status'], 'Verified')
                print('Docker task in new role dynamically inherited Verified master evidence.')

            # 5. Assert Capstone Milestone in new action plan reflects In Progress / Pending Review status
            capstone_task = next((t for t in new_gap.action_plan_json if t.get('task_type') == 'capstone'), None)
            self.assertIsNotNone(capstone_task)
            self.assertEqual(capstone_task.get('status'), 'In Progress')
            self.assertEqual(capstone_task['evidence']['status'], 'Pending Review')
            print('Capstone task in new role retained pure structural task_type="capstone" and master evidence.')

            # 6. Switch back to Python Developer
            restored_gap = recalculate_skill_gap_for_user(db, self.user_id, target_role_override="Python Developer")
            self.assertEqual(restored_gap.target_role, "Python Developer")
            restored_capstone = next((t for t in restored_gap.action_plan_json if t.get('task_type') == 'capstone'), None)
            self.assertIsNotNone(restored_capstone)
            self.assertEqual(restored_capstone.get('status'), 'In Progress')
            self.assertEqual(restored_capstone['evidence']['status'], 'Pending Review')
            
            # Assert Master Store integrity is untouched by role changes
            comp_after = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == self.user_id).first()
            self.assertEqual(comp_after.competency_json['submitted_evidence']['docker']['status'], 'Verified')
            self.assertEqual(comp_after.competency_json['submitted_evidence']['capstone_milestone']['status'], 'Pending Review')
            print('Restored original role successfully: master store integrity and capstone carry-forward preserved.')
        finally:
            db.close()

    def test_05_unidirectional_precedence_no_reverse_harvesting(self):
        print('\n--- Test 5: Unidirectional Master Precedence (Zero Reverse-Harvesting) ---')
        db = SessionLocal()
        try:
            gap_record = db.query(SkillGapAnalysis).filter(SkillGapAnalysis.user_id == self.user_id).first()
            # Tamper with action_plan_json to add artificial evidence
            tampered_plan = list(gap_record.action_plan_json)
            for t in tampered_plan:
                if t.get('task_type') == 'skill_step':
                    t['evidence'] = {'status': 'Verified', 'notes': 'Tampered fake evidence'}
            gap_record.action_plan_json = tampered_plan
            flag_modified(gap_record, 'action_plan_json')
            db.commit()

            # Recalculate skill gap
            recalculate_skill_gap_for_user(db, self.user_id)

            # Master store MUST NOT have accepted the tampered fake evidence
            comp = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == self.user_id).first()
            submitted = comp.competency_json.get('submitted_evidence', {})
            for k, ev in submitted.items():
                self.assertNotEqual(ev.get('notes'), 'Tampered fake evidence')
            print('Unidirectional precedence confirmed: tampered action plan presentation data was never reverse-harvested.')
        finally:
            db.close()

    def test_06_xgboost_dynamic_inference_and_artifact_invariance(self):
        print('\n--- Test 6: XGBoost Feature Contract & Invariance ---')
        db = SessionLocal()
        try:
            # 1. Test Dynamic Prediction with 11 features
            student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == self.user_id).first()
            comp_profile = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == self.user_id).first()
            
            competency_data = {
                'frontend_score': comp_profile.frontend_score or 0.0,
                'backend_score': comp_profile.backend_score or 0.0,
                'database_score': comp_profile.database_score or 0.0,
                'ai_ml_score': comp_profile.ai_ml_score or 0.0,
                'data_science_score': comp_profile.data_science_score or 0.0,
                'cloud_score': comp_profile.cloud_score or 0.0,
                'programming_score': comp_profile.programming_score or 0.0,
                'soft_skill_score': comp_profile.soft_skill_score or 0.0,
                'overall_competency_score': comp_profile.overall_competency_score or comp_profile.overall_score or 0.0
            }
            dsa_val = student_profile.dsa_level if student_profile and student_profile.dsa_level else "Intermediate"
            if str(dsa_val).lower() == "medium":
                dsa_val = "Intermediate"
            cgpa = student_profile.cgpa if student_profile and student_profile.cgpa else 8.5
            
            result = predictor.predict(
                competency_data=competency_data,
                dsa_level=dsa_val,
                cgpa=cgpa
            )
            self.assertIsInstance(result, dict)
            self.assertIn("predictions", result)
            self.assertGreater(len(result["predictions"]), 0)
            role_names = [p["role"] for p in result["predictions"]]
            print(f'XGBoost dynamic inference passed: Top predicted roles: {role_names}')

            # 2. Verify all 6 model artifact hashes are 100% unchanged
            expected_hashes = {
                'best_model.joblib': 'db636c8044eab9a4',
                'encoder.joblib': '41ec32582cfa0b7e',
                'feature_metadata.json': '72bc7a30ee563432',
                'label_encoder.joblib': 'fa16dc68eafff66c',
                'scaler.joblib': 'd759ef48eac8a3ed',
                'synthetic_dataset.csv': '21f97a32408e3902'
            }
            
            models_dir = 'backend/ml/models'
            dataset_dir = 'backend/ml/dataset'
            for fname, prefix in expected_hashes.items():
                fpath = os.path.join(dataset_dir if fname.endswith('.csv') else models_dir, fname)
                with open(fpath, 'rb') as f:
                    sha = hashlib.sha256(f.read()).hexdigest()
                self.assertTrue(sha.startswith(prefix), f'Hash mismatch on {fname}: {sha} does not start with {prefix}')
            print('All ML model artifacts verified with identical SHA-256 hashes (zero retraining).')
        finally:
            db.close()

if __name__ == '__main__':
    unittest.main()
