# TrafficEye | AI-Powered Smart City Traffic Operations Room

TrafficEye is a production-ready, full-stack smart city congestion control system designed for the **Smart India Hackathon (SIH)**. The platform integrates real-time computer vision (YOLO + object tracking), event streaming (Kafka), adaptive signal control loops, air quality monitoring, and a premium futuristic dark-mode dashboard tailored for municipal control rooms.

---

## Key Features

1. **Multi-Role Authentication (JWT):** Separate operational scopes for **System Admins**, **Traffic Police**, and **City Authorities**.
2. **AI Telemetry & Bounding Boxes:** Real-time object detection (Cars, Bikes, Trucks, Buses, Ambulances) with unique tracking IDs.
3. **Adaptive AI Signals:** Dynamic signal cycle optimization using the density calculation formula:
   $$\text{Green Time} = \text{Base Time (15s)} + \text{Density Weight} + \text{Priority Weight}$$
4. **Emergency Green Corridor:** Immediate override forcing green lights across the route upon detecting ambulances or fire trucks, accompanied by flashing screen alarms and AudioContext synthesizer cues.
5. **Interactive Leaflet City GIS Map:** Dark-themed maps displaying cameras (color-coded by density), crowd hazards, and real-time ambulance routing.
6. **Eco-Monitoring (AQI):** Analytics correlation between traffic density, vehicle counts, and air quality index levels (PM2.5, PM10, CO).
7. **Exportable Analytics Reports:** Instantly export system telemetry to CSV spreadsheet databases, and generate clean government-formatted PDF summaries.
8. **Hybrid Runtime Architecture:** Support for two execution scopes:
   - **Production Docker Compose:** Postgres + Redis + Kafka + FastAPI + React Frontend + AI Pipeline container group.
   - **Lightweight Local Demo Mode:** SQLite + in-memory WebSockets + `uv` runner (requires zero database or messaging server configuration).

---

## AI Processing Pipeline Architecture

```
                       [ CCTV Video Stream / RTSP ]
                                     │
                                     ▼
                        [ YOLO Object Detection ]
                        (Car, Bike, Ambulance, etc.)
                                     │
                                     ▼
                         [ Centroid/IoU Tracker ]
                           (DeepSORT Equivalent)
                                     │
                                     ▼
                       [ Polygon Lane Density & ]
                        [ Line Crossing Counting ]
                                     │
                                     ▼
                         [ HTTP Telemetry Publish ]
                                     │
                                     ▼
                   ┌─────────────────┴─────────────────┐
                   ▼                                   ▼
          [ Kafka Broker / Queue ]          [ FastAPI WebSocket Hub ]
                   │                                   │
                   ▼                                   ▼
         [ Database Logs Write ]              [ Live Dashboard UI ]
```

---

## Installation & Setup Instructions

### Prerequisites
- Install **Node.js** (v18+)
- Install **Python** (v3.10+)
- Install **Docker & Docker Compose** (Only required for production Kafka/Postgres setup)

---

### Option A: Quick Local Demo (Recommended for Hackathon Judges)
This mode runs the entire system locally using a single lightweight SQLite file, in-memory WebSockets, and standard python threads. No Docker or Kafka setup is needed.

1. **Install `uv` python package manager:**
   * **Windows (PowerShell):**
     ```powershell
     powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
     ```
   * **Linux/macOS:**
     ```bash
     curl -LsSf https://astral.sh/uv/install.sh | sh
     ```

2. **Boot the Backend Server:**
   Navigate to the backend directory and launch FastAPI:
   ```bash
   cd backend
   # Boot using uv to automatically pull dependencies
   uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *The SQLite database (`trafficeye.db`) will auto-initialize, and seed an Admin user: `admin` / `admin123`.*

3. **Start the AI Processing Pipeline:**
   Navigate to the AI directory and start the simulator stream:
   ```bash
   cd ai
   # Generate synthetic video assets
   uv run generate_sample.py
   # Run AI processor
   uv run python -m processor
   ```
   *The processor will spin up a local MJPEG server at `http://localhost:8001/video_feed` and start posting telemetry to the backend.*

4. **Launch the Web Portal UI:**
   Navigate to the frontend directory, install dependencies, and run:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Open browser to `http://localhost:3000` to interact with the operational console.*

---

### Option B: Production Docker Deployment (PostgreSQL + Kafka)
To launch the complete enterprise architecture:
1. Make sure Docker is running on your machine.
2. In the root directory, run:
   ```bash
   docker-compose up --build
   ```
3. Open `http://localhost:3000` to access the dashboard.
4. Open `http://localhost:8000/docs` to view the interactive FastAPI Swagger REST documentation.

---

## Evaluation Quick-Fill Profiles

For quick grading and presentations, click on the **Quick-Fill buttons** on the login screen to automatically log in:
- **System Admin:** `admin` / `admin123` (Full system configurations, camera/signal registry)
- **Traffic Police:** `police_officer` / `admin123` (Can control overrides, review alarms)
- **City Authority:** `city_authority` / `admin123` (Read-only maps, ecological data, reports)

---

## Technical REST API Endpoints

- `POST /api/auth/register` - Create new system users.
- `POST /api/auth/login` - Authenticate users, returns JWT.
- `GET /api/cameras` - Fetch all deployed cameras.
- `GET /api/traffic` - Fetch aggregate vehicle flow counts.
- `POST /api/signals/{id}/override` - Trigger manual override state on traffic light.
- `POST /api/emergency` - Activate Emergency corridor override route.
- `GET /api/reports/download` - Download CSV databases and summaries.
