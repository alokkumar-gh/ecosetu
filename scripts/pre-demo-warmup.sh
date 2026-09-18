#!/usr/bin/env bash
# EcoSetu Pre-Demo Cloud Warmup Script
set -e

BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
AI_URL="${AI_URL:-http://localhost:8000}"

echo "=== Warming up EcoSetu Services ==="

echo "Pinging backend health..."
curl -s "${BACKEND_URL}/health" || echo "Backend unreachable at ${BACKEND_URL}"

echo ""
echo "Pinging AI health..."
curl -s "${AI_URL}/health" || echo "AI service unreachable at ${AI_URL}"

echo ""
echo "Warmup ping complete."
