from sqlalchemy.orm import Session
from models.user import UserProfile
from models.student_profile import StudentProfile
from models.competency_profile import CompetencyProfile
from models.job import JobCompatibility
from models.skill_gap import SkillGapAnalysis

class DashboardService:
    @staticmethod
    def get_dashboard_data(db: Session, user_id: int):
        # Retrieve data using existing models cleanly
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        competency = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == user_id).first()
        job_compat = db.query(JobCompatibility).filter(JobCompatibility.user_id == user_id).first()
        skill_gap = db.query(SkillGapAnalysis).filter(SkillGapAnalysis.user_id == user_id).first()
        user_model = db.query(UserProfile).filter(UserProfile.id == user_id).first()
        
        # Calculate Profile Completion
        fields = ["skills", "projects", "internships", "certifications", "cgpa", "career_interests"]
        filled = 0
        if competency and competency.competency_json:
            filled = sum(1 for f in fields if competency.competency_json.get(f))
        profile_completion_pct = (filled / len(fields)) * 100 if fields else 0.0
        
        # Construct unified payload
        return {
            "profile": {
                "name": profile.full_name if profile else (user_model.username if user_model else "Student"),
                "preferred_role": competency.competency_json.get("preferred_job_role", "Not set") if competency and competency.competency_json else "Not set",
                "profile_completion": profile_completion_pct
            },
            "competency_scores": {
                "overall": competency.overall_competency_score if competency and competency.overall_competency_score is not None else 0,
                "frontend": competency.frontend_score if competency else 0,
                "backend": competency.backend_score if competency else 0,
                "database": competency.database_score if competency else 0,
                "ai_ml": competency.ai_ml_score if competency else 0,
                "programming": competency.programming_score if competency else 0,
                "soft_skills": competency.soft_skill_score if competency else 0,
            } if competency else None,
            "job_compatibility": {
                "best_match": job_compat.best_role if job_compat else "None",
                "compatibility_score": job_compat.compatibility_score if job_compat else 0,
                "missing_skills": job_compat.missing_skills if job_compat else [],
                "top_roles": [job_compat.best_role] if job_compat else [] # Placeholder for top roles if we store them all later
            } if job_compat else None,
            "skill_gap": {
                "overall_gap_percentage": skill_gap.overall_gap_percentage if skill_gap else 0,
                "missing_skills_prioritized": skill_gap.missing_skills_json if skill_gap else [],
                "career_readiness_score": skill_gap.career_readiness_score if skill_gap else 0,
            } if skill_gap else None,
            "recommendations": skill_gap.recommended_resources_json if skill_gap else {},
            "roadmap": skill_gap.career_roadmap_json if skill_gap else [],
            "action_plan": skill_gap.action_plan_json if skill_gap else [],
            "system_health": {
                "status": "Healthy",
                "services": ["NLP Engine", "ML Scorer", "DB Sync"]
            },
            "recent_activity": [
                {"action": "Logged in", "time": "2 hours ago"},
                {"action": "Profile Updated", "time": "1 day ago"}
            ] if profile else []
        }
