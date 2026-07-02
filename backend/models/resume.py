from sqlalchemy import Column, Integer, String, DateTime
from database import Base
import datetime

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    filename = Column(String, index=True)
    file_path = Column(String)
    file_type = Column(String)
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
