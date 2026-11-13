from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
from models.competency_profile import CompetencyProfile
from models.job import JobRole, JobCompatibility
from models.skill_gap import SkillGapAnalysis
from models.student_profile import StudentProfile
from models.resume import Resume
from services.skill_gap import SkillGapEngine
from services.job_matching import RuleBasedJobMatcher
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from dependencies.auth import get_current_user
from models.user import User

router = APIRouter()

class SkillGapResponse(BaseModel):
    id: int
    user_id: int
    target_role: str
    overall_gap_percentage: float
    missing_skills_json: List[Dict[str, Any]]
    recommended_resources_json: Dict[str, List[Dict[str, Any]]]
    action_plan_json: List[Dict[str, Any]]
    career_roadmap_json: List[Dict[str, Any]]
    career_readiness_score: float
    is_stale: Optional[bool] = False
    preferred_profile_role: Optional[str] = None

    class Config:
        from_attributes = True

class SkillGapCalculateRequest(BaseModel):
    target_role: Optional[str] = None
    sync_to_profile: Optional[bool] = False

def recalculate_skill_gap_for_user(
    db: Session, 
    user_id: int, 
    target_role_override: Optional[str] = None,
    sync_preference_to_profile: bool = False
):
    student = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Student Profile not found.")
        
    resume_record = db.query(Resume).filter(Resume.user_id == user_id).order_by(Resume.id.desc()).first()
    if not resume_record:
        raise HTTPException(status_code=400, detail="Resume not found. Please upload a resume first.")
        
    competency = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == user_id).first()
    if not competency:
        raise HTTPException(status_code=400, detail="Competency Profile not found.")
        
    if competency.overall_score is None:
        raise HTTPException(status_code=400, detail="Please calculate competency scores first.")
        
    comp_data = dict(competency.competency_json or {})
    comp_data["overall_score"] = competency.overall_score
    
    # Merge skills and profile attributes if missing in cached JSON
    if student.technical_skills:
        raw_skills = [s.strip() for s in student.technical_skills.split(",") if s.strip()]
        existing_skills = comp_data.get("skills", [])
        combined = list(dict.fromkeys(existing_skills + raw_skills))
        comp_data["skills"] = combined

    if student.cgpa and not comp_data.get("cgpa"):
        comp_data["cgpa"] = student.cgpa

    if student.dsa_level:
        comp_data["dsa_level"] = student.dsa_level

    if student.projects:
        sp_projects = [
            {"project_name": p.project_name, "technology": p.technology, "description": p.description}
            for p in student.projects
        ]
        if not comp_data.get("projects"):
            comp_data["projects"] = sp_projects
        else:
            comp_data["projects"] = list(comp_data.get("projects", [])) + sp_projects

    if student.internships and not comp_data.get("internships"):
        comp_data["internships"] = [
            {"company": i.company, "role": i.role, "description": i.description}
            for i in student.internships
        ]

    if student.certifications and not comp_data.get("certifications"):
        comp_data["certifications"] = [
            {"certificate_name": c.certificate_name, "platform": c.platform}
            for c in student.certifications
        ]

    # Attach competency domain scores as supporting evidence
    comp_data["scores"] = {
        "ai_ml": competency.ai_ml_score or 0,
        "data_science": competency.data_science_score or 0,
        "cloud": competency.cloud_score or 0,
        "database": competency.database_score or 0,
        "frontend": competency.frontend_score or 0,
        "backend": competency.backend_score or 0,
        "programming": competency.programming_score or 0,
        "soft_skills": competency.soft_skill_score or 0,
        "overall": competency.overall_competency_score or competency.overall_score or 0
    }

    # Role resolution hierarchy:
    # 1. Explicit target-role selection
    # 2. StudentProfile.preferred_job_role
    # 3. cached competency preference
    # 4. JobCompatibility.best_role
    job_compat = db.query(JobCompatibility).filter(JobCompatibility.user_id == user_id).first()
    
    resolved_role = None
    if target_role_override and target_role_override.strip():
        resolved_role = target_role_override.strip()
    elif student.preferred_job_role and student.preferred_job_role.strip():
        resolved_role = student.preferred_job_role.strip()
    elif comp_data.get("preferred_job_role") and str(comp_data.get("preferred_job_role")).strip():
        resolved_role = str(comp_data.get("preferred_job_role")).strip()
    elif job_compat and job_compat.best_role and job_compat.best_role.strip():
        resolved_role = job_compat.best_role.strip()
    else:
        resolved_role = "General Software Engineering"

    # Find matching JobRole in DB
    target_job = db.query(JobRole).filter(JobRole.role_name.ilike(resolved_role)).first()
    if not target_job:
        target_job = db.query(JobRole).filter(
            or_(
                JobRole.role_name.ilike(f"%{resolved_role}%"),
                JobRole.description.ilike(f"%{resolved_role}%")
            )
        ).first()

    matcher = RuleBasedJobMatcher()
    if target_job:
        role_evaluation = matcher.calculate_role_score(comp_data, target_job)
        job_data = {
            "role": target_job.role_name,
            "compatibility_score": role_evaluation["score"],
            "missing_skills": role_evaluation["missing_skills"]
        }
    else:
        # Fallback for dynamic roles not yet in JobRole table
        synthetic_role = JobRole(
            role_name=resolved_role,
            description=f"Industry requirements for {resolved_role}",
            required_skills=[resolved_role],
            preferred_skills=[],
            minimum_cgpa=6.5
        )
        role_evaluation = matcher.calculate_role_score(comp_data, synthetic_role)
        job_data = {
            "role": resolved_role,
            "compatibility_score": role_evaluation["score"],
            "missing_skills": role_evaluation["missing_skills"]
        }

    # Execute Skill Gap Engine
    engine = SkillGapEngine()
    result = engine.execute(db, job_data, comp_data)

    # Save to DB
    gap_record = db.query(SkillGapAnalysis).filter(SkillGapAnalysis.user_id == user_id).first()
    if not gap_record:
        gap_record = SkillGapAnalysis(user_id=user_id)
        db.add(gap_record)
        
    gap_record.target_role = result["target_role"]
    gap_record.overall_gap_percentage = result["overall_gap_percentage"]
    gap_record.missing_skills_json = result["missing_skills"]
    gap_record.recommended_resources_json = result["recommended_resources"]
    gap_record.action_plan_json = result["action_plan"]
    gap_record.career_roadmap_json = result["career_roadmap"]
    gap_record.career_readiness_score = result["career_readiness_score"]
    
    db.commit()
    db.refresh(gap_record)

    # If requested to sync preference to profile
    if sync_preference_to_profile and student:
        if (student.preferred_job_role or "").strip().lower() != result["target_role"].lower():
            student.preferred_job_role = result["target_role"]
            if competency and competency.competency_json:
                cjson = dict(competency.competency_json)
                cjson["preferred_job_role"] = result["target_role"]
                competency.competency_json = cjson
            db.commit()

    return gap_record

@router.post("/calculate", response_model=SkillGapResponse)
def calculate_skill_gap(
    payload: Optional[SkillGapCalculateRequest] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    try:
        user_id = current_user.id
        target_role_override = payload.target_role if payload else None
        sync_preference = payload.sync_to_profile if payload and payload.sync_to_profile is not None else False

        record = recalculate_skill_gap_for_user(
            db=db,
            user_id=user_id,
            target_role_override=target_role_override,
            sync_preference_to_profile=sync_preference
        )
        
        student = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        pref_role = student.preferred_job_role.strip() if student and student.preferred_job_role else None
        
        return SkillGapResponse(
            id=record.id,
            user_id=record.user_id,
            target_role=record.target_role,
            overall_gap_percentage=record.overall_gap_percentage,
            missing_skills_json=record.missing_skills_json or [],
            recommended_resources_json=record.recommended_resources_json or {},
            action_plan_json=record.action_plan_json or [],
            career_roadmap_json=record.career_roadmap_json or [],
            career_readiness_score=record.career_readiness_score or 0.0,
            is_stale=False,
            preferred_profile_role=pref_role
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while calculating the skill gap."
        )

@router.get("/me", response_model=SkillGapResponse)
def get_skill_gap(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        user_id = current_user.id
        record = db.query(SkillGapAnalysis).filter(SkillGapAnalysis.user_id == user_id).first()
        
        if not record:
            raise HTTPException(status_code=404, detail="Skill Gap Analysis not found.")
            
        student = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        is_stale = False
        pref_role = None
        if student and student.preferred_job_role:
            pref_role = student.preferred_job_role.strip()
            if (record.target_role or "").strip().lower() != pref_role.lower():
                is_stale = True

        return SkillGapResponse(
            id=record.id,
            user_id=record.user_id,
            target_role=record.target_role,
            overall_gap_percentage=record.overall_gap_percentage,
            missing_skills_json=record.missing_skills_json or [],
            recommended_resources_json=record.recommended_resources_json or {},
            action_plan_json=record.action_plan_json or [],
            career_roadmap_json=record.career_roadmap_json or [],
            career_readiness_score=record.career_readiness_score or 0.0,
            is_stale=is_stale,
            preferred_profile_role=pref_role
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while retrieving the skill gap."
        )
