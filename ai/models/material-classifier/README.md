# EcoSetu — Material Classifier Artifact & Model Management
Canonical Reference: `docs/11_AI_EWASTE_DETECTION.md`, `docs/25_SIH_26229_REQUIREMENTS.md`

## 1. Directory Structure

```
ai/models/material-classifier/
├── README.md               # Architecture, usage, and artifact rules
├── configs/                # Reproducible YOLO YAML training configurations
│   └── yolo_baseline.yaml  # Default baseline configuration
├── training/               # Checkpoint training run logs and curves (git-ignored)
├── evaluation/             # Machine-readable evaluation reports & metrics (git-ignored)
└── artifacts/              # Final exported .pt binaries and checksum metadata (git-ignored)
```

## 2. Model Versioning Convention

Model releases use semantic tags: `material-classifier-v<MAJOR>.<MINOR>.<PATCH>`:
- **`PATCH`** (e.g. `v0.1.1`): Minor hyperparameter adjustment on identical dataset.
- **`MINOR`** (e.g. `v0.2.0`): Trained on updated dataset with new real samples.
- **`MAJOR`** (e.g. `v1.0.0`): Production baseline meeting accuracy (>70%) and latency (<500ms) criteria.

## 3. Artifact Packaging Specification

Each exported model artifact in `artifacts/` must consist of two coupled files:
1. **Model Weights:** `material-classifier-vX.Y.Z.pt` (Binary weights, git-ignored)
2. **Provenance Metadata:** `material-classifier-vX.Y.Z_metadata.json` (Tracked in git)

Metadata schema:
```json
{
  "model_id": "material-classifier-v0.1.0",
  "model_version": "v0.1.0",
  "task": "classify",
  "base_model": "yolov8n-cls.pt",
  "created_at": "2026-09-21T00:00:00Z",
  "sha256": "<64-hex-char-hash>",
  "dataset_version": "v0.1.0",
  "hyperparameters": {
    "epochs": 100,
    "batch_size": 32,
    "imgsz": 224,
    "optimizer": "AdamW",
    "lr0": 0.001,
    "seed": 42
  },
  "classes": [
    "CRT", "LCD_PANEL", "PCB", "CABLE", "BATTERY", "MOTOR",
    "MAGNET_ASSEMBLY", "MIXED_PLASTIC", "MOBILE_PHONE", "LAPTOP",
    "MONITOR", "PRINTER", "KEYBOARD_MOUSE", "DESKTOP_COMPUTER",
    "TABLET", "OTHER"
  ]
}
```

## 4. Current Status: NO TRAINED MODEL EXISTS YET

> [!IMPORTANT]
> In accordance with SIH Problem Statement 26229 and platform non-fabrication rules, **no model has been trained or committed to the repository yet**.
> The pipeline, inspection tools, Colab workflow, and inference contracts are fully functional and ready to execute once authentic dataset images are imported.
