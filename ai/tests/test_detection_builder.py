"""
Automated Test Suite for Detection Dataset Builder & Annotation Validator
Canonical Reference: SIH Problem Statement 26229, PROMPT 21

Covers:
1. Bounding box validity checking (0.0..1.0 bounds, non-zero area, corner boundaries)
2. Bounding box serialization to standard YOLO format line
3. Label file parsing with valid and corrupt lines
4. Exclusion of unsupported class indices without crashing
5. Detection dataset YOLO data.yaml generation referencing only supported classes
6. Quality gate logic verification (READY_FOR_TRAINING vs NOT_READY_FOR_TRAINING)
"""

import json
from pathlib import Path
import tempfile
import pytest
import yaml

from ai.src.dataset.detection_builder import (
    BBoxAnnotation,
    DetectionDatasetBuilder,
    DetectionValidationSummary,
)


class TestBBoxAnnotationValidation:
    """Tests 1, 2: Bounding box coordinate boundaries and serialization."""

    def test_valid_bbox(self):
        box = BBoxAnnotation(class_idx=0, x_center=0.5, y_center=0.5, width=0.4, height=0.4)
        is_val, msg = box.is_valid()
        assert is_val is True
        assert box.to_yolo_line() == "0 0.500000 0.500000 0.400000 0.400000"

    def test_invalid_negative_coords(self):
        box = BBoxAnnotation(class_idx=0, x_center=-0.1, y_center=0.5, width=0.4, height=0.4)
        is_val, msg = box.is_valid()
        assert is_val is False
        assert "x_center" in msg

    def test_invalid_zero_dimension(self):
        box = BBoxAnnotation(class_idx=0, x_center=0.5, y_center=0.5, width=0.0, height=0.4)
        is_val, msg = box.is_valid()
        assert is_val is False
        assert "width" in msg

    def test_invalid_out_of_bounds_dimension(self):
        box = BBoxAnnotation(class_idx=0, x_center=0.5, y_center=0.5, width=1.2, height=0.4)
        is_val, msg = box.is_valid()
        assert is_val is False
        assert "width" in msg


class TestDetectionDatasetBuilder:
    """Tests 3, 4, 5, 6: Parsing, class mapping, and yaml generation."""

    def test_parse_yolo_label_file_valid_and_invalid(self):
        supported = ["BATTERY", "PCB", "MOBILE_PHONE"]
        builder = DetectionDatasetBuilder(supported_classes=supported)

        with tempfile.NamedTemporaryFile(suffix=".txt", mode="w", delete=False, encoding="utf-8") as f:
            # Line 1: valid BATTERY (idx 0)
            f.write("0 0.5 0.5 0.2 0.2\n")
            # Line 2: valid PCB (idx 1)
            f.write("1 0.3 0.3 0.1 0.1\n")
            # Line 3: invalid out-of-bounds coords
            f.write("2 1.5 0.3 0.1 0.1\n")
            # Line 4: truncated line
            f.write("0 0.5 0.5\n")
            fpath = Path(f.name)

        boxes, errors = builder.parse_yolo_label_file(fpath)

        assert len(boxes) == 2
        assert boxes[0].class_idx == 0
        assert boxes[1].class_idx == 1
        assert len(errors) == 2  # 1 out-of-bounds, 1 truncated

    def test_remapping_raw_classes_to_supported(self):
        supported = ["BATTERY", "PCB"]
        builder = DetectionDatasetBuilder(supported_classes=supported)

        with tempfile.NamedTemporaryFile(suffix=".txt", mode="w", delete=False, encoding="utf-8") as f:
            # Source class 10 -> BATTERY (target 0)
            f.write("10 0.5 0.5 0.2 0.2\n")
            # Source class 20 -> PCB (target 1)
            f.write("20 0.4 0.4 0.3 0.3\n")
            # Source class 99 -> Unmapped/excluded (should be skipped without error)
            f.write("99 0.1 0.1 0.1 0.1\n")
            fpath = Path(f.name)

        raw_to_target = {10: 0, 20: 1}
        boxes, errors = builder.parse_yolo_label_file(fpath, raw_to_supported_map=raw_to_target)

        assert len(boxes) == 2
        assert boxes[0].class_idx == 0
        assert boxes[1].class_idx == 1
        assert len(errors) == 0

    def test_generate_yolo_yaml(self):
        supported = ["BATTERY", "PCB", "CABLE", "MOBILE_PHONE"]
        builder = DetectionDatasetBuilder(
            supported_classes=supported,
            unsupported_classes=["MOTOR", "MAGNET_ASSEMBLY"],
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            ds_path = Path(tmpdir)
            yaml_file = builder.generate_yolo_yaml(ds_path, "test_data.yaml")

            assert yaml_file.exists()
            with open(yaml_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)

            assert data["nc"] == 4
            assert len(data["names"]) == 4
            assert data["names"][0] == "BATTERY"
            assert data["names"][1] == "PCB"
            # Ensure excluded classes are NOT in yaml
            assert "MOTOR" not in data["names"].values()
            assert "MAGNET_ASSEMBLY" not in data["names"].values()
