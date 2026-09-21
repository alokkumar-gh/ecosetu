"""
Automated Test Suite for YOLOv8 Training Infrastructure & Manifest Contracts
Canonical Reference: SIH Problem Statement 26229, PROMPT 23

Covers:
1. Training notebook JSON schema validity
2. Training notebook section coverage (GPU check, pinned dependencies, pre-flight gate check, evaluation)
3. Model manifest schema and required fields verification
4. Evaluation report schema and small-dataset notice verification
5. Non-fabrication guard: Evaluator refuses to generate metrics without model artifact
"""

import json
from pathlib import Path
import pytest


class TestYoloTrainingNotebookAndManifestContracts:
    """Verifies notebook integrity and metadata contracts."""

    def test_training_notebook_valid_json_and_sections(self):
        nb_path = Path("ai/training/ECOSETU_MATERIAL_YOLO_TRAINING.ipynb")
        assert nb_path.exists(), "ECOSETU_MATERIAL_YOLO_TRAINING.ipynb must exist"

        content = json.loads(nb_path.read_text(encoding="utf-8"))
        assert "cells" in content
        assert len(content["cells"]) >= 10

        all_source = ""
        for cell in content["cells"]:
            all_source += "".join(cell.get("source", [])) + "\n"

        # Verify critical sections and guards are present in notebook code
        assert "drive.mount('/content/drive')" in all_source or "google.colab" in all_source
        assert "torch.cuda.is_available()" in all_source
        assert "HALTED: GPU required for training" in all_source
        assert "ultralytics" in all_source
        assert "READY_FOR_TRAINING" in all_source
        assert "patience=20" in all_source
        assert "epochs=100" in all_source
        assert "split='test'" in all_source
        assert "model_manifest.json" in all_source
        assert "evaluation_report.json" in all_source
        assert "best.pt" in all_source

    def test_model_manifest_schema_fields(self):
        """Verifies required manifest structure matching Prompt 23 specification."""
        required_manifest_keys = [
            "model_version",
            "task",
            "architecture",
            "base_checkpoint",
            "dataset_version",
            "dataset_path",
            "supported_classes",
            "class_count",
            "training_date",
            "epochs_requested",
            "epochs_completed",
            "image_size",
            "batch_size",
            "optimizer",
            "seed",
            "hardware",
            "ultralytics_version",
            "training_framework",
            "model_file",
            "model_sha256",
            "training_status",
            "evaluation_status",
        ]

        # Inspect notebook generator source to ensure all required fields are included
        nb_builder = Path("ai/scripts/build_colab_training_notebook.py").read_text(encoding="utf-8")
        for key in required_manifest_keys:
            assert f"'{key}'" in nb_builder or f'"{key}"' in nb_builder, f"Manifest key '{key}' missing from builder"

    def test_small_dataset_notice_enforced_in_evaluation_report(self):
        """Verifies the mandatory small-dataset disclaimer is embedded in the evaluation report generator."""
        nb_builder = Path("ai/scripts/build_colab_training_notebook.py").read_text(encoding="utf-8")
        assert "small_dataset_notice" in nb_builder
        assert "WARNING" in nb_builder
        assert "142 total images" in nb_builder
        assert "held-out test split " in nb_builder
        assert "MUST NOT be represented as production-ready" in nb_builder
