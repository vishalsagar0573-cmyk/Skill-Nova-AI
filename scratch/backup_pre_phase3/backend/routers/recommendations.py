from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from database import get_db
from services.recommender import get_course_recommendations

router = APIRouter()

class MissingSkillsRequest(BaseModel):
    missing_skills: List[str]

@router.post("/courses")
async def recommend_courses(request: MissingSkillsRequest, db: Session = Depends(get_db)):
    """
    Receives an array of missing skills (extracted from job matching)
    and returns grouped course recommendations.
    """
    recs = get_course_recommendations(request.missing_skills, db)
    return recs
