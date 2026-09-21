# ECOSETU YOLO V1 VS V2 CONTROLLED EXPERIMENT COMPARISON

> **Status:** `BASELINE V2 — EVALUATION REQUIRED`  
> **Target Dataset:** `material-detection-v0.1.0` (142 authentic images: 99 train, 28 val, 15 test)  
> **Classes:** `0: KEYBOARD_MOUSE`, `1: MOBILE_PHONE`, `2: TABLET`  
> **Output Architecture:** YOLOv8n (nano detection backbone)  
> **Experiment Isolation:** V1 stored in `material-detection-v0.1.0/`; V2 stored in `material-detection-v0.2.0/`

---

## 1. Experimental Setup & Controlled Hypotheses

This experiment is strictly controlled: **architecture, dataset, seed, and base weights remain identical**. Only the training dynamics are adjusted based on the V1 diagnostic findings.

| Parameter | Baseline V1 (`material-detection-v0.1.0`) | Experiment V2 (`material-detection-v0.2.0`) | Experimental Rationale |
| :--- | :--- | :--- | :--- |
| **Model Architecture** | YOLOv8n (`yolov8n.pt`) | YOLOv8n (`yolov8n.pt`) | Controlled architecture |
| **Dataset & Annotations** | 142 authentic images (99/28/15) | 142 authentic images (99/28/15) | Zero dataset modification |
| **Initial LR (`lr0`)** | `0.01` (Ultralytics default) | `0.001` (Conservative 10x reduction) | Prevents gradient destabilization on 99-image split |
| **Final LR Ratio (`lrf`)** | `0.01` | `0.01` | Controlled decay schedule |
| **Early Stopping (`patience`)** | `20` epochs (stopped at Ep 21) | `30` epochs | Allows optimizer to traverse small-dataset plateaus |
| **Optimizer** | `auto` | `auto` | Recommended by Ultralytics |
| **Deterministic Seed** | `42` | `42` | Exact reproducibility |
| **Augmentation Policy** | Moderate (`mosaic=0.0`, `hsv_h=0.0`) | Moderate (`mosaic=0.0`, `hsv_h=0.0`) | Preserves electronic hardware physical realism |
| **Threshold Selection** | Fixed `conf=0.25` | Validation-derived F1 operating point | Selected on validation partition ONLY |

---

## 2. Baseline V1 Measured Reference Metrics

Evaluated during the V1 Post-Training Diagnostic:

### Validation Split (28 Images):
- **mAP50:** `0.2386`
- **mAP50-95:** `0.1725`
- **Raw Precision (`conf=0.001`):** `0.0034`
- **Raw Recall (`conf=0.001`):** `1.0000`

### Held-Out Test Split (15 Images):
- **mAP50:** `0.1709`
- **mAP50-95:** `0.0950`
- **Operational Precision (`conf >= 0.25`):** `0.4118` (14 TP, 20 FP)
- **Operational Recall (`conf >= 0.25`):** `0.9333` (14/15 objects detected)
- **High-Confidence Precision (`conf >= 0.50`):** `0.6875` (11 TP, 5 FP)
- **High-Confidence Recall (`conf >= 0.50`):** `0.7333` (11/15 objects detected)

---

## 3. Validation-Driven Operational Threshold Selection Protocol

In the V2 experiment, the operational confidence threshold is determined **strictly from the validation partition** to avoid data leakage:

$$\text{F1} = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$$

The notebook computes the validation tradeoff across:
- `conf >= 0.10`
- `conf >= 0.25`
- `conf >= 0.50`
- `conf >= 0.75`

The threshold achieving the highest validation F1 score is selected and locked **before** touching the held-out test split.

---

## 4. Production Readiness Determination

```
================================================================================
FINAL DETERMINATION: BASELINE V2 — EVALUATION REQUIRED
================================================================================
```

### Constraints:
1. Model V2 is an experimental baseline improvement. It is **NOT** marked production-ready.
2. Deployment to the mobile edge app remains gated until real-world testing on diverse field collection backgrounds.
3. Baseline V1 weights and artifacts remain permanently preserved at `/content/drive/MyDrive/ECOSETU_AI/models/material-detection/material-detection-v0.1.0/`.
