"""
EcoSetu Dataset Splitter CLI
Canonical Reference: docs/12_AI_TRAINING_PLAN.md Section 2

Executes reproducible, group-aware, stratified splitting of dataset metadata:
- Default ratio: 70% Train, 20% Val, 10% Test
- Guarantees zero leakage by keeping identical content hashes and lot groups together
- Outputs updated metadata and updates dataset manifest
"""

import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))

from ai.src.dataset.manifest import ManifestManager
from ai.src.dataset.schema import DatasetSourceType, ImageMetadata
from ai.src.dataset.splitter import DatasetSplitter
from ai.src.dataset.validator import DatasetValidator


def main():
    parser = argparse.ArgumentParser(description="EcoSetu Dataset Splitter CLI")
    parser.add_argument("--metadata", required=True, help="Input metadata JSONL file")
    parser.add_argument("--output-metadata", required=True, help="Output metadata JSONL with split assignments")
    parser.add_argument("--manifest-output", default=None, help="Path to write dataset manifest JSON")
    parser.add_argument("--train-ratio", type=float, default=0.70, help="Train ratio (default 0.70)")
    parser.add_argument("--val-ratio", type=float, default=0.20, help="Val ratio (default 0.20)")
    parser.add_argument("--test-ratio", type=float, default=0.10, help="Test ratio (default 0.10)")
    parser.add_argument("--seed", type=int, default=42, help="Deterministic random seed")
    parser.add_argument("--dataset-name", default="EcoSetu Material Classification Dataset", help="Dataset name")
    parser.add_argument("--dataset-id", default="ecosetu-mat-v1", help="Dataset slug ID")
    parser.add_argument("--version", default="v0.1.0", help="Version tag")
    parser.add_argument("--source", default="EcoSetu Consolidated", help="Source description")
    parser.add_argument(
        "--source-type",
        choices=[t.value for t in DatasetSourceType],
        default=DatasetSourceType.EXTERNAL_PUBLIC.value,
        help="Source type",
    )
    parser.add_argument("--license", default="LICENSE_UNVERIFIED", help="License")
    args = parser.parse_args()

    meta_path = Path(args.metadata)
    records = []
    with open(meta_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                records.append(ImageMetadata(**json.loads(line)))

    print(f"Loaded {len(records)} records. Performing group-aware stratified split...")
    splitter = DatasetSplitter(
        train_ratio=args.train_ratio,
        val_ratio=args.val_ratio,
        test_ratio=args.test_ratio,
        random_seed=args.seed,
    )
    split_records, counts = splitter.split_records(records)

    # Save split metadata
    out_meta = Path(args.output_metadata)
    out_meta.parent.mkdir(parents=True, exist_ok=True)
    with open(out_meta, "w", encoding="utf-8") as f:
        for r in split_records:
            f.write(r.model_dump_json() + "\n")

    print(f"✓ Assigned splits: {counts}")
    print(f"✓ Saved updated metadata to: {out_meta}")

    # Validate resulting splits for leakage
    validator = DatasetValidator()
    report = validator.validate_records(split_records, dataset_version=args.version, check_files_on_disk=False)

    if args.manifest_output:
        manifest = ManifestManager.create_manifest(
            dataset_name=args.dataset_name,
            dataset_id=args.dataset_id,
            version=args.version,
            source=args.source,
            source_type=DatasetSourceType(args.source_type),
            source_url_reference="https://ecosetu.org/datasets",
            records=split_records,
            license_str=args.license,
            random_seed=args.seed,
            split_ratios={"train": args.train_ratio, "val": args.val_ratio, "test": args.test_ratio},
            validation_report=report,
        )
        ManifestManager.save_manifest(manifest, args.manifest_output)
        print(f"✓ Manifest saved to: {args.manifest_output}")


if __name__ == "__main__":
    main()
