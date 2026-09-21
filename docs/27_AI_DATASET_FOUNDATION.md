# EcoSetu — AI Dataset Generation & Validation Foundation

> **SIH Problem Statement 26229 — Kabadiwala Connect**
>
> **Canonical Reference:** Follows `docs/25_SIH_26229_REQUIREMENTS.md` and `docs/26_SIH_TRACEABILITY_MATRIX.md`.
>
> **Status:** FOUNDATION COMPLETE — **NO TRAINED MODEL EXISTS YET**.

---

## 1. Architectural Overview & Objective

The **AI Dataset Generation & Validation Foundation** establishes the trustworthy data preparation, import, validation, splitting, versioning, and provenance tracking layer for ECOSETU's future material classification models.

This layer decouples dataset engineering from model training. It ensures that any image dataset consumed by future models (such as YOLOv8) is rigorously validated for visual integrity, canonical taxonomy alignment, and strict data leakage prevention before training commences.

```
┌───────────────────────────┐      ┌───────────────────────────┐
│ External Public Datasets  │      │ ECOSETU Field Collections │
│ (Kaggle, OpenImages, etc.)│      │ (Collector Material Lots) │
└─────────────┬─────────────┘      └─────────────┬─────────────┘
              │                                  │
              ▼                                  ▼
     [import_external.py]              [export_field_data.py]
              │                                  │
              └───────────────┬──────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │   ai/datasets/      │
                   │  ├── raw/           │
                   │  └── staging/       │
                   └──────────┬──────────┘
                              │
                              ▼
                    [ClassMapper & Hash]
                              │
                              ▼
                   ┌─────────────────────┐
                   │  DatasetValidator   │
                   │  - Format/Corrupt   │
                   │  - Duplicates       │
                   │  - PII Protection   │
                   └──────────┬──────────┘
                              │
                        (is_valid == true)
                              │
                              ▼
                   ┌─────────────────────┐
                   │   DatasetSplitter   │
                   │   - 70/20/10 Ratio  │
                   │   - Group-Aware     │
                   │   - Deterministic   │
                   └──────────┬──────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │        ai/datasets/material-classification/│
        │        ├── train/                         │
        │        ├── val/                           │
        │        ├── test/                          │
        │        ├── manifests/ (v0.1.0.json)       │
        │        └── reports/ (validation.json)     │
        └───────────────────────────────────────────┘
```

---

## 2. Strict Source Segregation (Never Mixed Silently)

Every image and dataset manifest explicitly declares its `source_type`:

| Source Type | Description | Permitted Uses |
|-------------|-------------|----------------|
| `EXTERNAL_PUBLIC` | Legitimate open-source datasets (Kaggle e-waste, Open Images, Roboflow). | Pre-training, transfer learning, benchmarking. |
| `FIELD_COLLECTED` | Curated photos captured during offline pilot field research in scrap yards. | Domain adaptation, real-world fine-tuning. |
| `ECOSETU_PRODUCTION`| Operational photos captured by authenticated collectors via ECOSETU mobile app. | Continuous platform learning, post-launch audit. |
| `SYNTHETIC_TEST` | Synthetic minimal header fixtures used strictly for automated CI unit testing. | Automated testing only; NEVER for model training. |

---

## 3. Directory Lifecycle Structure

```
ai/datasets/
├── README.md
├── .gitignore                         # Ignores large image binaries (*.jpg, *.png, archives)
└── material-classification/
    ├── README.md                      # Detailed dataset documentation
    ├── raw/                           # Immutable source images as received
    ├── staging/                       # Intake area for mapping & format checks
    ├── processed/                     # Validated, deduplicated, standardized images
    ├── train/                         # Training partition (70%)
    ├── val/                           # Validation partition (20%)
    ├── test/                          # Test holdout partition (10%)
    ├── metadata/                      # Image-level JSONL catalogues
    ├── manifests/                     # Versioned manifests (v0.1.0.json, etc.)
    ├── reports/                       # Validation reports (dataset_validation_report.json)
    └── scripts/                       # Import, export, validation, and splitting CLIs
```

**Cardinal Rule:** `raw != processed != train/val/test`. Raw sources are never mutated directly.

---

## 4. Canonical Class Taxonomy & Ambiguity Protection

ECOSETU strictly anchors all classification labels to the 16 authoritative `MaterialCategory` types:

1. `CRT` (Cathode Ray Tube televisions & monitors)
2. `LCD_PANEL` (Flat panel display screens, laptop screens, TV panels)
3. `PCB` (Printed circuit boards, motherboards, RAM, telecom boards)
4. `CABLE` (Insulated copper/aluminum cables, chargers, power cords)
5. `BATTERY` (Li-ion, lead-acid, NiCd/NiMH battery packs)
6. `MOTOR` (Copper-wound appliance/fan motors)
7. `MAGNET_ASSEMBLY` (Hard drive magnets, speaker permanent magnets)
8. `MIXED_PLASTIC` (Electronic enclosures, casing plastics)
9. `MOBILE_PHONE` (Smartphones, feature phones)
10. `LAPTOP` (Laptops, notebooks, netbooks)
11. `MONITOR` (Computer monitors, LCD/LED screens)
12. `PRINTER` (Printers, scanners, all-in-one units)
13. `KEYBOARD_MOUSE` (Keyboards, computer mice, input peripherals)
14. `DESKTOP_COMPUTER` (PC towers, CPU cabinets, workstations)
15. `TABLET` (Tablet computers, iPads, e-readers)
16. `OTHER` (Unclassified e-waste items)

### Strict Ambiguity Non-Coercion Policy
External datasets frequently contain ambiguous labels such as `electronic device`, `electronics`, `e-waste`, `scrap`, `gadget`, or `metal`.
- The `ClassMapper` **STRICTLY FORBIDS** automatically coercing ambiguous labels to an arbitrary canonical class.
- Ambiguous labels receive `status: "AMBIGUOUS"` and are flagged for human inspection.
- Unrecognized labels receive `status: "UNMAPPED"`.
- The raw source label is permanently preserved in `source_category`.

---

## 5. Data Quality Validation Tool (`DatasetValidator`)

The validation pipeline enforces 10 automated quality checks before a dataset can be declared valid:

1. **File Existence**: Verifies that the file exists on disk at the relative path.
2. **File Header & Corruption**: Inspects binary magic bytes (`FF D8 FF` for JPEG, `89 50 4E 47` for PNG) and runs Pillow `Image.verify()`.
3. **Format Support**: Rejects unapproved formats (only standard JPEG and PNG supported).
4. **Duplicate Detection**: Computes SHA-256 content hashes and flags exact duplicates.
5. **Canonical Taxonomy Alignment**: Rejects records with missing, unknown, or unmapped classes.
6. **Split Integrity**: Validates split assignment values (`TRAIN`, `VAL`, `TEST`, `UNASSIGNED`).
7. **Data Leakage Across Splits**:
   - **Content Hash Leakage**: Fails if an identical SHA-256 hash appears across multiple splits.
   - **Group Leakage**: Fails if the same `group_id` (e.g. material lot reference `LOT-YYYYMM-XXXXX`) spans multiple splits.
8. **Class Imbalance Warnings**: Flags severe imbalance if the max/min class ratio exceeds 20:1.
9. **Empty Class Warnings**: Flags canonical categories with zero represented samples.
10. **Privacy / PII Scanning**: Scans metadata recursively for phone numbers, email addresses, Indian PAN formats, and Aadhaar numbers.

**Validation Output:** Generates `dataset_validation_report.json` with machine-readable metrics and prints a clean terminal summary.

---

## 6. Deterministic & Group-Aware Dataset Splitting (`DatasetSplitter`)

Dataset splitting is deterministic, reproducible, and group-aware:
- **Default Targets:** 70% Train, 20% Validation, 10% Test.
- **Deterministic Random Seed:** Uses an explicit seed (default `42`) so that identical runs produce 100% identical partitions.
- **Group-Aware Partitioning:** Images sharing a `group_id` (e.g., multiple photos taken of the same `MaterialLot`) are grouped into atomic units and assigned to the same partition. This prevents evaluation contamination.
- **Preserve Source Splits:** Supports preserving official train/val/test splits when importing established benchmarks.

---

## 7. Provenance Tracking & Dataset Manifests (`ManifestManager`)

Every published dataset version includes a machine-readable manifest (`manifests/<version>.json`):
- `dataset_name`, `dataset_id`, `version` (Semantic Versioning)
- `source`, `source_type`, `source_url_reference`
- `license`: True license recorded, or explicitly marked `LICENSE_UNVERIFIED` (never fabricated)
- `original_class_count` and `mapped_ecosetu_class_count`
- `total_records`, `split_counts`, and `class_distribution`
- `random_seed`, `split_strategy`, and `split_ratios`
- `preprocessing_performed` and `filtering_performed`
- `validation_summary`: Snapshot of the validation report metrics
- `known_limitations`: Documented caveats and constraints

---

## 8. Privacy & Field-Data Protection by Design

When exporting field-collected photos from ECOSETU's database (`MaterialLot` and `MaterialLotPhoto`):
- **100% PII Stripping**: Collector names, phone numbers, passwords, auth tokens, financial records, and exact residential addresses are strictly barred from dataset metadata.
- **Coarse Location Only**: Locations are rounded to coarse city/state or coordinates rounded to at most 2 decimal places (~1.1 km precision).
- **Lot Linkage**: Retains the anonymized lot reference (`LOT-YYYYMM-XXXXX`) as `group_id` solely for leakage prevention.

---

## 9. Versioning Convention

We adopt Semantic Versioning (`vMAJOR.MINOR.PATCH`):
- **MAJOR (`v1.0.0`)**: Breaking change in canonical material taxonomy, split methodology, or metadata schema.
- **MINOR (`v0.2.0`)**: Ingestion of a new data source, >20% dataset expansion, or new quality filtering rule.
- **PATCH (`v0.1.1`)**: Label corrections, removal of discovered duplicates, or metadata fixes without altering splits.

---

## 10. Explicit Non-Goals & Limitations

1. **NO TRAINED MODEL EXISTS YET**:
   - Model training (YOLOv8) is explicitly deferred to subsequent prompts.
   - This prompt establishes the trustworthy dataset pipeline foundation.
2. **NO DATA FABRICATION**:
   - No fake images, synthetic accuracy scores, or invented model metrics.
3. **NO AI VALUATION OR ANOMALY DETECTION**:
   - Price estimation and recycler matching remain 100% deterministic.
