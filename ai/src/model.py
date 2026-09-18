"""
EcoSetu AI Model Manager
Canonical Reference: docs/11_AI_EWASTE_DETECTION.md, docs/13_SECURITY_PRIVACY.md
"""

import os
import time
from typing import Tuple
from .config import (
    MODEL_PATH,
    MODEL_VERSION,
    MAX_FILE_SIZE_BYTES,
    ALLOWED_EXTENSIONS,
    ALLOWED_MIME_TYPES,
    JPEG_MAGIC,
    PNG_MAGIC,
    CANONICAL_CATEGORIES,
)
from .schemas import PredictionResponse, ClassPrediction


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
    YOLOv8 Classifier Wrapper
    Loads ewaste_classifier_v1.0.pt if available; otherwise safely reports model status.
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
                f"Model weights file '{os.path.basename(self.model_path)}' is not present."
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

    def predict(self, file_bytes: bytes) -> PredictionResponse:
        """
        Execute inference on image bytes if model artifact is loaded.
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError(self.load_message)

        start_time = time.time()

        # Run inference via PIL / BytesIO
        from io import BytesIO
        from PIL import Image

        image = Image.open(BytesIO(file_bytes)).convert("RGB")
        results = self.model(image, imgsz=224)

        duration_ms = int((time.time() - start_time) * 1000)

        # Extract predictions from YOLO classification result
        res = results[0]
        probs = res.probs
        top1_idx = int(probs.top1)
        top1_conf = float(probs.top1conf.item())
        class_names = res.names

        top_category = class_names[top1_idx]
        if top_category not in CANONICAL_CATEGORIES:
            top_category = "OTHER"

        predictions = []
        for idx, conf_tensor in enumerate(probs.data):
            cat = class_names[idx]
            if cat in CANONICAL_CATEGORIES:
                predictions.append(
                    ClassPrediction(
                        category=cat,
                        confidence=round(float(conf_tensor.item()), 4),
                    )
                )

        # Sort predictions descending by confidence
        predictions.sort(key=lambda x: x.confidence, reverse=True)

        return PredictionResponse(
            category=top_category,
            confidence=round(top1_conf, 4),
            predictions=predictions,
            model_version=self.model_version,
            inference_time_ms=duration_ms,
        )


classifier = EwasteClassifier()
