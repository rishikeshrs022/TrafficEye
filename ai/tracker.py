import numpy as np

def calculate_iou(box1, box2):
    """Calculates Intersection over Union (IoU) of two bounding boxes."""
    x1_1, y1_1, x2_1, y2_1 = box1
    x1_2, y1_2, x2_2, y2_2 = box2

    x_left = max(x1_1, x1_2)
    y_top = max(y1_1, y1_2)
    x_right = min(x2_1, x2_2)
    y_bottom = min(y2_1, y2_2)

    if x_right < x_left or y_bottom < y_top:
        return 0.0

    intersection_area = (x_right - x_left) * (y_bottom - y_top)
    box1_area = (x2_1 - x1_1) * (y2_1 - y1_1)
    box2_area = (x2_2 - x1_2) * (y2_2 - y1_2)
    union_area = float(box1_area + box2_area - intersection_area)

    if union_area == 0:
        return 0.0

    return intersection_area / union_area

class IoUTracker:
    """
    A simple, robust IoU and distance-based object tracker.
    Acts as a lightweight DeepSORT replacement for clean hackathon setup.
    """
    def __init__(self, max_lost_frames=5, iou_threshold=0.3):
        self.max_lost_frames = max_lost_frames
        self.iou_threshold = iou_threshold
        self.next_track_id = 1
        
        # Format: {track_id: {"bbox": [x1, y1, x2, y2], "class_name": str, "lost_count": int}}
        self.tracks = {}

    def update(self, detections):
        """
        Updates tracks with new detections.
        detections: List of dicts [{"bbox": [x1, y1, x2, y2], "class_name": str, "confidence": float}]
        Returns:
            List of dicts: [{"bbox": [x1, y1, x2, y2], "class_name": str, "track_id": int}]
        """
        updated_tracks = {}
        matched_detections = set()

        # Try to match current tracks to new detections
        for track_id, track in self.tracks.items():
            best_match_idx = -1
            best_iou = -1.0
            
            for idx, det in enumerate(detections):
                if idx in matched_detections:
                    continue
                
                # Check if same class type (optional, but good for ID stability)
                if det["class_name"] != track["class_name"]:
                    continue

                iou = calculate_iou(track["bbox"], det["bbox"])
                if iou > best_iou:
                    best_iou = iou
                    best_match_idx = idx
            
            if best_match_idx != -1 and best_iou >= self.iou_threshold:
                # Found match: update track
                det = detections[best_match_idx]
                updated_tracks[track_id] = {
                    "bbox": det["bbox"],
                    "class_name": det["class_name"],
                    "lost_count": 0
                }
                matched_detections.add(best_match_idx)
            else:
                # No match: increment lost count
                track["lost_count"] += 1
                if track["lost_count"] <= self.max_lost_frames:
                    # Keep track, use last known bbox
                    updated_tracks[track_id] = track

        # Create new tracks for unmatched detections
        for idx, det in enumerate(detections):
            if idx not in matched_detections:
                updated_tracks[self.next_track_id] = {
                    "bbox": det["bbox"],
                    "class_name": det["class_name"],
                    "lost_count": 0
                }
                self.next_track_id += 1

        self.tracks = updated_tracks

        # Prepare outputs
        results = []
        for track_id, track in self.tracks.items():
            if track["lost_count"] == 0:  # Only output currently active detections
                results.append({
                    "bbox": track["bbox"],
                    "class_name": track["class_name"],
                    "track_id": track_id
                })
        return results
