"""
EcoSetu AI Model Manager
Canonical Reference: docs/11_AI_EWASTE_DETECTION.md, docs/13_SECURITY_PRIVACY.md, docs/25_SIH_26229_REQUIREMENTS.md
"""

import os
import time
from io import BytesIO
from typing import Tuple
from PIL import Image

from .config import (
    MODEL_PATH,
    MODEL_VERSION,
    MODEL_CLASSES,
    MAX_FILE_SIZE_BYTES,
    ALLOWED_EXTENSIONS,
    ALLOWED_MIME_TYPES,
    JPEG_MAGIC,
    PNG_MAGIC,
    CANONICAL_CATEGORIES,
    CONFIDENCE_HIGH,
    CONFIDENCE_MEDIUM,
)
from .schemas import (
    BoundingBox,
    DetectionItem,
    ClassPrediction,
    PredictionResponse,
)


def validate_image(file_bytes: bytes, filename: str, content_type: str) -> Tuple[bool, str]:
    """
    Validate image file for security, format, and size per docs/13_SECURITY_PRIVACY.md
    """
    if not file_bytes or len(file_bytes) == 0:
        return False, "Empty image file provided"

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        return False, "File size must be under 5MB"

    # Extension check
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        return False, "Only JPEG and PNG images are accepted"

    # MIME type check
    if content_type.lower() not in ALLOWED_MIME_TYPES:
        return False, "Invalid Content-Type. Only image/jpeg and image/png are accepted"

    # Magic bytes verification (docs/13_SECURITY_PRIVACY.md Section 6)
    is_jpeg = file_bytes.startswith(JPEG_MAGIC)
    is_png = file_bytes.startswith(PNG_MAGIC)

    if not is_jpeg and not is_png:
        return False, "Corrupted or invalid image file signature"

    if (ext in {"jpg", "jpeg"} or content_type == "image/jpeg") and not is_jpeg:
        return False, "File content does not match JPEG format"

    if (ext == "png" or content_type == "image/png") and not is_png:
        return False, "File content does not match PNG format"

    return True, ""


class EwasteClassifier:
    """
    YOLOv8 Object Detection Wrapper
    Loads material-detection-v0.2.0/best.pt through centralized configuration.
    """

    def __init__(self, model_path: str = MODEL_PATH):
        self.model_path = model_path
        self.model_version = MODEL_VERSION
        self.model = None
        self.is_loaded = False
        self.load_message = "MODEL ARTIFACT REQUIRED — TRAINING NOT PERFORMED IN THIS PHASE"
        self._initialize_model()

    def _initialize_model(self):
        if not os.path.isfile(self.model_path):
            self.is_loaded = False
            self.load_message = (
                f"MODEL ARTIFACT REQUIRED — TRAINING NOT PERFORMED IN THIS PHASE. "
                f"Model weights file '{os.path.basename(self.model_path)}' is not present at '{self.model_path}'."
            )
            return

        try:
            from ultralytics import YOLO  # type: ignore
            self.model = YOLO(self.model_path)
            self.is_loaded = True
            self.load_message = f"Model {self.model_version} loaded successfully from {self.model_path}"
        except ImportError:
            self.is_loaded = False
            self.load_message = "ultralytics package not installed in runtime environment"
        except Exception as err:
            self.is_loaded = False
            self.load_message = f"Failed to load model: {str(err)}"

    def parse_detections(self, boxes) -> list[DetectionItem]:
        """
        Extract structured DetectionItem objects from YOLOv8 boxes tensor.
        Safely handles empty boxes, malformed bounding box coordinates, and unknown classes.
        """
        if boxes is None or len(boxes) == 0:
            return []

        detection_items: list[DetectionItem] = []
        for box in boxes:
            try:
                cls_id = int(box.cls.item())
                conf = float(box.conf.item())

                # Normalized coordinates [x_min, y_min, x_max, y_max]
                xyxyn = box.xyxyn[0].tolist()
                x_min = max(0.0, min(1.0, float(xyxyn[0])))
                y_min = max(0.0, min(1.0, float(xyxyn[1])))
                x_max = max(0.0, min(1.0, float(xyxyn[2])))
                y_max = max(0.0, min(1.0, float(xyxyn[3])))

                # Enforce x_min < x_max and y_min < y_max
                if x_min >= x_max:
                    x_max = min(1.0, x_min + 0.001)
                if y_min >= y_max:
                    y_max = min(1.0, y_min + 0.001)

                bbox = BoundingBox(
                    x_min=round(x_min, 4),
                    y_min=round(y_min, 4),
                    x_max=round(x_max, 4),
                    y_max=round(y_max, 4),
                )

                cat_name = MODEL_CLASSES.get(cls_id, "UNKNOWN")

                detection_items.append(
                    DetectionItem(
                        class_id=cls_id,
                        category=cat_name,
                        confidence=round(conf, 4),
                        bbox=bbox,
                    )
                )
            except Exception:
                # Safely skip malformed individual box
                continue

        return detection_items

    def predict(self, file_bytes: bytes) -> PredictionResponse:
        """
        Execute object detection inference on image bytes.
        Returns primary prediction, full detection list, confidence tiers, and no-detection fallback.
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError(self.load_message)

        start_time = time.time()

        try:
            image = Image.open(BytesIO(file_bytes)).convert("RGB")
        except Exception:
            raise ValueError("Corrupted or unreadable image file")

        results = self.model(image, imgsz=640, verbose=False)

        duration_ms = int((time.time() - start_time) * 1000)

        res = results[0]
        detections = self.parse_detections(res.boxes)

        # Zero-detection state handling
        if not detections:
            return PredictionResponse(
                success=True,
                has_detection=False,
                category="OTHER",
                confidence=0.0,
                confidence_level="LOW",
                review_required=True,
                review_reason="No objects detected: manual verification required",
                bbox=None,
                detections=[],
                predictions=[],
                model_version=self.model_version,
                inference_time_ms=duration_ms,
            )

        # Sort detections descending by confidence
        sorted_detections = sorted(detections, key=lambda d: d.confidence, reverse=True)
        primary = sorted_detections[0]

        # Determine confidence tier
        if primary.confidence >= CONFIDENCE_HIGH:
            conf_level = "HIGH"
            review_req = False
            review_msg = None
        elif primary.confidence >= CONFIDENCE_MEDIUM:
            conf_level = "MEDIUM"
            review_req = True
            review_msg = "Moderate confidence: collector confirmation suggested"
        else:
            conf_level = "LOW"
            review_req = True
            review_msg = "Low confidence: visual inspection required"

        primary_cat = primary.category
        if primary_cat not in CANONICAL_CATEGORIES or primary_cat == "UNKNOWN":
            primary_cat = "OTHER"
            review_req = True
            review_msg = "Unmapped object class detected: manual verification required"

        # Unique detected categories with their max confidence for backward-compatible predictions list
        category_max_conf: dict[str, float] = {}
        for d in sorted_detections:
            cat = d.category if d.category in CANONICAL_CATEGORIES else "OTHER"
            if cat not in category_max_conf or d.confidence > category_max_conf[cat]:
                category_max_conf[cat] = d.confidence

        predictions = [
            ClassPrediction(category=cat, confidence=conf)
            for cat, conf in sorted(category_max_conf.items(), key=lambda x: x[1], reverse=True)
        ]

        return PredictionResponse(
            success=True,
            has_detection=True,
            category=primary_cat,
            confidence=primary.confidence,
            confidence_level=conf_level,
            review_required=review_req,
            review_reason=review_msg,
            bbox=primary.bbox,
            detections=sorted_detections,
            predictions=predictions,
            model_version=self.model_version,
            inference_time_ms=duration_ms,
        )


classifier = EwasteClassifier()

