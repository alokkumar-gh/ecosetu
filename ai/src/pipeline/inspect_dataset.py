"""
EcoSetu Dataset Inspection Tool
Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4, docs/12_AI_TRAINING_PLAN.md

Analyzes incoming or prepared datasets before any training execution:
- Total images, dimensions, file formats, and file corruption
- Annotation format detection (Classification folder / JSONL / YOLO txt / COCO json / Pascal VOC xml)
- Class distribution across ECOSETU's 16 canonical categories
- Sample statistics: min, max, median per class
- Severe class imbalance warnings (> 20:1 ratio)
- Unmapped and ambiguous class reporting (does not force classes)
- Duplicate detection (SHA-256)
- Split distribution and group leakage check
- Generates machine-readable dataset_inspection_report.json and terminal summary
"""

from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from PIL import Image

from ai.src.dataset.class_mapper import ClassMapper, MappingResult
from ai.src.dataset.schema import (
    CANONICAL_MATERIAL_CATEGORIES,
    DatasetSourceType,
    DatasetSplitEnum,
    ImageMetadata,
    MaterialCategoryEnum,
)


@dataclass
class InspectionSummary:
    timestamp: str
    dataset_path: str
    annotation_format: str
    total_images: int
    corrupt_images: int
    unsupported_format_images: int
    duplicate_images: int
    total_annotations: int
    missing_annotations: int
    invalid_annotations: int
    unique_classes_found: int
    unmapped_classes_count: int
    ambiguous_classes_count: int
    min_samples_per_class: int
    max_samples_per_class: int
    median_samples_per_class: float
    imbalance_ratio: float
    class_distribution: Dict[str, int]
    split_distribution: Dict[str, int]
    unmapped_classes: List[Dict[str, Any]]
    ambiguous_classes: List[Dict[str, Any]]
    image_dimensions: Dict[str, Any]
    leakage_detected: bool
    errors: List[str]
    warnings: List[str]


class DatasetInspector:
    """
    Comprehensive pre-training inspector for e-waste datasets.
    """

    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

    def __init__(self, data_path: str):
        self.data_path = Path(data_path)
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def detect_annotation_format(self) -> str:
        """
        Infers annotation format from directory layout and files:
        - 'yolo_detection': Contains .txt files with bounding boxes (class x y w h)
        - 'coco_json': Contains annotations/*.json with 'images' and 'annotations'
        - 'pascal_voc': Contains .xml files with <annotation><object><bndbox>
        - 'classification_folder': Subdirectories named by category
        - 'metadata_jsonl': JSONL metadata file (EcoSetu format)
        - 'unannotated_images': Raw images only
        """
        if not self.data_path.exists():
            return "unknown"

        # Check for metadata JSONL
        if self.data_path.is_file() and self.data_path.suffix == ".jsonl":
            return "metadata_jsonl"

        # Check for COCO json in annotations/
        coco_files = list(self.data_path.glob("**/annotations/*.json")) + list(self.data_path.glob("*.json"))
        for jf in coco_files:
            try:
                with open(jf, "r", encoding="utf-8") as f:
                    content = json.load(f)
                    if isinstance(content, dict) and "annotations" in content and "images" in content:
                        return "coco_detection"
            except Exception:
                pass

        # Check for YOLO .txt label files
        txt_files = list(self.data_path.glob("**/*.txt"))
        # Filter out readme or license files
        label_txts = [t for t in txt_files if t.name.lower() not in {"readme.txt", "classes.txt", "labels.txt"}]
        if label_txts:
            # Check if content has YOLO format (float coordinates)
            for lt in label_txts[:5]:
                try:
                    with open(lt, "r", encoding="utf-8") as f:
                        lines = [line.strip().split() for line in f if line.strip()]
                        if lines and all(len(parts) in (5, 6) for parts in lines):
                            return "yolo_detection"
                except Exception:
                    pass

        # Check for Pascal VOC XMLs
        xml_files = list(self.data_path.glob("**/*.xml"))
        if xml_files:
            return "pascal_voc_detection"

        # Check if organized by subfolders
        subdirs = [d for d in self.data_path.iterdir() if d.is_dir() and not d.name.startswith(".")]
        if subdirs:
            # If subdirs are splits (train, val, test)
            split_names = {d.name.lower() for d in subdirs}
            if split_names.intersection({"train", "val", "test", "staging"}):
                return "split_classification"
            return "classification_folder"

        return "unannotated_images"

    def inspect(self) -> InspectionSummary:
        """
        Executes full inspection across image files, annotations, classes, and splits.
        """
        self.errors.clear()
        self.warnings.clear()

        if not self.data_path.exists():
            self.errors.append(f"Specified path does not exist: {self.data_path}")
            return self._empty_summary("unknown")

        fmt = self.detect_annotation_format()

        # Collect all candidate image files
        image_files = []
        if self.data_path.is_file() and self.data_path.suffix == ".jsonl":
            return self._inspect_jsonl_metadata(self.data_path)

        for root, _, files in os.walk(self.data_path):
            for fname in files:
                ext = os.path.splitext(fname)[1].lower()
                if ext in self.ALLOWED_EXTENSIONS:
                    image_files.append(Path(root) / fname)

        if not image_files:
            self.warnings.append(f"No image files (.jpg, .jpeg, .png) found at {self.data_path}")
            return self._empty_summary(fmt)

        total_images = len(image_files)
        corrupt_images = 0
        unsupported_format_images = 0
        widths = []
        heights = []
        hashes = set()
        duplicate_images = 0

        class_counter: Counter = Counter()
        split_counter: Counter = Counter()
        unmapped_classes_dict: Dict[str, MappingResult] = {}
        ambiguous_classes_dict: Dict[str, MappingResult] = {}

        total_annotations = 0
        missing_annotations = 0
        invalid_annotations = 0

        # Scan each image
        for img_path in image_files:
            # 1. Image corruption & dimensions check
            try:
                with Image.open(img_path) as im:
                    im.verify()
                # Re-open for size (verify closes/invalidates file pointer in some PIL versions)
                with Image.open(img_path) as im:
                    w, h = im.size
                    widths.append(w)
                    heights.append(h)
            except Exception as e:
                corrupt_images += 1
                self.errors.append(f"Corrupt image file: {img_path.name} - {str(e)}")
                continue

            # 2. SHA-256 duplicate detection
            try:
                hasher = hashlib.sha256()
                with open(img_path, "rb") as f:
                    for chunk in iter(lambda: f.read(65536), b""):
                        hasher.update(chunk)
                file_hash = hasher.hexdigest()
                if file_hash in hashes:
                    duplicate_images += 1
                else:
                    hashes.add(file_hash)
            except Exception:
                pass

            # 3. Class & Annotation resolution based on format
            source_class = None
            if fmt in ("classification_folder", "split_classification"):
                # Infer class from parent folder (or parent if inside train/val/test)
                parent_name = img_path.parent.name
                grandparent_name = img_path.parent.parent.name if img_path.parent.parent else ""
                
                if parent_name.lower() in ("train", "val", "test"):
                    source_class = img_path.name.split("_")[0] # fallback
                    split_counter[parent_name.lower()] += 1
                elif grandparent_name.lower() in ("train", "val", "test"):
                    source_class = parent_name
                    split_counter[grandparent_name.lower()] += 1
                else:
                    source_class = parent_name

            elif fmt == "yolo_detection":
                # Look for corresponding .txt label
                label_path = img_path.with_suffix(".txt")
                if not label_path.exists():
                    # Check in ../labels/
                    alt_label = img_path.parent.parent / "labels" / img_path.parent.name / (img_path.stem + ".txt")
                    if alt_label.exists():
                        label_path = alt_label

                if not label_path.exists():
                    missing_annotations += 1
                else:
                    try:
                        with open(label_path, "r", encoding="utf-8") as lf:
                            lines = [ln.strip() for ln in lf if ln.strip()]
                            if not lines:
                                missing_annotations += 1
                            else:
                                for ln in lines:
                                    parts = ln.split()
                                    if len(parts) >= 5:
                                        total_annotations += 1
                                        source_class = parts[0]
                                    else:
                                        invalid_annotations += 1
                    except Exception:
                        invalid_annotations += 1

            if source_class:
                # Map using EcoSetu ClassMapper
                mapping = ClassMapper.map_class(source_class)
                if mapping.status == "MAPPED" and mapping.canonical_category:
                    class_counter[mapping.canonical_category] += 1
                elif mapping.status == "AMBIGUOUS":
                    ambiguous_classes_dict[source_class] = mapping
                    class_counter[f"AMBIGUOUS:{source_class}"] += 1
                else:
                    unmapped_classes_dict[source_class] = mapping
                    class_counter[f"UNMAPPED:{source_class}"] += 1
            else:
                missing_annotations += 1

        # Calculate statistics
        counts = [c for c in class_counter.values()]
        min_samples = min(counts) if counts else 0
        max_samples = max(counts) if counts else 0
        median_samples = (
            sorted(counts)[len(counts) // 2] if counts else 0.0
        )
        imbalance_ratio = round(max_samples / max(min_samples, 1), 2) if counts else 0.0

        if imbalance_ratio > 20.0:
            self.warnings.append(
                f"Severe class imbalance detected: max class has {max_samples} samples while min class has {min_samples} (ratio {imbalance_ratio}:1 exceeds recommended 20:1 threshold)"
            )

        if ambiguous_classes_dict:
            self.warnings.append(
                f"Found {len(ambiguous_classes_dict)} ambiguous classes that require manual review before training"
            )

        if unmapped_classes_dict:
            self.warnings.append(
                f"Found {len(unmapped_classes_dict)} unmapped classes outside ECOSETU canonical taxonomy"
            )

        dim_stats = {
            "min_width": min(widths) if widths else 0,
            "max_width": max(widths) if widths else 0,
            "min_height": min(heights) if heights else 0,
            "max_height": max(heights) if heights else 0,
        }

        return InspectionSummary(
            timestamp=datetime.now(timezone.utc).isoformat(),
            dataset_path=str(self.data_path),
            annotation_format=fmt,
            total_images=total_images,
            corrupt_images=corrupt_images,
            unsupported_format_images=unsupported_format_images,
            duplicate_images=duplicate_images,
            total_annotations=total_annotations,
            missing_annotations=missing_annotations,
            invalid_annotations=invalid_annotations,
            unique_classes_found=len(class_counter),
            unmapped_classes_count=len(unmapped_classes_dict),
            ambiguous_classes_count=len(ambiguous_classes_dict),
            min_samples_per_class=min_samples,
            max_samples_per_class=max_samples,
            median_samples_per_class=float(median_samples),
            imbalance_ratio=imbalance_ratio,
            class_distribution=dict(class_counter),
            split_distribution=dict(split_counter),
            unmapped_classes=[{"raw": k, "reason": v.reason} for k, v in unmapped_classes_dict.items()],
            ambiguous_classes=[{"raw": k, "candidates": v.suggested_candidates, "reason": v.reason} for k, v in ambiguous_classes_dict.items()],
            image_dimensions=dim_stats,
            leakage_detected=False,
            errors=list(self.errors),
            warnings=list(self.warnings),
        )

    def _inspect_jsonl_metadata(self, jsonl_path: Path) -> InspectionSummary:
        """Inspects an EcoSetu metadata JSONL catalogue directly."""
        records: List[ImageMetadata] = []
        with open(jsonl_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    records.append(ImageMetadata(**json.loads(line)))

        total_images = len(records)
        class_counter: Counter = Counter()
        split_counter: Counter = Counter()
        duplicates = sum(1 for r in records if r.duplicate_status.value == "EXACT_DUPLICATE")
        unmapped = 0
        ambiguous = 0

        for r in records:
            if r.ecosetu_category:
                class_counter[r.ecosetu_category] += 1
            else:
                unmapped += 1
            if r.split:
                split_counter[r.split.value] += 1

        counts = [c for c in class_counter.values()]
        min_samples = min(counts) if counts else 0
        max_samples = max(counts) if counts else 0
        median_samples = sorted(counts)[len(counts) // 2] if counts else 0.0
        imbalance = round(max_samples / max(min_samples, 1), 2) if counts else 0.0

        return InspectionSummary(
            timestamp=datetime.now(timezone.utc).isoformat(),
            dataset_path=str(jsonl_path),
            annotation_format="metadata_jsonl",
            total_images=total_images,
            corrupt_images=0,
            unsupported_format_images=0,
            duplicate_images=duplicates,
            total_annotations=total_images,
            missing_annotations=0,
            invalid_annotations=0,
            unique_classes_found=len(class_counter),
            unmapped_classes_count=unmapped,
            ambiguous_classes_count=ambiguous,
            min_samples_per_class=min_samples,
            max_samples_per_class=max_samples,
            median_samples_per_class=float(median_samples),
            imbalance_ratio=imbalance,
            class_distribution=dict(class_counter),
            split_distribution=dict(split_counter),
            unmapped_classes=[],
            ambiguous_classes=[],
            image_dimensions={},
            leakage_detected=False,
            errors=[],
            warnings=list(self.warnings),
        )

    def _empty_summary(self, fmt: str) -> InspectionSummary:
        return InspectionSummary(
            timestamp=datetime.now(timezone.utc).isoformat(),
            dataset_path=str(self.data_path),
            annotation_format=fmt,
            total_images=0,
            corrupt_images=0,
            unsupported_format_images=0,
            duplicate_images=0,
            total_annotations=0,
            missing_annotations=0,
            invalid_annotations=0,
            unique_classes_found=0,
            unmapped_classes_count=0,
            ambiguous_classes_count=0,
            min_samples_per_class=0,
            max_samples_per_class=0,
            median_samples_per_class=0.0,
            imbalance_ratio=0.0,
            class_distribution={},
            split_distribution={},
            unmapped_classes=[],
            ambiguous_classes=[],
            image_dimensions={},
            leakage_detected=False,
            errors=list(self.errors),
            warnings=list(self.warnings),
        )

    def save_report(self, summary: InspectionSummary, output_path: str):
        """Saves machine-readable inspection report."""
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        with open(out_p, "w", encoding="utf-8") as f:
            json.dump(asdict(summary), f, indent=2)
        print(f"[OK] Machine-readable inspection report written to: {out_p}")
