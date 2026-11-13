"""
Phase 4 — Stage 5: Final Comprehensive End-to-End Verification Suite.
Validates the complete student evidence lifecycle, mentor authorization,
tri-layer synchronization, dynamic recalculation, role-transition persistence,
network resilience (Inconclusive), security isolation, ML artifact invariance,
database schema invariance, catalogue integrity, and dashboard preservation.
"""

import sys
import os
import unittest
import hashlib
from datetime import datetime
from unittest.mock import patch, MagicMock

# Ensure backend directory is in python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from sqlalchemy import inspect
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from main import app
from database import engine, SessionLocal
from models.user import User
from models.student_profile import StudentProfile
from models.competency_profile import CompetencyProfile
from models.skill_gap import SkillGapAnalysis, LearningResource, LearningProgress
from services.auth import create_access_token
from services.evidence import (
    is_ip_safe,
    RateLimitExceededException,
    InconclusiveNetworkException,
)
from routers.skill_gap import recalculate_skill_gap_for_user

client = TestClient(app)

# ML Baseline Hashes
BASELINE_ML_HASHES = {
    "backend/ml/models/best_model.joblib": "db636c8044eab9a4f920f4123aa36029b013b835b1480e238c1bf1c542ac58b6",
    "backend/ml/models/encoder.joblib": "41ec32582cfa0b7ef652bb46129a6e1291f31ca8c63094df8340c156ada5d72e",
    "backend/ml/models/feature_metadata.json": "72bc7a30ee563432f2306cad7322d30e02bb982fa634350b92f3d5ff5a57c009",
    "backend/ml/models/label_encoder.joblib": "fa16dc68eafff66c03b40d2c646074f8220f34b92d49c7f966050aaa95a63b6d",
    "backend/ml/models/scaler.joblib": "d759ef48eac8a3ed2d93aeef36974ba9d81b870bcd48adedc10fc15e6b38dc36",
    "backend/ml/dataset/synthetic_dataset.csv": "21f97a32408e390284e5f447ca04d8bf09815394ee7dc898df054f890370b303",
}


class Phase4Stage5E2EVerification(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ["MENTOR_FACULTY_EMAILS"] = "faculty@skillnova.ai,mentor@skillnova.ai,unmapped_mentor@skillnova.ai"
        os.environ["ADMIN_EMAILS"] = "admin@skillnova.ai"

        cls.db: Session = SessionLocal()
        cls.student = cls.db.query(User).filter(User.id == 13).first()
        if not cls.student:
            cls.student = cls.db.query(User).filter(User.email == "thanvith@gmail.com").first()
        assert cls.student is not None, "Test student not found in database."

        cls.student_token = create_access_token(data={"sub": cls.student.email})
        cls.student_headers = {"Authorization": f"Bearer {cls.student_token}"}

        # Mentor setup: faculty@skillnova.ai (AIML mentor, matching student's Machine Learning dept)
        cls.mentor = cls.db.query(User).filter(User.email == "faculty@skillnova.ai").first()
        if not cls.mentor:
            cls.mentor = User(
                email="faculty@skillnova.ai",
                full_name="Faculty Mentor",
                is_active=True,
                is_verified=True,
            )
            cls.db.add(cls.mentor)
            cls.db.commit()
            cls.db.refresh(cls.mentor)
        else:
            cls.mentor.is_active = True
            cls.mentor.is_verified = True
            cls.db.commit()

        cls.mentor_token = create_access_token(data={"sub": cls.mentor.email})
        cls.mentor_headers = {"Authorization": f"Bearer {cls.mentor_token}"}

        # Unmapped Mentor (has mentor email in MENTOR_FACULTY_EMAILS, but NO entry in MENTOR_DEPARTMENT_MAP)
        cls.unmapped = cls.db.query(User).filter(User.email == "unmapped_mentor@skillnova.ai").first()
        if not cls.unmapped:
            cls.unmapped = User(
                email="unmapped_mentor@skillnova.ai",
                full_name="Unmapped Mentor",
                is_active=True,
                is_verified=True,
            )
            cls.db.add(cls.unmapped)
            cls.db.commit()
            cls.db.refresh(cls.unmapped)
        else:
            cls.unmapped.is_active = True
            cls.unmapped.is_verified = True
            cls.db.commit()
        cls.unmapped_token = create_access_token(data={"sub": cls.unmapped.email})
        cls.unmapped_headers = {"Authorization": f"Bearer {cls.unmapped_token}"}

        # Mismatched Mentor (mentor@skillnova.ai, CSE only)
        cls.mismatched = cls.db.query(User).filter(User.email == "mentor@skillnova.ai").first()
        if not cls.mismatched:
            cls.mismatched = User(
                email="mentor@skillnova.ai",
                full_name="CSE Mentor",
                is_active=True,
                is_verified=True,
            )
            cls.db.add(cls.mismatched)
            cls.db.commit()
            cls.db.refresh(cls.mismatched)
        else:
            cls.mismatched.is_active = True
            cls.mismatched.is_verified = True
            cls.db.commit()
        cls.mismatched_token = create_access_token(data={"sub": cls.mismatched.email})
        cls.mismatched_headers = {"Authorization": f"Bearer {cls.mismatched_token}"}

    @classmethod
    def tearDownClass(cls):
        cls._clean_test_evidence()
        cls.db.close()

    @classmethod
    def _clean_test_evidence(cls):
        db = SessionLocal()
        try:
            comp = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == cls.student.id).first()
            if comp and comp.competency_json:
                data = dict(comp.competency_json)
                changed = False
                if "submitted_evidence" in data:
                    for k in ["django", "fastapi", "capstone_milestone", "docker", "solidity"]:
                        if k in data["submitted_evidence"]:
                            del data["submitted_evidence"][k]
                            changed = True
                if "verified_skills" in data:
                    data["verified_skills"] = [s for s in data["verified_skills"] if s.get("skill_identifier") not in ["django", "fastapi", "capstone_milestone", "docker", "solidity"]]
                    changed = True
                if "skills" in data:
                    data["skills"] = [s for s in data["skills"] if s.lower() not in ["django", "fastapi", "docker", "solidity"]]
                    changed = True
                if changed:
                    comp.competency_json = data
                    flag_modified(comp, "competency_json")
                    db.commit()

            sp = db.query(StudentProfile).filter(StudentProfile.user_id == cls.student.id).first()
            if sp:
                sp.preferred_job_role = "Python Developer"
                if sp.technical_skills:
                    if isinstance(sp.technical_skills, str):
                        skills = [s.strip() for s in sp.technical_skills.split(',') if s.strip().lower() not in ('django', 'docker', 'fastapi', 'solidity')]
                        sp.technical_skills = ', '.join(skills)
                    elif isinstance(sp.technical_skills, list):
                        sp.technical_skills = ', '.join([s for s in sp.technical_skills if s.lower() not in ('django', 'docker', 'fastapi', 'solidity')])
                db.commit()

            recalculate_skill_gap_for_user(db, cls.student.id, target_role_override="Python Developer")
        finally:
            db.close()

    def setUp(self):
        self._clean_test_evidence()

    def tearDown(self):
        self._clean_test_evidence()

    # =========================================================================
    # Test 1: Invariant ML Artifacts SHA-256 Hashes
    # =========================================================================
    def test_01_ml_artifact_hashes_match_baseline(self):
        """Verify all 6 machine learning artifacts retain identical SHA-256 hashes."""
        print("\n--- Test 1: ML Artifact SHA-256 Hash Invariance ---")
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        for rel_path, expected_hash in BASELINE_ML_HASHES.items():
            full_path = os.path.join(base_dir, rel_path)
            self.assertTrue(os.path.exists(full_path), f"Artifact missing: {rel_path}")
            with open(full_path, "rb") as f:
                actual_hash = hashlib.sha256(f.read()).hexdigest()
            self.assertEqual(
                actual_hash,
                expected_hash,
                f"Hash mismatch for {rel_path}! Expected: {expected_hash}, Got: {actual_hash}",
            )
            print(f"  ✓ {os.path.basename(rel_path)} matches baseline ({actual_hash[:16]}...)")

    # =========================================================================
    # Test 2: Database Schema & 120-Resource Catalogue Invariance
    # =========================================================================
    def test_02_database_schema_and_catalogue_invariance(self):
        """Verify zero schema changes and exactly 120 resources across 65 canonical skills."""
        print("\n--- Test 2: Database Schema & Catalogue Invariance ---")
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())
        expected_tables = {
            "users",
            "student_profiles",
            "competency_profiles",
            "skill_gap_analysis",
            "learning_resources",
            "learning_progress",
            "user_profiles",
            "resumes",
            "job_roles",
            "job_compatibility",
            "courses"
        }
        self.assertTrue(expected_tables.issubset(tables), f"Core tables missing: {expected_tables - tables}")

        # Check learning_progress columns (zero new columns)
        lp_cols = {c["name"] for c in inspector.get_columns("learning_progress")}
        expected_lp_cols = {"id", "user_id", "resource_id", "status", "progress_percentage", "created_at"}
        self.assertEqual(lp_cols, expected_lp_cols, "learning_progress schema modified!")

        # Check learning_resources catalogue count
        res_count = self.db.query(LearningResource).count()
        self.assertEqual(res_count, 120, f"Expected 120 verified resources, found {res_count}!")

        # Check unique skills covered in catalogue
        unique_canonical = {
            r.skill_name.strip().lower()
            for r in self.db.query(LearningResource).all()
            if r.skill_name
        }
        self.assertEqual(
            len(unique_canonical),
            69,
            f"Expected 69 unique skills in catalogue, found {len(unique_canonical)}!",
        )

        # Check coverage of all 65 canonical skills across all 14 roles
        from models.job import JobRole
        from services.normalizer import get_canonical_skill
        roles = self.db.query(JobRole).all()
        all_canonical_skills = set()
        for r in roles:
            role_skills = [get_canonical_skill(s).strip().lower() for s in (r.required_skills or []) + (r.preferred_skills or [])]
            all_canonical_skills.update([s for s in role_skills if s])
        self.assertEqual(
            len(all_canonical_skills),
            65,
            f"Expected 65 unique canonical skills across 14 roles, found {len(all_canonical_skills)}"
        )
        self.assertTrue(all_canonical_skills.issubset(unique_canonical), "Not all 65 role canonical skills covered in catalogue!")
        print("  ✓ Schema invariance confirmed (zero migrations, zero table additions).")
        print(f"  ✓ Catalogue verified: exactly 120 resources across 69 skills covering 100% of 65 canonical role skills.")

    # =========================================================================
    # Test 3: Complete End-to-End Student Workflow (Submission -> Review -> Elevation)
    # =========================================================================
    def test_03_complete_e2e_student_workflow(self):
        """Complete workflow: get path -> submit -> status Pending Review -> mentor approve -> tri-layer sync -> dynamic score elevation."""
        print("\n--- Test 3: Complete Student End-to-End Workflow ---")
        # 1. Fetch current learning path
        resp = client.get("/api/learning-path/me", headers=self.student_headers)
        self.assertEqual(resp.status_code, 200)
        lp_data = resp.json()
        stages = lp_data.get("stages", [])
        self.assertTrue(len(stages) > 0, "No stages found in learning path.")

        # Find Django step in stages
        target_step = None
        for stage in stages:
            for step in stage.get("steps", []):
                if step.get("canonical_skill", "").lower() == "django" or step.get("skill", "").lower() == "django":
                    target_step = step
                    break
            if target_step:
                break
        if not target_step:
            target_step = stages[0]["steps"][0]
        skill_id = target_step["skill_identifier"]
        canonical_skill = target_step.get("canonical_skill", target_step.get("skill", "Django"))

        # 2. Submit skill evidence
        with patch("services.evidence.fetch_verified_url_content") as mock_fetch, \
             patch("services.evidence.inspect_github_repository") as mock_repo:
            mock_fetch.return_value = (200, b"ok", "20.207.73.82", {})
            mock_repo.return_value = (True, ["manage.py", "settings.py"], None)

            sub_resp = client.post(
                "/api/learning-path/step-evidence",
                headers=self.student_headers,
                json={
                    "skill_identifier": skill_id,
                    "canonical_skill": canonical_skill,
                    "evidence_type": "github_repo",
                    "url": "https://github.com/thanvith/django-e2e-project",
                    "notes": "End-to-end verified implementation with unit tests.",
                },
            )
            self.assertEqual(sub_resp.status_code, 200)
            sub_json = sub_resp.json()
            self.assertEqual(sub_json["status"], "Pending Review")

        # 3. Verify status changes in learning path projection
        resp2 = client.get("/api/learning-path/me", headers=self.student_headers)
        self.assertEqual(resp2.status_code, 200)
        updated_step = None
        for stage in resp2.json().get("stages", []):
            for step in stage.get("steps", []):
                if step.get("skill_identifier") == skill_id:
                    updated_step = step
                    break
            if updated_step:
                break
        self.assertIsNotNone(updated_step)
        self.assertEqual(updated_step["evidence_status"], "Pending Review")
        self.assertIsNotNone(updated_step["evidence"])

        # 4. Mentor reviews and approves
        rev_resp = client.post(
            "/api/learning-path/review-evidence",
            headers=self.mentor_headers,
            json={
                "target_user_id": self.student.id,
                "skill_identifier": skill_id,
                "decision": "Approved",
                "reviewer_notes": "Excellent architecture, rigorous test coverage, clean structure.",
            },
        )
        self.assertEqual(rev_resp.status_code, 200)
        self.assertEqual(rev_resp.json()["status"], "Verified")

        # 5. Confirm tri-layer synchronization
        self.db.expire_all()
        comp = self.db.query(CompetencyProfile).filter(CompetencyProfile.user_id == self.student.id).first()
        sp = self.db.query(StudentProfile).filter(StudentProfile.user_id == self.student.id).first()

        evidence_entry = comp.competency_json["submitted_evidence"][skill_id]
        self.assertEqual(evidence_entry["status"], "Verified")
        self.assertEqual(evidence_entry["reviewed_by"], self.mentor.email)

        verified_entry = next(
            v for v in comp.competency_json["verified_skills"] if v["skill_identifier"] == skill_id
        )
        self.assertEqual(verified_entry["canonical_skill"], canonical_skill)
        self.assertEqual(verified_entry["verified_by"], self.mentor.email)

        # Check skills array and student profile
        self.assertIn(canonical_skill, comp.competency_json["skills"])
        self.assertIn(canonical_skill, sp.technical_skills)

        # 6. Confirm scoring and career-readiness recalculation
        self.assertTrue(comp.overall_score > 0)
        self.assertTrue(comp.backend_score > 0)
        gap = self.db.query(SkillGapAnalysis).filter(SkillGapAnalysis.user_id == self.student.id).first()
        self.assertIsNotNone(gap)
        self.assertTrue(gap.career_readiness_score > 0)

        # Check XGBoost dynamic inference succeeds
        ml_resp = client.post("/api/ml/predict", headers=self.student_headers)
        self.assertEqual(ml_resp.status_code, 200)
        predictions = ml_resp.json().get("predictions", [])
        self.assertTrue(len(predictions) > 0)
        print("  ✓ Full student submission -> mentor review -> tri-layer sync -> dynamic ML recalculation verified.")

    # =========================================================================
    # Test 4: Rejection and Resubmission Workflows
    # =========================================================================
    def test_04_rejection_and_resubmission_loop(self):
        """Reject submission with mentor notes -> student views feedback -> resubmits -> reset to Pending Review."""
        print("\n--- Test 4: Rejection and Resubmission Loop ---")
        skill_id = "django"
        canonical = "Django"

        with patch("services.evidence.fetch_verified_url_content") as mock_fetch, \
             patch("services.evidence.inspect_github_repository") as mock_repo:
            mock_fetch.return_value = (200, b"ok", "20.207.73.82", {})
            mock_repo.return_value = (True, ["manage.py"], None)

            # Initial submission
            client.post(
                "/api/learning-path/step-evidence",
                headers=self.student_headers,
                json={
                    "skill_identifier": skill_id,
                    "canonical_skill": canonical,
                    "evidence_type": "github_repo",
                    "url": "https://github.com/thanvith/django-initial-work",
                    "notes": "Initial draft submission.",
                },
            )

        # Mentor rejects
        rev_resp = client.post(
            "/api/learning-path/review-evidence",
            headers=self.mentor_headers,
            json={
                "target_user_id": self.student.id,
                "skill_identifier": skill_id,
                "decision": "Rejected",
                "reviewer_notes": "Missing unit tests and requirements.txt. Please add test cases.",
            },
        )
        self.assertEqual(rev_resp.status_code, 200)
        self.assertEqual(rev_resp.json()["status"], "Rejected")

        # Student checks learning path and views feedback
        lp_resp = client.get("/api/learning-path/me", headers=self.student_headers)
        step = None
        for stage in lp_resp.json().get("stages", []):
            for s in stage.get("steps", []):
                if s.get("skill_identifier") == skill_id:
                    step = s
                    break
            if step:
                break
        self.assertIsNotNone(step)
        self.assertEqual(step["evidence_status"], "Rejected")
        self.assertEqual(
            step["evidence"]["reviewer_notes"],
            "Missing unit tests and requirements.txt. Please add test cases.",
        )

        # Student resubmits revised evidence
        with patch("services.evidence.fetch_verified_url_content") as mock_fetch, \
             patch("services.evidence.inspect_github_repository") as mock_repo:
            mock_fetch.return_value = (200, b"ok", "20.207.73.82", {})
            mock_repo.return_value = (True, ["manage.py", "test_views.py"], None)

            resub_resp = client.post(
                "/api/learning-path/step-evidence",
                headers=self.student_headers,
                json={
                    "skill_identifier": skill_id,
                    "canonical_skill": canonical,
                    "evidence_type": "github_repo",
                    "url": "https://github.com/thanvith/django-revised-with-tests",
                    "notes": "Added pytest test suite with 100% coverage.",
                },
            )
            self.assertEqual(resub_resp.status_code, 200)
            self.assertEqual(resub_resp.json()["status"], "Pending Review")

        # Verify learning path projection reflects Pending Review
        lp_resp2 = client.get("/api/learning-path/me", headers=self.student_headers)
        step2 = None
        for stage in lp_resp2.json().get("stages", []):
            for s in stage.get("steps", []):
                if s.get("skill_identifier") == skill_id:
                    step2 = s
                    break
            if step2:
                break
        self.assertIsNotNone(step2)
        self.assertEqual(step2["evidence_status"], "Pending Review")
        print("  ✓ Rejection feedback surfaced and resubmission loop verified successfully.")

    # =========================================================================
    # Test 5: Capstone Submission, Approval & Role-Transition Persistence
    # =========================================================================
    def test_05_capstone_lifecycle_and_role_transition_persistence(self):
        """Submit capstone -> mentor approve -> role change -> verify pure structural persistence."""
        print("\n--- Test 5: Capstone Lifecycle & Role-Transition Persistence ---")
        with patch("services.evidence.fetch_verified_url_content") as mock_fetch, \
             patch("services.evidence.inspect_github_repository") as mock_repo:
            mock_fetch.return_value = (200, b"ok", "20.207.73.82", {})
            mock_repo.return_value = (True, ["app.py", "docker-compose.yml"], None)

            cap_sub = client.post(
                "/api/learning-path/capstone-evidence",
                headers=self.student_headers,
                json={
                    "url": "https://github.com/thanvith/capstone-enterprise-system",
                    "deployment_url": "https://capstone-demo.live",
                    "notes": "Full-stack enterprise application with automated CI/CD.",
                },
            )
            self.assertEqual(cap_sub.status_code, 200)
            self.assertEqual(cap_sub.json()["status"], "Pending Review")

        # Mentor approves capstone
        cap_rev = client.post(
            "/api/learning-path/review-evidence",
            headers=self.mentor_headers,
            json={
                "target_user_id": self.student.id,
                "skill_identifier": "capstone_milestone",
                "decision": "Approved",
                "reviewer_notes": "Exemplary production-grade capstone implementation.",
            },
        )
        self.assertEqual(cap_rev.status_code, 200)
        self.assertEqual(cap_rev.json()["status"], "Verified")

        # Switch student's target role to "Full Stack Developer"
        sp = self.db.query(StudentProfile).filter(StudentProfile.user_id == self.student.id).first()
        orig_role = sp.preferred_job_role or "Python Developer"
        try:
            sp.preferred_job_role = "Full Stack Developer"
            self.db.commit()

            recalc_gap = recalculate_skill_gap_for_user(self.db, self.student.id, target_role_override="Full Stack Developer")
            self.assertIsNotNone(recalc_gap)

            # Check that capstone task is structurally preserved as verified
            action_plan = recalc_gap.action_plan_json
            tasks = action_plan if isinstance(action_plan, list) else action_plan.get("tasks", [])
            capstone_task = next(
                (t for t in tasks if t.get("task_type") == "capstone"),
                None,
            )
            self.assertIsNotNone(capstone_task, "Capstone task missing after role change!")
            self.assertEqual(capstone_task.get("status"), "Completed")
            self.assertEqual(capstone_task.get("evidence", {}).get("status"), "Verified")
            self.assertEqual(capstone_task.get("skill_identifier"), "capstone_milestone")

            # Check master store is unaltered
            self.db.expire_all()
            comp = self.db.query(CompetencyProfile).filter(CompetencyProfile.user_id == self.student.id).first()
            self.assertEqual(
                comp.competency_json["submitted_evidence"]["capstone_milestone"]["status"],
                "Verified",
            )
            print("  ✓ Capstone milestone persisted across role change with pure structural checks.")
        finally:
            sp.preferred_job_role = orig_role
            self.db.commit()
            recalculate_skill_gap_for_user(self.db, self.student.id, target_role_override=orig_role)

    # =========================================================================
    # Test 6: Role-Based Access Control, Department Fail-Closed & Self-Approval
    # =========================================================================
    def test_06_security_rbac_department_and_self_approval(self):
        """Verify students blocked from mentor routes, mentor department mismatch fails closed, self-approval blocked."""
        print("\n--- Test 6: Security RBAC, Department Fail-Closed & Self-Approval ---")
        # 1. Student attempting mentor endpoints
        other_sp = self.db.query(StudentProfile).filter(StudentProfile.user_id != self.student.id).first()
        target_id = other_sp.user_id if other_sp else 5
        s_rev = client.post(
            "/api/learning-path/review-evidence",
            headers=self.student_headers,
            json={
                "target_user_id": target_id,
                "skill_identifier": "django",
                "decision": "Approved",
                "reviewer_notes": "Student trying to review",
            },
        )
        self.assertEqual(s_rev.status_code, 403)

        s_queue = client.get("/api/learning-path/pending-reviews", headers=self.student_headers)
        self.assertEqual(s_queue.status_code, 403)

        # 2. Self-approval blocked unconditionally
        mentor_user = self.db.query(User).filter(User.id == self.mentor.id).first()
        mentor_as_student_token = create_access_token(data={"sub": mentor_user.email})
        self_rev = client.post(
            "/api/learning-path/review-evidence",
            headers={"Authorization": f"Bearer {mentor_as_student_token}"},
            json={
                "target_user_id": self.mentor.id,
                "skill_identifier": "django",
                "decision": "Approved",
                "reviewer_notes": "Self review",
            },
        )
        self.assertEqual(self_rev.status_code, 403)

        # 3. Department fail-closed: unmapped mentor (in MENTOR_FACULTY_EMAILS but no MENTOR_DEPARTMENT_MAP entry)
        unmapped_rev = client.post(
            "/api/learning-path/review-evidence",
            headers=self.unmapped_headers,
            json={
                "target_user_id": self.student.id,
                "skill_identifier": "django",
                "decision": "Approved",
                "reviewer_notes": "Unmapped review",
            },
        )
        self.assertEqual(unmapped_rev.status_code, 403)
        self.assertIn("not authorized to review students", unmapped_rev.json()["detail"])

        # Unmapped mentor calling pending-reviews receives empty list
        unmapped_queue = client.get("/api/learning-path/pending-reviews", headers=self.unmapped_headers)
        self.assertEqual(unmapped_queue.status_code, 200)
        self.assertEqual(unmapped_queue.json(), [])

        # 4. Department mismatch: CSE mentor attempting to review Machine Learning student
        mismatched_rev = client.post(
            "/api/learning-path/review-evidence",
            headers=self.mismatched_headers,
            json={
                "target_user_id": self.student.id,
                "skill_identifier": "django",
                "decision": "Approved",
                "reviewer_notes": "Mismatched review",
            },
        )
        self.assertEqual(mismatched_rev.status_code, 403)
        self.assertIn("not authorized to review students", mismatched_rev.json()["detail"])

        # 5. Inactive reviewer account blocked
        self.mentor.is_active = False
        self.db.commit()
        try:
            inactive_rev = client.post(
                "/api/learning-path/review-evidence",
                headers=self.mentor_headers,
                json={
                    "target_user_id": self.student.id,
                    "skill_identifier": "django",
                    "decision": "Approved",
                    "reviewer_notes": "Inactive review",
                },
            )
            self.assertEqual(inactive_rev.status_code, 403)
            self.assertIn("Inactive", inactive_rev.json()["detail"])
        finally:
            self.mentor.is_active = True
            self.db.commit()

        print("  ✓ Strict fail-closed departmental security, mismatch rejection, inactive blocking & self-approval prohibition verified.")

    # =========================================================================
    # Test 7: Network Inconclusive State, SSRF Protection & DNS Pinning
    # =========================================================================
    def test_07_network_inconclusive_and_ssrf_protection(self):
        """Verify rate limits and transient timeouts yield Inconclusive, SSRF targets blocked."""
        print("\n--- Test 7: Network Inconclusive & SSRF Security ---")
        # 1. SSRF IP checks
        self.assertFalse(is_ip_safe("127.0.0.1"))
        self.assertFalse(is_ip_safe("10.0.0.1"))
        self.assertFalse(is_ip_safe("192.168.1.1"))
        self.assertFalse(is_ip_safe("169.254.169.254"))
        self.assertFalse(is_ip_safe("::1"))
        self.assertTrue(is_ip_safe("20.207.73.82"))

        # 2. RateLimit yields Inconclusive
        with patch("services.evidence.fetch_verified_url_content") as mock_fetch:
            mock_fetch.side_effect = RateLimitExceededException("GitHub API secondary rate limit triggered", retry_after=60)
            sub_rl = client.post(
                "/api/learning-path/step-evidence",
                headers=self.student_headers,
                json={
                    "skill_identifier": "django",
                    "canonical_skill": "Django",
                    "evidence_type": "github_repo",
                    "url": "https://github.com/thanvith/django-rl-test",
                },
            )
            self.assertEqual(sub_rl.status_code, 200)
            self.assertEqual(sub_rl.json()["status"], "Inconclusive")

        self._clean_test_evidence()

        # 3. Timeout yields Inconclusive
        with patch("services.evidence.fetch_verified_url_content") as mock_fetch:
            mock_fetch.side_effect = InconclusiveNetworkException("Socket connection timed out")
            sub_to = client.post(
                "/api/learning-path/step-evidence",
                headers=self.student_headers,
                json={
                    "skill_identifier": "django",
                    "canonical_skill": "Django",
                    "evidence_type": "github_repo",
                    "url": "https://github.com/thanvith/django-to-test",
                },
            )
            self.assertEqual(sub_to.status_code, 200)
            self.assertEqual(sub_to.json()["status"], "Inconclusive")
            print("  ✓ Network rate-limits and timeouts correctly classified as Inconclusive (never rejected).")

    # =========================================================================
    # Test 8: Concurrency & Duplicate Submission Protection
    # =========================================================================
    def test_08_duplicate_submission_protection(self):
        """Verify submitting evidence for an already Verified skill is rejected."""
        print("\n--- Test 8: Duplicate Submission Protection ---")
        skill_id = "django"
        canonical = "Django"

        with patch("services.evidence.fetch_verified_url_content") as mock_fetch, \
             patch("services.evidence.inspect_github_repository") as mock_repo:
            mock_fetch.return_value = (200, b"ok", "20.207.73.82", {})
            mock_repo.return_value = (True, ["manage.py"], None)

            # 1. Submit initial evidence
            res_sub = client.post(
                "/api/learning-path/step-evidence",
                headers=self.student_headers,
                json={
                    "skill_identifier": skill_id,
                    "canonical_skill": canonical,
                    "evidence_type": "github_repo",
                    "url": "https://github.com/thanvith/django-verified-app",
                },
            )
            self.assertEqual(res_sub.status_code, 200)

            # 2. Mentor approves
            res_rev = client.post(
                "/api/learning-path/review-evidence",
                headers=self.mentor_headers,
                json={
                    "target_user_id": self.student.id,
                    "skill_identifier": skill_id,
                    "decision": "Approved",
                    "reviewer_notes": "Officially verified.",
                },
            )
            self.assertEqual(res_rev.status_code, 200)
            self.assertEqual(res_rev.json()["status"], "Verified")

            # 3. Attempt duplicate submission on verified skill
            dup_sub = client.post(
                "/api/learning-path/step-evidence",
                headers=self.student_headers,
                json={
                    "skill_identifier": skill_id,
                    "canonical_skill": canonical,
                    "evidence_type": "github_repo",
                    "url": "https://github.com/thanvith/another-repo",
                },
            )
            self.assertEqual(dup_sub.status_code, 400)
            self.assertIn("already been platform verified", dup_sub.json()["detail"])
            print("  ✓ Duplicate submission on verified skill rejected with 400 Bad Request.")

    # =========================================================================
    # Test 9: Master Evidence Authoritative Precedence & Regeneration
    # =========================================================================
    def test_09_master_evidence_precedence_and_profile_regeneration(self):
        """Verify action_plan_json tampering cannot corrupt master store and evidence survives regeneration."""
        print("\n--- Test 9: Master Store Authoritative Precedence & Regeneration ---")
        skill_id = "django"
        canonical = "Django"

        with patch("services.evidence.fetch_verified_url_content") as mock_fetch, \
             patch("services.evidence.inspect_github_repository") as mock_repo:
            mock_fetch.return_value = (200, b"ok", "20.207.73.82", {})
            mock_repo.return_value = (True, ["manage.py"], None)

            # 1. Submit and approve
            client.post(
                "/api/learning-path/step-evidence",
                headers=self.student_headers,
                json={
                    "skill_identifier": skill_id,
                    "canonical_skill": canonical,
                    "evidence_type": "github_repo",
                    "url": "https://github.com/thanvith/django-master",
                },
            )
            client.post(
                "/api/learning-path/review-evidence",
                headers=self.mentor_headers,
                json={
                    "target_user_id": self.student.id,
                    "skill_identifier": skill_id,
                    "decision": "Approved",
                    "reviewer_notes": "Master verified.",
                },
            )

        # Regenerate profile
        regen_resp = client.post("/api/competency-profile/generate", headers=self.student_headers)
        self.assertEqual(regen_resp.status_code, 200)

        # Check evidence survived regeneration
        self.db.expire_all()
        comp_after = self.db.query(CompetencyProfile).filter(CompetencyProfile.user_id == self.student.id).first()
        self.assertIn(skill_id, comp_after.competency_json["submitted_evidence"])
        self.assertEqual(
            comp_after.competency_json["submitted_evidence"][skill_id]["status"],
            "Verified",
        )

        # Tamper with action_plan_json in skill_gap
        gap = self.db.query(SkillGapAnalysis).filter(SkillGapAnalysis.user_id == self.student.id).first()
        if gap and gap.action_plan_json:
            ap_data = list(gap.action_plan_json)
            for t in ap_data:
                if isinstance(t, dict):
                    t["status"] = "TamperedStatus"
            gap.action_plan_json = ap_data
            flag_modified(gap, "action_plan_json")
            self.db.commit()

        # Recalculate skill gap
        recalc_gap = recalculate_skill_gap_for_user(self.db, self.student.id)
        self.assertIsNotNone(recalc_gap)

        # Check that master store was not altered by tampered action plan
        self.db.expire_all()
        comp_final = self.db.query(CompetencyProfile).filter(CompetencyProfile.user_id == self.student.id).first()
        self.assertEqual(
            comp_final.competency_json["submitted_evidence"][skill_id]["status"],
            "Verified",
        )
        print("  ✓ Unidirectional precedence confirmed: master evidence store is immune to tampering.")

    # =========================================================================
    # Test 10: Dashboard Overview Metric Cards Preservation
    # =========================================================================
    def test_10_dashboard_overview_metrics_preservation(self):
        """Verify the 4 core Career Intelligence Overview metric cards remain intact."""
        print("\n--- Test 10: Dashboard Metric Cards Preservation ---")
        resp = client.get("/api/dashboard/", headers=self.student_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("competency_scores", data)
        self.assertIn("job_compatibility", data)
        self.assertIn("skill_gap", data)

        # Verify frontend dashboard source code has all 4 approved overview cards
        dash_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "pages", "Dashboard.jsx")
        )
        with open(dash_path, "r", encoding="utf-8") as f:
            dash_code = f.read()

        cards = [
            "Profile Completion",
            "Best Job Description Match",
            "AI Career Prediction",
            "Career Readiness",
        ]
        for card in cards:
            self.assertIn(card, dash_code, f"Dashboard overview metric card '{card}' missing!")
            print(f"  ✓ Overview Card '{card}' preserved.")


if __name__ == "__main__":
    unittest.main()
