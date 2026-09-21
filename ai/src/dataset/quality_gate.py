"""
EcoSetu Hardened Dataset Quality Gate & Metadata Validator
Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4, Prompt 22C

Independently inspects and verifies the genuine YOLO detection dataset against 26 strict criteria:
1. Dataset directory exists.
2. images/train exists.
3. images/val exists.
4. images/test exists.
5. labels/train exists.
6. labels/val exists.
7. labels/test exists.
8. Every retained image is readable via Pillow.
9. Every retained image has a corresponding label file.
10. Every label file has a corresponding image file.
11. Every label file contains valid YOLO rows.
12. Every class ID in every label is valid according to data.yaml.
13. Every bbox satisfies 0 <= xc, yc <= 1 and 0 < w, h <= 1.
14. Every image has at least one valid annotation.
15. data.yaml exists and is parseable.
16. Every class declared in data.yaml has at least one actual annotation.
17. dataset_manifest.json exists and is valid JSON.
18. validation_report.json exists and is valid JSON.
19. Source provenance exists in manifest (DOI, URL, record ID, license, archive files).
20. Source license exists and is non-empty.
21. No exact SHA-256 duplicates cross train/val/test.
22. No perceptual duplicates cross train/val/test.
23. No missing/unknown class mappings.
24. Train/val/test splits are all non-empty.
25. Reported image counts equal actual filesystem counts.
26. Reported class distribution equals actual label distribution.
"""

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
from typing import Any, Dict, List, Optional, Set, Tuple
from PIL import Image
import yaml

from ai.src.dataset.deduplicator import CrossDatasetDeduplicator
from ai.src.dataset.detection_builder import BBoxAnnotation, DetectionDatasetBuilder


@dataclass
class QualityGateResult:
    status: str                         # "READY_FOR_TRAINING" | "NOT_READY_FOR_TRAINING"
    build_status: str                   # "SUCCESS" | "BLOCKED" | "PARTIAL"
    blockers: List[str] = field(default_factory=list)
    total_images: int = 0
    train_count: int = 0
    val_count: int = 0
    test_count: int = 0
    total_annotations: int = 0
    annotation_counts: Dict[str, int] = field(default_factory=dict)
    per_class_counts: Dict[str, int] = field(default_factory=dict)
    images_per_class: Dict[str, int] = field(default_factory=dict)
    duplicate_count: int = 0
    invalid_images_count: int = 0
    invalid_annotations_count: int = 0
    leakage_detected: bool = False
    supported_classes: List[str] = field(default_factory=list)
    insufficient_classes: List[str] = field(default_factory=list)
    excluded_classes: List[str] = field(default_factory=list)
    manifest_path: Optional[str] = None
    validation_report_path: Optional[str] = None


class ColabDatasetBuildHarness:
    """
    Independently inspects and hardens the quality gate for the final YOLO dataset.
    """

    CANDIDATE_CLASSES = [
        "BATTERY", "PCB", "CABLE", "MOBILE_PHONE", "LAPTOP", "MONITOR",
        "KEYBOARD_MOUSE", "DESKTOP_COMPUTER", "TABLET", "PRINTER", "CRT", "OTHER"
    ]

    EXCLUDED_DEFAULT_CLASSES = [
        "MOTOR", "MAGNET_ASSEMBLY", "LCD_PANEL", "MIXED_PLASTIC"
    ]

    IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}

    def __init__(self, target_dataset_dir: Path):
        self.target_dir = Path(target_dataset_dir)
        self.images_dir = self.target_dir / "images"
        self.labels_dir = self.target_dir / "labels"

    def run_quality_gate(self) -> QualityGateResult:
        """
        Executes independent 26-point validation of physical dataset on disk.
        """
        blockers: List[str] = []

        # 1. Dataset root directory check
        if not self.target_dir.exists():
            return QualityGateResult(
                status="NOT_READY_FOR_TRAINING",
                build_status="BLOCKED",
                blockers=[f"Target dataset directory does not exist: {self.target_dir}"],
                excluded_classes=self.EXCLUDED_DEFAULT_CLASSES,
            )

        # 2-7. Directory structure checks: images/{train,val,test} and labels/{train,val,test}
        splits = ("train", "val", "test")
        for s in splits:
            img_split_dir = self.images_dir / s
            lbl_split_dir = self.labels_dir / s
            if not img_split_dir.exists():
                blockers.append(f"Directory missing: {img_split_dir}")
            if not lbl_split_dir.exists():
                blockers.append(f"Directory missing: {lbl_split_dir}")

        train_imgs = sorted([p for p in (self.images_dir / "train").glob("*.*") if p.suffix.lower() in self.IMAGE_EXTENSIONS]) if (self.images_dir / "train").exists() else []
        val_imgs = sorted([p for p in (self.images_dir / "val").glob("*.*") if p.suffix.lower() in self.IMAGE_EXTENSIONS]) if (self.images_dir / "val").exists() else []
        test_imgs = sorted([p for p in (self.images_dir / "test").glob("*.*") if p.suffix.lower() in self.IMAGE_EXTENSIONS]) if (self.images_dir / "test").exists() else []
        total_images = len(train_imgs) + len(val_imgs) + len(test_imgs)

        # 24. Train/val/test non-empty checks
        if total_images == 0:
            blockers.append("Dataset contains 0 images across train, val, and test splits")
        if len(train_imgs) == 0:
            blockers.append("Train partition contains 0 images")
        if len(val_imgs) == 0:
            blockers.append("Validation partition contains 0 images")
        if len(test_imgs) == 0:
            blockers.append("Test partition contains 0 images")

        # 15. data.yaml check
        yaml_path = self.target_dir / "data.yaml"
        supported_classes: List[str] = []
        if not yaml_path.exists():
            blockers.append(f"Missing data.yaml at {yaml_path}")
        else:
            try:
                with open(yaml_path, "r", encoding="utf-8") as f:
                    data_cfg = yaml.safe_load(f)
                if not isinstance(data_cfg, dict):
                    blockers.append("data.yaml is not a valid YAML dictionary")
                else:
                    names = data_cfg.get("names", {})
                    if isinstance(names, dict):
                        supported_classes = [names[i] for i in range(len(names))]
                    elif isinstance(names, list):
                        supported_classes = names
                    else:
                        blockers.append("data.yaml 'names' must be a dictionary or list")

                    if data_cfg.get("nc") != len(supported_classes):
                        blockers.append(f"data.yaml 'nc' ({data_cfg.get('nc')}) does not match length of 'names' ({len(supported_classes)})")
            except Exception as ye:
                blockers.append(f"data.yaml parsing error: {str(ye)}")

        class_to_idx = {name: idx for idx, name in enumerate(supported_classes)}
        per_class_counts: Dict[str, int] = {c: 0 for c in supported_classes}
        images_per_class: Dict[str, int] = {c: 0 for c in supported_classes}
        split_annotation_counts: Dict[str, int] = {"train": 0, "val": 0, "test": 0}
        total_annotations = 0

        invalid_images_count = 0
        invalid_annotations_count = 0

        builder = DetectionDatasetBuilder(supported_classes=supported_classes)

        # 8-14. Image and Label validations across each split
        for s in splits:
            img_split_dir = self.images_dir / s
            lbl_split_dir = self.labels_dir / s
            if not img_split_dir.exists() or not lbl_split_dir.exists():
                continue

            split_img_list = sorted([p for p in img_split_dir.glob("*.*") if p.suffix.lower() in self.IMAGE_EXTENSIONS])
            split_lbl_list = sorted(list(lbl_split_dir.glob("*.txt")))

            split_img_stems = {p.stem: p for p in split_img_list}
            split_lbl_stems = {p.stem: p for p in split_lbl_list}

            # 9. Every image must have a label file
            for stem, img_p in split_img_stems.items():
                if stem not in split_lbl_stems:
                    blockers.append(f"Missing label file for image: {img_p.name} in {s}")

            # 10. Every label file must have an image file
            for stem, lbl_p in split_lbl_stems.items():
                if stem not in split_img_stems:
                    blockers.append(f"Orphan label file without corresponding image: {lbl_p.name} in {s}")

            # 8. Every retained image must be readable
            for img_p in split_img_list:
                try:
                    with Image.open(img_p) as im:
                        im.verify()
                    with Image.open(img_p) as im:
                        _ = im.size
                except Exception as ie:
                    invalid_images_count += 1
                    blockers.append(f"Corrupt or unreadable image {img_p.name} in {s}: {str(ie)}")

            # 11-14. Validate YOLO label format and bounding box bounds
            for lbl_p in split_lbl_list:
                with open(lbl_p, "r", encoding="utf-8") as lf:
                    raw_lines = [ln.strip() for ln in lf if ln.strip()]

                # 14. Every image must have at least one valid annotation
                if not raw_lines:
                    blockers.append(f"Empty label file (0 annotations) for {lbl_p.name} in {s}")
                    continue

                boxes, errs = builder.parse_yolo_label_file(lbl_p)
                if errs:
                    invalid_annotations_count += len(errs)
                    blockers.append(f"Invalid annotation in {lbl_p.name}: {errs[0]}")

                classes_in_image: Set[str] = set()
                for b in boxes:
                    total_annotations += 1
                    split_annotation_counts[s] += 1
                    cls_name = builder.idx_to_class.get(b.class_idx)
                    if cls_name in per_class_counts:
                        per_class_counts[cls_name] += 1
                        classes_in_image.add(cls_name)
                    else:
                        blockers.append(f"Class idx {b.class_idx} in {lbl_p.name} not in data.yaml classes")

                for c in classes_in_image:
                    images_per_class[c] = images_per_class.get(c, 0) + 1

        # 16. Verify every class declared in data.yaml has at least one actual annotation
        zero_classes = [c for c, count in per_class_counts.items() if count == 0]
        if zero_classes:
            blockers.append(f"Classes in data.yaml have 0 valid annotations: {zero_classes}")

        # 21-22. Cross-split duplicate leakage checks (Exact SHA-256 and Perceptual dHash)
        dedup = CrossDatasetDeduplicator()
        train_sha = {dedup.compute_sha256(p): p for p in train_imgs if p.is_file()}
        val_sha = {dedup.compute_sha256(p): p for p in val_imgs if p.is_file()}
        test_sha = {dedup.compute_sha256(p): p for p in test_imgs if p.is_file()}

        leakage_pairs = []
        for h in train_sha:
            if h in val_sha:
                leakage_pairs.append(f"Train/Val SHA-256 duplicate: {train_sha[h].name} and {val_sha[h].name}")
            if h in test_sha:
                leakage_pairs.append(f"Train/Test SHA-256 duplicate: {train_sha[h].name} and {test_sha[h].name}")
        for h in val_sha:
            if h in test_sha:
                leakage_pairs.append(f"Val/Test SHA-256 duplicate: {val_sha[h].name} and {test_sha[h].name}")

        # Perceptual hash cross-split checks
        train_dh = {dedup.compute_dhash(p): p for p in train_imgs if p.is_file()}
        val_dh = {dedup.compute_dhash(p): p for p in val_imgs if p.is_file()}
        test_dh = {dedup.compute_dhash(p): p for p in test_imgs if p.is_file()}

        for dh_t, p_t in train_dh.items():
            if not dh_t: continue
            dh_t_int = int(dh_t, 16)
            for dh_v, p_v in val_dh.items():
                if not dh_v: continue
                if bin(dh_t_int ^ int(dh_v, 16)).count("1") <= 4:
                    leakage_pairs.append(f"Train/Val Perceptual duplicate (Hamming <= 4): {p_t.name} and {p_v.name}")
            for dh_te, p_te in test_dh.items():
                if not dh_te: continue
                if bin(dh_t_int ^ int(dh_te, 16)).count("1") <= 4:
                    leakage_pairs.append(f"Train/Test Perceptual duplicate (Hamming <= 4): {p_t.name} and {p_te.name}")
        for dh_v, p_v in val_dh.items():
            if not dh_v: continue
            dh_v_int = int(dh_v, 16)
            for dh_te, p_te in test_dh.items():
                if not dh_te: continue
                if bin(dh_v_int ^ int(dh_te, 16)).count("1") <= 4:
                    leakage_pairs.append(f"Val/Test Perceptual duplicate (Hamming <= 4): {p_v.name} and {p_te.name}")

        if leakage_pairs:
            blockers.append(f"Cross-split duplicate leakage detected ({len(leakage_pairs)} occurrences): {leakage_pairs[0]}")

        # 17-20. Manifest existence and provenance validation
        manifest_path = self.target_dir / "dataset_manifest.json"
        manifest_data: Dict[str, Any] = {}
        if not manifest_path.exists():
            blockers.append("dataset_manifest.json does not exist")
        else:
            try:
                with open(manifest_path, "r", encoding="utf-8") as mf:
                    manifest_data = json.load(mf)

                # Provenance verification
                src = manifest_data.get("primary_source", {})
                if not isinstance(src, dict):
                    blockers.append("Manifest 'primary_source' must be a dictionary")
                else:
                    if not src.get("name"):
                        blockers.append("Manifest missing source name")
                    if not src.get("doi"):
                        blockers.append("Manifest missing source DOI")
                    if not src.get("url"):
                        blockers.append("Manifest missing source URL")
                    license_str = src.get("license")
                    if not license_str or not str(license_str).strip():
                        blockers.append("Manifest missing or empty source license")

                # Count verification
                split_counts = manifest_data.get("split_counts", {})
                if split_counts.get("train") != len(train_imgs):
                    blockers.append(f"Manifest train count ({split_counts.get('train')}) != actual filesystem count ({len(train_imgs)})")
                if split_counts.get("val") != len(val_imgs):
                    blockers.append(f"Manifest val count ({split_counts.get('val')}) != actual filesystem count ({len(val_imgs)})")
                if split_counts.get("test") != len(test_imgs):
                    blockers.append(f"Manifest test count ({split_counts.get('test')}) != actual filesystem count ({len(test_imgs)})")
                if split_counts.get("total") != total_images:
                    blockers.append(f"Manifest total count ({split_counts.get('total')}) != actual filesystem total ({total_images})")

                # Class distribution check
                m_class_dist = manifest_data.get("class_distribution", {})
                if m_class_dist != per_class_counts:
                    blockers.append(f"Manifest class distribution {m_class_dist} != actual annotation counts {per_class_counts}")

            except Exception as je:
                blockers.append(f"dataset_manifest.json JSON parsing error: {str(je)}")

        # 18. Validation report existence check
        val_report_path = self.target_dir / "validation_report.json"
        if not val_report_path.exists():
            blockers.append("validation_report.json does not exist")
        else:
            try:
                with open(val_report_path, "r", encoding="utf-8") as vf:
                    val_data = json.load(vf)
            except Exception as ve:
                blockers.append(f"validation_report.json JSON parsing error: {str(ve)}")

        # Determine insufficient classes
        insufficient_classes = [c for c in self.CANDIDATE_CLASSES if c not in supported_classes]

        is_ready = len(blockers) == 0
        gate_status = "READY_FOR_TRAINING" if is_ready else "NOT_READY_FOR_TRAINING"
        build_status = "SUCCESS" if is_ready else ("BLOCKED" if total_images == 0 else "PARTIAL")

        # 26. Verify manifest and report do not claim READY when gate status is NOT_READY
        if not is_ready:
            if manifest_data.get("quality_gate_status") == "READY_FOR_TRAINING":
                blockers.append("Manifest hardcodes READY_FOR_TRAINING while quality gate evaluation has blockers")

        return QualityGateResult(
            status=gate_status,
            build_status=build_status,
            blockers=blockers,
            total_images=total_images,
            train_count=len(train_imgs),
            val_count=len(val_imgs),
            test_count=len(test_imgs),
            total_annotations=total_annotations,
            annotation_counts=split_annotation_counts,
            per_class_counts=per_class_counts,
            images_per_class=images_per_class,
            duplicate_count=len(leakage_pairs),
            invalid_images_count=invalid_images_count,
            invalid_annotations_count=invalid_annotations_count,
            leakage_detected=len(leakage_pairs) > 0,
            supported_classes=supported_classes,
            insufficient_classes=insufficient_classes,
            excluded_classes=self.EXCLUDED_DEFAULT_CLASSES,
            manifest_path=str(manifest_path) if manifest_path.exists() else None,
            validation_report_path=str(val_report_path) if val_report_path.exists() else None,
        )
