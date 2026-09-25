import urllib.request
import urllib.parse
import json
import time
import io
from PIL import Image

BASE_URL = "https://ecosetu-ai.onrender.com"

print("====================================================")
print("ECOSETU AI — REAL RENDER PUBLIC ENDPOINT VERIFICATION")
print("====================================================\n")

# 1. Health Endpoint Test
t0 = time.time()
print("1. Testing GET /health (including cold start measurement)...")
try:
    req = urllib.request.Request(f"{BASE_URL}/health", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as response:
        status_code = response.getcode()
        body = response.read().decode("utf-8")
        elapsed = (time.time() - t0) * 1000
        print(f"   HTTP Status: {status_code}")
        print(f"   Response Time: {elapsed:.2f} ms")
        print(f"   Response Body: {body}")
        health_json = json.loads(body)
        print(f"   model_loaded: {health_json.get('model_loaded')}")
        print(f"   model_version: {health_json.get('model_version')}")
except Exception as e:
    print(f"   Health check failed: {e}")

# 2. Predict Endpoint Test with real image payload
print("\n2. Testing POST /predict with real image bytes...")
img = Image.new("RGB", (300, 300), color=(128, 128, 128))
img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format="JPEG")
img_bytes = img_byte_arr.getvalue()

boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
body = bytearray()
body.extend(f"--{boundary}\r\n".encode("utf-8"))
body.extend(b'Content-Disposition: form-data; name="image"; filename="test_sample.jpg"\r\n')
body.extend(b"Content-Type: image/jpeg\r\n\r\n")
body.extend(img_bytes)
body.extend(b"\r\n")
body.extend(f"--{boundary}--\r\n".encode("utf-8"))

headers = {
    "Content-Type": f"multipart/form-data; boundary={boundary}",
    "User-Agent": "Mozilla/5.0"
}

t0 = time.time()
try:
    req = urllib.request.Request(f"{BASE_URL}/predict", data=bytes(body), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=180) as response:
        status_code = response.getcode()
        resp_body = response.read().decode("utf-8")
        elapsed = (time.time() - t0) * 1000
        print(f"   HTTP Status: {status_code}")
        print(f"   Roundtrip Time: {elapsed:.2f} ms")
        print(f"   Response Body: {resp_body}")
        pred_json = json.loads(resp_body)
        print(f"   Category: {pred_json.get('category')}")
        print(f"   Confidence: {pred_json.get('confidence')}")
        print(f"   Review Required: {pred_json.get('review_required')}")
        print(f"   Detections Count: {len(pred_json.get('detections', []))}")
except Exception as e:
    print(f"   Predict test failed: {e}")

# 3. Error Case Tests
print("\n3. Testing Error Cases...")

# Error 1: Missing image
try:
    req = urllib.request.Request(f"{BASE_URL}/predict", data=b"", headers={"User-Agent": "Mozilla/5.0"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as response:
        print(f"   Missing image test got unexpected HTTP {response.getcode()}")
except urllib.error.HTTPError as e:
    print(f"   [PASS] Missing image -> HTTP {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"   Missing image test -> Error: {e}")

# Error 2: Invalid image bytes
invalid_body = bytearray()
invalid_body.extend(f"--{boundary}\r\n".encode("utf-8"))
invalid_body.extend(b'Content-Disposition: form-data; name="image"; filename="corrupted.jpg"\r\n')
invalid_body.extend(b"Content-Type: image/jpeg\r\n\r\n")
invalid_body.extend(b"INVALID_IMAGE_BYTES_NOT_A_JPEG")
invalid_body.extend(b"\r\n")
invalid_body.extend(f"--{boundary}--\r\n".encode("utf-8"))

try:
    req = urllib.request.Request(f"{BASE_URL}/predict", data=bytes(invalid_body), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as response:
        print(f"   Invalid bytes test got unexpected HTTP {response.getcode()}")
except urllib.error.HTTPError as e:
    print(f"   [PASS] Invalid image bytes -> HTTP {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"   Invalid bytes test -> Error: {e}")

print("\n====================================================")
print("TEST SUITE COMPLETE")
print("====================================================")
