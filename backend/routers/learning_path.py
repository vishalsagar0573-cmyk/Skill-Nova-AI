from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional, Literal
from urllib.parse import urlparse

from database import get_db
from dependencies.auth import get_current_user
from models.user import User
from models.student_profile import StudentProfile
from models.skill_gap import SkillGapAnalysis
from services.learning_path import LearningPathService
from services.normalizer import get_canonical_skill
from services.evidence import EvidenceService

router = APIRouter()


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class ProgressUpdateRequest(BaseModel):
    resource_id: int = Field(..., description="The ID of the learning resource in learning_resources table")
    status: Literal["Not Started", "In Progress", "Completed"] = Field(..., description="Must be 'Not Started', 'In Progress', or 'Completed'")


class CapstoneUpdateRequest(BaseModel):
    status: Literal["Not Started", "In Progress", "Completed"] = Field(..., description="Must be 'Not Started', 'In Progress', or 'Completed'")


class StepEvidenceSubmissionRequest(BaseModel):
    skill_identifier: str = Field(..., min_length=1, max_length=100, description="Normalized skill identifier, e.g. 'django'")
    canonical_skill: Optional[str] = Field(None, max_length=100, description="Canonical skill name, e.g. 'Django'")
    evidence_type: Literal["github_repo", "live_deployment", "certification"] = Field("github_repo")
    url: str = Field(..., min_length=8, max_length=500, description="Proof-of-work URL (must be https://)")
    notes: Optional[str] = Field("", max_length=2000, description="Student implementation notes")


class CapstoneEvidenceSubmissionRequest(BaseModel):
    url: str = Field(..., min_length=8, max_length=500, description="Capstone repository URL (must be https://)")
    deployment_url: Optional[str] = Field(None, max_length=500, description="Optional live production deployment URL")
    notes: Optional[str] = Field("", max_length=3000, description="Capstone architectural and technical notes")


class ReviewEvidenceRequest(BaseModel):
    target_user_id: int = Field(..., description="The student user ID whose evidence is being evaluated")
    skill_identifier: str = Field(..., min_length=1, max_length=100, description="The skill identifier or 'capstone_milestone'")
    decision: Literal["Approved", "Rejected"] = Field(..., description="'Approved' or 'Rejected'")
    reviewer_notes: str = Field(..., min_length=3, max_length=2000, description="Mandatory constructive reviewer feedback")


# =============================================================================
# PHASE 3 EXISTING LEARNING PATH ENDPOINTS (PRESERVED 100%)
# =============================================================================

@router.get("/me")
def get_student_learning_path(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns the interactive Simple Learning Path tailored to the student's active target role,
    with sequentially grouped stages, verified primary & supplementary resources, and live progress metrics.
    """
    try:
        user_id = current_user.id
        path_data = LearningPathService.build_student_learning_path(db, user_id)
        return path_data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve learning path."
        )


@router.post("/progress")
def update_step_progress(
    payload: ProgressUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Updates the learning progress of a specific resource for the authenticated student.
    Enforces parent-row locking for concurrency safety and application-level idempotency.
    """
    try:
        user_id = current_user.id
        result = LearningPathService.update_learning_step_status(
            db=db,
            user_id=user_id,
            resource_id=payload.resource_id,
            status=payload.status
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except LookupError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update learning progress."
        )


@router.post("/capstone-status")
def update_capstone_progress(
    payload: CapstoneUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Persists the capstone milestone status in SkillGapAnalysis.action_plan_json for the student.
    Preserves all existing action plan tasks and prevents progress loss during recalculations.
    """
    try:
        user_id = current_user.id
        result = LearningPathService.update_capstone_status(
            db=db,
            user_id=user_id,
            status=payload.status
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except LookupError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update capstone progress."
        )


# =============================================================================
# PHASE 4: EVIDENCE SUBMISSION & REVIEW ENDPOINTS
# =============================================================================

@router.post("/step-evidence")
def submit_learning_step_evidence(
    payload: StepEvidenceSubmissionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Submits proof-of-work evidence for a specific learning step in the student's active roadmap.
    - Identity is derived strictly from JWT (never trusted from payload).
    - Validates that the skill is an authentic component of the student's learning path.
    - Runs dual-stack DNS resolution, IP pinning, SSRF checks, and GitHub heuristics outside DB locks.
    - Atomically updates CompetencyProfile.competency_json under PostgreSQL parent User row lock.
    """
    user_id = current_user.id

    student_profile = (
        db.query(StudentProfile)
        .filter(StudentProfile.user_id == user_id)
        .first()
    )
    if not student_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found. Please complete your profile first."
        )

    # Validate skill against student's active action plan
    gap_record = (
        db.query(SkillGapAnalysis)
        .filter(SkillGapAnalysis.user_id == user_id)
        .order_by(SkillGapAnalysis.created_at.desc())
        .first()
    )
    if not gap_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active skill gap analysis found for your account."
        )

    norm_skill = get_canonical_skill(payload.skill_identifier).strip().lower()
    raw_ident = payload.skill_identifier.strip().lower()

    valid_skills = set()
    action_plan = gap_record.action_plan_json or []
    for task in action_plan:
        if task.get("task_type") == "skill_step":
            s_id = (task.get("skill_identifier") or "").strip().lower()
            if s_id:
                valid_skills.add(s_id)
        # Check task description for skill mention
        t_desc = (task.get("task") or "").lower()
        if norm_skill in t_desc or raw_ident in t_desc:
            valid_skills.add(norm_skill)
            valid_skills.add(raw_ident)

    missing_skills = gap_record.missing_skills_json or []
    for ms in missing_skills:
        ms_name = ms.get("skill", "") if isinstance(ms, dict) else str(ms)
        valid_skills.add(get_canonical_skill(ms_name).strip().lower())

    if norm_skill not in valid_skills and raw_ident not in valid_skills:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Skill '{payload.skill_identifier}' is not in your current target role learning path."
        )

    # Parse expected GitHub owner from student profile
    expected_owner = None
    if student_profile.github_url:
        parsed_gh = urlparse(student_profile.github_url)
        gh_parts = [p for p in parsed_gh.path.strip("/").split("/") if p]
        if gh_parts:
            expected_owner = gh_parts[0]

    canonical_title = payload.canonical_skill or get_canonical_skill(payload.skill_identifier)

    sub_payload = {
        "url": payload.url,
        "skill_identifier": raw_ident,
        "canonical_skill": canonical_title,
        "task_type": "skill_step",
        "evidence_type": payload.evidence_type,
        "notes": payload.notes or "",
        "expected_owner": expected_owner
    }

    return EvidenceService.submit_step_evidence(user_id=user_id, payload=sub_payload, db=db)


@router.post("/capstone-evidence")
def submit_capstone_project_evidence(
    payload: CapstoneEvidenceSubmissionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Submits proof-of-work repository and optional deployment for the capstone milestone project.
    - Identity is derived strictly from JWT.
    - Validates capstone milestone existence in student's active action plan.
    - Runs external verification outside DB transaction lock.
    - Mutates master evidence store atomically under parent User row lock.
    """
    user_id = current_user.id

    student_profile = (
        db.query(StudentProfile)
        .filter(StudentProfile.user_id == user_id)
        .first()
    )
    if not student_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found. Please complete your profile first."
        )

    gap_record = (
        db.query(SkillGapAnalysis)
        .filter(SkillGapAnalysis.user_id == user_id)
        .order_by(SkillGapAnalysis.created_at.desc())
        .first()
    )
    if not gap_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active learning path found for your account."
        )

    action_plan = gap_record.action_plan_json or []
    has_capstone = any(
        t.get("task_type") == "capstone" or "capstone" in (t.get("task") or "").lower()
        for t in action_plan
    )
    if not has_capstone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No capstone milestone found in your active learning path."
        )

    target_role = gap_record.target_role or student_profile.preferred_job_role or "Career"

    expected_owner = None
    if student_profile.github_url:
        parsed_gh = urlparse(student_profile.github_url)
        gh_parts = [p for p in parsed_gh.path.strip("/").split("/") if p]
        if gh_parts:
            expected_owner = gh_parts[0]

    sub_payload = {
        "url": payload.url,
        "skill_identifier": "capstone_milestone",
        "canonical_skill": f"{target_role} Capstone",
        "task_type": "capstone",
        "evidence_type": "github_repo",
        "deployment_url": payload.deployment_url,
        "notes": payload.notes or "",
        "expected_owner": expected_owner
    }

    return EvidenceService.submit_step_evidence(user_id=user_id, payload=sub_payload, db=db)


@router.post("/review-evidence")
def review_student_evidence(
    payload: ReviewEvidenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Evaluates submitted evidence as Approved or Rejected.
    - Only authorized mentors/faculty or administrators can evaluate evidence.
    - Prohibits self-approval unconditionally (403 Forbidden).
    - Enforces department-level scope with strict fail-closed behavior.
    - Upon Approval, atomically updates verified_skills, technical_skills, and recalculates ScoringEngine.
    """
    # 1. Prohibit self-approval unconditionally
    if current_user.id == payload.target_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Self-approval prohibited. Reviewers cannot evaluate their own submissions."
        )

    # 2. Delegate to EvidenceService with full parent row locking and scoring recalculation
    return EvidenceService.review_step_evidence(
        reviewer=current_user,
        target_user_id=payload.target_user_id,
        payload={
            "skill_identifier": payload.skill_identifier.strip().lower(),
            "decision": payload.decision,
            "reviewer_notes": payload.reviewer_notes.strip()
        },
        db=db
    )


@router.get("/pending-reviews")
def get_pending_evidence_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Returns pending proof-of-work submissions awaiting evaluation.
    - Administrators receive all pending submissions.
    - Mentors/Faculty receive submissions strictly scoped to their authorized department.
    - Students or unmapped accounts receive 403 Forbidden.
    """
    return EvidenceService.get_pending_reviews(reviewer=current_user, db=db)
