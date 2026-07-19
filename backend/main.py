import os
import json
import logging
import asyncio
from typing import List, Dict, Optional
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import datetime

from . import database, models, schemas, auth, config, kafka_stream

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TrafficEyeBackend")

# Initialize database tables
models.Base.metadata.create_all(bind=database.engine)

# Seed database with default admin user if not present
def seed_admin():
    db = database.SessionLocal()
    try:
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            hashed_pw = auth.get_password_hash("admin123")
            admin_user = models.User(username="admin", password_hash=hashed_pw, role="Admin")
            db.add(admin_user)
            db.commit()
            
        # Seed default cameras and signals if database is empty or has old seeds
        has_old_seeds = db.query(models.Camera).filter(models.Camera.location.like("%Connaught Place%")).count() > 0
        if db.query(models.Camera).count() == 0 or has_old_seeds:
            if has_old_seeds:
                db.query(models.Camera).delete()
                db.query(models.Signal).delete()
                db.commit()
                
            cameras = [
                models.Camera(location="Gandhipuram Junction, Coimbatore", stream_url="gandhipuram_junction.mp4", status="Active"),
                models.Camera(location="Hope College Circle, Coimbatore", stream_url="hope_college.mp4", status="Active"),
                models.Camera(location="Avinashi Road Crossing, Coimbatore", stream_url="avinashi_road.mp4", status="Active"),
                models.Camera(location="Ukkadam Bus Stand, Coimbatore", stream_url="ukkadam_stand.mp4", status="Active")
            ]
            db.add_all(cameras)
            db.commit()
            
            signals = [
                models.Signal(location="Gandhipuram Junction", current_state="RED", green_time=30, red_time=30, is_adaptive=True),
                models.Signal(location="Hope College Circle", current_state="GREEN", green_time=40, red_time=20, is_adaptive=True),
                models.Signal(location="Avinashi Road Crossing", current_state="RED", green_time=30, red_time=35, is_adaptive=True),
                models.Signal(location="Ukkadam Bus Stand", current_state="RED", green_time=25, red_time=30, is_adaptive=True)
            ]
            db.add_all(signals)
            db.commit()
            logger.info("Database successfully seeded with default Coimbatore cameras and signals.")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
    finally:
        db.close()

seed_admin()

app = FastAPI(
    title="TrafficEye API",
    description="Government Smart City Traffic Management Dashboard API Platform",
    version="1.0.0"
)

# CORS middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: dict):
        payload = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                # Connection might be dead
                pass

manager = ConnectionManager()

# Background task to route events from KafkaStreamManager to WebSockets
async def stream_broadcaster(topic: str, value: dict):
    # Broadcast to all connected clients
    await manager.broadcast({
        "topic": topic,
        "payload": value,
        "timestamp": datetime.datetime.utcnow().isoformat()
    })

@app.on_event("startup")
async def startup_event():
    # Register the main running loop for thread-safe websocket broadcasts
    kafka_stream.KafkaStreamManager.loop = asyncio.get_running_loop()
    
    # Start consuming Kafka streams and piping to WebSockets
    topics = ["traffic", "crowd", "aqi", "ambulance", "alerts"]
    await kafka_stream.KafkaStreamManager.start_consumer(topics, stream_broadcaster)

# ----------------- REST ENDPOINTS -----------------

# 1. AUTHENTICATION
@app.post("/api/auth/register", response_model=schemas.UserOut, tags=["Auth"])
def register(user_in: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_pw = auth.get_password_hash(user_in.password)
    user = models.User(username=user_in.username, password_hash=hashed_pw, role=user_in.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@app.post("/api/auth/login", tags=["Auth"])
def login(user_in: schemas.UserLogin, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if not user or not auth.verify_password(user_in.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = auth.create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "username": user.username}

# 2. CAMERAS
@app.get("/api/cameras", response_model=List[schemas.CameraOut], tags=["Cameras"])
def get_cameras(db: Session = Depends(database.get_db)):
    return db.query(models.Camera).all()

@app.post("/api/cameras", response_model=schemas.CameraOut, tags=["Cameras"])
def create_camera(
    camera_in: schemas.CameraCreate,
    current_user: models.User = Depends(auth.require_role(["Admin"])),
    db: Session = Depends(database.get_db)
):
    camera = models.Camera(**camera_in.dict())
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera

# 3. TRAFFIC TELEMETRY
@app.get("/api/traffic", response_model=List[schemas.TrafficDataOut], tags=["Traffic"])
def get_traffic_data(limit: int = 50, db: Session = Depends(database.get_db)):
    return db.query(models.TrafficData).order_by(models.TrafficData.timestamp.desc()).limit(limit).all()

@app.post("/api/traffic", response_model=schemas.TrafficDataOut, tags=["Traffic"])
def submit_traffic_data(data_in: schemas.TrafficDataCreate, db: Session = Depends(database.get_db)):
    # Create DB entry
    db_data = models.TrafficData(**data_in.dict())
    db.add(db_data)
    db.commit()
    db.refresh(db_data)
    
    # Publish to Kafka streaming topic
    kafka_stream.KafkaStreamManager.publish_event("traffic", {
        "id": db_data.id,
        "camera_id": db_data.camera_id,
        "lane_id": db_data.lane_id,
        "vehicle_count": db_data.vehicle_count,
        "avg_speed": db_data.avg_speed,
        "density": db_data.density,
        "status": db_data.status
    })

    # Trigger Adaptive signal recommendation calculation based on density
    update_adaptive_signals(db_data.camera_id, db)
    
    return db_data

# Adaptive Signal Logic: Calculate timings based on lane-wise density
def update_adaptive_signals(camera_id: int, db: Session):
    # Find camera location to match signal
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        return
    
    # Find matching signal name (e.g. Connaught Place Junction)
    signal_name = camera.location.split(",")[0].strip()
    signal = db.query(models.Signal).filter(models.Signal.location.like(f"%{signal_name}%")).first()
    if not signal or not signal.is_adaptive or signal.override_state is not None:
        return

    # Fetch latest lane densities for this camera
    latest_lanes = db.query(models.TrafficData).filter(models.TrafficData.camera_id == camera_id).order_by(models.TrafficData.timestamp.desc()).limit(4).all()
    if not latest_lanes:
        return
        
    avg_density = sum(lane.density for lane in latest_lanes) / len(latest_lanes)
    vehicle_count = sum(lane.vehicle_count for lane in latest_lanes)

    # Adaptive Timing Formula: Green Time = Base Time + Density Weight
    base_time = 15
    density_weight = min(45, int((avg_density / 100.0) * 30))
    green_recommendation = base_time + density_weight

    # Determine state (simulate cycling)
    current_state = signal.current_state
    if avg_density > 75:
        # Heavily congested: adjust times
        signal.green_time = green_recommendation
        signal.red_time = max(15, 60 - green_recommendation)
        db.commit()
        
        # Publish Signal Update
        kafka_stream.KafkaStreamManager.publish_event("alerts", {
            "event_type": "Heavy Traffic",
            "description": f"Adaptive timing activated at {signal.location}. Green extended to {green_recommendation}s.",
            "severity": "Warning"
        })

# 4. VEHICLE TRACKING LOGS
@app.get("/api/vehicle-logs", response_model=List[schemas.VehicleLogOut], tags=["Tracking"])
def get_vehicle_logs(limit: int = 100, db: Session = Depends(database.get_db)):
    return db.query(models.VehicleLog).order_by(models.VehicleLog.timestamp.desc()).limit(limit).all()

@app.post("/api/vehicle-logs", response_model=schemas.VehicleLogOut, tags=["Tracking"])
def log_tracked_vehicle(vehicle_in: schemas.VehicleLogCreate, db: Session = Depends(database.get_db)):
    vehicle = models.VehicleLog(**vehicle_in.dict())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle

# 5. SIGNALS & ADAPTIVE CONTROL
@app.get("/api/signals", response_model=List[schemas.SignalOut], tags=["Signals"])
def get_signals(db: Session = Depends(database.get_db)):
    return db.query(models.Signal).all()

@app.post("/api/signals/{id}/override", response_model=schemas.SignalOut, tags=["Signals"])
def override_signal(
    id: int, 
    override: schemas.SignalOverride, 
    current_user: models.User = Depends(auth.require_role(["Admin", "Traffic Police"])),
    db: Session = Depends(database.get_db)
):
    signal = db.query(models.Signal).filter(models.Signal.id == id).first()
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
        
    signal.override_state = override.override_state
    if override.override_state:
        signal.current_state = override.override_state
        signal.is_adaptive = False
        if override.green_time:
            signal.green_time = override.green_time
    else:
        # Remove override
        signal.is_adaptive = True
        
    db.commit()
    db.refresh(signal)

    # Publish Signal status change event
    kafka_stream.KafkaStreamManager.publish_event("traffic", {
        "event": "signal_override",
        "signal_id": signal.id,
        "location": signal.location,
        "current_state": signal.current_state,
        "override_state": signal.override_state,
        "is_adaptive": signal.is_adaptive
    })

    return signal

# 6. EMERGENCY VEHICLES & GREEN CORRIDOR
@app.get("/api/emergency", response_model=List[schemas.EmergencyEventOut], tags=["Emergency"])
def get_emergency_events(limit: int = 50, db: Session = Depends(database.get_db)):
    return db.query(models.EmergencyEvent).order_by(models.EmergencyEvent.timestamp.desc()).limit(limit).all()

@app.post("/api/emergency", response_model=schemas.EmergencyEventOut, tags=["Emergency"])
def trigger_emergency_corridor(event_in: schemas.EmergencyEventCreate, db: Session = Depends(database.get_db)):
    # 1. Save Emergency event log
    event = models.EmergencyEvent(**event_in.dict())
    db.add(event)
    db.commit()
    db.refresh(event)

    # 2. Get camera location
    camera = db.query(models.Camera).filter(models.Camera.id == event_in.camera_id).first()
    if camera:
        signal_name = camera.location.split(",")[0].strip()
        
        # Force all matching/nearby signals to GREEN
        signals = db.query(models.Signal).filter(models.Signal.location.like(f"%{signal_name}%")).all()
        for sig in signals:
            sig.current_state = "GREEN"
            sig.green_time = 90  # Grant extra green time
            sig.override_state = "GREEN"
            sig.is_adaptive = False
        db.commit()

        # Log corridor alert
        alert = models.Alert(
            event_type="Ambulance",
            description=f"EMERGENCY GREEN CORRIDOR activated at {camera.location} for {event_in.vehicle_type}.",
            severity="Critical",
            status="Active"
        )
        db.add(alert)
        db.commit()

        # Publish Corridor and Alert to Kafka
        kafka_stream.KafkaStreamManager.publish_event("ambulance", {
            "event_id": event.id,
            "camera_id": event.camera_id,
            "location": camera.location,
            "vehicle_type": event.vehicle_type,
            "timestamp": event.timestamp.isoformat()
        })
        kafka_stream.KafkaStreamManager.publish_event("alerts", {
            "event_type": "Ambulance",
            "description": f"Green Corridor active at {camera.location}.",
            "severity": "Critical"
        })

    return event

# 7. CROWD DATA
@app.get("/api/crowd", response_model=List[schemas.CrowdDataOut], tags=["Crowd"])
def get_crowd_data(limit: int = 50, db: Session = Depends(database.get_db)):
    return db.query(models.CrowdData).order_by(models.CrowdData.timestamp.desc()).limit(limit).all()

@app.post("/api/crowd", response_model=schemas.CrowdDataOut, tags=["Crowd"])
def submit_crowd_data(crowd_in: schemas.CrowdDataCreate, db: Session = Depends(database.get_db)):
    db_crowd = models.CrowdData(**crowd_in.dict())
    db.add(db_crowd)
    db.commit()
    db.refresh(db_crowd)

    # Publish to Kafka
    kafka_stream.KafkaStreamManager.publish_event("crowd", {
        "id": db_crowd.id,
        "camera_id": db_crowd.camera_id,
        "people_count": db_crowd.people_count,
        "density_level": db_crowd.density_level,
        "risk_level": db_crowd.risk_level
    })

    # If Crowd risk is High/Critical, trigger an alert
    if db_crowd.risk_level in ("Danger", "Critical"):
        camera = db.query(models.Camera).filter(models.Camera.id == db_crowd.camera_id).first()
        loc = camera.location if camera else f"Camera #{db_crowd.camera_id}"
        alert = models.Alert(
            event_type="Crowd Overflow",
            description=f"Critical crowd detected: {db_crowd.people_count} people counted at {loc}.",
            severity="Critical",
            status="Active"
        )
        db.add(alert)
        db.commit()

        kafka_stream.KafkaStreamManager.publish_event("alerts", {
            "event_type": "Crowd Overflow",
            "description": f"Crowd alert at {loc}.",
            "severity": "Critical"
        })

    return db_crowd

# 8. AIR QUALITY INDEX (AQI)
@app.get("/api/aqi", response_model=List[schemas.AQIDataOut], tags=["AQI"])
def get_aqi_data(limit: int = 50, db: Session = Depends(database.get_db)):
    return db.query(models.AQIData).order_by(models.AQIData.timestamp.desc()).limit(limit).all()

@app.post("/api/aqi", response_model=schemas.AQIDataOut, tags=["AQI"])
def submit_aqi_data(aqi_in: schemas.AQIDataCreate, db: Session = Depends(database.get_db)):
    db_aqi = models.AQIData(**aqi_in.dict())
    db.add(db_aqi)
    db.commit()
    db.refresh(db_aqi)

    # Publish to Kafka
    kafka_stream.KafkaStreamManager.publish_event("aqi", {
        "id": db_aqi.id,
        "location": db_aqi.location,
        "aqi": db_aqi.aqi,
        "pm2_5": db_aqi.pm2_5,
        "pm10": db_aqi.pm10,
        "co": db_aqi.co
    })

    # Alert if AQI is dangerously high
    if db_aqi.aqi > 250:
        alert = models.Alert(
            event_type="High AQI",
            description=f"Hazardous Air Quality detected at {db_aqi.location}. AQI: {db_aqi.aqi}.",
            severity="Warning",
            status="Active"
        )
        db.add(alert)
        db.commit()

        kafka_stream.KafkaStreamManager.publish_event("alerts", {
            "event_type": "High AQI",
            "description": f"High AQI alert ({db_aqi.aqi}) at {db_aqi.location}.",
            "severity": "Warning"
        })

    return db_aqi

# 9. ALERTS LOGS
@app.get("/api/alerts", response_model=List[schemas.AlertOut], tags=["Alerts"])
def get_alerts(status: str = "Active", db: Session = Depends(database.get_db)):
    return db.query(models.Alert).filter(models.Alert.status == status).order_by(models.Alert.timestamp.desc()).all()

# Trigger custom alert post
@app.post("/api/alerts", response_model=schemas.AlertOut, tags=["Alerts"])
def post_alert(alert_in: schemas.AlertCreate, db: Session = Depends(database.get_db)):
    alert = models.Alert(**alert_in.dict())
    db.add(alert)
    db.commit()
    db.refresh(alert)
    
    kafka_stream.KafkaStreamManager.publish_event("alerts", {
        "id": alert.id,
        "event_type": alert.event_type,
        "description": alert.description,
        "severity": alert.severity,
        "status": alert.status
    })
    return alert

# 10. ANALYTICS & REPORTS DOWNLOADS
@app.get("/api/reports/download", tags=["Reports"])
def download_reports(format: str = Query("csv", pattern="^(csv|json)$"), db: Session = Depends(database.get_db)):
    traffic_logs = db.query(models.TrafficData).order_by(models.TrafficData.timestamp.desc()).limit(100).all()
    
    if format == "json":
        report_data = []
        for log in traffic_logs:
            report_data.append({
                "id": log.id,
                "lane_id": log.lane_id,
                "vehicle_count": log.vehicle_count,
                "avg_speed": log.avg_speed,
                "density": log.density,
                "status": log.status,
                "timestamp": log.timestamp.isoformat()
            })
        return report_data
    
    # Export CSV format
    import io
    import csv
    from fastapi.responses import StreamingResponse

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Camera ID", "Lane ID", "Vehicle Count", "Avg Speed (km/h)", "Density (%)", "Congestion Status", "Timestamp"])
    
    for log in traffic_logs:
        writer.writerow([
            log.id, 
            log.camera_id, 
            log.lane_id, 
            log.vehicle_count, 
            log.avg_speed, 
            log.density, 
            log.status, 
            log.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        ])
    
    output.seek(0)
    response = StreamingResponse(output, media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=traffic_analytics_report.csv"
    return response

# 11. WEBSOCKET ENDPOINT
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep-alive loop, handle messages from client if any
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                # Handle client-triggered events, e.g. custom triggers
                if msg.get("action") == "ping":
                    await websocket.send_text(json.dumps({"event": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
