"""
Automated Test Suite for EcoSetu AI Dataset Generation & Validation Foundation
Canonical Reference: SIH Problem Statement 26229, PROMPT 18

Covers:
1. Valid metadata accepted
2. Missing required metadata rejected
3. Unknown class detected
4. Ambiguous/unmapped class detected
5. Corrupt/missing image detected
6. Duplicate detection (SHA-256)
7. Deterministic split reproducibility
8. Split distribution
9. Metadata provenance preservation
10. Dataset version manifest creation & validation
11. Privacy-sensitive fields rejected (phone, email, PAN, Aadhaar)
12. Validation report generation
13. Data leakage detection across splits
14. Source type segregation verification
"""

import json
import os
from pathlib import Path
import tempfile
import pytest
from pydantic import ValidationError

from ai.src.dataset.class_mapper import ClassMapper, MappingResult
from ai.src.dataset.manifest import ManifestManager
from ai.src.dataset.schema import (
    AnnotationStatusEnum,
    CANONICAL_MATERIAL_CATEGORIES,
    CoarseLocation,
    DatasetManifest,
    DatasetSourceType,
    DatasetSplitEnum,
    DuplicateStatusEnum,
    ImageMetadata,
    ImageQualityStatusEnum,
    ItemConditionEnum,
    MaterialCategoryEnum,
    SourceOriginEnum,
    ValidationStatusEnum,
)
from ai.src.dataset.splitter import DatasetSplitter
from ai.src.dataset.validator import DatasetValidator, ValidationReport


# Minimal valid magic byte headers for synthetic images
JPEG_BYTES = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00" + b"\x00" * 100
PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00" + b"\x00" * 100


class TestMetadataSchema:
    """Test 1, 2, 11: Schema validation, required fields, and privacy guards."""

    def test_valid_metadata_accepted(self):
        """Test 1: Valid metadata with all required and optional fields accepted."""
        meta = ImageMetadata(
            image_id="IMG_202609_001",
            file_path="raw/pcb/board_01.jpg",
            dataset_id="kaggle-ewaste-v1",
            source_type=DatasetSourceType.EXTERNAL_PUBLIC,
            source_url="https://kaggle.com/datasets/ewaste",
            license="CC-BY-4.0",
            collection_date="2026-09-20T10:00:00Z",
            ecosetu_category="PCB",
            source_category="motherboard",
            subcategory="COMPUTER_MOTHERBOARD",
            description="Green FR4 multi-layer computer motherboard",
            condition=ItemConditionEnum.DAMAGED,
            approximate_weight_kg=0.85,
            source_origin=SourceOriginEnum.COMMERCIAL,
            coarse_location=CoarseLocation(city="Mumbai", state="Maharashtra", lat_approx=19.07, lng_approx=72.87),
            group_id="LOT-202609-001",
            annotation_status=AnnotationStatusEnum.VERIFIED,
            quality_status=ImageQualityStatusEnum.VALID,
            duplicate_status=DuplicateStatusEnum.ORIGINAL,
            split=DatasetSplitEnum.TRAIN,
            provenance={"annotator": "admin_audit"},
            validation_status=ValidationStatusEnum.PASSED,
            sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            width=640,
            height=480,
            format="JPEG",
            file_size_bytes=102400,
        )
        assert meta.image_id == "IMG_202609_001"
        assert meta.ecosetu_category == "PCB"
        assert meta.source_type == DatasetSourceType.EXTERNAL_PUBLIC

    def test_missing_required_metadata_rejected(self):
        """Test 2: Missing required metadata rejected with ValidationError."""
        # Missing image_id, file_path, dataset_id, source_type
        with pytest.raises(ValidationError):
            ImageMetadata(
                ecosetu_category="BATTERY"
            )

    def test_unknown_canonical_class_rejected_by_schema(self):
        """Test 3: Invalid category rejected by schema validation."""
        with pytest.raises(ValidationError) as exc:
            ImageMetadata(
                image_id="IMG_BAD_CAT",
                file_path="raw/unknown.jpg",
                dataset_id="test",
                source_type=DatasetSourceType.SYNTHETIC_TEST,
                ecosetu_category="SPACE_SHUTTLE_WASTE",  # Not in canonical list
            )
        assert "Invalid ECOSETU material category" in str(exc.value)

    def test_privacy_sensitive_fields_rejected(self):
        """Test 11: Privacy-sensitive fields (phone, email, PAN, Aadhaar) rejected."""
        # Direct phone number key or value rejected
        with pytest.raises(ValidationError) as exc:
            ImageMetadata(
                image_id="IMG_PII_1",
                file_path="raw/pcb.jpg",
                dataset_id="test",
                source_type=DatasetSourceType.FIELD_COLLECTED,
                ecosetu_category="PCB",
                description="Collected from citizen phone +919876543210 in Dharavi",
            )
        assert "Privacy violation" in str(exc.value)
        assert "Phone number pattern detected" in str(exc.value)

        # PAN card rejected
        with pytest.raises(ValidationError) as exc:
            ImageMetadata(
                image_id="IMG_PII_2",
                file_path="raw/pcb.jpg",
                dataset_id="test",
                source_type=DatasetSourceType.FIELD_COLLECTED,
                ecosetu_category="PCB",
                description="Identity verified via ABCDE1234F",
            )
        assert "Privacy violation" in str(exc.value)
        assert "Indian PAN pattern detected" in str(exc.value)

        # Aadhaar card rejected
        with pytest.raises(ValidationError) as exc:
            ImageMetadata(
                image_id="IMG_PII_3",
                file_path="raw/pcb.jpg",
                dataset_id="test",
                source_type=DatasetSourceType.FIELD_COLLECTED,
                ecosetu_category="PCB",
                description="Aadhaar: 3456 7890 1234",
            )
        assert "Privacy violation" in str(exc.value)
        assert "Indian Aadhaar pattern detected" in str(exc.value)


class TestClassMapper:
    """Test 3, 4: Class mapping, synonym resolution, and ambiguous class detection."""

    def test_canonical_synonym_mapping(self):
        """Test standard e-waste synonym mapping."""
        # PCB
        res = ClassMapper.map_class("printed circuit board")
        assert res.status == "MAPPED"
        assert res.canonical_category == "PCB"

        # MOBILE_PHONE
        res = ClassMapper.map_class("smartphone")
        assert res.status == "MAPPED"
        assert res.canonical_category == "MOBILE_PHONE"

        # LAPTOP
        res = ClassMapper.map_class("macbook")
        assert res.status == "MAPPED"
        assert res.canonical_category == "LAPTOP"

        # DESKTOP_COMPUTER
        res = ClassMapper.map_class("pc tower")
        assert res.status == "MAPPED"
        assert res.canonical_category == "DESKTOP_COMPUTER"

        # CRT
        res = ClassMapper.map_class("cathode ray tube")
        assert res.status == "MAPPED"
        assert res.canonical_category == "CRT"

        # BATTERY
        res = ClassMapper.map_class("lithium ion battery")
        assert res.status == "MAPPED"
        assert res.canonical_category == "BATTERY"

        # MOTOR
        res = ClassMapper.map_class("copper wound motor")
        assert res.status == "MAPPED"
        assert res.canonical_category == "MOTOR"

    def test_ambiguous_class_rejected_from_auto_mapping(self):
        """Test 4: Ambiguous classes are strictly NOT auto-mapped."""
        ambiguous_labels = ["electronic device", "electronics", "e-waste", "scrap", "gadget", "metal", "waste"]
        for label in ambiguous_labels:
            res: MappingResult = ClassMapper.map_class(label)
            assert res.status == "AMBIGUOUS", f"Label '{label}' should be marked AMBIGUOUS"
            assert res.canonical_category is None
            assert len(res.suggested_candidates) > 0

    def test_unmapped_class_handling(self):
        """Test completely unknown class marked UNMAPPED."""
        res = ClassMapper.map_class("wooden rocking chair")
        assert res.status == "UNMAPPED"
        assert res.canonical_category is None
        assert "has no canonical mapping" in res.reason


class TestDatasetValidatorAndQuality:
    """Test 5, 6, 12, 13: File checks, duplicate detection, leakage, and report generation."""

    def test_corrupt_or_missing_image_detected(self):
        """Test 5: Validator flags missing and corrupt files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir)
            
            # 1. Corrupt file (bad header)
            corrupt_file = base / "corrupt.jpg"
            corrupt_file.write_bytes(b"NOT_A_VALID_HEADER")
            
            # 2. Missing file
            missing_rel = "missing.jpg"

            records = [
                ImageMetadata(
                    image_id="IMG_CORRUPT",
                    file_path="corrupt.jpg",
                    dataset_id="test",
                    source_type=DatasetSourceType.SYNTHETIC_TEST,
                    ecosetu_category="PCB",
                ),
                ImageMetadata(
                    image_id="IMG_MISSING",
                    file_path=missing_rel,
                    dataset_id="test",
                    source_type=DatasetSourceType.SYNTHETIC_TEST,
                    ecosetu_category="BATTERY",
                ),
            ]

            validator = DatasetValidator(base_dir=str(base))
            report = validator.validate_records(records, check_files_on_disk=True)

            assert report.is_valid is False
            assert len(report.errors) >= 2
            error_types = {e.issue_type for e in report.errors}
            assert "IMAGE_FILE_INVALID" in error_types

    def test_duplicate_detection(self):
        """Test 6: Duplicate detection via SHA-256."""
        records = [
            ImageMetadata(
                image_id="IMG_ORIGINAL",
                file_path="img1.jpg",
                dataset_id="test",
                source_type=DatasetSourceType.SYNTHETIC_TEST,
                ecosetu_category="PCB",
                sha256="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            ),
            ImageMetadata(
                image_id="IMG_COPY_1",
                file_path="img2.jpg",
                dataset_id="test",
                source_type=DatasetSourceType.SYNTHETIC_TEST,
                ecosetu_category="PCB",
                sha256="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            ),
        ]
        validator = DatasetValidator()
        report = validator.validate_records(records, check_files_on_disk=False)
        assert report.duplicate_count == 1
        assert any(w.issue_type == "DUPLICATE_IMAGE_DETECTED" for w in report.warnings)

    def test_data_leakage_detection_across_splits(self):
        """Test 13: Detects identical image present in both TRAIN and TEST splits."""
        records = [
            ImageMetadata(
                image_id="IMG_TRAIN",
                file_path="train_img.jpg",
                dataset_id="test",
                source_type=DatasetSourceType.SYNTHETIC_TEST,
                ecosetu_category="PCB",
                split=DatasetSplitEnum.TRAIN,
                sha256="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            ),
            ImageMetadata(
                image_id="IMG_TEST_LEAK",
                file_path="test_img.jpg",
                dataset_id="test",
                source_type=DatasetSourceType.SYNTHETIC_TEST,
                ecosetu_category="PCB",
                split=DatasetSplitEnum.TEST,
                sha256="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",  # SAME HASH
            ),
        ]
        validator = DatasetValidator()
        report = validator.validate_records(records, check_files_on_disk=False)
        assert report.is_valid is False
        assert any(e.issue_type == "SPLIT_DATA_LEAKAGE" for e in report.errors)

    def test_group_leakage_detection(self):
        """Test 13: Detects same group_id (e.g. material lot) split between train and test."""
        records = [
            ImageMetadata(
                image_id="IMG_LOT_1",
                file_path="lot1_a.jpg",
                dataset_id="test",
                source_type=DatasetSourceType.FIELD_COLLECTED,
                ecosetu_category="LAPTOP",
                group_id="LOT-202609-XYZ12",
                split=DatasetSplitEnum.TRAIN,
                sha256="hash_1",
            ),
            ImageMetadata(
                image_id="IMG_LOT_2",
                file_path="lot1_b.jpg",
                dataset_id="test",
                source_type=DatasetSourceType.FIELD_COLLECTED,
                ecosetu_category="LAPTOP",
                group_id="LOT-202609-XYZ12",
                split=DatasetSplitEnum.TEST,  # LEAKAGE: Same lot in test!
                sha256="hash_2",
            ),
        ]
        validator = DatasetValidator()
        report = validator.validate_records(records, check_files_on_disk=False)
        assert report.is_valid is False
        assert any(e.issue_type == "GROUP_LEAKAGE" for e in report.errors)

    def test_validation_report_generation(self):
        """Test 12: Generates machine-readable report JSON."""
        records = [
            ImageMetadata(
                image_id=f"IMG_{i}",
                file_path=f"img_{i}.jpg",
                dataset_id="test",
                source_type=DatasetSourceType.SYNTHETIC_TEST,
                ecosetu_category="PCB",
                split=DatasetSplitEnum.TRAIN,
                sha256=f"hash_{i}",
            )
            for i in range(10)
        ]
        validator = DatasetValidator()
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            report_path = f.name

        try:
            report = validator.validate_records(
                records,
                dataset_version="v0.1.0",
                check_files_on_disk=False,
                output_report_path=report_path,
            )
            assert report.is_valid is True
            assert os.path.exists(report_path)
            with open(report_path, "r", encoding="utf-8") as f:
                saved_json = json.load(f)
            assert saved_json["is_valid"] is True
            assert saved_json["total_records"] == 10
            assert saved_json["dataset_version"] == "v0.1.0"
        finally:
            if os.path.exists(report_path):
                os.remove(report_path)


class TestDatasetSplitting:
    """Test 7, 8: Deterministic split reproducibility and distribution."""

    def test_deterministic_split_reproducibility(self):
        """Test 7: Identical random seed produces identical split assignment."""
        records = [
            ImageMetadata(
                image_id=f"IMG_SPLIT_{i}",
                file_path=f"p_{i}.jpg",
                dataset_id="test",
                source_type=DatasetSourceType.SYNTHETIC_TEST,
                ecosetu_category="PCB" if i % 2 == 0 else "BATTERY",
                sha256=f"h_{i}",
            )
            for i in range(50)
        ]

        splitter_a = DatasetSplitter(random_seed=42)
        split_a, counts_a = splitter_a.split_records(records)
        assignments_a = [r.split for r in split_a]

        splitter_b = DatasetSplitter(random_seed=42)
        split_b, counts_b = splitter_b.split_records(records)
        assignments_b = [r.split for r in split_b]

        assert assignments_a == assignments_b, "Same seed must produce 100% identical split assignments"
        assert counts_a == counts_b

    def test_split_distribution_proportions(self):
        """Test 8: Split roughly satisfies 70/20/10 target."""
        records = [
            ImageMetadata(
                image_id=f"IMG_DIST_{i}",
                file_path=f"dist_{i}.jpg",
                dataset_id="test",
                source_type=DatasetSourceType.SYNTHETIC_TEST,
                ecosetu_category="PCB",
                sha256=f"hash_{i}",
            )
            for i in range(100)
        ]

        splitter = DatasetSplitter(train_ratio=0.70, val_ratio=0.20, test_ratio=0.10, random_seed=42)
        _, counts = splitter.split_records(records)

        assert counts[DatasetSplitEnum.TRAIN.value] == 70
        assert counts[DatasetSplitEnum.VAL.value] == 20
        assert counts[DatasetSplitEnum.TEST.value] == 10

    def test_group_aware_splitting_keeps_lot_together(self):
        """Verify that items sharing a group_id are assigned to the exact same split."""
        records = []
        for group_idx in range(10):
            lot_ref = f"LOT-202609-GRP{group_idx:02d}"
            for item_idx in range(5):
                records.append(
                    ImageMetadata(
                        image_id=f"IMG_GRP_{group_idx}_{item_idx}",
                        file_path=f"grp_{group_idx}_{item_idx}.jpg",
                        dataset_id="test",
                        source_type=DatasetSourceType.FIELD_COLLECTED,
                        ecosetu_category="PCB",
                        group_id=lot_ref,
                        sha256=f"sha_{group_idx}_{item_idx}",
                    )
                )

        splitter = DatasetSplitter(random_seed=42)
        split_records, _ = splitter.split_records(records)

        # Check each group has only 1 distinct split
        group_splits = {}
        for r in split_records:
            if r.group_id not in group_splits:
                group_splits[r.group_id] = r.split
            else:
                assert group_splits[r.group_id] == r.split, (
                    f"Group {r.group_id} split across {group_splits[r.group_id]} and {r.split}"
                )


class TestManifestAndProvenance:
    """Test 9, 10, 14: Dataset version manifest, provenance, and source segregation."""

    def test_manifest_creation_and_provenance(self):
        """Test 9 & 10: Version manifest records provenance, source, and splits."""
        records = [
            ImageMetadata(
                image_id=f"IMG_MAN_{i}",
                file_path=f"man_{i}.jpg",
                dataset_id="kaggle-ewaste-v1",
                source_type=DatasetSourceType.EXTERNAL_PUBLIC,
                source_url="https://kaggle.com/example",
                license="CC-BY-4.0",
                ecosetu_category="PCB" if i % 2 == 0 else "CABLE",
                split=DatasetSplitEnum.TRAIN if i < 8 else DatasetSplitEnum.VAL,
                sha256=f"hash_man_{i}",
            )
            for i in range(10)
        ]

        manifest = ManifestManager.create_manifest(
            dataset_name="Kaggle E-Waste Benchmark",
            dataset_id="kaggle-ewaste-v1",
            version="v0.1.0",
            source="Kaggle Open Dataset",
            source_type=DatasetSourceType.EXTERNAL_PUBLIC,
            source_url_reference="https://kaggle.com/example",
            license_str="CC-BY-4.0",
            records=records,
            random_seed=42,
        )

        assert manifest.dataset_id == "kaggle-ewaste-v1"
        assert manifest.version == "v0.1.0"
        assert manifest.source_type == DatasetSourceType.EXTERNAL_PUBLIC
        assert manifest.license == "CC-BY-4.0"
        assert manifest.total_records == 10
        assert manifest.mapped_ecosetu_class_count == 2
        assert manifest.split_counts["TRAIN"] == 8
        assert manifest.split_counts["VAL"] == 2
        assert any("NO TRAINED MODEL EXISTS YET" in lim for lim in manifest.known_limitations)

    def test_unverified_license_fallback(self):
        """Verify license defaults to LICENSE_UNVERIFIED if not explicitly documented."""
        manifest = ManifestManager.create_manifest(
            dataset_name="Unverified Scrap Collection",
            dataset_id="unverified-scrap",
            version="v0.1.0",
            source="Online Web Scraping",
            source_type=DatasetSourceType.EXTERNAL_PUBLIC,
            source_url_reference="https://unknown.com",
            license_str=None,  # Not provided
            records=[],
        )
        assert manifest.license == "LICENSE_UNVERIFIED", "Unknown license must default to LICENSE_UNVERIFIED"

    def test_source_type_segregation(self):
        """Test 14: Confirms all four source types are cleanly distinguishable."""
        types = [
            DatasetSourceType.EXTERNAL_PUBLIC,
            DatasetSourceType.FIELD_COLLECTED,
            DatasetSourceType.ECOSETU_PRODUCTION,
            DatasetSourceType.SYNTHETIC_TEST,
        ]
        assert len(types) == 4
        assert len(set(types)) == 4
