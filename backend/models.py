from sqlalchemy import Column, Integer, Float, DateTime
from datetime import datetime

from database import Base

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)

    temperature = Column(Float)
    humidity = Column(Float)
    soil_moisture = Column(Float)
    pressure = Column(Float)

    created_at = Column(DateTime, default=datetime.utcnow)
