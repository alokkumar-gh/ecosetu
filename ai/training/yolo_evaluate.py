"""
EcoSetu YOLO Model Evaluation CLI
Canonical Reference: docs/11_AI_EWASTE_DETECTION.md, docs/12_AI_TRAINING_PLAN.md

Evaluates trained model weights against the test split.
Refuses to fabricate metrics if model or dataset does not exist.
"""

import argparse
from pathlib import Path
import sys

# Ensure repository root is in path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ai.src.pipeline.yolo_evaluate import YoloModelEvaluator


def main():
    parser = argparse.ArgumentParser(description="EcoSetu YOLO Model Evaluation CLI")
    parser.add_argument(
        "--model",
        default="ai/models/material-classifier/artifacts/material-classifier-v0.1.0.pt",
        help="Path to trained model weights (.pt)",
    )
    parser.add_argument(
        "--data",
        default="ai/datasets/material-classification/processed",
        help="Path to dataset directory",
    )
    parser.add_argument(
        "--task",
        choices=["classify", "detect"],
        default="classify",
        help="Model task: classify or detect",
    )
    parser.add_argument(
        "--split",
        default="test",
        help="Split to evaluate: test or val",
    )
    parser.add_argument(
        "--output-metrics",
        default="ai/models/material-classifier/evaluation/metrics.json",
        help="Destination path for evaluation metrics JSON",
    )

    args = parser.parse_args()

    evaluator = YoloModelEvaluator(
        model_path=args.model,
        data_path=args.data,
        task=args.task,
    )
    metrics = evaluator.evaluate(
        split=args.split,
        output_metrics_path=args.output_metrics,
    )

    if metrics is None:
        sys.exit(1)


if __name__ == "__main__":
    main()
