import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False) # Admin, Traffic Police, City Authority

class Camera(Base):
    __tablename__ = "cameras"
    id = Column(Integer, primary_key=True, index=True)
    location = Column(String, nullable=False)
    stream_url = Column(String, nullable=False)
    status = Column(String, default="Active") # Active, Inactive, Maintenance

class TrafficData(Base):
    __tablename__ = "traffic_data"
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False)
    lane_id = Column(Integer, nullable=False)
    vehicle_count = Column(Integer, default=0, nullable=False)
    avg_speed = Column(Float, default=0.0)
    density = Column(Float, default=0.0) # 0 to 100 %
    status = Column(String, default="Low") # Low, Medium, High, Critical
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    camera = relationship("Camera")

class VehicleLog(Base):
    __tablename__ = "vehicle_logs"
    id = Column(Integer, primary_key=True, index=True)
    tracking_id = Column(Integer, nullable=False)
    class_name = Column(String, nullable=False) # Car, Bike, Truck, Ambulance, etc.
    speed = Column(Float, default=0.0)
    lane_id = Column(Integer)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class Signal(Base):
    __tablename__ = "signals"
    id = Column(Integer, primary_key=True, index=True)
    location = Column(String, nullable=False)
    current_state = Column(String, default="RED") # RED, YELLOW, GREEN
    green_time = Column(Integer, default=30)
    red_time = Column(Integer, default=30)
    is_adaptive = Column(Boolean, default=True)
    override_state = Column(String, nullable=True) # RED, YELLOW, GREEN or None

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, nullable=False) # Accident, Heavy Traffic, Road Block, Ambulance, High AQI, Crowd Overflow
    description = Column(Text)
    severity = Column(String, nullable=False) # Info, Warning, Critical
    status = Column(String, default="Active") # Active, Resolved
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class AQIData(Base):
    __tablename__ = "aqi_data"
    id = Column(Integer, primary_key=True, index=True)
    location = Column(String, nullable=False)
    aqi = Column(Integer, nullable=False)
    pm2_5 = Column(Float)
    pm10 = Column(Float)
    co = Column(Float)
    temperature = Column(Float)
    humidity = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class EmergencyEvent(Base):
    __tablename__ = "emergency_events"
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False)
    vehicle_type = Column(String, nullable=False) # Ambulance, Fire Truck, Police Vehicle
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    corridor_activated = Column(Boolean, default=True)

    camera = relationship("Camera")

class CrowdData(Base):
    __tablename__ = "crowd_data"
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False)
    people_count = Column(Integer, default=0, nullable=False)
    density_level = Column(Float, default=0.0)
    risk_level = Column(String, default="Safe") # Safe, Busy, Danger, Critical
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    camera = relationship("Camera")
