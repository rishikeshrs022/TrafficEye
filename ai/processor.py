import time
import cv2
import json
import logging
import threading
import requests
import numpy as np
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse
from .detector import YOLOVehicleDetector
from .tracker import IoUTracker
from .lane_density import LaneDensityEstimator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AIProcessor")

BACKEND_URL = "http://localhost:8000"
MJPEG_PORT = 8001

# Shared frame buffers for all 4 cameras
output_frames = {1: None, 2: None, 3: None, 4: None}
frame_lock = threading.Lock()

class MJPEGStreamHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global output_frames
        
        # Parse query parameters (e.g. ?camera_id=1)
        parsed_path = urllib.parse.urlparse(self.path)
        
        if parsed_path.path == "/video_feed":
            query_params = urllib.parse.parse_qs(parsed_path.query)
            camera_id = int(query_params.get("camera_id", [1])[0])
            
            self.send_response(200)
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
            self.end_headers()
            
            logger.info(f"New client connected to MJPEG CCTV video feed for camera {camera_id}.")
            try:
                while True:
                    with frame_lock:
                        frame = output_frames.get(camera_id)
                        if frame is None:
                            encoded_image = None
                        else:
                            _, encoded_image = cv2.imencode(".jpg", frame)
                    
                    if encoded_image is not None:
                        self.wfile.write(b"--frame\r\n")
                        self.wfile.write(b"Content-Type: image/jpeg\r\n\r\n")
                        self.wfile.write(encoded_image.tobytes())
                        self.wfile.write(b"\r\n")
                    
                    time.sleep(0.06)  # ~15 FPS
            except Exception as e:
                logger.info(f"MJPEG client disconnected: {e}")
        else:
            self.send_response(404)
            self.end_headers()

def start_mjpeg_server():
    server = HTTPServer(("0.0.0.0", MJPEG_PORT), MJPEGStreamHandler)
    logger.info(f"MJPEG CCTV Stream Server listening on http://localhost:{MJPEG_PORT}/video_feed")
    server.serve_forever()

class AIStreamProcessor:
    def __init__(self, source_path=None, use_yolo=False):
        self.source_path = source_path
        self.detector = YOLOVehicleDetector(use_mock=not use_yolo)
        
        # Isolated trackers and lane density estimators for all 4 cameras
        self.trackers = {1: IoUTracker(), 2: IoUTracker(), 3: IoUTracker(), 4: IoUTracker()}
        self.lane_estimators = {
            1: LaneDensityEstimator(640, 480),
            2: LaneDensityEstimator(640, 480),
            3: LaneDensityEstimator(640, 480),
            4: LaneDensityEstimator(640, 480)
        }
        self.frame_count = 0
        self.last_api_send_times = {1: 0, 2: 0, 3: 0, 4: 0}

    def start_pipeline(self):
        global output_frames
        
        # Start MJPEG Stream Server in background
        mjpeg_thread = threading.Thread(target=start_mjpeg_server, daemon=True)
        mjpeg_thread.start()

        # Capture video source
        cap = None
        if self.source_path:
            cap = cv2.VideoCapture(self.source_path)
            
        # Fallback if video capture fails: use synthetic frame generator
        if cap is None or not cap.isOpened():
            logger.warning("No video source provided or failed to open. Running synthetic canvas processor.")
            self._run_synthetic_loop()
            return

        logger.info(f"Successfully opened video file source: {self.source_path}")
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                # Loop the video for SIH demo continuously
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
                
            frame = cv2.resize(frame, (640, 480))
            
            # Process frames for all 4 cameras in parallel/sequence
            for cam_id in [1, 2, 3, 4]:
                processed_frame = self.process_frame(frame, camera_id=cam_id)
                with frame_lock:
                    output_frames[cam_id] = processed_frame
                
            self.frame_count += 1
            # Control frame rate for demo (~15 FPS)
            time.sleep(0.04)

        cap.release()

    def process_frame(self, frame, camera_id=1):
        # 1. Object Detection (Dynamic per camera ID)
        detections = self.detector.detect(frame, self.frame_count, camera_id)

        # 2. DeepSORT/IoU Tracking (Isolated per camera ID)
        tracker = self.trackers[camera_id]
        tracked_objects = tracker.update(detections)

        # 3. Lane Density & Crossing line updates (Isolated per camera ID)
        lane_estimator = self.lane_estimators[camera_id]
        lane_metrics, line_crossings = lane_estimator.update_lanes(tracked_objects)

        # 4. Draw Overlay Graphics
        overlay_frame = frame.copy()
        
        # Draw lanes boundaries and statuses
        for metric in lane_metrics:
            poly = lane_estimator.lanes[metric["lane_id"]]["polygon"]
            color = metric["color_rgb"]
            # Draw semi-transparent overlay
            cv2.polylines(overlay_frame, [poly], True, color, 2)
            # Add lane indicator text
            x_text = poly[0][0] + 10
            y_text = 40
            cv2.putText(overlay_frame, f"L{metric['lane_id']}: {metric['density']}%", (x_text, y_text), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Draw Virtual line crossing line
        cv2.line(overlay_frame, (0, lane_estimator.counting_line_y), 
                 (lane_estimator.w, lane_estimator.counting_line_y), (255, 0, 255), 2)
        cv2.putText(overlay_frame, f"Crossings: {line_crossings}", (20, lane_estimator.counting_line_y - 10), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 255), 2)

        # Draw tracked objects bounding boxes and tags
        emergency_detected = False
        emergency_type = ""
        crowd_count = 0
        
        for obj in tracked_objects:
            x1, y1, x2, y2 = obj["bbox"]
            cls_name = obj["class_name"]
            track_id = obj["track_id"]
            
            # Determine color by class
            if cls_name == "Ambulance":
                color = (0, 0, 255) # Red
                emergency_detected = True
                emergency_type = "Ambulance"
            elif cls_name == "person":
                color = (255, 100, 0) # Cyan/Blue
                crowd_count += 1
            else:
                color = (0, 255, 0) # Green

            # Draw rectangle
            cv2.rectangle(overlay_frame, (x1, y1), (x2, y2), color, 2)
            # Draw label tag e.g. "Car #14"
            tag = f"{cls_name} #{track_id}"
            cv2.putText(overlay_frame, tag, (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Emergency Corridor flashing alert
        if emergency_detected:
            cv2.rectangle(overlay_frame, (0,0), (640, 480), (0, 0, 255), 4)
            cv2.putText(overlay_frame, "EMERGENCY VEHICLE DETECTED - CORRIDOR ACTIVE", (60, 240), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 3)

        # Overlay camera identification title
        cam_names = {
            1: "GANDHIPURAM JUNCTION, COIMBATORE",
            2: "HOPE COLLEGE CIRCLE, COIMBATORE",
            3: "AVINASHI ROAD CROSSING, COIMBATORE",
            4: "UKKADAM BUS STAND, COIMBATORE"
        }
        cv2.putText(overlay_frame, cam_names.get(camera_id, "TRAFFICEYE CCTV MONITOR"), (10, 460), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

        # Send telemetry to Backend API periodically (every 2 seconds)
        curr_time = time.time()
        if curr_time - self.last_api_send_times.get(camera_id, 0) > 2.0:
            self.last_api_send_times[camera_id] = curr_time
            threading.Thread(target=self._send_telemetry, args=(camera_id, lane_metrics, emergency_detected, emergency_type, crowd_count), daemon=True).start()

        return overlay_frame

    def _run_synthetic_loop(self):
        """Generates mock frames dynamically if no video file is supplied."""
        global output_frames
        while True:
            for cam_id in [1, 2, 3, 4]:
                # Create dark background
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.rectangle(frame, (0, 0), (640, 480), (15, 23, 42), -1) # Dark gray base
                
                # Lanes division lines
                for i in range(1, 4):
                    x = i * 160
                    cv2.line(frame, (x, 0), (x, 480), (50, 70, 90), 1)

                processed_frame = self.process_frame(frame, camera_id=cam_id)
                with frame_lock:
                    output_frames[cam_id] = processed_frame
                
            self.frame_count += 1
            time.sleep(0.06)

    def _send_telemetry(self, camera_id, lane_metrics, emergency_detected, emergency_type, crowd_count):
        """Transmits traffic data and event updates to backend REST endpoint."""
        try:
            # 1. Send Lane Densities
            for m in lane_metrics:
                if m["lane_id"] == 4:
                    continue
                
                payload = {
                    "camera_id": camera_id,
                    "lane_id": m["lane_id"],
                    "vehicle_count": m["count"],
                    "avg_speed": float(40 - m["lane_id"]*5 + np.random.randint(-5, 5)),
                    "density": m["density"],
                    "status": m["status"]
                }
                requests.post(f"{BACKEND_URL}/api/traffic", json=payload, timeout=1)

            # 2. Send Emergency vehicle event trigger
            if emergency_detected:
                requests.post(f"{BACKEND_URL}/api/emergency", json={
                    "camera_id": camera_id,
                    "vehicle_type": emergency_type,
                    "corridor_activated": True
                }, timeout=1)

            # 3. Send Crowd data
            risk_level = "Safe"
            if crowd_count > 6:
                risk_level = "Critical"
            elif crowd_count > 4:
                risk_level = "Danger"
            elif crowd_count > 2:
                risk_level = "Busy"
                
            requests.post(f"{BACKEND_URL}/api/crowd", json={
                "camera_id": camera_id,
                "people_count": crowd_count,
                "density_level": float(crowd_count * 10),
                "risk_level": risk_level
            }, timeout=1)

            # 4. Generate random AQI updates for simulation
            cam_names = {
                1: "Gandhipuram Junction, Coimbatore",
                2: "Hope College Circle, Coimbatore",
                3: "Avinashi Road Crossing, Coimbatore",
                4: "Ukkadam Bus Stand, Coimbatore"
            }
            requests.post(f"{BACKEND_URL}/api/aqi", json={
                "location": cam_names.get(camera_id, "Coimbatore Junction"),
                "aqi": int(120 + np.sin(self.frame_count * 0.01 + camera_id) * 30 + np.random.randint(-10, 10)),
                "pm2_5": float(55 + np.random.randint(-5, 5)),
                "pm10": float(110 + np.random.randint(-10, 10)),
                "co": float(1.2 + np.random.random()),
                "temperature": 29.5,
                "humidity": 65.0
            }, timeout=1)

        except Exception as e:
            pass

if __name__ == "__main__":
    import sys
    source = sys.argv[1] if len(sys.argv) > 1 else None
    yolo = "--yolo" in sys.argv
    processor = AIStreamProcessor(source, use_yolo=yolo)
    processor.start_pipeline()
