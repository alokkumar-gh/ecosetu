"""
Generator for ai/training/ECOSETU_MATERIAL_YOLO_TRAINING.ipynb
Adheres strictly to PROMPT 23 and the refined 16-section interactive Colab workflow.
Includes detailed Markdown documentation, pre-training quality gate verification on disk,
scratch copying, GPU-only enforcement, YOLOv8n fine-tuning, validation, held-out test evaluation,
per-class metrics, sample predictions, model manifest with SHA-256, and summary banner.
"""

import json
from pathlib import Path


def build_complete_training_notebook():
    cells = []

    # -------------------------------------------------------------
    # Section 1: Title & Overview
    # -------------------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "# ECOSETU — YOLOv8 Material Detection Model Training\n",
            "\n",
            "> **SIH Problem Statement 26229 — Kabadiwala Connect**  \n",
            "> **Target Dataset:** `material-detection-v0.1.0` (142 authentic images: 99 train, 28 val, 15 test)  \n",
            "> **Architecture:** Ultralytics YOLOv8n Object Detection (`yolov8n.pt` base checkpoint)  \n",
            "> **Hardware Requirement:** Google Colab GPU (T4 / V100 / A100) — **Refuses CPU execution**  \n",
            "> **Scope:** Pre-training validation, high-speed scratch staging, conservative fine-tuning, validation & held-out test evaluation, per-class metrics, confusion matrices, sample predictions, model manifest with SHA-256, and persistent Google Drive artifact export.\n",
            "\n",
            "---"
        ]
    })

    # -------------------------------------------------------------
    # Section 2: Environment Setup & Dependencies
    # -------------------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 1. Environment Setup & Dependency Installation\n",
            "\n",
            "Installs required libraries (`ultralytics`, `torch`, `torchvision`, `opencv-python`, `pyyaml`, `pandas`, `numpy`, `matplotlib`, `seaborn`, `scikit-learn`, `Pillow`)."
        ]
    })

    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Install pinned dependencies\n",
            "!pip install -q --upgrade pip\n",
            "!pip install -q 'ultralytics>=8.1.0' torch torchvision opencv-python pyyaml pandas numpy matplotlib seaborn scikit-learn pillow\n",
            "\n",
            "import sys\n",
            "import os\n",
            "import shutil\n",
            "import json\n",
            "import hashlib\n",
            "import time\n",
            "from datetime import datetime, timezone\n",
            "from pathlib import Path\n",
            "\n",
            "import yaml\n",
            "import numpy as np\n",
            "import pandas as pd\n",
            "from PIL import Image\n",
            "import torch\n",
            "import ultralytics\n",
            "from ultralytics import YOLO\n",
            "\n",
            "print('================================================================')\n",
            "print('INSTALLED DEPENDENCY VERSIONS')\n",
            "print('================================================================')\n",
            "print(f'Python Version:      {sys.version.split()[0]}')\n",
            "print(f'PyTorch Version:     {torch.__version__}')\n",
            "print(f'Ultralytics Version: {ultralytics.__version__}')\n",
            "print(f'NumPy Version:       {np.__version__}')\n",
            "print(f'Pandas Version:      {pd.__version__}')\n",
            "print(f'Pillow Version:      {Image.__version__}')\n",
            "print('================================================================')\n",
            "ultralytics.checks()"
        ]
    })

    # -------------------------------------------------------------
    # Section 3: Google Drive Mount
    # -------------------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 2. Google Drive Mount & Workspace Directories\n",
            "\n",
            "Mounts persistent Google Drive at `/content/drive/MyDrive/ECOSETU_AI/` and establishes directory paths."
        ]
    })

    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Mount Google Drive\n",
            "try:\n",
            "    from google.colab import drive\n",
            "    drive.mount('/content/drive')\n",
            "    drive_base = Path('/content/drive/MyDrive')\n",
            "except Exception as e:\n",
            "    print('[WARN] google.colab.drive unavailable; fallback to ./mock_drive for simulation.')\n",
            "    drive_base = Path('./mock_drive')\n",
            "\n",
            "# Google Drive Persistent Tree\n",
            "DRIVE_ROOT = drive_base / 'ECOSETU_AI'\n",
            "DATASET_DRIVE_DIR = DRIVE_ROOT / 'datasets' / 'processed' / 'material-detection-v0.1.0'\n",
            "MODELS_DRIVE_DIR = DRIVE_ROOT / 'models' / 'material-detection' / 'material-detection-v0.1.0'\n",
            "MODELS_DRIVE_DIR.mkdir(parents=True, exist_ok=True)\n",
            "\n",
            "# Local VM Scratch Workspace (High-speed NVMe to prevent Google Drive IO throttling)\n",
            "SCRATCH_ROOT = Path('/content/scratch_training')\n",
            "SCRATCH_DATASET = SCRATCH_ROOT / 'material-detection-v0.1.0'\n",
            "SCRATCH_RUNS = SCRATCH_ROOT / 'runs'\n",
            "SCRATCH_ROOT.mkdir(parents=True, exist_ok=True)\n",
            "\n",
            "print(f'[OK] Drive Root:          {DRIVE_ROOT}')\n",
            "print(f'[OK] Dataset Drive Path:  {DATASET_DRIVE_DIR}')\n",
            "print(f'[OK] Model Output Drive:  {MODELS_DRIVE_DIR}')\n",
            "print(f'[OK] Local Scratch Path:  {SCRATCH_ROOT}')"
        ]
    })

    # -------------------------------------------------------------
    # Section 4: GPU Verification
    # -------------------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 3. GPU Verification & Strict CUDA Check\n",
            "\n",
            "Verifies CUDA GPU availability. **Strict policy:** Refuses to silently fall back to CPU."
        ]
    })

    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "print('================================================================')\n",
            "print('GPU ACCELERATOR VERIFICATION')\n",
            "print('================================================================')\n",
            "\n",
            "cuda_available = torch.cuda.is_available()\n",
            "print(f'CUDA Available: {cuda_available}')\n",
            "\n",
            "if not cuda_available:\n",
            "    print('\\n' + '='*64)\n",
            "    print('GPU REQUIRED \u2014 Training has been halted because CUDA GPU is unavailable.')\n",
            "    print('='*64)\n",
            "    print('Please select a GPU runtime: Runtime -> Change runtime type -> T4 GPU.')\n",
            "    raise SystemExit('HALTED: GPU required for training.')\n",
            "\n",
            "gpu_name = torch.cuda.get_device_name(0)\n",
            "cuda_version = torch.version.cuda\n",
            "pytorch_version = torch.__version__\n",
            "device_count = torch.cuda.device_count()\n",
            "vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)\n",
            "\n",
            "print(f'GPU Device:     {gpu_name}')\n",
            "print(f'CUDA Version:   {cuda_version}')\n",
            "print(f'PyTorch:        {pytorch_version}')\n",
            "print(f'Device Count:   {device_count}')\n",
            "print(f'GPU Memory:     {vram_gb:.2f} GB')\n",
            "print('================================================================')\n",
            "print('[OK] GPU verification successful.')"
        ]
    })

    # -------------------------------------------------------------
    # Section 5: Dataset Verification (Pre-Training Quality Gate)
    # -------------------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 4. Pre-Training Dataset Quality-Gate Verification\n",
            "\n",
            "Independently inspects the dataset files on Google Drive:\n",
            "- Directory existence (`images/`, `labels/` for train, val, test)\n",
            "- `data.yaml` validity & class names\n",
            "- `dataset_manifest.json` and `validation_report.json` with `READY_FOR_TRAINING`\n",
            "- Bounding box coordinate bounds ($0 \\le x, y \\le 1$ and $0 < w, h \\le 1$)\n",
            "- Image and label file pairing (zero orphans)\n",
            "\n",
            "**Strict rule:** Halts execution if any check fails."
        ]
    })

    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "print('================================================================')\n",
            "print('PRE-TRAINING DATASET QUALITY-GATE INSPECTION (GOOGLE DRIVE)')\n",
            "print('================================================================')\n",
            "\n",
            "gate_blockers = []\n",
            "\n",
            "# 1. Dataset Directory existence\n",
            "if not DATASET_DRIVE_DIR.exists():\n",
            "    gate_blockers.append(f'Dataset directory does not exist: {DATASET_DRIVE_DIR}')\n",
            "\n",
            "# 2. data.yaml existence and class schema\n",
            "yaml_drive_file = DATASET_DRIVE_DIR / 'data.yaml'\n",
            "expected_classes = {0: 'KEYBOARD_MOUSE', 1: 'MOBILE_PHONE', 2: 'TABLET'}\n",
            "class_names = ['KEYBOARD_MOUSE', 'MOBILE_PHONE', 'TABLET']\n",
            "\n",
            "if not yaml_drive_file.exists():\n",
            "    gate_blockers.append('data.yaml does not exist on Google Drive')\n",
            "else:\n",
            "    try:\n",
            "        with open(yaml_drive_file, 'r', encoding='utf-8') as yf:\n",
            "            d_cfg = yaml.safe_load(yf)\n",
            "        d_names = d_cfg.get('names', {})\n",
            "        if isinstance(d_names, list):\n",
            "            d_names = {i: n for i, n in enumerate(d_names)}\n",
            "        if d_names != expected_classes:\n",
            "            gate_blockers.append(f'data.yaml names {d_names} != expected {expected_classes}')\n",
            "    except Exception as e:\n",
            "        gate_blockers.append(f'Failed to parse data.yaml: {str(e)}')\n",
            "\n",
            "# 3. Check manifest and validation report status\n",
            "manifest_drive = DATASET_DRIVE_DIR / 'dataset_manifest.json'\n",
            "report_drive = DATASET_DRIVE_DIR / 'validation_report.json'\n",
            "\n",
            "if not manifest_drive.exists():\n",
            "    gate_blockers.append('dataset_manifest.json does not exist')\n",
            "else:\n",
            "    try:\n",
            "        with open(manifest_drive, 'r', encoding='utf-8') as mf:\n",
            "            m_data = json.load(mf)\n",
            "        if m_data.get('quality_gate_status') != 'READY_FOR_TRAINING':\n",
            "            gate_blockers.append(f\"Manifest status is '{m_data.get('quality_gate_status')}', expected 'READY_FOR_TRAINING'\")\n",
            "    except Exception as me:\n",
            "        gate_blockers.append(f'dataset_manifest.json parse error: {str(me)}')\n",
            "\n",
            "if not report_drive.exists():\n",
            "    gate_blockers.append('validation_report.json does not exist')\n",
            "else:\n",
            "    try:\n",
            "        with open(report_drive, 'r', encoding='utf-8') as rf:\n",
            "            r_data = json.load(rf)\n",
            "        if r_data.get('quality_gate_status') != 'READY_FOR_TRAINING':\n",
            "            gate_blockers.append(f\"Validation report status is '{r_data.get('quality_gate_status')}', expected 'READY_FOR_TRAINING'\")\n",
            "    except Exception as re:\n",
            "        gate_blockers.append(f'validation_report.json parse error: {str(re)}')\n",
            "\n",
            "# 4. Detailed Filesystem Crawl & YOLO Format Verification\n",
            "split_counts = {'train': 0, 'val': 0, 'test': 0}\n",
            "label_counts = {'train': 0, 'val': 0, 'test': 0}\n",
            "annotation_counts = {'train': 0, 'val': 0, 'test': 0}\n",
            "class_annotation_counts = {c: 0 for c in class_names}\n",
            "\n",
            "for split in ['train', 'val', 'test']:\n",
            "    img_split_dir = DATASET_DRIVE_DIR / 'images' / split\n",
            "    lbl_split_dir = DATASET_DRIVE_DIR / 'labels' / split\n",
            "    \n",
            "    if not img_split_dir.exists():\n",
            "        gate_blockers.append(f'images/{split} directory does not exist')\n",
            "        continue\n",
            "    if not lbl_split_dir.exists():\n",
            "        gate_blockers.append(f'labels/{split} directory does not exist')\n",
            "        continue\n",
            "        \n",
            "    img_files = sorted([p for p in img_split_dir.glob('*.*') if p.suffix.lower() in ['.jpg', '.jpeg', '.png']])\n",
            "    lbl_files = sorted(list(lbl_split_dir.glob('*.txt')))\n",
            "    split_counts[split] = len(img_files)\n",
            "    label_counts[split] = len(lbl_files)\n",
            "    \n",
            "    if len(img_files) == 0:\n",
            "        gate_blockers.append(f'{split} partition contains 0 images')\n",
            "        \n",
            "    img_stems = {p.stem: p for p in img_files}\n",
            "    lbl_stems = {p.stem: p for p in lbl_files}\n",
            "    \n",
            "    # Pairing check\n",
            "    for stem, p in img_stems.items():\n",
            "        if stem not in lbl_stems:\n",
            "            gate_blockers.append(f'Orphan image without label in {split}: {p.name}')\n",
            "    for stem, p in lbl_stems.items():\n",
            "        if stem not in img_stems:\n",
            "            gate_blockers.append(f'Orphan label without image in {split}: {p.name}')\n",
            "            \n",
            "    # Coordinate validation\n",
            "    for lf in lbl_files:\n",
            "        with open(lf, 'r', encoding='utf-8') as f:\n",
            "            lines = [ln.strip() for ln in f if ln.strip()]\n",
            "        if not lines:\n",
            "            gate_blockers.append(f'Empty label file: {lf.name} in {split}')\n",
            "            continue\n",
            "        for ln in lines:\n",
            "            parts = ln.split()\n",
            "            if len(parts) < 5:\n",
            "                gate_blockers.append(f'Malformed YOLO row in {lf.name}: {ln}')\n",
            "                continue\n",
            "            try:\n",
            "                c_idx = int(parts[0])\n",
            "                xc = float(parts[1])\n",
            "                yc = float(parts[2])\n",
            "                w = float(parts[3])\n",
            "                h = float(parts[4])\n",
            "            except ValueError:\n",
            "                gate_blockers.append(f'Non-numeric bounding box in {lf.name}: {ln}')\n",
            "                continue\n",
            "            if c_idx not in expected_classes:\n",
            "                gate_blockers.append(f'Unknown class idx {c_idx} in {lf.name}')\n",
            "                continue\n",
            "            if not (0.0 <= xc <= 1.0 and 0.0 <= yc <= 1.0 and 0.0 < w <= 1.0 and 0.0 < h <= 1.0):\n",
            "                gate_blockers.append(f'Out of bounds coordinates in {lf.name}: {ln}')\n",
            "                continue\n",
            "            annotation_counts[split] += 1\n",
            "            class_annotation_counts[expected_classes[c_idx]] += 1\n",
            "\n",
            "print(f'Train Images:        {split_counts[\"train\"]} (Labels: {label_counts[\"train\"]}, Boxes: {annotation_counts[\"train\"]})')\n",
            "print(f'Val Images:          {split_counts[\"val\"]} (Labels: {label_counts[\"val\"]}, Boxes: {annotation_counts[\"val\"]})')\n",
            "print(f'Test Images:         {split_counts[\"test\"]} (Labels: {label_counts[\"test\"]}, Boxes: {annotation_counts[\"test\"]})')\n",
            "print(f'Total Images:        {sum(split_counts.values())}')\n",
            "print(f'Class Distribution:  {class_annotation_counts}')\n",
            "print('================================================================')\n",
            "\n",
            "if gate_blockers:\n",
            "    print('\\n' + '='*64)\n",
            "    print('ECOSETU PRE-TRAINING QUALITY GATE FAILED \u2014 STOPPING TRAINING')\n",
            "    print('='*64)\n",
            "    for b in gate_blockers[:10]:\n",
            "        print(f'  [BLOCKER] {b}')\n",
            "    if len(gate_blockers) > 10:\n",
            "        print(f'  ... and {len(gate_blockers) - 10} more blockers.')\n",
            "    raise SystemExit('HALTED: Training forbidden on non-verified dataset.')\n",
            "\n",
            "print('\\n[OK] QUALITY GATE VERIFIED: READY_FOR_TRAINING (0 Blockers). All checks passed.')"
        ]
    })

    # -------------------------------------------------------------
    # Section 6: Copy Dataset to Colab Scratch
    # -------------------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 5. Copy Dataset to High-Speed Scratch Storage\n",
            "\n",
            "Copies verified dataset to local Colab NVMe `/content/scratch_training/` to maximize GPU training speed and prevent Google Drive IO bottlenecks."
        ]
    })

    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "if not SCRATCH_DATASET.exists():\n",
            "    print(f'Copying dataset to scratch storage: {SCRATCH_DATASET}...')\n",
            "    shutil.copytree(DATASET_DRIVE_DIR, SCRATCH_DATASET)\n",
            "    print('[OK] Copy complete.')\n",
            "else:\n",
            "    print('[OK] Scratch dataset already exists.')\n",
            "\n",
            "# Verify file counts in scratch\n",
            "scratch_imgs = len(list((SCRATCH_DATASET / 'images').rglob('*.*')))\n",
            "scratch_lbls = len(list((SCRATCH_DATASET / 'labels').rglob('*.txt')))\n",
            "print(f'Scratch Storage Verification: {scratch_imgs} images, {scratch_lbls} label files.')\n",
            "assert scratch_imgs == 142, f'Expected 142 images in scratch, found {scratch_imgs}'"
        ]
    })

    # -------------------------------------------------------------
    # Section 7: YOLO Configuration
    # -------------------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 6. YOLO Data Configuration\n",
            "\n",
            "Creates a localized `data.yaml` in scratch pointing to local splits with exactly 3 classes."
        ]
    })

    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "scratch_yaml_path = SCRATCH_ROOT / 'data.yaml'\n",
            "scratch_yaml_content = {\n",
            "    'path': str(SCRATCH_DATASET.resolve()),\n",
            "    'train': 'images/train',\n",
            "    'val': 'images/val',\n",
            "    'test': 'images/test',\n",
            "    'nc': 3,\n",
            "    'names': {\n",
            "        0: 'KEYBOARD_MOUSE',\n",
            "        1: 'MOBILE_PHONE',\n",
            "        2: 'TABLET'\n",
            "    }\n",
            "}\n",
            "\n",
            "with open(scratch_yaml_path, 'w', encoding='utf-8') as yf:\n",
            "    yaml.dump(scratch_yaml_content, yf, sort_keys=False)\n",
            "\n",
            "print(f'[OK] Scratch data.yaml generated at: {scratch_yaml_path}')\n",
            "with open(scratch_yaml_path, 'r') as f:\n",
            "    print(f.read())"
        ]
    })

    # -------------------------------------------------------------
    # Section 8: Model Loading
    # -------------------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 7. Model Loading: YOLOv8n Pretrained Checkpoint\n",
            "\n",
            "Loads the official Ultralytics `yolov8n.pt` base model checkpoint."
        ]
    })

    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "print('Loading official Ultralytics pretrained checkpoint (yolov8n.pt)...')\n",
            "model = YOLO('yolov8n.pt')\n",
            "print(f'[OK] Model loaded: {model.task} architecture.')"
        ]
    })

    # -------------------------------------------------------------
    # Section 9: Model Training
    # -------------------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 8. Model Training Execution\n",
            "\n",
            "Executes fine-tuning with conservative augmentations to protect e-waste physical characteristics:\n",
            "- `epochs = 100`, `patience = 20`, `seed = 42`\n",
            "- `hsv_h = 0.0` (preserves distinct PCB, wire, and casing colors)\n",
            "- `mosaic = 0.0` (avoids artificial patch stitching)\n",
            "- Batch size auto-detected based on VRAM."
        ]
    })

    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "training_start_time = datetime.now(timezone.utc)\n",
            "t0 = time.time()\n",
            "\n",
            "print('================================================================')\n",
            "print('STARTING ECOSETU YOLOV8N TRAINING EXECUTION')\n",
            "print('================================================================')\n",
            "print('Base Checkpoint:   yolov8n.pt')\n",
            "print('Image Resolution:  640x640')\n",
            "print('Epochs Requested:  100')\n",
            "print('Early Stopping:    Patience = 20')\n",
            "print('Batch Size:        Auto (Colab GPU memory optimized)')\n",
            "print('Deterministic Seed:42')\n",
            "print('Augmentations:     Conservative (hsv_h=0.0, fliplr=0.5, mosaic=0.0)')\n",
            "print('================================================================\\n')\n",
            "\n",
            "train_results = model.train(\n",
            "    data=str(scratch_yaml_path),\n",
            "    imgsz=640,\n",
            "    epochs=100,\n",
            "    patience=20,\n",
            "    batch=-1,               # Auto-batch to maximize GPU memory throughput\n",
            "    optimizer='auto',\n",
            "    seed=42,\n",
            "    device=0,\n",
            "    workers=2,\n",
            "    project=str(SCRATCH_RUNS),\n",
            "    name='material-detection-v0.1.0',\n",
            "    exist_ok=True,\n",
            "    hsv_h=0.0,             # Zero hue shift (protects wire/PCB identity)\n",
            "    hsv_s=0.15,\n",
            "    hsv_v=0.15,\n",
            "    degrees=10.0,\n",
            "    translate=0.1,\n",
            "    scale=0.1,\n",
            "    fliplr=0.5,\n",
            "    flipud=0.0,\n",
            "    mosaic=0.0,            # Disabled mosaic for authentic baseline\n",
            "    mixup=0.0,\n",
            "    copy_paste=0.0,\n",
            "    verbose=True\n",
            ")\n",
            "\n",
            "training_duration_seconds = round(time.time() - t0, 2)\n",
            "print(f'\\n[OK] Training completed in {training_duration_seconds} seconds ({training_duration_seconds/60:.2f} minutes).')"
        ]
    })

    # -------------------------------------------------------------
    # Section 10: Validation Evaluation
    # -------------------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 9. Validation Set Evaluation\n",
            "\n",
            "Evaluates `best.pt` on the 28-image validation partition."
        ]
    })

    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "run_dir = SCRATCH_RUNS / 'material-detection-v0.1.0'\n",
            "best_pt_scratch = run_dir / 'weights' / 'best.pt'\n",
            "\n",
            "if not best_pt_scratch.exists():\n",
            "    raise FileNotFoundError(f'best.pt missing at {best_pt_scratch}')\n",
            "\n",
            "print(f'Loading best weights from: {best_pt_scratch}')\n",
            "eval_model = YOLO(str(best_pt_scratch))\n",
            "\n",
            "print('\\nEvaluating on VALIDATION split (28 images)...')\n",
            "val_res = eval_model.val(data=str(scratch_yaml_path), split='val', imgsz=640, device=0)\n",
            "\n",
            "val_metrics = {\n",
            "    'precision': round(float(val_res.box.mp), 4) if hasattr(val_res.box, 'mp') else None,\n",
            "    'recall': round(float(val_res.box.mr), 4) if hasattr(val_res.box, 'mr') else None,\n",
            "    'mAP50': round(float(val_res.box.map50), 4) if hasattr(val_res.box, 'map50') else None,\n",
            "    'mAP50_95': round(float(val_res.box.map), 4) if hasattr(val_res.box, 'map') else None,\n",
            "    'speed_ms': {k: round(float(v), 2) for k, v in val_res.speed.items()} if hasattr(val_res, 'speed') else {}\n",
            "}\n",
            "\n",
            "print('================================================================')\n",
            "print('VALIDATION METRICS')\n",
            "print('================================================================')\n",
            "print(f'Precision: {val_metrics[\"precision\"]}')\n",
            "print(f'Recall:    {val_metrics[\"recall\"]}')\n",
            "print(f'mAP50:     {val_metrics[\"mAP50\"]}')\n",
            "print(f'mAP50-95:  {val_metrics[\"mAP50_95\"]}')\n",
            "print(f'Speed:     {val_metrics[\"speed_ms\"]} ms')\n",
            "print('================================================================')"
        ]
    })

    # -------------------------------------------------------------
    # Section 11: Held-Out Test Evaluation
    # -------------------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 10. Held-Out Test Set Evaluation\n",
            "\n",
            "Evaluates `best.pt` on the strictly isolated 15-image held-out test partition (zero data leakage)."
        ]
    })

    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "print('Evaluating on HELD-OUT TEST split (15 images)...')\n",
            "test_res = eval_model.val(data=str(scratch_yaml_path), split='test', imgsz=640, device=0)\n",
            "\n",
            "test_metrics = {\n",
            "    'precision': round(float(test_res.box.mp), 4) if hasattr(test_res.box, 'mp') else None,\n",
            "    'recall': round(float(test_res.box.mr), 4) if hasattr(test_res.box, 'mr') else None,\n",
            "    'mAP50': round(float(test_res.box.map50), 4) if hasattr(test_res.box, 'map50') else None,\n",
            "    'mAP50_95': round(float(test_res.box.map), 4) if hasattr(test_res.box, 'map') else None,\n",
            "    'speed_ms': {k: round(float(v), 2) for k, v in test_res.speed.items()} if hasattr(test_res, 'speed') else {}\n",
            "}\n",
            "\n",
            "print('================================================================')\n",
            "print('HELD-OUT TEST METRICS')\n",
            "print('================================================================')\n",
            "print(f'Precision: {test_metrics[\"precision\"]}')\n",
            "print(f'Recall:    {test_metrics[\"recall\"]}')\n",
            "print(f'mAP50:     {test_metrics[\"mAP50\"]}')\n",
            "print(f'mAP50-95:  {test_metrics[\"mAP50_95\"]}')\n",
            "print(f'Speed:     {test_metrics[\"speed_ms\"]} ms')\n",
            "print('================================================================')"
        ]
    })

    # -------------------------------------------------------------
    # Section 12: Per-Class Metrics
    # -------------------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 11. Per-Class Test Performance Extraction\n",
            "\n",
            "Extracts actual class-level precision, recall, AP50, and AP50-95 for `KEYBOARD_MOUSE`, `MOBILE_PHONE`, and `TABLET`."
        ]
    })

    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "per_class_test = {}\n",
            "tb = test_res.box\n",
            "\n",
            "for idx, name in enumerate(class_names):\n",
            "    try:\n",
            "        p = float(tb.p[idx]) if hasattr(tb, 'p') and len(tb.p) > idx else None\n",
            "        r = float(tb.r[idx]) if hasattr(tb, 'r') and len(tb.r) > idx else None\n",
            "        ap50 = float(tb.ap50[idx]) if hasattr(tb, 'ap50') and len(tb.ap50) > idx else None\n",
            "        ap = float(tb.ap[idx]) if hasattr(tb, 'ap') and len(tb.ap) > idx else None\n",
            "        per_class_test[name] = {\n",
            "            'precision': round(p, 4) if p is not None else None,\n",
            "            'recall': round(r, 4) if r is not None else None,\n",
            "            'ap50': round(ap50, 4) if ap50 is not None else None,\n",
            "            'ap50_95': round(ap, 4) if ap is not None else None,\n",
            "        }\n",
            "    except Exception as e:\n",
            "        per_class_test[name] = {'error': str(e)}\n",
            "\n",
            "print('================================================================')\n",
            "print('PER-CLASS HELD-OUT TEST METRICS')\n",
            "print('================================================================')\n",
            "for cname, m in per_class_test.items():\n",
            "    print(f'{cname:15}: Precision={m.get(\"precision\")} | Recall={m.get(\"recall\")} | AP50={m.get(\"ap50\")} | AP50-95={m.get(\"ap50_95\")}')\n",
            "print('================================================================')"
        ]
    })

    # -------------------------------------------------------------
    # Section 13: Sample Predictions
    # -------------------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 12. Sample Predictions on Held-Out Test Split\n",
            "\n",
            "Renders annotated detection images on held-out test images with predicted class, confidence, and bounding box."
        ]
    })

    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "sample_pred_dir = MODELS_DRIVE_DIR / 'sample_predictions'\n",
            "sample_pred_dir.mkdir(parents=True, exist_ok=True)\n",
            "\n",
            "test_images = sorted(list((SCRATCH_DATASET / 'images' / 'test').glob('*.*')))\n",
            "print(f'Generating sample predictions for {min(len(test_images), 6)} test images...')\n",
            "\n",
            "sample_records = []\n",
            "for img_p in test_images[:6]:\n",
            "    preds = eval_model.predict(source=str(img_p), conf=0.25, imgsz=640, device=0)\n",
            "    for res in preds:\n",
            "        save_file = sample_pred_dir / f'pred_{img_p.name}'\n",
            "        annotated_bgr = res.plot()\n",
            "        im = Image.fromarray(annotated_bgr[..., ::-1])\n",
            "        im.save(save_file)\n",
            "        \n",
            "        boxes_info = []\n",
            "        for b in res.boxes:\n",
            "            cid = int(b.cls[0].item())\n",
            "            conf = float(b.conf[0].item())\n",
            "            xywhn = b.xywhn[0].tolist()\n",
            "            boxes_info.append({\n",
            "                'class_id': cid,\n",
            "                'class_name': class_names[cid] if cid < len(class_names) else 'UNKNOWN',\n",
            "                'confidence': round(conf, 4),\n",
            "                'bbox_xywhn': [round(v, 4) for v in xywhn]\n",
            "            })\n",
            "        sample_records.append({\n",
            "            'image': img_p.name,\n",
            "            'detections': boxes_info,\n",
            "            'output_visual': save_file.name\n",
            "        })\n",
            "\n",
            "print(f'[OK] Generated {len(sample_records)} sample predictions saved to: {sample_pred_dir}')"
        ]
    })

    # -------------------------------------------------------------
    # Section 14: Artifact Export to Google Drive
    # -------------------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 13. Artifact Export to Persistent Google Drive\n",
            "\n",
            "Transfers model weights, curves, logs, and plots to `/content/drive/MyDrive/ECOSETU_AI/models/material-detection/material-detection-v0.1.0/`."
        ]
    })

    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "artifacts_to_copy = [\n",
            "    ('weights/best.pt', 'best.pt'),\n",
            "    ('weights/last.pt', 'last.pt'),\n",
            "    ('args.yaml', 'args.yaml'),\n",
            "    ('results.csv', 'results.csv'),\n",
            "    ('results.png', 'results.png'),\n",
            "    ('confusion_matrix.png', 'confusion_matrix.png'),\n",
            "    ('confusion_matrix_normalized.png', 'confusion_matrix_normalized.png'),\n",
            "    ('PR_curve.png', 'PR_curve.png'),\n",
            "    ('F1_curve.png', 'F1_curve.png'),\n",
            "]\n",
            "\n",
            "print(f'Exporting artifacts to Google Drive: {MODELS_DRIVE_DIR}...')\n",
            "for src_rel, dst_name in artifacts_to_copy:\n",
            "    src_p = run_dir / src_rel\n",
            "    dst_p = MODELS_DRIVE_DIR / dst_name\n",
            "    if src_p.exists():\n",
            "        shutil.copy2(src_p, dst_p)\n",
            "        print(f'  ✔ Copied {dst_name}')\n",
            "    else:\n",
            "        print(f'  - Optional plot {dst_name} not generated')\n",
            "\n",
            "# Calculate SHA-256 of persisted best.pt\n",
            "best_pt_drive = MODELS_DRIVE_DIR / 'best.pt'\n",
            "hasher = hashlib.sha256()\n",
            "with open(best_pt_drive, 'rb') as bf:\n",
            "    for chunk in iter(lambda: bf.read(65536), b''):\n",
            "        hasher.update(chunk)\n",
            "best_sha256 = hasher.hexdigest()\n",
            "print(f'\\n[OK] best.pt SHA-256: {best_sha256}')"
        ]
    })

    # -------------------------------------------------------------
    # Section 15: Model Manifest & Metadata Reports
    # -------------------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 14. Model Manifest, Evaluation Report & Training Summary Generation\n",
            "\n",
            "Generates cryptographically verified metadata documents including `model_manifest.json`, `evaluation_report.json`, `training_summary.json`, and `README.md`."
        ]
    })

    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Parse actual epoch statistics from results.csv\n",
            "results_csv_p = MODELS_DRIVE_DIR / 'results.csv'\n",
            "actual_epochs = 100\n",
            "best_epoch = None\n",
            "if results_csv_p.exists():\n",
            "    try:\n",
            "        df_res = pd.read_csv(results_csv_p)\n",
            "        actual_epochs = len(df_res)\n",
            "        # Determine epoch with best mAP50 if column exists\n",
            "        col_map = [c for c in df_res.columns if 'map50' in c.lower() and '95' not in c.lower()]\n",
            "        if col_map:\n",
            "            best_epoch = int(df_res[col_map[0]].idxmax()) + 1\n",
            "    except Exception:\n",
            "        pass\n",
            "\n",
            "# 1. Model Manifest (Strict JSON contract satisfying Prompt 23 specifications)\n",
            "model_manifest = {\n",
            "    'model_version': 'material-detection-v0.1.0',\n",
            "    'task': 'object_detection',\n",
            "    'architecture': 'YOLOv8n',\n",
            "    'base_checkpoint': 'yolov8n.pt',\n",
            "    'dataset_version': 'material-detection-v0.1.0',\n",
            "    'dataset_path': str(DATASET_DRIVE_DIR),\n",
            "    'classes': class_names,\n",
            "    'supported_classes': class_names,\n",
            "    'class_count': len(class_names),\n",
            "    'training_date': training_start_time.isoformat(),\n",
            "    'training_duration_seconds': training_duration_seconds,\n",
            "    'epochs_requested': 100,\n",
            "    'epochs_completed': actual_epochs,\n",
            "    'actual_epochs': actual_epochs,\n",
            "    'best_epoch': best_epoch,\n",
            "    'image_size': 640,\n",
            "    'batch': 'auto',\n",
            "    'batch_size': 'auto',\n",
            "    'optimizer': 'auto',\n",
            "    'learning_rate': 0.01,\n",
            "    'seed': 42,\n",
            "    'hardware': {\n",
            "        'gpu_name': gpu_name,\n",
            "        'cuda_version': cuda_version,\n",
            "        'pytorch_version': pytorch_version,\n",
            "        'device_count': device_count,\n",
            "        'vram_gb': round(vram_gb, 2)\n",
            "    },\n",
            "    'gpu_name': gpu_name,\n",
            "    'cuda_version': cuda_version,\n",
            "    'pytorch_version': pytorch_version,\n",
            "    'ultralytics_version': ultralytics.__version__,\n",
            "    'training_framework': 'Ultralytics YOLOv8',\n",
            "    'model_file': 'best.pt',\n",
            "    'model_sha256': best_sha256,\n",
            "    'best_pt_sha256': best_sha256,\n",
            "    'training_status': 'COMPLETED',\n",
            "    'evaluation_status': 'EVALUATED',\n",
            "    'status': 'COMPLETED'\n",
            "}\n",
            "\n",
            "with open(MODELS_DRIVE_DIR / 'model_manifest.json', 'w', encoding='utf-8') as mf:\n",
            "    json.dump(model_manifest, mf, indent=2)\n",
            "\n",
            "# 2. Evaluation Report\n",
            "small_dataset_warning = (\n",
            "    'WARNING: This initial baseline was trained on 142 total images with a held-out test split '\n",
            "    'of 15 images. High statistical variance is inherent to this sample size. This model serves '\n",
            "    'as a reproducible baseline benchmark and MUST NOT be represented as production-ready or generalized '\n",
            "    'to unverified scrap-yard conditions without further multi-source data collection.'\n",
            ")\n",
            "\n",
            "evaluation_report = {\n",
            "    'model_version': 'material-detection-v0.1.0',\n",
            "    'evaluated_at': datetime.now(timezone.utc).isoformat(),\n",
            "    'dataset': 'material-detection-v0.1.0',\n",
            "    'dataset_split_sizes': split_counts,\n",
            "    'evaluation_status': 'EVALUATED',\n",
            "    'validation_metrics': val_metrics,\n",
            "    'held_out_test_metrics': test_metrics,\n",
            "    'per_class_test_metrics': per_class_test,\n",
            "    'sample_predictions': sample_records,\n",
            "    'small_dataset_notice': small_dataset_warning\n",
            "}\n",
            "\n",
            "with open(MODELS_DRIVE_DIR / 'evaluation_report.json', 'w', encoding='utf-8') as ef:\n",
            "    json.dump(evaluation_report, ef, indent=2)\n",
            "\n",
            "# 3. Training Summary\n",
            "training_summary = {\n",
            "    'dataset_statistics': split_counts,\n",
            "    'training_configuration': {\n",
            "        'model': 'yolov8n.pt',\n",
            "        'imgsz': 640,\n",
            "        'epochs_requested': 100,\n",
            "        'patience': 20,\n",
            "        'seed': 42,\n",
            "        'augmentations': 'conservative (hsv_h=0.0, fliplr=0.5, mosaic=0.0)'\n",
            "    },\n",
            "    'training_duration_seconds': training_duration_seconds,\n",
            "    'actual_epoch_count': actual_epochs,\n",
            "    'validation_metrics': val_metrics,\n",
            "    'test_metrics': test_metrics,\n",
            "    'per_class_metrics': per_class_test,\n",
            "    'gpu_information': {\n",
            "        'gpu_name': gpu_name,\n",
            "        'cuda_version': cuda_version,\n",
            "        'vram_gb': round(vram_gb, 2)\n",
            "    },\n",
            "    'artifact_paths': {\n",
            "        'drive_dir': str(MODELS_DRIVE_DIR),\n",
            "        'best_pt': str(MODELS_DRIVE_DIR / 'best.pt'),\n",
            "        'last_pt': str(MODELS_DRIVE_DIR / 'last.pt')\n",
            "    },\n",
            "    'best_pt_sha256': best_sha256,\n",
            "    'limitations': [\n",
            "        '142 images baseline dataset',\n",
            "        'Supports only 3 classes (KEYBOARD_MOUSE, MOBILE_PHONE, TABLET)',\n",
            "        'Does not support PCB, CABLE, BATTERY, MOTOR, MAGNET_ASSEMBLY',\n",
            "        'Research baseline - not validated for informal Indian scrap-yard production deployment'\n",
            "    ]\n",
            "}\n",
            "\n",
            "with open(MODELS_DRIVE_DIR / 'training_summary.json', 'w', encoding='utf-8') as tf:\n",
            "    json.dump(training_summary, tf, indent=2)\n",
            "\n",
            "# 4. README.md Documentation\n",
            "readme_doc = f\"\"\"# ECOSETU YOLOv8n Material-Detection Model v0.1.0\n",
            "\n",
            "- **Architecture:** YOLOv8n (Object Detection)\n",
            "- **Base Checkpoint:** `yolov8n.pt` (Official Ultralytics pretrained weights)\n",
            "- **Dataset:** `material-detection-v0.1.0` (142 images: 99 train, 28 val, 15 test)\n",
            "- **Classes:** KEYBOARD_MOUSE, MOBILE_PHONE, TABLET\n",
            "- **Training Date:** {training_start_time.isoformat()}\n",
            "- **Actual Epochs:** {actual_epochs}\n",
            "- **Test mAP50:** {test_metrics['mAP50']}\n",
            "- **Test mAP50-95:** {test_metrics['mAP50_95']}\n",
            "- **SHA-256 (best.pt):** `{best_sha256}`\n",
            "\n",
            "## Small Dataset Warning & Deployment Status\n",
            "This model is a baseline research model and has not been validated for production deployment in Indian informal scrap-yard conditions.\n",
            "It strictly supports 3 categories and does not classify PCBs, cables, batteries, motors, or magnets.\n",
            "\"\"\"\n",
            "\n",
            "with open(MODELS_DRIVE_DIR / 'README.md', 'w', encoding='utf-8') as rf:\n",
            "    rf.write(readme_doc)\n",
            "\n",
            "print('[OK] model_manifest.json, evaluation_report.json, training_summary.json, and README.md generated.')"
        ]
    })

    # -------------------------------------------------------------
    # Section 16: Final Training Summary Output Cell
    # -------------------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 15. Final Training Summary Banner\n",
            "\n",
            "Prints the structured completion report conforming to ECOSETU Prompt 23 standards."
        ]
    })

    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "print('========================================')\n",
            "print('ECOSETU YOLO TRAINING COMPLETE')\n",
            "print('========================================\\n')\n",
            "print(f'GPU:                         {gpu_name} (CUDA {cuda_version}, PyTorch {pytorch_version})')\n",
            "print(f'Dataset:                     material-detection-v0.1.0 ({sum(split_counts.values())} images: 99 train, 28 val, 15 test)')\n",
            "print(f'Classes:                     {class_names}')\n",
            "print(f'Actual epochs:               {actual_epochs} (Best epoch: {best_epoch})')\n",
            "print('\\nValidation:')\n",
            "print(f'  Precision:                 {val_metrics[\"precision\"]}')\n",
            "print(f'  Recall:                    {val_metrics[\"recall\"]}')\n",
            "print(f'  mAP50:                     {val_metrics[\"mAP50\"]}')\n",
            "print(f'  mAP50-95:                  {val_metrics[\"mAP50_95\"]}')\n",
            "print('\\nHeld-out Test:')\n",
            "print(f'  Precision:                 {test_metrics[\"precision\"]}')\n",
            "print(f'  Recall:                    {test_metrics[\"recall\"]}')\n",
            "print(f'  mAP50:                     {test_metrics[\"mAP50\"]}')\n",
            "print(f'  mAP50-95:                  {test_metrics[\"mAP50_95\"]}')\n",
            "print(f'\\nBest model:                  {MODELS_DRIVE_DIR / \"best.pt\"}')\n",
            "print(f'SHA-256:                     {best_sha256}')\n",
            "print(f'Google Drive artifact dir:   {MODELS_DRIVE_DIR}')\n",
            "print('Production status:           BASELINE / NOT PRODUCTION READY')\n",
            "print('\\n========================================')"
        ]
    })

    # Assemble complete notebook dictionary
    notebook_dict = {
        "cells": cells,
        "metadata": {
            "accelerator": "GPU",
            "colab": {
                "provenance": [],
                "gpuType": "T4"
            },
            "kernelspec": {
                "display_name": "Python 3",
                "name": "python3"
            },
            "language_info": {
                "name": "python"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 0
    }

    # Write notebook file directly
    nb_file_path = Path("ai/training/ECOSETU_MATERIAL_YOLO_TRAINING.ipynb")
    nb_file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(nb_file_path, "w", encoding="utf-8") as f:
        json.dump(notebook_dict, f, indent=2)

    return nb_file_path


if __name__ == "__main__":
    out_p = build_complete_training_notebook()
    print(f"Generated notebook at: {out_p.resolve()}")
