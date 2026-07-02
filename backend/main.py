from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, SessionLocal
from models import user as user_models
from models import resume as resume_models
from models import job as job_models
from models import course as course_models
from routers import resume, jobs, recommendations

# Auto-create tables on startup
user_models.Base.metadata.create_all(bind=engine)
resume_models.Base.metadata.create_all(bind=engine)
job_models.Base.metadata.create_all(bind=engine)
course_models.Base.metadata.create_all(bind=engine)

def seed_data():
    """Seeds the database with highly realistic job roles and courses."""
    db = SessionLocal()
    try:
        # Re-seed Jobs for updated requirements
        if db.query(job_models.JobRole).count() != 4:
            db.query(job_models.JobRole).delete()
            db.commit()
            
            sample_jobs = [
                job_models.JobRole(title="Data Analyst", required_skills="Python, SQL, Excel, Power BI"),
                job_models.JobRole(title="Machine Learning Engineer", required_skills="Python, Machine Learning, TensorFlow, Scikit-learn"),
                job_models.JobRole(title="Frontend Developer", required_skills="HTML, CSS, JavaScript, React"),
                job_models.JobRole(title="Backend Developer", required_skills="Python, FastAPI, SQL, REST APIs")
            ]
            db.add_all(sample_jobs)
            db.commit()
            
        # Seed Mock User Profile
        if db.query(user_models.UserProfile).filter(user_models.UserProfile.user_id == 1).count() == 0:
            mock_profile = user_models.UserProfile(user_id=1, skills="Python, SQL, Pandas, Scikit-learn, Docker, FastAPI")
            db.add(mock_profile)
            db.commit()
            
        # Seed Courses
        if db.query(course_models.Course).count() == 0:
            sample_courses = [
                course_models.Course(skill_name="power bi", course_name="Power BI for Beginners", platform="Coursera", difficulty_level="Beginner", course_link="https://coursera.org"),
                course_models.Course(skill_name="tensorflow", course_name="TensorFlow in Practice", platform="Coursera", difficulty_level="Intermediate", course_link="https://coursera.org"),
                course_models.Course(skill_name="machine learning", course_name="Machine Learning Specialization", platform="Coursera", difficulty_level="Beginner", course_link="https://coursera.org"),
                course_models.Course(skill_name="scikit-learn", course_name="Applied Machine Learning in Python", platform="Coursera", difficulty_level="Intermediate", course_link="https://coursera.org"),
                course_models.Course(skill_name="excel", course_name="Excel Skills for Business", platform="Coursera", difficulty_level="Beginner", course_link="https://coursera.org"),
                course_models.Course(skill_name="javascript", course_name="Modern JavaScript From The Beginning", platform="Udemy", difficulty_level="Beginner", course_link="https://udemy.com"),
                course_models.Course(skill_name="react", course_name="React - The Complete Guide", platform="Udemy", difficulty_level="Intermediate", course_link="https://udemy.com")
            ]
            db.add_all(sample_courses)
            db.commit()
    finally:
        db.close()

# Run seed
seed_data()

app = FastAPI(title="SkillNova AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router, prefix="/api/resume", tags=["Resume"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Job Matching"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Course Recommendations"])

@app.get("/")
def health_check():
    return {"status": "ok", "message": "SkillNova AI Backend is running."}
