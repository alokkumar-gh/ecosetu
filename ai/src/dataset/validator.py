"""
EcoSetu Data Quality Validation Tool
Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4 Module 1

Performs comprehensive static and perceptual validation of e-waste image datasets:
- Missing and corrupt files
- Format integrity (JPEG/PNG)
- Exact duplicate detection (SHA-256)
- Canonical class mapping and unknown class detection
- Class distribution & severe imbalance
- Train/val/test data leakage (content hash & group_id)
- Privacy / PII scanning
- Generation of machine-readable reports
"""

from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

from ai.src.dataset.schema import (
    CANONICAL_MATERIAL_CATEGORIES,
    DatasetSplitEnum,
    ImageMetadata,
    check_for_pii,
)


# Magic byte constants
JPEG_MAGIC = b"\xff\xd8\xff"
PNG_MAGIC = b"\x89PNG"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


class ValidationIssue(BaseModel):
    severity: str = Field(..., description="ERROR | WARNING")
    issue_type: str = Field(..., description="Machine-readable issue category")
    message: str = Field(..., description="Human-readable explanation")
    image_id: Optional[str] = None
    file_path: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class ValidationReport(BaseModel):
    is_valid: bool = Field(..., description="True if and only if zero ERROR severity issues exist")
    dataset_version: Optional[str] = None
    validation_timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    total_records: int = 0
    valid_records: int = 0
    invalid_records: int = 0
    duplicate_count: int = 0
    unmapped_class_count: int = 0
    ambiguous_class_count: int = 0
    class_distribution: Dict[str, int] = Field(default_factory=dict)
    split_distribution: Dict[str, int] = Field(default_factory=dict)
    errors: List[ValidationIssue] = Field(default_factory=list)
    warnings: List[ValidationIssue] = Field(default_factory=list)

    def to_json(self, indent: int = 2) -> str:
        return self.model_dump_json(indent=indent)

    def print_summary(self) -> None:
        """Prints a human-readable summary of validation results."""
        status_symbol = "✓ PASSED" if self.is_valid else "✗ FAILED"
        print("=" * 60)
        print(f"ECOSETU DATASET VALIDATION REPORT — {status_symbol}")
        print("=" * 60)
        print(f"Timestamp:        {self.validation_timestamp}")
        print(f"Total Records:    {self.total_records}")
        print(f"Valid Records:    {self.valid_records}")
        print(f"Invalid Records:  {self.invalid_records}")
        print(f"Duplicates:       {self.duplicate_count}")
        print(f"Unmapped Classes: {self.unmapped_class_count}")
        print(f"Errors:           {len(self.errors)}")
        print(f"Warnings:         {len(self.warnings)}")
        print("\nClass Distribution:")
        for cat, count in sorted(self.class_distribution.items()):
            print(f"  - {cat:20s}: {count:5d}")
        print("\nSplit Distribution:")
        for split, count in sorted(self.split_distribution.items()):
            print(f"  - {split:10s}: {count:5d}")
        
        if self.errors:
            print("\n[ERRORS]")
            for err in self.errors[:10]:
                print(f"  ✗ [{err.issue_type}] {err.message} (id: {err.image_id or 'N/A'})")
            if len(self.errors) > 10:
                print(f"  ... and {len(self.errors) - 10} more errors")
                
        if self.warnings:
            print("\n[WARNINGS]")
            for warn in self.warnings[:5]:
                print(f"  ⚠ [{warn.issue_type}] {warn.message}")
        print("=" * 60)


class DatasetValidator:
    """
    Validates dataset metadata and underlying image files for correctness,
    integrity, privacy compliance, and leakage prevention.
    """

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir) if base_dir else Path.cwd()

    def calculate_file_hash(self, file_path: Path) -> str:
        """Computes SHA-256 hash of file content."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    def verify_image_file(self, full_path: Path) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Verifies that an image file exists, has valid header magic bytes,
        can be read by Pillow, and conforms to JPEG/PNG formats.
        """
        if not full_path.exists():
            return False, f"File does not exist on disk: {full_path}", None

        if not full_path.is_file():
            return False, f"Path is not a regular file: {full_path}", None

        ext = full_path.suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            return False, f"Unsupported file extension '{ext}'. Must be one of {ALLOWED_EXTENSIONS}", None

        try:
            file_size = full_path.stat().st_size
            if file_size == 0:
                return False, "File is empty (0 bytes)", None

            # Check header magic bytes
            with open(full_path, "rb") as f:
                header = f.read(32)
            
            is_jpeg = header.startswith(JPEG_MAGIC)
            is_png = header.startswith(PNG_MAGIC)
            if not (is_jpeg or is_png):
                return False, "Corrupt file header: does not match JPEG or PNG signature", None

            # Verify through Pillow
            with Image.open(full_path) as img:
                img.verify()
                img_format = img.format
                width, height = img.size

            info = {
                "format": img_format,
                "width": width,
                "height": height,
                "file_size_bytes": file_size,
            }
            return True, None, info
        except (UnidentifiedImageError, OSError, SyntaxError) as e:
            return False, f"Unreadable or corrupt image: {str(e)}", None

    def validate_records(
        self,
        records: List[ImageMetadata],
        dataset_version: Optional[str] = None,
        check_files_on_disk: bool = True,
        output_report_path: Optional[str] = None,
    ) -> ValidationReport:
        """
        Validates a list of ImageMetadata records.
        """
        errors: List[ValidationIssue] = []
        warnings: List[ValidationIssue] = []
        
        total_records = len(records)
        valid_records_count = 0
        duplicate_count = 0
        unmapped_count = 0
        ambiguous_count = 0

        # Tracking structures for leakage and distribution
        class_counts: Counter = Counter()
        split_counts: Counter = Counter()
        sha_to_records: Dict[str, List[ImageMetadata]] = defaultdict(list)
        group_to_splits: Dict[str, Set[str]] = defaultdict(set)
        seen_ids: Set[str] = set()

        for rec in records:
            record_has_error = False

            # 1. Unique ID check
            if not rec.image_id:
                errors.append(ValidationIssue(
                    severity="ERROR",
                    issue_type="MISSING_IMAGE_ID",
                    message="Image record missing unique image_id",
                    file_path=rec.file_path
                ))
                record_has_error = True
            elif rec.image_id in seen_ids:
                errors.append(ValidationIssue(
                    severity="ERROR",
                    issue_type="DUPLICATE_IMAGE_ID",
                    message=f"Duplicate image_id '{rec.image_id}' found in dataset",
                    image_id=rec.image_id,
                    file_path=rec.file_path
                ))
                record_has_error = True
            else:
                seen_ids.add(rec.image_id)

            # 2. Privacy & PII check on metadata
            pii_violations = check_for_pii(rec.model_dump())
            if pii_violations:
                errors.append(ValidationIssue(
                    severity="ERROR",
                    issue_type="PII_VIOLATION",
                    message=f"Privacy violation: {'; '.join(pii_violations)}",
                    image_id=rec.image_id,
                    file_path=rec.file_path
                ))
                record_has_error = True

            # 3. Class validation
            if not rec.ecosetu_category:
                if rec.source_category:
                    unmapped_count += 1
                    errors.append(ValidationIssue(
                        severity="ERROR",
                        issue_type="UNMAPPED_CLASS",
                        message=f"Source class '{rec.source_category}' has no canonical ECOSETU category",
                        image_id=rec.image_id,
                        file_path=rec.file_path
                    ))
                else:
                    errors.append(ValidationIssue(
                        severity="ERROR",
                        issue_type="MISSING_CLASS_LABEL",
                        message="Record is missing both canonical and source category labels",
                        image_id=rec.image_id,
                        file_path=rec.file_path
                    ))
                record_has_error = True
            elif rec.ecosetu_category not in CANONICAL_MATERIAL_CATEGORIES:
                errors.append(ValidationIssue(
                    severity="ERROR",
                    issue_type="UNKNOWN_CANONICAL_CLASS",
                    message=f"Category '{rec.ecosetu_category}' is not recognized in canonical taxonomy",
                    image_id=rec.image_id,
                    file_path=rec.file_path
                ))
                record_has_error = True
            else:
                class_counts[rec.ecosetu_category] += 1

            # 4. Split tracking
            split_name = rec.split.value if hasattr(rec.split, "value") else str(rec.split)
            split_counts[split_name] += 1

            if rec.group_id and split_name not in {"UNASSIGNED"}:
                group_to_splits[rec.group_id].add(split_name)

            # 5. File verification on disk (optional)
            if check_files_on_disk and rec.file_path:
                full_path = self.base_dir / rec.file_path
                ok, err_msg, info = self.verify_image_file(full_path)
                if not ok:
                    errors.append(ValidationIssue(
                        severity="ERROR",
                        issue_type="IMAGE_FILE_INVALID",
                        message=err_msg or "Failed image file check",
                        image_id=rec.image_id,
                        file_path=rec.file_path
                    ))
                    record_has_error = True
                else:
                    computed_sha = self.calculate_file_hash(full_path)
                    if rec.sha256 and rec.sha256 != computed_sha:
                        errors.append(ValidationIssue(
                            severity="ERROR",
                            issue_type="SHA256_MISMATCH",
                            message=f"Metadata sha256 '{rec.sha256}' != computed hash '{computed_sha}'",
                            image_id=rec.image_id,
                            file_path=rec.file_path
                        ))
                        record_has_error = True
                    rec.sha256 = computed_sha
                    sha_to_records[computed_sha].append(rec)
            elif rec.sha256:
                sha_to_records[rec.sha256].append(rec)

            if not record_has_error:
                valid_records_count += 1

        # 6. Duplicate Analysis & Train/Val/Test Leakage
        for file_hash, matching_records in sha_to_records.items():
            if len(matching_records) > 1:
                duplicate_count += len(matching_records) - 1
                # Check for split leakage
                splits_involved = {r.split.value if hasattr(r.split, "value") else str(r.split) for r in matching_records}
                splits_involved.discard("UNASSIGNED")
                if len(splits_involved) > 1:
                    errors.append(ValidationIssue(
                        severity="ERROR",
                        issue_type="SPLIT_DATA_LEAKAGE",
                        message=f"Duplicate image hash '{file_hash[:12]}...' leaks across splits: {splits_involved}",
                        details={"hash": file_hash, "splits": list(splits_involved), "image_ids": [r.image_id for r in matching_records]}
                    ))
                else:
                    warnings.append(ValidationIssue(
                        severity="WARNING",
                        issue_type="DUPLICATE_IMAGE_DETECTED",
                        message=f"Duplicate content hash '{file_hash[:12]}...' shared by {len(matching_records)} images",
                        details={"hash": file_hash, "image_ids": [r.image_id for r in matching_records]}
                    ))

        # 7. Group-level Leakage Detection
        for group_id, splits in group_to_splits.items():
            if len(splits) > 1:
                errors.append(ValidationIssue(
                    severity="ERROR",
                    issue_type="GROUP_LEAKAGE",
                    message=f"Grouping unit '{group_id}' spans multiple splits: {splits}. Violates group-aware isolation.",
                    details={"group_id": group_id, "splits": list(splits)}
                ))

        # 8. Class Imbalance and Empty Classes
        empty_classes = [cat for cat in CANONICAL_MATERIAL_CATEGORIES if class_counts[cat] == 0]
        if empty_classes and total_records > 0:
            warnings.append(ValidationIssue(
                severity="WARNING",
                issue_type="EMPTY_CLASSES",
                message=f"The following {len(empty_classes)} canonical categories have 0 samples: {empty_classes}",
                details={"empty_classes": empty_classes}
            ))

        non_empty_counts = [count for count in class_counts.values() if count > 0]
        if non_empty_counts and len(non_empty_counts) > 1:
            max_c = max(non_empty_counts)
            min_c = min(non_empty_counts)
            if min_c > 0 and (max_c / min_c) > 20.0:
                warnings.append(ValidationIssue(
                    severity="WARNING",
                    issue_type="SEVERE_CLASS_IMBALANCE",
                    message=f"Severe class imbalance detected: ratio {max_c}:{min_c} ({max_c/min_c:.1f}:1 > 20:1)",
                    details={"max_count": max_c, "min_count": min_c, "ratio": max_c / min_c}
                ))

        is_valid = len(errors) == 0

        report = ValidationReport(
            is_valid=is_valid,
            dataset_version=dataset_version,
            total_records=total_records,
            valid_records=valid_records_count,
            invalid_records=total_records - valid_records_count,
            duplicate_count=duplicate_count,
            unmapped_class_count=unmapped_count,
            ambiguous_class_count=ambiguous_count,
            class_distribution=dict(class_counts),
            split_distribution=dict(split_counts),
            errors=errors,
            warnings=warnings,
        )

        if output_report_path:
            out_p = Path(output_report_path)
            out_p.parent.mkdir(parents=True, exist_ok=True)
            with open(out_p, "w", encoding="utf-8") as f:
                f.write(report.to_json(indent=2))

        return report
