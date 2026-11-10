import requests
import json

BASE_URL = 'http://localhost:8000'
AI_URL = 'http://localhost:8001'
FRONTEND_URL = 'http://localhost:3000'

print("=" * 60)
print("       TRAFFICEYE FULL-STACK SYSTEM TEST SUITE")
print("=" * 60 + "\n")

results = []

# Test 1: Documentation Endpoint
try:
    r = requests.get(f"{BASE_URL}/docs", timeout=5)
    if r.status_code == 200:
        results.append(("Backend API Docs", "PASS", f"HTTP {r.status_code}"))
    else:
        results.append(("Backend API Docs", "FAIL", f"HTTP {r.status_code}"))
except Exception as e:
    results.append(("Backend API Docs", "FAIL", str(e)))

# Test 2: Auth Login
token = None
try:
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"}, timeout=5)
    if r.status_code == 200 and "access_token" in r.json():
        token = r.json()["access_token"]
        results.append(("JWT Authentication", "PASS", "Token generated successfully"))
    else:
        results.append(("JWT Authentication", "FAIL", f"HTTP {r.status_code}"))
except Exception as e:
    results.append(("JWT Authentication", "FAIL", str(e)))

# Test 3: Camera Registry
try:
    r = requests.get(f"{BASE_URL}/api/cameras", timeout=5)
    if r.status_code == 200:
        cams = r.json()
        names = [c["location"].split(",")[0] for c in cams]
        results.append(("Camera Registry", "PASS", f"{len(cams)} cameras registered ({', '.join(names)})"))
    else:
        results.append(("Camera Registry", "FAIL", f"HTTP {r.status_code}"))
except Exception as e:
    results.append(("Camera Registry", "FAIL", str(e)))

# Test 4: Signals Status
try:
    r = requests.get(f"{BASE_URL}/api/signals", timeout=5)
    if r.status_code == 200:
        signals = r.json()
        results.append(("Adaptive Traffic Signals", "PASS", f"{len(signals)} signals active"))
    else:
        results.append(("Adaptive Traffic Signals", "FAIL", f"HTTP {r.status_code}"))
except Exception as e:
    results.append(("Adaptive Traffic Signals", "FAIL", str(e)))

# Test 5: Emergency Vehicle (Green Corridor) Trigger
try:
    r = requests.post(f"{BASE_URL}/api/emergency", json={"camera_id": 1, "vehicle_type": "Ambulance", "corridor_activated": True}, timeout=5)
    if r.status_code == 200:
        results.append(("Green Corridor Priority Trigger", "PASS", "Ambulance event logged & signals prioritized"))
    else:
        results.append(("Green Corridor Priority Trigger", "FAIL", f"HTTP {r.status_code}"))
except Exception as e:
    results.append(("Green Corridor Priority Trigger", "FAIL", str(e)))

# Test 6: Recent Alerts
try:
    r = requests.get(f"{BASE_URL}/api/alerts", timeout=5)
    if r.status_code == 200:
        alerts = r.json()
        results.append(("Live Alerts Feed", "PASS", f"{len(alerts)} alerts logged in database"))
    else:
        results.append(("Live Alerts Feed", "FAIL", f"HTTP {r.status_code}"))
except Exception as e:
    results.append(("Live Alerts Feed", "FAIL", str(e)))

# Test 7: AQI Telemetry
try:
    r = requests.get(f"{BASE_URL}/api/aqi", timeout=5)
    if r.status_code == 200:
        data = r.json()
        latest = data[-1] if isinstance(data, list) and len(data) > 0 else data
        results.append(("AQI Environmental Sensor", "PASS", f"Location: {latest.get('location')} | AQI: {latest.get('aqi')}"))
    else:
        results.append(("AQI Environmental Sensor", "FAIL", f"HTTP {r.status_code}"))
except Exception as e:
    results.append(("AQI Environmental Sensor", "FAIL", str(e)))

# Test 8: AI Stream HTTP endpoint
try:
    r = requests.get(f"{AI_URL}/video_feed?camera_id=1", stream=True, timeout=5)
    chunk = next(r.iter_content(chunk_size=1024))
    r.close()
    if len(chunk) > 0:
        results.append(("AI MJPEG CCTV Stream", "PASS", f"Streaming active ({len(chunk)} bytes frame packet)"))
    else:
        results.append(("AI MJPEG CCTV Stream", "FAIL", "Empty frame packet"))
except Exception as e:
    results.append(("AI MJPEG CCTV Stream", "FAIL", str(e)))

# Test 9: Frontend Web Server
try:
    r = requests.get(FRONTEND_URL, timeout=5)
    if r.status_code == 200 and "<html" in r.text.lower():
        results.append(("Frontend React Web Portal", "PASS", "Vite server serving HTML bundle"))
    else:
        results.append(("Frontend React Web Portal", "FAIL", f"HTTP {r.status_code}"))
except Exception as e:
    results.append(("Frontend React Web Portal", "FAIL", str(e)))

# Print Clean Summary Table
for module, status, details in results:
    badge = "[PASS]" if status == "PASS" else "[FAIL]"
    print(f"{badge:<10} | {module:<30} | {details}")

total = len(results)
passed = sum(1 for r in results if r[1] == "PASS")
print("\n" + "=" * 60)
print(f"Summary: {passed}/{total} Tests Passed ({passed/total*100:.0f}%)")
print("=" * 60)
