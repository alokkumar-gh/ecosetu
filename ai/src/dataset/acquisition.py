"""
EcoSetu Dataset Acquisition & XBAT+ RGB Pipeline Processor
Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4, Prompt 22B

Handles:
1. Programmatic Zenodo API inspection for official record 18022530
2. Exact RGB archive acquisition with size and MD5 checksum verification
3. Staging extraction and YOLO annotation validation
4. Strict canonical class mapping (rejects unmapped/unsupported classes without fabrication)
5. Exact SHA-256 and perceptual dHash deduplication
6. Deterministic 70/20/10 train/val/test split with zero cross-split leakage
7. Dynamic data.yaml generation containing ONLY classes with valid data
8. Manifest and validation report generation enforcing READY_FOR_TRAINING quality gate
"""

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import random
import shutil
from typing import Any, Dict, List, Optional, Set, Tuple
import urllib.request
import zipfile

from PIL import Image
import yaml

from ai.src.dataset.class_mapper import ClassMapper
from ai.src.dataset.deduplicator import CrossDatasetDeduplicator
from ai.src.dataset.detection_builder import BBoxAnnotation, DetectionDatasetBuilder
from ai.src.dataset.quality_gate import ColabDatasetBuildHarness, QualityGateResult


# 15 Canonical categories in XBAT+ v1.0 release metadata (alphabetical index 0..14)
XBAT_SOURCE_CLASSES = [
    "AlarmClock",      # 0
    "ComputerMouse",   # 1 -> KEYBOARD_MOUSE
    "E-Razor",         # 2 -> UNMAPPED
    "E-Toothbrush",    # 3 -> UNMAPPED
    "FireAlarm",       # 4 -> UNMAPPED
    "FlashLight",      # 5 -> UNMAPPED
    "GameController",  # 6 -> UNMAPPED
    "iPad",            # 7 -> TABLET
    "KidToy",          # 8 -> UNMAPPED
    "MobilePhone",     # 9 -> MOBILE_PHONE
    "NewsRadio",       # 10 -> UNMAPPED
    "NightTorch",      # 11 -> UNMAPPED
    "PhotoCamera",     # 12 -> UNMAPPED
    "RemoteControl",   # 13 -> UNMAPPED
    "Thermometer",     # 14 -> UNMAPPED
]

CANDIDATE_MODEL_CLASSES = [
    "BATTERY", "PCB", "CABLE", "MOBILE_PHONE", "LAPTOP", "MONITOR",
    "KEYBOARD_MOUSE", "DESKTOP_COMPUTER", "TABLET", "PRINTER", "CRT", "OTHER"
]

EXCLUDED_DEFAULT_CLASSES = [
    "MOTOR", "MAGNET_ASSEMBLY", "LCD_PANEL", "MIXED_PLASTIC"
]


@dataclass
class ZenodoFileMetadata:
    filename: str
    size: int
    checksum_md5: str
    download_url: str


@dataclass
class AcquisitionReport:
    zenodo_record: str
    files_acquired: List[str]
    total_download_bytes: int
    extracted_image_count: int
    extracted_annotation_count: int
    retained_image_count: int
    excluded_image_count: int
    exclusion_reasons: Dict[str, int]
    source_class_distribution: Dict[str, int]
    retained_class_distribution: Dict[str, int]
    insufficient_candidate_classes: List[str]
    train_count: int
    val_count: int
    test_count: int
    duplicate_count: int
    cross_split_leakage: bool
    quality_gate_status: str
    blockers: List[str]


class XBATDatasetAcquisition:
    """
    Manages genuine acquisition, verification, and YOLO formatting of the XBAT+ WEEE RGB subset.
    """

    ZENODO_RECORD_ID = "18022530"
    ZENODO_API_URL = "https://zenodo.org/api/records/18022530"
    TARGET_FILES = {
        "raw_XBAT+_v1.0_RGB_train.zip",
        "raw_XBAT+_v1.0_RGB_test.zip",
    }

    @classmethod
    def fetch_zenodo_metadata(cls, api_url: Optional[str] = None) -> List[ZenodoFileMetadata]:
        """
        Inspects Zenodo API record and returns metadata for target RGB files.
        """
        url = api_url or cls.ZENODO_API_URL
        req = urllib.request.Request(url, headers={"User-Agent": "EcoSetu-Dataset-Pipeline/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        files_meta: List[ZenodoFileMetadata] = []
        raw_files = data.get("files", [])
        for f in raw_files:
            fn = f.get("key")
            if fn in cls.TARGET_FILES:
                cs = f.get("checksum", "")
                md5 = cs.replace("md5:", "") if cs.startswith("md5:") else cs
                files_meta.append(
                    ZenodoFileMetadata(
                        filename=fn,
                        size=int(f.get("size", 0)),
                        checksum_md5=md5,
                        download_url=f.get("links", {}).get("self", ""),
                    )
                )

        return files_meta

    @staticmethod
    def verify_md5(filepath: Path, expected_md5: str) -> bool:
        """Verifies MD5 checksum of a downloaded file."""
        if not filepath.exists():
            return False
        h = hashlib.md5()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        return h.hexdigest().lower() == expected_md5.lower()

    @classmethod
    def download_file(
        cls,
        url: str,
        target_path: Path,
        expected_size: int,
        expected_md5: str,
    ) -> bool:
        """
        Downloads a file and validates both size and MD5 checksum.
        """
        target_path.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(url, headers={"User-Agent": "EcoSetu-Dataset-Pipeline/1.0"})
        with urllib.request.urlopen(req, timeout=120) as resp, open(target_path, "wb") as out:
            shutil.copyfileobj(resp, out)

        if target_path.stat().st_size != expected_size:
            target_path.unlink(missing_ok=True)
            raise ValueError(
                f"Size mismatch for {target_path.name}: expected {expected_size}, got {target_path.stat().st_size}"
            )

        if not cls.verify_md5(target_path, expected_md5):
            target_path.unlink(missing_ok=True)
            raise ValueError(f"MD5 checksum verification failed for {target_path.name}")

        return True

    @staticmethod
    def extract_zip(zip_path: Path, extract_to: Path) -> Path:
        """Safely extracts a zip archive to the target directory."""
        extract_to.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(extract_to)
        return extract_to

    @classmethod
    def build_dataset_pipeline(
        cls,
        staging_dir: Path,
        output_dataset_dir: Path,
        split_seed: int = 42,
        train_ratio: float = 0.70,
        val_ratio: float = 0.20,
        test_ratio: float = 0.10,
    ) -> Tuple[QualityGateResult, AcquisitionReport]:
        """
        Processes extracted XBAT+ RGB images and labels:
        1. Validates image readability and annotation geometry
        2. Applies ClassMapper to resolve canonical categories
        3. Excludes unmapped/unsupported classes (strict non-coercion)
        4. Applies exact SHA-256 and perceptual deduplication
        5. Partitions deterministically into train/val/test
        6. Writes standard YOLO format images and labels
        7. Dynamically generates data.yaml, manifest, and validation report
        """
        # Discover all image files in staging
        image_extensions = {".jpg", ".jpeg", ".png"}
        staged_images = [
            p for p in staging_dir.rglob("*.*")
            if p.suffix.lower() in image_extensions
        ]

        exclusion_reasons: Dict[str, int] = {
            "UNMAPPED_CLASS": 0,
            "CORRUPT_IMAGE": 0,
            "MISSING_LABEL_FILE": 0,
            "INVALID_BBOX": 0,
            "DUPLICATE_IMAGE": 0,
        }

        source_class_counts: Dict[str, int] = {}
        candidate_records: List[Dict[str, Any]] = []

        total_annotations_scanned = 0
        valid_annotations_count = 0

        for img_path in staged_images:
            # Check image readability
            try:
                with Image.open(img_path) as im:
                    im.verify()
                with Image.open(img_path) as im:
                    _ = im.size
            except Exception:
                exclusion_reasons["CORRUPT_IMAGE"] += 1
                continue

            # Locate corresponding label file (.txt with same stem or in adjacent labels/ dir)
            lbl_path = img_path.with_suffix(".txt")
            if not lbl_path.exists():
                # Check for parallel labels directory (e.g. .../images/x.jpg -> .../labels/x.txt)
                parent_dir = img_path.parent
                if parent_dir.name == "images":
                    lbl_path = parent_dir.parent / "labels" / f"{img_path.stem}.txt"

            if not lbl_path.exists():
                exclusion_reasons["MISSING_LABEL_FILE"] += 1
                continue

            # Read source annotations
            with open(lbl_path, "r", encoding="utf-8") as lf:
                lines = [ln.strip() for ln in lf if ln.strip()]

            if not lines:
                exclusion_reasons["MISSING_LABEL_FILE"] += 1
                continue

            mapped_boxes: List[Tuple[str, float, float, float, float]] = []
            has_invalid_box = False

            for line in lines:
                total_annotations_scanned += 1
                parts = line.split()
                if len(parts) < 5:
                    has_invalid_box = True
                    break

                try:
                    src_cls_id = int(parts[0])
                    xc, yc, w, h = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])
                except ValueError:
                    has_invalid_box = True
                    break

                # Validate coordinates
                if not (0.0 <= xc <= 1.0 and 0.0 <= yc <= 1.0 and 0.0 < w <= 1.0 and 0.0 < h <= 1.0):
                    has_invalid_box = True
                    break

                # Determine source class name
                if 0 <= src_cls_id < len(XBAT_SOURCE_CLASSES):
                    src_name = XBAT_SOURCE_CLASSES[src_cls_id]
                else:
                    src_name = f"UNKNOWN_{src_cls_id}"

                source_class_counts[src_name] = source_class_counts.get(src_name, 0) + 1

                # Map class via ClassMapper
                map_res = ClassMapper.map_class(src_name)
                if map_res.status == "MAPPED" and map_res.canonical_category:
                    mapped_boxes.append((map_res.canonical_category, xc, yc, w, h))
                    valid_annotations_count += 1
                else:
                    # Unmapped class rejected
                    pass

            if has_invalid_box:
                exclusion_reasons["INVALID_BBOX"] += 1
                continue

            if not mapped_boxes:
                # All boxes were in unmapped classes (e.g. AlarmClock, RemoteControl)
                exclusion_reasons["UNMAPPED_CLASS"] += 1
                continue

            candidate_records.append({
                "id": img_path.stem,
                "source": "XBAT_RGB",
                "path": img_path,
                "boxes": mapped_boxes,
            })

        # Deduplication using CrossDatasetDeduplicator
        dedup = CrossDatasetDeduplicator()
        unique_records, dedup_report = dedup.deduplicate(candidate_records)
        duplicate_count = dedup_report.exact_duplicates_found + dedup_report.perceptual_duplicates_found
        exclusion_reasons["DUPLICATE_IMAGE"] += duplicate_count

        # Identify retained classes
        retained_class_set: Set[str] = set()
        for rec in unique_records:
            for cat, _, _, _, _ in rec["boxes"]:
                retained_class_set.add(cat)

        retained_classes = sorted(list(retained_class_set))
        class_to_target_idx = {name: idx for idx, name in enumerate(retained_classes)}

        retained_class_counts: Dict[str, int] = {c: 0 for c in retained_classes}
        images_per_class: Dict[str, int] = {c: 0 for c in retained_classes}
        for rec in unique_records:
            seen_in_rec = set()
            for cat, _, _, _, _ in rec["boxes"]:
                retained_class_counts[cat] = retained_class_counts.get(cat, 0) + 1
                seen_in_rec.add(cat)
            for cat in seen_in_rec:
                images_per_class[cat] = images_per_class.get(cat, 0) + 1

        # Determine insufficient candidate classes
        insufficient_classes = [
            c for c in CANDIDATE_MODEL_CLASSES if c not in retained_class_set
        ]

        # Genuine deterministic class-aware stratified splitting
        records_by_class: Dict[str, List[Dict[str, Any]]] = {}
        for rec in unique_records:
            primary_cat = rec["boxes"][0][0]
            records_by_class.setdefault(primary_cat, []).append(rec)

        splits_data: Dict[str, List[Dict[str, Any]]] = {"train": [], "val": [], "test": []}

        for cat in sorted(records_by_class.keys()):
            cat_records = records_by_class[cat]
            cat_seed = split_seed + sum(ord(c) for c in cat)
            rng = random.Random(cat_seed)
            shuffled_cat = list(cat_records)
            shuffled_cat.sort(key=lambda r: r["id"])
            rng.shuffle(shuffled_cat)

            n_cat = len(shuffled_cat)
            n_cat_train = int(round(n_cat * train_ratio))
            n_cat_val = int(round(n_cat * val_ratio))
            n_cat_test = n_cat - n_cat_train - n_cat_val

            if n_cat >= 3:
                if n_cat_train < 1: n_cat_train = 1
                if n_cat_val < 1: n_cat_val = 1
                if n_cat_test < 1:
                    n_cat_test = 1
                    if n_cat_train > 1: n_cat_train -= 1

            splits_data["train"].extend(shuffled_cat[:n_cat_train])
            splits_data["val"].extend(shuffled_cat[n_cat_train:n_cat_train + n_cat_val])
            splits_data["test"].extend(shuffled_cat[n_cat_train + n_cat_val:])

        n_total = len(unique_records)

        # Clear/prepare output directory
        for split in ("train", "val", "test"):
            (output_dataset_dir / "images" / split).mkdir(parents=True, exist_ok=True)
            (output_dataset_dir / "labels" / split).mkdir(parents=True, exist_ok=True)

        # Copy images and write normalized YOLO labels
        split_ann_counts = {"train": 0, "val": 0, "test": 0}
        for split, records in splits_data.items():
            img_out_dir = output_dataset_dir / "images" / split
            lbl_out_dir = output_dataset_dir / "labels" / split

            for rec in records:
                src_img = rec["path"]
                dest_img = img_out_dir / src_img.name
                shutil.copy2(src_img, dest_img)

                dest_lbl = lbl_out_dir / f"{src_img.stem}.txt"
                with open(dest_lbl, "w", encoding="utf-8") as lf:
                    for cat, xc, yc, w, h in rec["boxes"]:
                        t_idx = class_to_target_idx[cat]
                        lf.write(f"{t_idx} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}\n")
                        split_ann_counts[split] += 1

        # Generate data.yaml with ONLY retained classes
        yaml_config = {
            "path": output_dataset_dir.resolve().as_posix(),
            "train": "images/train",
            "val": "images/val",
            "test": "images/test",
            "nc": len(retained_classes),
            "names": {idx: name for idx, name in enumerate(retained_classes)},
        }
        yaml_file = output_dataset_dir / "data.yaml"
        with open(yaml_file, "w", encoding="utf-8") as f:
            yaml.dump(yaml_config, f, sort_keys=False)

        # Preliminary manifest written to enable quality gate validation
        manifest_file = output_dataset_dir / "dataset_manifest.json"
        val_report_file = output_dataset_dir / "validation_report.json"

        manifest = {
            "dataset_version": "material-detection-v0.1.0",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "dataset_type": "object_detection",
            "primary_source": {
                "name": "XBAT+ WEEE RGB Subset",
                "zenodo_record_id": cls.ZENODO_RECORD_ID,
                "doi": "10.5281/zenodo.18022530",
                "url": "https://zenodo.org/records/18022530",
                "license": "CC-BY-4.0",
                "archive_files": [
                    {
                        "filename": "raw_XBAT+_v1.0_RGB_train.zip",
                        "size_bytes": 59670306,
                        "md5": "e5189970528274b87c38e3255ae61236"
                    },
                    {
                        "filename": "raw_XBAT+_v1.0_RGB_test.zip",
                        "size_bytes": 15789028,
                        "md5": "1e6a5219fd96c1b14a19f8f552354afe"
                    }
                ]
            },
            "source_metrics": {
                "extracted_images": len(staged_images),
                "extracted_annotations": total_annotations_scanned,
                "retained_images": n_total,
                "excluded_images": len(staged_images) - n_total,
                "exclusion_reasons": exclusion_reasons,
                "source_class_distribution": source_class_counts,
            },
            "supported_classes": retained_classes,
            "insufficient_classes": insufficient_classes,
            "excluded_classes": EXCLUDED_DEFAULT_CLASSES,
            "split_counts": {
                "train": len(splits_data["train"]),
                "val": len(splits_data["val"]),
                "test": len(splits_data["test"]),
                "total": n_total,
            },
            "annotation_counts": {
                "train": split_ann_counts["train"],
                "val": split_ann_counts["val"],
                "test": split_ann_counts["test"],
                "total": sum(split_ann_counts.values()),
            },
            "class_distribution": retained_class_counts,
            "images_per_class": images_per_class,
            "deduplication": {
                "exact_duplicates_removed": dedup_report.exact_duplicates_found,
                "perceptual_duplicates_removed": dedup_report.perceptual_duplicates_found,
            },
            "split_seed": split_seed,
            "split_policy": "class_stratified_70_20_10",
            "quality_gate_status": "PENDING_VALIDATION",
            "location": str(output_dataset_dir),
        }
        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

        # Preliminary validation report
        val_report = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "quality_gate_status": "PENDING_VALIDATION",
            "build_status": "PENDING",
            "blockers": [],
            "metrics": {},
        }
        with open(val_report_file, "w", encoding="utf-8") as f:
            json.dump(val_report, f, indent=2)

        # Run independent quality gate evaluation on physical files
        harness = ColabDatasetBuildHarness(target_dataset_dir=output_dataset_dir)
        quality_gate_res = harness.run_quality_gate()

        # Update manifest and validation report with ACTUAL quality gate status
        manifest["quality_gate_status"] = quality_gate_res.status
        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

        val_report = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "quality_gate_status": quality_gate_res.status,
            "build_status": quality_gate_res.build_status,
            "blockers": quality_gate_res.blockers,
            "metrics": {
                "total_images": quality_gate_res.total_images,
                "train_count": quality_gate_res.train_count,
                "val_count": quality_gate_res.val_count,
                "test_count": quality_gate_res.test_count,
                "total_annotations": quality_gate_res.total_annotations,
                "annotation_counts": quality_gate_res.annotation_counts,
                "per_class_counts": quality_gate_res.per_class_counts,
                "images_per_class": quality_gate_res.images_per_class,
                "duplicate_count": duplicate_count,
                "invalid_images": quality_gate_res.invalid_images_count,
                "invalid_annotations": quality_gate_res.invalid_annotations_count,
                "leakage_detected": quality_gate_res.leakage_detected,
            },
        }
        with open(val_report_file, "w", encoding="utf-8") as f:
            json.dump(val_report, f, indent=2)

        # Final quality gate re-evaluation ensuring manifest matches
        quality_gate_res = harness.run_quality_gate()

        acq_report = AcquisitionReport(
            zenodo_record=cls.ZENODO_RECORD_ID,
            files_acquired=list(cls.TARGET_FILES),
            total_download_bytes=75459334,
            extracted_image_count=len(staged_images),
            extracted_annotation_count=total_annotations_scanned,
            retained_image_count=n_total,
            excluded_image_count=len(staged_images) - n_total,
            exclusion_reasons=exclusion_reasons,
            source_class_distribution=source_class_counts,
            retained_class_distribution=retained_class_counts,
            insufficient_candidate_classes=insufficient_classes,
            train_count=len(splits_data["train"]),
            val_count=len(splits_data["val"]),
            test_count=len(splits_data["test"]),
            duplicate_count=duplicate_count,
            cross_split_leakage=quality_gate_res.leakage_detected,
            quality_gate_status=quality_gate_res.status,
            blockers=quality_gate_res.blockers,
        )

        return quality_gate_res, acq_report
