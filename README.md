<p align="center">
  <img src="assets/logo.png" alt="EcoSetu Logo" width="220" style="border-radius: 50%;" />
</p>

<h1 align="center">EcoSetu (SIH 26229)</h1>

<p align="center">
  <strong>Bridging the Informal Collector into the Formal Recycling Chain</strong><br>
  <em>People • E-Waste • A Cleaner Tomorrow</em>
</p>

<p align="center">
  <a href="https://github.com/alokkumar-gh/ecosetu/releases/latest"><img src="https://img.shields.io/github/v/release/alokkumar-gh/ecosetu?style=for-the-badge&color=10B981&label=Latest%20Release" alt="Latest Release" /></a>
  <a href="https://github.com/alokkumar-gh/ecosetu/releases"><img src="https://img.shields.io/badge/Platform-Android-059669?style=for-the-badge&logo=android" alt="Android" /></a>
  <a href="https://reactnative.dev/"><img src="https://img.shields.io/badge/React%20Native-0.78-0284C7?style=for-the-badge&logo=react" alt="React Native" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-Express%20%2B%20Prisma-16A34A?style=for-the-badge&logo=nodedotjs" alt="Node.js" /></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/AI-FastAPI%20%2B%20YOLOv8-009688?style=for-the-badge&logo=fastapi" alt="FastAPI" /></a>
</p>

---

## 📱 Quick Download

Get the standalone release build of the EcoSetu Android app:

👉 **[Download Latest EcoSetu APK (v1.0.6)](https://github.com/alokkumar-gh/ecosetu/releases/latest)**

---

## 🌍 Overview

In India, over **95% of e-waste** is collected and processed through the informal sector (kabadiwalas and scrap aggregators), often using unscientific, hazardous recycling practices that pose extreme health and environmental risks. Meanwhile, formal recyclers operate below capacity due to collection bottlenecks.

**EcoSetu** solves this systemic challenge by creating a high-integrity, digital bridge between citizens, informal collectors, and authorized recyclers. It empowers informal collectors with digital identity, fair pricing, route optimization, and instant UPI payouts, while granting recyclers traceable chain-of-custody data required for Extended Producer Responsibility (EPR) compliance.

---

## 🚀 Key Features

### 👥 1. Role-Based Experience (RBAC)
- **Citizens**: Schedule e-waste doorstep pickups, receive automated AI appraisals for unwanted electronics, earn Green Credits, and track real-time collection.
- **Informal Collectors (Kabadiwalas)**: Accessible interface with native vernacular voice support, Aadhaar/UPI onboarding, optimized collection routes, and instant cashless payouts.
- **Formal Recyclers**: Batch ingestion management, digital manifests, tamper-evident chain-of-custody logging, and EPR compliance reporting.
- **System Administrators**: 12 dedicated control center screens wrapped in the `AdminShell` layout system.

### 🛡️ 2. Admin Control Center (`AdminShell`)
- **Collapsible Layout Shell**: Animated 220px expanded / 60px collapsed sidebar with persistent storage.
- **Top Navigation Bar**: Dynamic breadcrumbs, global `Ctrl+K` search palette, notification badge, and profile quick-actions.
- **12 Specialized Control Screens**:
  - **Executive Dashboard**: Real-time KPIs, collection conversion funnel, action items, & live activity feed.
  - **Verification Management**: Collector/Recycler verification queue with document modal & audit log.
  - **User Ecosystem**: User table with status toggling (Active / Suspended / Deactivated).
  - **Geographic Analytics**: Privacy-safe regional map view showing verified recycler facilities and coverage zones.
  - **System Health Diagnostics**: On-demand single-click diagnostic checker measuring API latency & service health.
  - **Platform Reports**: CSV and shareable text compliance summary generator.
  - **Dispute Operations**: Operational marketplace dispute ledger & neutrality audit trail.
  - **Notification Center, Audit Logs, Historical Analytics, Governance, and Profile Controls**.

### 🤖 3. EcoSaathi Vernacular AI Assistant
- Interactive floating conversational AI bot powered by dynamic database knowledge.
- **Text-To-Speech (TTS)** voice synthesis supporting multiple Indian languages (Hindi, Marathi, Odia, English).
- Provides instant assistance for e-waste classification rules, Green Credit redemption, and collection guidelines.

### 🧠 4. AI-Driven E-Waste Vision Classification
- Integrated **FastAPI** / **Roboflow** computer vision API serving custom **YOLOv8** models.
- Instant edge/cloud classification of electronics (smartphones, PCBs, batteries, displays, appliances) with condition grading and estimated precious metal / material recovery valuations.

### 🔄 5. B2B Marketplace & Chain-of-Custody Traceability
- Digital batch manifests, consignment delivery tracking, and tamper-evident audit logs.
- Guarantees Extended Producer Responsibility (EPR) data provenance from doorstep collection to formal processing.

### 📶 6. Offline-First Synchronization
- Native **SQLite** queue on Android ensuring collectors can log collections, record item weights, and scan QR/barcodes even in zero-connectivity urban pockets.
- Automatic background sync as soon as network connectivity is restored.

### 🌐 7. Multilingual & Inclusive Design
- Deep localization into **10+ Indian languages** (Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Odia, Punjabi, and English).
- Dark-mode SaaS glassmorphism UI engineered with fluid micro-interactions and high-contrast accessibility.

---

## 🏗 System Architecture

```
                                    +--------------------+
                                    |    Citizen App     |
                                    |  (React Native /   |
                                    |    TypeScript)     |
                                    +---------+----------+
                                              |
      +--------------------+                  |                  +--------------------+
      |   Collector App    +------------------+------------------+   Recycler Portal  |
      | (Offline-First /   |                  |                  | (Batch Ingestion / |
      |  SQLite Sync)      |                  |                  |  EPR Compliance)   |
      +---------+----------+                  |                  +---------+----------+
                |                             |                            |
                +----------------------+      |      +---------------------+
                                       |      |      |
                                       v      v      v
                                +-----------------------------+
                                |      EcoSetu API Gateway    |
                                |       (Express + Node.js)   |
                                +--------------+--------------+
                                               |
                     +-------------------------+-------------------------+
                     |                                                   |
                     v                                                   v
      +-----------------------------+                     +-----------------------------+
      |      AI Vision Service      |                     |      PostgreSQL + Prisma    |
      |   (FastAPI + YOLOv8 Edge)   |                     |     (Relational / Audits)   |
      +-----------------------------+                     +-----------------------------+
```

---

## 📂 Repository Structure

```plaintext
EcoSetu/
├── assets/                    # Project branding, high-res logos, and badges
├── mobile/                    # React Native Android client (TypeScript)
│   ├── android/               # Native Android Gradle configuration & manifests
│   ├── src/
│   │   ├── assets/images/     # App-embedded images & icons
│   │   ├── components/        # Glassmorphic UI & design system components
│   │   ├── navigation/        # Stack & tab navigation schemas
│   │   ├── screens/           # Citizen, Collector, Recycler, and Auth screens
│   │   ├── services/          # Firebase Auth, REST API, & offline sync clients
│   │   └── i18n/              # Multilingual translation dictionaries
├── backend/                   # Node.js + Express REST API
│   ├── prisma/                # Database schema & migrations
│   └── src/                   # Controllers, routes, and middlewares
├── ai/                        # FastAPI microservice for YOLOv8 model inference
├── docs/                      # Technical specifications & design documents
└── scripts/                   # Setup, build, and deployment automation scripts
```

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Mobile Frontend** | React Native 0.78, TypeScript, React Navigation, Safe Area Context |
| **Styling & Theme** | Vanilla React Native StyleSheet, Custom Glassmorphism System |
| **Backend API** | Node.js, Express.js, TypeScript, Prisma ORM |
| **Database** | PostgreSQL, SQLite (Android local offline queue) |
| **Authentication** | Firebase Auth (Google Sign-In, Phone OTP), Custom JWT, RBAC |
| **AI & Computer Vision** | Python 3.11+, FastAPI, Ultralytics YOLOv8, OpenCV |
| **CI/CD & Builds** | Gradle, GitHub Releases, Android SDK platform tools |

---

## ⚡ Getting Started

### Prerequisites
- Node.js >= 18.x
- Java Development Kit (JDK 17)
- Android SDK Platform-Tools (API level 34+)
- Python 3.10+ (for AI service)

### 1. Mobile App Setup
```bash
cd mobile
npm install
npm run android
```

### 2. Backend Setup
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### 3. AI Service Setup
```bash
cd ai
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 📦 Releases

Download release builds directly from the GitHub repository:
- **[Latest Stable Release](https://github.com/alokkumar-gh/ecosetu/releases/latest)**
- **[All Releases & Changelog](https://github.com/alokkumar-gh/ecosetu/releases)**

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
