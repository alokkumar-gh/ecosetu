# EcoSetu — Google Colab Model Training Guide
Canonical Reference: `docs/11_AI_EWASTE_DETECTION.md`, `docs/12_AI_TRAINING_PLAN.md`

This guide details how to execute fine-tuning of the **EcoSetu Material Classifier** using a free GPU (such as Nvidia T4) on Google Colab, and export the resulting `.pt` weights back into the local EcoSetu project.

> [!NOTE]
> Google Colab serves purely as an **offline training compute environment**, not a production inference host or continuous dependency.

---

## Step 1: Open Google Colab & Select GPU Runtime
1. Navigate to [Google Colab](https://colab.research.google.com/).
2. Create a new notebook: `EcoSetu_Material_Classifier_Training.ipynb`.
3. In the top menu, select: **Runtime** -> **Change runtime type** -> **T4 GPU** -> **Save**.

---

## Step 2: Clone or Mount Dataset
Mount your Google Drive where the dataset was uploaded, or clone the repository:

```python
from google.colab import drive
drive.mount('/content/drive')

# Create project workspace directory
!mkdir -p /content/ecosetu_ai
%cd /content/ecosetu_ai
```

Copy your prepared dataset (from `ai/datasets/material-classification/processed/` or a zip file) into `/content/ecosetu_ai/dataset`:

```python
# Unzip uploaded dataset
!unzip -q /content/drive/MyDrive/ecosetu_material_dataset.zip -d /content/ecosetu_ai/dataset
```

---

## Step 3: Install Required Dependencies
Install Ultralytics and dependencies:

```python
!pip install -q "ultralytics>=8.1.0" pydantic pyyaml pillow
```

Verify GPU availability:
```python
import torch
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA Available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"Device Name: {torch.cuda.get_device_name(0)}")
```

---

## Step 4: Run Pre-Flight Dataset Inspection
Before launching training, run the dataset inspection script to verify image headers, class balances, and lack of corrupt files:

```python
# Verify folder structure contains train, val, and test subdirectories
import os
print("Dataset splits:", os.listdir("/content/ecosetu_ai/dataset"))
```

---

## Step 5: Execute YOLO Training

### Option A: Image Classification (`yolov8n-cls`)
```python
from ultralytics import YOLO

# 1. Load pretrained ImageNet nano classifier
model = YOLO("yolov8n-cls.pt")

# 2. Train with EcoSetu baseline hyperparameters
results = model.train(
    data="/content/ecosetu_ai/dataset",
    epochs=100,
    imgsz=224,
    batch=32,
    patience=10,
    lr0=0.001,
    optimizer="AdamW",
    seed=42,
    device=0,  # Use Colab T4 GPU
    project="/content/ecosetu_ai/runs",
    name="material_classifier_v0.1.0",
    # Conservative augmentations
    hsv_h=0.0,
    hsv_s=0.15,
    hsv_v=0.15,
    degrees=10.0,
    translate=0.1,
    scale=0.1,
    fliplr=0.5,
    flipud=0.0,
)
```

### Option B: Object Detection (`yolov8n`)
If object-detection bounding boxes are available:
```python
model = YOLO("yolov8n.pt")
results = model.train(
    data="/content/ecosetu_ai/dataset/dataset.yaml",
    epochs=100,
    imgsz=640,
    batch=16,
    patience=10,
    device=0,
    seed=42,
    project="/content/ecosetu_ai/runs",
    name="material_detector_v0.1.0"
)
```

---

## Step 6: Evaluate Against Held-out Test Split
Evaluate the newly trained weights on the untouched `test` partition:

```python
best_weights = "/content/ecosetu_ai/runs/material_classifier_v0.1.0/weights/best.pt"
trained_model = YOLO(best_weights)

# Evaluate on test split
metrics = trained_model.val(data="/content/ecosetu_ai/dataset", split="test")

print("--- Test Split Evaluation Results ---")
print(f"Top-1 Accuracy: {metrics.top1:.4f}")
print(f"Top-5 Accuracy: {metrics.top5:.4f}")
```

---

## Step 7: Export Model Artifact & Compute Checksum
Compute the SHA-256 hash and package the weights:

```python
import hashlib
import json

hasher = hashlib.sha256()
with open(best_weights, "rb") as f:
    for chunk in iter(lambda: f.read(65536), b""):
        hasher.update(chunk)
weights_sha256 = hasher.hexdigest()

print(f"Exported Model Checksum (SHA-256): {weights_sha256}")

# Copy to Google Drive for local download
!cp {best_weights} /content/drive/MyDrive/material-classifier-v0.1.0.pt
```

---

## Step 8: Deploy Artifact Back to Local EcoSetu
1. Download `material-classifier-v0.1.0.pt` from Google Drive.
2. Place it in: `e:\EcoSetu\ai\models\material-classifier\artifacts\material-classifier-v0.1.0.pt`
3. Create the corresponding metadata file `material-classifier-v0.1.0_metadata.json` documenting the training date, dataset version, and checksum.
4. Run the local AI test suite:
   ```bash
   ai\.venv\Scripts\python.exe -m pytest ai/tests/test_material_classifier_pipeline.py -v
   ```
