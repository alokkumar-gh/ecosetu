"""
EcoSetu Detection Dataset Builder & Annotation Validator
Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4, Prompts 19-21

Provides comprehensive validation, format normalization, and build services
for genuine bounding-box YOLO object detection datasets:
1. Validates normalized bounding boxes: class_idx x_center y_center width height
2. Rejects out-of-bound (<0.0 or >1.0) and zero-area boxes
3. Verifies label file to image pairing and image header validity
4. Separates SUPPORTED_MODEL_CLASSES from UNSUPPORTED/INSUFFICIENT classes
5. Builds standard YOLO detection directory structure:
     images/{train,val,test}
     labels/{train,val,test}
     data.yaml
     dataset_manifest.json
     validation_report.json
"""

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
from typing import Any, Dict, List, Optional, Set, Tuple
import yaml

from PIL import Image

from ai.src.dataset.class_mapper import ClassMapper
from ai.src.dataset.deduplicator import CrossDatasetDeduplicator


@dataclass
class BBoxAnnotation:
    class_idx: int
    x_center: float
    y_center: float
    width: float
    height: float

    def is_valid(self) -> Tuple[bool, str]:
        """Checks bounds 0.0..1.0 and strictly positive dimensions."""
        if not (0.0 <= self.x_center <= 1.0):
            return False, f"x_center ({self.x_center}) out of bounds [0.0, 1.0]"
        if not (0.0 <= self.y_center <= 1.0):
            return False, f"y_center ({self.y_center}) out of bounds [0.0, 1.0]"
        if not (0.0 < self.width <= 1.0):
            return False, f"width ({self.width}) must be in (0.0, 1.0]"
        if not (0.0 < self.height <= 1.0):
            return False, f"height ({self.height}) must be in (0.0, 1.0]"
        
        # Verify box corners do not severely exceed boundary
        x_min = self.x_center - self.width / 2.0
        y_min = self.y_center - self.height / 2.0
        x_max = self.x_center + self.width / 2.0
        y_max = self.y_center + self.height / 2.0

        if x_min < -0.05 or y_min < -0.05 or x_max > 1.05 or y_max > 1.05:
            return False, f"Bounding box corners ({x_min:.2f}, {y_min:.2f}, {x_max:.2f}, {y_max:.2f}) exceed image boundaries"

        return True, "Valid annotation"

    def to_yolo_line(self) -> str:
        return f"{self.class_idx} {self.x_center:.6f} {self.y_center:.6f} {self.width:.6f} {self.height:.6f}"


@dataclass
class DetectionValidationSummary:
    total_images_scanned: int = 0
    valid_images: int = 0
    corrupt_images: int = 0
    missing_label_files: int = 0
    total_annotations: int = 0
    valid_annotations: int = 0
    invalid_annotations: int = 0
    duplicate_images_removed: int = 0
    class_distribution: Dict[str, int] = field(default_factory=dict)
    split_distribution: Dict[str, Dict[str, int]] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    quality_gate_status: str = "NOT_READY_FOR_TRAINING"


class DetectionDatasetBuilder:
    """
    Builds and validates genuine YOLO object detection datasets.
    """

    ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}

    def __init__(
        self,
        supported_classes: List[str],
        unsupported_classes: Optional[List[str]] = None,
        output_root: Optional[Path] = None,
    ):
        self.supported_classes = supported_classes
        self.unsupported_classes = unsupported_classes or []
        self.class_to_idx = {name: idx for idx, name in enumerate(supported_classes)}
        self.idx_to_class = {idx: name for idx, name in enumerate(supported_classes)}
        self.output_root = output_root

    def parse_yolo_label_file(
        self,
        label_file: Path,
        raw_to_supported_map: Optional[Dict[int, int]] = None,
    ) -> Tuple[List[BBoxAnnotation], List[str]]:
        """
        Parses and validates a YOLO format label text file.
        raw_to_supported_map: Optional mapping from source class integer to target supported index.
        """
        valid_boxes: List[BBoxAnnotation] = []
        errors: List[str] = []

        if not label_file.exists():
            return valid_boxes, [f"Label file missing: {label_file}"]

        with open(label_file, "r", encoding="utf-8") as f:
            lines = [ln.strip() for ln in f if ln.strip()]

        for line_num, line in enumerate(lines, 1):
            parts = line.split()
            if len(parts) < 5:
                errors.append(f"Line {line_num} in {label_file.name} has < 5 fields: '{line}'")
                continue

            try:
                raw_idx = int(parts[0])
                xc = float(parts[1])
                yc = float(parts[2])
                w = float(parts[3])
                h = float(parts[4])
            except ValueError as ve:
                errors.append(f"Line {line_num} in {label_file.name} parse error: {str(ve)}")
                continue

            target_idx = raw_idx
            if raw_to_supported_map is not None:
                if raw_idx not in raw_to_supported_map:
                    # Class excluded or unsupported
                    continue
                target_idx = raw_to_supported_map[raw_idx]

            if target_idx not in self.idx_to_class:
                errors.append(f"Line {line_num} in {label_file.name} references unsupported class idx {target_idx}")
                continue

            bbox = BBoxAnnotation(target_idx, xc, yc, w, h)
            is_valid, msg = bbox.is_valid()
            if not is_valid:
                errors.append(f"Line {line_num} in {label_file.name} invalid box: {msg}")
                continue

            valid_boxes.append(bbox)

        return valid_boxes, errors

    def validate_image(self, img_path: Path) -> Tuple[bool, str]:
        """Validates image file existence, extension, and Pillow header readability."""
        if not img_path.exists():
            return False, "File does not exist"
        if img_path.suffix.lower() not in self.ALLOWED_IMAGE_EXTENSIONS:
            return False, f"Unsupported extension {img_path.suffix}"

        try:
            with Image.open(img_path) as im:
                im.verify()
            with Image.open(img_path) as im:
                _ = im.size
            return True, "Valid"
        except Exception as e:
            return False, f"Corrupt image file: {str(e)}"

    def generate_yolo_yaml(self, dataset_dir: Path, filename: str = "data.yaml") -> Path:
        """
        Generates standard data.yaml referencing ONLY supported classes.
        """
        yaml_content = {
            "path": dataset_dir.resolve().as_posix(),
            "train": "images/train",
            "val": "images/val",
            "test": "images/test",
            "nc": len(self.supported_classes),
            "names": {idx: name for idx, name in enumerate(self.supported_classes)},
        }

        out_path = dataset_dir / filename
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            yaml.dump(yaml_content, f, sort_keys=False)

        return out_path
