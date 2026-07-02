from sqlalchemy import Column, Integer, String, Text
from database import Base

class JobRole(Base):
    __tablename__ = "job_roles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, unique=True, index=True)
    required_skills = Column(String) # Comma separated list of skills
    description = Column(Text, nullable=True)
