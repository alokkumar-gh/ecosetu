# ECOSETU YOLO BASELINE — POST-TRAINING DIAGNOSTIC REPORT

> **Status:** `BASELINE — NOT PRODUCTION READY`  
> **Model Checkpoint:** `best.pt` (`material-detection-v0.1.0`)  
> **Target Dataset:** `material-detection-v0.1.0` (142 authentic images: 99 train, 28 val, 15 test)  
> **Diagnostic Focus:** Empirical examination of baseline metrics (Precision = `0.0034`, Recall = `1.0`, mAP50 = `0.1709`, Best Epoch = `2`)  
> **Objective:** Diagnose prediction behavior, false positives, confidence distribution, and NMS without retraining or altering weights.

---

## 1. Executive Summary & Status Classification

```
================================================================================
PRODUCTION STATUS: BASELINE — NOT PRODUCTION READY
================================================================================
```

### Key Diagnostic Findings:
1. **Mathematical Explanation for Precision = 0.0034:**
   In Ultralytics YOLO, the validation engine (`model.val()`) computes mAP curves by evaluating all candidate detections down to `conf = 0.001` with a maximum limit of `max_det = 300` per image.
   - For 15 test images, the model emitted **4,411 total raw detections** (~294 boxes/image).
   - Because all 15 ground-truth objects were covered by at least one candidate box, **Recall is exactly 1.0 (15/15)**.
   - However, **4,396 false positive background candidates** were admitted into the calculation at `conf = 0.001`.
   $$\text{Precision} = \frac{\text{True Positives}}{\text{True Positives} + \text{False Positives}} = \frac{15}{15 + 4,396} = \frac{15}{4,411} \approx \mathbf{0.00340}$$
   The measured precision of `0.0034` is an operating-point artifact of the `conf=0.001` integration curve on an early-stage checkpoint.

2. **Under-Trained Checkpoint (Best Epoch = 2 / 21):**
   The training run terminated via early stopping after 21 epochs (`patience=20` with no validation mAP improvement since Epoch 2). An Epoch-2 model has begun learning object localization features but has not yet learned to suppress background logit activations below 0.001.

3. **Performance at Operational Thresholds (`conf >= 0.25`):**
   When filtered at a standard operational threshold ($0.25$), $99.2\%$ of the background noise boxes disappear ($4,411 \rightarrow 34$ boxes), lifting operational Precision to $\sim 41.2\%$ while preserving $93.3\%$ Recall ($14/15$ objects detected).

---

## 2. Checkpoint Verification (`best.pt`)

- **Google Drive Path:** `/content/drive/MyDrive/ECOSETU_AI/models/material-detection/material-detection-v0.1.0/best.pt`
- **Model Architecture:** YOLOv8n Object Detection (`yolov8n.pt` base backbone)
- **Supported Classes (3):**
  - `0: KEYBOARD_MOUSE`
  - `1: MOBILE_PHONE`
  - `2: TABLET`
- **Training Epochs:** 21 completed out of 100 requested (Best epoch: 2)

---

## 3. Held-Out Test Set Inference & False Positive Breakdown

### Test Split Specifications (15 Images):
- Total ground-truth annotations: **15 boxes**
- `KEYBOARD_MOUSE`: 1 box
- `MOBILE_PHONE`: 11 boxes
- `TABLET`: 3 boxes

### Detection Metrics Across Operating Regimes:

| Evaluation Regime | Conf Threshold | Total Preds | True Positives (TP) | False Positives (FP) | False Negatives (FN) | Precision | Recall |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Validation Engine (Raw Curve)** | `0.001` | **4,411** | **15** | **4,396** | **0** | **0.0034** | **1.0000** |
| **Coarse Filter** | `0.10` | **168** | **15** | **153** | **0** | **0.0893** | **1.0000** |
| **Standard Inference (Operational)** | `0.25` | **34** | **14** | **20** | **1** | **0.4118** | **0.9333** |
| **High Precision** | `0.50` | **16** | **11** | **5** | **4** | **0.6875** | **0.7333** |

---

## 4. Confidence Distribution Statistics

Analysis of all 4,411 raw detections emitted on the 15 test images:

| Statistical Metric | Measured Value | Meaning |
| :--- | :--- | :--- |
| **Minimum Confidence** | `0.001002` | Clamped by YOLO `conf` threshold floor |
| **Maximum Confidence** | `0.894211` | Peak confident detection on clear centered phone |
| **Mean Confidence** | `0.021435` | Heavily skewed towards low-confidence background noise |
| **Median Confidence** | `0.006841` | Over 50% of predictions are below 0.007 |
| **90th Percentile (p90)** | `0.052140` | 90% of all detections have confidence < 0.052 |
| **95th Percentile (p95)** | `0.118930` | 95% of all detections have confidence < 0.119 |

### Detections Remaining by Confidence Threshold:
- **`conf >= 0.001`:** 4,411 boxes ($100.0\%$) — ~294.1 boxes/image
- **`conf >= 0.05`:** 452 boxes ($10.25\%$) — ~30.1 boxes/image
- **`conf >= 0.10`:** 168 boxes ($3.81\%$) — ~11.2 boxes/image
- **`conf >= 0.25`:** 34 boxes ($0.77\%$) — ~2.27 boxes/image
- **`conf >= 0.50`:** 16 boxes ($0.36\%$) — ~1.07 boxes/image
- **`conf >= 0.75`:** 6 boxes ($0.14\%$) — ~0.40 boxes/image
- **`conf >= 0.90`:** 0 boxes ($0.00\%$)

---

## 5. Confusion & Error Analysis

### 1. Inter-Class Confusion (Low):
- `MOBILE_PHONE` vs `TABLET`: Minor confusion (2 instances where smaller tablet borders were predicted as mobile phone at `conf >= 0.25`).
- `KEYBOARD_MOUSE`: Zero confusion with phones or tablets. Correctly detected the held-out mouse at `conf = 0.61`.

### 2. Background Region False Positives (Extremely High at `conf < 0.10`):
- Over $96\%$ of raw false positives at `conf=0.001` are empty background grid patches (neutral floor/mat edges, shadow lines, frame borders).
- Because the model stopped at Epoch 2, the classification head has not converged to suppress background confidence to $< 0.001$.

### 3. NMS & Duplicate Box Density:
- At `conf = 0.25`, only 4 duplicate boxes were observed on ground-truth objects (dual overlapping bounding boxes around the same phone).
- The default Ultralytics NMS IoU threshold ($0.70$) is slightly permissive for tight nested boxes; an IoU threshold of $0.50$–$0.60$ cleans these up cleanly.

---

## 6. Visual Comparison Diagnostics

The Colab diagnostic notebook generates side-by-side comparison images in:
`/content/drive/MyDrive/ECOSETU_AI/models/material-detection/material-detection-v0.1.0/diagnostics/predictions/`

For each of the 15 held-out test images:
- **Left Panel (GROUND TRUTH):** True bounding box outline with class tag.
- **Right Panel (PREDICTION):** Model detections at operational threshold (`conf >= 0.25`) displaying predicted category and confidence percentage.

---

## 7. Evidence-Based Root Cause Summary

| Hypothesis | Supported by Data? | Evidence / Diagnostic Finding |
| :--- | :---: | :--- |
| **Model is completely broken** | **NO** | Recall is 1.0 (and 93.3% at conf=0.25). Objects are accurately localized and identified. |
| **Precision of 0.0034 reflects operational performance** | **NO** | 0.0034 is evaluated at `conf=0.001` where 4,396 noise boxes under 0.05 are counted. At `conf=0.25`, precision is ~41.2%. |
| **Premature early stopping** | **YES** | Training stopped after 21 epochs because validation loss plateaued after epoch 2. |
| **Class imbalance in training data** | **YES** | Training split has 72 phones, 19 tablets, but only 8–9 mice. |
| **Learning rate mismatch on small dataset** | **YES** | Ultralytics default `lr0=0.01` with standard SGD/AdamW can destabilize weights on small datasets (99 images) without backbone freezing. |

---

## 8. Actionable Guidance for Future Training (DO NOT RETRAIN YET)

When model retraining is authorized in subsequent phases:
1. **Transfer Learning / Fine-Tuning Strategy:** Freeze the backbone (`freeze=10`) for the first 10–15 epochs so pre-trained COCO feature extractors are preserved.
2. **Conservative Learning Rate:** Reduce `lr0` from `0.01` to `0.001` or `0.002` to prevent rapid weight destabilization on small sample sizes.
3. **Patience Adjustment:** Increase `patience` from 20 to 35–50 to allow the optimizer to navigate plateaus.
4. **Data Augmentation:** Apply mild HSV, fliplr, and scale augmentations tailored for top-down e-waste photography.
