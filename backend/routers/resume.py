import os
import shutil
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.resume import Resume
from services.parser import parse_resume
from dependencies.auth import get_current_user
from models.user import User

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}

@router.post("/upload")
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
        user_id=current_user.id,
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
        try:
            parsed_data = parse_resume(file_path)
            # Save parsed data directly to the Resume record
            db_resume.parsed_data = parsed_data
            db.commit()
            db.refresh(db_resume)
        except Exception as e:
            print(f"Error parsing resume: {e}")
        
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
