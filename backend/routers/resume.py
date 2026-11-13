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
    if ext in [".pdf", ".docx", ".doc"]:
        try:
            parsed_data = parse_resume(file_path)
            # Save parsed data directly to the Resume record
            db_resume.parsed_data = parsed_data
            db.commit()
            db.refresh(db_resume)
        except Exception as e:
            print(f"Error parsing resume: {e}")

    # Synchronize StudentProfile resume_uploaded, structured internships, and profile_completion upon upload
    try:
        from models.student_profile import StudentProfile, StudentInternship
        from routers.student_profile import calculate_completion, sync_internship_duration
        sp = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if sp:
            sp.resume_uploaded = True

            # Integrate structured internships if extracted from resume
            structured_exps = parsed_data.get("structured_experience", [])
            if structured_exps:
                existing_interns = db.query(StudentInternship).filter(StudentInternship.student_id == sp.id).all()
                for exp in structured_exps:
                    comp_name = (exp.get("company") or "").strip()
                    role_name = (exp.get("role") or "").strip()
                    if not comp_name or comp_name.lower() in {"experience entry", "na", "n/a", "none"}:
                        continue

                    # Deduplication check: Match against existing internships by company name
                    match = None
                    for ei in existing_interns:
                        ei_comp = (ei.company or "").strip().lower()
                        if ei_comp and (ei_comp == comp_name.lower() or ei_comp in comp_name.lower() or comp_name.lower() in ei_comp):
                            match = ei
                            break

                    if match:
                        # Existing record: DO NOT overwrite manually entered dates (Requirement 11)
                        if not match.start_date and exp.get("start_date"):
                            match.start_date = exp.get("start_date")
                            if not match.end_date and exp.get("end_date"):
                                match.end_date = exp.get("end_date")
                            sync_dict = sync_internship_duration({
                                "start_date": match.start_date,
                                "end_date": match.end_date,
                                "duration": match.duration
                            })
                            match.duration = sync_dict.get("duration")
                        if not match.description and exp.get("description"):
                            match.description = exp.get("description")
                    else:
                        # Create new non-duplicate structured internship (Requirement 9 & 10 & 12)
                        s_data = sync_internship_duration({
                            "start_date": exp.get("start_date"),
                            "end_date": exp.get("end_date"),
                            "duration": exp.get("duration")
                        })
                        new_intern = StudentInternship(
                            student_id=sp.id,
                            company=comp_name,
                            role=role_name or "Intern",
                            start_date=s_data.get("start_date"),
                            end_date=s_data.get("end_date"),
                            duration=s_data.get("duration"),
                            description=exp.get("description", "")
                        )
                        db.add(new_intern)
                        db.flush()
                        existing_interns.append(new_intern)

            sp.profile_completion = calculate_completion(sp, db=db)
            db.commit()
            db.refresh(sp)
    except Exception as e:
        print(f"Error syncing profile on resume upload: {e}")
        
    return {
        "message": "Resume uploaded and parsed successfully." if ext in [".pdf", ".docx", ".doc"] else "Resume uploaded successfully. Parsing is currently optimized for PDF.",
        "resume_id": db_resume.id,
        "filename": db_resume.filename,
        "parsed_data": parsed_data
    }
