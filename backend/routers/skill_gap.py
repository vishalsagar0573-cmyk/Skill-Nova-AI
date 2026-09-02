from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.competency_profile import CompetencyProfile
from models.job import JobCompatibility
from models.skill_gap import SkillGapAnalysis
from services.skill_gap import SkillGapEngine
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

    class Config:
        from_attributes = True

@router.post("/calculate", response_model=SkillGapResponse)
def calculate_skill_gap(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        user_id = current_user.id
        
        # 0. Fetch dependencies
        from models.student_profile import StudentProfile
        from models.resume import Resume
        
        if not db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first():
            raise HTTPException(status_code=400, detail="Student Profile not found.")
            
        resume_record = db.query(Resume).filter(Resume.user_id == user_id).order_by(Resume.id.desc()).first()
        
        print("\n--- SKILL GAP RESUME LOOKUP DEBUG ---")
        print(f"Authenticated User ID: {user_id}")
        print(f"Resume record found: {'Yes' if resume_record else 'No'}")
        if resume_record:
            print(f"Resume database ID: {resume_record.id}")
            print(f"Resume owner ID: {resume_record.user_id}")
        print("---------------------------------------\n")
        
        if not resume_record:
            raise HTTPException(status_code=400, detail="Resume not found. Please upload a resume first.")
            
        # 1. Fetch Competency Profile
        competency = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == user_id).first()
        if not competency:
            raise HTTPException(status_code=400, detail="Competency Profile not found.")
            
        if competency.overall_score is None:
            raise HTTPException(status_code=400, detail="Please calculate competency scores first.")
            
        comp_data = competency.competency_json or {}
        comp_data["overall_score"] = competency.overall_score
            
        # 2. Fetch latest Job Compatibility result
        job_compat = db.query(JobCompatibility).filter(JobCompatibility.user_id == user_id).first()
        if not job_compat:
            raise HTTPException(status_code=400, detail="Job Compatibility not found. Please calculate compatibility first.")
            
        job_data = {
            "role": job_compat.best_role,
            "compatibility_score": job_compat.compatibility_score,
            "missing_skills": job_compat.missing_skills
        }
        
        # 3. Calculate Skill Gap
        engine = SkillGapEngine()
        result = engine.execute(db, job_data, comp_data)
        
        # 4. Save to DB
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
        
        return gap_record
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
            
        return record
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while retrieving the skill gap."
        )
