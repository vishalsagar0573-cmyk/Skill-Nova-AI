from sqlalchemy import Column, Integer, String
from database import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    skill_name = Column(String, index=True) # Normalized to lowercase
    course_name = Column(String)
    platform = Column(String)
    difficulty_level = Column(String)
    course_link = Column(String)
