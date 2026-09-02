from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from models.competency_profile import JSONType

class JobRole(Base):
    __tablename__ = "job_roles"

    id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)
    required_skills = Column(JSONType, default=[]) 
    preferred_skills = Column(JSONType, default=[])
    minimum_cgpa = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class JobCompatibility(Base):
    __tablename__ = "job_compatibility"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    best_role = Column(String)
    compatibility_score = Column(Float)
    matches = Column(JSONType, default=[])
    matched_skills = Column(JSONType, default=[])
    missing_skills = Column(JSONType, default=[])
    recommendation_reason = Column(JSONType, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", backref="job_compatibilities")
