from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import student_profile as sp_models
from models import resume as res_models
from models import competency_profile as cp_models
from services.parser import parse_resume
from services.normalizer import normalize_skills
from services.scoring import ScoringEngine
from pydantic import BaseModel
from typing import Optional, Dict
from dependencies.auth import get_current_user
from models.user import User
import json

router = APIRouter()

class CompetencyProfileResponse(BaseModel):
    id: int
    user_id: int
    competency_json: dict
    overall_competency_score: float | None
    overall_score: float | None
    frontend_score: float | None
    backend_score: float | None
    database_score: float | None
    ai_ml_score: float | None
    data_science_score: float | None
    cloud_score: float | None
    programming_score: float | None
    soft_skill_score: float | None
    score_explanations: dict | None
    resume_uploaded: bool
    resume_parsed: bool
    profile_generated: bool

    class Config:
        from_attributes = True

@router.post("/generate", response_model=CompetencyProfileResponse)
def generate_competency_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    
    # 1. Fetch Student Profile
    student = db.query(sp_models.StudentProfile).filter(sp_models.StudentProfile.user_id == user_id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Student Profile not found. Please complete it first.")
        
    # 2. Fetch Latest Resume & Cached Parsed Data
    latest_resume = db.query(res_models.Resume).filter(res_models.Resume.user_id == user_id).order_by(res_models.Resume.id.desc()).first()
    
    parsed_resume_data = {}
    if latest_resume and latest_resume.parsed_data:
        parsed_resume_data = latest_resume.parsed_data
            
    # 3. Merge Data Sources
    
    # Merge Skills
    raw_skills = []
    if student.technical_skills:
        raw_skills.extend([s.strip() for s in student.technical_skills.split(',')])
    
    if "technical_skills" in parsed_resume_data:
        raw_skills.extend(parsed_resume_data["technical_skills"])
        
    merged_skills = normalize_skills(raw_skills)
    
    # Format student nested items
    sp_projects = [{"project_name": p.project_name, "technology": p.technology, "description": p.description} for p in student.projects]
    sp_internships = [{"company": i.company, "role": i.role, "description": i.description} for i in student.internships]
    sp_certifications = [{"certificate_name": c.certificate_name, "platform": c.platform} for c in student.certifications]
    
    # Deduplication Logic
    merged_projects = sp_projects.copy()
    existing_project_names = {p['project_name'].lower() for p in sp_projects}
    for p_str in parsed_resume_data.get("projects", []):
        # Extremely basic deduplication: check if the resume string contains any existing project name
        if not any(epn in p_str.lower() for epn in existing_project_names):
            merged_projects.append(p_str)

    merged_certifications = sp_certifications.copy()
    existing_cert_names = {c['certificate_name'].lower() for c in sp_certifications}
    for c_str in parsed_resume_data.get("certifications", []):
        if not any(ecn in c_str.lower() for ecn in existing_cert_names):
            merged_certifications.append(c_str)
            
    merged_internships = sp_internships.copy()
    existing_companies = {i['company'].lower() for i in sp_internships}
    for i_str in parsed_resume_data.get("experience", []):
        if not any(ec in i_str.lower() for ec in existing_companies):
            merged_internships.append(i_str)
    
    # Construct final unified JSON (Prioritizing Student Profile)
    unified_json = {
        "student_details": {
            "full_name": student.full_name,
            "email": student.email,
            "usn": student.usn,
            "department": student.department,
            "branch": student.branch,
            "semester": student.semester,
            "github_url": student.github_url,
            "linkedin_url": student.linkedin_url
        },
        "cgpa": student.cgpa,
        "dsa_level": student.dsa_level,
        "preferred_job_role": student.preferred_job_role,
        "career_interests": student.career_interests,
        "skills": merged_skills,
        "projects": merged_projects,
        "internships": merged_internships,
        "certifications": merged_certifications,
        "education": parsed_resume_data.get("education", []),
        "experience": parsed_resume_data.get("experience", [])
    }
    
    # 4. Save to Database
    competency_record = db.query(cp_models.CompetencyProfile).filter(cp_models.CompetencyProfile.user_id == user_id).first()
    
    if not competency_record:
        competency_record = cp_models.CompetencyProfile(user_id=user_id)
        db.add(competency_record)
        
    competency_record.competency_json = unified_json
    
    # Update status flags
    competency_record.resume_uploaded = True if latest_resume else False
    competency_record.resume_parsed = True if parsed_resume_data else False
    competency_record.profile_generated = True
    
    db.commit()
    db.refresh(competency_record)
    
    return competency_record

@router.get("/me", response_model=CompetencyProfileResponse)
def get_my_competency_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        user_id = current_user.id
        profile = db.query(cp_models.CompetencyProfile).filter(cp_models.CompetencyProfile.user_id == user_id).first()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Competency Profile not found")
            
        return profile
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while retrieving the competency profile."
        )

@router.post("/calculate", response_model=CompetencyProfileResponse)
def get_my_competency_scores(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        user_id = current_user.id
        
        profile = db.query(cp_models.CompetencyProfile).filter(cp_models.CompetencyProfile.user_id == user_id).first()
        
        if not profile or not profile.competency_json:
            raise HTTPException(status_code=400, detail="Competency Profile not found or empty.")
        
        engine = ScoringEngine()
        scores, explanations = engine.calculate_all(profile.competency_json)
        
        profile.overall_score = scores.get("overall_score")
        profile.overall_competency_score = scores.get("overall_score")
        profile.frontend_score = scores.get("frontend_score")
        profile.backend_score = scores.get("backend_score")
        profile.database_score = scores.get("database_score")
        profile.ai_ml_score = scores.get("ai_ml_score")
        profile.programming_score = scores.get("programming_score")
        profile.soft_skill_score = scores.get("soft_skill_score")
        
        profile.score_explanations = explanations
        
        db.commit()
        db.refresh(profile)
        
        return profile
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while calculating competency scores."
        )
