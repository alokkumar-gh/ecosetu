import os
import sys
import pytest

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from ai.src.main import app
from ai.src.config import JPEG_MAGIC, PNG_MAGIC

client = TestClient(app)


def test_health_check_endpoint():
    """Verify GET /health returns service status and model artifact status"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ecosetu-ai"
    assert data["model_version"] == "v1.0"
    assert data["model_loaded"] is False
    assert "MODEL ARTIFACT REQUIRED" in data["message"]


def test_predict_missing_file():
    """Verify POST /predict without file returns 422 validation error"""
    response = client.post("/predict")
    assert response.status_code == 422


def test_predict_invalid_extension():
    """Verify uploading non-image file (.txt) is rejected with 400"""
    response = client.post(
        "/predict",
        files={"image": ("notes.txt", b"Hello world", "text/plain")},
    )
    assert response.status_code == 400
    assert "Only JPEG and PNG images are accepted" in response.json()["detail"]


def test_predict_corrupt_magic_bytes():
    """Verify file with .jpg extension but corrupt header is rejected with 400"""
    fake_content = b"NOT_A_VALID_JPEG_HEADER_CONTENT"
    response = client.post(
        "/predict",
        files={"image": ("photo.jpg", fake_content, "image/jpeg")},
    )
    assert response.status_code == 400
    assert "signature" in response.json()["detail"].lower() or "format" in response.json()["detail"].lower()


def test_predict_oversized_file():
    """Verify file larger than 5MB is rejected with 400"""
    # 5MB + 1KB
    oversized = JPEG_MAGIC + b"\x00" * (5 * 1024 * 1024 + 1024)
    response = client.post(
        "/predict",
        files={"image": ("large.jpg", oversized, "image/jpeg")},
    )
    assert response.status_code == 400
    assert "under 5MB" in response.json()["detail"]


def test_predict_valid_jpeg_when_model_artifact_absent():
    """
    Verify valid JPEG passes validation and returns 503 with exact requirement
    that model weights must be trained/loaded.
    """
    valid_jpeg = JPEG_MAGIC + b"\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00" + b"\x00" * 100
    response = client.post(
        "/predict",
        files={"image": ("laptop.jpg", valid_jpeg, "image/jpeg")},
    )
    assert response.status_code == 503
    assert "MODEL ARTIFACT REQUIRED" in response.json()["detail"]


def test_predict_valid_png_when_model_artifact_absent():
    """
    Verify valid PNG passes validation and returns 503 with exact requirement
    that model weights must be trained/loaded.
    """
    valid_png = PNG_MAGIC + b"\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 100
    response = client.post(
        "/predict",
        files={"image": ("monitor.png", valid_png, "image/png")},
    )
    assert response.status_code == 503
    assert "MODEL ARTIFACT REQUIRED" in response.json()["detail"]


def test_security_no_internal_stack_trace():
    """Verify error responses follow standard format without leaking server stack traces"""
    response = client.post(
        "/predict",
        files={"image": ("bad.bin", b"invalid", "application/octet-stream")},
    )
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    assert "Traceback" not in str(data)
