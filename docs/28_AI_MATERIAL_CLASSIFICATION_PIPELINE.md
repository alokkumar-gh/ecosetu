# EcoSetu — Material Classification Model: Dataset Inspection & YOLO Training Pipeline

> **SIH Problem Statement 26229 — Kabadiwala Connect**
>
> **Canonical Reference:** Follows `docs/11_AI_EWASTE_DETECTION.md`, `docs/12_AI_TRAINING_PLAN.md`, `docs/25_SIH_26229_REQUIREMENTS.md`, and `docs/27_AI_DATASET_FOUNDATION.md`.
>
> **Status:** PIPELINE & INSPECTION HARNESS OPERATIONAL — **NO MODEL TRAINED YET (DATASET NOT PRESENT)**.

---

## 1. Executive Summary & Objective

This document defines the architecture, inspection tool, training configuration, evaluation harness, Google Colab workflow, and inference contract for ECOSETU's **Material Classification Model Pipeline**.

It operationalizes the dataset foundation created in Prompt 18, enabling the platform to:
1. Thoroughly analyze candidate e-waste image datasets across image validity, annotation format (Classification vs Object Detection), class distribution, sample balance, and ambiguity.
2. Generate reproducible, deterministic YOLO configuration matching ECOSETU's **16 canonical categories**.
3. Execute lightweight fine-tuning (`yolov8n-cls` or `yolov8n`) with conservative, identity-preserving data augmentations.
4. Execute authentic model evaluation on held-out test splits without fabricating metrics.
5. Standardize future inference outputs with normalized bounding boxes, uncertainty handling (`REVIEW_REQUIRED`), and collector override safety guards.

---

## 2. Dataset Reality Check & Inspection Results

### Current Repository State
A complete inspection across the repository confirms:
- **No image datasets** are currently committed to git (by design, git ignores heavy binary directories).
- **No pre-existing YOLO/COCO/VOC annotation files** exist in the repository.
- **No model weights** (`.pt`, `.onnx`, `.tflite`) are committed.

### Pre-Training Dataset Inspection Tool
The inspection CLI (`ai/datasets/material-classification/scripts/inspect_dataset.py`) was executed against the dataset root:
```bash
python ai/datasets/material-classification/scripts/inspect_dataset.py --data ai/datasets/material-classification/processed
```

Output recorded in `dataset_inspection_report.json`:
- **Total Images:** 0
- **Total Annotations:** 0
- **Corrupt Images:** 0
- **Class Imbalance:** 0.0:1
- **Status:** Empty directory — no dataset present.

> [!IMPORTANT]
> **Strict Non-Fabrication Rule:**
> In strict compliance with project guidelines, **NO MODEL HAS BEEN TRAINED**, and **NO METRICS (accuracy, precision, mAP) HAVE BEEN FABRICATED**. The training and evaluation scripts refuse to run or produce dummy metrics until an authentic dataset is imported.

---

## 3. ECOSETU Authoritative Taxonomy Mapping

The model output layer maps exclusively to ECOSETU's 16 canonical `MaterialCategory` types:

| Index | Canonical Category | Description | Scrap Form Factor |
|:-----:|:-------------------|:------------|:------------------|
| 0 | `CRT` | Cathode ray tube displays | Bulky glass/funnel monitor/TV tubes |
| 1 | `LCD_PANEL` | Flat LCD/LED panels | Bare display modules, cracked laptop/TV screens |
| 2 | `PCB` | Printed circuit boards | Motherboards, RAM, graphics cards, IC logic |
| 3 | `CABLE` | Wiring & power cords | Copper cords, USB cables, harnesses, twisted wiring |
| 4 | `BATTERY` | Battery packs & cells | Li-ion, lead-acid, NiMH, swelling/damaged packs |
| 5 | `MOTOR` | Electric motors | Copper winding motors, fan drives, compressor pumps |
| 6 | `MAGNET_ASSEMBLY` | Hard drive & speaker magnets | Neodymium voice coils, stator assemblies |
| 7 | `MIXED_PLASTIC` | Device casings & frames | ABS/polycarbonate dismantled e-waste plastic |
| 8 | `MOBILE_PHONE` | Handheld mobile phones | Feature phones, smartphones |
| 9 | `LAPTOP` | Portable notebooks | Complete or partial laptop clamshells |
| 10 | `MONITOR` | Complete monitor units | Flat or CRT desktop computer displays |
| 11 | `PRINTER` | Desktop printing equipment | Inkjet, laser, dot-matrix, MFP units |
| 12 | `KEYBOARD_MOUSE` | Input peripherals | Keyboards, mice, trackballs |
| 13 | `DESKTOP_COMPUTER` | Tower/desktop computers | CPU towers, server blades, workstation cases |
| 14 | `TABLET` | Slate computers | iPads, Android tablets, e-readers |
| 15 | `OTHER` | Unclassified recyclables | E-waste items not matching the 15 specific categories |

**Ambiguity Guard:** Generic labels such as `"scrap"`, `"electronic"`, `"gadget"`, or `"e-waste"` are strictly rejected from automatic training labels and flagged for manual annotation review.

---

## 4. Model Architecture & Pipeline Selection

### Task Formulation: Classification vs Detection
- **Primary Formulation:** Single-item camera photographs taken by informal collectors or citizens are formulated as **image classification** (`yolov8n-cls`).
- **Object Detection Compatibility:** If the imported dataset provides bounding boxes (YOLO `.txt` or COCO `.json`), the pipeline seamlessly switches to `yolov8n` object detection.
- **Why YOLOv8 Nano?**
  - Ultra-lightweight: ~3.5M parameters (~6 MB weights).
  - Fast CPU latency: < 150ms per frame.
  - Exportable to ONNX and TFLite for on-device Android smartphone execution.

---

## 5. Training Configuration & Conservative Augmentations

Reproducible configuration defined in `ai/models/material-classifier/configs/yolo_baseline.yaml`:

```yaml
task: classify
model: yolov8n-cls.pt
imgsz: 224
epochs: 100
batch: 32
patience: 10
lr0: 0.001
optimizer: AdamW
seed: 42
device: cpu

# Conservative Augmentations (Preserve Material Identity)
hsv_h: 0.0       # Zero hue distortion (color is critical for PCB/cables)
hsv_s: 0.15      # Saturation +/- 15% (lighting variation)
hsv_v: 0.15      # Brightness +/- 15% (shadows/ambient light)
degrees: 10.0    # Small rotation +/- 10 degrees
translate: 0.1   # Translation +/- 10%
scale: 0.1       # Scale +/- 10%
fliplr: 0.5      # Horizontal flip (scrap has no canonical horizontal orientation)
flipud: 0.0      # No vertical flip
```

---

## 6. Google Colab Compute Workflow

Detailed step-by-step instructions are provided in `ai/training/COLAB_TRAINING_GUIDE.md`:
1. Mount Google Drive or upload prepared dataset zip.
2. Select runtime: **T4 GPU** (Free tier).
3. Install `ultralytics`, `pydantic`, `pyyaml`, `pillow`.
4. Run pre-flight dataset inspection: `inspect_dataset.py`.
5. Execute training with baseline hyperparameters.
6. Evaluate against untouched `test` split.
7. Compute SHA-256 checksum and export `material-classifier-v0.1.0.pt`.
8. Download weights into `ai/models/material-classifier/artifacts/`.

---

## 7. Future Inference Contract & Safety Architecture

Defined in `ai/src/contracts/inference_contract.py`:

```json
{
  "model_id": "material-classifier-v0.1.0",
  "model_version": "v0.1.0",
  "model_type": "classification",
  "timestamp": "2026-09-21T00:00:00Z",
  "primary_category": "PCB",
  "confidence": 0.92,
  "confidence_level": "HIGH",
  "review_required": false,
  "review_reason": null,
  "top_k": [
    { "category": "PCB", "confidence": 0.92 },
    { "category": "MIXED_PLASTIC", "confidence": 0.05 },
    { "category": "OTHER", "confidence": 0.03 }
  ],
  "latency_ms": 115,
  "device_info": "cpu",
  "user_override": null
}
```

### Safety Rules:
1. **Confidence Thresholds:**
   - `HIGH` (>= 0.80): High-confidence prediction.
   - `MEDIUM` (0.50 - 0.79): Triggers `review_required = true` ("Confirmation suggested").
   - `LOW` (< 0.50): Triggers `review_required = true` ("Visual inspection required").
2. **Collector Override:** The AI is strictly assistive. The collector's selected category always takes legal and transactional precedence. Model predictions never silently overwrite user inputs.

---

## 8. Google Drive Detection Dataset Build (`material-detection-v0.1.0`)

Prompt 22B fixed the Google Colab dataset preparation pipeline to establish a genuinely lightweight, authentic, and verified object detection dataset.

### Pipeline Architecture & Acquisition Fix (Prompt 22B)
In the initial notebook execution, the dataset build failed (`Total Images: 0`) because the notebook merely printed a wget placeholder command with an unmapped filename (`xbat_plus_weee_rgb.zip`) rather than programmatically acquiring the archives from Zenodo.

The Prompt 22B fix implemented the end-to-end programmatic acquisition engine:
1. **Zenodo API Record `18022530`**: Queries metadata directly, locating the official archives:
   - `raw_XBAT+_v1.0_RGB_train.zip` (59.67 MB, md5: `e5189970528274b87c38e3255ae61236`)
   - `raw_XBAT+_v1.0_RGB_test.zip` (15.79 MB, md5: `1e6a5219fd96c1b14a19f8f552354afe`)
   - **Total download:** ~75.46 MB (well below the 1 GB ceiling).
2. **Exclusion of Industrial X-Ray & Deferral of Large Roboflow**:
   - X-ray scans (`HQ` and `VQ` subsets) are strictly excluded because they represent industrial NTB EZ-240 dual-energy X-ray scanner data that does not match optical smartphone cameras.
   - Large Roboflow collections are deferred to prevent storage exhaustion and licensing dilution.
3. **Genuine Source Metrics vs. Retained Dataset**:
   - **Extracted Source:** Exactly 421 optical RGB webcam images (330 train + 91 test) across 15 device classes.
   - **Canonical Class Mapping:**
     - `ComputerMouse` (Class 1) -> `KEYBOARD_MOUSE` (12 instances)
     - `iPad` (Class 7) -> `TABLET` (27 instances)
     - `MobilePhone` (Class 9) -> `MOBILE_PHONE` (103 instances)
     - Out-of-scope appliances (`RemoteControl`, `AlarmClock`, `E-Toothbrush`, etc.) are returned as `UNMAPPED` and excluded without invalid coercion.
   - **Retained Dataset:** 142 valid, deduplicated RGB images (~30 MB physical disk footprint).
   - **Dynamic `data.yaml`:** Generated with `nc: 3` containing ONLY the classes with verified genuine data (`KEYBOARD_MOUSE`, `MOBILE_PHONE`, `TABLET`). Zero-annotation classes are removed and recorded as `INSUFFICIENT`.

### Development Lifecycle Milestones:
- [x] **A. Pipeline Implemented:** Complete acquisition, validation, deduplication, YOLO formatting, and quality-gate engine implemented in `ai/src/dataset/acquisition.py`, `ai/src/dataset/quality_gate.py`, and `ai/training/ECOSETU_MATERIAL_DATASET_PREPARATION.ipynb`.
- [x] **B. Dataset Actually Acquired:** Automated programmatic download and MD5 checksum verification from Zenodo record `18022530`.
- [x] **C. Dataset Actually Validated:** Zero bounding box anomalies ($0 \le xc, yc \le 1$, $w, h > 0$), zero cross-split duplicate leakage, exact SHA-256 and perceptual deduplication applied.
- [x] **D. Dataset READY_FOR_TRAINING:** Verified via `ColabDatasetBuildHarness` quality gate with authentic `dataset_manifest.json` and `validation_report.json`.
- [ ] **E. Model Training:** **NOT COMPLETED — NO MODEL WAS TRAINED IN THIS TASK.**



