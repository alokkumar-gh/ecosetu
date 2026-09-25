# ECOSETU — SIH Evaluation Document

> **Problem Statement ID:** SIH 26229  
> **Project Title:** EcoSetu — Bridging the Informal Collector into the Formal Recycling Chain  
> **Domain:** E-Waste Management, Circular Economy, Traceability & EPR Compliance  

---

## 1. Problem Statement

In India, over **95% of electrical and electronic waste (e-waste)** is handled by the unorganized informal sector — kabadiwalas, door-to-door collectors, and scrap aggregators. While highly efficient in collection, informal processing involves hazardous manual dismantling, acid bath leaching, and open burning that releases toxic lead, mercury, and dioxins into urban ecosystems. 

Concurrently, authorized formal recycling facilities operate significantly below capacity due to collection bottlenecks, lack of direct citizen access, and missing chain-of-custody verification required for **Extended Producer Responsibility (EPR)** compliance.

---

## 2. Solution Overview

**EcoSetu** bridges the informal collector directly into the formal recycling ecosystem. It provides:
1. **Citizens**: AI-assisted e-waste appraisal, doorstep pickup scheduling, Green Credit incentives, and verified recycling tracking.
2. **Informal Collectors (Kabadiwalas)**: Voice-enabled multilingual mobile app, digital identity, transparent material pricing, route optimization, and instant UPI payouts upon facility delivery.
3. **Formal Recyclers**: Verified material batch manifests, digital intake queue, capacity planning, and tamper-evident chain-of-custody logs for EPR certification.
4. **Administrators**: Real-time regional telemetry, dispute resolution, facility authorization governance, and automated reporting.

---

## 3. Key Implemented Modules & Architecture

```
                                    ┌────────────────────┐
                                    │    Citizen App     │
                                    │  (React Native /   │
                                    │    TypeScript)     │
                                    └─────────┬──────────┘
                                              │
      ┌────────────────────┐                  │                  ┌────────────────────┐
      │   Collector App    ├──────────────────┼──────────────────┤   Recycler Portal  │
      │ (Offline-First /   │                  │                  │ (Batch Ingestion / │
      │  SQLite Queue)     │                  │                  │  EPR Compliance)   │
      └─────────┬──────────┘                  │                  └─────────┬──────────┘
                │                             │                            │
                └──────────────────────┐      │      ┌─────────────────────┘
                                       │      │      │
                                       ▼      ▼      ▼
                                ┌─────────────────────────────┐
                                │     EcoSetu API Gateway     │
                                │    (Express.js / Node.js)   │
                                └──────────────┬──────────────┘
                                               │
                     ┌─────────────────────────┴─────────────────────────┐
                     │                                                   │
                     ▼                                                   ▼
      ┌─────────────────────────────┐                     ┌─────────────────────────────┐
      │      AI Vision Service      │                     │     PostgreSQL + Prisma     │
      │   (FastAPI + Roboflow/YOLO) │                     │     (Relational / Audits)   │
      └─────────────────────────────┘                     └─────────────────────────────┘
```

### Module Breakdown
- **Mobile Client**: Multi-role React Native app supporting Citizen, Collector, Recycler, and Admin workflows with dynamic role switching and offline-first SQLite queues.
- **Backend API**: Node.js/Express service with Prisma ORM, PostgreSQL database, JWT authentication, and Firebase Cloud Messaging for notifications.
- **AI Material Classification**: FastAPI / Roboflow computer vision pipeline detecting electronic waste categories (PCBs, batteries, smartphones, appliances) with condition grading and metal recovery estimations.
- **EcoSaathi AI Assistant**: Multi-lingual conversational support bot with speech synthesis and dynamic database knowledge integration.
- **Admin Control Center**: 12 dedicated control screens with a collapsible sidebar shell (`AdminShell`), telemetry dashboards, audit trails, and report generation.

---

## 4. End-to-End Operational Workflow

```
[1. Citizen Submission]
    Citizen logs item -> AI Vision scans device -> App generates estimated valuation & Green Credits.
        │
        ▼
[2. Collection Request & Dispatch]
    Citizen schedules pickup -> Nearby Collector receives request with route & material specs.
        │
        ▼
[3. Collector Handover & Pickup]
    Collector arrives -> Verifies item weight/condition -> Pays Citizen via UPI -> Logs SQLite record.
        │
        ▼
[4. Consignment Creation & Delivery]
    Collector aggregates material lots into batch -> Ships to verified Recycler facility.
        │
        ▼
[5. Recycler Facility Ingestion]
    Recycler accepts consignment -> Inspects batch manifest -> Triggers instant digital payment.
        │
        ▼
[6. EPR Certification & Admin Telemetry]
    System generates immutable chain-of-custody audit log -> Admin monitors regional circular economy KPIs.
```

---

## 5. Technology Stack Summary

| Layer | Technology |
|---|---|
| **Mobile Application** | React Native (Expo bare workflow), TypeScript, React Navigation Native Stack |
| **State & Storage** | React Context, AsyncStorage, SQLite native queue |
| **Backend Service** | Node.js, Express.js, Prisma ORM |
| **Database** | PostgreSQL (Neon Cloud / Local) |
| **AI / Computer Vision** | Python 3.10, FastAPI, Roboflow / YOLOv8 Detection API |
| **Localization & Accessibility** | Custom i18n framework (10+ Indian languages), Expo Speech (TTS) |
| **Cloud Deployment** | Render (Backend API + AI Service), Neon PostgreSQL |

---

## 6. Implementation & Verification Status

| Component | Status | Verification Method |
|---|---|---|
| **Authentication & RBAC** | ✅ 100% Implemented | Tested via JWT auth & role-based stack routing |
| **Citizen Marketplace & Pickups** | ✅ 100% Implemented | Verified end-to-end request creation |
| **Collector Logistics & Offline Sync** | ✅ 100% Implemented | Tested via SQLite sync queue & route optimization |
| **Recycler Ingestion & Consignments** | ✅ 100% Implemented | Verified batch creation & payment settlement |
| **AI Vision Classification** | ✅ 100% Implemented | Tested via live Roboflow API integration |
| **EcoSaathi AI Chatbot** | ✅ 100% Implemented | Verified multilingual Q&A & speech synthesis |
| **Admin Control Center (12 Screens)** | ✅ 100% Implemented | Verified `AdminShell` UI, TypeScript check, & bundle |
