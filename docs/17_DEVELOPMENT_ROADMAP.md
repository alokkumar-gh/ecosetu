# EcoSetu — Development Roadmap

> **Reference:** All terminology follows `00_PROJECT_INDEX.md`.

---

## Phase 0 — Foundation & Android Setup

**Objective:** Set up project repository, Android SDK development environment, and backend tooling.

**Prerequisites:** Node.js 20 LTS, JDK 17, Android SDK / Studio installed.

**Tasks:**
- [ ] Create GitHub repository
- [ ] Set up monorepo structure (`mobile/`, `backend/`, `ai/`, `docs/`)
- [ ] Initialize Android application with React Native (`npx react-native init mobile`)
- [ ] Verify Android project compiles via Gradle (`cd mobile/android && ./gradlew assembleDebug`)
- [ ] Configure Android permissions in `AndroidManifest.xml` (Camera, Fine Location, Notifications)
- [ ] Initialize backend (`npm init` in `backend/`)
- [ ] Install backend dependencies (express, prisma, bcryptjs, jsonwebtoken, cors, express-validator, express-rate-limit, multer, winston)
- [ ] Install mobile dependencies (react-navigation, react-native-maps, react-native-vision-camera, react-native-image-resizer, async-storage, netinfo)
- [ ] Set up mobile theme tokens (`src/theme/colors.js`, `typography.js`, `spacing.js`)
- [ ] Set up `.env.example` templates for all services
- [ ] Create `.gitignore` including Android build outputs (`.gradle/`, `build/`, `*.apk`)
- [ ] Create `README.md` with setup instructions

**Deliverables:** Working project skeleton; backend starts on `:3001` and Android app launches on emulator/device.

---

## Phase 1 — Database & Data Models

**Objective:** Define database schema and set up Prisma with PostgreSQL.

**Prerequisites:** Phase 0 completed.

**Tasks:**
- [ ] Initialize Prisma (`npx prisma init`)
- [ ] Define `schema.prisma` matching `04_DATABASE_SCHEMA.md` exactly
- [ ] Define canonical enums (user_role, user_status, ewaste_category, etc.)
- [ ] Define all models (users, collector_profiles, recycler_profiles, ewaste_items, collection_requests, pickups, consignments, recycling_records, ai_predictions, verifications, notifications, audit_logs)
- [ ] Add indexes for spatial and foreign key queries
- [ ] Run initial migration (`npx prisma migrate dev --name init`)
- [ ] Create seed script (`prisma/seed.js`) with demo accounts
- [ ] Verify demo data in Prisma Studio

**Deliverables:** Complete database schema and seeded development database (`ecosetu_dev`).

---

## Phase 2 — Backend Core API

**Objective:** Implement Express application structure, middleware, and error handling.

**Prerequisites:** Phase 1 completed.

**Tasks:**
- [ ] Create `app.js` with Express setup (JSON parser, CORS, logger)
- [ ] Implement centralized error handler middleware and `AppError` class
- [ ] Implement response helpers (`successResponse`, `errorResponse`)
- [ ] Implement winston request logging and rate limiting
- [ ] Implement route aggregator (`routes/index.js`)
- [ ] Create health check endpoint (`GET /api/v1/health`)
- [ ] Verify server starts and responds to health check

**Deliverables:** Operational Express server with standardized error handling and logging.

---

## Phase 3 — Authentication & Mobile Authorization

**Objective:** Implement registration, login, JWT issuance, and mobile token management.

**Prerequisites:** Phase 2 completed.

**Tasks:**
- [ ] Implement `authService` (bcrypt hashing, JWT generation/verification)
- [ ] Implement auth validators (register, login)
- [ ] Implement `POST /api/v1/auth/register`
- [ ] Implement `POST /api/v1/auth/login`
- [ ] Implement `POST /api/v1/auth/refresh`
- [ ] Implement `authenticate` middleware (JWT Bearer token verification)
- [ ] Implement `authorize` role-checking middleware
- [ ] Implement `checkStatus` (ACTIVE check) and `checkVerified` middleware
- [ ] Build mobile `AuthContext` with AsyncStorage persistence (`@ecosetu_token`)
- [ ] Build mobile screens: `LandingScreen`, `LoginScreen`, `RegisterScreen`
- [ ] Build mobile `RootNavigator` with auth state switching
- [ ] Write unit & integration tests for auth endpoints

**Deliverables:** Functional authentication; users can register and log in on Android app.

---

## Phase 4 — Citizen Mobile Experience

**Objective:** Implement citizen workflows: camera photo capture, request creation, status tracking.

**Prerequisites:** Phase 3 completed.

**Tasks:**
- [ ] Implement backend `fileService` (multipart validation, storage)
- [ ] Implement `POST /api/v1/ewaste-items`
- [ ] Implement `GET /api/v1/ewaste-items` and `GET /api/v1/ewaste-items/:id`
- [ ] Implement `POST /api/v1/collection-requests`
- [ ] Implement `GET /api/v1/collection-requests` and `GET /api/v1/collection-requests/:id`
- [ ] Implement `POST /api/v1/collection-requests/:id/cancel`
- [ ] Build mobile `CitizenDashboardScreen` (summary cards, recent requests)
- [ ] Build mobile `SubmitItemScreen` with camera capture, compression (< 1MB), and category picker
- [ ] Build mobile `MyItemsScreen` (FlatList of items with status pills)
- [ ] Build mobile `CreateRequestScreen` with GPS button and native `react-native-maps` pin placement
- [ ] Build mobile `RequestDetailScreen` with visual status stepper
- [ ] Build mobile `ItemTraceabilityScreen` showing chain of custody
- [ ] Write tests for citizen backend endpoints and mobile screens

**Deliverables:** Citizens can photograph e-waste, create pickup requests with GPS, and track status on Android.

---

## Phase 5 — Informal Collector Mobile Experience

**Objective:** Implement collector workflows: verification, browsing requests, pickups, consignments.

**Prerequisites:** Phase 3 completed.

**Tasks:**
- [ ] Implement `PUT /api/v1/collectors/profile` and `PATCH /api/v1/collectors/availability`
- [ ] Implement `GET /api/v1/collectors/stats`
- [ ] Implement `POST /api/v1/verifications` and `GET /api/v1/verifications/me`
- [ ] Implement `GET /api/v1/collection-requests/available` (location-based filtering)
- [ ] Implement `POST /api/v1/collection-requests/:id/accept`
- [ ] Implement `PATCH /api/v1/pickups/:id/start` and `PATCH /api/v1/pickups/:id/complete`
- [ ] Implement consignment creation and delivery endpoints
- [ ] Build mobile `CollectorDashboardScreen` (pickup stats, availability toggle)
- [ ] Build mobile `VerificationScreen` (document upload via camera/gallery)
- [ ] Build mobile `AvailableRequestsScreen` (map view + list view toggle)
- [ ] Build mobile `PickupCompletionScreen` (weight inputs + camera photo proof)
- [ ] Build mobile `CreateConsignmentScreen` (group collected items for recycler)
- [ ] Build mobile `MyPickupsScreen` (tabbed pickup and consignment history)
- [ ] Write tests for collector endpoints

**Deliverables:** Verified collectors can discover nearby requests, complete pickups with camera proofs, and consign to recyclers.

---

## Phase 6 — Recycler Mobile Experience

**Objective:** Implement recycler workflows: verification, consignment review, recycling records.

**Prerequisites:** Phase 5 completed.

**Tasks:**
- [ ] Implement `PUT /api/v1/recyclers/profile` and `GET /api/v1/recyclers`
- [ ] Implement `PATCH /api/v1/consignments/:id/accept` and reject endpoints
- [ ] Implement `GET /api/v1/recycling-records`
- [ ] Implement `PATCH /api/v1/recycling-records/:id/start-processing` and complete endpoints
- [ ] Build mobile `RecyclerDashboardScreen` (metrics, incoming shipments)
- [ ] Build mobile `IncomingConsignmentsScreen` (accept/reject deliveries)
- [ ] Build mobile `RecyclingRecordsScreen` (processing updates & completion notes)
- [ ] Build mobile `VerificationScreen` (facility registration upload)
- [ ] Write tests for recycler endpoints

**Deliverables:** Recyclers can accept deliveries, log recycling processes, and issue completion records via Android.

---

## Phase 7 — Administrator Mobile Management

**Objective:** Implement platform verification and monitoring within the Android application.

**Prerequisites:** Phases 3-6 completed.

**Tasks:**
- [ ] Implement `GET /api/v1/admin/verifications` and `PATCH /api/v1/admin/verifications/:id`
- [ ] Implement `GET /api/v1/admin/users` and status toggle endpoints
- [ ] Implement `GET /api/v1/admin/analytics` and `GET /api/v1/admin/audit-logs`
- [ ] Build mobile `AdminDashboardScreen` (platform stats, pending verifications count)
- [ ] Build mobile `VerificationQueueScreen` (review collector/recycler ID cards)
- [ ] Build mobile `UserManagementScreen` (search users, activate/suspend)
- [ ] Build mobile `AuditLogsScreen` (scrollable audit trail)
- [ ] Write tests for admin endpoints

**Deliverables:** Platform administrators can approve collectors/recyclers and monitor activity directly from the Android app.

---

## Phase 8 — AI E-Waste Classification Integration

**Objective:** Deploy YOLOv8 classification microservice and connect to mobile camera flow.

**Prerequisites:** Phases 4-6 completed; fine-tuned YOLOv8n-cls model ready.

**Tasks:**
- [ ] Set up FastAPI service (`ai/src/main.py`)
- [ ] Implement model loading and `/predict` endpoint
- [ ] Implement backend `aiService` to proxy image to FastAPI service
- [ ] Integrate AI inference into mobile `SubmitItemScreen`
- [ ] Build mobile `AIPredictionCard` (predicted category, confidence pill, accept/override buttons)
- [ ] Implement graceful fallback when AI service is unreachable
- [ ] Write pytest tests for AI microservice and integration tests

**Deliverables:** Citizen snaps a photo on phone camera → YOLOv8 suggests category with confidence → citizen accepts or overrides.

---

## Phase 9 — Offline Resilience & Mobile Polish

**Objective:** Implement offline action queue, push notifications, and touch ergonomics.

**Prerequisites:** Phases 4-8 completed.

**Tasks:**
- [ ] Implement `NetworkContext` with NetInfo connection monitoring
- [ ] Implement `offlineQueue.js` for storing pending actions in AsyncStorage during poor network
- [ ] Implement automatic sync flush when network connectivity restores
- [ ] Build Android notification channels and in-app notification center
- [ ] Add loading shimmer skeletons, pull-to-refresh (`RefreshControl`), and error toasts
- [ ] Test layout across Android screen densities (hdpi, xhdpi, xxxhdpi)
- [ ] Verify touch targets meet 48x48dp minimum

**Deliverables:** Robust Android application capable of operating in low-connectivity field conditions.

---

## Phase 10 — Android Device Testing & Verification

**Objective:** Comprehensive testing on physical Android devices and emulators.

**Prerequisites:** Phase 9 completed.

**Tasks:**
- [ ] Execute automated unit and integration tests (backend and mobile)
- [ ] Perform live walkthrough of all user flows on physical Android smartphone
- [ ] Test runtime permission prompts (Camera, Location, Notifications)
- [ ] Test camera capture and local compression (< 1MB)
- [ ] Test airplane mode offline action queuing and reconnection sync
- [ ] Check Android Logcat for zero unhandled exceptions
- [ ] Verify complete traceability chain for a test e-waste item

**Deliverables:** Verified, bug-free Android application ready for SIH presentation.

---

## Phase 11 — SIH Demo Deployment & Presentation Setup

**Objective:** Deploy cloud backend, build release APK, and prepare live demonstration.

**Prerequisites:** Phase 10 completed.

**Tasks:**
- [ ] Deploy backend API to Render with production environment variables
- [ ] Deploy YOLOv8 AI service to Render
- [ ] Set up Neon PostgreSQL and run migrations (`prisma migrate deploy`)
- [ ] Seed demo accounts (`prisma db seed`)
- [ ] Build standalone release APK (`cd mobile/android && ./gradlew assembleRelease`)
- [ ] Sideload `app-release.apk` onto physical demonstration smartphones
- [ ] Test screen mirroring (`scrcpy` over USB/Wi-Fi) to laptop/projector
- [ ] Prepare offline local fallback environment
- [ ] Execute dry run of SIH demo flow (per `19_SIH_DEMO_FLOW.md`)

**Deliverables:** Deployed cloud backend and release APK installed on physical demonstration phone.

---

## Phase 12 — FUTURE / DEFERRED: Web Application & Management Portal

> **Status:** **DEFERRED TO FUTURE RELEASE**

**Objective:** Build a companion desktop browser web portal consuming the same backend REST APIs.

**Planned Features:**
- Desktop web portal built with React 18 / Vite
- Bulk institutional e-waste booking for schools, IT firms, and offices
- Advanced multi-pane recycler logistics and warehouse management console
- Comprehensive administrative reporting, data visualizations, and CSV/PDF export tools

---

*All terminology in this document follows `00_PROJECT_INDEX.md`.*
