"""
EcoSetu AI Microservice Main Entry Point
Canonical Reference: docs/11_AI_EWASTE_DETECTION.md Section 10.2, docs/13_SECURITY_PRIVACY.md
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .config import MODEL_VERSION
from .schemas import HealthResponse, PredictionResponse
from .model import classifier, validate_image

app = FastAPI(
    title="EcoSetu AI Microservice",
    description="E-Waste image classification microservice for EcoSetu",
    version=MODEL_VERSION,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """
    Catch-all exception handler to avoid leaking server paths or stack traces
    per docs/13_SECURITY_PRIVACY.md
    """
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal inference service error"},
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint returning service and model loading status
    """
    return HealthResponse(
        status="ok",
        service="ecosetu-ai",
        model_loaded=classifier.is_loaded,
        model_version=classifier.model_version,
        message=classifier.load_message,
    )


@app.post("/predict", response_model=PredictionResponse)
async def predict(image: UploadFile = File(...)):
    """
    Predict e-waste category from uploaded image
    Canonical Reference: docs/11_AI_EWASTE_DETECTION.md Section 10.2
    """
    filename = image.filename or "upload.jpg"
    content_type = image.content_type or ""

    try:
        file_bytes = await image.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read uploaded image file")

    # Validate image security (type, magic bytes, size)
    is_valid, error_msg = validate_image(file_bytes, filename, content_type)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # If model weights are not loaded (training not performed in this phase)
    if not classifier.is_loaded:
        raise HTTPException(
            status_code=503,
            detail=classifier.load_message,
        )

    try:
        prediction = classifier.predict(file_bytes)
        return prediction
    except RuntimeError as err:
        raise HTTPException(status_code=503, detail=str(err))
    except Exception:
        raise HTTPException(status_code=500, detail="Inference execution failed")
