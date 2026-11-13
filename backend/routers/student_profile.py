import os
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, model_validator
from datetime import date
from dependencies.auth import get_current_user
from models.user import User
from models.resume import Resume
from database import get_db
from models import student_profile as models

def validate_calendar_date(val: Optional[str], field_name: str) -> Optional[date]:
    if not val or not str(val).strip():
        return None
    s = str(val).strip()
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        raise ValueError(f"{field_name} must follow ISO format YYYY-MM-DD.")
    try:
        parsed = date.fromisoformat(s)
    except ValueError:
        raise ValueError(f"{field_name} '{s}' is an invalid calendar date.")
    if parsed.year < 1990 or parsed.year > 2050:
        raise ValueError(f"{field_name} year {parsed.year} out of range (1990-2050).")
    return parsed

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
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration: Optional[str] = None
    description: Optional[str] = None

    @model_validator(mode="after")
    def validate_internship_dates(self):
        start_d = validate_calendar_date(self.start_date, "Start Date")
        end_d = validate_calendar_date(self.end_date, "End Date")

        self.start_date = start_d.isoformat() if start_d else None
        self.end_date = end_d.isoformat() if end_d else None

        if end_d and not start_d:
            raise ValueError("Cannot specify an End Date without a Start Date.")

        if start_d and end_d:
            if end_d < start_d:
                raise ValueError("End date cannot be earlier than start date.")
        return self

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

# --- Helper Functions for Profile Completion & Internship Sync ---

PLACEHOLDER_STRINGS = {"na", "n/a", "none", "null", "-", "--", "nil"}

def is_valid_field(val: any) -> bool:
    if val is None:
        return False
    s = str(val).strip()
    if not s:
        return False
    if s.lower() in PLACEHOLDER_STRINGS:
        return False
    return True

def sync_internship_duration(data: dict) -> dict:
    """
    Synchronizes the duration string from start_date and end_date if dates are provided,
    while preserving existing free-text duration if dates are absent.
    """
    s_date = data.get("start_date")
    e_date = data.get("end_date")
    s_clean = str(s_date).strip() if s_date and str(s_date).strip() else None
    e_clean = str(e_date).strip() if e_date and str(e_date).strip() else None
    data["start_date"] = s_clean
    data["end_date"] = e_clean
    if s_clean:
        if e_clean:
            data["duration"] = f"{s_clean} to {e_clean}"
        else:
            data["duration"] = f"{s_clean} to Present"
    return data

def is_resume_authoritatively_verified(db: Optional[Session], user_id: Optional[int]) -> bool:
    """
    Five-layer authoritative resume verification:
    1. Student ownership (Resume.user_id == user_id)
    2. Path traversal security (resolved canonical path resides inside approved uploads directory)
    3. File existence and non-zero size on disk
    4. Allowed extension (.pdf, .doc, .docx)
    5. Valid structured parsed dictionary with non-empty entities
    """
    if db is None or not user_id:
        return False

    candidate_bases = [
        os.path.abspath("uploads"),
        os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")),
        os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads"))
    ]
    candidate_bases = list({b for b in candidate_bases if os.path.isdir(b)})

    resumes = db.query(Resume).filter(Resume.user_id == user_id).all()
    if not resumes:
        return False

    for r in resumes:
        # Layer 4: Allowed extension
        ext = os.path.splitext(r.filename or r.file_path or "")[1].lower()
        if ext not in [".pdf", ".doc", ".docx"]:
            continue

        # Layers 2 & 3: Resolve path within approved upload directories & verify existence/non-empty
        resolved_path = None
        for base in candidate_bases:
            candidates = [
                os.path.abspath(r.file_path) if r.file_path else "",
                os.path.abspath(os.path.join("backend", r.file_path)) if r.file_path else "",
                os.path.abspath(os.path.join(base, os.path.basename(r.file_path))) if r.file_path else ""
            ]
            for c in candidates:
                if c and os.path.isfile(c) and os.path.exists(c):
                    try:
                        norm_c = os.path.abspath(c)
                        norm_base = os.path.abspath(base)
                        if os.path.commonpath([norm_base, norm_c]) == norm_base:
                            resolved_path = norm_c
                            break
                    except ValueError:
                        continue
            if resolved_path:
                break

        if not resolved_path or os.path.getsize(resolved_path) == 0:
            continue

        # Layer 5: Valid structured parsed data
        if not (isinstance(r.parsed_data, dict) and bool(r.parsed_data)):
            continue
        if not any(r.parsed_data.get(k) for k in ("skills", "education", "experience", "raw_text", "name", "email")):
            continue

        return True

    return False

def calculate_completion(profile: models.StudentProfile, db: Optional[Session] = None) -> int:
    """
    Authoritative Profile Completion (0-100%):
    - Basic Profile Info: up to 50% across 13 slots:
      - 12 Core Slots:
        1. full_name
        2. usn
        3. email
        4. department
        5. branch
        6. semester (1-8)
        7. cgpa (0.0-10.0)
        8. technical_skills
        9. preferred_job_role
        10. career_interests
        11. dsa_level ('Beginner', 'Intermediate', 'Advanced')
        12. Unified Coding Platform (coding_platform, leetcode_score, or hackerrank_score -> max 1 slot)
      - 1 Portfolio Link Slot:
        13. Unified Portfolio (github_url or linkedin_url -> max 1 slot)
      CoreBasicScore = min(50, round((filled_slots / 13) * 50))
    - Projects: 15% (at least 1 project with name, tech, and at least one of desc / github_link)
    - Internships: 10% (at least 1 internship with company and role)
    - Certifications: 10% (at least 1 certification with name and platform)
    - Resume: 15% (verified resume via 5-layer check if db provided, or profile.resume_uploaded)
    Total capped at 100%.
    """
    if not profile:
        return 0

    filled_slots = 0
    # 1. full_name
    if is_valid_field(profile.full_name):
        filled_slots += 1
    # 2. usn
    if is_valid_field(profile.usn):
        filled_slots += 1
    # 3. email
    if is_valid_field(profile.email):
        filled_slots += 1
    # 4. department
    if is_valid_field(profile.department):
        filled_slots += 1
    # 5. branch
    if is_valid_field(profile.branch):
        filled_slots += 1
    # 6. semester (1 to 8)
    if profile.semester is not None:
        try:
            sem_int = int(profile.semester)
            if 1 <= sem_int <= 8:
                filled_slots += 1
        except (ValueError, TypeError):
            pass
    # 7. cgpa (0.0 to 10.0)
    if profile.cgpa is not None:
        try:
            cgpa_flt = float(profile.cgpa)
            if 0.0 <= cgpa_flt <= 10.0:
                filled_slots += 1
        except (ValueError, TypeError):
            pass
    # 8. technical_skills
    if is_valid_field(profile.technical_skills):
        filled_slots += 1
    # 9. preferred_job_role
    if is_valid_field(profile.preferred_job_role):
        filled_slots += 1
    # 10. career_interests
    if is_valid_field(profile.career_interests):
        filled_slots += 1
    # 11. dsa_level ('Beginner', 'Intermediate', 'Advanced')
    if is_valid_field(profile.dsa_level) and str(profile.dsa_level).strip().lower() in {"beginner", "intermediate", "advanced"}:
        filled_slots += 1
    # 12. Unified Coding Platform (max 1 slot)
    if is_valid_field(profile.coding_platform) or is_valid_field(profile.leetcode_score) or is_valid_field(profile.hackerrank_score):
        filled_slots += 1
    # 13. Unified Portfolio Link (max 1 slot)
    if is_valid_field(profile.github_url) or is_valid_field(profile.linkedin_url):
        filled_slots += 1

    basic_score = min(50, round((filled_slots / 13) * 50))

    # 15% Projects: at least 1 valid project
    project_score = 0
    projects = getattr(profile, "projects", None) or []
    if projects:
        valid_projects = [
            p for p in projects
            if is_valid_field(p.project_name) and is_valid_field(p.technology) and (is_valid_field(p.description) or is_valid_field(p.github_link))
        ]
        if valid_projects:
            project_score = 15

    # 10% Internships: at least 1 valid internship
    internship_score = 0
    internships = getattr(profile, "internships", None) or []
    if internships:
        valid_internships = [
            i for i in internships
            if is_valid_field(i.company) and is_valid_field(i.role)
        ]
        if valid_internships:
            internship_score = 10

    # 10% Certifications: at least 1 valid certification
    cert_score = 0
    certifications = getattr(profile, "certifications", None) or []
    if certifications:
        valid_certs = [
            c for c in certifications
            if is_valid_field(c.certificate_name) and is_valid_field(c.platform)
        ]
        if valid_certs:
            cert_score = 10

    # 15% Resume: 5-layer verification
    resume_score = 0
    if db is not None and getattr(profile, "user_id", None):
        resume_verified = is_resume_authoritatively_verified(db, profile.user_id)
        if resume_verified:
            profile.resume_uploaded = True
            resume_score = 15
        else:
            profile.resume_uploaded = False
    else:
        if getattr(profile, "resume_uploaded", False):
            resume_score = 15

    total = basic_score + project_score + internship_score + cert_score + resume_score
    return min(100, max(0, total))

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
    if is_resume_authoritatively_verified(db, user_id):
        profile_dict["resume_uploaded"] = True
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
            intern_dict = sync_internship_duration(intern.model_dump())
            db.add(models.StudentInternship(**intern_dict, student_id=new_profile.id))
            
    if profile_data.certifications:
        for cert in profile_data.certifications:
            db.add(models.StudentCertification(**cert.model_dump(), student_id=new_profile.id))
            
    db.commit()
    db.refresh(new_profile)
    
    # Calculate and update completion
    new_profile.profile_completion = calculate_completion(new_profile, db=db)
    db.commit()
    db.refresh(new_profile)

    if new_profile.preferred_job_role and new_profile.preferred_job_role.strip():
        from models.competency_profile import CompetencyProfile
        comp = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == user_id).first()
        if comp and comp.competency_json:
            comp_json = dict(comp.competency_json)
            comp_json["preferred_job_role"] = new_profile.preferred_job_role.strip()
            comp.competency_json = comp_json
            db.commit()
    
    return new_profile

@router.get("/me", response_model=StudentProfileResponse)
def get_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    profile = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Recalculate completion dynamically
    profile.profile_completion = calculate_completion(profile, db=db)
    db.commit()
    db.refresh(profile)
    
    return profile

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

    old_preferred_role = profile.preferred_job_role

    # Update basic info
    update_data = profile_data.model_dump(exclude={"projects", "internships", "certifications"}, exclude_unset=True)
    if is_resume_authoritatively_verified(db, user_id):
        update_data["resume_uploaded"] = True
    elif "resume_uploaded" not in update_data:
        update_data["resume_uploaded"] = profile.resume_uploaded

    for key, value in update_data.items():
        setattr(profile, key, value)
        
    # Recreate nested arrays
    db.query(models.StudentProject).filter(models.StudentProject.student_id == profile.id).delete()
    db.query(models.StudentInternship).filter(models.StudentInternship.student_id == profile.id).delete()
    db.query(models.StudentCertification).filter(models.StudentCertification.student_id == profile.id).delete()
    db.commit()
    
    if profile_data.projects:
        for proj in profile_data.projects:
            db.add(models.StudentProject(**proj.model_dump(), student_id=profile.id))
            
    if profile_data.internships:
        for intern in profile_data.internships:
            intern_dict = sync_internship_duration(intern.model_dump())
            db.add(models.StudentInternship(**intern_dict, student_id=profile.id))
            
    if profile_data.certifications:
        for cert in profile_data.certifications:
            db.add(models.StudentCertification(**cert.model_dump(), student_id=profile.id))
            
    db.commit()
    db.refresh(profile)
    
    profile.profile_completion = calculate_completion(profile, db=db)
    db.commit()
    db.refresh(profile)

    # Profile synchronization: Recalculate Skill Gap only when preferred_job_role actually changes
    new_preferred_role = profile.preferred_job_role
    role_changed = (old_preferred_role or "").strip().lower() != (new_preferred_role or "").strip().lower()
    if role_changed and new_preferred_role and new_preferred_role.strip():
        from models.competency_profile import CompetencyProfile
        comp = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == user_id).first()
        if comp and comp.competency_json:
            comp_json = dict(comp.competency_json)
            comp_json["preferred_job_role"] = new_preferred_role.strip()
            comp.competency_json = comp_json
            db.commit()

        from routers.skill_gap import recalculate_skill_gap_for_user
        try:
            recalculate_skill_gap_for_user(
                db=db,
                user_id=user_id,
                target_role_override=new_preferred_role.strip(),
                sync_preference_to_profile=False
            )
        except Exception:
            pass
    
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
