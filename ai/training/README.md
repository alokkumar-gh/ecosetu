# EcoSetu — AI Training & Evaluation Workflow

Canonical References:
- `docs/11_AI_EWASTE_DETECTION.md` — AI Architecture & Category Definitions
- `docs/12_AI_TRAINING_PLAN.md` — Dataset Collection, Training & Evaluation Strategy
- `docs/13_SECURITY_PRIVACY.md` — Security & Upload Constraints

---

## 1. Overview

The EcoSetu AI detection subsystem uses a fine-tuned **YOLOv8n-cls** (nano classification) model to classify single-item e-waste photos captured by citizens. This training infrastructure provides the scripts, configurations, and validation tools required to train and evaluate the model once a properly curated dataset is assembled.

> **Important Constraints:**
> - The model is an **assistive tool** — platform operation never depends exclusively on inference.
> - The training target consists of **10 canonical categories** (`MOBILE_PHONE`, `LAPTOP`, `DESKTOP`, `TABLET`, `MONITOR`, `PRINTER`, `KEYBOARD_MOUSE`, `CABLE_CHARGER`, `BATTERY`, `CIRCUIT_BOARD`).
> - The category `OTHER` serves as a catch-all in application logic and is not an active training class.
> - No arbitrary external datasets or paid services are required or approved beyond the open-source and manual collection methods documented in `docs/12_AI_TRAINING_PLAN.md`.

---

## 2. Step-by-Step Training Workflow

### Step 1: Obtain a Compatible Dataset
In accordance with `docs/12_AI_TRAINING_PLAN.md`:
- **Open Images Dataset V7:** Extract open-source labeled images for electronics (Laptop, Mobile phone, Computer monitor, Computer keyboard, Computer mouse, Printer, Tablet computer).
- **Manual Smartphone Photography:** Capture 50–100 real photos per class across varied lighting, angles, and real-world conditions (scratched, dusty, disassembled).
- Target dataset size: **200–500 images per class** (total: ~2,000–4,000 images).

### Step 2: Organize the Local Dataset Structure
Place collected images into the local classification directory structure:

```text
ai/datasets/
├── raw/                         # Raw collected images by category
│   ├── MOBILE_PHONE/
│   ├── LAPTOP/
│   └── ...
└── processed/                   # Cleaned and split dataset
    ├── train/                   # 70% of dataset
    │   ├── MOBILE_PHONE/
    │   ├── LAPTOP/
    │   └── ...
    ├── val/                     # 15% of dataset
    │   ├── MOBILE_PHONE/
    │   └── ...
    └── test/                    # 15% of dataset
        ├── MOBILE_PHONE/
        └── ...
```

### Step 3: Run Dataset Validation
Before executing training, run the dataset validation tool to verify image integrity, magic byte signatures, directory structure, and class balance:

```bash
python ai/training/validate_dataset.py --data-dir ai/datasets/processed --config ai/configs/dataset.yaml
```

The script verifies:
- All required splits (`train`, `val`, `test`) exist.
- Folders strictly correspond to the 10 canonical categories.
- Images have valid extensions (`.jpg`, `.jpeg`, `.png`) and valid binary headers (`FF D8 FF` for JPEG, `89 50 4E 47` for PNG).
- Minimum recommended class counts are satisfied (>= 100 images per class).

### Step 4: Fix Genuine Dataset Issues
- Remove corrupt, low-resolution, or unreadable images flagged by the validator.
- Re-balance any under-represented classes using augmentation or additional collection.
- Re-run `validate_dataset.py` until the status is `PASSED`.

### Step 5: Execute YOLOv8 Fine-Tuning
Run the training script (locally on modern CPU/GPU or Google Colab T4 GPU):

```bash
python ai/training/train.py --data ai/datasets/processed --epochs 100 --batch 32 --imgsz 224
```

Hyperparameters strictly match `docs/12_AI_TRAINING_PLAN.md` Section 8.2:
- **Base Architecture:** `yolov8n-cls.pt` (ImageNet pretrained nano variant, ~3.5M parameters, ~6MB)
- **Input Resolution:** `224x224`
- **Batch Size:** `32`
- **Epochs:** `100` with early stopping (`patience=10`)
- **Learning Rate:** `0.001` (initial) with AdamW optimizer
- **Seed:** `42`

Upon successful completion, the script automatically exports the best weights to:
`ai/models/ewaste_classifier_v1.0.pt`

### Step 6: Evaluate the Trained Model
Evaluate the exported model against the held-out test split:

```bash
python ai/training/evaluate.py --model ai/models/ewaste_classifier_v1.0.pt --data ai/datasets/processed --split test
```

Expected targets per `docs/11_AI_EWASTE_DETECTION.md` Section 9.1:
- Overall Top-1 Accuracy: > 70%
- Per-class Precision / Recall: > 60%
- Speed: < 500ms per image on CPU
Metrics will be recorded in `ai/models/ewaste_classifier_v1.0_metrics.json`.

### Step 7: Verify Real Inference
With `ai/models/ewaste_classifier_v1.0.pt` in place, run the test suites:

```bash
# 1. Test FastAPI microservice loading and real inference:
pytest ai/tests/test_ai_service.py -v

# 2. Test Express backend integration:
node backend/tests/verify_ai.js
```

### Step 8: Ensure Target Artifact Location
Verify that the final production model artifact is positioned at:
`ai/models/ewaste_classifier_v1.0.pt`

Once located here, the FastAPI microservice (`ai/src/main.py`) will automatically load the model on startup and serve predictions to the backend.
