import io
import os
import sys
import pytest
from PIL import Image
from unittest.mock import MagicMock

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from ai.src.main import app
from ai.src.config import (
    JPEG_MAGIC,
    PNG_MAGIC,
    MODEL_PATH,
    MODEL_VERSION,
    MODEL_CLASSES,
    CONFIDENCE_HIGH,
    CONFIDENCE_MEDIUM,
)
from ai.src.model import classifier, EwasteClassifier
from ai.src.schemas import BoundingBox, DetectionItem

client = TestClient(app)


def create_test_image_bytes(fmt: str = "PNG", size=(64, 64), color="blue") -> bytes:
    """Helper to create a valid decodable image in memory."""
    buf = io.BytesIO()
    im = Image.new("RGB", size, color=color)
    im.save(buf, format=fmt)
    return buf.getvalue()


# --------------------------------------------------
# MODEL CONFIGURATION & INTEGRITY TESTS
# --------------------------------------------------

def test_model_path_resolution():
    """Verify model path resolves safely and is not an absolute hardcoded path."""
    assert os.path.isabs(MODEL_PATH)
    assert "material-detection-v0.2.0" in MODEL_PATH
    assert MODEL_PATH.endswith("best.pt")


def test_model_loaded_and_classes():
    """Verify model is loaded and has exactly 3 authoritative classes."""
    assert classifier.is_loaded is True
    assert classifier.model is not None
    assert classifier.model_version == "material-detection-v0.2.0"

    # Verify 3 classes
    assert len(MODEL_CLASSES) == 3
    assert MODEL_CLASSES[0] == "KEYBOARD_MOUSE"
    assert MODEL_CLASSES[1] == "MOBILE_PHONE"
    assert MODEL_CLASSES[2] == "TABLET"

    # Verify underlying model names
    assert hasattr(classifier.model, "names")
    assert classifier.model.names[0] == "KEYBOARD_MOUSE"
    assert classifier.model.names[1] == "MOBILE_PHONE"
    assert classifier.model.names[2] == "TABLET"


def test_health_check_endpoint():
    """Verify GET /health returns service status and V2 model status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ecosetu-ai"
    assert data["model_version"] == "material-detection-v0.2.0"
    assert data["model_loaded"] is True
    assert "loaded successfully" in data["message"]


# --------------------------------------------------
# DETECTION PARSER UNIT TESTS
# --------------------------------------------------

def test_detection_parser_zero_detections():
    """Verify parser handles empty/zero detections safely."""
    res = classifier.parse_detections(None)
    assert res == []

    res_empty = classifier.parse_detections([])
    assert res_empty == []


def test_detection_parser_single_detection():
    """Verify parser extracts class_id, category, confidence, and normalized bbox."""
    mock_box = MagicMock()
    mock_box.cls.item.return_value = 1
    mock_box.conf.item.return_value = 0.9482
    mock_box.xyxyn = [MagicMock()]
    mock_box.xyxyn[0].tolist.return_value = [0.1234, 0.2345, 0.6789, 0.7890]

    detections = classifier.parse_detections([mock_box])
    assert len(detections) == 1
    d = detections[0]
    assert d.class_id == 1
    assert d.category == "MOBILE_PHONE"
    assert d.confidence == 0.9482
    assert d.bbox.x_min == 0.1234
    assert d.bbox.y_min == 0.2345
    assert d.bbox.x_max == 0.6789
    assert d.bbox.y_max == 0.7890


def test_detection_parser_multiple_detections():
    """Verify parser handles multiple detected objects."""
    box1 = MagicMock()
    box1.cls.item.return_value = 1
    box1.conf.item.return_value = 0.9100
    box1.xyxyn = [MagicMock()]
    box1.xyxyn[0].tolist.return_value = [0.1, 0.1, 0.4, 0.4]

    box2 = MagicMock()
    box2.cls.item.return_value = 0
    box2.conf.item.return_value = 0.8500
    box2.xyxyn = [MagicMock()]
    box2.xyxyn[0].tolist.return_value = [0.5, 0.5, 0.9, 0.9]

    detections = classifier.parse_detections([box1, box2])
    assert len(detections) == 2
    assert detections[0].category == "MOBILE_PHONE"
    assert detections[1].category == "KEYBOARD_MOUSE"


def test_detection_parser_unknown_class_id():
    """Verify unknown class ID is labeled UNKNOWN and not a fabricated category."""
    box = MagicMock()
    box.cls.item.return_value = 99
    box.conf.item.return_value = 0.7500
    box.xyxyn = [MagicMock()]
    box.xyxyn[0].tolist.return_value = [0.1, 0.1, 0.5, 0.5]

    detections = classifier.parse_detections([box])
    assert len(detections) == 1
    assert detections[0].category == "UNKNOWN"
    assert detections[0].class_id == 99


# --------------------------------------------------
# PREDICT LOGIC & CONFIDENCE TIERS
# --------------------------------------------------

def test_predict_zero_detections_state():
    """Verify predict returns safe no-detection response when no object is detected."""
    # Blank white image has no e-waste
    blank_bytes = create_test_image_bytes("PNG", size=(640, 640), color="white")
    result = classifier.predict(blank_bytes)

    assert result.success is True
    assert result.has_detection is False
    assert result.category == "OTHER"
    assert result.confidence == 0.0
    assert result.confidence_level == "LOW"
    assert result.review_required is True
    assert result.bbox is None
    assert result.detections == []
    assert result.predictions == []
    assert result.model_version == "material-detection-v0.2.0"
    assert result.inference_time_ms >= 0


def test_predict_endpoint_with_valid_image():
    """Verify POST /predict returns 200 and schema-compliant response."""
    img_bytes = create_test_image_bytes("PNG", size=(300, 300), color="gray")
    response = client.post(
        "/predict",
        files={"image": ("test.png", img_bytes, "image/png")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "has_detection" in data
    assert "category" in data
    assert "confidence" in data
    assert "confidence_level" in data
    assert "review_required" in data
    assert "detections" in data
    assert "predictions" in data
    assert data["model_version"] == "material-detection-v0.2.0"
    assert data["inference_time_ms"] >= 0


def test_predict_when_model_unloaded(monkeypatch):
    """Verify 503 response if model weights are not loaded."""
    monkeypatch.setattr(classifier, "is_loaded", False)
    monkeypatch.setattr(classifier, "load_message", "MODEL ARTIFACT REQUIRED")

    img_bytes = create_test_image_bytes("PNG")
    response = client.post(
        "/predict",
        files={"image": ("test.png", img_bytes, "image/png")},
    )
    assert response.status_code == 503
    assert "MODEL ARTIFACT REQUIRED" in response.json()["detail"]


# --------------------------------------------------
# SECURITY & VALIDATION TESTS
# --------------------------------------------------

def test_predict_missing_file():
    """Verify POST /predict without file returns 422 validation error."""
    response = client.post("/predict")
    assert response.status_code == 422


def test_predict_invalid_extension():
    """Verify uploading non-image file (.txt) is rejected with 400."""
    response = client.post(
        "/predict",
        files={"image": ("notes.txt", b"Hello world", "text/plain")},
    )
    assert response.status_code == 400
    assert "Only JPEG and PNG images are accepted" in response.json()["detail"]


def test_predict_corrupt_magic_bytes():
    """Verify file with .jpg extension but corrupt header is rejected with 400."""
    fake_content = b"NOT_A_VALID_JPEG_HEADER_CONTENT"
    response = client.post(
        "/predict",
        files={"image": ("photo.jpg", fake_content, "image/jpeg")},
    )
    assert response.status_code == 400
    assert "signature" in response.json()["detail"].lower() or "format" in response.json()["detail"].lower()


def test_predict_unreadable_corrupt_image():
    """Verify file with valid magic bytes but corrupt body is rejected with 400."""
    corrupt_jpeg = JPEG_MAGIC + b"\x00" * 100
    response = client.post(
        "/predict",
        files={"image": ("photo.jpg", corrupt_jpeg, "image/jpeg")},
    )
    assert response.status_code == 400
    assert "corrupt" in response.json()["detail"].lower() or "unreadable" in response.json()["detail"].lower()


def test_predict_oversized_file():
    """Verify file larger than 5MB is rejected with 400."""
    oversized = JPEG_MAGIC + b"\x00" * (5 * 1024 * 1024 + 1024)
    response = client.post(
        "/predict",
        files={"image": ("large.jpg", oversized, "image/jpeg")},
    )
    assert response.status_code == 400
    assert "under 5MB" in response.json()["detail"]


def test_security_no_internal_stack_trace():
    """Verify error responses follow standard format without leaking server stack traces."""
    response = client.post(
        "/predict",
        files={"image": ("bad.bin", b"invalid", "application/octet-stream")},
    )
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    assert "Traceback" not in str(data)

