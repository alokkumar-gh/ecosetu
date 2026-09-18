"""
Unit Tests for EcoSetu AI Training Infrastructure
Tests dataset validation logic, training configuration, and artifact checks.
Ensures no model training or dataset downloads are executed.
"""

import os
import tempfile
import pytest
import yaml
from ai.training.validate_dataset import (
    validate_dataset,
    check_image_header,
    DOCUMENTED_CLASSES,
    ValidationResult,
)
from ai.training.train import (
    check_dataset_ready,
    run_training,
    DEFAULT_EPOCHS,
    DEFAULT_IMGSZ,
    DEFAULT_BATCH,
    DEFAULT_PATIENCE,
    DEFAULT_LR0,
    DEFAULT_OPTIMIZER,
    DEFAULT_SEED,
)
from ai.training.evaluate import evaluate_model

# Minimal valid magic bytes
VALID_JPEG_BYTES = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
VALID_PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"


class TestDatasetConfig:
    """Verify dataset.yaml configuration matches documentation."""

    def test_dataset_yaml_structure_and_classes(self):
        config_path = os.path.join("ai", "configs", "dataset.yaml")
        assert os.path.isfile(config_path), "dataset.yaml must exist at ai/configs/dataset.yaml"

        with open(config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        assert data["nc"] == 10, "Documented class count must be 10"
        names = data["names"]
        assert len(names) == 10, "names dictionary must contain exactly 10 classes"

        extracted_classes = [str(names[i]) for i in range(10)]
        assert extracted_classes == DOCUMENTED_CLASSES, "Classes in dataset.yaml must match DOCUMENTED_CLASSES"


class TestDatasetValidator:
    """Verify validate_dataset.py logic using synthetic temporary test structures."""

    def test_check_image_header(self):
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            f.write(VALID_JPEG_BYTES)
            valid_jpg = f.name

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(VALID_PNG_BYTES)
            valid_png = f.name

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            f.write(b"NOT_A_VALID_JPEG_HEADER")
            invalid_jpg = f.name

        try:
            ok, _ = check_image_header(valid_jpg)
            assert ok is True, "Valid JPEG magic bytes should pass"

            ok, _ = check_image_header(valid_png)
            assert ok is True, "Valid PNG magic bytes should pass"

            ok, err = check_image_header(invalid_jpg)
            assert ok is False, "Invalid JPEG magic bytes should fail"
            assert "Corrupted" in err or "signature" in err
        finally:
            os.remove(valid_jpg)
            os.remove(valid_png)
            os.remove(invalid_jpg)

    def test_valid_synthetic_classification_dataset(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create synthetic train, val, test splits with images for all 10 classes
            for split in ["train", "val", "test"]:
                for cls_name in DOCUMENTED_CLASSES:
                    cls_dir = os.path.join(tmpdir, split, cls_name)
                    os.makedirs(cls_dir, exist_ok=True)
                    # Write synthetic valid image
                    img_path = os.path.join(cls_dir, "sample.jpg")
                    with open(img_path, "wb") as f:
                        f.write(VALID_JPEG_BYTES)

            result: ValidationResult = validate_dataset(tmpdir, min_samples=1)
            assert result.is_valid is True, f"Valid synthetic dataset failed: {result.errors}"
            assert result.total_images == 30  # 3 splits * 10 classes * 1 image
            assert len(result.errors) == 0

    def test_validator_detects_missing_split_directory(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            # Only create train, missing val
            train_dir = os.path.join(tmpdir, "train", DOCUMENTED_CLASSES[0])
            os.makedirs(train_dir, exist_ok=True)
            with open(os.path.join(train_dir, "img.jpg"), "wb") as f:
                f.write(VALID_JPEG_BYTES)

            result = validate_dataset(tmpdir)
            assert result.is_valid is False
            assert any("val" in err for err in result.errors)

    def test_validator_detects_corrupt_images(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            for split in ["train", "val", "test"]:
                for cls_name in DOCUMENTED_CLASSES:
                    cls_dir = os.path.join(tmpdir, split, cls_name)
                    os.makedirs(cls_dir, exist_ok=True)
                    with open(os.path.join(cls_dir, "bad.jpg"), "wb") as f:
                        f.write(b"CORRUPT_CONTENT_WITHOUT_MAGIC_BYTES")

            result = validate_dataset(tmpdir, min_samples=1)
            assert result.is_valid is False
            assert any("Corrupted image" in err for err in result.errors)

    def test_validator_handles_nonexistent_directory(self):
        result = validate_dataset("nonexistent/dataset/path")
        assert result.is_valid is False
        assert any("does not exist" in err for err in result.errors)


class TestTrainingScriptInfra:
    """Verify training script pre-flight checks and hyperparameter configurations."""

    def test_training_hyperparameter_defaults(self):
        assert DEFAULT_EPOCHS == 100, "Epochs must be 100 per docs/12_AI_TRAINING_PLAN.md Section 8.2"
        assert DEFAULT_IMGSZ == 224, "Image size must be 224"
        assert DEFAULT_BATCH == 32, "Batch size must be 32"
        assert DEFAULT_PATIENCE == 10, "Early stopping patience must be 10"
        assert DEFAULT_LR0 == 0.001, "Learning rate must be 0.001"
        assert DEFAULT_OPTIMIZER == "AdamW", "Optimizer must be AdamW"
        assert DEFAULT_SEED == 42, "Seed must be 42"

    def test_training_aborts_cleanly_when_dataset_missing(self, capsys):
        # Empty or non-existent path
        ready = check_dataset_ready("nonexistent/path/to/dataset")
        assert ready is False

        result = run_training(data_path="nonexistent/path/to/dataset")
        assert result is None, "Training should return None when dataset is not ready"

        captured = capsys.readouterr()
        assert "DATASET REQUIRED" in captured.out


class TestEvaluationScriptInfra:
    """Verify evaluation script halts cleanly when model artifact is absent."""

    def test_evaluation_aborts_cleanly_when_model_missing(self, capsys):
        fake_model_path = "ai/models/nonexistent_model_v9.9.pt"
        result = evaluate_model(model_path=fake_model_path, data_path="ai/datasets/processed")
        assert result is None, "Evaluation must return None when model is absent"

        captured = capsys.readouterr()
        assert "MODEL ARTIFACT REQUIRED" in captured.out
        assert "No metrics will be fabricated" in captured.out
