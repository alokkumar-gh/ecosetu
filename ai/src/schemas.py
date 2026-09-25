"""
EcoSetu AI Microservice Pydantic Schemas
Canonical Reference: docs/11_AI_EWASTE_DETECTION.md Section 10.2, docs/25_SIH_26229_REQUIREMENTS.md
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "ecosetu-ai"
    model_loaded: bool = False
    model_version: str = "material-detection-v0.2.0"
    message: Optional[str] = None


class BoundingBox(BaseModel):
    """Normalized bounding box coordinates [0.0, 1.0] for object detection."""
    x_min: float = Field(..., ge=0.0, le=1.0, description="Normalized left coordinate")
    y_min: float = Field(..., ge=0.0, le=1.0, description="Normalized top coordinate")
    x_max: float = Field(..., ge=0.0, le=1.0, description="Normalized right coordinate")
    y_max: float = Field(..., ge=0.0, le=1.0, description="Normalized bottom coordinate")


class DetectionItem(BaseModel):
    """Single object detection item with class, confidence, and bounding box."""
    class_id: int = Field(..., description="Model class ID")
    category: str = Field(..., description="Canonical e-waste category name")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0.0 to 1.0")
    bbox: BoundingBox = Field(..., description="Normalized bounding box")


class ClassPrediction(BaseModel):
    category: str = Field(..., description="Canonical e-waste category")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0.0 to 1.0")


class PredictionResponse(BaseModel):
    success: bool = Field(True, description="Whether inference completed successfully")
    has_detection: bool = Field(..., description="Whether at least one object was detected")
    category: str = Field(..., description="Top predicted canonical e-waste category (or OTHER if no detection)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score of top prediction (0.0 if no detection)")
    confidence_level: str = Field(..., description="Confidence tier: HIGH, MEDIUM, LOW")
    review_required: bool = Field(..., description="Flag indicating if manual review is required")
    review_reason: Optional[str] = Field(None, description="Explanation when review is required")
    bbox: Optional[BoundingBox] = Field(None, description="Primary bounding box if detected")
    detections: List[DetectionItem] = Field(default_factory=list, description="All detected objects with bounding boxes")
    predictions: List[ClassPrediction] = Field(default_factory=list, description="Ranked detected category list for backward compatibility")
    model_version: str = Field(..., description="Model version identifier")
    inference_time_ms: int = Field(..., ge=0, description="Inference latency in milliseconds")


class ErrorResponse(BaseModel):
    detail: str = Field(..., description="Human-readable error description")

