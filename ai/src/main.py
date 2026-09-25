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

    print(f"[EcoSetu AI DEBUG] FastAPI: /predict entered -> filename: {filename}, content_type: {content_type}")

    try:
        file_bytes = await image.read()
        print(f"[EcoSetu AI DEBUG] FastAPI: image received, bytes: {len(file_bytes)}")
    except Exception as read_err:
        print(f"[EcoSetu AI DEBUG] FastAPI: failed to read image: {read_err}")
        raise HTTPException(status_code=400, detail="Failed to read uploaded image file")

    # Validate image security (type, magic bytes, size)
    is_valid, error_msg = validate_image(file_bytes, filename, content_type)
    if not is_valid:
        print(f"[EcoSetu AI DEBUG] FastAPI: image validation failed: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)

    # If model weights are not loaded
    if not classifier.is_loaded:
        print(f"[EcoSetu AI DEBUG] FastAPI: model not loaded -> {classifier.load_message}")
        raise HTTPException(
            status_code=503,
            detail=classifier.load_message,
        )

    try:
        import asyncio
        prediction = await asyncio.to_thread(classifier.predict, file_bytes)
        print(f"[EcoSetu AI DEBUG] FastAPI: Inference completed in {prediction.inference_time_ms}ms -> detections: {len(prediction.detections)}, category: {prediction.category}, confidence: {prediction.confidence}")
        return prediction
    except ValueError as err:
        print(f"[EcoSetu AI DEBUG] FastAPI: ValueError during inference: {err}")
        raise HTTPException(status_code=400, detail=str(err))
    except RuntimeError as err:
        print(f"[EcoSetu AI DEBUG] FastAPI: RuntimeError during inference: {err}")
        raise HTTPException(status_code=503, detail=str(err))
    except Exception as err:
        import traceback
        print(f"[EcoSetu AI DEBUG] FastAPI: Unexpected inference exception: {err}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Inference execution failed")
