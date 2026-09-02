from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, SessionLocal
from models import user as user_models
from models import resume as resume_models
from models import job as job_models
from models import course as course_models
from models import student_profile as student_profile_models
from models import competency_profile as competency_profile_models
from models import skill_gap as skill_gap_models
from routers import resume, jobs, recommendations, student_profile, competency_profile, job_compatibility, skill_gap, dashboard, auth, ml
# Auto-create tables on startup
user_models.Base.metadata.create_all(bind=engine)
resume_models.Base.metadata.create_all(bind=engine)
job_models.Base.metadata.create_all(bind=engine)
course_models.Base.metadata.create_all(bind=engine)
student_profile_models.Base.metadata.create_all(bind=engine)
competency_profile_models.Base.metadata.create_all(bind=engine)
skill_gap_models.Base.metadata.create_all(bind=engine)

def seed_data():
    """Seeds the database with highly realistic job roles and courses."""
    db = SessionLocal()
    try:
        # Re-seed Jobs for updated requirements
        if db.query(job_models.JobRole).count() != 5:
            db.query(job_models.JobRole).delete()
            db.commit()
            
            sample_jobs = [
                job_models.JobRole(
                    role_name="AI Engineer",
                    description="Design and develop machine learning models and AI systems.",
                    required_skills=["Python", "Machine Learning", "TensorFlow", "PyTorch", "SQL", "Git"],
                    preferred_skills=["Docker", "AWS", "FastAPI"],
                    minimum_cgpa=7.5
                ),
                job_models.JobRole(
                    role_name="Data Scientist",
                    description="Analyze and interpret complex data to help organizations make better decisions.",
                    required_skills=["Python", "Pandas", "NumPy", "Machine Learning", "Statistics", "SQL"],
                    preferred_skills=["Power BI", "Tableau", "Scikit-learn"],
                    minimum_cgpa=7.0
                ),
                job_models.JobRole(
                    role_name="Backend Developer",
                    description="Develop and maintain server-side application logic and databases.",
                    required_skills=["Python", "FastAPI", "REST API", "PostgreSQL", "SQL", "Git"],
                    preferred_skills=["Docker", "Redis"],
                    minimum_cgpa=6.5
                ),
                job_models.JobRole(
                    role_name="Frontend Developer",
                    description="Implement visual elements that users see and interact with in a web application.",
                    required_skills=["React", "JavaScript", "HTML", "CSS"],
                    preferred_skills=["TypeScript", "Redux"],
                    minimum_cgpa=6.5
                ),
                job_models.JobRole(
                    role_name="Full Stack Developer",
                    description="Develop both client and server software.",
                    required_skills=["React", "FastAPI", "Python", "PostgreSQL", "REST API", "Git"],
                    preferred_skills=["Docker", "AWS"],
                    minimum_cgpa=7.0
                )
            ]
            db.add_all(sample_jobs)
            db.commit()
            
        # Seed Mock User Profile
        if db.query(user_models.User).filter(user_models.User.id == 1).count() == 0:
            mock_user = user_models.User(id=1, email="test@example.com", name="Test User", hashed_password="hashed_pwd")
            db.add(mock_user)
            db.commit()

        if db.query(user_models.UserProfile).filter(user_models.UserProfile.user_id == 1).count() == 0:
            mock_profile = user_models.UserProfile(user_id=1, skills="Python, SQL, Pandas, Scikit-learn, Docker, FastAPI")
            db.add(mock_profile)
            db.commit()
            
        # Seed Courses (legacy)
        if db.query(course_models.Course).count() == 0:
            sample_courses = [
                course_models.Course(skill_name="power bi", course_name="Power BI for Beginners", platform="Coursera", difficulty_level="Beginner", course_link="https://coursera.org"),
                course_models.Course(skill_name="tensorflow", course_name="TensorFlow in Practice", platform="Coursera", difficulty_level="Intermediate", course_link="https://coursera.org"),
            ]
            db.add_all(sample_courses)
            db.commit()
            
        # Seed Learning Resources (New Skill Gap Engine)
        if db.query(skill_gap_models.LearningResource).count() == 0:
            skills = ["Python", "React", "FastAPI", "Machine Learning", "TensorFlow", "PyTorch", "Docker", "AWS", "SQL", "Git", "PostgreSQL", "JavaScript", "HTML", "CSS"]
            resources = []
            for skill in skills:
                # Add a Course
                resources.append(skill_gap_models.LearningResource(
                    skill_name=skill, resource_type="Course", title=f"Complete {skill} Bootcamp", provider="Udemy", url=f"https://udemy.com/course/{skill.lower()}", difficulty="Beginner", estimated_duration=20.5, description=f"Master {skill} from scratch."
                ))
                # Add Official Docs
                resources.append(skill_gap_models.LearningResource(
                    skill_name=skill, resource_type="Documentation", title=f"{skill} Official Docs", provider="Official", url=f"https://docs.{skill.lower()}.org", difficulty="Intermediate", estimated_duration=10.0, description=f"Official documentation for {skill}."
                ))
                # Add Certification / Practice
                resources.append(skill_gap_models.LearningResource(
                    skill_name=skill, resource_type="Certification", title=f"{skill} Certified Professional", provider="Coursera", url=f"https://coursera.org/{skill.lower()}", difficulty="Advanced", estimated_duration=40.0, description=f"Get certified in {skill}."
                ))
                # Add GitHub Project
                resources.append(skill_gap_models.LearningResource(
                    skill_name=skill, resource_type="GitHub", title=f"Awesome {skill}", provider="GitHub", url=f"https://github.com/awesome/{skill.lower()}", difficulty="Intermediate", estimated_duration=5.0, description=f"Curated list of {skill} resources."
                ))
            db.add_all(resources)
            db.commit()
    finally:
        db.close()

# Run seed
seed_data()

app = FastAPI(title="SkillNova AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router, prefix="/api/resume", tags=["Resume"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Job Matching"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Course Recommendations"])
app.include_router(student_profile.router, prefix="/api/student-profile", tags=["Student Profile"])
app.include_router(competency_profile.router, prefix="/api/competency-profile", tags=["Competency Profile"])
app.include_router(job_compatibility.router, prefix="/api/job-compatibility", tags=["Job Compatibility"])
app.include_router(skill_gap.router, prefix="/api/skill-gap", tags=["Skill Gap"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(ml.router, prefix="/api/ml", tags=["Machine Learning"])

@app.get("/")
def health_check():
    return {"status": "ok", "message": "SkillNova AI Backend is running."}
