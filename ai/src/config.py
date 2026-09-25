"""
EcoSetu AI Microservice Configuration
Canonical Reference: docs/11_AI_EWASTE_DETECTION.md, docs/13_SECURITY_PRIVACY.md
"""

import os

# Model settings
MODEL_VERSION = "material-detection-v0.2.0"
MODEL_FILENAME = "best.pt"
MODEL_SUBDIR = "material-detection-v0.2.0"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.getenv("MODEL_DIR", os.path.join(BASE_DIR, "models"))
DEFAULT_MODEL_PATH = os.path.join(MODEL_DIR, MODEL_SUBDIR, MODEL_FILENAME)
MODEL_PATH = os.getenv("MODEL_PATH", DEFAULT_MODEL_PATH)

# Image upload & validation limits
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB maximum
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png"}

# Magic bytes (signatures)
# JPEG: starts with FF D8 FF
# PNG: starts with 89 50 4E 47
JPEG_MAGIC = b"\xff\xd8\xff"
PNG_MAGIC = b"\x89PNG"

# Supported V2 Model Classes (3 classes)
MODEL_CLASSES = {
    0: "KEYBOARD_MOUSE",
    1: "MOBILE_PHONE",
    2: "TABLET",
}

# Canonical categories (strictly matching docs/00_PROJECT_INDEX.md)
CANONICAL_CATEGORIES = [
    "MOBILE_PHONE",
    "LAPTOP",
    "DESKTOP",
    "TABLET",
    "MONITOR",
    "PRINTER",
    "KEYBOARD_MOUSE",
    "CABLE_CHARGER",
    "BATTERY",
    "CIRCUIT_BOARD",
    "OTHER",
]

# Classification confidence levels (docs/11_AI_EWASTE_DETECTION.md Section 9.3)
CONFIDENCE_HIGH = 0.80
CONFIDENCE_MEDIUM = 0.50

