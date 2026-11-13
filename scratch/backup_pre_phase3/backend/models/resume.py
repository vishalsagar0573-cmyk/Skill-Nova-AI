from sqlalchemy import Column, Integer, String, DateTime
from database import Base
import datetime
import sqlalchemy.types as types
import json

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

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    filename = Column(String, index=True)
    file_path = Column(String)
    file_type = Column(String)
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    parsed_data = Column(JSONType, nullable=True)
