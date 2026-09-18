# EcoSetu — Deployment Guide

> **Reference:** All terminology follows `00_PROJECT_INDEX.md`.

---

## 1. Deployment Environments

| Environment | Purpose | Infrastructure |
|------------|---------|---------------|
| **Development** | Local development and testing | Local machine (Node.js, Android Emulator, local PostgreSQL, local FastAPI) |
| **Demo/Presentation** | SIH demonstration to judges | Physical Android phone (Release APK) + Google Cloud Run backend + Firebase services |

> There is no separate staging environment for an SIH prototype. The demo environment serves as both staging and presentation target.

---

## 2. Development Environment Setup

### 2.1 Prerequisites

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20 LTS | Backend API runtime & Metro JS bundler |
| npm | 10+ | Package management |
| JDK | 17 | Java Development Kit for Android compilation |
| Android Studio / SDK | API Level 26–34 | Android SDK, Platform-Tools, and Emulator |
| Python | 3.10+ | AI inference service runtime |
| pip | Latest | Python package management |
| PostgreSQL | 15+ | Local database |
| Git | Latest | Version control |

### 2.2 Local Database Setup

1. Install PostgreSQL locally
2. Create development database: `ecosetu_dev`
3. Create test database: `ecosetu_test`
4. Note connection string for backend `.env`

### 2.3 Environment Variables (Development)

**Backend `.env` (`backend/.env`):**

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/ecosetu_dev
JWT_ACCESS_SECRET=dev-access-secret-change-in-production-64chars-minimum-abcdef
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production-64chars-minimum-abcdef
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CORS_ORIGIN=*
AI_SERVICE_URL=http://localhost:8000
UPLOAD_DIR=./uploads
LOG_LEVEL=debug
```

**Mobile Config (`mobile/.env` or `src/utils/config.js`):**

```env
# For Android Emulator: 10.0.2.2 maps to host machine localhost
API_BASE_URL=http://10.0.2.2:3001/api/v1

# For Physical Android Device over Wi-Fi, use your machine's LAN IP:
# API_BASE_URL=http://192.168.1.100:3001/api/v1

DEFAULT_MAP_LAT=28.6139
DEFAULT_MAP_LNG=77.2090
```

**AI Service `.env` (`ai/.env`):**

```env
MODEL_PATH=./models/ewaste_classifier_v1.0.pt
MODEL_VERSION=v1.0
HOST=0.0.0.0
PORT=8000
```

### 2.4 Starting Development Services

```bash
# Terminal 1: Backend API
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev

# Terminal 2: AI Microservice
cd ai
pip install -r requirements.txt
python src/main.py

# Terminal 3: Android Mobile Client
cd mobile
npm install
npx react-native run-android
```

---

## 3. Production Architecture (Firebase + Google Cloud)

```mermaid
graph TB
    subgraph "Android Client"
        PHONE["Physical Android Phone<br/>(Package: com.ecosetu)"]
    end

    subgraph "Firebase Services"
        FCM["Firebase Cloud Messaging<br/>(Push delivery layer)"]
        FSTOR["Firebase Storage<br/>(Private media & rules)"]
        CRASH["Firebase Crashlytics<br/>(PII-free crash reporting)"]
    end

    subgraph "Google Cloud Run"
        BE["Backend API<br/>Node.js + Express (Docker)"]
        AI["AI Inference Service<br/>Python + FastAPI (Docker)"]
    end

    subgraph "Relational Storage (Authoritative)"
        DB[("PostgreSQL Database<br/>(Cloud SQL / Managed PostgreSQL with SSL)")]
    end

    PHONE -->|"HTTPS REST API"| BE
    PHONE -->|"Secure Uploads (Rules)"| FSTOR
    PHONE -.->|"Crash Logs"| CRASH
    BE -->|"Prisma ORM"| DB
    BE -->|"Inference Request"| AI
    BE -->|"Non-blocking Push"| FCM
    FCM -->|"Android Push Alert"| PHONE
```

### 3.1 Non-Negotiable Architectural Principles

1. **PostgreSQL is Authoritative:** All core business entities (Users, Requests, Pickups, Consignments, Recycling Records, Notifications, Audit Logs) reside exclusively in PostgreSQL. Firestore does NOT replace PostgreSQL.
2. **Backend API is Authoritative:** Node.js + Express coordinates business rules, validates permissions, and generates database records. Express is NOT replaced by Cloud Functions.
3. **AI Inference Isolation:** FastAPI runs independently on Cloud Run. Missing model weights continue to return HTTP 503 without degrading core backend transactions.
4. **Resilient Notification Delivery:** Notification records are committed to PostgreSQL first. FCM acts strictly as an asynchronous, non-blocking delivery adapter. Delivery failures never roll back or corrupt business transactions.

---

## 4. Android Application Build & Distribution

### 4.1 Debugging on Physical Device

1. Enable **Developer Options** and **USB Debugging** on the Android smartphone.
2. Connect phone to development laptop via USB.
3. Verify device connection:
   ```bash
   adb devices
   ```
4. Reverse server port for local testing:
   ```bash
   adb reverse tcp:3001 tcp:3001
   adb reverse tcp:8081 tcp:8081
   ```
5. Launch app on connected device:
   ```bash
   cd mobile
   npx react-native run-android
   ```

### 4.2 Standalone Release APK Distribution

For the SIH presentation, a standalone release `.apk` is built only after production cloud services are deployed and verified:

1. Copy `mobile/android/app/google-services.json.example` to `mobile/android/app/google-services.json` and insert genuine Firebase Android client credentials.
2. Configure `mobile/.env.production` with genuine Google Cloud Run URL (`PRODUCTION_API_BASE_URL=https://ecosetu-backend-xxx.a.run.app/api/v1`).
3. Compile release APK:
   ```bash
   cd mobile/android
   ./gradlew assembleRelease
   ```
4. Sideload onto test phones via ADB:
   ```bash
   adb install -r app/build/outputs/apk/release/app-release.apk
   ```

---

## 5. Google Cloud Run — Backend API Deployment

### 5.1 Container Specification (`backend/Dockerfile`)
- **Base Image:** `node:20-slim` with OpenSSL and CA certificates.
- **Port:** Dynamically binds to `$PORT` injected by Google Cloud Run (defaults to 8080 or 3001).
- **Security:** Runs under unprivileged user `USER node`.
- **Health Check:** Validates `GET /health` and `GET /api/v1/health`.

### 5.2 Deployment Steps (via Google Cloud CLI)

1. Build and submit container image to Google Artifact Registry:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ecosetu-backend backend/
   ```
2. Deploy to Cloud Run with environment variables / secrets:
   ```bash
   gcloud run deploy ecosetu-backend \
     --image gcr.io/YOUR_PROJECT_ID/ecosetu-backend \
     --platform managed \
     --region asia-south1 \
     --allow-unauthenticated \
     --set-env-vars NODE_ENV=production,LOG_LEVEL=info \
     --set-secrets DATABASE_URL=ecosetu-db-url:latest,JWT_ACCESS_SECRET=ecosetu-jwt-access:latest,JWT_REFRESH_SECRET=ecosetu-jwt-refresh:latest,AI_SERVICE_URL=ecosetu-ai-url:latest
   ```

### 5.3 Production Environment Variables & Secrets

| Variable | Source | Description |
|----------|--------|-------------|
| `NODE_ENV` | Environment | Set to `production` (enforces strict validation) |
| `PORT` | Cloud Run | Automatically injected (e.g. `8080`) |
| `DATABASE_URL` | Secret Manager | PostgreSQL URL with `?sslmode=require` |
| `JWT_ACCESS_SECRET` | Secret Manager | 64-character random hex secret (`openssl rand -hex 32`) |
| `JWT_REFRESH_SECRET` | Secret Manager | 64-character random hex secret (`openssl rand -hex 32`) |
| `CORS_ORIGIN` | Environment | Comma-separated allowed web domains (e.g. `https://ecosetu.org`) |
| `AI_SERVICE_URL` | Environment | Internal or HTTPS URL of deployed FastAPI Cloud Run service |
| `FIREBASE_PROJECT_ID` | Environment | Firebase project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Secret Manager | Mounted service account JSON for Firebase Admin SDK |

### 5.4 Database Migration & Seeding (Production)

Run migrations against the production database before opening traffic:

```bash
# From local machine with production DATABASE_URL set:
cd backend
npx prisma migrate deploy
npx prisma db seed
```

---

## 6. PostgreSQL Database Infrastructure

### 6.1 Database Options Evaluation
- **Google Cloud SQL for PostgreSQL:**
  - Dedicated PostgreSQL instance managed by GCP.
  - High availability, automated backups, and private VPC peering.
  - *Cost Constraint:* Cloud SQL does not have a permanent free tier (~$10–$35/month minimum for `db-f1-micro`). Must NOT be provisioned without explicit approval.
- **Managed/Serverless PostgreSQL (Free-Tier Option):**
  - Configurable directly through `DATABASE_URL`.
  - Supports serverless PostgreSQL providers offering 0.5GB–1GB free tier with SSL enforced.
  - Zero application code changes required; Prisma connects via standard connection pooling.

### 6.2 SSL Connection Requirement
All production PostgreSQL connections must enforce SSL encryption:
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

---

## 7. Google Cloud Run — AI Microservice Deployment

### 7.1 Container Specification (`ai/Dockerfile`)
- **Base Image:** `python:3.11-slim`.
- **Port:** Binds dynamically to `${PORT:-8000}`.
- **Security:** Runs under unprivileged user `USER appuser`.
- **Health Check:** Validates `GET /health` with Python HTTP check.

### 7.2 Deployment Steps

1. Submit image to Artifact Registry:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ecosetu-ai ai/
   ```
2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy ecosetu-ai \
     --image gcr.io/YOUR_PROJECT_ID/ecosetu-ai \
     --platform managed \
     --region asia-south1 \
     --no-allow-unauthenticated \
     --set-env-vars MODEL_DIR=/app/models,MODEL_VERSION=v1.0
   ```
3. Grant the backend Cloud Run service account permission to invoke the AI service (`roles/run.invoker`).

### 7.3 Model Weight Integrity
- Expected model file: `ai/models/ewaste_classifier_v1.0.pt`.
- If model weights are missing or uninitialized, `/health` reports `model_loaded: false` and `/predict` returns HTTP 503 `Model weights not found`. Core recycling workflows remain unaffected.

---

## 8. Firebase Infrastructure Setup

### 8.1 Firebase Project Configuration
- **Android Package Name:** `com.ecosetu` (non-negotiable).
- Client configuration file: `mobile/android/app/google-services.json` (created from template `google-services.json.example`).
- Project configuration file: `firebase.json` at repository root.

### 8.2 Firebase Storage & Security Rules (`storage.rules`)
All media uploads are governed by strict, declarative security rules:
- **Default Deny:** All unmapped paths return access denied.
- **Mandatory Authentication:** Anonymous uploads are completely blocked (`request.auth != null`).
- **Namespace Isolation:**
  - Citizen e-waste photos: `/ewaste/{userId}/{itemId}/{fileName}` (only owning user can write).
  - Collector pickup photos: `/pickups/{collectorId}/{pickupId}/{fileName}` (only assigned collector can write).
  - Verification documents: `/verifications/{userId}/{docId}/{fileName}` (private to user and admin).
- **File Validation:**
  - Images: Max 5MB, MIME types `image/(jpeg|png|webp)`.
  - Documents: Max 10MB, MIME types `image/(jpeg|png|webp)|application/pdf`.

### 8.3 Firebase Cloud Messaging (FCM)
- **Role:** Push delivery adapter for the Android notification channel `ecosetu_alerts`.
- **Authoritative Store:** PostgreSQL `notifications` table.
- **Resilience:** FCM failures are logged as warnings and NEVER cause business transactions to fail.
- **Privacy:** Push payloads contain only event type, notification ID, and title/message. No JWTs, passwords, or personal addresses are transmitted.

### 8.4 Firebase Crashlytics
- Configured for production crash diagnostics.
- PII-Safe Logging Rules:
  - No passwords, JWT access tokens, or refresh tokens in custom keys or logs.
  - No citizen GPS coordinates or private phone numbers in crash reports.
  - Only anonymized error codes and component tags are tracked.

---

## 9. Pre-Demo Checklist for SIH

| Step | Action | Verification |
|------|--------|-------------|
| 1 | Deploy Cloud Run Backend & AI | Verify HTTPS health checks return 200 OK |
| 2 | Run DB migration & seed | Verify seed accounts exist (`citizen@demo.com`, etc.) |
| 3 | Configure Firebase Storage Rules | Deploy `storage.rules` via `firebase deploy --only storage` |
| 4 | Configure Android Firebase | Verify `google-services.json` matches package `com.ecosetu` |
| 5 | Verify FCM Delivery Resiliency | Backend creates DB notifications even when FCM is simulated |
| 6 | Build Release APK | Generate `app-release.apk` with genuine Cloud Run API URL |
| 7 | Install APK on Demo Phones | Install on at least two Android test devices |
| 8 | Test Live Flow | Photograph electronic item → verify category and pickup flow |
| 9 | Offline Test | Toggle airplane mode to demonstrate offline caching |

---

## 10. Cost Control & Low-Cost Operating Principles

1. **Free Tier Maximization:**
   - Cloud Run offers 2 million free requests/month and 360,000 vCPU-seconds/month.
   - Firebase Storage offers 5GB storage and 1GB/day egress free.
   - FCM is 100% free with unlimited push notifications.
2. **No Unapproved Paid Resources:**
   - Cloud SQL must not be provisioned without explicit user consent.
   - Billing alerts must be set at $1.00 USD if billing is enabled on Google Cloud.

---

*All terminology in this document follows `00_PROJECT_INDEX.md`.*
