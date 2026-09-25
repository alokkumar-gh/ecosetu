import urllib.request
import json
import io
from PIL import Image

def run_tests():
    # 1. Create a dummy test image
    buf = io.BytesIO()
    Image.new('RGB', (128, 128), color='green').save(buf, format='JPEG')
    img_bytes = buf.getvalue()

    # 2. Test direct FastAPI /predict
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    header_part = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="image"; filename="test.jpg"\r\n'
        f'Content-Type: image/jpeg\r\n\r\n'
    ).encode('utf-8')
    footer_part = f'\r\n--{boundary}--\r\n'.encode('utf-8')
    body = header_part + img_bytes + footer_part

    print("--- 1. Testing FastAPI /predict directly ---")
    req = urllib.request.Request(
        'http://localhost:8000/predict',
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )
    try:
        with urllib.request.urlopen(req) as res:
            print('FastAPI /predict response status:', res.status)
            print('FastAPI /predict response body:', res.read().decode())
    except Exception as e:
        print('FastAPI /predict error:', e)

    # 3. Test Backend Login
    print("\n--- 2. Testing Backend Login ---")
    login_data = json.dumps({'email': 'citizen@demo.com', 'password': 'Password123!'}).encode('utf-8')
    login_req = urllib.request.Request(
        'http://localhost:3001/api/v1/auth/login',
        data=login_data,
        headers={'Content-Type': 'application/json'}
    )
    token = None
    try:
        with urllib.request.urlopen(login_req) as res:
            data = json.loads(res.read().decode())
            token = data['data']['accessToken']
            print('Backend login successful! Token length:', len(token))
    except Exception as e:
        print('Backend login error:', e)

    # 4. Test Backend /api/v1/ai/predict with Auth Token
    print("\n--- 3. Testing Backend /api/v1/ai/predict ---")
    if token:
        backend_req = urllib.request.Request(
            'http://localhost:3001/api/v1/ai/predict',
            data=body,
            headers={
                'Content-Type': f'multipart/form-data; boundary={boundary}',
                'Authorization': f'Bearer {token}'
            }
        )
        try:
            with urllib.request.urlopen(backend_req) as res:
                print('Backend /api/v1/ai/predict response status:', res.status)
                print('Backend /api/v1/ai/predict response body:', res.read().decode())
        except Exception as e:
            if hasattr(e, 'read'):
                print('Backend /api/v1/ai/predict error:', e, e.read().decode())
            else:
                print('Backend /api/v1/ai/predict error:', e)

if __name__ == '__main__':
    run_tests()
