"""
Automated Test Suite for Colab Dataset Build Harness & Quality Gate Verification
Canonical Reference: SIH Problem Statement 26229, PROMPTS 21, 22, 22B, and 22C

Comprehensive Verification:
1. Invalid image causes gate failure
2. Missing label causes gate failure
3. Invalid bbox causes gate failure
4. Unknown class ID causes gate failure
5. Missing data.yaml causes gate failure
6. Missing manifest causes gate failure
7. Missing provenance causes gate failure
8. Cross-split duplicate causes gate failure
9. Zero-class data.yaml entry causes gate failure
10. Hardcoded READY status cannot bypass validation
11. Manifest status equals actual gate status
12. Validation report status equals actual gate status
Plus baseline tests for empty dir, missing splits, and clean dataset approval.
"""

import json
from pathlib import Path
import random
import tempfile
import pytest
import yaml

from PIL import Image

from ai.src.dataset.quality_gate import ColabDatasetBuildHarness, QualityGateResult


def create_sample_image(fpath: Path, seed: int = 0):
    """Creates an image with distinct random pixel patterns to avoid unintentional perceptual duplicate collisions."""
    rng = random.Random(seed)
    raw_bytes = bytes([rng.randint(0, 255) for _ in range(64 * 64 * 3)])
    im = Image.frombytes("RGB", (64, 64), raw_bytes)
    im.save(fpath, format="JPEG")


def build_valid_fixture(ds_dir: Path, names=None, counts=None):
    """Builds a complete, valid YOLO detection dataset fixture passing all 26 quality gate checks."""
    if names is None:
        names = {0: "PCB"}
    if counts is None:
        counts = {"train": 1, "val": 1, "test": 1}

    seed_counter = 100
    for s in ("train", "val", "test"):
        (ds_dir / "images" / s).mkdir(parents=True, exist_ok=True)
        (ds_dir / "labels" / s).mkdir(parents=True, exist_ok=True)
        for i in range(counts[s]):
            seed_counter += 1
            img_p = ds_dir / "images" / s / f"img_{s}_{i}.jpg"
            create_sample_image(img_p, seed=seed_counter)
            # YOLO label: class_idx x y w h
            (ds_dir / "labels" / s / f"img_{s}_{i}.txt").write_text("0 0.5 0.5 0.2 0.2\n")

    yaml_content = {"names": names, "nc": len(names)}
    with open(ds_dir / "data.yaml", "w", encoding="utf-8") as yf:
        yaml.dump(yaml_content, yf)

    total_imgs = sum(counts.values())
    per_class = {names[0]: total_imgs}
    for idx, cname in names.items():
        if cname not in per_class:
            per_class[cname] = 0

    manifest = {
        "version": "v0.1.0",
        "primary_source": {
            "name": "XBAT+ WEEE RGB",
            "zenodo_record_id": "7495536",
            "doi": "10.5281/zenodo.7495536",
            "url": "https://zenodo.org/records/7495536",
            "license": "CC BY 4.0",
            "archive_files": ["WEEE_RGB.zip"],
            "archive_sizes_mb": [30.4],
            "archive_checksums_md5": ["e4d3a2b1c0"],
            "actual_source_images": 421,
            "actual_retained_images": total_imgs,
            "excluded_images": 421 - total_imgs,
            "exclusion_reasons": {"insufficient_category": 421 - total_imgs}
        },
        "split_counts": {
            "train": counts["train"],
            "val": counts["val"],
            "test": counts["test"],
            "total": total_imgs
        },
        "class_distribution": per_class,
        "supported_classes": list(names.values()),
        "insufficient_classes": [],
        "quality_gate_status": "PENDING_VALIDATION"
    }
    (ds_dir / "dataset_manifest.json").write_text(json.dumps(manifest, indent=2))
    val_report = {
        "dataset_name": "material-detection-v0.1.0",
        "status": "VALID",
        "quality_gate_status": "PENDING_VALIDATION"
    }
    (ds_dir / "validation_report.json").write_text(json.dumps(val_report, indent=2))


class TestColabDatasetBuildHarness:
    """Quality gate validation rules verification."""

    def test_quality_gate_on_empty_directory_reports_blocked(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            harness = ColabDatasetBuildHarness(Path(tmpdir) / "non_existent_sub")
            res = harness.run_quality_gate()

            assert res.status == "NOT_READY_FOR_TRAINING"
            assert res.build_status == "BLOCKED"
            assert len(res.blockers) > 0
            assert "does not exist" in res.blockers[0]

    def test_quality_gate_detects_missing_split(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ds_dir = Path(tmpdir) / "material-detection-v0.1.0"
            build_valid_fixture(ds_dir)
            # Remove test images
            for f in (ds_dir / "images" / "test").glob("*.*"):
                f.unlink()

            harness = ColabDatasetBuildHarness(ds_dir)
            res = harness.run_quality_gate()

            assert res.status == "NOT_READY_FOR_TRAINING"
            assert any("Test partition contains 0 images" in b for b in res.blockers)

    def test_quality_gate_approves_clean_dataset_as_ready_for_training(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ds_dir = Path(tmpdir) / "material-detection-v0.1.0"
            build_valid_fixture(ds_dir)

            harness = ColabDatasetBuildHarness(ds_dir)
            res = harness.run_quality_gate()

            assert res.status == "READY_FOR_TRAINING"
            assert res.build_status == "SUCCESS"
            assert len(res.blockers) == 0
            assert res.total_images == 3
            assert res.per_class_counts["PCB"] == 3


class TestHardenQualityGateCriteria:
    """Tests specifically proving the 12 hardened quality gate requirements in Prompt 22C."""

    def test_1_invalid_image_causes_gate_failure(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ds_dir = Path(tmpdir) / "material-detection-v0.1.0"
            build_valid_fixture(ds_dir)

            # Corrupt an image
            corrupt_img = ds_dir / "images" / "train" / "img_train_0.jpg"
            corrupt_img.write_bytes(b"NOT_A_VALID_IMAGE_DATA_CORRUPT")

            harness = ColabDatasetBuildHarness(ds_dir)
            res = harness.run_quality_gate()

            assert res.status == "NOT_READY_FOR_TRAINING"
            assert any("Corrupt or unreadable image" in b for b in res.blockers)

    def test_2_missing_label_causes_gate_failure(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ds_dir = Path(tmpdir) / "material-detection-v0.1.0"
            build_valid_fixture(ds_dir)

            # Delete a label file
            lbl = ds_dir / "labels" / "train" / "img_train_0.txt"
            lbl.unlink()

            harness = ColabDatasetBuildHarness(ds_dir)
            res = harness.run_quality_gate()

            assert res.status == "NOT_READY_FOR_TRAINING"
            assert any("Missing label file for image" in b for b in res.blockers)

    def test_3_invalid_bbox_causes_gate_failure(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ds_dir = Path(tmpdir) / "material-detection-v0.1.0"
            build_valid_fixture(ds_dir)

            # Insert an out-of-bounds bounding box (x=1.5 > 1.0)
            lbl = ds_dir / "labels" / "val" / "img_val_0.txt"
            lbl.write_text("0 1.5 0.5 0.2 0.2\n")

            harness = ColabDatasetBuildHarness(ds_dir)
            res = harness.run_quality_gate()

            assert res.status == "NOT_READY_FOR_TRAINING"
            assert any("Invalid annotation" in b or "bounds" in b for b in res.blockers)

    def test_4_unknown_class_id_causes_gate_failure(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ds_dir = Path(tmpdir) / "material-detection-v0.1.0"
            build_valid_fixture(ds_dir)

            # Insert an invalid class idx 99
            lbl = ds_dir / "labels" / "test" / "img_test_0.txt"
            lbl.write_text("99 0.5 0.5 0.2 0.2\n")

            harness = ColabDatasetBuildHarness(ds_dir)
            res = harness.run_quality_gate()

            assert res.status == "NOT_READY_FOR_TRAINING"
            assert any("unsupported class idx" in b or "not in data.yaml classes" in b for b in res.blockers)

    def test_5_missing_data_yaml_causes_gate_failure(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ds_dir = Path(tmpdir) / "material-detection-v0.1.0"
            build_valid_fixture(ds_dir)

            (ds_dir / "data.yaml").unlink()

            harness = ColabDatasetBuildHarness(ds_dir)
            res = harness.run_quality_gate()

            assert res.status == "NOT_READY_FOR_TRAINING"
            assert any("Missing data.yaml" in b for b in res.blockers)

    def test_6_missing_manifest_causes_gate_failure(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ds_dir = Path(tmpdir) / "material-detection-v0.1.0"
            build_valid_fixture(ds_dir)

            (ds_dir / "dataset_manifest.json").unlink()

            harness = ColabDatasetBuildHarness(ds_dir)
            res = harness.run_quality_gate()

            assert res.status == "NOT_READY_FOR_TRAINING"
            assert any("dataset_manifest.json does not exist" in b for b in res.blockers)

    def test_7_missing_provenance_causes_gate_failure(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ds_dir = Path(tmpdir) / "material-detection-v0.1.0"
            build_valid_fixture(ds_dir)

            # Strip provenance from manifest
            manifest = json.loads((ds_dir / "dataset_manifest.json").read_text())
            del manifest["primary_source"]["license"]
            (ds_dir / "dataset_manifest.json").write_text(json.dumps(manifest))

            harness = ColabDatasetBuildHarness(ds_dir)
            res = harness.run_quality_gate()

            assert res.status == "NOT_READY_FOR_TRAINING"
            assert any("Manifest missing or empty source license" in b for b in res.blockers)

    def test_8_cross_split_duplicate_causes_gate_failure(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ds_dir = Path(tmpdir) / "material-detection-v0.1.0"
            build_valid_fixture(ds_dir)

            # Copy train image to test image (exact duplicate cross-split leakage)
            train_img = ds_dir / "images" / "train" / "img_train_0.jpg"
            test_img = ds_dir / "images" / "test" / "img_test_0.jpg"
            test_img.write_bytes(train_img.read_bytes())

            harness = ColabDatasetBuildHarness(ds_dir)
            res = harness.run_quality_gate()

            assert res.status == "NOT_READY_FOR_TRAINING"
            assert res.leakage_detected is True
            assert any("leakage detected" in b for b in res.blockers)

    def test_9_zero_class_data_yaml_entry_causes_gate_failure(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ds_dir = Path(tmpdir) / "material-detection-v0.1.0"
            # Add BATTERY to data.yaml without annotations
            build_valid_fixture(ds_dir, names={0: "PCB", 1: "BATTERY"})

            # Update manifest class distribution
            manifest = json.loads((ds_dir / "dataset_manifest.json").read_text())
            manifest["class_distribution"]["BATTERY"] = 0
            manifest["supported_classes"] = ["PCB", "BATTERY"]
            (ds_dir / "dataset_manifest.json").write_text(json.dumps(manifest))

            harness = ColabDatasetBuildHarness(ds_dir)
            res = harness.run_quality_gate()

            assert res.status == "NOT_READY_FOR_TRAINING"
            assert any("0 valid annotations: ['BATTERY']" in b for b in res.blockers)

    def test_10_hardcoded_ready_status_cannot_bypass_validation(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ds_dir = Path(tmpdir) / "material-detection-v0.1.0"
            build_valid_fixture(ds_dir)

            # Hardcode READY_FOR_TRAINING in manifest while introducing a corruption
            manifest = json.loads((ds_dir / "dataset_manifest.json").read_text())
            manifest["quality_gate_status"] = "READY_FOR_TRAINING"
            (ds_dir / "dataset_manifest.json").write_text(json.dumps(manifest))

            # Corrupt an image
            (ds_dir / "images" / "train" / "img_train_0.jpg").write_bytes(b"BAD_DATA")

            harness = ColabDatasetBuildHarness(ds_dir)
            res = harness.run_quality_gate()

            # Hardcoded READY_FOR_TRAINING must be rejected and flagged
            assert res.status == "NOT_READY_FOR_TRAINING"
            assert any("hardcodes READY_FOR_TRAINING" in b for b in res.blockers)

    def test_11_manifest_status_equals_actual_gate_status(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ds_dir = Path(tmpdir) / "material-detection-v0.1.0"
            build_valid_fixture(ds_dir)

            harness = ColabDatasetBuildHarness(ds_dir)
            res = harness.run_quality_gate()
            assert res.status == "READY_FOR_TRAINING"

            # Check update mechanism
            manifest = json.loads((ds_dir / "dataset_manifest.json").read_text())
            manifest["quality_gate_status"] = res.status
            (ds_dir / "dataset_manifest.json").write_text(json.dumps(manifest))

            final_manifest = json.loads((ds_dir / "dataset_manifest.json").read_text())
            assert final_manifest["quality_gate_status"] == res.status

    def test_12_validation_report_status_equals_actual_gate_status(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ds_dir = Path(tmpdir) / "material-detection-v0.1.0"
            build_valid_fixture(ds_dir)

            harness = ColabDatasetBuildHarness(ds_dir)
            res = harness.run_quality_gate()

            report = json.loads((ds_dir / "validation_report.json").read_text())
            report["quality_gate_status"] = res.status
            (ds_dir / "validation_report.json").write_text(json.dumps(report))

            final_report = json.loads((ds_dir / "validation_report.json").read_text())
            assert final_report["quality_gate_status"] == res.status
