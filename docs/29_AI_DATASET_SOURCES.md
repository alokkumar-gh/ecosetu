# EcoSetu — Public E-Waste Dataset Source Evaluation & Colab-First Acquisition

> **SIH Problem Statement 26229 — Kabadiwala Connect**  
> **Canonical Reference:** `docs/25_SIH_26229_REQUIREMENTS.md`, `docs/27_AI_DATASET_FOUNDATION.md`, `docs/28_AI_MATERIAL_CLASSIFICATION_PIPELINE.md`  
> **Status:** SOURCE EVALUATION COMPLETE — ACQUISITION PIPELINE READY — **NO MODEL TRAINED YET**.

---

## 1. Executive Summary & Objective

In this task, we evaluated candidate public e-waste datasets to determine the optimal, legally sound, and resource-conscious foundation for training ECOSETU's material classification models.

To respect the storage limitations of the developer machine, a **Google Colab-First Acquisition Architecture** was engineered. Large image datasets are never downloaded permanently to the local developer machine; instead, acquisition, validation, class mapping, deduplication, and YOLO dataset preparation execute directly in Google Colab and persist versioned partitions to Google Drive.

---

## 2. Candidate Dataset Research & Verification

We investigated the primary candidate datasets using their official source repositories and academic publications:

| Dataset | Creator / Organization | Verified Source URL | Release Date | License | Usable Images | Formats | Annotation Type |
|:---|:---|:---|:---:|:---:|:---:|:---:|:---|
| **XBAT+ WEEE (RGB Subset)** | Univ. of Limerick / Circular Economy Project | [Zenodo DOI: 10.5281/zenodo.18022530](https://doi.org/10.5281/zenodo.18022530) | 2026 (v1.0) | `CC-BY-4.0` | **421 RGB images** (330 train + 91 test; 3,045 only if X-ray HQ/VQ frames are included) | RGB optical webcam | Bounding boxes (YOLO/RF-DETR) & Category labels |
| **EWasteNet Vision Dataset** | Niful Islam et al. | [arXiv:2311.08271 / GitHub](https://github.com/NifulIslam/EWasteNet-A-Two-Stream-DeiT-Approach-for-E-Waste-Classification) | 2023 | `LICENSE_UNVERIFIED` | ~1,053 images | RGB JPEG/PNG | Folder-based Classification (8 classes) |
| **Roboflow E-Waste Projects** | Community / Independent Contributors | [Roboflow Universe](https://universe.roboflow.com/) | 2022–2025 | Varied (per-project: `CC-BY-4.0` or `UNVERIFIED`) | 200–2,000 per project | RGB JPEG | Bounding box Object Detection (YOLO format) |

---

## 3. ECOSETU Category Coverage & Mapping Analysis

Each candidate dataset was compared against ECOSETU's authoritative 16 canonical material categories:

| ECOSETU Category | XBAT+ WEEE (15 Classes) | EWasteNet (8 Classes) | Roboflow E-Waste (Aggregated) | Mapping Status | Notes |
|:---|:---|:---|:---|:---:|:---|
| `CRT` | `crt tv`, `crt monitor` | Not distinct (`tv` combines CRT/flat) | Variable (`crt`) | **INSUFFICIENT in RGB** | Zero instances in RGB subset |
| `LCD_PANEL` | `flat screen`, `display module` | `tv` (ambiguous) | `lcd_screen` | **EXCLUDED** | Bare panels are absent in consumer sets |
| `PCB` | `printed circuit board`, `pcb` | None (whole devices only) | `pcb`, `circuit_board` | **INSUFFICIENT in RGB** | High-value scrap; zero instances in RGB subset |
| `CABLE` | `cables`, `wires` | None | `cables`, `chargers` | **INSUFFICIENT in RGB** | Frequently tangled in scrap lots |
| `BATTERY` | `battery` (internal in X-ray) | None | `battery`, `li-ion` | **INSUFFICIENT in RGB** | X-ray only; zero external RGB boxes |
| `MOTOR` | None | None | `motor` (rare) | **EXCLUDED** | Requires ECOSETU field data |
| `MAGNET_ASSEMBLY` | None | None | None | **EXCLUDED** | Dismantled hard drive voice coils |
| `MIXED_PLASTIC` | None (casings not labeled separately)| None | `plastic_scrap` | **EXCLUDED** | Shredded/dismantled casings |
| `MOBILE_PHONE` | `MobilePhone` (Class 9) | `Mobile` | `mobile_phone`, `cellphone`| **MAPPED** | 103 genuine instances in XBAT+ RGB |
| `LAPTOP` | `laptop` | `Laptop` | `laptop` | **INSUFFICIENT in RGB** | Zero instances in RGB subset |
| `MONITOR` | `monitor` | `tv` (ambiguous) | `monitor` | **INSUFFICIENT in RGB** | Desktop displays |
| `PRINTER` | `printer` | None | `printer` | **INSUFFICIENT in RGB** | Standard e-waste units |
| `KEYBOARD_MOUSE` | `ComputerMouse` (Class 1) | `Keyboard`, `Mouse` | `keyboard`, `mouse` | **MAPPED** | 12 genuine instances in XBAT+ RGB |
| `DESKTOP_COMPUTER` | `pc tower`, `desktop` | None | `desktop`, `cpu` | **INSUFFICIENT in RGB** | Tower chassis |
| `TABLET` | `iPad` (Class 7) | None | `tablet`, `ipad` | **MAPPED** | 27 genuine instances in XBAT+ RGB |
| `OTHER` | Appliances (`AlarmClock`, etc.) | `Microwave`, `Camera` | `other`, `appliance` | **INSUFFICIENT / UNMAPPED** | Out-of-scope appliances rejected without coercion |

### Strict Ambiguity Non-Coercion:
- **`tv` / `television`**: In EWasteNet and some Roboflow projects, `tv` groups old CRT monitors with modern flat-panel LCDs. In ECOSETU, `CRT` and `MONITOR` have drastically different scrap and environmental values. Therefore, `tv` is strictly flagged as **`AMBIGUOUS`** and routed to human review rather than being silently coerced.
- **Appliances (`AlarmClock`, `RemoteControl`, `E-Razor`, etc.)**: These out-of-scope classes in XBAT+ are returned as `UNMAPPED` and excluded, rather than inventing invalid mappings to force them into `OTHER`.

---

## 4. Classification vs. Object Detection Suitability

1. **XBAT+ WEEE (RGB Subset)**:
   - Offers genuine bounding boxes in YOLO format (`.txt` per `.jpg`).
   - Ideal for **object detection**.
   - Focuses specifically on battery-containing consumer devices imaged via an UltraSharp Dell RGB webcam.
2. **XBAT+ X-Ray (HQ / VQ Subsets) — STRICTLY EXCLUDED**:
   - Industrial NTB EZ-240 dual-energy X-ray scanner imagery.
   - Strictly excluded because EcoSetu collectors and citizens use optical smartphone cameras, not industrial X-ray inspection tunnels.
3. **EWasteNet**:
   - Single-item images organized by directory.
   - Strictly suitable for **classification only**; does NOT contain bounding boxes. Excluded from detection dataset.
4. **Roboflow Universe Projects — DEFERRED**:
   - Community-contributed bounding boxes in YOLO format.
   - Large downloads are deferred to prevent multi-GB storage bloat and licensing dilution. May be evaluated later as targeted enrichment.

---

## 5. Real-World ECOSETU Scrap Relevance

| Dimension | Ideal EcoSetu Collector Reality | XBAT+ WEEE (RGB) | EWasteNet | Roboflow E-Waste |
|:---|:---|:---:|:---:|:---:|
| **Backgrounds** | Cluttered scrap yards, concrete floors, scales | Controlled sorting bins & neutral mats | Plain / white backgrounds | Real-world household & scrap tables |
| **Physical Condition** | Scratched, broken, dusty, dismantled | Intact and partial battery-WEEE | Mostly intact devices | Intact and broken scrap |
| **Components** | Bare PCBs, motors, loose wires, magnets | Whole devices and peripherals | Whole devices only | Whole devices and loose PCBs |
| **Lighting** | Glare, shadows, outdoor natural light | Standard industrial optical lighting | Standard photographic lighting | Varied amateur smartphone lighting |

---

## 6. Duplicate & Overlap Mitigation

Because combining multiple public datasets risks train/test leakage (e.g. users uploading identical images to both Kaggle and Roboflow), we implemented the **Cross-Dataset Deduplicator** (`ai/src/dataset/deduplicator.py`):
1. **Exact Deduplication (SHA-256)**: Identifies byte-for-byte duplicate images across sources.
2. **Perceptual Deduplication (dHash)**: Computes 64-bit difference hashes; images with Hamming distance $\le 4$ (representing $\ge 94\%$ structural similarity) are flagged as duplicates even if re-compressed or resized.
3. **Source Priority**: When duplicates are detected across sources, the verified, open-license source (`XBAT+` / `CC-BY-4.0`) is retained, and unverified or secondary copies are dropped.

---

## 7. Recommended Initial Dataset Composition (Prompt 22B)

### Authentic Lightweight Foundation:
1. **Primary Foundation Dataset:** **XBAT+ WEEE (RGB Subset Only)**
   - *Why:* Authentic open academic dataset (`CC-BY-4.0`, Zenodo DOI: `10.5281/zenodo.18022530`), exactly **421 source images** (330 train + 91 test).
   - *Download Footprint:* ~75.4 MB across two official raw archives (`raw_XBAT+_v1.0_RGB_train.zip` and `raw_XBAT+_v1.0_RGB_test.zip`), well below the 1 GB ceiling.
   - *Retained Classes:* `MOBILE_PHONE` (103), `TABLET` (27), `KEYBOARD_MOUSE` (12) = 142 retained genuine images (~30 MB processed size).
   - *Excluded from RGB:* Industrial X-ray scans (HQ/VQ). Out-of-scope appliances (`RemoteControl`, `AlarmClock`, etc.) are rejected as `UNMAPPED_CLASS`.
2. **Deferred Secondary Enrichment:** **Roboflow E-Waste Subsets**
   - Large downloads deferred; only targeted permissive CC-BY-4.0 subsets will be considered after evaluating model v0.1.0 baseline.
3. **Future Gap Filler:** **ECOSETU Field-Collected Data**
   - *Why:* Public datasets lack `MOTOR` and `MAGNET_ASSEMBLY` (dismantled e-waste components). These will be sourced through the Prompt 18 offline mobile collection workflow (`export_field_data.py`).

---

## 8. Google Drive Hierarchy & Colab Workflow

All data acquisition executes in Google Colab and stores artifacts directly in Google Drive:

```
Google Drive: /MyDrive/ECOSETU_AI/
├── datasets/
│   ├── raw/           # Downloaded archive archives (Zenodo, Roboflow)
│   ├── staging/       # Extracted and verified candidate images
│   ├── processed/     # Canonical 70/20/10 train/val/test splits
│   ├── manifests/     # Versioned JSON manifests (e.g., xbat_plus_weee_v0.1.0.json)
│   └── reports/       # Deduplication and validation reports
└── models/
    └── material-classifier/
        └── artifacts/ # Exported best.pt weights
```

**Colab Acquisition Notebook:**
- Located at [ai/training/ECOSETU_MATERIAL_DATASET_PREPARATION.ipynb](file:///e:/EcoSetu/ai/training/ECOSETU_MATERIAL_DATASET_PREPARATION.ipynb).
- Features 8 interactive steps: Drive Mount, Dependency Setup, Source Configuration, Scratch Download, 16-Class Mapping, Cross-Dataset Deduplication, Stratified Splitting, and Manifest Generation.
- **Explicit Constraint:** The notebook strictly prepares data and **DOES NOT train YOLO**.

---

## 9. Verification & Safety Proofs

1. **New Automated Suites:**
   - [ai/tests/test_dataset_acquisition.py](file:///e:/EcoSetu/ai/tests/test_dataset_acquisition.py) — **7 / 7 PASSED (100%)**.
   - [ai/tests/test_detection_builder.py](file:///e:/EcoSetu/ai/tests/test_detection_builder.py) — **7 / 7 PASSED (100%)**.
2. **Full AI Test Suite:** 62 tests in `ai/tests/` — **62 / 62 PASSED (100%)**.
3. **Backend Historical Analytics Regression:** 24 checks in `backend/tests/verify_historical_analytics.js` — **24 / 24 PASSED (100%)**.
4. **Mobile TypeScript Compilation:** `npm --prefix mobile run typecheck` — **0 errors**.
5. **No Models Trained:** Zero model weights (`.pt`) or fabricated metrics were generated.

