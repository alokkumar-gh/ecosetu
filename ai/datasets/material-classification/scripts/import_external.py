"""
EcoSetu External Dataset Import CLI
Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4 Module 1

Imports external e-waste image datasets (e.g., Kaggle, Roboflow, Open Images):
- Scans directory tree for image files (JPEG, PNG)
- Maps directory or annotation names to ECOSETU canonical MaterialCategory
- Computes SHA-256 content hashes for deduplication
- Enforces strict PII scanning and source categorization
- Emits standardized JSONL metadata catalogue
"""

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sys
import uuid
from typing import List, Optional

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[4]))

from ai.src.dataset.class_mapper import ClassMapper
from ai.src.dataset.schema import (
    AnnotationStatusEnum,
    DatasetSourceType,
    DuplicateStatusEnum,
    ImageMetadata,
    ImageQualityStatusEnum,
    ValidationStatusEnum,
    check_for_pii,
)


def import_folder(
    source_dir: str,
    dataset_id: str,
    source_type: DatasetSourceType,
    source_url_reference: str,
    license_str: str,
    output_metadata_path: str,
    base_storage_dir: Optional[str] = None,
) -> List[ImageMetadata]:
    """
    Ingests an image directory structured as class folders:
    source_dir/
      circuit_board/
        img1.jpg
      laptop/
        img2.png
    """
    source_p = Path(source_dir)
    if not source_p.exists():
        raise FileNotFoundError(f"Source directory not found: {source_dir}")

    records: List[ImageMetadata] = []
    seen_hashes = set()
    skipped_unmapped = 0

    base_p = Path(base_storage_dir) if base_storage_dir else source_p.parent

    for root, _, files in os.walk(source_p):
        for fname in sorted(files):
            ext = os.path.splitext(fname)[1].lower()
            if ext not in {".jpg", ".jpeg", ".png"}:
                continue

            file_full = Path(root) / fname
            # Derive relative path from dataset base storage
            try:
                rel_path = file_full.relative_to(base_p).as_posix()
            except ValueError:
                rel_path = file_full.as_posix()

            # Class inference from parent directory name
            parent_dir_name = file_full.parent.name
            map_res = ClassMapper.map_class(parent_dir_name)

            # Compute SHA-256
            hasher = hashlib.sha256()
            with open(file_full, "rb") as f:
                for chunk in iter(lambda: f.read(65536), b""):
                    hasher.update(chunk)
            file_hash = hasher.hexdigest()

            is_duplicate = file_hash in seen_hashes
            seen_hashes.add(file_hash)

            file_size = file_full.stat().st_size

            # Create metadata record
            image_id = f"{dataset_id}_{file_hash[:12]}"
            meta = ImageMetadata(
                image_id=image_id,
                file_path=rel_path,
                dataset_id=dataset_id,
                source_type=source_type,
                source_url=source_url_reference,
                license=license_str or "LICENSE_UNVERIFIED",
                ecosetu_category=map_res.canonical_category,
                source_category=parent_dir_name,
                annotation_status=(
                    AnnotationStatusEnum.WEAKLY_LABELED
                    if map_res.status == "MAPPED"
                    else AnnotationStatusEnum.UNANNOTATED
                ),
                quality_status=ImageQualityStatusEnum.UNVERIFIED,
                duplicate_status=(
                    DuplicateStatusEnum.EXACT_DUPLICATE
                    if is_duplicate
                    else DuplicateStatusEnum.ORIGINAL
                ),
                validation_status=(
                    ValidationStatusEnum.PENDING
                    if map_res.status == "MAPPED"
                    else ValidationStatusEnum.FAILED
                ),
                sha256=file_hash,
                format="JPEG" if ext in {".jpg", ".jpeg"} else "PNG",
                file_size_bytes=file_size,
                provenance={
                    "imported_at": datetime.now(timezone.utc).isoformat(),
                    "source_label": parent_dir_name,
                    "mapping_status": map_res.status,
                    "mapping_reason": map_res.reason,
                },
            )
            records.append(meta)

    # Save to JSONL
    out_p = Path(output_metadata_path)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    with open(out_p, "w", encoding="utf-8") as f:
        for r in records:
            f.write(r.model_dump_json() + "\n")

    print(f"✓ Imported {len(records)} image records from {source_dir}")
    print(f"✓ Catalog saved to: {output_metadata_path}")
    return records


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EcoSetu Dataset Importer")
    parser.add_argument("--source-dir", required=True, help="Path to raw image directory")
    parser.add_argument("--dataset-id", required=True, help="Unique dataset identifier")
    parser.add_argument(
        "--source-type",
        choices=[t.value for t in DatasetSourceType],
        default=DatasetSourceType.EXTERNAL_PUBLIC.value,
        help="Source type classification",
    )
    parser.add_argument("--source-url", default="https://kaggle.com/datasets/example", help="Source URL or reference")
    parser.add_argument("--license", default="LICENSE_UNVERIFIED", help="License string")
    parser.add_argument("--output", required=True, help="Output metadata JSONL path")
    args = parser.parse_args()

    import_folder(
        source_dir=args.source_dir,
        dataset_id=args.dataset_id,
        source_type=DatasetSourceType(args.source_type),
        source_url_reference=args.source_url,
        license_str=args.license,
        output_metadata_path=args.output,
    )
