# EcoSetu — AI Training Plan

> **Reference:** All terminology follows `00_PROJECT_INDEX.md` and `11_AI_EWASTE_DETECTION.md`.

---

## 1. Overview

This document provides a practical, step-by-step training plan for the e-waste image classification model. It is designed for a student team with limited ML experience and zero budget.

**Key principle:** Start simple, evaluate honestly, iterate only if needed.

---

## 2. Phase 1 — Dataset Preparation

### Step 1.1: Collect Images from Open Sources

| Source | How to Access | Expected Yield |
|--------|-------------|:--------------:|
| Open Images Dataset V7 | Download via [FiftyOne](https://docs.voxel51.com/user_guide/dataset_zoo.html) or [CVDF](https://storage.googleapis.com/openimages/web/download.html) | 500-2000 images |
| Kaggle "Electronics" datasets | Search Kaggle for e-waste / electronics classification datasets | 200-500 images |
| Manual photography | Take photos of real devices using smartphone | 50-100 per class |

**Open Images relevant labels:** Laptop, Mobile phone, Computer monitor, Computer keyboard, Computer mouse, Printer, Tablet computer

**Example download commands (documentation only — not executed):**

```bash
# Using FiftyOne (Python)
pip install fiftyone
# Then in Python:
# import fiftyone.zoo as foz
# dataset = foz.load_zoo_dataset("open-images-v7", split="train",
#     label_types=["classifications"],
#     classes=["Laptop", "Mobile phone", "Computer monitor"])
```

### Step 1.2: Manually Photograph Items

Take 50-100 photos per class using a smartphone:

| Variation | Why |
|-----------|-----|
| Different angles (front, side, top) | Angle robustness |
| Different backgrounds (desk, floor, hand) | Background invariance |
| Different lighting (natural, indoor, dim) | Lighting robustness |
| Single items (not multiple) | Matches classification task |
| Real condition (scratched, dusty, old) | Matches real-world input |

### Step 1.3: Organize Dataset

```
dataset/
├── raw/                    # All collected images before splitting
│   ├── MOBILE_PHONE/
│   │   ├── open_images_001.jpg
│   │   ├── manual_001.jpg
│   │   └── ...
│   ├── LAPTOP/
│   ├── DESKTOP/
│   ├── TABLET/
│   ├── MONITOR/
│   ├── PRINTER/
│   ├── KEYBOARD_MOUSE/
│   ├── CABLE_CHARGER/
│   ├── BATTERY/
│   └── CIRCUIT_BOARD/
└── processed/              # After cleaning and splitting
    ├── train/
    ├── val/
    └── test/
```

---

## 3. Phase 2 — Dataset Inspection

### Step 2.1: Count Images Per Class

Create a simple inventory:

| Class | Image Count | Meets Minimum (100)? |
|-------|:-----------:|:--------------------:|
| MOBILE_PHONE | ? | ? |
| LAPTOP | ? | ? |
| ... | ... | ... |

### Step 2.2: Quality Audit

Manually review images and remove:

- Completely blurry images
- Images where the target item is not visible
- Images with incorrect labels
- Exact duplicates
- Images with watermarks covering the item
- Illustrations/drawings/clipart (keep photos only)

### Step 2.3: Decision Point

| Condition | Action |
|-----------|--------|
| All classes have ≥100 images | Proceed with all 10 classes |
| Some classes have <100 images | Apply heavy augmentation OR merge with similar class OR exclude from model |
| Total dataset <500 images | Consider using pretrained model without fine-tuning; manual selection only |

---

## 4. Phase 3 — Class Definition

### Final Class List

Based on dataset inspection, finalize which classes to include:

| Class | Include? | Decision Criteria |
|-------|:--------:|-------------------|
| MOBILE_PHONE | ✅ | Sufficient data, distinct shape |
| LAPTOP | ✅ | Sufficient data, distinct shape |
| DESKTOP | ✅ | Sufficient data |
| TABLET | ⚠️ | Include if ≥100 images; otherwise merge with MOBILE_PHONE |
| MONITOR | ✅ | Sufficient data |
| PRINTER | ✅ | Sufficient data |
| KEYBOARD_MOUSE | ✅ | Sufficient data |
| CABLE_CHARGER | ⚠️ | Include only if ≥100 images; may perform poorly |
| BATTERY | ⚠️ | Include only if ≥100 images; may perform poorly |
| CIRCUIT_BOARD | ⚠️ | Include only if ≥100 images |

---

## 5. Phase 4 — Annotation Verification

For classification, annotation = placing images in the correct folder.

### Verification Process

1. Randomly sample 50 images from each class
2. Verify each is correctly labeled
3. If >5% error rate → re-audit entire class
4. Fix misplaced images

---

## 6. Phase 5 — Train/Validation/Test Split

### Splitting Rules

1. **70/15/15** split (train/val/test)
2. Stratified — maintain class proportions in each split
3. Random seed = 42 (reproducibility)
4. Ensure no data leakage (same item photographed multiple times → all in same split)

**Example process (documentation only):**

```bash
# Using a Python script:
# python scripts/split_dataset.py --input dataset/raw --output dataset/processed --ratio 70:15:15 --seed 42
```

### Verify Split

| Class | Train | Val | Test | Total |
|-------|:-----:|:---:|:----:|:-----:|
| MOBILE_PHONE | ? | ? | ? | ? |
| ... | ... | ... | ... | ... |

---

## 7. Phase 6 — Baseline Model

### Step 7.1: Test Pretrained YOLOv8 Without Fine-Tuning

Before training, test the pretrained model to establish a baseline:

**Why:** YOLOv8n-cls pretrained on ImageNet already knows some electronics classes. Testing it first tells you how much fine-tuning actually helps.

**Example (documentation only):**

```python
# from ultralytics import YOLO
# model = YOLO('yolov8n-cls.pt')
# results = model.predict('test_image.jpg')
# print(results[0].probs)
```

### Step 7.2: Record Baseline Metrics

| Metric | Pretrained (No Fine-Tuning) |
|--------|:---------------------------:|
| Overall accuracy | ? |
| Per-class accuracy | ? |

If pretrained accuracy is already >60%, fine-tuning should improve it significantly.

---

## 8. Phase 7 — Training

### Training Configuration

**Example training command (documentation only):**

```python
# from ultralytics import YOLO
#
# model = YOLO('yolov8n-cls.pt')  # Load pretrained
# results = model.train(
#     data='dataset/processed',
#     epochs=100,
#     imgsz=224,
#     batch=32,
#     patience=10,        # Early stopping
#     lr0=0.001,           # Initial learning rate
#     project='runs/classify',
#     name='ewaste_v1',
#     pretrained=True,
#     seed=42,
# )
```

### Training Monitoring

Watch for:

| Signal | Meaning | Action |
|--------|---------|--------|
| Train loss decreasing, val loss decreasing | Model is learning | Continue |
| Train loss decreasing, val loss increasing | Overfitting | Stop; reduce epochs; add regularization |
| Both losses plateau early | Underfitting | Try larger model (yolov8s-cls); add more data |
| Loss is NaN | Training crashed | Reduce learning rate |

### Training on Google Colab

1. Upload dataset to Google Drive
2. Open new Colab notebook
3. Select T4 GPU runtime
4. Mount Drive
5. Install ultralytics: `pip install ultralytics`
6. Run training
7. Download best model weights

---

## 9. Phase 8 — Evaluation

### Step 9.1: Evaluate on Test Set

**Example (documentation only):**

```python
# model = YOLO('runs/classify/ewaste_v1/weights/best.pt')
# metrics = model.val(data='dataset/processed', split='test')
# print(f"Top-1 Accuracy: {metrics.top1}")
# print(f"Top-5 Accuracy: {metrics.top5}")
```

### Step 9.2: Generate Confusion Matrix

Examine which classes are confused with each other. Focus on:

- Highest off-diagonal values (most common misclassifications)
- Classes with low recall (model misses them)
- Classes with low precision (model falsely predicts them)

### Step 9.3: Record Results

| Metric | Value |
|--------|:-----:|
| Overall top-1 accuracy | ? |
| Overall top-2 accuracy | ? |
| Per-class precision | ? |
| Per-class recall | ? |
| Per-class F1 | ? |
| Average inference time | ? |

**Document actual numbers — do not fabricate results.**

---

## 10. Phase 9 — Error Analysis

### Step 10.1: Review Misclassified Images

For each misclassification:

1. Was the label correct? (if wrong label → fix dataset, not model)
2. Is the image ambiguous? (could be multiple classes → acceptable error)
3. Is the image low quality? (blurry/dark → expected failure mode)
4. Is there a systematic pattern? (e.g., all tablets predicted as phones)

### Step 10.2: Common Fixes

| Problem | Fix |
|---------|-----|
| Systematic confusion between two classes | Add more training images for the confused classes; ensure variety |
| Low accuracy on one class | More data + augmentation for that class |
| Overall low accuracy | More data; try yolov8s-cls (small instead of nano); longer training |
| Overfitting | More augmentation; dropout; fewer epochs |

---

## 11. Phase 10 — Iteration (If Needed)

If results are unsatisfactory:

| Iteration | Action | Expected Improvement |
|-----------|--------|---------------------|
| 1 | Add more training images for worst classes | +5-10% accuracy |
| 2 | Increase augmentation | +3-5% accuracy |
| 3 | Try yolov8s-cls (larger model) | +5-10% accuracy |
| 4 | Remove worst-performing classes | Higher accuracy on remaining classes |

**Stop iterating when:**
- Overall accuracy >70% OR
- Time budget is exhausted OR
- Manual selection fallback is acceptable

Remember: **the AI is assistive, not critical.** A model that correctly identifies 7 out of 10 items still saves users time.

---

## 12. Phase 11 — Model Export

### Export Best Model

**Example (documentation only):**

```python
# model = YOLO('runs/classify/ewaste_v1/weights/best.pt')
# # Keep as .pt for PyTorch/Ultralytics inference
# # Or export to ONNX for broader compatibility:
# model.export(format='onnx')
```

### Model Artifact

```
ai/models/
├── ewaste_classifier_v1.0.pt          # Best model weights
├── ewaste_classifier_v1.0_metrics.json # Evaluation results
└── class_names.json                    # Ordered class list
```

`class_names.json` example:
```json
["MOBILE_PHONE", "LAPTOP", "DESKTOP", "TABLET", "MONITOR", "PRINTER", "KEYBOARD_MOUSE", "CABLE_CHARGER", "BATTERY", "CIRCUIT_BOARD"]
```

---

## 13. Phase 12 — Integration

### Step 13.1: Deploy AI Service

1. Copy model file to `ai/models/`
2. Update `ai/src/config.py` with model path and version
3. Start FastAPI server
4. Verify with test request

### Step 13.2: Backend Integration

1. Configure `AI_SERVICE_URL` environment variable
2. Backend's `aiService.js` sends images to AI service
3. Test end-to-end: upload image → receive prediction

### Step 13.3: Frontend Integration

1. "Analyze with AI" button on item submission form
2. Show prediction card with confidence
3. Accept/Override buttons
4. Graceful fallback when AI unavailable

---

## 14. When a Large Dataset Is Unnecessary

For this project:

| Reason | Explanation |
|--------|-------------|
| **Transfer learning** | Pretrained ImageNet features already encode visual patterns for electronics |
| **Few classes** | Only 10 classes (vs. ImageNet's 1000); simpler decision boundary |
| **Classification, not detection** | No need for spatial annotation (bounding boxes) |
| **Assistive, not authoritative** | Errors are acceptable; users always override |
| **Prototype scope** | Demonstrating capability, not achieving production quality |

**Bottom line:** 200-500 images per class is sufficient for a fine-tuned classification model that provides useful (not perfect) predictions.

---

*All terminology in this document follows `00_PROJECT_INDEX.md`.*
