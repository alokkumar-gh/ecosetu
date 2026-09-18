"""
EcoSetu AI Microservice Pydantic Schemas
Canonical Reference: docs/11_AI_EWASTE_DETECTION.md Section 10.2
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "ecosetu-ai"
    model_loaded: bool = False
    model_version: str = "v1.0"
    message: Optional[str] = None


class ClassPrediction(BaseModel):
    category: str = Field(..., description="Canonical e-waste category")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0.0 to 1.0")


class PredictionResponse(BaseModel):
    category: str = Field(..., description="Top predicted canonical e-waste category")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence of top prediction")
    predictions: List[ClassPrediction] = Field(..., description="Ranked category predictions with confidence")
    model_version: str = Field(..., description="Model version identifier")
    inference_time_ms: int = Field(..., ge=0, description="Inference latency in milliseconds")


class ErrorResponse(BaseModel):
    detail: str = Field(..., description="Human-readable error description")
