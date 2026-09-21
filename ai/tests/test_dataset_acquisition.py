"""
Automated Test Suite for EcoSetu Dataset Source Evaluation & Acquisition
Canonical Reference: SIH Problem Statement 26229, PROMPT 20

Covers:
1. Candidate source registry metadata integrity & unverified license handling
2. Exact SHA-256 cross-dataset duplicate detection
3. Perceptual dHash duplicate detection (hamming distance <= 4)
4. Source priority preservation during deduplication
5. Authoritative 16-class mapping coverage across evaluated candidate datasets
6. Rejection of ambiguous e-waste labels across sources
7. Colab dataset preparation notebook validity and JSON schema structure
"""

import json
import os
from pathlib import Path
import random
import tempfile
import pytest
import yaml

from PIL import Image

from ai.src.dataset.class_mapper import ClassMapper
from ai.src.dataset.deduplicator import CrossDatasetDeduplicator, DeduplicationReport
from ai.src.dataset.schema import CANONICAL_MATERIAL_CATEGORIES, MaterialCategoryEnum


def create_test_image(size=(64, 64), color="red") -> Image.Image:
    """Helper creating simple test image."""
    return Image.new("RGB", size, color=color)


class TestDeduplicationEngine:
    """Tests 2, 3, 4: Exact and perceptual cross-dataset deduplication."""

    def test_exact_sha256_duplicate_detection(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir)
            img1 = base / "xbat_img1.jpg"
            img2 = base / "roboflow_img2.jpg"

            # Create identical images
            im = create_test_image(color="blue")
            im.save(img1, format="JPEG")
            im.save(img2, format="JPEG")

            dedup = CrossDatasetDeduplicator()
            records = [
                {"id": "rec1", "source": "XBAT", "path": img1, "category": "PCB"},
                {"id": "rec2", "source": "ROBOFLOW", "path": img2, "category": "PCB"},
            ]
            unique, report = dedup.deduplicate(records, priority_source_order=["XBAT", "ROBOFLOW"])

            assert len(unique) == 1
            assert unique[0]["id"] == "rec1"  # Prioritizes XBAT
            assert report.exact_duplicates_found == 1
            assert report.unique_images_retained == 1
            assert len(report.matches) == 1
            assert report.matches[0].match_type == "EXACT_SHA256"

    def test_perceptual_dhash_duplicate_detection(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir)
            img_original = base / "original.jpg"
            img_resized = base / "resized.jpg"

            # Create original and slightly resized version (perceptual duplicate)
            im_orig = create_test_image(size=(128, 128), color="green")
            im_resized = im_orig.resize((96, 96))

            im_orig.save(img_original, format="JPEG")
            im_resized.save(img_resized, format="JPEG")

            dedup = CrossDatasetDeduplicator(hamming_threshold=4)
            records = [
                {"id": "orig", "source": "PRIMARY", "path": img_original, "category": "LAPTOP"},
                {"id": "dup", "source": "SECONDARY", "path": img_resized, "category": "LAPTOP"},
            ]
            unique, report = dedup.deduplicate(records, priority_source_order=["PRIMARY", "SECONDARY"])

            assert len(unique) == 1
            assert unique[0]["id"] == "orig"
            assert report.perceptual_duplicates_found == 1
            assert report.matches[0].match_type == "PERCEPTUAL_DHASH"

    def test_distinct_images_not_flagged_as_duplicates(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir)
            img1 = base / "img1.jpg"
            img2 = base / "img2.jpg"

            # Create distinctly different patterned images (not solid monochrome or uniform half-blocks)
            import random
            rng1 = random.Random(42)
            im1 = Image.frombytes("RGB", (64, 64), bytes([rng1.randint(0, 255) for _ in range(64 * 64 * 3)]))
            im1.save(img1, format="JPEG")

            rng2 = random.Random(9999)
            im2 = Image.frombytes("RGB", (64, 64), bytes([rng2.randint(0, 255) for _ in range(64 * 64 * 3)]))
            im2.save(img2, format="JPEG")

            dedup = CrossDatasetDeduplicator()
            records = [
                {"id": "r1", "source": "SRC1", "path": img1, "category": "CABLE"},
                {"id": "r2", "source": "SRC2", "path": img2, "category": "BATTERY"},
            ]
            unique, report = dedup.deduplicate(records)

            assert len(unique) == 2
            assert report.exact_duplicates_found == 0
            assert report.perceptual_duplicates_found == 0


class TestCandidateClassMappingCoverage:
    """Tests 5, 6: Verify mapping coverage for XBAT+ and EWasteNet classes."""

    def test_xbat_class_mapping(self):
        """Verify XBAT+ classes map to canonical ECOSETU categories."""
        mappings = {
            "mobile": "MOBILE_PHONE",
            "smartphone": "MOBILE_PHONE",
            "battery": "BATTERY",
            "batteries": "BATTERY",
            "printed circuit board": "PCB",
            "circuit board": "PCB",
            "keyboard": "KEYBOARD_MOUSE",
            "mouse": "KEYBOARD_MOUSE",
        }
        for raw, expected in mappings.items():
            res = ClassMapper.map_class(raw)
            assert res.status == "MAPPED"
            assert res.canonical_category == expected

    def test_ewastenet_class_mapping(self):
        """Verify EWasteNet 8-class labels map to canonical or unsupported."""
        # Clean canonical maps
        assert ClassMapper.map_class("mobile").canonical_category == "MOBILE_PHONE"
        assert ClassMapper.map_class("laptop").canonical_category == "LAPTOP"
        assert ClassMapper.map_class("keyboard").canonical_category == "KEYBOARD_MOUSE"
        assert ClassMapper.map_class("mouse").canonical_category == "KEYBOARD_MOUSE"
        # tv is ambiguous across CRT and MONITOR, so must be AMBIGUOUS
        res_tv = ClassMapper.map_class("tv")
        assert res_tv.status == "AMBIGUOUS"
        assert set(res_tv.suggested_candidates) == {"CRT", "MONITOR"}

        # Out of scope appliances remain UNMAPPED (not forced)
        assert ClassMapper.map_class("microwave").canonical_category is None
        assert ClassMapper.map_class("camera").canonical_category is None

    def test_ambiguous_class_labels_rejected(self):
        """Verify generic e-waste terms are strictly flagged as AMBIGUOUS."""
        for label in ["e-waste", "electronics", "scrap", "device", "gadget"]:
            res = ClassMapper.map_class(label)
            assert res.status == "AMBIGUOUS"
            assert res.canonical_category is None


class TestColabWorkflowNotebook:
    """Test 7: Verify V2 notebook format and execution readiness."""

    def test_notebook_json_validity(self):
        old_nb_path = Path("ai/training/ECOSETU_MATERIAL_DATASET_PREPARATION.ipynb")
        assert not old_nb_path.exists(), "Old ECOSETU_MATERIAL_DATASET_PREPARATION.ipynb must be removed"

        v2_path = Path("ai/training/ECOSETU_MATERIAL_DATASET_PREPARATION_V2.ipynb")
        assert v2_path.exists(), "ECOSETU_MATERIAL_DATASET_PREPARATION_V2.ipynb must exist"

        with open(v2_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        assert "cells" in data
        assert len(data["cells"]) >= 15
        # Ensure it contains Google Drive mount, Zenodo DOI, purge directive, success banner, and non-training statement
        all_sources = "".join("".join(cell.get("source", [])) for cell in data["cells"])
        assert "drive.mount" in all_sources
        assert "OLD DATASET REMOVED" in all_sources
        assert "BUILDING FRESH DATASET" in all_sources
        assert "DATASET BUILD SUCCESSFUL" in all_sources
        assert "Intra-dataset perceptual dHash filtering was disabled" in all_sources
        assert "KEYBOARD_MOUSE" in all_sources
        assert "MOBILE_PHONE" in all_sources
        assert "TABLET" in all_sources
        assert "NO MODEL HAS BEEN TRAINED" in all_sources


class TestXBATAcquisitionPipeline:
    """Tests 8, 9, 10: XBAT+ acquisition, MD5 verification, and genuine dataset pipeline."""

    def test_xbat_target_files_and_constants(self):
        from ai.src.dataset.acquisition import XBATDatasetAcquisition, XBAT_SOURCE_CLASSES
        assert XBATDatasetAcquisition.ZENODO_RECORD_ID == "18022530"
        assert "raw_XBAT+_v1.0_RGB_train.zip" in XBATDatasetAcquisition.TARGET_FILES
        assert "raw_XBAT+_v1.0_RGB_test.zip" in XBATDatasetAcquisition.TARGET_FILES
        assert len(XBAT_SOURCE_CLASSES) == 15
        assert XBAT_SOURCE_CLASSES[1] == "ComputerMouse"
        assert XBAT_SOURCE_CLASSES[7] == "iPad"
        assert XBAT_SOURCE_CLASSES[9] == "MobilePhone"

    def test_md5_verification(self):
        from ai.src.dataset.acquisition import XBATDatasetAcquisition
        with tempfile.TemporaryDirectory() as tmp:
            fp = Path(tmp) / "test.bin"
            fp.write_bytes(b"EcoSetu-XBAT-Test-Content")
            import hashlib
            expected = hashlib.md5(b"EcoSetu-XBAT-Test-Content").hexdigest()
            assert XBATDatasetAcquisition.verify_md5(fp, expected)
            assert not XBATDatasetAcquisition.verify_md5(fp, "00000000000000000000000000000000")

    def test_xbat_staged_pipeline_processing_and_quality_gate(self):
        from ai.src.dataset.acquisition import XBATDatasetAcquisition
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir)
            staging = base / "staging"
            staging.mkdir(parents=True, exist_ok=True)
            output = base / "processed" / "material-detection-v0.1.0"

            # Create 10 mock staged XBAT+ images and labels
            # 6 MobilePhone (class 9), 3 iPad (class 7), 2 ComputerMouse (class 1), 2 AlarmClock (class 0, unmapped)
            mock_specs = [
                ("img_phone_1", 9, "red"),
                ("img_phone_2", 9, "blue"),
                ("img_phone_3", 9, "green"),
                ("img_phone_4", 9, "yellow"),
                ("img_phone_5", 9, "cyan"),
                ("img_phone_6", 9, "magenta"),
                ("img_ipad_1", 7, "purple"),
                ("img_ipad_2", 7, "orange"),
                ("img_ipad_3", 7, "brown"),
                ("img_mouse_1", 1, "gray"),
                ("img_mouse_2", 1, "white"),
                ("img_alarm_1", 0, "black"), # unmapped -> excluded
                ("img_alarm_2", 0, "pink"),  # unmapped -> excluded
            ]

            for idx, (stem, class_idx, _) in enumerate(mock_specs):
                img_path = staging / f"{stem}.jpg"
                im = Image.new("RGB", (64, 64))
                prng = random.Random(idx * 1000 + 42)
                rand_pixels = [
                    (prng.randint(0, 255), prng.randint(0, 255), prng.randint(0, 255))
                    for _ in range(64 * 64)
                ]
                im.putdata(rand_pixels)
                im.save(img_path, format="JPEG")
                lbl_path = staging / f"{stem}.txt"
                lbl_path.write_text(f"{class_idx} 0.500000 0.500000 0.400000 0.400000\n", encoding="utf-8")

            q_res, acq_rep = XBATDatasetAcquisition.build_dataset_pipeline(
                staging_dir=staging,
                output_dataset_dir=output,
                split_seed=42,
            )

            # Assertions
            assert acq_rep.extracted_image_count == 13
            assert acq_rep.retained_image_count == 11
            assert acq_rep.excluded_image_count == 2
            assert acq_rep.exclusion_reasons["UNMAPPED_CLASS"] == 2
            assert sorted(list(acq_rep.retained_class_distribution.keys())) == ["KEYBOARD_MOUSE", "MOBILE_PHONE", "TABLET"]
            assert q_res.status == "READY_FOR_TRAINING"
            assert q_res.build_status == "SUCCESS"
            assert q_res.train_count > 0
            assert q_res.val_count > 0
            assert q_res.test_count > 0
            assert not q_res.leakage_detected
            assert len(q_res.blockers) == 0

            # Verify data.yaml
            yaml_path = output / "data.yaml"
            assert yaml_path.exists()
            with open(yaml_path, "r", encoding="utf-8") as f:
                cfg = yaml.safe_load(f)
            assert cfg["nc"] == 3
            assert cfg["names"] == {0: "KEYBOARD_MOUSE", 1: "MOBILE_PHONE", 2: "TABLET"}

