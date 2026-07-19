import os
import cv2
import numpy as np

def generate_sample_video():
    output_dir = os.path.dirname(os.path.abspath(__file__)) + "/assets"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "sample_traffic.mp4")
    
    # 10 seconds of video at 15 FPS = 150 frames
    width, height = 640, 480
    fps = 15
    duration = 10
    total_frames = fps * duration
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    if not out.isOpened():
        print("Error: Could not open VideoWriter. OpenCV might not have MP4 codecs configured.")
        return False
        
    print(f"Generating synthetic traffic video at {output_path}...")
    
    for frame_idx in range(total_frames):
        # 1. Base Slate road color
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        frame[:] = (15, 23, 42) # slate-900 background
        
        # Draw road margins
        cv2.line(frame, (80, 0), (80, height), (71, 85, 105), 3) # left margin
        cv2.line(frame, (560, 0), (560, height), (71, 85, 105), 3) # right margin
        
        # Draw lane markers (dotted lines)
        for x in [200, 320, 440]:
            for y in range(0, height, 40):
                if (y + frame_idx * 5) % 80 < 40:
                    cv2.line(frame, (x, y), (x, y + 20), (148, 163, 184), 1)

        # 2. Draw Moving Mock Vehicles (boxes)
        
        # Vehicle 1: Standard Car (moves fast down Lane 1)
        # Position: Lane 1 (x: 80 to 200, center ~140)
        y1 = (frame_idx * 12) % height
        cv2.rectangle(frame, (110, y1), (170, y1 + 50), (16, 185, 129), -1) # Emerald Green Car
        cv2.putText(frame, "MOCK_CAR", (115, y1 + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

        # Vehicle 2: Bike (moves very fast down Lane 2)
        y2 = (frame_idx * 16 + 100) % height
        cv2.circle(frame, (260, y2), 15, (6, 182, 212), -1) # Cyan Bike
        cv2.putText(frame, "MOCK_BIKE", (230, y2 - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

        # Vehicle 3: Emergency Ambulance (moves down Lane 1 during frames 40 to 110)
        if 40 <= frame_idx <= 110:
            y3 = int((frame_idx - 40) * 8)
            # Red/Blue flashing lights effect
            color = (0, 0, 255) if frame_idx % 2 == 0 else (255, 0, 0)
            cv2.rectangle(frame, (110, y3), (170, y3 + 60), (255, 255, 255), -1) # White body
            cv2.rectangle(frame, (110, y3), (170, y3 + 12), color, -1) # Flashing light bar
            cv2.putText(frame, "AMBULANCE", (112, y3 + 40), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
            
        # Vehicle 4: Bus (moves slow down Lane 3)
        y4 = (frame_idx * 6 + 200) % height
        cv2.rectangle(frame, (350, y4), (410, y4 + 80), (245, 158, 11), -1) # Amber Bus
        cv2.putText(frame, "MOCK_BUS", (352, y4 + 40), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

        # Vehicle 5: Truck (moves very slow down Lane 4)
        y5 = (frame_idx * 4 + 50) % height
        cv2.rectangle(frame, (470, y5), (530, y5 + 90), (99, 102, 241), -1) # Indigo Truck
        cv2.putText(frame, "MOCK_TRUCK", (472, y5 + 55), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

        out.write(frame)
        
    out.release()
    print("Synthetic video generated successfully.")
    return True

if __name__ == "__main__":
    generate_sample_video()
