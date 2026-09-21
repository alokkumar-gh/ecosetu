"""
EcoSetu Material Classifier Inference Contract & Safety Schema
Canonical Reference: docs/11_AI_EWASTE_DETECTION.md, docs/25_SIH_26229_REQUIREMENTS.md

Defines the output schema for future inference models:
- Predictions with confidence scores and optional bounding boxes
- Uncertainty handling (LOW_CONFIDENCE / REVIEW_REQUIRED)
- Collector override safeguards (collector choice always takes precedence)
- Top-k candidate classification
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, model_validator

from ai.src.dataset.schema import CANONICAL_MATERIAL_CATEGORIES, MaterialCategoryEnum


class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"          # >= 0.80: Strong match
    MEDIUM = "MEDIUM"      # 0.50 - 0.79: Plausible match, human confirmation recommended
    LOW = "LOW"            # < 0.50: Low confidence, review required
    UNKNOWN = "UNKNOWN"    # Unrecognized or out-of-distribution


class BoundingBox(BaseModel):
    """Normalized bounding box coordinates [0.0, 1.0] for object detection."""
    x_min: float = Field(..., ge=0.0, le=1.0, description="Normalized left coordinate")
    y_min: float = Field(..., ge=0.0, le=1.0, description="Normalized top coordinate")
    x_max: float = Field(..., ge=0.0, le=1.0, description="Normalized right coordinate")
    y_max: float = Field(..., ge=0.0, le=1.0, description="Normalized bottom coordinate")

    @model_validator(mode="after")
    def validate_box(self) -> "BoundingBox":
        if self.x_min >= self.x_max:
            raise ValueError(f"x_min ({self.x_min}) must be strictly less than x_max ({self.x_max})")
        if self.y_min >= self.y_max:
            raise ValueError(f"y_min ({self.y_min}) must be strictly less than y_max ({self.y_max})")
        return self


class CategoryPrediction(BaseModel):
    """Individual category prediction candidate."""
    category: MaterialCategoryEnum = Field(..., description="Canonical ECOSETU category")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0.0 to 1.0")
    bbox: Optional[BoundingBox] = Field(None, description="Bounding box if detection model")
    notes: Optional[str] = Field(None, description="Safety or condition observation notes")


class InferenceContract(BaseModel):
    """
    Standard output contract for EcoSetu material classification inference.
    Designed for consumer app, collector app, and audit logging.
    """
    model_id: str = Field(..., description="Unique model identifier (e.g., yolov8n-mat-v0.1.0)")
    model_version: str = Field(..., description="Semantic version of model weights")
    model_type: str = Field("classification", description="classification | object_detection")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    # Top prediction
    primary_category: MaterialCategoryEnum = Field(..., description="Top ranked canonical category")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Top prediction confidence")
    confidence_level: ConfidenceLevel = Field(..., description="HIGH, MEDIUM, LOW, or UNKNOWN")

    # Flag indicating whether human review is required before committing
    review_required: bool = Field(False, description="True if confidence is low or category is ambiguous")
    review_reason: Optional[str] = Field(None, description="Explanation if review is required")

    # Bounding box for detection models
    bbox: Optional[BoundingBox] = Field(None, description="Primary bounding box if detection")

    # Ranked top-k predictions
    top_k: List[CategoryPrediction] = Field(default_factory=list, description="Top-k alternative candidates")

    # Provenance and safety audit
    latency_ms: int = Field(..., ge=0, description="Inference latency in milliseconds")
    device_info: Optional[str] = Field(None, description="Inference execution device (e.g. cpu, cuda:0)")
    user_override: Optional[Dict[str, Any]] = Field(
        None,
        description="Records collector override if collector corrected the prediction (category, timestamp, reason)"
    )

    @classmethod
    def create_result(
        cls,
        model_id: str,
        model_version: str,
        model_type: str,
        predictions: List[CategoryPrediction],
        latency_ms: int,
        confidence_threshold_high: float = 0.80,
        confidence_threshold_medium: float = 0.50,
        device_info: Optional[str] = "cpu",
    ) -> "InferenceContract":
        """Convenience builder applying confidence classification and safety review flags."""
        if not predictions:
            # Fallback to OTHER with LOW confidence
            return cls(
                model_id=model_id,
                model_version=model_version,
                model_type=model_type,
                primary_category=MaterialCategoryEnum.OTHER,
                confidence=0.0,
                confidence_level=ConfidenceLevel.LOW,
                review_required=True,
                review_reason="No valid predictions returned by model",
                latency_ms=latency_ms,
                device_info=device_info,
            )

        # Sort descending by confidence
        sorted_preds = sorted(predictions, key=lambda p: p.confidence, reverse=True)
        top = sorted_preds[0]

        if top.confidence >= confidence_threshold_high:
            conf_level = ConfidenceLevel.HIGH
            review_req = False
            review_msg = None
        elif top.confidence >= confidence_threshold_medium:
            conf_level = ConfidenceLevel.MEDIUM
            review_req = True
            review_msg = "Moderate confidence: collector confirmation suggested"
        else:
            conf_level = ConfidenceLevel.LOW
            review_req = True
            review_msg = "Low confidence: visual inspection required"

        return cls(
            model_id=model_id,
            model_version=model_version,
            model_type=model_type,
            primary_category=top.category,
            confidence=round(top.confidence, 4),
            confidence_level=conf_level,
            review_required=review_req,
            review_reason=review_msg,
            bbox=top.bbox,
            top_k=sorted_preds[:5],
            latency_ms=latency_ms,
            device_info=device_info,
        )
