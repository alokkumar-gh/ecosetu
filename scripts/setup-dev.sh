#!/usr/bin/env bash
# EcoSetu Development Environment Setup & Validation Script
set -e

echo "=== EcoSetu Development Environment Check ==="

echo "Checking Node.js..."
node -v

echo "Checking npm..."
npm -v

echo "Checking Python..."
python --version || python3 --version

echo "Checking Java/JDK..."
java -version

echo "Environment check complete."
