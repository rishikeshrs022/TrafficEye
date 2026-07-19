import cv2
import numpy as np

class LaneDensityEstimator:
    def __init__(self, frame_width=640, frame_height=480):
        self.w = frame_width
        self.h = frame_height

        # Define default lanes as vertical polygons dividing the screen
        # Lane 1 (Leftmost): High Traffic lane
        self.lanes = {
            1: {
                "polygon": np.array([[0, 0], [frame_width // 4, 0], [frame_width // 4, frame_height], [0, frame_height]], np.int32),
                "capacity": 8,
                "label": "Lane 1 (Northbound)"
            },
            2: {
                "polygon": np.array([[frame_width // 4, 0], [frame_width // 2, 0], [frame_width // 2, frame_height], [frame_width // 4, frame_height]], np.int32),
                "capacity": 6,
                "label": "Lane 2 (Southbound)"
            },
            3: {
                "polygon": np.array([[frame_width // 2, 0], [3 * frame_width // 4, 0], [3 * frame_width // 4, frame_height], [frame_width // 2, frame_height]], np.int32),
                "capacity": 5,
                "label": "Lane 3 (Turn Lane)"
            },
            4: {
                "polygon": np.array([[3 * frame_width // 4, 0], [frame_width, 0], [frame_width, frame_height], [3 * frame_width // 4, frame_height]], np.int32),
                "capacity": 10,  # Crowd capacity
                "label": "Sidewalk (Pedestrian)"
            }
        }

        # Virtual Counting Line: Horizontal line at 60% of frame height
        self.counting_line_y = int(frame_height * 0.6)
        self.crossed_ids = set()
        self.line_crossing_count = 0

    def get_lane_status(self, density_pct):
        if density_pct <= 25:
            return "Low", (0, 255, 0)       # Green
        elif density_pct <= 50:
            return "Medium", (0, 255, 255)   # Yellow
        elif density_pct <= 75:
            return "High", (0, 165, 255)     # Orange
        else:
            return "Critical", (0, 0, 255)   # Red

    def update_lanes(self, tracked_vehicles):
        """
        Calculates vehicles per lane, density, status, and checks line crossing.
        tracked_vehicles: List of [{"bbox": [x1, y1, x2, y2], "class_name": str, "track_id": int}]
        """
        # Reset counters
        lane_counts = {1: 0, 2: 0, 3: 0, 4: 0}
        
        for vehicle in tracked_vehicles:
            x1, y1, x2, y2 = vehicle["bbox"]
            
            # Bottom center of bounding box is the reference point for lane placement
            ref_x = (x1 + x2) // 2
            ref_y = y2

            # Check which lane polygon contains the ref point
            for lane_id, lane in self.lanes.items():
                poly = lane["polygon"]
                # pointPolygonTest returns >= 0 if inside or on edge
                is_inside = cv2.pointPolygonTest(poly, (float(ref_x), float(ref_y)), False) >= 0
                if is_inside:
                    lane_counts[lane_id] += 1
                    break

            # Virtual Line Crossing Count
            # If vehicle tracking center crosses the line_y going downwards
            track_id = vehicle["track_id"]
            center_y = (y1 + y2) // 2
            if center_y > self.counting_line_y and track_id not in self.crossed_ids:
                # Exclude pedestrian crowd class from vehicle line crossing counts
                if vehicle["class_name"] != "person":
                    self.crossed_ids.add(track_id)
                    self.line_crossing_count += 1

        # Calculate density metrics
        lane_metrics = []
        for lane_id, lane in self.lanes.items():
            count = lane_counts[lane_id]
            cap = lane["capacity"]
            density_pct = min(100.0, (count / cap) * 100.0)
            status, color = self.get_lane_status(density_pct)

            lane_metrics.append({
                "lane_id": lane_id,
                "label": lane["label"],
                "count": count,
                "capacity": cap,
                "density": round(density_pct, 1),
                "status": status,
                "color_rgb": color
            })

        return lane_metrics, self.line_crossing_count
