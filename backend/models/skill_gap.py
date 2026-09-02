from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from models.competency_profile import JSONType

class LearningResource(Base):
    __tablename__ = "learning_resources"

    id = Column(Integer, primary_key=True, index=True)
    skill_name = Column(String, index=True) # Normalized to lowercase
    resource_type = Column(String) # Course, Documentation, Platform, GitHub, Certification
    title = Column(String)
    provider = Column(String)
    url = Column(String)
    difficulty = Column(String) # Beginner, Intermediate, Advanced
    estimated_duration = Column(Float) # In hours
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SkillGapAnalysis(Base):
    __tablename__ = "skill_gap_analysis"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    target_role = Column(String)
    overall_gap_percentage = Column(Float)
    missing_skills_json = Column(JSONType, default=[]) 
    recommended_resources_json = Column(JSONType, default={})
    action_plan_json = Column(JSONType, default=[])
    career_roadmap_json = Column(JSONType, default=[])
    career_readiness_score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="skill_gap_analyses")

class LearningProgress(Base):
    """To support future tracking without modifying existing models."""
    __tablename__ = "learning_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    resource_id = Column(Integer, ForeignKey("learning_resources.id"))
    status = Column(String, default="Not Started") # Not Started, In Progress, Completed
    progress_percentage = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", backref="learning_progresses")
    resource = relationship("LearningResource")
