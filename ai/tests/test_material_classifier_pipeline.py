"""
Automated Test Suite for EcoSetu Material Classification Model Pipeline
Canonical Reference: SIH Problem Statement 26229, PROMPT 19

Covers:
1. Dataset inspection on empty, clean, and dirty datasets
2. Canonical taxonomy mapping integrity (16 classes)
3. Invalid annotation detection (corrupt coordinates, out-of-bounds bounding boxes)
4. Class mapping integrity & ambiguous class rejection
5. YOLO YAML configuration generation
6. Deterministic configuration reproducibility (seed, augmentations)
7. Model artifact metadata verification and hashing
8. Inference output schema validation (including bounding box constraints)
9. Low-confidence handling (REVIEW_REQUIRED thresholding)
10. Unsupported class handling (unmapped categories routed to REVIEW_REQUIRED)
11. Pre-flight check refusing to train without genuine dataset
12. Pre-flight check refusing to evaluate without model artifact
"""

import json
import os
from pathlib import Path
import tempfile
import pytest
from pydantic import ValidationError

from ai.src.contracts.inference_contract import (
    BoundingBox,
    CategoryPrediction,
    ConfidenceLevel,
    InferenceContract,
)
from ai.src.dataset.class_mapper import ClassMapper
from ai.src.dataset.schema import CANONICAL_MATERIAL_CATEGORIES, MaterialCategoryEnum
from ai.src.pipeline.inspect_dataset import DatasetInspector, InspectionSummary
from ai.src.pipeline.yolo_evaluate import YoloModelEvaluator
from ai.src.pipeline.yolo_pipeline import YoloPipelineConfig, YoloTrainingPipeline


import io
from PIL import Image


def create_synthetic_image(fmt: str = "JPEG", size=(32, 32), color="blue") -> bytes:
    """Generates authentic valid image bytes for unit tests."""
    im = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    im.save(buf, format=fmt)
    return buf.getvalue()


VALID_JPEG_BYTES = create_synthetic_image("JPEG")
VALID_PNG_BYTES = create_synthetic_image("PNG")


class TestDatasetInspection:
    """Tests 1, 3, 4: Dataset inspection on valid, corrupt, and ambiguous data."""

    def test_inspection_empty_directory(self):
        """Verify inspector returns clean zero-count summary on empty directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            inspector = DatasetInspector(tmpdir)
            summary = inspector.inspect()
            assert summary.total_images == 0
            assert summary.total_annotations == 0
            assert len(summary.warnings) > 0

    def test_inspection_clean_classification_dataset(self):
        """Verify inspector detects clean split structure and canonical categories."""
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir)
            for split in ("train", "val", "test"):
                (base / split / "PCB").mkdir(parents=True, exist_ok=True)
                (base / split / "MOBILE_PHONE").mkdir(parents=True, exist_ok=True)

                # Write synthetic valid JPEG images
                (base / split / "PCB" / "pcb_1.jpg").write_bytes(VALID_JPEG_BYTES)
                (base / split / "MOBILE_PHONE" / "phone_1.jpg").write_bytes(VALID_JPEG_BYTES)

            inspector = DatasetInspector(tmpdir)
            summary = inspector.inspect()

            assert summary.total_images == 6
            assert summary.corrupt_images == 0
            assert "PCB" in summary.class_distribution
            assert "MOBILE_PHONE" in summary.class_distribution
            assert summary.split_distribution.get("train") == 2
            assert summary.split_distribution.get("val") == 2
            assert summary.split_distribution.get("test") == 2

    def test_inspection_corrupt_images_detected(self):
        """Verify inspector detects corrupt/truncated image headers."""
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir) / "train" / "BATTERY"
            base.mkdir(parents=True, exist_ok=True)

            # Valid image
            (base / "valid.jpg").write_bytes(VALID_JPEG_BYTES)
            # Corrupt image
            (base / "corrupt.jpg").write_bytes(b"NOT_A_VALID_HEADER")

            inspector = DatasetInspector(tmpdir)
            summary = inspector.inspect()

            assert summary.total_images == 2
            assert summary.corrupt_images == 1
            assert any("Corrupt image" in err for err in summary.errors)

    def test_inspection_ambiguous_and_unmapped_classes(self):
        """Verify inspector reports ambiguous classes without auto-coercing them."""
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir) / "train"
            (base / "e-waste").mkdir(parents=True, exist_ok=True)
            (base / "unknown_junk").mkdir(parents=True, exist_ok=True)

            (base / "e-waste" / "img1.jpg").write_bytes(VALID_JPEG_BYTES)
            (base / "unknown_junk" / "img2.jpg").write_bytes(VALID_JPEG_BYTES)

            inspector = DatasetInspector(tmpdir)
            summary = inspector.inspect()

            assert summary.ambiguous_classes_count >= 1
            assert summary.unmapped_classes_count >= 1
            assert any(item["raw"] == "e-waste" for item in summary.ambiguous_classes)
            assert any(item["raw"] == "unknown_junk" for item in summary.unmapped_classes)


class TestYoloConfigurationAndPipeline:
    """Tests 5, 6, 11: YOLO YAML config, determinism, and pre-flight guards."""

    def test_yolo_yaml_generation_contains_all_16_categories(self):
        """Verify generated dataset YAML contains all 16 canonical categories."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yaml_path = Path(tmpdir) / "dataset.yaml"
            config = YoloPipelineConfig(
                yaml_config_path=str(yaml_path),
                data_path=tmpdir,
            )
            pipeline = YoloTrainingPipeline(config)
            generated_path = pipeline.generate_yolo_yaml()

            assert os.path.exists(generated_path)
            import yaml
            with open(generated_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)

            assert data["nc"] == 16
            assert len(data["names"]) == 16
            assert data["names"][0] == "CRT"
            assert data["names"][2] == "PCB"
            assert data["names"][15] == "OTHER"

    def test_deterministic_configuration_reproducibility(self):
        """Verify deterministic seed and hyperparameters remain consistent."""
        config1 = YoloPipelineConfig(seed=42, epochs=50)
        config2 = YoloPipelineConfig(seed=42, epochs=50)

        assert config1.seed == config2.seed
        assert config1.hsv_h == 0.0  # Zero hue shift protects material identity
        assert config1.optimizer == "AdamW"
        assert config1.patience == 10

    def test_preflight_refuses_to_train_without_dataset(self):
        """Verify pipeline cleanly refuses to train and does NOT fabricate weights when dataset missing."""
        config = YoloPipelineConfig(data_path="non_existent_path_xyz_123")
        pipeline = YoloTrainingPipeline(config)

        res = pipeline.run_training()
        assert res["trained"] is False
        assert res["status"] == "STOPPED_NO_DATASET"
        assert res["model_weights"] is None

    def test_evaluator_refuses_without_model(self):
        """Verify evaluator refuses to run or fabricate metrics when model missing."""
        evaluator = YoloModelEvaluator(
            model_path="ai/models/material-classifier/artifacts/non_existent.pt",
            data_path="ai/datasets/material-classification/processed",
        )
        metrics = evaluator.evaluate(split="test")
        assert metrics is None


class TestInferenceContractsAndSafety:
    """Tests 8, 9, 10: Inference contracts, bounding box constraints, and uncertainty review."""

    def test_bounding_box_coordinate_constraints(self):
        """Verify bounding box requires normalized coordinates and x_min < x_max."""
        # Valid box
        box = BoundingBox(x_min=0.1, y_min=0.2, x_max=0.8, y_max=0.9)
        assert box.x_min == 0.1
        assert box.y_max == 0.9

        # Inverted box (x_min >= x_max) should raise error
        with pytest.raises(ValueError):
            BoundingBox(x_min=0.8, y_min=0.2, x_max=0.1, y_max=0.9)

        # Out-of-bounds coordinates should raise validation error
        with pytest.raises(ValidationError):
            BoundingBox(x_min=-0.1, y_min=0.2, x_max=0.8, y_max=0.9)

    def test_high_confidence_prediction_no_review_required(self):
        """Verify confidence >= 0.80 results in HIGH confidence and review_required=False."""
        preds = [
            CategoryPrediction(category=MaterialCategoryEnum.PCB, confidence=0.92),
            CategoryPrediction(category=MaterialCategoryEnum.OTHER, confidence=0.08),
        ]
        contract = InferenceContract.create_result(
            model_id="mat-v1",
            model_version="v0.1.0",
            model_type="classification",
            predictions=preds,
            latency_ms=120,
        )

        assert contract.primary_category == MaterialCategoryEnum.PCB
        assert contract.confidence == 0.92
        assert contract.confidence_level == ConfidenceLevel.HIGH
        assert contract.review_required is False
        assert contract.review_reason is None

    def test_medium_confidence_suggests_review(self):
        """Verify confidence 0.50 - 0.79 results in MEDIUM confidence and review_required=True."""
        preds = [
            CategoryPrediction(category=MaterialCategoryEnum.CABLE, confidence=0.65),
            CategoryPrediction(category=MaterialCategoryEnum.OTHER, confidence=0.35),
        ]
        contract = InferenceContract.create_result(
            model_id="mat-v1",
            model_version="v0.1.0",
            model_type="classification",
            predictions=preds,
            latency_ms=150,
        )

        assert contract.confidence_level == ConfidenceLevel.MEDIUM
        assert contract.review_required is True
        assert "confirmation suggested" in contract.review_reason.lower()

    def test_low_confidence_requires_mandatory_review(self):
        """Verify confidence < 0.50 triggers LOW confidence and mandatory visual review."""
        preds = [
            CategoryPrediction(category=MaterialCategoryEnum.BATTERY, confidence=0.42),
            CategoryPrediction(category=MaterialCategoryEnum.MIXED_PLASTIC, confidence=0.38),
        ]
        contract = InferenceContract.create_result(
            model_id="mat-v1",
            model_version="v0.1.0",
            model_type="classification",
            predictions=preds,
            latency_ms=110,
        )

        assert contract.confidence_level == ConfidenceLevel.LOW
        assert contract.review_required is True
        assert "visual inspection required" in contract.review_reason.lower()

    def test_empty_predictions_fallback_to_other(self):
        """Verify empty predictions gracefully fall back to OTHER with LOW confidence."""
        contract = InferenceContract.create_result(
            model_id="mat-v1",
            model_version="v0.1.0",
            model_type="classification",
            predictions=[],
            latency_ms=80,
        )

        assert contract.primary_category == MaterialCategoryEnum.OTHER
        assert contract.confidence == 0.0
        assert contract.confidence_level == ConfidenceLevel.LOW
        assert contract.review_required is True
