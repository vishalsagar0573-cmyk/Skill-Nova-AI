import os
import sys
import json

WORKSPACE_DIR = r"c:\Users\visha\OneDrive\Desktop\mp"
BACKEND_DIR = os.path.join(WORKSPACE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import models.user
import models.student_profile
import models.competency_profile
import models.job
import models.resume
import models.skill_gap
from database import SessionLocal
from services.normalizer import get_canonical_skill
from services.hybrid_search import HybridResourceSearchEngine, get_sidecar_metadata
from services.resource_verifier import validate_url_safety, verify_resource_url, is_domain_whitelisted
from routers.skill_gap import recalculate_skill_gap_for_user


def test_universal_skill_coverage(db, engine):
    print("\n--- Test 1: Universal Skill Coverage Across All 14 Roles ---")
    roles = db.query(models.job.JobRole).all()
    assert len(roles) == 14, f"Expected 14 job roles, found {len(roles)}"

    all_canonical_skills = set()
    role_to_skills = {}
    for r in roles:
        role_skills = [get_canonical_skill(s) for s in (r.required_skills or []) + (r.preferred_skills or [])]
        role_skills = [s for s in role_skills if s]
        role_to_skills[r.role_name] = role_skills
        all_canonical_skills.update(role_skills)

    print(f"Total unique canonical skills across all 14 roles: {len(all_canonical_skills)}")
    assert len(all_canonical_skills) == 65, f"Expected 65 unique canonical skills, found {len(all_canonical_skills)}"

    missing_coverage = []
    coverage_counts = {}
    for skill in sorted(all_canonical_skills):
        resources = engine.search_by_skill(db, skill)
        coverage_counts[skill] = len(resources)
        if len(resources) == 0:
            missing_coverage.append(skill)
        else:
            # Check fields
            r0 = resources[0]
            assert r0["title"], f"Empty title for skill {skill}"
            assert r0["url"], f"Empty URL for skill {skill}"
            assert r0["provider"], f"Empty provider for skill {skill}"
            assert r0["cost_tier"] in ("Free", "Free Audit Available", "Open Source", "Freemium", "Paid"), f"Invalid cost_tier for {skill}: {r0['cost_tier']}"
            assert r0["verification_status"] in ("verified", "temporarily_inaccessible"), f"Invalid verification_status for {skill}: {r0['verification_status']}"

    print(f"Skills covered: {len(all_canonical_skills) - len(missing_coverage)} / {len(all_canonical_skills)}")
    if missing_coverage:
        print(f"FAILED: Missing coverage for: {missing_coverage}")
    else:
        print(f"PASSED: 100% of all 65 canonical skills have verified learning resources.")
    assert len(missing_coverage) == 0


def test_ssrf_and_whitelist():
    print("\n--- Test 2: SSRF Prevention and Domain Whitelist Security ---")
    dangerous_urls = [
        "http://localhost:8000/api/internal",
        "http://127.0.0.1:8000/metrics",
        "http://169.254.169.254/latest/meta-data/",
        "http://192.168.1.1/router",
        "http://10.0.0.5/secrets",
        "https://random-unverified-blog.xyz/post"
    ]

    for url in dangerous_urls:
        res = verify_resource_url(url, check_whitelist=True)
        assert not res["is_valid"], f"Expected URL {url} to be blocked or rejected, but got is_valid=True"
        print(f"  [BLOCKED/REJECTED] {url} -> status: {res['status']}, reason: {res['details']}")

    # Check that authentic educational domains pass
    valid_test_urls = [
        "https://docs.python.org/3/tutorial/",
        "https://cs50.harvard.edu/python/",
        "https://react.dev/learn"
    ]
    for url in valid_test_urls:
        safe, msg, host = validate_url_safety(url)
        assert safe, f"Expected {url} to be SSRF-safe: {msg}"
        assert is_domain_whitelisted(host), f"Expected {host} to be whitelisted"
        print(f"  [ALLOWED & WHITELISTED] {url} -> host: {host}")

    print("PASSED: SSRF protection and whitelist enforcement verified.")


def test_cross_career_resource_reuse(db, engine):
    print("\n--- Test 3: Cross-Career Resource Reuse Without Duplication ---")
    shared_skills = ["Python", "SQL", "Docker", "Git", "Linux", "AWS"]

    for skill in shared_skills:
        resources = engine.search_by_skill(db, skill)
        assert len(resources) > 0, f"No resources found for shared skill {skill}"
        urls = [r["url"] for r in resources]
        # Ensure no duplicates in returned resource URLs for this skill
        assert len(urls) == len(set(urls)), f"Duplicate URLs returned for skill {skill}"
        print(f"  Shared skill '{skill}': {len(resources)} verified resources available across multiple careers.")

    # Check database rows for 'Python'
    canon_py = get_canonical_skill("Python")
    db_py_count = db.query(models.skill_gap.LearningResource).filter(
        models.skill_gap.LearningResource.skill_name == canon_py
    ).count()
    print(f"  Database has {db_py_count} unique rows for '{canon_py}' serving all Python-related careers.")
    assert db_py_count <= 4, f"Too many duplicate rows in database for {canon_py}: {db_py_count}"
    print("PASSED: Cross-career reuse verified.")


def test_strict_canonical_isolation(db, engine):
    print("\n--- Test 4: Strict Canonical Isolation ---")
    # React vs React Native
    react_res = engine.search_by_skill(db, "React")
    react_native_res = engine.search_by_skill(db, "React Native")
    react_urls = {r["url"] for r in react_res}
    react_native_urls = {r["url"] for r in react_native_res}
    overlap_react = react_urls.intersection(react_native_urls)
    assert len(overlap_react) == 0, f"Conflation between React and React Native: {overlap_react}"
    print(f"  React ({len(react_res)}) vs React Native ({len(react_native_res)}): Zero overlap.")

    # SQL vs PostgreSQL
    sql_res = engine.search_by_skill(db, "SQL")
    pg_res = engine.search_by_skill(db, "PostgreSQL")
    sql_urls = {r["url"] for r in sql_res}
    pg_urls = {r["url"] for r in pg_res}
    overlap_sql = sql_urls.intersection(pg_urls)
    assert len(overlap_sql) == 0, f"Conflation between SQL and PostgreSQL: {overlap_sql}"
    print(f"  SQL ({len(sql_res)}) vs PostgreSQL ({len(pg_res)}): Zero overlap.")

    # Machine Learning vs Deep Learning
    ml_res = engine.search_by_skill(db, "Machine Learning")
    dl_res = engine.search_by_skill(db, "Deep Learning")
    ml_urls = {r["url"] for r in ml_res}
    dl_urls = {r["url"] for r in dl_res}
    overlap_ml = ml_urls.intersection(dl_urls)
    assert len(overlap_ml) == 0, f"Conflation between ML and DL: {overlap_ml}"
    print(f"  Machine Learning ({len(ml_res)}) vs Deep Learning ({len(dl_res)}): Zero overlap.")

    # TensorFlow vs PyTorch
    tf_res = engine.search_by_skill(db, "TensorFlow")
    pt_res = engine.search_by_skill(db, "PyTorch")
    tf_urls = {r["url"] for r in tf_res}
    pt_urls = {r["url"] for r in pt_res}
    overlap_tf = tf_urls.intersection(pt_urls)
    assert len(overlap_tf) == 0, f"Conflation between TensorFlow and PyTorch: {overlap_tf}"
    print(f"  TensorFlow ({len(tf_res)}) vs PyTorch ({len(pt_res)}): Zero overlap.")

    print("PASSED: Strict canonical domain isolation verified.")


def test_zero_schema_changes_and_plain_text(db):
    print("\n--- Test 5: Zero Database Schema Changes & Plain Text Descriptions ---")
    from sqlalchemy import inspect
    inspector = inspect(db.bind)
    columns = inspector.get_columns("learning_resources")
    col_names = [c["name"] for c in columns]
    expected_cols = [
        "id", "skill_name", "resource_type", "title", "provider",
        "url", "difficulty", "estimated_duration", "description", "created_at"
    ]
    assert sorted(col_names) == sorted(expected_cols), f"Schema modified! Columns: {col_names}"
    print(f"  Columns verified: {col_names}")

    # Check descriptions are plain text
    sample_resources = db.query(models.skill_gap.LearningResource).limit(20).all()
    for r in sample_resources:
        desc = r.description or ""
        assert not (desc.startswith("{") and desc.endswith("}")), f"Description contains JSON blob: {desc}"
        assert len(desc) > 10, f"Description is too short: {desc}"
    print(f"  All tested descriptions confirmed as authentic human-readable plain text.")
    print("PASSED: Zero database schema changes verified.")


def test_sidecar_metadata_integrity():
    print("\n--- Test 6: Sidecar Metadata Integrity ---")
    sidecar = get_sidecar_metadata()
    assert len(sidecar) > 0, "Sidecar metadata is empty"

    catalog_path = os.path.join(BACKEND_DIR, "data", "verified_resources.json")
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    for item in catalog:
        url = item["url"].strip()
        res_id = str(item["id"])
        meta = sidecar.get(url) or sidecar.get(res_id)
        assert meta.get("cost_tier") in ("Free", "Free Audit Available", "Open Source", "Freemium", "Paid"), f"Invalid cost_tier in sidecar: {meta.get('cost_tier')}"
        assert meta.get("verification_status") in ("verified", "temporarily_inaccessible")
        assert "last_verified_at" in meta

    print(f"  Sidecar metadata validated for all {len(catalog)} resources in catalogue.")
    print("PASSED: Sidecar metadata integrity verified.")


def test_live_user_workflow(db):
    print("\n--- Test 7: Live User Skill Gap & Resource Recommendation Workflow ---")
    # Test User 13 (Thanvith)
    record = recalculate_skill_gap_for_user(db, 13)
    assert record.target_role == "Python Developer", f"Unexpected target role: {record.target_role}"
    print(f"  User 13 Target Role: {record.target_role}")
    print(f"  Overall Gap: {record.overall_gap_percentage}%")
    print(f"  Career Readiness Score: {record.career_readiness_score:.2f}/100")
    print(f"  Missing Skills: {[s['skill'] for s in record.missing_skills_json]}")

    rec_resources = record.recommended_resources_json or {}
    for skill_info in record.missing_skills_json:
        skill = skill_info["skill"]
        res_list = rec_resources.get(skill, [])
        assert len(res_list) > 0, f"Missing recommendations for missing skill '{skill}'"
        print(f"    - Skill '{skill}' ({len(res_list)} resources):")
        for r in res_list:
            print(f"        * [{r.get('type')}] {r.get('title')} ({r.get('provider')}) - Cost: {r.get('cost_tier')} - Status: {r.get('verification_status')}")
            assert r.get("url"), f"Missing URL for resource in skill {skill}"
            assert r.get("provider"), f"Missing provider for resource in skill {skill}"

    # Action Plan verification
    action_plan = record.action_plan_json or []
    assert len(action_plan) > 0, "Action plan is empty"
    print(f"  Structured Action Plan: {len(action_plan)} milestones generated.")
    for task in action_plan[:3]:
        print(f"    Week {task['week']}: {task['task']} ({task['estimated_hours']}h) -> {task.get('resource_url')}")

    print("PASSED: Live user workflow verified.")


def main():
    print("=================================================================")
    print("SkillNova AI - Phase 2 Universal Verified Catalogue Test Suite")
    print("=================================================================")

    db = SessionLocal()
    engine = HybridResourceSearchEngine()

    try:
        test_universal_skill_coverage(db, engine)
        test_ssrf_and_whitelist()
        test_cross_career_resource_reuse(db, engine)
        test_strict_canonical_isolation(db, engine)
        test_zero_schema_changes_and_plain_text(db)
        test_sidecar_metadata_integrity()
        test_live_user_workflow(db)
        print("\n=================================================================")
        print("ALL 7 PHASE 2 TESTS PASSED SUCCESSFULLY!")
        print("=================================================================")
    finally:
        db.close()


if __name__ == "__main__":
    main()
