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
from routers import resume, jobs, recommendations, student_profile, competency_profile, job_compatibility, skill_gap, dashboard, auth, ml, learning_path
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
        # Seed missing standard job roles individually (preserves customizations and avoids duplicate role names)
        standard_jobs = [
            {
                "role_name": "AI Engineer",
                "description": "Design and develop machine learning models and AI systems.",
                "required_skills": ["Python", "Machine Learning", "TensorFlow", "PyTorch", "SQL", "Git"],
                "preferred_skills": ["Docker", "AWS", "FastAPI"],
                "minimum_cgpa": 7.5
            },
            {
                "role_name": "Data Scientist",
                "description": "Analyze and interpret complex data to help organizations make better decisions.",
                "required_skills": ["Python", "Pandas", "NumPy", "Machine Learning", "Statistics", "SQL"],
                "preferred_skills": ["Power BI", "Tableau", "Scikit-learn"],
                "minimum_cgpa": 7.0
            },
            {
                "role_name": "Backend Developer",
                "description": "Develop and maintain server-side application logic and databases.",
                "required_skills": ["Python", "FastAPI", "REST API", "PostgreSQL", "SQL", "Git"],
                "preferred_skills": ["Docker", "Redis"],
                "minimum_cgpa": 6.5
            },
            {
                "role_name": "Frontend Developer",
                "description": "Implement visual elements that users see and interact with in a web application.",
                "required_skills": ["React", "JavaScript", "HTML", "CSS"],
                "preferred_skills": ["TypeScript", "Redux"],
                "minimum_cgpa": 6.5
            },
            {
                "role_name": "Full Stack Developer",
                "description": "Develop both client and server software.",
                "required_skills": ["React", "FastAPI", "Python", "PostgreSQL", "REST API", "Git"],
                "preferred_skills": ["Docker", "AWS"],
                "minimum_cgpa": 7.0
            },
            {
                "role_name": "Python Developer",
                "description": "Design, build, and deploy robust backend services, APIs, and data solutions using Python.",
                "required_skills": ["Python", "Django", "FastAPI", "SQL", "PostgreSQL", "Git", "REST API"],
                "preferred_skills": ["Docker", "Redis", "Celery", "AWS", "PyTest"],
                "minimum_cgpa": 6.5
            },
            {
                "role_name": "Java Developer",
                "description": "Develop enterprise backend applications and microservices using Java and Spring Boot.",
                "required_skills": ["Java", "Spring Boot", "Hibernate", "SQL", "Git", "REST API", "Maven"],
                "preferred_skills": ["Microservices", "Docker", "Kubernetes", "AWS"],
                "minimum_cgpa": 6.5
            },
            {
                "role_name": "Software Engineer",
                "description": "Design, implement, test, and maintain software solutions with strong algorithmic fundamentals.",
                "required_skills": ["Python", "Java", "Data Structures", "Algorithms", "Git", "SQL", "System Design"],
                "preferred_skills": ["Docker", "CI/CD", "Linux", "Cloud"],
                "minimum_cgpa": 7.0
            },
            {
                "role_name": "Machine Learning Engineer",
                "description": "Build, optimize, deploy, and monitor scalable machine learning models in production.",
                "required_skills": ["Python", "Machine Learning", "TensorFlow", "PyTorch", "Scikit-learn", "Git"],
                "preferred_skills": ["MLOps", "Docker", "Kubernetes", "AWS", "FastAPI"],
                "minimum_cgpa": 7.5
            },
            {
                "role_name": "Data Analyst",
                "description": "Extract insights from structured data, build analytical dashboards, and drive business intelligence.",
                "required_skills": ["Python", "SQL", "Pandas", "Power BI", "Excel", "Data Visualization"],
                "preferred_skills": ["Tableau", "Statistics", "R"],
                "minimum_cgpa": 6.5
            },
            {
                "role_name": "DevOps Engineer",
                "description": "Automate build, deployment, monitoring, and infrastructure processes to ensure high availability.",
                "required_skills": ["Linux", "Docker", "Kubernetes", "CI/CD", "Git", "Python", "Bash"],
                "preferred_skills": ["Terraform", "AWS", "Ansible", "Prometheus"],
                "minimum_cgpa": 6.5
            },
            {
                "role_name": "Cloud Engineer",
                "description": "Architect, deploy, and manage scalable and secure cloud infrastructure and services.",
                "required_skills": ["AWS", "Cloud Computing", "Linux", "Docker", "Python", "Networking"],
                "preferred_skills": ["Terraform", "Kubernetes", "Azure", "GCP"],
                "minimum_cgpa": 6.5
            },
            {
                "role_name": "Cyber Security Engineer",
                "description": "Implement defensive security architectures, secure networks, and mitigate system vulnerabilities.",
                "required_skills": ["Network Security", "Linux", "Python", "Cryptography", "Ethical Hacking", "Git"],
                "preferred_skills": ["SIEM", "Penetration Testing", "Wireshark", "Firewalls"],
                "minimum_cgpa": 7.0
            },
            {
                "role_name": "Mobile App Developer",
                "description": "Design and build high-performance mobile applications for Android and iOS platforms.",
                "required_skills": ["Flutter", "React Native", "JavaScript", "Mobile Development", "Git", "REST API"],
                "preferred_skills": ["Android Studio", "Kotlin", "Swift", "Firebase"],
                "minimum_cgpa": 6.5
            }
        ]

        for job_data in standard_jobs:
            existing = db.query(job_models.JobRole).filter(job_models.JobRole.role_name == job_data["role_name"]).first()
            if not existing:
                db.add(job_models.JobRole(**job_data))
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
            
        # Seed Verified Learning Resources via Idempotent Catalogue Sync
        from services.seed_resources import sync_learning_resources
        sync_learning_resources(db, remove_unverified_legacy=True)
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
app.include_router(learning_path.router, prefix="/api/learning-path", tags=["Learning Path"])

@app.get("/")
def health_check():
    return {"status": "ok", "message": "SkillNova AI Backend is running."}
