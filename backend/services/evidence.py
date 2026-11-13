"""
EvidenceService: Core Security, Transport, and Evidence Lifecycle Service.
Phase 4: Competency Elevation & Verified Evidence Loop.

Safeguards implemented:
1. Strict DNS-pinned HTTP transport (urllib3 2.5.0 + requests 2.32.3) preserving TLS SNI and cert verification.
2. Dual-stack SSRF protection blocking private, loopback, link-local, and reserved IP spaces.
3. Redirect hop revalidation (up to 3 hops) and response body streaming (max 1.0 MB).
4. GitHub repository heuristics and owner validation.
5. Inconclusive classification for rate-limits (HTTP 429) and temporary network timeouts (never auto-rejected).
6. Mentor department authorization with strict fail-closed behavior (HTTP 403 Forbidden).
7. Universal self-approval prohibition.
8. Decoupled two-phase transaction lifecycle: network I/O executes strictly outside DB row locks;
   parent User row lock (SELECT FOR UPDATE) is held only for atomic state mutations (<5ms).
9. Tri-layer competency elevation and scoring update upon mentor verification.
"""

import socket
import ipaddress
import re
import os
import copy
import logging
from typing import Optional, Tuple, Dict, Any, List
from datetime import datetime, timezone
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.connection import HTTPSConnection
from urllib3.connectionpool import HTTPSConnectionPool
from urllib3.util.connection import create_connection

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from fastapi import HTTPException, status

from models.user import User
from models.student_profile import StudentProfile
from models.competency_profile import CompetencyProfile
from models.skill_gap import SkillGapAnalysis
from services.normalizer import get_canonical_skill, normalize_skills
from services.scoring import ScoringEngine

logger = logging.getLogger("evidence_service")

# =============================================================================
# CUSTOM EXCEPTIONS
# =============================================================================

class SecurityError(Exception):
    """Raised when SSRF, private IP, invalid scheme, or peer mismatch is detected."""
    pass

class RateLimitExceededException(Exception):
    """Raised when GitHub or an external provider returns HTTP 429 or rate limits."""
    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 60):
        super().__init__(message)
        self.retry_after = retry_after

class InconclusiveNetworkException(Exception):
    """Raised on transient network errors (timeouts, connection reset) that require retry."""
    def __init__(self, message: str = "Temporary network failure during verification", retry_after: int = 30):
        super().__init__(message)
        self.retry_after = retry_after


# =============================================================================
# DOMAIN WHITELIST & TECHNOLOGY FILE SIGNATURES
# =============================================================================

APPROVED_DOMAINS = {
    "github.com",
    "raw.githubusercontent.com",
    "api.github.com",
    "gitlab.com",
    "bitbucket.org",
    "vercel.app",
    "netlify.app",
    "onrender.com",
    "railway.app",
    "fly.dev",
    "herokuapp.com",
    "huggingface.co",
    "pages.dev",
    "readthedocs.io",
    "coursera.org",
    "udemy.com"
}

def is_whitelisted_domain(hostname: str) -> bool:
    """Validates hostname against approved domains and permitted subdomains."""
    if not hostname:
        return False
    host = hostname.lower().strip()
    if host in APPROVED_DOMAINS:
        return True
    allowed_suffixes = (
        ".github.io",
        ".vercel.app",
        ".netlify.app",
        ".onrender.com",
        ".railway.app",
        ".pages.dev",
        ".gitlab.io",
        ".huggingface.co"
    )
    for suffix in allowed_suffixes:
        if host.endswith(suffix) and len(host) > len(suffix):
            return True
    return False

TECHNOLOGY_SIGNATURES: Dict[str, List[str]] = {
    "python": [".py", "requirements.txt", "pyproject.toml", "setup.py", "Pipfile"],
    "django": ["manage.py", "settings.py", "wsgi.py", "asgi.py", "urls.py"],
    "flask": ["app.py", "wsgi.py", "requirements.txt"],
    "fastapi": ["main.py", "app.py", "requirements.txt"],
    "react": ["package.json", "App.jsx", "App.tsx", "App.js", "index.jsx", "index.tsx", "vite.config.js"],
    "node.js": ["package.json", "index.js", "server.js", "app.js"],
    "express": ["package.json", "server.js", "app.js", "routes"],
    "spring boot": ["pom.xml", "build.gradle", "Application.java"],
    "java": [".java", "pom.xml", "build.gradle"],
    "c++": [".cpp", ".hpp", "CMakeLists.txt", "Makefile"],
    "c": [".c", ".h", "Makefile"],
    "html": ["index.html", ".html"],
    "css": ["style.css", "styles.css", ".css"],
    "tailwind css": ["tailwind.config.js", "tailwind.config.ts", "package.json"],
    "postgresql": ["schema.sql", "migrations", ".sql"],
    "mysql": ["schema.sql", "migrations", ".sql"],
    "mongodb": ["mongoose", "models", "schema"],
    "machine learning": [".ipynb", "train.py", "model.py", "requirements.txt"],
    "deep learning": [".ipynb", "train.py", "model.py", "torch", "tensorflow"],
    "docker": ["Dockerfile", "docker-compose.yml", "docker-compose.yaml"],
    "kubernetes": ["deployment.yaml", "service.yaml", "k8s"]
}


# =============================================================================
# DNS-PINNED HTTP TRANSPORT (urllib3 2.5.0 + requests 2.32.3)
# =============================================================================

class PinnedHTTPSConnection(HTTPSConnection):
    """
    Subclasses urllib3.connection.HTTPSConnection for urllib3 2.5.0.
    Pins the socket connection to a pre-validated IP while preserving self.host
    and server_hostname for RFC 6066 TLS SNI and standard X.509 certificate validation.
    """
    pinned_ip: str = ""

    def _new_conn(self) -> socket.socket:
        sock = create_connection(
            (self.pinned_ip, self.port),
            self.timeout,
            source_address=self.source_address,
            socket_options=self.socket_options
        )
        return sock

class PinnedIPAdapter(HTTPAdapter):
    """
    Requests HTTPAdapter that dynamically configures HTTPSConnectionPool
    to use PinnedHTTPSConnection with the pre-validated destination IP.
    """
    def __init__(self, pinned_ip: str, *args, **kwargs):
        self.pinned_ip = pinned_ip
        super().__init__(*args, **kwargs)

    def init_poolmanager(self, connections, maxsize, block=False, **pool_kwargs):
        super().init_poolmanager(connections, maxsize, block=block, **pool_kwargs)
        pinned_ip = self.pinned_ip

        class BoundConnection(PinnedHTTPSConnection):
            pass
        BoundConnection.pinned_ip = pinned_ip

        class BoundPool(HTTPSConnectionPool):
            ConnectionCls = BoundConnection

        self.poolmanager.pool_classes_by_scheme["https"] = BoundPool


def is_ip_safe(ip_str: str) -> bool:
    """Dual-stack SSRF security validation. Returns False if IP is private, loopback, or reserved."""
    try:
        ip = ipaddress.ip_address(ip_str)
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            return False
        # Disallow IPv4-mapped IPv6 addresses to internal ranges (e.g. ::ffff:127.0.0.1)
        if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
            return is_ip_safe(str(ip.ipv4_mapped))
        return True
    except ValueError:
        return False


def fetch_verified_url_content(
    target_url: str,
    max_redirects: int = 3,
    max_size_bytes: int = 1048576,
    timeout: Tuple[float, float] = (3.0, 5.0)
) -> Tuple[int, bytes, str, Dict[str, str]]:
    """
    Fetches content with mandatory dual-stack DNS resolution, IP pinning,
    TLS verification preservation, redirect revalidation, and response size limiting.
    
    Returns:
        (status_code, content_bytes, pinned_ip, response_headers)
    """
    current_url = target_url
    visited_hops = 0

    while visited_hops <= max_redirects:
        parsed = urlparse(current_url)
        if parsed.scheme != "https":
            raise SecurityError(f"Insecure scheme '{parsed.scheme}'. Only https:// is permitted.")

        hostname = parsed.hostname
        if not hostname or not is_whitelisted_domain(hostname):
            raise SecurityError(f"Domain '{hostname}' is not in the approved domain whitelist.")

        port = parsed.port or 443

        # 1. Dual-Stack DNS Resolution
        try:
            addr_info = socket.getaddrinfo(hostname, port, family=socket.AF_UNSPEC, type=socket.SOCK_STREAM)
        except socket.gaierror as ge:
            raise InconclusiveNetworkException(f"DNS resolution failure for host '{hostname}': {str(ge)}")

        if not addr_info:
            raise SecurityError(f"Unable to resolve IP address for '{hostname}'.")

        # Verify all resolved IPs are safe
        for family, socktype, proto, canonname, sockaddr in addr_info:
            resolved_ip = sockaddr[0]
            if not is_ip_safe(resolved_ip):
                raise SecurityError(f"Resolved IP {resolved_ip} for '{hostname}' is in a restricted/private address space.")

        # Pin to the first validated IP
        pinned_ip = str(addr_info[0][4][0])

        # 2. Issue Request with Pinned IP and TLS SNI active
        session = requests.Session()
        session.mount(f"https://{hostname}", PinnedIPAdapter(pinned_ip))

        try:
            response = session.get(
                current_url,
                allow_redirects=False,
                timeout=timeout,
                stream=True,
                headers={"User-Agent": "SkillNova-EvidenceVerifier/1.0"}
            )
        except requests.exceptions.Timeout as to:
            raise InconclusiveNetworkException(f"Network timeout contacting '{hostname}': {str(to)}")
        except requests.exceptions.ConnectionError as ce:
            raise InconclusiveNetworkException(f"Connection failure contacting '{hostname}': {str(ce)}")

        try:
            # 3. Peer Socket Destination Check
            actual_peer = response.raw.connection.sock.getpeername()
            if actual_peer[0] != pinned_ip:
                response.close()
                raise SecurityError(f"Socket peer mismatch: connected to {actual_peer[0]}, expected pinned IP {pinned_ip}")

            # 4. Check for Rate Limits
            if response.status_code == 429:
                retry_after_hdr = response.headers.get("Retry-After", "60")
                try:
                    retry_secs = int(retry_after_hdr)
                except ValueError:
                    retry_secs = 60
                response.close()
                raise RateLimitExceededException(f"Rate limit exceeded on '{hostname}'.", retry_after=retry_secs)

            if response.headers.get("X-RateLimit-Remaining") == "0":
                response.close()
                raise RateLimitExceededException(f"GitHub rate limit reached (0 remaining).", retry_after=60)

            # 5. Handle Redirects with Revalidation
            if response.is_redirect or response.status_code in (301, 302, 303, 307, 308):
                visited_hops += 1
                if visited_hops > max_redirects:
                    response.close()
                    raise SecurityError("Too many redirects (exceeded limit of 3 hops).")
                location = response.headers.get("Location")
                if not location:
                    response.close()
                    raise SecurityError("Redirect response missing Location header.")
                if location.startswith("/"):
                    current_url = f"https://{hostname}{location}"
                else:
                    current_url = location
                response.close()
                continue

            # 6. Stream content with strict size cap
            content = bytearray()
            for chunk in response.iter_content(chunk_size=8192):
                content.extend(chunk)
                if len(content) > max_size_bytes:
                    response.close()
                    raise SecurityError(f"Response body exceeded {max_size_bytes / (1024 * 1024):.1f} MB limit.")

            headers_dict = dict(response.headers)
            status_code = response.status_code
            response.close()
            return status_code, bytes(content), pinned_ip, headers_dict

        finally:
            response.close()

    raise SecurityError("Redirect chain terminated abnormally without response.")


# =============================================================================
# GITHUB HEURISTIC INSPECTION
# =============================================================================

def parse_github_repo_info(url: str) -> Optional[Tuple[str, str]]:
    """Extracts (owner, repo) from a GitHub URL."""
    try:
        parsed = urlparse(url)
        if "github.com" not in (parsed.hostname or "").lower():
            return None
        parts = [p for p in parsed.path.strip("/").split("/") if p]
        if len(parts) >= 2:
            owner = parts[0]
            repo = parts[1].replace(".git", "")
            return owner, repo
        return None
    except Exception:
        return None


def inspect_github_repository(
    repo_url: str,
    canonical_skill: str,
    expected_owner: Optional[str] = None
) -> Tuple[bool, List[str], Optional[str]]:
    """
    Performs automated heuristics on a submitted GitHub repository.
    Verifies owner match (if provided) and probes for technology signatures.
    
    Returns:
        (passed, detected_files, rejection_reason_or_none)
    """
    info = parse_github_repo_info(repo_url)
    if not info:
        return False, [], "URL is not a recognized GitHub repository."

    owner, repo = info

    # Verify owner match if expected_owner is supplied
    if expected_owner:
        exp_clean = expected_owner.strip().lower()
        if owner.lower() != exp_clean and exp_clean not in owner.lower():
            return False, [], f"Repository owner '{owner}' does not match student profile '{expected_owner}'."

    skill_key = canonical_skill.strip().lower()
    candidate_files = TECHNOLOGY_SIGNATURES.get(skill_key, [".py", ".js", "README.md"])

    detected_files = []
    # Test file signatures against raw GitHub content via DNS-pinned transport
    for filename in candidate_files:
        if filename.startswith("."):
            test_files = [f"main{filename}", f"app{filename}", f"index{filename}"]
        else:
            test_files = [filename]

        for tf in test_files:
            raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/HEAD/{tf}"
            try:
                code, _, _, _ = fetch_verified_url_content(raw_url, timeout=(2.0, 3.0))
                if code == 200:
                    detected_files.append(tf)
                    break
            except (RateLimitExceededException, InconclusiveNetworkException):
                raise
            except Exception:
                continue

    # Also inspect repo landing page for indicators if specific files weren't found
    if not detected_files:
        try:
            code, page_bytes, _, _ = fetch_verified_url_content(repo_url, timeout=(3.0, 4.0))
            if code == 200:
                page_text = page_bytes.decode("utf-8", errors="ignore").lower()
                for sig in candidate_files:
                    if sig.lower() in page_text:
                        detected_files.append(f"signature:{sig}")
        except (RateLimitExceededException, InconclusiveNetworkException):
            raise
        except Exception:
            pass

    if detected_files:
        return True, detected_files, None
    else:
        return False, [], f"Repository lacks required files or signatures for {canonical_skill}."


# =============================================================================
# MENTOR & FACULTY AUTHORIZATION (STRICT FAIL-CLOSED)
# =============================================================================

def get_admin_emails() -> set:
    admin_env = os.getenv("ADMIN_EMAILS", "").strip()
    return set(e.strip().lower() for e in admin_env.split(",") if e.strip())

def get_mentor_emails() -> set:
    mentor_env = os.getenv("MENTOR_FACULTY_EMAILS", "").strip()
    return set(e.strip().lower() for e in mentor_env.split(",") if e.strip())

MENTOR_DEPARTMENT_MAP = {
    "mentor@skillnova.ai": [
        "computer science and engineering",
        "information science and engineering",
        "computer science"
    ],
    "faculty@skillnova.ai": [
        "artificial intelligence and machine learning",
        "machine learning",
        "data science"
    ]
}

def verify_reviewer_authorization(reviewer: User, target_student_profile: StudentProfile) -> bool:
    """
    Enforces strict departmental mentor authorization under Option A.
    
    Rules:
    1. Reviewer account must be is_active == True and is_verified == True.
    2. Self-approval is universally prohibited (403 Forbidden).
    3. Admins (in ADMIN_EMAILS or is_superuser) may review all students across all departments.
    4. Mentors (in MENTOR_FACULTY_EMAILS) must match student's department via MENTOR_DEPARTMENT_MAP.
       STRICT FAIL-CLOSED: If mentor mapping is missing or empty, or student department is missing,
       HTTP 403 Forbidden is unconditionally raised. Never fails open.
    5. All other users (students) receive HTTP 403 Forbidden.
    """
    if not getattr(reviewer, "is_active", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive reviewer account.")
    if not getattr(reviewer, "is_verified", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unverified reviewer account.")

    # Universal Self-Approval Prevention
    if reviewer.id == target_student_profile.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Self-approval prohibited. Reviewers cannot evaluate their own submissions."
        )

    rev_email = (reviewer.email or "").strip().lower()

    # Administrator Access (All Departments)
    admin_emails = get_admin_emails()
    if rev_email in admin_emails or getattr(reviewer, "is_superuser", False):
        return True

    # Department-Level Mentor Access (Strict Fail-Closed)
    mentor_emails = get_mentor_emails()
    if rev_email in mentor_emails:
        raw_depts = MENTOR_DEPARTMENT_MAP.get(rev_email, [])
        allowed_depts = [d.lower().strip() for d in raw_depts if d.strip()]
        student_dept = (target_student_profile.department or "").strip().lower()

        # FAIL CLOSED: Must have explicit, non-empty department list AND student's department must match
        if allowed_depts and student_dept and student_dept in allowed_depts:
            return True

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Mentor scope restriction: You are not authorized to review students in the '{target_student_profile.department}' department."
        )

    # Unauthorized User (Students / Unmapped Accounts)
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied: Only authorized mentors or faculty may review evidence submissions."
    )


# =============================================================================
# DECOUPLED TWO-PHASE EVIDENCE SERVICE
# =============================================================================

class EvidenceService:
    """
    Implements the two-phase evidence lifecycle:
    - Phase 1: Pre-transaction network verification executed outside database row locks.
    - Phase 2: Atomic state mutation executed under PostgreSQL parent User row lock (SELECT FOR UPDATE).
    """

    @staticmethod
    def sync_master_to_presentation_copy(
        db: Session,
        user_id: int,
        master_evidence: Dict[str, Any]
    ) -> None:
        """Projects master evidence from CompetencyProfile onto derived action_plan_json."""
        gap_record = (
            db.query(SkillGapAnalysis)
            .filter(SkillGapAnalysis.user_id == user_id)
            .order_by(SkillGapAnalysis.created_at.desc())
            .first()
        )
        if not gap_record or not gap_record.action_plan_json:
            return

        action_plan = list(gap_record.action_plan_json)
        updated = False

        for task in action_plan:
            is_capstone = task.get("task_type") == "capstone"
            if is_capstone:
                task["skill_identifier"] = "capstone_milestone"
                if "capstone_milestone" in master_evidence:
                    ev = master_evidence["capstone_milestone"]
                    task["evidence"] = ev
                    if ev.get("status") == "Verified":
                        task["status"] = "Completed"
                    elif ev.get("status") in ("Pending Review", "Submitted"):
                        task["status"] = "In Progress"
                    updated = True
            else:
                raw_ident = (task.get("skill_identifier") or "").strip().lower()
                if raw_ident in master_evidence:
                    ev = master_evidence[raw_ident]
                    task["evidence"] = ev
                    if ev.get("status") == "Verified":
                        task["status"] = "Completed"
                    elif ev.get("status") in ("Pending Review", "Submitted"):
                        task["status"] = "In Progress"
                    updated = True

        if updated:
            gap_record.action_plan_json = action_plan
            flag_modified(gap_record, "action_plan_json")

    @classmethod
    def submit_step_evidence(
        cls,
        user_id: int,
        payload: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """
        Executes evidence submission.
        Phase 1: DNS pinning & heuristic checks outside database row lock.
        Phase 2: Atomic state mutation under parent User row lock.
        """
        url = payload.get("url", "").strip()
        skill_identifier = payload.get("skill_identifier", "").strip().lower()
        canonical_skill = payload.get("canonical_skill", "").strip()
        task_type = payload.get("task_type", "skill_step")
        notes = payload.get("notes", "").strip()
        expected_owner = payload.get("expected_owner")

        if not url:
            raise HTTPException(status_code=400, detail="Evidence URL is required.")
        if not skill_identifier:
            raise HTTPException(status_code=400, detail="Skill identifier is required.")

        # =====================================================================
        # PHASE 1: PRE-TRANSACTION EXTERNAL VERIFICATION (NO DB ROW LOCK HELD)
        # =====================================================================
        validation_status = "Pending Review"
        checks_diagnostic = {
            "domain_valid": False,
            "ssrf_safe": False,
            "dns_pinned_ip": None,
            "tls_verified": False,
            "technology_files_detected": []
        }
        validation_error_reason = None
        is_inconclusive = False
        retry_after = 60

        try:
            status_code, content, pinned_ip, headers = fetch_verified_url_content(url)
            checks_diagnostic["domain_valid"] = True
            checks_diagnostic["ssrf_safe"] = True
            checks_diagnostic["dns_pinned_ip"] = pinned_ip
            checks_diagnostic["tls_verified"] = True
            checks_diagnostic["status_code"] = status_code

            if "github.com" in url.lower():
                passed, tech_files, reason = inspect_github_repository(
                    url,
                    canonical_skill or skill_identifier,
                    expected_owner=expected_owner
                )
                checks_diagnostic["technology_files_detected"] = tech_files
                if not passed:
                    validation_status = "Rejected"
                    validation_error_reason = reason or "Repository inspection failed."
            else:
                checks_diagnostic["technology_files_detected"] = ["external_deployment_accessible"]

        except RateLimitExceededException as rle:
            is_inconclusive = True
            retry_after = rle.retry_after
            checks_diagnostic["status"] = "inconclusive"
            checks_diagnostic["error"] = str(rle)
        except InconclusiveNetworkException as ine:
            is_inconclusive = True
            retry_after = ine.retry_after
            checks_diagnostic["status"] = "inconclusive"
            checks_diagnostic["error"] = str(ine)
        except SecurityError as se:
            validation_status = "Rejected"
            validation_error_reason = f"Security check failed: {str(se)}"
            checks_diagnostic["error"] = str(se)
        except Exception as exc:
            validation_status = "Rejected"
            validation_error_reason = f"Verification check failed: {str(exc)}"
            checks_diagnostic["error"] = str(exc)

        # =====================================================================
        # PHASE 2: ATOMIC OWNERSHIP RECHECK & MUTATION (UNDER POSTGRESQL ROW LOCK)
        # =====================================================================
        try:
            # Lock parent User row to serialize concurrent writes
            user = db.query(User).filter(User.id == user_id).with_for_update().first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found.")

            comp_profile = (
                db.query(CompetencyProfile)
                .filter(CompetencyProfile.user_id == user_id)
                .first()
            )
            if not comp_profile:
                comp_profile = CompetencyProfile(user_id=user_id, competency_json={})
                db.add(comp_profile)
                db.flush()

            comp_json = copy.deepcopy(comp_profile.competency_json or {})
            submitted_evidence = comp_json.setdefault("submitted_evidence", {})

            # Recheck existing submission state
            existing_ev = submitted_evidence.get(skill_identifier)
            if existing_ev and existing_ev.get("status") == "Verified":
                raise HTTPException(status_code=400, detail="Skill has already been platform verified.")

            # Archive history of previous attempts
            submission_history = existing_ev.get("submission_history", []) if existing_ev else []
            if existing_ev:
                submission_history.append({
                    "url": existing_ev.get("url"),
                    "status": existing_ev.get("status"),
                    "submitted_at": existing_ev.get("submitted_at"),
                    "rejection_reason": existing_ev.get("rejection_reason")
                })

            final_status = "Inconclusive" if is_inconclusive else validation_status

            new_record = {
                "task_type": task_type,
                "skill_identifier": skill_identifier,
                "canonical_skill": canonical_skill or get_canonical_skill(skill_identifier),
                "url": url,
                "notes": notes,
                "status": final_status,
                "rejection_reason": validation_error_reason,
                "automated_checks": checks_diagnostic,
                "retry_after": retry_after if is_inconclusive else None,
                "submitted_at": datetime.now(timezone.utc).isoformat(),
                "reviewed_at": None,
                "reviewed_by": None,
                "reviewer_notes": None,
                "submission_history": submission_history
            }

            submitted_evidence[skill_identifier] = new_record
            comp_profile.competency_json = comp_json
            flag_modified(comp_profile, "competency_json")

            # Project master evidence onto derived presentation copy (action_plan_json)
            cls.sync_master_to_presentation_copy(db, user_id, submitted_evidence)

            db.commit()
            db.refresh(comp_profile)

            return new_record

        except HTTPException:
            db.rollback()
            raise
        except Exception as exc:
            db.rollback()
            logger.error(f"Error persisting evidence for user {user_id}: {str(exc)}")
            raise HTTPException(status_code=500, detail=f"Database transaction failure: {str(exc)}")

    @classmethod
    def review_step_evidence(
        cls,
        reviewer: User,
        target_user_id: int,
        payload: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """
        Processes mentor/admin review of submitted evidence.
        Enforces:
        - Active & verified reviewer check.
        - Universal self-approval prohibition.
        - Strict fail-closed departmental authorization for faculty/mentors.
        - Parent User row locking (SELECT FOR UPDATE).
        - Tri-layer synchronization (submitted_evidence, verified_skills, technical_skills, competency_json['skills']).
        - Dynamic ScoringEngine score recalculation and 100-point clamping.
        """
        skill_identifier = payload.get("skill_identifier", "").strip().lower()
        decision = payload.get("decision", "").strip()  # "Approved" or "Rejected"
        reviewer_notes = payload.get("reviewer_notes", "").strip()

        if not skill_identifier:
            raise HTTPException(status_code=400, detail="Skill identifier is required.")
        if decision not in ("Approved", "Rejected"):
            raise HTTPException(status_code=400, detail="Decision must be 'Approved' or 'Rejected'.")

        target_student_profile = (
            db.query(StudentProfile)
            .filter(StudentProfile.user_id == target_user_id)
            .first()
        )
        if not target_student_profile:
            raise HTTPException(status_code=404, detail="Student profile not found.")

        # 1. Enforce strict authorization & fail-closed departmental scope
        verify_reviewer_authorization(reviewer, target_student_profile)

        # 2. Acquire parent User row lock for atomic state mutation
        try:
            target_user = db.query(User).filter(User.id == target_user_id).with_for_update().first()
            if not target_user:
                raise HTTPException(status_code=404, detail="User not found.")

            comp_profile = (
                db.query(CompetencyProfile)
                .filter(CompetencyProfile.user_id == target_user_id)
                .first()
            )
            if not comp_profile or not comp_profile.competency_json:
                raise HTTPException(status_code=404, detail="Competency profile not found.")

            comp_json = copy.deepcopy(comp_profile.competency_json)
            submitted_evidence = comp_json.setdefault("submitted_evidence", {})

            if skill_identifier not in submitted_evidence:
                raise HTTPException(status_code=404, detail=f"No evidence found for skill '{skill_identifier}'.")

            record = submitted_evidence[skill_identifier]
            now_str = datetime.now(timezone.utc).isoformat()
            rev_email = reviewer.email or f"user_{reviewer.id}@skillnova.ai"

            if decision == "Approved":
                record["status"] = "Verified"
                record["reviewed_at"] = now_str
                record["reviewed_by"] = rev_email
                record["reviewer_notes"] = reviewer_notes

                canonical = record.get("canonical_skill") or get_canonical_skill(skill_identifier)

                # Append to verified_skills provenance list
                verified_skills = comp_json.setdefault("verified_skills", [])
                if not any(v.get("skill_identifier") == skill_identifier for v in verified_skills):
                    verified_skills.append({
                        "task_type": record.get("task_type", "skill_step"),
                        "skill_identifier": skill_identifier,
                        "canonical_skill": canonical,
                        "url": record.get("url"),
                        "verified_at": now_str,
                        "verified_by": rev_email,
                        "reviewer_notes": reviewer_notes
                    })

                # Synchronize computational skills array in competency_json
                current_skills = comp_json.get("skills", [])
                if canonical not in current_skills:
                    current_skills.append(canonical)
                    comp_json["skills"] = normalize_skills(current_skills)

                # Synchronize technical_skills in StudentProfile
                curr_tech = target_student_profile.technical_skills or ""
                tech_list = [s.strip() for s in curr_tech.split(",") if s.strip()]
                if canonical not in tech_list:
                    tech_list.append(canonical)
                    target_student_profile.technical_skills = ", ".join(normalize_skills(tech_list))

                scoring_engine = ScoringEngine()
                scores_dict, explanations_dict = scoring_engine.calculate_all(comp_json)
                comp_profile.overall_score = scores_dict.get("overall_score", comp_profile.overall_score)
                comp_profile.overall_competency_score = comp_profile.overall_score
                comp_profile.frontend_score = scores_dict.get("frontend_score", comp_profile.frontend_score)
                comp_profile.backend_score = scores_dict.get("backend_score", comp_profile.backend_score)
                comp_profile.database_score = scores_dict.get("database_score", comp_profile.database_score)
                comp_profile.ai_ml_score = scores_dict.get("ai_ml_score", comp_profile.ai_ml_score)
                comp_profile.data_science_score = scores_dict.get("data_science_score", comp_profile.data_science_score)
                comp_profile.cloud_score = scores_dict.get("cloud_score", comp_profile.cloud_score)
                comp_profile.programming_score = scores_dict.get("programming_score", comp_profile.programming_score)
                comp_profile.soft_skill_score = scores_dict.get("soft_skill_score", comp_profile.soft_skill_score)
                comp_profile.score_explanations = explanations_dict

            else:  # Rejected
                record["status"] = "Rejected"
                record["reviewed_at"] = now_str
                record["reviewed_by"] = rev_email
                record["reviewer_notes"] = reviewer_notes
                record["rejection_reason"] = reviewer_notes

                # Archive rejected attempt into history
                history = record.setdefault("submission_history", [])
                history.append({
                    "url": record.get("url"),
                    "status": "Rejected",
                    "submitted_at": record.get("submitted_at"),
                    "reviewed_at": now_str,
                    "reviewed_by": rev_email,
                    "reviewer_notes": reviewer_notes
                })

            submitted_evidence[skill_identifier] = record
            comp_profile.competency_json = comp_json
            flag_modified(comp_profile, "competency_json")

            # Project master evidence onto derived presentation copy (action_plan_json)
            cls.sync_master_to_presentation_copy(db, target_user_id, submitted_evidence)

            db.commit()
            db.refresh(comp_profile)

            return {
                "message": f"Evidence {decision.lower()} successfully.",
                "skill_identifier": skill_identifier,
                "status": record["status"],
                "reviewed_by": rev_email,
                "reviewed_at": now_str,
                "elevated_scores": {
                    "overall_score": comp_profile.overall_score,
                    "backend_score": comp_profile.backend_score,
                    "frontend_score": comp_profile.frontend_score,
                    "programming_score": comp_profile.programming_score
                } if decision == "Approved" else None
            }

        except HTTPException:
            db.rollback()
            raise
        except Exception as exc:
            db.rollback()
            logger.error(f"Error reviewing evidence for user {target_user_id}: {str(exc)}")
            raise HTTPException(status_code=500, detail=f"Database transaction failure: {str(exc)}")

    @classmethod
    def get_pending_reviews(cls, reviewer: User, db: Session) -> List[Dict[str, Any]]:
        """
        Retrieves all pending evidence reviews that the requesting mentor/admin is authorized to review.
        """
        rev_email = (reviewer.email or "").strip().lower()
        admin_emails = get_admin_emails()
        is_admin = rev_email in admin_emails or getattr(reviewer, "is_superuser", False)

        mentor_emails = get_mentor_emails()
        is_mentor = rev_email in mentor_emails

        if not is_admin and not is_mentor:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        allowed_depts = []
        if is_mentor and not is_admin:
            raw_depts = MENTOR_DEPARTMENT_MAP.get(rev_email, [])
            allowed_depts = [d.lower().strip() for d in raw_depts if d.strip()]
            if not allowed_depts:
                # Fail closed: mentor with no department mapping has no review permissions
                return []

        # Query all student profiles
        query = db.query(StudentProfile).join(User, StudentProfile.user_id == User.id)
        if not is_admin:
            query = query.filter(StudentProfile.user_id != reviewer.id)  # Prohibit self
            student_profiles = query.all()
            filtered_profiles = [
                sp for sp in student_profiles
                if (sp.department or "").strip().lower() in allowed_depts
            ]
        else:
            filtered_profiles = [sp for sp in query.all() if sp.user_id != reviewer.id]

        target_user_ids = [sp.user_id for sp in filtered_profiles]
        if not target_user_ids:
            return []

        comp_profiles = (
            db.query(CompetencyProfile)
            .filter(CompetencyProfile.user_id.in_(target_user_ids))
            .all()
        )

        user_dept_map = {sp.user_id: (sp.department, sp.full_name) for sp in filtered_profiles}

        pending_items = []
        for cp in comp_profiles:
            if not cp.competency_json or "submitted_evidence" not in cp.competency_json:
                continue
            ev_dict = cp.competency_json["submitted_evidence"]
            dept, name = user_dept_map.get(cp.user_id, ("Unknown", "Unknown"))
            for skill_id, ev in ev_dict.items():
                if ev.get("status") in ("Pending Review", "Submitted"):
                    pending_items.append({
                        "user_id": cp.user_id,
                        "student_name": name,
                        "department": dept,
                        "skill_identifier": skill_id,
                        "canonical_skill": ev.get("canonical_skill"),
                        "task_type": ev.get("task_type"),
                        "url": ev.get("url"),
                        "notes": ev.get("notes"),
                        "submitted_at": ev.get("submitted_at"),
                        "automated_checks": ev.get("automated_checks")
                    })

        return pending_items
