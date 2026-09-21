"""
EcoSetu Dataset Validation CLI
Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4 Module 1

Runs comprehensive dataset quality validation on JSONL metadata:
- Detects missing/corrupt files, duplicates, unmapped classes
- Scans for train/val/test data leakage
- Evaluates class balance
- Generates machine-readable report (JSON) and human-readable terminal summary
"""

import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))

from ai.src.dataset.schema import ImageMetadata
from ai.src.dataset.validator import DatasetValidator


def main():
    parser = argparse.ArgumentParser(description="EcoSetu Dataset Quality Validator")
    parser.add_argument("--metadata", required=True, help="Path to input metadata JSON or JSONL file")
    parser.add_argument("--base-dir", default=None, help="Root directory for relative file paths")
    parser.add_argument("--version", default="v0.1.0", help="Dataset version string")
    parser.add_argument("--check-disk", action="store_true", help="Check image file existence and integrity on disk")
    parser.add_argument("--report", default="ai/datasets/material-classification/reports/dataset_validation_report.json", help="Report output path")
    args = parser.parse_args()

    meta_path = Path(args.metadata)
    if not meta_path.exists():
        print(f"Error: metadata file not found at {meta_path}")
        sys.exit(1)

    records = []
    with open(meta_path, "r", encoding="utf-8") as f:
        content = f.read().strip()
        if content.startswith("["):
            data = json.loads(content)
            records = [ImageMetadata(**item) for item in data]
        else:
            for line in content.splitlines():
                if line.strip():
                    records.append(ImageMetadata(**json.loads(line)))

    print(f"Loaded {len(records)} records from {meta_path}")
    validator = DatasetValidator(base_dir=args.base_dir)
    report = validator.validate_records(
        records=records,
        dataset_version=args.version,
        check_files_on_disk=args.check_disk,
        output_report_path=args.report,
    )

    report.print_summary()

    if not report.is_valid:
        print(f"\n❌ Validation failed with {len(report.errors)} errors. Report written to {args.report}")
        sys.exit(1)
    else:
        print(f"\n✓ Validation passed successfully! Report written to {args.report}")
        sys.exit(0)


if __name__ == "__main__":
    main()
