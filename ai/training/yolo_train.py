"""
EcoSetu YOLO Training Execution CLI
Canonical Reference: docs/11_AI_EWASTE_DETECTION.md, docs/12_AI_TRAINING_PLAN.md

Executes YOLO fine-tuning with conservative augmentations, pre-flight safety checks,
and artifact packaging. Refuses to train or fabricate if dataset is missing.
"""

import argparse
from pathlib import Path
import sys

# Ensure repository root is in path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ai.src.pipeline.yolo_pipeline import YoloPipelineConfig, YoloTrainingPipeline


def main():
    parser = argparse.ArgumentParser(description="EcoSetu YOLO Training CLI")
    parser.add_argument(
        "--task",
        choices=["classify", "detect"],
        default="classify",
        help="Model task: classify (default) or detect",
    )
    parser.add_argument(
        "--base-model",
        default="yolov8n-cls.pt",
        help="Pretrained base model (e.g. yolov8n-cls.pt, yolov8n.pt)",
    )
    parser.add_argument(
        "--data",
        default="ai/datasets/material-classification/processed",
        help="Path to processed dataset directory",
    )
    parser.add_argument("--epochs", type=int, default=100, help="Training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=224, help="Image resolution")
    parser.add_argument("--patience", type=int, default=10, help="Early stopping patience")
    parser.add_argument("--lr0", type=float, default=0.001, help="Initial learning rate")
    parser.add_argument("--optimizer", default="AdamW", help="Optimizer (AdamW, SGD)")
    parser.add_argument("--seed", type=int, default=42, help="Deterministic random seed")
    parser.add_argument("--device", default="cpu", help="Device (cpu, 0, etc.)")
    parser.add_argument(
        "--model-version",
        default="v0.1.0",
        help="Model semantic version tag",
    )
    parser.add_argument(
        "--output-dir",
        default="ai/models/material-classifier/artifacts",
        help="Destination directory for exported best model artifact",
    )

    args = parser.parse_args()

    config = YoloPipelineConfig(
        task=args.task,
        base_model=args.base_model,
        model_version=args.model_version,
        model_name=f"material-classifier-{args.model_version}",
        data_path=args.data,
        imgsz=args.imgsz,
        epochs=args.epochs,
        batch_size=args.batch_size,
        patience=args.patience,
        lr0=args.lr0,
        optimizer=args.optimizer,
        seed=args.seed,
        device=args.device,
        output_dir=args.output_dir,
    )

    pipeline = YoloTrainingPipeline(config)
    result = pipeline.run_training()

    if not result.get("trained", False):
        print(f"\nTraining pipeline halted: {result.get('status')} - {result.get('message')}")
        sys.exit(1)
    else:
        print("\n✔ Training completed successfully.")


if __name__ == "__main__":
    main()
