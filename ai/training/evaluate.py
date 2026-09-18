"""
EcoSetu YOLOv8 Model Evaluation Script
Canonical Reference: docs/11_AI_EWASTE_DETECTION.md Section 9, docs/12_AI_TRAINING_PLAN.md Section 9

Evaluates a trained e-waste classification model against a test dataset.
Calculates Top-1, Top-5 accuracy, inference latency, and saves verified metrics.
"""

import os
import sys
import argparse
import json
from typing import Optional, Dict, Any

DEFAULT_MODEL_PATH = "ai/models/ewaste_classifier_v1.0.pt"
DEFAULT_DATA_PATH = "ai/datasets/processed"
DEFAULT_SPLIT = "test"
DEFAULT_OUTPUT_METRICS = "ai/models/ewaste_classifier_v1.0_metrics.json"


def evaluate_model(
    model_path: str = DEFAULT_MODEL_PATH,
    data_path: str = DEFAULT_DATA_PATH,
    split: str = DEFAULT_SPLIT,
    output_metrics_path: str = DEFAULT_OUTPUT_METRICS,
) -> Optional[Dict[str, Any]]:
    """
    Run evaluation on the specified dataset split if model artifact and dataset exist.
    """
    print("====================================================")
    print("ECOSETU YOLOV8 MODEL EVALUATION")
    print("====================================================")
    print(f"Model Path:      {model_path}")
    print(f"Dataset Path:    {data_path}")
    print(f"Split:           {split}")
    print(f"Output Metrics:  {output_metrics_path}")
    print("====================================================\n")

    # 1. Model Artifact Verification (Strict Prompt Rule)
    if not os.path.isfile(model_path):
        print(
            f"MODEL ARTIFACT REQUIRED — Cannot evaluate non-existent model artifact: '{model_path}'.\n"
            "Model training has not been performed yet. No metrics will be fabricated.\n"
        )
        return None

    # 2. Dataset Verification
    test_split_path = os.path.join(data_path, split)
    if not os.path.isdir(test_split_path) and not os.path.isdir(data_path):
        print(
            f"DATASET REQUIRED — Test dataset not found at '{test_split_path}'.\n"
            "Cannot evaluate without a valid test dataset.\n"
        )
        return None

    # 3. Load Ultralytics safely
    try:
        from ultralytics import YOLO
    except ImportError:
        print(
            "ERROR: 'ultralytics' package is not installed.\n"
            "Please install it before running evaluation: pip install ultralytics\n"
        )
        sys.exit(1)

    print(f"Loading trained model from {model_path}...")
    model = YOLO(model_path)

    print(f"Evaluating model on '{split}' split...")
    metrics = model.val(data=data_path, split=split)

    results = {
        "model": model_path,
        "split": split,
        "top1_accuracy": round(float(metrics.top1), 4) if hasattr(metrics, "top1") else None,
        "top5_accuracy": round(float(metrics.top5), 4) if hasattr(metrics, "top5") else None,
        "speed": metrics.speed if hasattr(metrics, "speed") else {},
    }

    print("\nEvaluation Results:")
    print(f"  - Top-1 Accuracy: {results['top1_accuracy']}")
    print(f"  - Top-5 Accuracy: {results['top5_accuracy']}")

    os.makedirs(os.path.dirname(output_metrics_path), exist_ok=True)
    with open(output_metrics_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\n✔ Saved verified evaluation metrics to: {output_metrics_path}")

    return results


def main():
    parser = argparse.ArgumentParser(description="EcoSetu YOLOv8 Model Evaluation")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL_PATH, help="Path to trained model weights")
    parser.add_argument("--data", type=str, default=DEFAULT_DATA_PATH, help="Path to processed dataset")
    parser.add_argument("--split", type=str, default=DEFAULT_SPLIT, help="Dataset split to evaluate (test/val)")
    parser.add_argument("--output-metrics", type=str, default=DEFAULT_OUTPUT_METRICS, help="Path to save metrics JSON")

    args = parser.parse_args()

    results = evaluate_model(
        model_path=args.model,
        data_path=args.data,
        split=args.split,
        output_metrics_path=args.output_metrics,
    )

    if results is None:
        sys.exit(1)


if __name__ == "__main__":
    main()
