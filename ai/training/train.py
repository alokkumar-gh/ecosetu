"""
EcoSetu YOLOv8 Training Script
Canonical Reference: docs/11_AI_EWASTE_DETECTION.md Section 4, docs/12_AI_TRAINING_PLAN.md Section 8

Provides the entry point for training the e-waste classification model once a prepared dataset is available.
Strictly follows the documented training configurations and hyperparameters.
"""

import os
import sys
import shutil
import argparse
import json
from typing import Optional

# Hyperparameters explicitly specified in docs/12_AI_TRAINING_PLAN.md Section 8.2
DEFAULT_BASE_MODEL = "yolov8n-cls.pt"  # Nano classification variant pretrained on ImageNet
DEFAULT_DATA_DIR = "ai/datasets/processed"
DEFAULT_CONFIG_PATH = "ai/configs/dataset.yaml"
DEFAULT_EPOCHS = 100
DEFAULT_IMGSZ = 224
DEFAULT_BATCH = 32
DEFAULT_PATIENCE = 10
DEFAULT_LR0 = 0.001
DEFAULT_OPTIMIZER = "AdamW"
DEFAULT_SEED = 42
DEFAULT_PROJECT = "runs/classify"
DEFAULT_NAME = "ewaste_v1"
DEFAULT_OUTPUT_MODEL = "ai/models/ewaste_classifier_v1.0.pt"
DEFAULT_CLASS_NAMES_OUT = "ai/models/class_names.json"

DOCUMENTED_CLASSES = [
    "MOBILE_PHONE",
    "LAPTOP",
    "DESKTOP",
    "TABLET",
    "MONITOR",
    "PRINTER",
    "KEYBOARD_MOUSE",
    "CABLE_CHARGER",
    "BATTERY",
    "CIRCUIT_BOARD",
]


def check_dataset_ready(data_path: str) -> bool:
    """
    Verify if the prepared dataset directory exists and contains images.
    Returns False if dataset is missing or empty.
    """
    if not os.path.exists(data_path):
        return False

    # Check for train subdirectory
    train_dir = os.path.join(data_path, "train")
    if not os.path.isdir(train_dir):
        return False

    # Check if there is at least one image in train
    for root, _, files in os.walk(train_dir):
        for f in files:
            if f.lower().endswith((".jpg", ".jpeg", ".png")):
                return True

    return False


def run_training(
    model_name: str = DEFAULT_BASE_MODEL,
    data_path: str = DEFAULT_DATA_DIR,
    epochs: int = DEFAULT_EPOCHS,
    imgsz: int = DEFAULT_IMGSZ,
    batch: int = DEFAULT_BATCH,
    patience: int = DEFAULT_PATIENCE,
    lr0: float = DEFAULT_LR0,
    optimizer: str = DEFAULT_OPTIMIZER,
    seed: int = DEFAULT_SEED,
    project: str = DEFAULT_PROJECT,
    name: str = DEFAULT_NAME,
    output_model_path: str = DEFAULT_OUTPUT_MODEL,
    class_names_path: str = DEFAULT_CLASS_NAMES_OUT,
) -> Optional[str]:
    """
    Execute model training when a prepared dataset is present.
    """
    print("====================================================")
    print("ECOSETU YOLOV8 CLASSIFICATION TRAINING PIPELINE")
    print("====================================================")
    print(f"Base Model:      {model_name}")
    print(f"Dataset Path:    {data_path}")
    print(f"Image Size:      {imgsz}x{imgsz}")
    print(f"Batch Size:      {batch}")
    print(f"Epochs:          {epochs}")
    print(f"Early Stopping:  patience={patience}")
    print(f"Learning Rate:   {lr0} (initial)")
    print(f"Optimizer:       {optimizer}")
    print(f"Random Seed:     {seed}")
    print(f"Target Artifact: {output_model_path}")
    print("====================================================\n")

    # Pre-flight dataset verification
    if not check_dataset_ready(data_path):
        print(
            f"DATASET REQUIRED — No prepared dataset found at '{data_path}'.\n"
            "Training cannot proceed without a prepared dataset.\n"
            "Workflow Instructions:\n"
            "  1. Collect and organize images in ai/datasets/raw/\n"
            "  2. Clean and split into ai/datasets/processed/ (train/val/test)\n"
            "  3. Run validation: python ai/training/validate_dataset.py\n"
            "  4. Re-run training: python ai/training/train.py\n"
        )
        return None

    # Load Ultralytics safely
    try:
        from ultralytics import YOLO
    except ImportError:
        print(
            "ERROR: 'ultralytics' package is not installed.\n"
            "Please install it before running training: pip install ultralytics\n"
        )
        sys.exit(1)

    print("Loading base model architecture...")
    model = YOLO(model_name)

    print("Starting YOLOv8 fine-tuning...")
    results = model.train(
        data=data_path,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        patience=patience,
        lr0=lr0,
        optimizer=optimizer,
        seed=seed,
        project=project,
        name=name,
        pretrained=True,
    )

    # Locate best weights from training run
    best_weights_path = os.path.join(project, name, "weights", "best.pt")
    if os.path.isfile(best_weights_path):
        os.makedirs(os.path.dirname(output_model_path), exist_ok=True)
        shutil.copy2(best_weights_path, output_model_path)
        print(f"\n✔ Successfully exported best weights to: {output_model_path}")

        # Save class names mapping
        with open(class_names_path, "w", encoding="utf-8") as f:
            json.dump(DOCUMENTED_CLASSES, f, indent=2)
        print(f"✔ Saved class names list to: {class_names_path}")

        return output_model_path
    else:
        print(f"\nWarning: Could not locate best weights at expected path: {best_weights_path}")
        return None


def main():
    parser = argparse.ArgumentParser(description="EcoSetu YOLOv8 Classifier Training")
    parser.add_argument("--model", type=str, default=DEFAULT_BASE_MODEL, help="Base model architecture")
    parser.add_argument("--data", type=str, default=DEFAULT_DATA_DIR, help="Path to processed dataset")
    parser.add_argument("--epochs", type=int, default=DEFAULT_EPOCHS, help="Number of training epochs")
    parser.add_argument("--imgsz", type=int, default=DEFAULT_IMGSZ, help="Input image size")
    parser.add_argument("--batch", type=int, default=DEFAULT_BATCH, help="Training batch size")
    parser.add_argument("--patience", type=int, default=DEFAULT_PATIENCE, help="Early stopping patience")
    parser.add_argument("--lr0", type=float, default=DEFAULT_LR0, help="Initial learning rate")
    parser.add_argument("--optimizer", type=str, default=DEFAULT_OPTIMIZER, help="Optimizer")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Random seed")
    parser.add_argument("--project", type=str, default=DEFAULT_PROJECT, help="Output project directory")
    parser.add_argument("--name", type=str, default=DEFAULT_NAME, help="Experiment run name")
    parser.add_argument("--output-model", type=str, default=DEFAULT_OUTPUT_MODEL, help="Export path for best model")

    args = parser.parse_args()

    run_training(
        model_name=args.model,
        data_path=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        patience=args.patience,
        lr0=args.lr0,
        optimizer=args.optimizer,
        seed=args.seed,
        project=args.project,
        name=args.name,
        output_model_path=args.output_model,
    )


if __name__ == "__main__":
    main()
