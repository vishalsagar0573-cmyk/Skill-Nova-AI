from sqlalchemy import Column, Integer, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
import sqlalchemy.types as types
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import json

# Fallback for SQLite if not using PostgreSQL directly, but Prompt mentioned JSON
class JSONType(types.TypeDecorator):
    impl = types.Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return json.loads(value)
        return value

class CompetencyProfile(Base):
    __tablename__ = "competency_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    
    # Store the entire merged unified profile as JSON
    competency_json = Column(JSONType, default={})
    
    # ML Scoring fields - Nullable
    overall_competency_score = Column(Float, nullable=True)
    overall_score = Column(Float, nullable=True)
    frontend_score = Column(Float, nullable=True)
    backend_score = Column(Float, nullable=True)
    database_score = Column(Float, nullable=True)
    ai_ml_score = Column(Float, nullable=True)
    data_science_score = Column(Float, nullable=True)
    cloud_score = Column(Float, nullable=True)
    programming_score = Column(Float, nullable=True)
    soft_skill_score = Column(Float, nullable=True)
    
    score_explanations = Column(JSONType, default={})
    
    resume_uploaded = Column(Boolean, default=False)
    resume_parsed = Column(Boolean, default=False)
    profile_generated = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="competency_profile")
