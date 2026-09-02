from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import date
from dependencies.auth import get_current_user
from models.user import User
from database import get_db # Assuming get_db is a dependency in database.py
from models import student_profile as models

router = APIRouter()

# --- Pydantic Schemas ---

class StudentProjectBase(BaseModel):
    project_name: Optional[str] = None
    technology: Optional[str] = None
    description: Optional[str] = None
    github_link: Optional[str] = None
    duration: Optional[str] = None

class StudentProjectCreate(StudentProjectBase):
    pass

class StudentProjectResponse(StudentProjectBase):
    id: int
    student_id: int

    class Config:
        from_attributes = True

class StudentInternshipBase(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    duration: Optional[str] = None
    description: Optional[str] = None

class StudentInternshipCreate(StudentInternshipBase):
    pass

class StudentInternshipResponse(StudentInternshipBase):
    id: int
    student_id: int

    class Config:
        from_attributes = True

class StudentCertificationBase(BaseModel):
    certificate_name: Optional[str] = None
    platform: Optional[str] = None
    completion_date: Optional[str] = None
    certificate_url: Optional[str] = None

class StudentCertificationCreate(StudentCertificationBase):
    pass

class StudentCertificationResponse(StudentCertificationBase):
    id: int
    student_id: int

    class Config:
        from_attributes = True

class StudentProfileBase(BaseModel):
    full_name: Optional[str] = None
    usn: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    branch: Optional[str] = None
    semester: Optional[int] = None
    cgpa: Optional[float] = None
    technical_skills: Optional[str] = None
    dsa_level: Optional[str] = None
    coding_platform: Optional[str] = None
    leetcode_score: Optional[str] = None
    hackerrank_score: Optional[str] = None
    preferred_job_role: Optional[str] = None
    career_interests: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    resume_uploaded: Optional[bool] = False

class StudentProfileCreate(StudentProfileBase):
    projects: Optional[List[StudentProjectCreate]] = []
    internships: Optional[List[StudentInternshipCreate]] = []
    certifications: Optional[List[StudentCertificationCreate]] = []

class StudentProfileUpdate(StudentProfileBase):
    projects: Optional[List[StudentProjectCreate]] = []
    internships: Optional[List[StudentInternshipCreate]] = []
    certifications: Optional[List[StudentCertificationCreate]] = []

class StudentProfileResponse(StudentProfileBase):
    id: int
    user_id: int
    profile_completion: int
    projects: List[StudentProjectResponse] = []
    internships: List[StudentInternshipResponse] = []
    certifications: List[StudentCertificationResponse] = []

    class Config:
        from_attributes = True

# --- Helper Function for Completion % ---
def calculate_completion(profile: models.StudentProfile) -> int:
    # 20 points total for these basic fields
    fields = [
        profile.full_name, profile.usn, profile.email, profile.department, 
        profile.branch, profile.semester, profile.cgpa, profile.technical_skills, 
        profile.dsa_level, profile.coding_platform, profile.preferred_job_role,
        profile.career_interests, profile.github_url, profile.linkedin_url
    ]
    filled_fields = sum(1 for field in fields if field)
    percentage = int((filled_fields / len(fields)) * 50) # 50% for basic fields

    # 15% for having at least one project
    if profile.projects and len(profile.projects) > 0:
        percentage += 15
    
    # 10% for having at least one internship
    if profile.internships and len(profile.internships) > 0:
        percentage += 10
        
    # 10% for having at least one certification
    if profile.certifications and len(profile.certifications) > 0:
        percentage += 10
        
    # 15% for resume uploaded
    if profile.resume_uploaded:
        percentage += 15
        
    return min(percentage, 100)

# --- Endpoints ---

@router.post("/", response_model=StudentProfileResponse)
def create_or_update_profile(profile_data: StudentProfileCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    
    # Check if profile already exists
    existing_profile = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == user_id).first()
    if existing_profile:
        raise HTTPException(status_code=400, detail="Profile already exists for this user")
        
    # Create Profile
    profile_dict = profile_data.model_dump(exclude={"projects", "internships", "certifications"})
    new_profile = models.StudentProfile(**profile_dict, user_id=user_id)
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    
    # Create nested objects
    if profile_data.projects:
        for proj in profile_data.projects:
            db.add(models.StudentProject(**proj.model_dump(), student_id=new_profile.id))
            
    if profile_data.internships:
        for intern in profile_data.internships:
            db.add(models.StudentInternship(**intern.model_dump(), student_id=new_profile.id))
            
    if profile_data.certifications:
        for cert in profile_data.certifications:
            db.add(models.StudentCertification(**cert.model_dump(), student_id=new_profile.id))
            
    db.commit()
    db.refresh(new_profile)
    
    # Calculate and update completion
    new_profile.profile_completion = calculate_completion(new_profile)
    db.commit()
    db.refresh(new_profile)
    
    return new_profile

@router.get("/me", response_model=StudentProfileResponse)
def get_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    profile = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Recalculate completion just in case
    profile.profile_completion = calculate_completion(profile)
    db.commit()
    
    return profile

    # Education handling removed as it's not in schemas

@router.put("/me", response_model=StudentProfileResponse)
def update_student_profile(
    profile_data: StudentProfileUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id
    profile = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == user_id).first()
    
    if not profile:
        # If not found, create it (Upsert)
        return create_or_update_profile(StudentProfileCreate(**profile_data.model_dump()), db, current_user)

    # Update basic info
    update_data = profile_data.model_dump(exclude={"projects", "internships", "certifications"}, exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)
        
    # Recreate nested arrays (simpler than syncing individual items for a prototype)
    db.query(models.StudentProject).filter(models.StudentProject.student_id == profile.id).delete()
    db.query(models.StudentInternship).filter(models.StudentInternship.student_id == profile.id).delete()
    db.query(models.StudentCertification).filter(models.StudentCertification.student_id == profile.id).delete()
    db.commit()
    
    if profile_data.projects:
        for proj in profile_data.projects:
            db.add(models.StudentProject(**proj.model_dump(), student_id=profile.id))
            
    if profile_data.internships:
        for intern in profile_data.internships:
            db.add(models.StudentInternship(**intern.model_dump(), student_id=profile.id))
            
    if profile_data.certifications:
        for cert in profile_data.certifications:
            db.add(models.StudentCertification(**cert.model_dump(), student_id=profile.id))
            
    db.commit()
    db.refresh(profile)
    
    profile.profile_completion = calculate_completion(profile)
    db.commit()
    db.refresh(profile)
    
    return profile

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_student_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    profile = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    db.delete(profile)
    db.commit()
    return None
