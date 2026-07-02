from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.user import UserProfile
from models.job import JobRole
from services.matcher import match_user_to_jobs

router = APIRouter()

@router.get("/match/{user_id}")
async def get_job_matches(user_id: int, db: Session = Depends(get_db)):
    """
    Predicts job role compatibility based on user skills.
    """
    # 1. Fetch user profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile or not profile.skills:
        raise HTTPException(status_code=404, detail="User profile or extracted skills not found.")
        
    # 2. Fetch all job roles
    jobs = db.query(JobRole).all()
    if not jobs:
        raise HTTPException(status_code=404, detail="No job roles found in database.")
        
    # 3. Calculate compatibility using ML
    matches = match_user_to_jobs(profile.skills, jobs, top_n=5)
    
    return matches
