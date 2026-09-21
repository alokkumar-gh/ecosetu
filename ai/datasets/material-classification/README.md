# Material Classification Dataset Repository

This workspace manages the lifecycle of image datasets for ECOSETU's e-waste material classification model.

## Lifecycle Directory Architecture

```
material-classification/
├── README.md             # This architecture documentation
├── raw/                  # Immutable source images (external downloads or raw uploads)
├── staging/              # Unverified / unmapped candidate images
├── processed/            # Validated, deduplicated, standardized images
├── train/                # Training split (symlinks/copies organized by class)
├── val/                  # Validation split
├── test/                 # Test split (holdout evaluation set)
├── metadata/             # Image-level JSONL/JSON metadata catalogs
├── manifests/            # Versioned dataset manifests (v0.1.0.json, etc.)
├── reports/              # Validation reports (dataset_validation_report.json)
└── scripts/              # CLI tools for import, validate, split, and export
```

### Separation of Stages: `raw != processed != train/val/test`

1. **`raw/`**: Raw images as downloaded or collected. Untouched, immutable source.
2. **`staging/`**: Temporary intake area where class mapping and file format checks occur.
3. **`processed/`**: Curated images that have passed format verification, deduplication, and canonical class assignment.
4. **`train/`, `val/`, `test/`**: Deterministically split subsets partitioned with zero data leakage (duplicate/group aware).

## Canonical Target Classes (16 Authoritative Categories)

All datasets are normalized against ECOSETU's canonical `MaterialCategory` taxonomy:
1. `CRT` (Cathode Ray Tube televisions/monitors)
2. `LCD_PANEL` (Flat panel displays, screens, laptop panels)
3. `PCB` (Printed circuit boards, motherboards, telecom boards)
4. `CABLE` (Insulated copper/aluminum cables, power cords, data cables)
5. `BATTERY` (Li-ion, lead-acid, NiCd/NiMH battery assemblies)
6. `MOTOR` (Copper-wound motors from appliances/tools)
7. `MAGNET_ASSEMBLY` (Permanent magnet assemblies, hard drive/speaker magnets)
8. `MIXED_PLASTIC` (Electronic enclosures, casing plastics)
9. `MOBILE_PHONE` (Smartphones, feature phones)
10. `LAPTOP` (Laptops, notebooks)
11. `MONITOR` (Computer monitors, LCD/LED display units)
12. `PRINTER` (Printers, scanners, all-in-one units)
13. `KEYBOARD_MOUSE` (Keyboards, computer mice, peripheral controllers)
14. `DESKTOP_COMPUTER` (Tower cases, CPU units, servers)
15. `TABLET` (Tablet computers, iPads, e-readers)
16. `OTHER` (Unclassified e-waste items)

## Versioning Rules

We follow Semantic Versioning (`vMAJOR.MINOR.PATCH`):
- **MAJOR (`v1.0.0`)**: Breaking change in canonical class taxonomy, split methodology, or metadata schema.
- **MINOR (`v0.2.0`)**: Ingestion of a new data source, >20% dataset expansion, or new quality filtering rule.
- **PATCH (`v0.1.1`)**: Label corrections, removal of discovered duplicates, or metadata corrections without altering splits.

> [!NOTE]
> **NO TRAINED MODEL EXISTS YET.** This pipeline provides the trustworthy dataset foundation for future YOLO model training.
