from sqlalchemy.orm import Session
from models.course import Course
from services.normalizer import normalize_skills

# Maps broader concepts to multiple underlying skills in the course database
SKILL_RELATIONS = {
    "machine learning": ["tensorflow", "scikit-learn", "deep learning", "python", "pytorch"],
    "data analyst": ["sql", "power bi", "excel", "pandas"],
    "backend developer": ["python", "fastapi", "django", "sql", "postgresql"],
    "frontend developer": ["javascript", "react", "html", "css"],
    "artificial intelligence": ["machine learning", "tensorflow", "pytorch"]
}

def get_course_recommendations(missing_skills: list, db: Session):
    recommendations = []
    
    normalized_missing = normalize_skills(missing_skills)
    
    for skill in normalized_missing:
        skill_lower = skill.lower()
        
        # Include original skill and related mapped skills
        search_skills = [skill_lower]
        if skill_lower in SKILL_RELATIONS:
            search_skills.extend(SKILL_RELATIONS[skill_lower])
            
        courses = db.query(Course).filter(Course.skill_name.in_(search_skills)).limit(3).all()
        
        if courses:
            course_list = [
                {
                    "course_name": c.course_name,
                    "platform": c.platform,
                    "difficulty_level": c.difficulty_level,
                    "course_link": c.course_link
                }
                for c in courses
            ]
            
            recommendations.append({
                "missing_skill": skill,
                "recommended_courses": course_list
            })
            
    return recommendations
