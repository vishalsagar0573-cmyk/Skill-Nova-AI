import os
import shutil
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.resume import Resume
from models.user import UserProfile
from services.parser import parse_resume

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}

@router.post("/upload")
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF and DOC/DOCX files are allowed.")
    
    # Secure filename against collisions
    safe_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    # Save the file to local uploads directory
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Store metadata in PostgreSQL
    db_resume = Resume(
        user_id=1, # Mocking user 1 for now
        filename=file.filename,
        file_path=file_path,
        file_type=ext
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    
    parsed_data = {}
    
    # NLP Parsing integration
    if ext == ".pdf":
        parsed_data = parse_resume(file_path)
        
        # Save parsed data to user profile in PostgreSQL
        user_id = 1
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        
        if not profile:
            profile = UserProfile(user_id=user_id)
            db.add(profile)
            
        profile.skills = parsed_data.get("skills", profile.skills)
        profile.internships = parsed_data.get("experience", profile.internships)
        profile.certifications = parsed_data.get("certifications", profile.certifications)
        profile.projects = parsed_data.get("projects", profile.projects)
        
        db.commit()
        db.refresh(profile)
        
        return {
            "message": "Resume uploaded and parsed successfully.",
            "resume_id": db_resume.id,
            "filename": db_resume.filename,
            "parsed_data": parsed_data
        }
    
    return {
        "message": "Resume uploaded successfully. Parsing is currently optimized for PDF.",
        "resume_id": db_resume.id,
        "filename": db_resume.filename,
        "parsed_data": parsed_data
    }
