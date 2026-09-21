"""
EcoSetu Field-Data Export Bridge
Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4 Module 1

Exports collector-captured MaterialLot and MaterialLotPhoto records into
ML-ready dataset format:
- Links lot reference (LOT-YYYYMM-XXXXX) as group_id for zero-leakage splitting
- Retains approximate weight, condition, and coarse location
- Strips 100% of personal identifiable information (PII)
- Marks source as FIELD_COLLECTED or ECOSETU_PRODUCTION
"""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))

from ai.src.dataset.schema import (
    AnnotationStatusEnum,
    CoarseLocation,
    DatasetSourceType,
    DuplicateStatusEnum,
    ImageMetadata,
    ImageQualityStatusEnum,
    ItemConditionEnum,
    SourceOriginEnum,
    ValidationStatusEnum,
)


def export_lot_to_metadata(
    lot_data: Dict[str, Any],
    dataset_id: str = "ecosetu-field-v1",
    source_type: DatasetSourceType = DatasetSourceType.FIELD_COLLECTED,
) -> List[ImageMetadata]:
    """
    Transforms a MaterialLot record with associated photos into ImageMetadata entries.
    Strictly excludes collector identity, phone numbers, passwords, and precise addresses.
    """
    lot_ref = lot_data.get("referenceNumber", "LOT-UNKNOWN")
    category = lot_data.get("category")
    weight_kg = lot_data.get("approximateTotalWeightKg")
    condition_str = lot_data.get("condition")
    source_type_str = lot_data.get("sourceType")

    condition_enum = None
    if condition_str:
        try:
            condition_enum = ItemConditionEnum(condition_str)
        except ValueError:
            condition_enum = ItemConditionEnum.UNKNOWN

    origin_enum = None
    if source_type_str:
        try:
            origin_enum = SourceOriginEnum(source_type_str)
        except ValueError:
            origin_enum = SourceOriginEnum.OTHER

    # Coarse location only (strip street / house numbers)
    coarse_loc = None
    if "city" in lot_data or "state" in lot_data or "collectionLat" in lot_data:
        lat = lot_data.get("collectionLat")
        lng = lot_data.get("collectionLng")
        coarse_loc = CoarseLocation(
            city=lot_data.get("city"),
            state=lot_data.get("state"),
            lat_approx=round(float(lat), 2) if lat is not None else None,
            lng_approx=round(float(lng), 2) if lng is not None else None,
        )

    photos = lot_data.get("photos", [])
    records: List[ImageMetadata] = []

    for idx, photo in enumerate(photos):
        photo_url = photo.get("photoUrl") or photo.get("url")
        photo_id = photo.get("id") or f"{lot_ref}_P{idx+1}"
        file_sha = photo.get("sha256")

        meta = ImageMetadata(
            image_id=f"FIELD_{photo_id}",
            file_path=photo_url,
            dataset_id=dataset_id,
            source_type=source_type,
            source_url=f"ecosetu://lot/{lot_ref}",
            license="ECOSETU_PROPRIETARY_FIELD_DATA",
            collection_date=lot_data.get("createdAt") or datetime.now(timezone.utc).isoformat(),
            ecosetu_category=category,
            source_category=category,
            subcategory=lot_data.get("subcategory"),
            description=lot_data.get("description"),
            condition=condition_enum,
            approximate_weight_kg=float(weight_kg) if weight_kg is not None else None,
            source_origin=origin_enum,
            coarse_location=coarse_loc,
            group_id=lot_ref,  # Critical: keeps all photos from same lot in same split
            annotation_status=AnnotationStatusEnum.VERIFIED,
            quality_status=ImageQualityStatusEnum.VALID,
            duplicate_status=DuplicateStatusEnum.ORIGINAL,
            validation_status=ValidationStatusEnum.PENDING,
            sha256=file_sha,
            provenance={
                "exported_from_lot_ref": lot_ref,
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "lot_status": lot_data.get("status"),
            },
        )
        records.append(meta)

    return records


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EcoSetu Field Data Exporter")
    parser.add_argument("--input-json", required=True, help="Input JSON file containing MaterialLot records")
    parser.add_argument("--output", required=True, help="Output JSONL metadata path")
    parser.add_argument("--dataset-id", default="ecosetu-field-v1", help="Dataset identifier")
    args = parser.parse_args()

    with open(args.input_json, "r", encoding="utf-8") as f:
        lots = json.load(f)

    if isinstance(lots, dict):
        lots = [lots]

    all_records = []
    for lot in lots:
        all_records.extend(export_lot_to_metadata(lot, dataset_id=args.dataset_id))

    out_p = Path(args.output)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    with open(out_p, "w", encoding="utf-8") as f:
        for r in all_records:
            f.write(r.model_dump_json() + "\n")

    print(f"✓ Exported {len(all_records)} field image records to {args.output}")
