from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from dependencies.auth import get_current_user
from models.user import User
from models.competency_profile import CompetencyProfile
from models.student_profile import StudentProfile
from ml.prediction.predict import predictor

router = APIRouter()

@router.post("/predict")
def predict_ml_role(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    
    # Fetch profiles
    competency = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == user_id).first()
    student = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    
    if not competency:
        raise HTTPException(status_code=404, detail="Competency profile not found. Please calculate competency scores first.")
        
    dsa_level = student.dsa_level if student and student.dsa_level else "Beginner"
    cgpa = student.cgpa if student and student.cgpa else 0.0
    
    competency_data = {
        'frontend_score': competency.frontend_score,
        'backend_score': competency.backend_score,
        'database_score': competency.database_score,
        'ai_ml_score': competency.ai_ml_score,
        'data_science_score': competency.data_science_score,
        'cloud_score': competency.cloud_score,
        'programming_score': competency.programming_score,
        'soft_skill_score': competency.soft_skill_score,
        'overall_competency_score': competency.overall_competency_score
    }
    
    try:
        result = predictor.predict(competency_data=competency_data, dsa_level=dsa_level, cgpa=cgpa)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML Prediction failed: {str(e)}")
