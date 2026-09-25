# EcoSetu AI Microservice Production Dockerfile
# Canonical Reference: docs/15_DEPLOYMENT_GUIDE.md Section 7, docs/11_AI_EWASTE_DETECTION.md

FROM python:3.11-slim

# Install system dependencies (libgl1, libglib2.0-0, libgomp1 for OpenCV/Ultralytics/Pillow)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged system user
RUN useradd -m -u 1000 appuser

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source, configs, and production model weights
COPY src ./src
COPY configs ./configs
COPY models ./models

# Set ownership to unprivileged user
RUN chown -R appuser:appuser /app

USER appuser

ENV HOST=0.0.0.0
ENV PORT=8000
ENV MODEL_DIR=/app/models
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import os, urllib.request; sys_exit = 0 if urllib.request.urlopen('http://localhost:' + str(os.environ.get('PORT', 8000)) + '/health').getcode() == 200 else 1; exit(sys_exit)" || exit 1

CMD ["sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

