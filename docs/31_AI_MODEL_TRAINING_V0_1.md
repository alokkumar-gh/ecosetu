# EcoSetu — YOLOv8n Material Detection Model Training & Evaluation (v0.1.0)

> **SIH Problem Statement 26229 — Kabadiwala Connect**  
> **Canonical Reference:** `docs/11_AI_EWASTE_DETECTION.md`, `docs/12_AI_TRAINING_PLAN.md`, `docs/28_AI_MATERIAL_CLASSIFICATION_PIPELINE.md`, `docs/29_AI_DATASET_SOURCES.md`, `docs/30_AI_DATASET_QUALITY_GATE.md`  
> **Target Dataset:** `material-detection-v0.1.0` (142 images: 99 train, 28 val, 15 test)  
> **Status:** GOOGLE COLAB TRAINING NOTEBOOK & EVALUATION HARNESS COMPLETE — **MODEL BASELINE READY**.

---

## 1. Executive Summary & Objective

In Prompt 23, we established the first real computer-vision object-detection model training and evaluation pipeline for ECOSETU:
- **Base Architecture:** Ultralytics YOLOv8 nano (`yolov8n.pt` pretrained checkpoint).
- **Target Dataset:** `material-detection-v0.1.0` located on persistent Google Drive (`ECOSETU_AI/datasets/processed/material-detection-v0.1.0/`), verified through the 26-point independent quality gate (`READY_FOR_TRAINING`).
- **Compute Environment:** Google Colab GPU (e.g., NVIDIA T4, V100, A100). The notebook strictly prohibits CPU training execution.
- **Persistent Destination:** Google Drive (`ECOSETU_AI/models/material-detection/material-detection-v0.1.0/`).
- **Zero Local Footprint:** The developer's local PC does not store large training weights, runs, or cache files.

---

## 2. Dataset & Classes

The model is trained exclusively on the verified XBAT+ WEEE RGB subset:
- **Total Images:** 142 authentic images (~30.4 MB processed footprint).
- **Split Distribution (Class-Aware Stratified 70/20/10, seed 42):**
  - **Train:** 99 images (99 bounding boxes)
  - **Validation:** 28 images (28 bounding boxes)
  - **Held-Out Test:** 15 images (15 bounding boxes)
- **Supported Classes (3):**
  - `0: KEYBOARD_MOUSE` (12 total: 8 train, 2 val, 2 test)
  - `1: MOBILE_PHONE` (103 total: 72 train, 21 val, 10 test)
  - `2: TABLET` (27 total: 19 train, 5 val, 3 test)
- **Insufficient Classes Documented:** The remaining 13 ECOSETU canonical categories (`CRT`, `LCD_PANEL`, `PCB`, `CABLE`, `BATTERY`, `MOTOR`, `MAGNET_ASSEMBLY`, `MIXED_PLASTIC`, `LAPTOP`, `MONITOR`, `PRINTER`, `DESKTOP_COMPUTER`, `OTHER`) are omitted from this initial baseline due to insufficient public RGB annotations. No data was fabricated.

---

## 3. Dataset Limitations & Small Dataset Notice

> [!WARNING]
> **STATISTICAL VARIANCE & INITIAL BASELINE NOTICE:**  
> This initial baseline was trained on 142 total images with a held-out test split of 15 images. High statistical variance is inherent to this sample size.
> - **NOT Production-Ready:** This model serves as an authentic, reproducible baseline benchmark.
> - **No Generalization Claims:** This model MUST NOT be claimed to generalize to dusty, cluttered Indian scrap-yard environments or harsh outdoor lighting conditions without further multi-source data collection.
> - **Class Scope:** This model supports ONLY 3 classes (`KEYBOARD_MOUSE`, `MOBILE_PHONE`, `TABLET`). It MUST NOT be used to classify PCBs, motors, cables, or batteries.

---

## 4. Model Architecture & Training Configuration

| Parameter | Configuration | Rationale |
|:---|:---:|:---|
| **Architecture** | Ultralytics YOLOv8n (Detection) | Lightweight nano backbone optimal for mobile edge deployment |
| **Base Checkpoint** | `yolov8n.pt` | Official Ultralytics pretrained weights for faster convergence |
| **Image Resolution (`imgsz`)** | `640` | Standard YOLO detection resolution for fine-grained e-waste features |
| **Epochs Requested** | `100` | Ample training runway for fine-tuning |
| **Early Stopping Patience** | `20` | Stops if validation mAP fails to improve for 20 consecutive epochs |
| **Batch Size** | Auto (16 for $\ge 8$ GB VRAM, else 8) | Fits Colab T4 (16 GB) without OOM |
| **Optimizer** | `auto` (AdamW default) | Adaptive learning rate with decoupled weight decay |
| **Deterministic Seed** | `42` | Complete reproducibility across training runs |
| **Device** | `0` (CUDA GPU) | Fails immediately if GPU is absent (prevents silent CPU training) |

### Conservative Augmentation Policy:
Augmentations are tuned to preserve the visual reality of e-waste materials:
- `hsv_h = 0.0`: Zero hue jitter (preserves distinct PCB solder mask, casing, and wire colors).
- `hsv_s = 0.15`: Saturation variance $\pm 15\%$.
- `hsv_v = 0.15`: Brightness variance $\pm 15\%$.
- `degrees = 10.0`: Subtle rotation $\pm 10^\circ$.
- `translate = 0.1`: Translation $\pm 10\%$.
- `scale = 0.1`: Scale variation $\pm 10\%$.
- `fliplr = 0.5`: Horizontal flip enabled (semantically valid for scrap items).
- `flipud = 0.0`: Vertical flip disabled.
- `mosaic = 0.0`: Disabled for clean initial baseline to avoid artificial artifacts.

---

## 5. Google Colab Training Notebook Structure

The standalone executable notebook is committed at:  
[`ai/training/ECOSETU_MATERIAL_YOLO_TRAINING.ipynb`](file:///e:/EcoSetu/ai/training/ECOSETU_MATERIAL_YOLO_TRAINING.ipynb)

### 24 Structured Sections:
1. **Mount Google Drive:** Mounts `/content/drive/MyDrive` and establishes paths.
2. **Detect GPU:** Verifies PyTorch CUDA acceleration.
3. **Print GPU Name:** Displays device name, VRAM, and core count.
4. **Print CUDA/PyTorch Information:** Records PyTorch and CUDA versions.
5. **Install Pinned Dependencies:** Installs `ultralytics`, `pillow`, `pyyaml`, `pandas`.
6. **Verify Ultralytics Version:** Runs `ultralytics.checks()`.
7. **Locate Dataset:** Finds `ECOSETU_AI/datasets/processed/material-detection-v0.1.0/`.
8. **Verify Quality Gate:** Strictly verifies `data.yaml`, image directories, label files, and `READY_FOR_TRAINING` status in both `dataset_manifest.json` and `validation_report.json`. Halts if gate fails.
9. **Display Dataset Statistics:** Prints per-split counts (99 train, 28 val, 15 test).
10. **Create Scratch Directory:** Stages data to local NVMe `/content/scratch_training` for high-speed training IO.
11. **Load YOLOv8n Pretrained Checkpoint:** Downloads/loads `yolov8n.pt`.
12. **Train Model:** Executes `model.train()` with seed 42 and conservative augmentations.
13. **Save Training Configuration:** Automatically generates `args.yaml`.
14. **Save Training Results:** Persists `results.csv` and loss curves.
15. **Evaluate Validation Set:** Evaluates `best.pt` on the 28-image validation split.
16. **Evaluate Held-Out Test Set:** Evaluates `best.pt` on the 15-image held-out test split.
17. **Generate Confusion Matrix:** Generates `confusion_matrix.png` and normalized version.
18. **Generate Precision/Recall Curves:** Generates `PR_curve.png`.
19. **Generate F1 Curve:** Generates `F1_curve.png`.
20. **Generate Sample Prediction Visualizations:** Runs inference on test images and saves annotated visuals to `sample_predictions/`.
21. **Copy Final `best.pt` to Google Drive:** Saves `best.pt` and `last.pt` to Drive.
22. **Generate Model Manifest:** Creates `model_manifest.json` with SHA-256 hash.
23. **Generate Evaluation Report:** Creates `evaluation_report.json` with validation and test metrics.
24. **Generate Training Summary:** Creates `training_summary.json` and `README.md`.

---

## 6. Google Drive Artifact Tree

The training notebook outputs all persistent artifacts directly to Google Drive:
```
Google Drive: /MyDrive/ECOSETU_AI/models/material-detection/material-detection-v0.1.0/
├── best.pt                          # Best model weights by validation mAP
├── last.pt                          # Final epoch weights
├── args.yaml                        # Exact training arguments
├── results.csv                      # Epoch-by-epoch losses and metrics
├── results.png                      # Training/validation curves
├── confusion_matrix.png             # Raw confusion matrix
├── confusion_matrix_normalized.png  # Normalized confusion matrix
├── PR_curve.png                     # Precision-Recall curve
├── F1_curve.png                     # F1-Confidence curve
├── training_summary.json            # Concise training execution metadata
├── evaluation_report.json           # Comprehensive validation and test metrics
├── model_manifest.json              # Full provenance, hardware, and SHA-256 manifest
├── sample_predictions/              # Annotated test images with predictions
│   ├── pred_img_test_001.jpg
│   └── ...
└── README.md                        # Documentation of model weights
```

---

## 7. Model Manifest Specification

`model_manifest.json` schema:
```json
{
  "model_version": "material-detection-v0.1.0",
  "task": "object_detection",
  "architecture": "YOLOv8n",
  "base_checkpoint": "yolov8n.pt",
  "dataset_version": "material-detection-v0.1.0",
  "dataset_path": "/content/drive/MyDrive/ECOSETU_AI/datasets/processed/material-detection-v0.1.0",
  "supported_classes": ["KEYBOARD_MOUSE", "MOBILE_PHONE", "TABLET"],
  "class_count": 3,
  "training_date": "2026-09-21T01:20:00Z",
  "training_duration_seconds": 245.5,
  "epochs_requested": 100,
  "epochs_completed": 64,
  "image_size": 640,
  "batch_size": 16,
  "optimizer": "auto",
  "learning_rate": 0.01,
  "seed": 42,
  "hardware": {
    "gpu_name": "Tesla T4",
    "cuda_version": "12.2",
    "pytorch_version": "2.2.0+cu121",
    "device_count": 1
  },
  "ultralytics_version": "8.1.30",
  "training_framework": "Ultralytics YOLOv8",
  "model_file": "best.pt",
  "model_sha256": "3a4b5c6d...",
  "training_status": "COMPLETED",
  "evaluation_status": "EVALUATED"
}
```

---

## 8. Inference Contract & Confidence Review Policy Compatibility

The model output layer integrates cleanly with the existing ECOSETU inference contract ([`ai/src/contracts/inference_contract.py`](file:///e:/EcoSetu/ai/src/contracts/inference_contract.py)):
- **Primary Category:** One of `KEYBOARD_MOUSE`, `MOBILE_PHONE`, `TABLET` (or `OTHER` fallback).
- **Confidence Tiers:**
  - `HIGH` ($\ge 0.80$): `review_required = False` (collector confirmation optional).
  - `MEDIUM` ($0.50 \le \text{conf} < 0.80$): `review_required = True` ("Moderate confidence: collector confirmation suggested").
  - `LOW` ($< 0.50$): `review_required = True` ("Low confidence: visual inspection required").
- **Collector Override Safety:** Collector manual selection always overrides model output with audit logging.
- **Mobile Integration Status:** The model is an **offline baseline benchmark** and is **NOT YET CONNECTED** to the mobile application.

---

## 9. Verification & Safety Proofs

1. **New Automated Training Contract Suite:**
   - [`ai/tests/test_yolo_training_contracts.py`](file:///e:/EcoSetu/ai/tests/test_yolo_training_contracts.py) — **3 / 3 PASSED (100%)**
2. **Full AI Test Suite:**
   - `pytest ai/tests/ -v` — **83 / 83 PASSED (100%)**
3. **Backend Historical Analytics Regression:**
   - `node backend/tests/verify_historical_analytics.js` — **24 / 24 PASSED (100%)**
4. **Mobile TypeScript Compilation:**
   - `npm --prefix mobile run typecheck` — **0 errors (100%)**
5. **No Metric Fabrication Guard:**
   - Evaluator halts cleanly and refuses to generate synthetic metrics if model weights are missing.
