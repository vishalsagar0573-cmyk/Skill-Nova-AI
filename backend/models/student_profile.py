from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    
    # Basic Info
    full_name = Column(String)
    usn = Column(String)
    email = Column(String)
    department = Column(String)
    branch = Column(String)
    semester = Column(Integer)
    cgpa = Column(Float)
    
    # Skills & Platforms
    technical_skills = Column(Text)
    dsa_level = Column(String)
    coding_platform = Column(String)
    leetcode_score = Column(String)
    hackerrank_score = Column(String)
    
    # Career Goals
    preferred_job_role = Column(String)
    career_interests = Column(Text)
    
    # Links
    github_url = Column(String)
    linkedin_url = Column(String)
    
    # System fields
    resume_uploaded = Column(Boolean, default=False)
    profile_completion = Column(Integer, default=0)

    # Relationships
    user = relationship("User", back_populates="student_profile")
    projects = relationship("StudentProject", back_populates="student", cascade="all, delete-orphan")
    internships = relationship("StudentInternship", back_populates="student", cascade="all, delete-orphan")
    certifications = relationship("StudentCertification", back_populates="student", cascade="all, delete-orphan")

class StudentProject(Base):
    __tablename__ = "student_projects"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"))
    
    project_name = Column(String)
    technology = Column(String)
    description = Column(Text)
    github_link = Column(String)
    duration = Column(String)

    student = relationship("StudentProfile", back_populates="projects")

class StudentInternship(Base):
    __tablename__ = "student_internships"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"))
    
    company = Column(String)
    role = Column(String)
    duration = Column(String)
    description = Column(Text)

    student = relationship("StudentProfile", back_populates="internships")

class StudentCertification(Base):
    __tablename__ = "student_certifications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"))
    
    certificate_name = Column(String)
    platform = Column(String)
    completion_date = Column(String)
    certificate_url = Column(String)

    student = relationship("StudentProfile", back_populates="certifications")
