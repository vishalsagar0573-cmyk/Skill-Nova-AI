from sqlalchemy import Column, Integer, String, Float, Text
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String)
    
class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True)
    skills = Column(String) # Comma separated
    cgpa = Column(Float)
    dsa_level = Column(String)
    projects = Column(Text)
    internships = Column(Text)
    certifications = Column(Text)
