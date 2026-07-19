-- SQL Database Schema for TrafficEye
-- Compatible with PostgreSQL and SQLite

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL -- Admin, Traffic Police, City Authority
);

-- 2. Cameras Table
CREATE TABLE IF NOT EXISTS cameras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location VARCHAR(255) NOT NULL,
    stream_url VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active' -- Active, Inactive, Maintenance
);

-- 3. Traffic Data Table (Aggregates per lane)
CREATE TABLE IF NOT EXISTS traffic_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camera_id INTEGER NOT NULL,
    lane_id INTEGER NOT NULL,
    vehicle_count INTEGER NOT NULL DEFAULT 0,
    avg_speed REAL DEFAULT 0.0,
    density REAL DEFAULT 0.0, -- Percentage (0 - 100)
    status VARCHAR(50) DEFAULT 'Low', -- Low, Medium, High, Critical
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(camera_id) REFERENCES cameras(id) ON DELETE CASCADE
);

-- 4. Vehicle Logs Table (Individual tracking logs)
CREATE TABLE IF NOT EXISTS vehicle_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracking_id INTEGER NOT NULL,
    class_name VARCHAR(50) NOT NULL, -- Car, Bike, Truck, Ambulance, etc.
    speed REAL DEFAULT 0.0,
    lane_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Signals Table (Traffic lights control status)
CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location VARCHAR(255) NOT NULL,
    current_state VARCHAR(50) DEFAULT 'RED', -- RED, YELLOW, GREEN
    green_time INTEGER DEFAULT 30,
    red_time INTEGER DEFAULT 30,
    is_adaptive INTEGER DEFAULT 1, -- BOOLEAN (1 = True, 0 = False)
    override_state VARCHAR(50) DEFAULT NULL -- RED, YELLOW, GREEN or NULL
);

-- 6. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type VARCHAR(100) NOT NULL, -- Accident, Heavy Traffic, Road Block, Ambulance, High AQI, Crowd Overflow
    description TEXT,
    severity VARCHAR(50) NOT NULL, -- Info, Warning, Critical
    status VARCHAR(50) DEFAULT 'Active', -- Active, Resolved
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. AQI Data Table (Air Quality logs)
CREATE TABLE IF NOT EXISTS aqi_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location VARCHAR(255) NOT NULL,
    aqi INTEGER NOT NULL,
    pm2_5 REAL,
    pm10 REAL,
    co REAL,
    temperature REAL,
    humidity REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Emergency Events Table (Green corridor tracking)
CREATE TABLE IF NOT EXISTS emergency_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camera_id INTEGER NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL, -- Ambulance, Fire Truck, Police Vehicle
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    corridor_activated INTEGER DEFAULT 1, -- BOOLEAN
    FOREIGN KEY(camera_id) REFERENCES cameras(id) ON DELETE CASCADE
);

-- 9. Crowd Data Table
CREATE TABLE IF NOT EXISTS crowd_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camera_id INTEGER NOT NULL,
    people_count INTEGER NOT NULL DEFAULT 0,
    density_level REAL DEFAULT 0.0,
    risk_level VARCHAR(50) DEFAULT 'Safe', -- Safe, Busy, Danger, Critical
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(camera_id) REFERENCES cameras(id) ON DELETE CASCADE
);

-- Insert Default Cameras
INSERT INTO cameras (location, stream_url, status) VALUES 
('Gandhipuram Junction, Coimbatore', 'gandhipuram_junction.mp4', 'Active'),
('Hope College Circle, Coimbatore', 'hope_college.mp4', 'Active'),
('Avinashi Road Crossing, Coimbatore', 'avinashi_road.mp4', 'Active'),
('Ukkadam Bus Stand, Coimbatore', 'ukkadam_stand.mp4', 'Active');

-- Insert Default Signals
INSERT INTO signals (location, current_state, green_time, red_time, is_adaptive, override_state) VALUES
('Gandhipuram Junction', 'RED', 30, 30, 1, NULL),
('Hope College Circle', 'GREEN', 40, 20, 1, NULL),
('Avinashi Road Crossing', 'RED', 30, 35, 1, NULL),
('Ukkadam Bus Stand', 'RED', 25, 30, 1, NULL);
