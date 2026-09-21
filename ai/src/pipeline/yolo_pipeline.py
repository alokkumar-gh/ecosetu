"""
EcoSetu YOLO Training & Artifact Preparation Pipeline
Canonical Reference: docs/11_AI_EWASTE_DETECTION.md, docs/12_AI_TRAINING_PLAN.md

Coordinates reproducible training configuration, pre-flight safety checks,
Ultralytics YOLO integration (classification and detection), checkpoint management,
and model artifact packaging.
"""

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
from typing import Any, Dict, List, Optional, Tuple
import yaml

from ai.src.dataset.schema import CANONICAL_MATERIAL_CATEGORIES, MaterialCategoryEnum


@dataclass
class YoloPipelineConfig:
    # Model architecture selection
    task: str = "classify"                          # "classify" (classification) or "detect" (object detection)
    base_model: str = "yolov8n-cls.pt"              # Nano model: yolov8n-cls.pt or yolov8n.pt
    model_version: str = "v0.1.0"
    model_name: str = "material-classifier-v0.1.0"

    # Dataset paths
    data_path: str = "ai/datasets/material-classification/processed"
    yaml_config_path: str = "ai/models/material-classifier/configs/yolo_dataset.yaml"

    # Training hyperparameters (docs/12_AI_TRAINING_PLAN.md Section 8.2)
    imgsz: int = 224
    epochs: int = 100
    batch_size: int = 32
    patience: int = 10
    lr0: float = 0.001
    optimizer: str = "AdamW"
    seed: int = 42
    device: str = "cpu"                              # "cpu", "0", "0,1" etc.

    # Data augmentation (conservative e-waste preservation)
    hsv_h: float = 0.0                               # Hue variation: 0.0 (preserves material identity)
    hsv_s: float = 0.15                              # Saturation variation: +/- 15%
    hsv_v: float = 0.15                              # Brightness variation: +/- 15%
    degrees: float = 10.0                            # Small rotation: +/- 10 degrees
    translate: float = 0.1                           # Translation: +/- 10%
    scale: float = 0.1                               # Scale variation: +/- 10%
    fliplr: float = 0.5                              # Horizontal flip (semantically valid for scrap)
    flipud: float = 0.0                              # Vertical flip disabled (preserve orientation)

    # Output artifact destinations
    project_dir: str = "runs/train"
    experiment_name: str = "material_v0.1.0"
    output_dir: str = "ai/models/material-classifier/artifacts"


class YoloTrainingPipeline:
    """
    Manages end-to-end YOLO training workflow, configuration generation,
    pre-flight data verification, and artifact versioning.
    """

    def __init__(self, config: Optional[YoloPipelineConfig] = None):
        self.config = config or YoloPipelineConfig()

    def generate_yolo_yaml(self, classes: Optional[List[str]] = None) -> str:
        """
        Generates standard YOLO YAML configuration file.
        Uses the 16 canonical ECOSETU categories by default.
        """
        active_classes = classes or CANONICAL_MATERIAL_CATEGORIES
        names_dict = {i: name for i, name in enumerate(active_classes)}

        data_root = Path(self.config.data_path).resolve().as_posix()
        yaml_content = {
            "path": data_root,
            "train": "train",
            "val": "val",
            "test": "test",
            "nc": len(active_classes),
            "names": names_dict,
        }

        out_path = Path(self.config.yaml_config_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            yaml.dump(yaml_content, f, sort_keys=False)

        return str(out_path)

    def check_dataset_readiness(self) -> Tuple[bool, str]:
        """
        Verifies that actual image files and splits exist before invoking training.
        """
        data_p = Path(self.config.data_path)
        if not data_p.exists():
            return False, f"Dataset root does not exist: {data_p}"

        train_dir = data_p / "train"
        if not train_dir.exists():
            return False, f"Train split directory does not exist: {train_dir}"

        # Check for at least one image file in train
        images = []
        for root, _, files in os.walk(train_dir):
            for f in files:
                if f.lower().endswith((".jpg", ".jpeg", ".png")):
                    images.append(os.path.join(root, f))
                    if len(images) >= 1:
                        break
            if images:
                break

        if not images:
            return False, f"No image files found in train split directory: {train_dir}"

        return True, "Dataset is ready for training"

    def run_training(self) -> Dict[str, Any]:
        """
        Executes YOLO fine-tuning if dataset and Ultralytics dependencies are present.
        If dataset is missing, cleanly stops without fabricating metrics or weights.
        """
        print("================================================================")
        print("ECOSETU YOLOV8 TRAINING PIPELINE")
        print("================================================================")
        print(f"Task:            {self.config.task}")
        print(f"Base Model:      {self.config.base_model}")
        print(f"Dataset Path:    {self.config.data_path}")
        print(f"Epochs:          {self.config.epochs}")
        print(f"Batch Size:      {self.config.batch_size}")
        print(f"Image Resolution:{self.config.imgsz}x{self.config.imgsz}")
        print(f"Optimizer:       {self.config.optimizer}")
        print(f"Learning Rate:   {self.config.lr0}")
        print(f"Seed:            {self.config.seed}")
        print(f"Target Artifact: {self.config.output_dir}/{self.config.model_name}.pt")
        print("================================================================\n")

        # 1. Pre-flight dataset verification
        is_ready, msg = self.check_dataset_readiness()
        if not is_ready:
            print(f"PRE-FLIGHT CHECK FAILED: {msg}")
            print("\nWorkflow Instructions to prepare dataset:")
            print("  1. Ingest external or field dataset via import CLI:")
            print("     python ai/datasets/material-classification/scripts/import_external.py --source <dir> ...")
            print("  2. Split dataset with group-aware partitioner:")
            print("     python ai/datasets/material-classification/scripts/split.py ...")
            print("  3. Run dataset inspection tool:")
            print("     python ai/datasets/material-classification/scripts/inspect_dataset.py --data ai/datasets/material-classification/processed")
            print("  4. Re-run training pipeline.\n")
            return {
                "status": "STOPPED_NO_DATASET",
                "message": msg,
                "trained": False,
                "model_weights": None,
                "metrics": None,
            }

        # 2. Check for Ultralytics library
        try:
            from ultralytics import YOLO
        except ImportError:
            print("ERROR: 'ultralytics' library is not installed in the current environment.")
            print("Install with: uv pip install ultralytics")
            return {
                "status": "STOPPED_MISSING_DEPENDENCY",
                "message": "ultralytics library missing",
                "trained": False,
                "model_weights": None,
                "metrics": None,
            }

        # 3. Generate YAML configuration
        yaml_path = self.generate_yolo_yaml()
        print(f"✔ Generated dataset configuration at: {yaml_path}")

        # 4. Initialize YOLO model
        print(f"Loading base architecture: {self.config.base_model}...")
        model = YOLO(self.config.base_model)

        # 5. Train with conservative augmentations
        train_args = {
            "data": yaml_path if self.config.task == "detect" else self.config.data_path,
            "epochs": self.config.epochs,
            "imgsz": self.config.imgsz,
            "batch": self.config.batch_size,
            "patience": self.config.patience,
            "lr0": self.config.lr0,
            "optimizer": self.config.optimizer,
            "seed": self.config.seed,
            "device": self.config.device,
            "project": self.config.project_dir,
            "name": self.config.experiment_name,
            "hsv_h": self.config.hsv_h,
            "hsv_s": self.config.hsv_s,
            "hsv_v": self.config.hsv_v,
            "degrees": self.config.degrees,
            "translate": self.config.translate,
            "scale": self.config.scale,
            "fliplr": self.config.fliplr,
            "flipud": self.config.flipud,
        }

        print("Executing training run...")
        results = model.train(**train_args)

        # 6. Locate best weights and package artifact
        best_pt = Path(self.config.project_dir) / self.config.experiment_name / "weights" / "best.pt"
        if not best_pt.exists():
            return {
                "status": "FAILED_NO_WEIGHTS",
                "message": f"Training completed but weights not found at {best_pt}",
                "trained": False,
                "model_weights": None,
                "metrics": None,
            }

        # Package artifact with checksum
        dest_dir = Path(self.config.output_dir)
        dest_dir.mkdir(parents=True, exist_ok=True)
        target_model_file = dest_dir / f"{self.config.model_name}.pt"
        shutil.copy2(best_pt, target_model_file)

        hasher = hashlib.sha256()
        with open(target_model_file, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        weights_hash = hasher.hexdigest()

        # Save artifact metadata
        artifact_meta = {
            "model_id": self.config.model_name,
            "model_version": self.config.model_version,
            "task": self.config.task,
            "base_model": self.config.base_model,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "sha256": weights_hash,
            "hyperparameters": asdict(self.config),
            "classes": CANONICAL_MATERIAL_CATEGORIES,
        }
        meta_path = dest_dir / f"{self.config.model_name}_metadata.json"
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(artifact_meta, f, indent=2)

        print(f"[OK] Best model exported to: {target_model_file}")
        print(f"[OK] SHA-256 Checksum: {weights_hash}")
        print(f"[OK] Artifact metadata saved to: {meta_path}")

        return {
            "status": "COMPLETED",
            "trained": True,
            "model_weights": str(target_model_file),
            "checksum": weights_hash,
            "artifact_metadata": str(meta_path),
        }
