import datetime
from typing import Optional, List
from pydantic import BaseModel

# User Schemas
class UserCreate(BaseModel):
    username: str
    password: str
    role: str # Admin, Traffic Police, City Authority

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    role: str
    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# Camera Schemas
class CameraCreate(BaseModel):
    location: str
    stream_url: str
    status: Optional[str] = "Active"

class CameraOut(BaseModel):
    id: int
    location: str
    stream_url: str
    status: str
    class Config:
        from_attributes = True

# Traffic Data Schemas
class TrafficDataCreate(BaseModel):
    camera_id: int
    lane_id: int
    vehicle_count: int
    avg_speed: Optional[float] = 0.0
    density: Optional[float] = 0.0
    status: Optional[str] = "Low"

class TrafficDataOut(BaseModel):
    id: int
    camera_id: int
    lane_id: int
    vehicle_count: int
    avg_speed: float
    density: float
    status: str
    timestamp: datetime.datetime
    class Config:
        from_attributes = True

# Vehicle Log Schemas
class VehicleLogCreate(BaseModel):
    tracking_id: int
    class_name: str
    speed: Optional[float] = 0.0
    lane_id: Optional[int] = None

class VehicleLogOut(BaseModel):
    id: int
    tracking_id: int
    class_name: str
    speed: float
    lane_id: Optional[int]
    timestamp: datetime.datetime
    class Config:
        from_attributes = True

# Signal Schemas
class SignalCreate(BaseModel):
    location: str
    current_state: Optional[str] = "RED"
    green_time: Optional[int] = 30
    red_time: Optional[int] = 30
    is_adaptive: Optional[bool] = True

class SignalOverride(BaseModel):
    override_state: Optional[str] = None # RED, YELLOW, GREEN or None to disable override
    green_time: Optional[int] = None

class SignalOut(BaseModel):
    id: int
    location: str
    current_state: str
    green_time: int
    red_time: int
    is_adaptive: bool
    override_state: Optional[str]
    class Config:
        from_attributes = True

# Alert Schemas
class AlertCreate(BaseModel):
    event_type: str
    description: Optional[str] = None
    severity: str # Info, Warning, Critical
    status: Optional[str] = "Active"

class AlertOut(BaseModel):
    id: int
    event_type: str
    description: Optional[str]
    severity: str
    status: str
    timestamp: datetime.datetime
    class Config:
        from_attributes = True

# AQI Schemas
class AQIDataCreate(BaseModel):
    location: str
    aqi: int
    pm2_5: Optional[float] = None
    pm10: Optional[float] = None
    co: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None

class AQIDataOut(BaseModel):
    id: int
    location: str
    aqi: int
    pm2_5: Optional[float]
    pm10: Optional[float]
    co: Optional[float]
    temperature: Optional[float]
    humidity: Optional[float]
    timestamp: datetime.datetime
    class Config:
        from_attributes = True

# Emergency Schemas
class EmergencyEventCreate(BaseModel):
    camera_id: int
    vehicle_type: str
    corridor_activated: Optional[bool] = True

class EmergencyEventOut(BaseModel):
    id: int
    camera_id: int
    vehicle_type: str
    timestamp: datetime.datetime
    corridor_activated: bool
    class Config:
        from_attributes = True

# Crowd Schemas
class CrowdDataCreate(BaseModel):
    camera_id: int
    people_count: int
    density_level: Optional[float] = 0.0
    risk_level: Optional[str] = "Safe"

class CrowdDataOut(BaseModel):
    id: int
    camera_id: int
    people_count: int
    density_level: float
    risk_level: str
    timestamp: datetime.datetime
    class Config:
        from_attributes = True
