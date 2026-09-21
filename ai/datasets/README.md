# EcoSetu AI Datasets Directory

This directory contains datasets, metadata, manifests, and pipelines supporting ECOSETU's AI/ML initiatives.

## Strict Architectural Principles

1. **Explicit Source Segregation**:
   - `EXTERNAL_PUBLIC`: Public benchmarks (Kaggle e-waste, Open Images, Roboflow).
   - `FIELD_COLLECTED`: Curated offline pilot scrap photos collected by field teams.
   - `ECOSETU_PRODUCTION`: Real operational images captured via ECOSETU mobile app.
   - `SYNTHETIC_TEST`: Minimal fixtures used strictly for automated testing.
   **These sources must never be mixed silently.**

2. **Single Source of Truth**:
   - Class labels map to ECOSETU's 16 authoritative `MaterialCategory` types.
   - No duplicate category definitions or arbitrary custom classes.

3. **No Trained Model Claim**:
   - This directory establishes the data preparation, validation, and splitting foundation.
   - **NO TRAINED MODEL IS COMMITTED OR DEPLOYED YET.**

4. **Zero Fabrication**:
   - Real data only; missing values remain explicitly `null`/`UNKNOWN`.
   - Licenses are documented or marked `LICENSE_UNVERIFIED`.

5. **Privacy by Design**:
   - Zero Personally Identifiable Information (PII) is permitted in dataset records.
   - Coarse locations only (city/state or lat/lng rounded to 2 decimals).
   - No phone numbers, passwords, auth tokens, Aadhaar, PAN, or exact residential addresses.

## Subdirectories

- `material-classification/`: Image dataset for e-waste category classification (YOLO classification).
