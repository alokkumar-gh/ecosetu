"""
EcoSetu Dataset Inspection CLI
Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md, docs/12_AI_TRAINING_PLAN.md

Executes pre-training dataset analysis and produces:
- Terminal summary of class distributions, missing annotations, corrupt files, duplicates
- Machine-readable dataset_inspection_report.json
"""

import argparse
from pathlib import Path
import sys

# Ensure repository root is in path
sys.path.insert(0, str(Path(__file__).resolve().parents[4]))

from ai.src.pipeline.inspect_dataset import DatasetInspector


def main():
    parser = argparse.ArgumentParser(description="EcoSetu Dataset Inspector CLI")
    parser.add_argument(
        "--data",
        required=True,
        help="Path to dataset directory (raw/staging/processed) or metadata JSONL file",
    )
    parser.add_argument(
        "--output-report",
        default="ai/datasets/material-classification/reports/dataset_inspection_report.json",
        help="Destination path for inspection report JSON",
    )
    args = parser.parse_args()

    inspector = DatasetInspector(args.data)
    print(f"\nInspecting dataset at: {args.data} ...")
    summary = inspector.inspect()

    print("\n" + "=" * 64)
    print("ECOSETU PRE-TRAINING DATASET INSPECTION REPORT")
    print("=" * 64)
    print(f"Dataset Path:             {summary.dataset_path}")
    print(f"Inferred Format:          {summary.annotation_format}")
    print(f"Total Images:             {summary.total_images}")
    print(f"Corrupt Images:           {summary.corrupt_images}")
    print(f"Exact Duplicate Images:   {summary.duplicate_images}")
    print(f"Total Annotations:        {summary.total_annotations}")
    print(f"Missing Annotations:      {summary.missing_annotations}")
    print(f"Invalid Annotations:      {summary.invalid_annotations}")
    print(f"Unique Categories:        {summary.unique_classes_found}")
    print(f"Ambiguous Categories:     {summary.ambiguous_classes_count}")
    print(f"Unmapped Categories:      {summary.unmapped_classes_count}")
    print(f"Class Imbalance Ratio:    {summary.imbalance_ratio}:1")

    if summary.class_distribution:
        print("\nClass Distribution:")
        for cls_name, count in sorted(summary.class_distribution.items(), key=lambda x: x[1], reverse=True):
            print(f"  - {cls_name:24} : {count:5d} samples")

    if summary.split_distribution:
        print("\nSplit Distribution:")
        for split, count in sorted(summary.split_distribution.items()):
            print(f"  - {split:12} : {count:5d} samples")

    if summary.ambiguous_classes:
        print("\nAmbiguous Classes (Review Required):")
        for item in summary.ambiguous_classes:
            print(f"  - '{item['raw']}': {item['reason']} (Candidates: {', '.join(item['candidates'])})")

    if summary.unmapped_classes:
        print("\nUnmapped Classes (Excluded from Canonical):")
        for item in summary.unmapped_classes:
            print(f"  - '{item['raw']}': {item['reason']}")

    if summary.warnings:
        print(f"\nWarnings ({len(summary.warnings)}):")
        for w in summary.warnings:
            print(f"  [WARN] {w}")

    if summary.errors:
        print(f"\nErrors ({len(summary.errors)}):")
        for e in summary.errors:
            print(f"  [ERROR] {e}")

    print("=" * 64 + "\n")

    inspector.save_report(summary, args.output_report)


if __name__ == "__main__":
    main()
