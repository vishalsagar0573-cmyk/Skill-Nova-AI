import os
import sys
import json
import socket
import ipaddress
import hashlib
import time
from datetime import datetime, timezone
from urllib.parse import urlparse
import requests

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
from services.normalizer import get_canonical_skill, is_same_skill
from services.resource_verifier import validate_url_safety, verify_resource_url, is_domain_whitelisted, is_anti_bot_domain, TRUSTED_DOMAINS
from services.hybrid_search import HybridResourceSearchEngine, get_sidecar_metadata
from services.seed_resources import sync_learning_resources
from routers.skill_gap import recalculate_skill_gap_for_user

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def run_live_url_audit():
    """Section 1: Live probe every one of the 120 learning resources."""
    print("\n" + "="*80)
    print("AUDIT SECTION 1: LIVE PROBE OF ALL 120 LEARNING RESOURCES")
    print("="*80)

    catalog_path = os.path.join(BACKEND_DIR, "data", "verified_resources.json")
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    print(f"Total catalog entries to audit: {len(catalog)}")

    session = requests.Session()
    session.headers.update({
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    })

    live_verified = []
    temporarily_inaccessible = []
    redirected = []
    broken_or_failed = []
    domain_mismatches = []
    relevance_issues = []

    for idx, item in enumerate(catalog):
        res_id = item["id"]
        skill = item["skill_name"]
        url = item["url"]
        title = item["title"]
        provider = item["provider"]
        res_type = item["resource_type"]

        parsed = urlparse(url)
        host = parsed.hostname.lower() if parsed.hostname else ""

        # Check domain whitelist
        whitelisted = is_domain_whitelisted(host)
        if not whitelisted:
            domain_mismatches.append({
                "id": res_id, "skill": skill, "host": host, "url": url
            })

        # Probe URL live
        status_code = None
        final_url = url
        error_msg = None
        duration_sec = 0.0

        try:
            t0 = time.time()
            resp = session.get(url, timeout=6.0, allow_redirects=True, stream=True)
            duration_sec = round(time.time() - t0, 2)
            status_code = resp.status_code
            final_url = resp.url
            resp.close()
        except requests.exceptions.SSLError as e:
            error_msg = f"SSL Error: {str(e)[:80]}"
        except requests.exceptions.Timeout:
            error_msg = "Timeout (>6s)"
        except requests.exceptions.ConnectionError as e:
            error_msg = f"Connection Failed: {str(e)[:80]}"
        except Exception as e:
            error_msg = f"Error: {str(e)[:80]}"

        # Check for redirects
        is_redirected = (final_url.rstrip("/") != url.rstrip("/")) and (status_code in (200, 204))

        audit_entry = {
            "id": res_id,
            "skill": skill,
            "title": title,
            "provider": provider,
            "url": url,
            "final_url": final_url,
            "status_code": status_code,
            "duration": duration_sec,
            "error": error_msg,
            "is_whitelisted": whitelisted
        }

        if status_code in (200, 204):
            if is_redirected:
                redirected.append(audit_entry)
            live_verified.append(audit_entry)
        elif status_code in (403, 429):
            # Bot protection / Cloudflare challenge
            temporarily_inaccessible.append(audit_entry)
        else:
            broken_or_failed.append(audit_entry)

    print(f"\n--- URL Probe Results Summary ---")
    print(f"Total Resources Audited: {len(catalog)}")
    print(f"  [1] Live Verified (HTTP 200 OK): {len(live_verified)} ({len(live_verified)/len(catalog)*100:.1f}%)")
    print(f"  [2] Temporarily Inaccessible (HTTP 403/429 Bot Protection): {len(temporarily_inaccessible)} ({len(temporarily_inaccessible)/len(catalog)*100:.1f}%)")
    print(f"  [3] Redirected Destinations: {len(redirected)}")
    print(f"  [4] Broken / Failed / Error: {len(broken_or_failed)}")
    print(f"  [5] Domains Not In Verifier Whitelist: {len(domain_mismatches)}")

    if temporarily_inaccessible:
        print("\nTemporarily Inaccessible Resources (Protected by Cloudflare/Anti-Bot):")
        for r in temporarily_inaccessible:
            print(f"  - ID {r['id']} [{r['skill']}]: {r['title']} ({r['provider']}) -> HTTP {r['status_code']} on {r['url']}")

    if broken_or_failed:
        print("\nBroken / Failed Resources:")
        for r in broken_or_failed:
            print(f"  - ID {r['id']} [{r['skill']}]: {r['title']} -> Status {r['status_code']}, Error: {r['error']}, URL: {r['url']}")

    if domain_mismatches:
        print("\nDomains in Catalog Not Currently in resource_verifier.py TRUSTED_DOMAINS:")
        unique_mismatch_hosts = sorted(list(set(m["host"] for m in domain_mismatches)))
        for h in unique_mismatch_hosts:
            sample_skill = next(m["skill"] for m in domain_mismatches if m["host"] == h)
            print(f"  - Host: {h} (Used by: {sample_skill})")

    return {
        "total": len(catalog),
        "live_verified": len(live_verified),
        "temporarily_inaccessible": len(temporarily_inaccessible),
        "redirected": len(redirected),
        "broken": len(broken_or_failed),
        "unwhitelisted_domains": len(domain_mismatches),
        "unwhitelisted_hosts": sorted(list(set(m["host"] for m in domain_mismatches))),
        "broken_details": broken_or_failed,
        "bot_details": temporarily_inaccessible
    }


def audit_canonical_skill_coverage(db, engine):
    """Section 2: Verify all 65 canonical skills across all 14 roles."""
    print("\n" + "="*80)
    print("AUDIT SECTION 2: CANONICAL SKILL COVERAGE & DOMAIN ISOLATION")
    print("="*80)

    roles = db.query(models.job.JobRole).all()
    all_role_skills = set()
    role_breakdown = {}

    for r in roles:
        req = [get_canonical_skill(s) for s in (r.required_skills or [])]
        pref = [get_canonical_skill(s) for s in (r.preferred_skills or [])]
        combined = list(dict.fromkeys(req + pref))
        all_role_skills.update(combined)
        role_breakdown[r.role_name] = {
            "required": req,
            "preferred": pref,
            "total": len(combined)
        }

    print(f"Total roles audited: {len(roles)}")
    print(f"Total unique canonical skills required/preferred across 14 roles: {len(all_role_skills)}")

    zero_coverage_skills = []
    coverage_map = {}
    for skill in sorted(all_role_skills):
        res = engine.search_by_skill(db, skill)
        coverage_map[skill] = len(res)
        if len(res) == 0:
            zero_coverage_skills.append(skill)

    print(f"Skills with at least 1 verified resource: {len(all_role_skills) - len(zero_coverage_skills)} / {len(all_role_skills)}")
    if zero_coverage_skills:
        print(f"CRITICAL: Zero coverage for: {zero_coverage_skills}")
    else:
        print("Coverage: 100% of skills have >= 1 resource.")

    # Cross-career reuse audit
    print("\nCross-Career Resource Reuse Audit:")
    common_skills = ["Python", "SQL", "Docker", "Git", "Linux", "AWS"]
    for s in common_skills:
        res = engine.search_by_skill(db, s)
        print(f"  - Skill '{s}': {len(res)} resources. Shared across {sum(1 for r in roles if s in (r.required_skills or []) or s in (r.preferred_skills or []))} roles.")

    # Strict isolation audit
    print("\nStrict Skill Isolation Audit:")
    pairs = [
        ("React", "React Native"),
        ("SQL", "PostgreSQL"),
        ("Machine Learning", "Deep Learning"),
        ("TensorFlow", "PyTorch"),
        ("Java", "JavaScript"),
        ("C", "C++")
    ]
    isolation_violations = []
    for s1, s2 in pairs:
        r1 = set(r["url"] for r in engine.search_by_skill(db, s1))
        r2 = set(r["url"] for r in engine.search_by_skill(db, s2))
        overlap = r1.intersection(r2)
        if overlap:
            isolation_violations.append((s1, s2, overlap))
            print(f"  [VIOLATION] Overlap between {s1} and {s2}: {overlap}")
        else:
            print(f"  [ISOLATED] {s1} ({len(r1)} urls) vs {s2} ({len(r2)} urls) -> 0 overlap")

    return {
        "unique_skills": len(all_role_skills),
        "zero_coverage": zero_coverage_skills,
        "isolation_violations": isolation_violations,
        "coverage_map": coverage_map
    }


def audit_security_and_ssrf():
    """Section 3: Audit hybrid search and SSRF protection."""
    print("\n" + "="*80)
    print("AUDIT SECTION 3: HYBRID SEARCH SECURITY & SSRF PROTECTION")
    print("="*80)

    test_vectors = [
        # Loopback IPv4
        ("http://127.0.0.1:8000/api/internal", "IPv4 Loopback 127.0.0.1"),
        ("http://127.0.0.2:8080/admin", "IPv4 Loopback 127.0.0.2"),
        ("http://localhost:8000", "Localhost hostname"),
        ("http://localhost.localdomain", "Localhost domain"),
        # Private Class A/B/C
        ("http://10.0.0.1/admin", "Private Class A (10.0.0.0/8)"),
        ("http://10.255.255.254/secret", "Private Class A high end"),
        ("http://172.16.0.1:9000", "Private Class B (172.16.0.0/12)"),
        ("http://172.31.255.255", "Private Class B high end"),
        ("http://192.168.1.1", "Private Class C (192.168.0.0/16)"),
        ("http://192.168.100.50", "Private Class C"),
        # Link-Local / Cloud Metadata
        ("http://169.254.169.254/latest/meta-data/", "AWS/GCP/Azure Cloud Metadata (169.254.169.254)"),
        ("http://169.254.1.1", "Link-Local IPv4"),
        # CGNAT
        ("http://100.64.0.1", "Carrier-Grade NAT (100.64.0.0/10)"),
        # IPv6
        ("http://[::1]:8000", "IPv6 Loopback"),
        # Dangerous Schemes
        ("file:///c:/Windows/System32/drivers/etc/hosts", "file:// scheme"),
        ("ftp://internal-server.local", "ftp:// scheme"),
        # Untrusted Domains
        ("https://malicious-educational-scam.xyz/course", "Untrusted Domain .xyz"),
        ("https://pastebin.com/raw/abcd", "Arbitrary pastebin link"),
    ]

    security_failures = []
    for url, desc in test_vectors:
        try:
            res = verify_resource_url(url, check_whitelist=True)
            if res["is_valid"]:
                security_failures.append((url, desc, "Allowed when should be blocked"))
                print(f"  [SECURITY FAIL] {desc} ({url}) was ALLOWED!")
            else:
                print(f"  [SECURITY PASS] {desc} -> Blocked ({res['status']}: {res['details']})")
        except Exception as e:
            print(f"  [SECURITY PASS] {desc} -> Exception caught ({e})")

    # Audit dynamic discovery safety
    engine = HybridResourceSearchEngine()
    fake_skill = "ArbitraryCodeInjectionSkill'; DROP TABLE users;--"
    fallback_res = engine.search_by_skill(SessionLocal(), fake_skill)
    print(f"\nDynamic discovery test on malicious input '{fake_skill}':")
    print(f"  Result count: {len(fallback_res)}")
    if fallback_res:
        security_failures.append((fake_skill, "SQL injection string generated resources", fallback_res))

    return {
        "test_vectors_count": len(test_vectors),
        "security_failures": security_failures
    }


def audit_database_and_startup_integrity(db):
    """Section 4: Verify schema, plain-text descriptions, and idempotency."""
    print("\n" + "="*80)
    print("AUDIT SECTION 4: DATABASE SCHEMA & STARTUP IDEMPOTENCY INTEGRITY")
    print("="*80)

    # 1. Schema check
    from sqlalchemy import inspect
    inspector = inspect(db.bind)
    columns = inspector.get_columns("learning_resources")
    col_names = [c["name"] for c in columns]
    expected_cols = [
        "id", "skill_name", "resource_type", "title", "provider",
        "url", "difficulty", "estimated_duration", "description", "created_at"
    ]
    schema_intact = (sorted(col_names) == sorted(expected_cols))
    print(f"learning_resources columns: {col_names}")
    print(f"Schema exactly matches original un-migrated schema: {schema_intact}")

    # 2. Plain text descriptions
    rows = db.query(models.skill_gap.LearningResource).all()
    json_desc_count = 0
    empty_desc_count = 0
    for r in rows:
        desc = (r.description or "").strip()
        if desc.startswith("{") and desc.endswith("}"):
            json_desc_count += 1
        if not desc:
            empty_desc_count += 1

    print(f"Total rows in learning_resources: {len(rows)}")
    print(f"JSON-formatted descriptions (should be 0): {json_desc_count}")
    print(f"Empty descriptions: {empty_desc_count}")

    # 3. Idempotency test (Run sync_learning_resources twice)
    initial_count = db.query(models.skill_gap.LearningResource).count()
    sync_result_1 = sync_learning_resources(db, remove_unverified_legacy=True)
    count_after_sync_1 = db.query(models.skill_gap.LearningResource).count()
    sync_result_2 = sync_learning_resources(db, remove_unverified_legacy=True)
    count_after_sync_2 = db.query(models.skill_gap.LearningResource).count()

    print(f"Idempotency Test:")
    print(f"  Count before sync: {initial_count}")
    print(f"  Sync 1 result: {sync_result_1} -> count: {count_after_sync_1}")
    print(f"  Sync 2 result: {sync_result_2} -> count: {count_after_sync_2}")
    is_idempotent = (initial_count == count_after_sync_1 == count_after_sync_2 == 120)
    print(f"  Zero duplicates created on repeated execution: {is_idempotent}")

    # 4. User progress and gap records integrity
    gap_records_count = db.query(models.skill_gap.SkillGapAnalysis).count()
    progress_records_count = db.query(models.skill_gap.LearningProgress).count()
    print(f"Existing SkillGapAnalysis records preserved: {gap_records_count}")
    print(f"Existing LearningProgress records: {progress_records_count}")

    return {
        "schema_intact": schema_intact,
        "total_rows": len(rows),
        "json_descriptions": json_desc_count,
        "is_idempotent": is_idempotent,
        "gap_records_count": gap_records_count
    }


def audit_frontend_and_real_workflow(db):
    """Section 5: Verify actual student workflow and API responses."""
    print("\n" + "="*80)
    print("AUDIT SECTION 5: REAL STUDENT WORKFLOW & API RESPONSE AUDIT")
    print("="*80)

    # User 13 (Thanvith) - Real student workflow
    student_13 = db.query(models.student_profile.StudentProfile).filter_by(user_id=13).first()
    print(f"Auditing real student: User ID 13 ({student_13.full_name if student_13 else 'None'})")
    print(f"Preferred Role: {student_13.preferred_job_role if student_13 else 'None'}")

    record = recalculate_skill_gap_for_user(db, 13)
    print(f"Calculated Target Role: {record.target_role}")
    print(f"Missing Skills: {[s['skill'] for s in record.missing_skills_json]}")
    print(f"Recommended Resources Skills: {list(record.recommended_resources_json.keys())}")

    missing_keys = set(s["skill"] for s in record.missing_skills_json)
    rec_keys = set(record.recommended_resources_json.keys())
    unmatched_skills = missing_keys - rec_keys

    print(f"Missing skills with 0 recommendations: {unmatched_skills}")

    # Inspect structure of recommended items for frontend rendering
    sample_skill = record.missing_skills_json[0]["skill"]
    sample_rec = record.recommended_resources_json[sample_skill][0]
    required_frontend_fields = ["id", "type", "title", "provider", "url", "difficulty", "duration", "description"]
    missing_fields = [f for f in required_frontend_fields if f not in sample_rec]
    print(f"Frontend required fields present in recommendations: {len(missing_fields) == 0} (Missing: {missing_fields})")
    print(f"Sample recommendation structure for '{sample_skill}':")
    for k, v in sample_rec.items():
        print(f"  {k}: {v}")

    # Action Plan audit
    print(f"\nAction Plan Tasks: {len(record.action_plan_json)}")
    for t in record.action_plan_json[:2]:
        print(f"  Week {t.get('week')}: {t.get('task')} -> URL: {t.get('resource_url')}")

    return {
        "student_user_id": 13,
        "target_role": record.target_role,
        "missing_skills_count": len(record.missing_skills_json),
        "unmatched_skills": list(unmatched_skills),
        "frontend_fields_intact": len(missing_fields) == 0,
        "action_plan_tasks": len(record.action_plan_json)
    }


def audit_protected_components():
    """Section 6: Verify protected ML artifacts, research data, and dashboard."""
    print("\n" + "="*80)
    print("AUDIT SECTION 6: PROTECTED ML ARTIFACTS, DATASETS & DASHBOARD DESIGN")
    print("="*80)

    ml_dir = os.path.join(BACKEND_DIR, "ml")
    key_files = [
        os.path.join(ml_dir, "models", "best_model.joblib"),
        os.path.join(ml_dir, "models", "scaler.joblib"),
        os.path.join(ml_dir, "models", "encoder.joblib"),
        os.path.join(ml_dir, "models", "label_encoder.joblib"),
        os.path.join(ml_dir, "models", "feature_metadata.json"),
        os.path.join(ml_dir, "dataset", "synthetic_dataset.csv"),
        os.path.join(ml_dir, "training", "train.py"),
        os.path.join(ml_dir, "evaluation", "results", "model_comparison.csv"),
    ]

    hashes = {}
    for fpath in key_files:
        if os.path.exists(fpath):
            with open(fpath, "rb") as f:
                h = hashlib.sha256(f.read()).hexdigest()
            fname = os.path.relpath(fpath, WORKSPACE_DIR)
            hashes[fname] = h[:16]
            print(f"  [OK] {fname}: SHA256={h[:16]}... (Exists, Size={os.path.getsize(fpath)} bytes)")
        else:
            print(f"  [MISSING] {fpath}")

    # Check that Simple Learning Path is NOT implemented
    dashboard_jsx = os.path.join(WORKSPACE_DIR, "frontend", "src", "pages", "Dashboard.jsx")
    skill_gap_jsx = os.path.join(WORKSPACE_DIR, "frontend", "src", "pages", "SkillGap.jsx")
    
    with open(dashboard_jsx, "r", encoding="utf-8") as f:
        dash_content = f.read()
    with open(skill_gap_jsx, "r", encoding="utf-8") as f:
        skill_content = f.read()

    has_simple_learning_path = (
        "SimpleLearningPath" in dash_content or 
        "SimpleLearningPath" in skill_content or 
        "simple-learning-path" in dash_content
    )
    print(f"\nSimple Learning Path Implemented (should be False): {has_simple_learning_path}")

    return {
        "ml_hashes": hashes,
        "has_simple_learning_path": has_simple_learning_path
    }


def main():
    db = SessionLocal()
    engine = HybridResourceSearchEngine()

    try:
        url_audit = run_live_url_audit()
        skill_audit = audit_canonical_skill_coverage(db, engine)
        sec_audit = audit_security_and_ssrf()
        db_audit = audit_database_and_startup_integrity(db)
        fe_audit = audit_frontend_and_real_workflow(db)
        prot_audit = audit_protected_components()

        # Save summary to audit report JSON
        report = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "url_audit": url_audit,
            "skill_audit": skill_audit,
            "sec_audit": sec_audit,
            "db_audit": db_audit,
            "fe_audit": fe_audit,
            "prot_audit": prot_audit
        }
        report_path = os.path.join(WORKSPACE_DIR, "scratch", "phase2_audit_results.json")
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print(f"\nFull audit data saved to {report_path}")
        print("\n" + "="*80)
        print("AUDIT COMPLETE")
        print("="*80)
    finally:
        db.close()


if __name__ == "__main__":
    main()
