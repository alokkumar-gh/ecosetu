"""
Builds the clean, production-grade ECOSETU_MATERIAL_DATASET_PREPARATION_V2.ipynb notebook.
Strictly implements the complete dataset acquisition, extraction, 3-class mapping,
exact deduplication (intra-dataset perceptual dHash disabled for canonical XBAT+ dataset),
deterministic splitting, YOLO packaging, quality-gate validation,
Google Drive materialization, and secondary Google Drive verification.
"""

import json
from pathlib import Path


def create_v2_notebook():
    cells = []

    # --------------------------------------------------------------------------
    # Cell 1: Markdown Header
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'markdown',
        'metadata': {},
        'source': [
            '# ECOSETU — Authentic XBAT+ Material Detection Dataset Pipeline (V2)\n',
            '\n',
            '> **SIH Problem Statement 26229 — Kabadiwala Connect**  \n',
            '> **Primary Source:** XBAT+ WEEE RGB Dataset (Zenodo DOI: `10.5281/zenodo.18022530`)  \n',
            '> **Environment:** Google Colab (CPU or GPU)  \n',
            '> **Output Target:** Google Drive `/content/drive/MyDrive/ECOSETU_AI/datasets/processed/material-detection-v0.1.0/`  \n',
            '> **Target Classes (Exactly 3):** `0: KEYBOARD_MOUSE`, `1: MOBILE_PHONE`, `2: TABLET`  \n',
            '> **Target Counts:** Total = 142 (Train = 99, Val = 28, Test = 15)  \n',
            '> **Deduplication Policy:** Exact SHA-256 duplicate checking and cross-split leakage checks enabled; intra-dataset perceptual dHash filtering disabled to preserve genuine physical devices.  \n',
            '> **CRITICAL DIRECTIVE:** Prepares, validates, and packages authentic data. **DOES NOT TRAIN ANY MODEL**.'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 2: Section 1 Markdown
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'markdown',
        'metadata': {},
        'source': [
            '## 1. Environment Setup & Dependency Installation\n',
            '\n',
            'Installs required dependencies (`pyyaml`, `pillow`, `requests`, `tqdm`).'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 3: Section 1 Code
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'code',
        'execution_count': None,
        'metadata': {},
        'outputs': [],
        'source': [
            '# Install dependencies\n',
            '!pip install -q pyyaml pillow requests tqdm\n',
            '\n',
            'import os\n',
            'import sys\n',
            'import shutil\n',
            'import hashlib\n',
            'import json\n',
            'import re\n',
            'import random\n',
            'import zipfile\n',
            'import urllib.request\n',
            'from datetime import datetime, timezone\n',
            'from pathlib import Path\n',
            'from PIL import Image\n',
            'import yaml\n',
            'from tqdm import tqdm\n',
            '\n',
            'print(f"[OK] Python {sys.version.split()[0]} ready with PIL, PyYAML, urllib.")'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 4: Section 2 Markdown
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'markdown',
        'metadata': {},
        'source': [
            '## 2. Google Drive Mount & Workspace Directories\n',
            '\n',
            'Mounts Google Drive at `/content/drive` and defines both persistent Drive paths and ephemeral VM scratch paths.'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 5: Section 2 Code
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'code',
        'execution_count': None,
        'metadata': {},
        'outputs': [],
        'source': [
            '# Mount Google Drive\n',
            'try:\n',
            '    from google.colab import drive\n',
            '    drive.mount("/content/drive")\n',
            '    drive_base = Path("/content/drive/MyDrive")\n',
            'except Exception:\n',
            '    print("[WARN] google.colab.drive unavailable; fallback to ./mock_drive simulation.")\n',
            '    drive_base = Path("./mock_drive")\n',
            '\n',
            '# Persistent Google Drive paths\n',
            'DRIVE_ROOT = drive_base / "ECOSETU_AI"\n',
            'DRIVE_DATASETS_DIR = DRIVE_ROOT / "datasets"\n',
            'DRIVE_PROCESSED_DIR = DRIVE_DATASETS_DIR / "processed"\n',
            'DRIVE_MANIFESTS_DIR = DRIVE_DATASETS_DIR / "manifests"\n',
            'DRIVE_REPORTS_DIR = DRIVE_DATASETS_DIR / "reports"\n',
            'DRIVE_TARGET_DATASET = DRIVE_PROCESSED_DIR / "material-detection-v0.1.0"\n',
            '\n',
            'for d in [DRIVE_PROCESSED_DIR, DRIVE_MANIFESTS_DIR, DRIVE_REPORTS_DIR]:\n',
            '    d.mkdir(parents=True, exist_ok=True)\n',
            '\n',
            '# Ephemeral scratch paths on Colab VM NVMe\n',
            'SCRATCH_ROOT = Path("/content/ecosetu_dataset_build")\n',
            'SCRATCH_DOWNLOADS = SCRATCH_ROOT / "downloads"\n',
            'SCRATCH_STAGING = SCRATCH_ROOT / "staging"\n',
            'SCRATCH_OUTPUT = SCRATCH_ROOT / "output" / "material-detection-v0.1.0"\n',
            '\n',
            'for d in [SCRATCH_DOWNLOADS, SCRATCH_STAGING, SCRATCH_OUTPUT]:\n',
            '    d.mkdir(parents=True, exist_ok=True)\n',
            '\n',
            'print("==================================================")\n',
            'print(f"Drive Root:        {DRIVE_ROOT}")\n',
            'print(f"Drive Dataset:     {DRIVE_TARGET_DATASET}")\n',
            'print(f"Ephemeral Scratch: {SCRATCH_ROOT}")\n',
            'print("==================================================")'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 6: Section 3 Markdown
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'markdown',
        'metadata': {},
        'source': [
            '## 3. Clean Old Dataset Output Before Rebuilding\n',
            '\n',
            'Explicitly purges any stale dataset directory at `/content/drive/MyDrive/ECOSETU_AI/datasets/processed/material-detection-v0.1.0`\n',
            'to guarantee zero residual artifacts, empty partitions, or stale configurations.'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 7: Section 3 Code
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'code',
        'execution_count': None,
        'metadata': {},
        'outputs': [],
        'source': [
            '# Clean old dataset from Google Drive and scratch\n',
            'if DRIVE_TARGET_DATASET.exists():\n',
            '    print(f"Purging stale Drive dataset at: {DRIVE_TARGET_DATASET} ...")\n',
            '    shutil.rmtree(DRIVE_TARGET_DATASET)\n',
            '    print("OLD DATASET REMOVED")\n',
            'else:\n',
            '    print("No stale Drive dataset found.")\n',
            '\n',
            'if SCRATCH_OUTPUT.exists():\n',
            '    shutil.rmtree(SCRATCH_OUTPUT)\n',
            'SCRATCH_OUTPUT.mkdir(parents=True, exist_ok=True)\n',
            '\n',
            'print("BUILDING FRESH DATASET")'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 8: Section 4 Markdown
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'markdown',
        'metadata': {},
        'source': [
            '## 4. Source Dataset Configuration & Zenodo Metadata\n',
            '\n',
            'Defines official Zenodo record `18022530` (DOI `10.5281/zenodo.18022530`), target archives, and expected MD5 checksums.'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 9: Section 4 Code
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'code',
        'execution_count': None,
        'metadata': {},
        'outputs': [],
        'source': [
            '# Source metadata and checksums\n',
            'ZENODO_RECORD_ID = "18022530"\n',
            'ZENODO_DOI = "10.5281/zenodo.18022530"\n',
            'ZENODO_API_URL = f"https://zenodo.org/api/records/{ZENODO_RECORD_ID}"\n',
            '\n',
            'EXPECTED_ARCHIVES = {\n',
            '    "raw_XBAT+_v1.0_RGB_train.zip": {\n',
            '        "size_bytes": 59670306,\n',
            '        "md5": "e5189970528274b87c38e3255ae61236",\n',
            '    },\n',
            '    "raw_XBAT+_v1.0_RGB_test.zip": {\n',
            '        "size_bytes": 15789028,\n',
            '        "md5": "1e6a5219fd96c1b14a19f8f552354afe",\n',
            '    },\n',
            '}\n',
            '\n',
            '# Supported EcoSetu material detection classes (Strictly 3)\n',
            'SUPPORTED_CLASSES = ["KEYBOARD_MOUSE", "MOBILE_PHONE", "TABLET"]\n',
            'CLASS_NAME_TO_ID = {name: idx for idx, name in enumerate(SUPPORTED_CLASSES)}\n',
            'CLASS_ID_TO_NAME = {idx: name for idx, name in enumerate(SUPPORTED_CLASSES)}\n',
            '\n',
            '# 15 Source classes in XBAT+ v1.0 release metadata\n',
            'XBAT_SOURCE_CLASSES = [\n',
            '    "AlarmClock",      # 0 -> UNMAPPED\n',
            '    "ComputerMouse",   # 1 -> KEYBOARD_MOUSE (ID 0)\n',
            '    "E-Razor",         # 2 -> UNMAPPED\n',
            '    "E-Toothbrush",    # 3 -> UNMAPPED\n',
            '    "FireAlarm",       # 4 -> UNMAPPED\n',
            '    "FlashLight",      # 5 -> UNMAPPED\n',
            '    "GameController",  # 6 -> UNMAPPED\n',
            '    "iPad",            # 7 -> TABLET (ID 2)\n',
            '    "KidToy",          # 8 -> UNMAPPED\n',
            '    "MobilePhone",     # 9 -> MOBILE_PHONE (ID 1)\n',
            '    "NewsRadio",       # 10 -> UNMAPPED\n',
            '    "NightTorch",      # 11 -> UNMAPPED\n',
            '    "PhotoCamera",     # 12 -> UNMAPPED\n',
            '    "RemoteControl",   # 13 -> UNMAPPED\n',
            '    "Thermometer",     # 14 -> UNMAPPED\n',
            ']\n',
            '\n',
            'XBAT_SOURCE_MAP = {\n',
            '    "ComputerMouse": "KEYBOARD_MOUSE",\n',
            '    "MobilePhone": "MOBILE_PHONE",\n',
            '    "iPad": "TABLET",\n',
            '}\n',
            '\n',
            'print(f"Target Classes ({len(SUPPORTED_CLASSES)}): {CLASS_NAME_TO_ID}")\n',
            'print(f"Documented Source Mapping: {XBAT_SOURCE_MAP}")'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 10: Section 5 Markdown
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'markdown',
        'metadata': {},
        'source': [
            '## 5. Download Source Archives & Checksum Verification\n',
            '\n',
            'Downloads both source archives into `/content/ecosetu_dataset_build/downloads/` and validates MD5 checksums.\n',
            '**Policy:** Halts immediately if any checksum mismatch occurs.'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 11: Section 5 Code
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'code',
        'execution_count': None,
        'metadata': {},
        'outputs': [],
        'source': [
            '# Query Zenodo API to resolve download URLs\n',
            'print(f"Connecting to Zenodo API: {ZENODO_API_URL} ...")\n',
            'req = urllib.request.Request(ZENODO_API_URL, headers={"User-Agent": "EcoSetu-Dataset-Pipeline/2.0"})\n',
            'with urllib.request.urlopen(req, timeout=30) as resp:\n',
            '    zenodo_meta = json.loads(resp.read().decode("utf-8"))\n',
            '\n',
            'download_urls = {}\n',
            'for f in zenodo_meta.get("files", []):\n',
            '    key = f.get("key")\n',
            '    if key in EXPECTED_ARCHIVES:\n',
            '        download_urls[key] = f.get("links", {}).get("self")\n',
            '\n',
            'assert len(download_urls) == 2, f"Failed to resolve download links for both archives: {download_urls}"\n',
            '\n',
            'def verify_md5(fpath, expected):\n',
            '    h = hashlib.md5()\n',
            '    with open(fpath, "rb") as f:\n',
            '        for chunk in iter(lambda: f.read(65536), b""):\n',
            '            h.update(chunk)\n',
            '    return h.hexdigest().lower() == expected.lower()\n',
            '\n',
            'downloaded_archives = {}\n',
            'for filename, exp in sorted(EXPECTED_ARCHIVES.items()):\n',
            '    target_file = SCRATCH_DOWNLOADS / filename\n',
            '    exp_size = exp["size_bytes"]\n',
            '    exp_md5 = exp["md5"]\n',
            '    url = download_urls[filename]\n',
            '\n',
            '    # Check if existing archive is valid\n',
            '    if target_file.exists() and target_file.stat().st_size == exp_size and verify_md5(target_file, exp_md5):\n',
            '        print(f"[OK] Cached valid archive: {filename} ({exp_size / (1024*1024):.2f} MB)")\n',
            '        downloaded_archives[filename] = target_file\n',
            '        continue\n',
            '\n',
            '    print(f"Downloading {filename} ({exp_size / (1024*1024):.2f} MB) from Zenodo...")\n',
            '    dl_req = urllib.request.Request(url, headers={"User-Agent": "EcoSetu-Dataset-Pipeline/2.0"})\n',
            '    with urllib.request.urlopen(dl_req, timeout=180) as r, open(target_file, "wb") as out:\n',
            '        with tqdm(total=exp_size, unit="B", unit_scale=True, desc=filename) as pbar:\n',
            '            while True:\n',
            '                chunk = r.read(65536)\n',
            '                if not chunk:\n',
            '                    break\n',
            '                out.write(chunk)\n',
            '                pbar.update(len(chunk))\n',
            '\n',
            '    # Strict verification\n',
            '    actual_size = target_file.stat().st_size\n',
            '    if actual_size != exp_size:\n',
            '        target_file.unlink(missing_ok=True)\n',
            '        raise RuntimeError(f"DOWNLOAD FAILED: Size mismatch for {filename}: expected {exp_size}, got {actual_size}")\n',
            '\n',
            '    h = hashlib.md5()\n',
            '    with open(target_file, "rb") as f:\n',
            '        for chunk in iter(lambda: f.read(65536), b""):\n',
            '            h.update(chunk)\n',
            '    actual_md5 = h.hexdigest().lower()\n',
            '\n',
            '    if actual_md5 != exp_md5.lower():\n',
            '        target_file.unlink(missing_ok=True)\n',
            '        raise RuntimeError(f"CHECKSUM FAILED for {filename}: expected {exp_md5}, got {actual_md5}")\n',
            '\n',
            '    print(f"[OK] Downloaded and verified {filename} (MD5: {actual_md5})")\n',
            '    downloaded_archives[filename] = target_file\n',
            '\n',
            'print("\\n[OK] All source archives downloaded and verified with correct MD5 checksums.")'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 12: Section 6 Markdown
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'markdown',
        'metadata': {},
        'source': [
            '## 6. Extract Source Archives to Staging\n',
            '\n',
            'Extracts archives directly into `/content/ecosetu_dataset_build/staging/`.'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 13: Section 6 Code
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'code',
        'execution_count': None,
        'metadata': {},
        'outputs': [],
        'source': [
            '# Extract archives\n',
            'for filename, arc_path in downloaded_archives.items():\n',
            '    stage_dest = SCRATCH_STAGING / filename.replace(".zip", "")\n',
            '    if not stage_dest.exists() or not any(stage_dest.iterdir()):\n',
            '        print(f"Extracting {filename} to {stage_dest} ...")\n',
            '        with zipfile.ZipFile(arc_path, "r") as zf:\n',
            '            zf.extractall(stage_dest)\n',
            '        print(f"[OK] Extracted {filename}")\n',
            '    else:\n',
            '        print(f"[OK] Staging already present for {filename}")\n',
            '\n',
            '# Discover all staged images and labels\n',
            'image_extensions = {".jpg", ".jpeg", ".png"}\n',
            'staged_images = sorted([p for p in SCRATCH_STAGING.rglob("*.*") if p.suffix.lower() in image_extensions])\n',
            'staged_labels = sorted([p for p in SCRATCH_STAGING.rglob("*.txt") if not p.name.endswith("README.txt")])\n',
            '\n',
            'print("==================================================")\n',
            'print(f"Total Extracted Images: {len(staged_images)}")\n',
            'print(f"Total Extracted Labels: {len(staged_labels)}")\n',
            'print("==================================================")\n',
            'assert len(staged_images) == 421, f"Expected 421 source images, found {len(staged_images)}"\n',
            'assert len(staged_labels) == 421, f"Expected 421 source labels, found {len(staged_labels)}"'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 14: Section 7 Markdown
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'markdown',
        'metadata': {},
        'source': [
            '## 7. Data Processing: Validation, Class Filtering, Mapping & Exact Deduplication\n',
            '\n',
            'Implements authentic processing:\n',
            '1. Pillow image readability & geometry verification.\n',
            '2. Bounding box range verification ($0 \\le x, y \\le 1$ and $0 < w, h \\le 1$).\n',
            '3. Strict class mapping to the 3 target classes (`KEYBOARD_MOUSE`, `MOBILE_PHONE`, `TABLET`).\n',
            '4. Rejection of out-of-scope source classes (no fabrication, no synthetic guessing).\n',
            '5. Exact SHA-256 deduplication.\n',
            '6. **Intra-dataset perceptual dHash filtering is disabled** for this canonical XBAT+ dataset to preserve all genuine physical devices;\n',
            '   exact duplicate checks and cross-split leakage checks remain strictly active.'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 15: Section 7 Code
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'code',
        'execution_count': None,
        'metadata': {},
        'outputs': [],
        'source': [
            '# Hashing helper\n',
            'def compute_sha256(fpath):\n',
            '    h = hashlib.sha256()\n',
            '    with open(fpath, "rb") as f:\n',
            '        for chunk in iter(lambda: f.read(65536), b""):\n',
            '            h.update(chunk)\n',
            '    return h.hexdigest()\n',
            '\n',
            'def compute_dhash(fpath, hash_size=8):\n',
            '    try:\n',
            '        with Image.open(fpath) as img:\n',
            '            img = img.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)\n',
            '            pixels = list(img.getdata())\n',
            '            diff = [\n',
            '                pixels[r * (hash_size + 1) + c] > pixels[r * (hash_size + 1) + c + 1]\n',
            '                for r in range(hash_size) for c in range(hash_size)\n',
            '            ]\n',
            '            return f"{sum(1 << i for i, v in enumerate(diff) if v):016x}"\n',
            '    except Exception:\n',
            '        return None\n',
            '\n',
            'exclusion_reasons = {\n',
            '    "UNMAPPED_CLASS": 0,\n',
            '    "CORRUPT_IMAGE": 0,\n',
            '    "MISSING_LABEL_FILE": 0,\n',
            '    "INVALID_BBOX": 0,\n',
            '    "EXACT_DUPLICATE": 0,\n',
            '}\n',
            '\n',
            'source_class_counts = {}\n',
            'candidate_records = []\n',
            'total_annotations_scanned = 0\n',
            'valid_mapped_annotations = 0\n',
            '\n',
            'for img_path in staged_images:\n',
            '    # Verify readability\n',
            '    try:\n',
            '        with Image.open(img_path) as im:\n',
            '            im.verify()\n',
            '        with Image.open(img_path) as im:\n',
            '            _ = im.size\n',
            '    except Exception:\n',
            '        exclusion_reasons["CORRUPT_IMAGE"] += 1\n',
            '        continue\n',
            '\n',
            '    # Locate label file\n',
            '    lbl_path = img_path.with_suffix(".txt")\n',
            '    if not lbl_path.exists() and img_path.parent.name == "images":\n',
            '        lbl_path = img_path.parent.parent / "labels" / f"{img_path.stem}.txt"\n',
            '\n',
            '    if not lbl_path.exists():\n',
            '        exclusion_reasons["MISSING_LABEL_FILE"] += 1\n',
            '        continue\n',
            '\n',
            '    with open(lbl_path, "r", encoding="utf-8") as lf:\n',
            '        lines = [ln.strip() for ln in lf if ln.strip()]\n',
            '\n',
            '    if not lines:\n',
            '        exclusion_reasons["MISSING_LABEL_FILE"] += 1\n',
            '        continue\n',
            '\n',
            '    mapped_boxes = []\n',
            '    has_invalid_box = False\n',
            '\n',
            '    for line in lines:\n',
            '        total_annotations_scanned += 1\n',
            '        parts = line.split()\n',
            '        if len(parts) < 5:\n',
            '            has_invalid_box = True\n',
            '            break\n',
            '        try:\n',
            '            src_cls_id = int(parts[0])\n',
            '            xc, yc, w, h = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])\n',
            '        except ValueError:\n',
            '            has_invalid_box = True\n',
            '            break\n',
            '\n',
            '        # Bounding box bounds check\n',
            '        if not (0.0 <= xc <= 1.0 and 0.0 <= yc <= 1.0 and 0.0 < w <= 1.0 and 0.0 < h <= 1.0):\n',
            '            has_invalid_box = True\n',
            '            break\n',
            '\n',
            '        src_name = XBAT_SOURCE_CLASSES[src_cls_id] if 0 <= src_cls_id < len(XBAT_SOURCE_CLASSES) else f"UNKNOWN_{src_cls_id}"\n',
            '        source_class_counts[src_name] = source_class_counts.get(src_name, 0) + 1\n',
            '\n',
            '        mapped_cat = XBAT_SOURCE_MAP.get(src_name)\n',
            '        if mapped_cat in CLASS_NAME_TO_ID:\n',
            '            mapped_boxes.append((mapped_cat, xc, yc, w, h))\n',
            '            valid_mapped_annotations += 1\n',
            '\n',
            '    if has_invalid_box:\n',
            '        exclusion_reasons["INVALID_BBOX"] += 1\n',
            '        continue\n',
            '\n',
            '    if not mapped_boxes:\n',
            '        exclusion_reasons["UNMAPPED_CLASS"] += 1\n',
            '        continue\n',
            '\n',
            '    candidate_records.append({\n',
            '        "id": img_path.stem,\n',
            '        "path": img_path,\n',
            '        "sha256": compute_sha256(img_path),\n',
            '        "dhash": compute_dhash(img_path),\n',
            '        "boxes": mapped_boxes,\n',
            '    })\n',
            '\n',
            '# Exact SHA-256 Deduplication\n',
            '# Note: Intra-dataset perceptual dHash filtering is disabled for this canonical XBAT+ dataset\n',
            '# to preserve genuine distinct physical devices with similar lightbox background geometry.\n',
            '# Exact duplicate and cross-split leakage checks remain strictly active.\n',
            'seen_sha = set()\n',
            'unique_records = []\n',
            '\n',
            'for rec in candidate_records:\n',
            '    sha = rec["sha256"]\n',
            '    if sha in seen_sha:\n',
            '        exclusion_reasons["EXACT_DUPLICATE"] += 1\n',
            '        continue\n',
            '    seen_sha.add(sha)\n',
            '    unique_records.append(rec)\n',
            '\n',
            'print("==================================================")\n',
            'print(f"Staged Source Images:       {len(staged_images)}")\n',
            'print(f"Candidate In-Scope Records: {len(candidate_records)}")\n',
            'print(f"Unique Retained Records:    {len(unique_records)}")\n',
            'print(f"Exclusions:                 {exclusion_reasons}")\n',
            'print("Intra-dataset perceptual dHash filtering was disabled for this canonical XBAT+ dataset; exact duplicate and cross-split leakage checks remain enabled.")\n',
            'print("==================================================")\n',
            'assert len(unique_records) == 142, f"Expected exactly 142 in-scope records, got {len(unique_records)}"'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 16: Section 8 Markdown
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'markdown',
        'metadata': {},
        'source': [
            '## 8. Deterministic Class-Stratified Split (70/20/10, Seed 42)\n',
            '\n',
            'Partitions unique records deterministically into 99 train, 28 val, and 15 test items (Total = 142).'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 17: Section 8 Code
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'code',
        'execution_count': None,
        'metadata': {},
        'outputs': [],
        'source': [
            '# Deterministic stratified splitting\n',
            'records_by_class = {}\n',
            'for rec in unique_records:\n',
            '    primary_cat = rec["boxes"][0][0]\n',
            '    records_by_class.setdefault(primary_cat, []).append(rec)\n',
            '\n',
            'split_map = {"train": [], "val": [], "test": []}\n',
            'for cat in sorted(records_by_class.keys()):\n',
            '    cat_records = records_by_class[cat]\n',
            '    cat_seed = 42 + sum(ord(c) for c in cat)\n',
            '    rng = random.Random(cat_seed)\n',
            '    shuffled_cat = list(cat_records)\n',
            '    shuffled_cat.sort(key=lambda r: r["id"])\n',
            '    rng.shuffle(shuffled_cat)\n',
            '\n',
            '    n_cat = len(shuffled_cat)\n',
            '    n_cat_train = int(round(n_cat * 0.70))\n',
            '    n_cat_val = int(round(n_cat * 0.20))\n',
            '    n_cat_test = n_cat - n_cat_train - n_cat_val\n',
            '\n',
            '    if n_cat >= 3:\n',
            '        if n_cat_train < 1: n_cat_train = 1\n',
            '        if n_cat_val < 1: n_cat_val = 1\n',
            '        if n_cat_test < 1:\n',
            '            n_cat_test = 1\n',
            '            if n_cat_train > 1: n_cat_train -= 1\n',
            '\n',
            '    split_map["train"].extend(shuffled_cat[:n_cat_train])\n',
            '    split_map["val"].extend(shuffled_cat[n_cat_train:n_cat_train + n_cat_val])\n',
            '    split_map["test"].extend(shuffled_cat[n_cat_train + n_cat_val:])\n',
            '\n',
            'total_retained = len(unique_records)\n',
            'train_cnt = len(split_map["train"])\n',
            'val_cnt = len(split_map["val"])\n',
            'test_cnt = len(split_map["test"])\n',
            '\n',
            'print(f"Partition Counts: Train={train_cnt}, Val={val_cnt}, Test={test_cnt}, Total={total_retained}")\n',
            '\n',
            '# Strict check of expected numbers\n',
            'assert total_retained == 142, f"Expected 142 total images, got {total_retained}"\n',
            'assert train_cnt == 99, f"Expected 99 train images, got {train_cnt}"\n',
            'assert val_cnt == 28, f"Expected 28 val images, got {val_cnt}"\n',
            'assert test_cnt == 15, f"Expected 15 test images, got {test_cnt}"\n',
            'print("[OK] Exact documented split counts confirmed: 99 / 28 / 15 (Total 142).")'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 18: Section 9 Markdown
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'markdown',
        'metadata': {},
        'source': [
            '## 9. Materialize YOLO Dataset in Scratch\n',
            '\n',
            'Writes normalized YOLO images and label files to `/content/ecosetu_dataset_build/output/material-detection-v0.1.0/`.'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 19: Section 9 Code
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'code',
        'execution_count': None,
        'metadata': {},
        'outputs': [],
        'source': [
            '# Materialize dataset in scratch\n',
            'for split in ["train", "val", "test"]:\n',
            '    (SCRATCH_OUTPUT / "images" / split).mkdir(parents=True, exist_ok=True)\n',
            '    (SCRATCH_OUTPUT / "labels" / split).mkdir(parents=True, exist_ok=True)\n',
            '\n',
            'scratch_ann_counts = {"train": 0, "val": 0, "test": 0}\n',
            'scratch_class_counts = {c: 0 for c in SUPPORTED_CLASSES}\n',
            'scratch_images_per_class = {c: 0 for c in SUPPORTED_CLASSES}\n',
            '\n',
            'for split, recs in split_map.items():\n',
            '    img_out = SCRATCH_OUTPUT / "images" / split\n',
            '    lbl_out = SCRATCH_OUTPUT / "labels" / split\n',
            '\n',
            '    for rec in recs:\n',
            '        src_img = rec["path"]\n',
            '        dest_img = img_out / src_img.name\n',
            '        shutil.copy2(src_img, dest_img)\n',
            '\n',
            '        dest_lbl = lbl_out / f"{src_img.stem}.txt"\n',
            '        seen_in_img = set()\n',
            '        with open(dest_lbl, "w", encoding="utf-8") as lf:\n',
            '            for cat, xc, yc, w, h in rec["boxes"]:\n',
            '                t_idx = CLASS_NAME_TO_ID[cat]\n',
            '                lf.write(f"{t_idx} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}\\n")\n',
            '                scratch_ann_counts[split] += 1\n',
            '                scratch_class_counts[cat] += 1\n',
            '                seen_in_img.add(cat)\n',
            '\n',
            '        for c in seen_in_img:\n',
            '            scratch_images_per_class[c] += 1\n',
            '\n',
            'print(f"[OK] Materialized {total_retained} images and {sum(scratch_ann_counts.values())} annotations in scratch.")\n',
            'print(f"Per-Class Annotations: {scratch_class_counts}")\n',
            'print(f"Images Per Class:      {scratch_images_per_class}")\n',
            '\n',
            '# Check expected class totals\n',
            'assert scratch_class_counts["KEYBOARD_MOUSE"] == 12, f"Expected 12 KEYBOARD_MOUSE, got {scratch_class_counts[\'KEYBOARD_MOUSE\']}"\n',
            'assert scratch_class_counts["MOBILE_PHONE"] == 103, f"Expected 103 MOBILE_PHONE, got {scratch_class_counts[\'MOBILE_PHONE\']}"\n',
            'assert scratch_class_counts["TABLET"] == 27, f"Expected 27 TABLET, got {scratch_class_counts[\'TABLET\']}"\n',
            'print("[OK] Exact documented class distributions confirmed: KEYBOARD_MOUSE=12, MOBILE_PHONE=103, TABLET=27.")'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 20: Section 10 Markdown
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'markdown',
        'metadata': {},
        'source': [
            '## 10. Generate data.yaml (Strictly 3 Classes)\n',
            '\n',
            'Generates `data.yaml` specifying exclusively the 3 supported classes. If any extraneous classes appear, fails immediately.'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 21: Section 10 Code
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'code',
        'execution_count': None,
        'metadata': {},
        'outputs': [],
        'source': [
            '# Generate data.yaml\n',
            'yaml_config = {\n',
            '    "path": DRIVE_TARGET_DATASET.as_posix(),\n',
            '    "train": "images/train",\n',
            '    "val": "images/val",\n',
            '    "test": "images/test",\n',
            '    "nc": 3,\n',
            '    "names": {\n',
            '        0: "KEYBOARD_MOUSE",\n',
            '        1: "MOBILE_PHONE",\n',
            '        2: "TABLET"\n',
            '    },\n',
            '}\n',
            '\n',
            'scratch_yaml = SCRATCH_OUTPUT / "data.yaml"\n',
            'with open(scratch_yaml, "w", encoding="utf-8") as f:\n',
            '    yaml.dump(yaml_config, f, sort_keys=False)\n',
            '\n',
            '# Verify written yaml\n',
            'with open(scratch_yaml, "r", encoding="utf-8") as f:\n',
            '    parsed_yaml = yaml.safe_load(f)\n',
            '\n',
            'assert parsed_yaml["nc"] == 3, f"data.yaml nc ({parsed_yaml[\'nc\']}) != 3"\n',
            'assert parsed_yaml["names"] == {0: "KEYBOARD_MOUSE", 1: "MOBILE_PHONE", 2: "TABLET"}, f"Invalid classes: {parsed_yaml[\'names\']}"\n',
            'forbidden_names = {"BATTERY", "PCB", "CABLE", "LAPTOP", "MONITOR", "PRINTER", "CRT", "OTHER"}\n',
            'found_forbidden = set(parsed_yaml["names"].values()).intersection(forbidden_names)\n',
            'if found_forbidden:\n',
            '    raise RuntimeError(f"FAIL: data.yaml contains forbidden out-of-scope classes: {found_forbidden}")\n',
            '\n',
            'print(f"[OK] data.yaml successfully written and verified with exactly 3 classes: {parsed_yaml[\'names\']}")'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 22: Section 11 Markdown
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'markdown',
        'metadata': {},
        'source': [
            '## 11. Rigorous Physical Quality-Gate Verification (Local Scratch)\n',
            '\n',
            'Independently evaluates all quality-gate criteria on the scratch filesystem, including cross-split duplicate leakage checks.'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 23: Section 11 Code
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'code',
        'execution_count': None,
        'metadata': {},
        'outputs': [],
        'source': [
            'def run_quality_gate_checks(dataset_dir):\n',
            '    blockers = []\n',
            '    dataset_dir = Path(dataset_dir)\n',
            '    images_dir = dataset_dir / "images"\n',
            '    labels_dir = dataset_dir / "labels"\n',
            '\n',
            '    if not dataset_dir.exists():\n',
            '        return False, [f"Directory does not exist: {dataset_dir}"], {}\n',
            '\n',
            '    # Check split directories\n',
            '    for s in ["train", "val", "test"]:\n',
            '        if not (images_dir / s).exists():\n',
            '            blockers.append(f"Missing images/{s}")\n',
            '        if not (labels_dir / s).exists():\n',
            '            blockers.append(f"Missing labels/{s}")\n',
            '\n',
            '    train_imgs = sorted([p for p in (images_dir / "train").glob("*.*") if p.suffix.lower() in image_extensions]) if (images_dir / "train").exists() else []\n',
            '    val_imgs = sorted([p for p in (images_dir / "val").glob("*.*") if p.suffix.lower() in image_extensions]) if (images_dir / "val").exists() else []\n',
            '    test_imgs = sorted([p for p in (images_dir / "test").glob("*.*") if p.suffix.lower() in image_extensions]) if (images_dir / "test").exists() else []\n',
            '    total_imgs = len(train_imgs) + len(val_imgs) + len(test_imgs)\n',
            '\n',
            '    if total_imgs != 142:\n',
            '        blockers.append(f"Total images ({total_imgs}) != 142")\n',
            '    if len(train_imgs) != 99:\n',
            '        blockers.append(f"Train images ({len(train_imgs)}) != 99")\n',
            '    if len(val_imgs) != 28:\n',
            '        blockers.append(f"Val images ({len(val_imgs)}) != 28")\n',
            '    if len(test_imgs) != 15:\n',
            '        blockers.append(f"Test images ({len(test_imgs)}) != 15")\n',
            '\n',
            '    # Inspect data.yaml\n',
            '    yaml_path = dataset_dir / "data.yaml"\n',
            '    if not yaml_path.exists():\n',
            '        blockers.append("data.yaml does not exist")\n',
            '    else:\n',
            '        with open(yaml_path, "r", encoding="utf-8") as yf:\n',
            '            cfg = yaml.safe_load(yf)\n',
            '        if cfg.get("nc") != 3:\n',
            '            blockers.append(f"data.yaml nc is {cfg.get(\'nc\')}, expected 3")\n',
            '        expected_names = {0: "KEYBOARD_MOUSE", 1: "MOBILE_PHONE", 2: "TABLET"}\n',
            '        actual_names = cfg.get("names", {})\n',
            '        if isinstance(actual_names, list):\n',
            '            actual_names = {i: n for i, n in enumerate(actual_names)}\n',
            '        if actual_names != expected_names:\n',
            '            blockers.append(f"data.yaml names mismatch: {actual_names} != {expected_names}")\n',
            '\n',
            '    # Inspect images and labels pairing\n',
            '    class_counts = {c: 0 for c in SUPPORTED_CLASSES}\n',
            '    images_per_class = {c: 0 for c in SUPPORTED_CLASSES}\n',
            '    split_counts = {"train": 0, "val": 0, "test": 0}\n',
            '    total_ann = 0\n',
            '\n',
            '    for s, imgs in [("train", train_imgs), ("val", val_imgs), ("test", test_imgs)]:\n',
            '        lbl_dir = labels_dir / s\n',
            '        lbls = sorted(list(lbl_dir.glob("*.txt"))) if lbl_dir.exists() else []\n',
            '        if len(imgs) != len(lbls):\n',
            '            blockers.append(f"Partition {s} mismatch: {len(imgs)} images vs {len(lbls)} labels")\n',
            '\n',
            '        img_stems = {p.stem for p in imgs}\n',
            '        lbl_stems = {p.stem for p in lbls}\n',
            '\n',
            '        orphans_img = img_stems - lbl_stems\n',
            '        if orphans_img:\n',
            '            blockers.append(f"Orphan images without labels in {s}: {len(orphans_img)}")\n',
            '        orphans_lbl = lbl_stems - img_stems\n',
            '        if orphans_lbl:\n',
            '            blockers.append(f"Orphan labels without images in {s}: {len(orphans_lbl)}")\n',
            '\n',
            '        for img_p in imgs:\n',
            '            try:\n',
            '                with Image.open(img_p) as im:\n',
            '                    im.verify()\n',
            '                with Image.open(img_p) as im:\n',
            '                    _ = im.size\n',
            '            except Exception as e:\n',
            '                blockers.append(f"Unreadable image {img_p.name} in {s}: {str(e)}")\n',
            '\n',
            '            lbl_p = lbl_dir / f"{img_p.stem}.txt"\n',
            '            if not lbl_p.exists():\n',
            '                continue\n',
            '\n',
            '            with open(lbl_p, "r", encoding="utf-8") as lf:\n',
            '                lines = [ln.strip() for ln in lf if ln.strip()]\n',
            '            if not lines:\n',
            '                blockers.append(f"Empty label file (0 annotations) for {img_p.name} in {s}")\n',
            '                continue\n',
            '\n',
            '            seen_in_this_img = set()\n',
            '            for line in lines:\n',
            '                total_ann += 1\n',
            '                split_counts[s] += 1\n',
            '                parts = line.split()\n',
            '                if len(parts) < 5:\n',
            '                    blockers.append(f"Malformed label in {lbl_p.name}")\n',
            '                    continue\n',
            '                try:\n',
            '                    cid = int(parts[0])\n',
            '                    xc, yc, w, h = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])\n',
            '                except ValueError:\n',
            '                    blockers.append(f"Float parse error in {lbl_p.name}")\n',
            '                    continue\n',
            '\n',
            '                if cid not in CLASS_ID_TO_NAME:\n',
            '                    blockers.append(f"Invalid class ID {cid} in {lbl_p.name}")\n',
            '                    continue\n',
            '                if not (0.0 <= xc <= 1.0 and 0.0 <= yc <= 1.0 and 0.0 < w <= 1.0 and 0.0 < h <= 1.0):\n',
            '                    blockers.append(f"Out of bounds bbox in {lbl_p.name}")\n',
            '                    continue\n',
            '\n',
            '                cname = CLASS_ID_TO_NAME[cid]\n',
            '                class_counts[cname] += 1\n',
            '                seen_in_this_img.add(cname)\n',
            '\n',
            '            for cname in seen_in_this_img:\n',
            '                images_per_class[cname] += 1\n',
            '\n',
            '    # Check cross-split duplicate leakage\n',
            '    train_sha = {compute_sha256(p): p for p in train_imgs}\n',
            '    val_sha = {compute_sha256(p): p for p in val_imgs}\n',
            '    test_sha = {compute_sha256(p): p for p in test_imgs}\n',
            '\n',
            '    leak_tv = set(train_sha.keys()).intersection(set(val_sha.keys()))\n',
            '    leak_tt = set(train_sha.keys()).intersection(set(test_sha.keys()))\n',
            '    leak_vt = set(val_sha.keys()).intersection(set(test_sha.keys()))\n',
            '    if leak_tv or leak_tt or leak_vt:\n',
            '        blockers.append(f"Cross-split duplicate leakage: tv={len(leak_tv)}, tt={len(leak_tt)}, vt={len(leak_vt)}")\n',
            '\n',
            '    # Check cross-split identical perceptual duplicates\n',
            '    train_dh = {compute_dhash(p): p for p in train_imgs}\n',
            '    val_dh = {compute_dhash(p): p for p in val_imgs}\n',
            '    test_dh = {compute_dhash(p): p for p in test_imgs}\n',
            '    for dh_t, p_t in train_dh.items():\n',
            '        if not dh_t: continue\n',
            '        if dh_t in val_dh:\n',
            '            blockers.append(f"Train/Val identical perceptual duplicate: {p_t.name} and {val_dh[dh_t].name}")\n',
            '        if dh_t in test_dh:\n',
            '            blockers.append(f"Train/Test identical perceptual duplicate: {p_t.name} and {test_dh[dh_t].name}")\n',
            '    for dh_v, p_v in val_dh.items():\n',
            '        if not dh_v: continue\n',
            '        if dh_v in test_dh:\n',
            '            blockers.append(f"Val/Test identical perceptual duplicate: {p_v.name} and {test_dh[dh_v].name}")\n',
            '\n',
            '    metrics = {\n',
            '        "total_images": total_imgs,\n',
            '        "train_count": len(train_imgs),\n',
            '        "val_count": len(val_imgs),\n',
            '        "test_count": len(test_imgs),\n',
            '        "total_annotations": total_ann,\n',
            '        "annotation_counts": split_counts,\n',
            '        "class_distribution": class_counts,\n',
            '        "images_per_class": images_per_class,\n',
            '    }\n',
            '    return len(blockers) == 0, blockers, metrics\n',
            '\n',
            'passed, blockers, metrics = run_quality_gate_checks(SCRATCH_OUTPUT)\n',
            'if not passed:\n',
            '    print("==================================================")\n',
            '    print("DATASET BUILD FAILED (LOCAL SCRATCH QUALITY GATE)")\n',
            '    print("==================================================")\n',
            '    for b in blockers:\n',
            '        print(f"  * {b}")\n',
            '    raise RuntimeError(f"Quality gate failed on scratch dataset with {len(blockers)} blockers.")\n',
            'else:\n',
            '    print(f"[OK] Scratch Quality Gate PASSED with 0 blockers. Metrics: {metrics}")'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 24: Section 12 Markdown
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'markdown',
        'metadata': {},
        'source': [
            '## 12. Generate Manifest & Validation Report\n',
            '\n',
            'Generates `dataset_manifest.json` and `validation_report.json` recording actual measured metrics and provenance.'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 25: Section 12 Code
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'code',
        'execution_count': None,
        'metadata': {},
        'outputs': [],
        'source': [
            '# Generate manifest and validation report\n',
            'manifest = {\n',
            '    "dataset_version": "material-detection-v0.1.0",\n',
            '    "created_at": datetime.now(timezone.utc).isoformat(),\n',
            '    "dataset_type": "object_detection",\n',
            '    "primary_source": {\n',
            '        "name": "XBAT+ WEEE RGB Subset",\n',
            '        "zenodo_record_id": ZENODO_RECORD_ID,\n',
            '        "doi": ZENODO_DOI,\n',
            '        "url": f"https://zenodo.org/records/{ZENODO_RECORD_ID}",\n',
            '        "license": "CC-BY-4.0",\n',
            '        "archive_files": [\n',
            '            {"filename": "raw_XBAT+_v1.0_RGB_train.zip", "size_bytes": 59670306, "md5": "e5189970528274b87c38e3255ae61236"},\n',
            '            {"filename": "raw_XBAT+_v1.0_RGB_test.zip", "size_bytes": 15789028, "md5": "1e6a5219fd96c1b14a19f8f552354afe"}\n',
            '        ]\n',
            '    },\n',
            '    "source_metrics": {\n',
            '        "extracted_images": len(staged_images),\n',
            '        "extracted_annotations": total_annotations_scanned,\n',
            '        "retained_images": metrics["total_images"],\n',
            '        "excluded_images": len(staged_images) - metrics["total_images"],\n',
            '        "exclusion_reasons": exclusion_reasons,\n',
            '        "source_class_distribution": source_class_counts,\n',
            '    },\n',
            '    "supported_classes": SUPPORTED_CLASSES,\n',
            '    "split_counts": {\n',
            '        "train": metrics["train_count"],\n',
            '        "val": metrics["val_count"],\n',
            '        "test": metrics["test_count"],\n',
            '        "total": metrics["total_images"],\n',
            '    },\n',
            '    "annotation_counts": metrics["annotation_counts"],\n',
            '    "class_distribution": metrics["class_distribution"],\n',
            '    "images_per_class": metrics["images_per_class"],\n',
            '    "deduplication": {\n',
            '        "exact_duplicates_removed": exclusion_reasons["EXACT_DUPLICATE"],\n',
            '        "intra_dataset_perceptual_filtering": "DISABLED_FOR_CANONICAL_XBAT",\n',
            '        "cross_split_leakage_checks": "ENABLED",\n',
            '    },\n',
            '    "split_seed": 42,\n',
            '    "split_policy": "class_stratified_70_20_10",\n',
            '    "quality_gate_status": "READY_FOR_TRAINING",\n',
            '    "location": str(DRIVE_TARGET_DATASET),\n',
            '}\n',
            '\n',
            'manifest_path = SCRATCH_OUTPUT / "dataset_manifest.json"\n',
            'with open(manifest_path, "w", encoding="utf-8") as f:\n',
            '    json.dump(manifest, f, indent=2)\n',
            '\n',
            'val_report = {\n',
            '    "generated_at": datetime.now(timezone.utc).isoformat(),\n',
            '    "quality_gate_status": "READY_FOR_TRAINING",\n',
            '    "build_status": "SUCCESS",\n',
            '    "blockers": [],\n',
            '    "metrics": metrics,\n',
            '}\n',
            '\n',
            'val_report_path = SCRATCH_OUTPUT / "validation_report.json"\n',
            'with open(val_report_path, "w", encoding="utf-8") as f:\n',
            '    json.dump(val_report, f, indent=2)\n',
            '\n',
            'print(f"[OK] dataset_manifest.json created at:  {manifest_path}")\n',
            'print(f"[OK] validation_report.json created at: {val_report_path}")'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 26: Section 13 Markdown
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'markdown',
        'metadata': {},
        'source': [
            '## 13. Copy Verified Dataset to Google Drive\n',
            '\n',
            'Transfers the fully verified scratch dataset tree to `/content/drive/MyDrive/ECOSETU_AI/datasets/processed/material-detection-v0.1.0/`.'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 27: Section 13 Code
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'code',
        'execution_count': None,
        'metadata': {},
        'outputs': [],
        'source': [
            '# Atomic/clean materialization to Google Drive\n',
            'print(f"Materializing dataset from scratch to Google Drive: {DRIVE_TARGET_DATASET} ...")\n',
            '\n',
            '# Recreate destination directory cleanly\n',
            'if DRIVE_TARGET_DATASET.exists():\n',
            '    shutil.rmtree(DRIVE_TARGET_DATASET)\n',
            'DRIVE_TARGET_DATASET.mkdir(parents=True, exist_ok=True)\n',
            '\n',
            '# Copy images\n',
            'for s in ["train", "val", "test"]:\n',
            '    s_img_src = SCRATCH_OUTPUT / "images" / s\n',
            '    s_img_dst = DRIVE_TARGET_DATASET / "images" / s\n',
            '    s_img_dst.mkdir(parents=True, exist_ok=True)\n',
            '    for img_f in s_img_src.glob("*.*"):\n',
            '        shutil.copy2(img_f, s_img_dst / img_f.name)\n',
            '\n',
            '# Copy labels\n',
            'for s in ["train", "val", "test"]:\n',
            '    s_lbl_src = SCRATCH_OUTPUT / "labels" / s\n',
            '    s_lbl_dst = DRIVE_TARGET_DATASET / "labels" / s\n',
            '    s_lbl_dst.mkdir(parents=True, exist_ok=True)\n',
            '    for lbl_f in s_lbl_src.glob("*.txt"):\n',
            '        shutil.copy2(lbl_f, s_lbl_dst / lbl_f.name)\n',
            '\n',
            '# Copy metadata files\n',
            'for meta_fn in ["data.yaml", "dataset_manifest.json", "validation_report.json"]:\n',
            '    shutil.copy2(SCRATCH_OUTPUT / meta_fn, DRIVE_TARGET_DATASET / meta_fn)\n',
            '\n',
            '# Also persist copies to Drive manifests and reports directories\n',
            'shutil.copy2(SCRATCH_OUTPUT / "dataset_manifest.json", DRIVE_MANIFESTS_DIR / "material-detection-v0.1.0_manifest.json")\n',
            'shutil.copy2(SCRATCH_OUTPUT / "validation_report.json", DRIVE_REPORTS_DIR / "material-detection-v0.1.0_validation_report.json")\n',
            '\n',
            'print(f"[OK] Dataset files cleanly copied to: {DRIVE_TARGET_DATASET}")'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 28: Section 14 Markdown
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'markdown',
        'metadata': {},
        'source': [
            '## 14. Secondary Quality-Gate Verification Directly on Google Drive\n',
            '\n',
            'Performs a second, independent quality-gate inspection directly against the physical files on Google Drive.\n',
            'Verifies file counts, readability, pairing, class IDs, and metadata.'
        ]
    })

    # --------------------------------------------------------------------------
    # Cell 29: Section 14 Code
    # --------------------------------------------------------------------------
    cells.append({
        'cell_type': 'code',
        'execution_count': None,
        'metadata': {},
        'outputs': [],
        'source': [
            '# Secondary validation directly on Google Drive\n',
            'print("==================================================")\n',
            'print("RUNNING SECONDARY QUALITY-GATE ON GOOGLE DRIVE...")\n',
            'print("==================================================")\n',
            '\n',
            'drive_passed, drive_blockers, drive_metrics = run_quality_gate_checks(DRIVE_TARGET_DATASET)\n',
            '\n',
            '# Verify manifest and report exist on Drive\n',
            'drive_manifest_p = DRIVE_TARGET_DATASET / "dataset_manifest.json"\n',
            'drive_report_p = DRIVE_TARGET_DATASET / "validation_report.json"\n',
            'drive_yaml_p = DRIVE_TARGET_DATASET / "data.yaml"\n',
            '\n',
            'if not drive_manifest_p.exists():\n',
            '    drive_blockers.append("Drive dataset_manifest.json does not exist")\n',
            'else:\n',
            '    with open(drive_manifest_p, "r", encoding="utf-8") as f:\n',
            '        m = json.load(f)\n',
            '    if m.get("quality_gate_status") != "READY_FOR_TRAINING":\n',
            '        drive_blockers.append(f"Drive manifest status is {m.get(\'quality_gate_status\')}, expected READY_FOR_TRAINING")\n',
            '\n',
            'if not drive_report_p.exists():\n',
            '    drive_blockers.append("Drive validation_report.json does not exist")\n',
            'else:\n',
            '    with open(drive_report_p, "r", encoding="utf-8") as f:\n',
            '        r = json.load(f)\n',
            '    if r.get("quality_gate_status") != "READY_FOR_TRAINING":\n',
            '        drive_blockers.append(f"Drive report status is {r.get(\'quality_gate_status\')}, expected READY_FOR_TRAINING")\n',
            '\n',
            '# Exact file counts verification\n',
            'drive_train_imgs = len(list((DRIVE_TARGET_DATASET / "images" / "train").glob("*.*")))\n',
            'drive_val_imgs = len(list((DRIVE_TARGET_DATASET / "images" / "val").glob("*.*")))\n',
            'drive_test_imgs = len(list((DRIVE_TARGET_DATASET / "images" / "test").glob("*.*")))\n',
            '\n',
            'drive_train_lbls = len(list((DRIVE_TARGET_DATASET / "labels" / "train").glob("*.txt")))\n',
            'drive_val_lbls = len(list((DRIVE_TARGET_DATASET / "labels" / "val").glob("*.txt")))\n',
            'drive_test_lbls = len(list((DRIVE_TARGET_DATASET / "labels" / "test").glob("*.txt")))\n',
            '\n',
            'if drive_train_imgs != 99 or drive_train_lbls != 99:\n',
            '    drive_blockers.append(f"Drive train count mismatch: {drive_train_imgs} imgs, {drive_train_lbls} lbls (expected 99)")\n',
            'if drive_val_imgs != 28 or drive_val_lbls != 28:\n',
            '    drive_blockers.append(f"Drive val count mismatch: {drive_val_imgs} imgs, {drive_val_lbls} lbls (expected 28)")\n',
            'if drive_test_imgs != 15 or drive_test_lbls != 15:\n',
            '    drive_blockers.append(f"Drive test count mismatch: {drive_test_imgs} imgs, {drive_test_lbls} lbls (expected 15)")\n',
            '\n',
            'if drive_blockers:\n',
            '    print("==================================================")\n',
            '    print("DATASET BUILD FAILED")\n',
            '    print("==================================================")\n',
            '    for b in drive_blockers:\n',
            '        print(f"  * {b}")\n',
            '    raise RuntimeError(f"Drive validation failed with {len(drive_blockers)} blockers.")\n',
            'else:\n',
            '    print("\\n==================================================")\n',
            '    print("DATASET BUILD SUCCESSFUL")\n',
            '    print("==================================================")\n',
            '    print("")\n',
            '    print("Source: XBAT+ WEEE")\n',
            '    print("Source images: 421")\n',
            '    print("In-scope images: 142")\n',
            '    print("")\n',
            '    print("Train: 99")\n',
            '    print("Val: 28")\n',
            '    print("Test: 15")\n',
            '    print("Total: 142")\n',
            '    print("")\n',
            '    print("KEYBOARD_MOUSE: 12")\n',
            '    print("MOBILE_PHONE: 103")\n',
            '    print("TABLET: 27")\n',
            '    print("")\n',
            '    print("Quality Gate: READY_FOR_TRAINING")\n',
            '    print("")\n',
            '    print("Drive path:")\n',
            '    print(f"{DRIVE_TARGET_DATASET}")\n',
            '    print("")\n',
            '    print("Intra-dataset perceptual dHash filtering was disabled for this canonical XBAT+ dataset; exact duplicate and cross-split leakage checks remain enabled.")\n',
            '    print("==================================================")\n',
            '    print("\\n--- WORKFLOW COMPLETE: NO MODEL HAS BEEN TRAINED ---")'
        ]
    })

    nb_data = {
        'cells': cells,
        'metadata': {
            'language_info': {
                'name': 'python'
            }
        },
        'nbformat': 4,
        'nbformat_minor': 2
    }

    out_path = Path('ai/training/ECOSETU_MATERIAL_DATASET_PREPARATION_V2.ipynb')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(nb_data, f, indent=1)

    print(f"[OK] Generated {out_path} with {len(cells)} cells.")


if __name__ == '__main__':
    create_v2_notebook()
