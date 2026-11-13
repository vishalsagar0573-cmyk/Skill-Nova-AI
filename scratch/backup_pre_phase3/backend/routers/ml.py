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
    
    if not competency or not competency.competency_json:
        raise HTTPException(status_code=404, detail="Competency profile not found. Please calculate competency scores first.")
        
    # If competency scores haven't been calculated yet, compute them now
    if competency.overall_competency_score is None or competency.data_science_score is None or competency.cloud_score is None:
        from services.scoring import ScoringEngine
        engine = ScoringEngine()
        scores, explanations = engine.calculate_all(competency.competency_json)
        competency.overall_score = scores.get("overall_score")
        competency.overall_competency_score = scores.get("overall_score")
        competency.frontend_score = scores.get("frontend_score")
        competency.backend_score = scores.get("backend_score")
        competency.database_score = scores.get("database_score")
        competency.ai_ml_score = scores.get("ai_ml_score")
        competency.data_science_score = scores.get("data_science_score")
        competency.cloud_score = scores.get("cloud_score")
        competency.programming_score = scores.get("programming_score")
        competency.soft_skill_score = scores.get("soft_skill_score")
        competency.score_explanations = explanations
        db.commit()
        db.refresh(competency)

    dsa_level = student.dsa_level if student and student.dsa_level else "Beginner"
    cgpa = student.cgpa if student and student.cgpa else 0.0
    
    competency_data = {
        'frontend_score': competency.frontend_score or 0.0,
        'backend_score': competency.backend_score or 0.0,
        'database_score': competency.database_score or 0.0,
        'ai_ml_score': competency.ai_ml_score or 0.0,
        'data_science_score': competency.data_science_score or 0.0,
        'cloud_score': competency.cloud_score or 0.0,
        'programming_score': competency.programming_score or 0.0,
        'soft_skill_score': competency.soft_skill_score or 0.0,
        'overall_competency_score': competency.overall_competency_score or 0.0
    }
    
    try:
        result = predictor.predict(competency_data=competency_data, dsa_level=dsa_level, cgpa=cgpa)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML Prediction failed: {str(e)}")
