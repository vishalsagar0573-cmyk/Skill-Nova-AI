from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.competency_profile import CompetencyProfile
from models.job import JobRole, JobCompatibility
from services.job_matching import JobCompatibilityEngine
from dependencies.auth import get_current_user
from models.user import User
from pydantic import BaseModel

router = APIRouter()

class JobCompatibilityResponse(BaseModel):
    id: int
    user_id: int
    best_role: str
    compatibility_score: float
    matches: list
    matched_skills: list
    missing_skills: list
    recommendation_reason: list

    class Config:
        from_attributes = True

@router.post("/calculate", response_model=JobCompatibilityResponse)
def calculate_job_compatibility(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    
    # 1. Fetch user's Competency Profile
    profile = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == user_id).first()
    if not profile or not profile.competency_json:
        raise HTTPException(status_code=400, detail="Competency Profile not found or empty.")
        
    # 2. Fetch all Job Roles
    roles = db.query(JobRole).all()
    if not roles:
        raise HTTPException(status_code=404, detail="No job roles found in the database.")
        
    # 3. Calculate Matches
    engine = JobCompatibilityEngine()
    result = engine.evaluate(profile.competency_json, roles)
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to calculate compatibility.")
        
    # 4. Save to DB
    compat_record = db.query(JobCompatibility).filter(JobCompatibility.user_id == user_id).first()
    if not compat_record:
        compat_record = JobCompatibility(user_id=user_id)
        db.add(compat_record)
        
    compat_record.best_role = result["best_match"]["role"]
    compat_record.compatibility_score = result["best_match"]["compatibility_score"]
    compat_record.matches = result["matches"]
    compat_record.matched_skills = result["matched_skills"]
    compat_record.missing_skills = result["missing_skills"]
    compat_record.recommendation_reason = result["recommendation_reason"]
    
    db.commit()
    db.refresh(compat_record)
    
    return compat_record

@router.get("/me", response_model=JobCompatibilityResponse)
def get_my_job_compatibility(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    record = db.query(JobCompatibility).filter(JobCompatibility.user_id == user_id).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Job Compatibility not found")
        
    return record
