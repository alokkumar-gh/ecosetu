"""
EcoSetu Dataset Validator
Canonical Reference: docs/11_AI_EWASTE_DETECTION.md, docs/12_AI_TRAINING_PLAN.md, docs/13_SECURITY_PRIVACY.md

Validates YOLO dataset structure, image integrity, canonical classes, and split distribution.
Supports classification directory format (default) and YOLO detection label format.
"""

import os
import sys
import argparse
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field

# Canonical 10 target classes explicitly documented in docs/11_AI_EWASTE_DETECTION.md Section 2
# and docs/12_AI_TRAINING_PLAN.md Section 4.
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

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
JPEG_MAGIC = b"\xff\xd8\xff"
PNG_MAGIC = b"\x89PNG"
MIN_RECOMMENDED_SAMPLES_PER_CLASS = 100  # docs/12_AI_TRAINING_PLAN.md Section 2.1


@dataclass
class ValidationResult:
    is_valid: bool
    total_images: int = 0
    class_counts: Dict[str, Dict[str, int]] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    def print_summary(self):
        print("\n" + "=" * 60)
        print("ECOSETU DATASET VALIDATION REPORT")
        print("=" * 60)
        status = "PASSED" if self.is_valid else "FAILED"
        print(f"Overall Status: {status}")
        print(f"Total Valid Images: {self.total_images}")

        if self.class_counts:
            print("\nClass Distribution by Split:")
            for cls_name, splits in sorted(self.class_counts.items()):
                total_cls = sum(splits.values())
                split_details = ", ".join(f"{s}: {count}" for s, count in splits.items())
                print(f"  - {cls_name:18} : Total {total_cls:4d} ({split_details})")

        if self.warnings:
            print(f"\nWarnings ({len(self.warnings)}):")
            for w in self.warnings:
                print(f"  [WARN] {w}")

        if self.errors:
            print(f"\nErrors ({len(self.errors)}):")
            for e in self.errors:
                print(f"  [ERROR] {e}")

        print("=" * 60 + "\n")


def check_image_header(file_path: str) -> Tuple[bool, str]:
    """Verify image file size and magic byte signatures."""
    if not os.path.isfile(file_path):
        return False, "File does not exist"

    size = os.path.getsize(file_path)
    if size == 0:
        return False, "Empty file (0 bytes)"

    try:
        with open(file_path, "rb") as f:
            header = f.read(16)
    except Exception as err:
        return False, f"Could not read file: {err}"

    ext = os.path.splitext(file_path)[1].lower()
    if ext in {".jpg", ".jpeg"}:
        if not header.startswith(JPEG_MAGIC):
            return False, "Corrupted or invalid JPEG signature"
    elif ext == ".png":
        if not header.startswith(PNG_MAGIC):
            return False, "Corrupted or invalid PNG signature"
    else:
        return False, f"Unsupported file extension: {ext}"

    return True, ""


def load_classes_from_yaml(config_path: str) -> Optional[List[str]]:
    """Attempt to load class names from dataset.yaml if available."""
    if not os.path.isfile(config_path):
        return None
    try:
        import yaml
        with open(config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        names = data.get("names", {})
        if isinstance(names, dict):
            # Sort by integer keys if present
            sorted_keys = sorted(names.keys(), key=lambda k: int(k) if str(k).isdigit() else str(k))
            return [str(names[k]) for k in sorted_keys]
        elif isinstance(names, list):
            return [str(n) for n in names]
    except Exception:
        pass
    return None


def validate_classification_dataset(
    data_dir: str,
    target_classes: List[str],
    min_samples_per_class: int = MIN_RECOMMENDED_SAMPLES_PER_CLASS,
) -> ValidationResult:
    """
    Validate a YOLOv8 classification dataset structure:
      data_dir/
        train/
          CLASS_A/
          CLASS_B/
        val/
          CLASS_A/
          ...
        test/
          ...
    """
    errors: List[str] = []
    warnings: List[str] = []
    class_counts: Dict[str, Dict[str, int]] = {cls: {} for cls in target_classes}
    total_images = 0

    if not os.path.isdir(data_dir):
        errors.append(f"Dataset root directory does not exist: {data_dir}")
        return ValidationResult(is_valid=False, errors=errors)

    splits = ["train", "val", "test"]
    found_splits = []

    for split in splits:
        split_dir = os.path.join(data_dir, split)
        if not os.path.isdir(split_dir):
            if split == "test":
                warnings.append(f"Optional test split directory not found: {split_dir}")
            else:
                errors.append(f"Required split directory not found: {split_dir}")
        else:
            found_splits.append(split)

    if not found_splits:
        errors.append("No valid split directories found (expected 'train', 'val', 'test')")
        return ValidationResult(is_valid=False, errors=errors)

    target_class_set: Set[str] = set(target_classes)

    for split in found_splits:
        split_path = os.path.join(data_dir, split)
        subdirs = [d for d in os.listdir(split_path) if os.path.isdir(os.path.join(split_path, d))]

        if not subdirs:
            errors.append(f"Split directory '{split}' contains no class subdirectories")
            continue

        for subdir in subdirs:
            if subdir not in target_class_set:
                warnings.append(
                    f"Directory '{subdir}' in '{split}' is not in documented canonical classes list"
                )

            class_dir = os.path.join(split_path, subdir)
            files = os.listdir(class_dir)
            valid_class_images = 0

            for fname in files:
                fpath = os.path.join(class_dir, fname)
                if os.path.isdir(fpath):
                    continue

                ext = os.path.splitext(fname)[1].lower()
                if ext not in ALLOWED_IMAGE_EXTENSIONS:
                    warnings.append(f"Ignored non-image file '{fname}' in {split}/{subdir}")
                    continue

                valid_img, img_err = check_image_header(fpath)
                if not valid_img:
                    errors.append(f"Corrupted image '{fname}' in {split}/{subdir}: {img_err}")
                else:
                    valid_class_images += 1
                    total_images += 1

            if subdir in class_counts:
                class_counts[subdir][split] = valid_class_images
            else:
                class_counts[subdir] = {split: valid_class_images}

    # Class balance and minimum sample check
    for cls in target_classes:
        counts = class_counts.get(cls, {})
        total_for_class = sum(counts.values())
        if total_for_class == 0:
            errors.append(f"Class '{cls}' has 0 valid images across all splits")
        elif total_for_class < min_samples_per_class:
            warnings.append(
                f"Class '{cls}' has {total_for_class} images (recommended minimum is {min_samples_per_class})"
            )

    is_valid = len(errors) == 0 and total_images > 0
    return ValidationResult(
        is_valid=is_valid,
        total_images=total_images,
        class_counts=class_counts,
        errors=errors,
        warnings=warnings,
    )


def validate_detection_dataset(
    data_dir: str,
    target_classes: List[str],
) -> ValidationResult:
    """
    Validate a YOLOv8 detection dataset structure:
      data_dir/
        images/
          train/
          val/
          test/
        labels/
          train/
          val/
          test/
    """
    errors: List[str] = []
    warnings: List[str] = []
    class_counts: Dict[str, Dict[str, int]] = {cls: {} for cls in target_classes}
    total_images = 0

    images_root = os.path.join(data_dir, "images")
    labels_root = os.path.join(data_dir, "labels")

    if not os.path.isdir(images_root) or not os.path.isdir(labels_root):
        errors.append("Detection dataset must contain both 'images/' and 'labels/' root directories")
        return ValidationResult(is_valid=False, errors=errors)

    splits = ["train", "val", "test"]
    for split in splits:
        img_split_dir = os.path.join(images_root, split)
        lbl_split_dir = os.path.join(labels_root, split)

        if not os.path.isdir(img_split_dir):
            if split != "test":
                errors.append(f"Missing images directory: {img_split_dir}")
            continue

        for fname in os.listdir(img_split_dir):
            ext = os.path.splitext(fname)[1].lower()
            if ext not in ALLOWED_IMAGE_EXTENSIONS:
                continue

            img_path = os.path.join(img_split_dir, fname)
            valid_img, img_err = check_image_header(img_path)
            if not valid_img:
                errors.append(f"Corrupt image {split}/{fname}: {img_err}")
                continue

            total_images += 1
            stem = os.path.splitext(fname)[0]
            label_file = os.path.join(lbl_split_dir, f"{stem}.txt")

            if not os.path.isfile(label_file):
                errors.append(f"Missing label file for image: {split}/{fname}")
                continue

            with open(label_file, "r", encoding="utf-8") as lf:
                for line_idx, line in enumerate(lf):
                    parts = line.strip().split()
                    if not parts:
                        continue
                    if len(parts) != 5:
                        errors.append(
                            f"Malformed label line {line_idx+1} in {split}/{stem}.txt: expected 5 elements, got {len(parts)}"
                        )
                        continue
                    try:
                        cls_id = int(parts[0])
                        coords = [float(x) for x in parts[1:]]
                    except ValueError:
                        errors.append(
                            f"Invalid numeric values in label {split}/{stem}.txt line {line_idx+1}"
                        )
                        continue

                    if cls_id < 0 or cls_id >= len(target_classes):
                        errors.append(
                            f"Class ID {cls_id} out of range [0, {len(target_classes)-1}] in {split}/{stem}.txt"
                        )
                    else:
                        cls_name = target_classes[cls_id]
                        class_counts[cls_name][split] = class_counts[cls_name].get(split, 0) + 1

                    for c in coords:
                        if c < 0.0 or c > 1.0:
                            errors.append(
                                f"Coordinate {c} out of normalized range [0.0, 1.0] in {split}/{stem}.txt"
                            )

    is_valid = len(errors) == 0 and total_images > 0
    return ValidationResult(
        is_valid=is_valid,
        total_images=total_images,
        class_counts=class_counts,
        errors=errors,
        warnings=warnings,
    )


def validate_dataset(
    data_dir: str,
    config_path: Optional[str] = None,
    dataset_format: str = "auto",
    min_samples: int = MIN_RECOMMENDED_SAMPLES_PER_CLASS,
) -> ValidationResult:
    """
    Main validator entry point.
    """
    classes = None
    if config_path:
        classes = load_classes_from_yaml(config_path)

    if not classes:
        classes = list(DOCUMENTED_CLASSES)

    # Determine format
    if dataset_format == "auto":
        if os.path.isdir(os.path.join(data_dir, "images")):
            dataset_format = "detection"
        else:
            dataset_format = "classification"

    if dataset_format == "detection":
        return validate_detection_dataset(data_dir, classes)
    else:
        return validate_classification_dataset(data_dir, classes, min_samples)


def main():
    parser = argparse.ArgumentParser(description="EcoSetu YOLO Dataset Validator")
    parser.add_argument(
        "--data-dir",
        type=str,
        default="ai/datasets/processed",
        help="Path to dataset root directory",
    )
    parser.add_argument(
        "--config",
        type=str,
        default="ai/configs/dataset.yaml",
        help="Path to dataset configuration YAML file",
    )
    parser.add_argument(
        "--format",
        choices=["auto", "classification", "detection"],
        default="auto",
        help="Dataset format (default: auto)",
    )
    parser.add_argument(
        "--min-samples",
        type=int,
        default=MIN_RECOMMENDED_SAMPLES_PER_CLASS,
        help="Minimum recommended images per class",
    )

    args = parser.parse_args()
    result = validate_dataset(
        data_dir=args.data_dir,
        config_path=args.config,
        dataset_format=args.format,
        min_samples=args.min_samples,
    )
    result.print_summary()
    sys.exit(0 if result.is_valid else 1)


if __name__ == "__main__":
    main()
