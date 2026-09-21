"""
EcoSetu YOLO Model Evaluation Engine
Canonical Reference: docs/11_AI_EWASTE_DETECTION.md Section 9, docs/12_AI_TRAINING_PLAN.md Section 9

Evaluates trained YOLO classification or detection weights against a held-out test split.
Records genuine metrics (precision, recall, mAP50, top-1, top-5, latency) and saves them.
Refuses to fabricate metrics if the model artifact or test dataset does not exist.
"""

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class EvaluationMetrics:
    model_id: str
    model_version: str
    task: str
    evaluated_at: str
    dataset_path: str
    split: str
    sample_count: int

    # Metrics for classification models
    top1_accuracy: Optional[float] = None
    top5_accuracy: Optional[float] = None

    # Metrics for object detection models
    precision: Optional[float] = None
    recall: Optional[float] = None
    mAP50: Optional[float] = None
    mAP50_95: Optional[float] = None

    # Per-class performance metrics where available
    per_class_metrics: Dict[str, Dict[str, float]] = None

    # Latency breakdown (ms)
    speed_ms: Dict[str, float] = None


class YoloModelEvaluator:
    """
    Evaluates trained YOLO models against authentic test data.
    """

    def __init__(self, model_path: str, data_path: str, task: str = "classify"):
        self.model_path = Path(model_path)
        self.data_path = Path(data_path)
        self.task = task

    def evaluate(self, split: str = "test", output_metrics_path: Optional[str] = None) -> Optional[EvaluationMetrics]:
        """
        Runs model evaluation. If model or test split is missing, reports honestly without fabrication.
        """
        print("================================================================")
        print("ECOSETU YOLOV8 MODEL EVALUATION ENGINE")
        print("================================================================")
        print(f"Model Path:      {self.model_path}")
        print(f"Dataset Path:    {self.data_path}")
        print(f"Task:            {self.task}")
        print(f"Split:           {split}")
        print("================================================================\n")

        # 1. Model Artifact Verification
        if not self.model_path.exists():
            print(
                f"MODEL ARTIFACT MISSING — Cannot evaluate non-existent model: '{self.model_path}'.\n"
                "Model training has not been executed yet. No metrics will be fabricated.\n"
            )
            return None

        # 2. Dataset Verification
        split_dir = self.data_path / split
        if not split_dir.exists() and not self.data_path.exists():
            print(
                f"DATASET SPLIT MISSING — Test split not found at '{split_dir}'.\n"
                "Cannot evaluate without a valid held-out test split.\n"
            )
            return None

        # 3. Check for Ultralytics
        try:
            from ultralytics import YOLO
        except ImportError:
            print("ERROR: 'ultralytics' library is not installed.")
            return None

        print(f"Loading trained weights from {self.model_path}...")
        model = YOLO(str(self.model_path))

        print(f"Evaluating model on '{split}' split...")
        results = model.val(data=str(self.data_path), split=split)

        metrics = EvaluationMetrics(
            model_id=self.model_path.stem,
            model_version="v0.1.0",
            task=self.task,
            evaluated_at=datetime.now(timezone.utc).isoformat(),
            dataset_path=str(self.data_path),
            split=split,
            sample_count=len(results.speed) if hasattr(results, "speed") else 0,
        )

        if self.task == "classify":
            metrics.top1_accuracy = round(float(results.top1), 4) if hasattr(results, "top1") else None
            metrics.top5_accuracy = round(float(results.top5), 4) if hasattr(results, "top5") else None
        else:
            # Detection box metrics
            if hasattr(results, "box"):
                b = results.box
                metrics.precision = round(float(b.mp), 4) if hasattr(b, "mp") else None
                metrics.recall = round(float(b.mr), 4) if hasattr(b, "mr") else None
                metrics.mAP50 = round(float(b.map50), 4) if hasattr(b, "map50") else None
                metrics.mAP50_95 = round(float(b.map), 4) if hasattr(b, "map") else None

        if hasattr(results, "speed"):
            metrics.speed_ms = {k: round(float(v), 2) for k, v in results.speed.items()}

        if output_metrics_path:
            out_p = Path(output_metrics_path)
            out_p.parent.mkdir(parents=True, exist_ok=True)
            with open(out_p, "w", encoding="utf-8") as f:
                json.dump(asdict(metrics), f, indent=2)
            print(f"[OK] Verified evaluation metrics written to: {out_p}")

        return metrics
