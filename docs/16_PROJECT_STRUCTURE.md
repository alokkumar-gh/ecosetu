# EcoSetu — Project Structure

> **Reference:** All terminology follows `00_PROJECT_INDEX.md`.

---

## 1. Repository Root

```
ecosetu/
├── mobile/             # React Native Android Application
├── backend/            # Node.js + Express REST API
├── ai/                 # Python FastAPI YOLOv8 AI service
├── docs/               # Project documentation (canonical specs)
├── scripts/            # Setup, seed, and APK build scripts
├── .github/            # GitHub Actions workflows
├── .gitignore
├── README.md
└── LICENSE
```

---

## 2. Mobile Application Structure (`mobile/`)

```
mobile/
├── android/                         # Native Android Gradle Project
│   ├── app/
│   │   ├── build.gradle             # App compilation settings (minSdk 24, targetSdk 35+, Android 7.0 to 16+)
│   │   ├── proguard-rules.pro       # Release obfuscation rules
│   │   └── src/main/
│   │       ├── AndroidManifest.xml  # Runtime permissions (CAMERA, GPS, NOTIFICATIONS)
│   │       ├── java/com/ecosetu/    # MainActivity.kt & MainApplication.kt
│   │       └── res/                 # App launcher icons, drawables, splash screen
│   ├── build.gradle                 # Project build config
│   ├── gradle.properties
│   └── gradlew                      # Gradle build wrapper
├── src/
│   ├── App.jsx                      # Application entry with NavigationContainer & Providers
│   ├── assets/                      # Icons, logos, and illustration assets
│   ├── components/
│   │   ├── common/                  # AppButton, AppCard, AppInput, StatusBadge, Spinner, EmptyState
│   │   ├── layout/                  # TopAppBar, BottomTabBar, ScreenContainer, RoleGuard
│   │   ├── forms/                   # CameraCapture, MapPicker, CategoryPicker, DateTimeModal
│   │   └── features/                # TraceabilityTimeline, NotificationBell, AIPredictionCard, MetricCard
│   ├── navigation/                  # React Navigation 6 setup
│   │   ├── RootNavigator.jsx
│   │   ├── AuthNavigator.jsx
│   │   ├── CitizenNavigator.jsx
│   │   ├── CollectorNavigator.jsx
│   │   ├── RecyclerNavigator.jsx
│   │   └── AdminNavigator.jsx
│   ├── screens/
│   │   ├── auth/                    # LandingScreen, LoginScreen, RegisterScreen
│   │   ├── citizen/                 # CitizenDashboardScreen, SubmitItemScreen, MyItemsScreen, CreateRequestScreen, RequestDetailScreen, ItemTraceabilityScreen
│   │   ├── collector/               # CollectorDashboardScreen, AvailableRequestsScreen, RequestDetailScreen, PickupCompletionScreen, CreateConsignmentScreen, MyPickupsScreen, VerificationScreen
│   │   ├── recycler/                # RecyclerDashboardScreen, IncomingConsignmentsScreen, RecyclingRecordsScreen, VerificationScreen
│   │   ├── admin/                   # AdminDashboardScreen, VerificationQueueScreen, UserManagementScreen, AuditLogsScreen
│   │   └── shared/                  # ProfileScreen, NotificationsScreen
│   ├── context/                     # AuthContext, NotificationContext, NetworkContext
│   ├── hooks/                       # useAuth, useApi, useCamera, useLocation, useNetwork
│   ├── services/                    # apiClient, authService, ewasteService, requestService, pickupService, consignmentService, recyclingService, aiService, locationService, offlineQueue
│   ├── utils/                       # constants, permissions, formatters, storage
│   └── theme/                       # colors, typography, spacing
├── app.json                         # React Native application metadata
├── index.js                         # Native entry point (AppRegistry)
├── package.json
└── package-lock.json
```

**What belongs here:** All React Native code, native Android Gradle wrapper files, mobile UI assets, camera/GPS integrations.

**What does NOT belong here:** Express backend controllers, database migrations, Python ML models.

> **Future Web Application (`web/`):** Marked as **FUTURE / DEFERRED**. A desktop web application folder will be added in a future phase to consume the backend APIs.

---

## 3. Backend Structure (`backend/`)

```
backend/
├── src/
│   ├── index.js                     # Server entry point
│   ├── app.js                       # Express app configuration
│   ├── config/                      # database.js, environment.js, cors.js, rateLimit.js
│   ├── middleware/                  # authenticate.js, authorize.js, checkStatus.js, checkVerified.js, validate.js, upload.js, errorHandler.js, requestLogger.js
│   ├── routes/                      # authRoutes, userRoutes, collectorRoutes, recyclerRoutes, ewasteRoutes, requestRoutes, pickupRoutes, consignmentRoutes, recyclingRoutes, aiRoutes, notificationRoutes, verificationRoutes, adminRoutes
│   ├── controllers/                 # Modular controllers per entity
│   ├── services/                    # Business logic services
│   ├── validators/                  # express-validator chains
│   ├── utils/                       # AppError, constants, responseHelper, locationHelper
│   └── jobs/                        # expireRequests.js (scheduled cleanup)
├── prisma/
│   ├── schema.prisma                # PostgreSQL Prisma schema
│   ├── migrations/                  # Auto-generated migration files
│   └── seed.js                      # Initial test data seeding
├── uploads/                         # Local image storage directory (dev only, gitignored)
├── tests/
│   ├── unit/                        # Service and utility unit tests
│   ├── integration/                 # REST API route integration tests
│   └── setup.js                     # Test database runner
├── .env.example
├── package.json
└── jest.config.js
```

---

## 4. AI Service Structure (`ai/`)

```
ai/
├── src/
│   ├── main.py                      # FastAPI application entry
│   ├── model.py                     # YOLOv8 loading & inference runner
│   ├── config.py                    # Environment settings
│   └── schemas.py                   # Pydantic validation schemas
├── models/
│   └── ewaste_classifier_v1.0.pt   # Fine-tuned YOLOv8n-cls weights (~6MB)
├── training/                        # Dataset collection & training scripts
│   ├── prepare_dataset.py
│   ├── train.py
│   ├── evaluate.py
│   └── export_model.py
├── tests/
│   ├── test_model.py
│   └── test_api.py
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## 5. Documentation Structure (`docs/`)

```
docs/
├── 00_PROJECT_INDEX.md
├── 01_PRD.md
├── 02_SYSTEM_ARCHITECTURE.md
├── 03_TECH_STACK.md
├── 04_DATABASE_SCHEMA.md
├── 05_API_SPECIFICATION.md
├── 06_ROLES_AND_PERMISSIONS.md
├── 07_BUSINESS_WORKFLOWS.md
├── 08_UI_UX_SPECIFICATION.md
├── 09_FRONTEND_ARCHITECTURE.md
├── 10_BACKEND_ARCHITECTURE.md
├── 11_AI_EWASTE_DETECTION.md
├── 12_AI_TRAINING_PLAN.md
├── 13_SECURITY_PRIVACY.md
├── 14_TESTING_STRATEGY.md
├── 15_DEPLOYMENT_GUIDE.md
├── 16_PROJECT_STRUCTURE.md
├── 17_DEVELOPMENT_ROADMAP.md
├── 18_ANTIGRAVITY_DEVELOPMENT_RULES.md
├── 19_SIH_DEMO_FLOW.md
├── 20_SIH_PRESENTATION_CONTENT.md
├── 21_TRACEABILITY_AND_AUDIT.md
├── 22_ANALYTICS_AND_REPORTING.md
├── 23_NOTIFICATION_SYSTEM.md
└── 24_ERROR_EDGE_CASES.md
```

---

## 6. Scripts Structure (`scripts/`)

```
scripts/
├── setup-dev.sh              # Development environment check & setup
├── seed-demo-data.sh         # Seed PostgreSQL database with demo accounts
├── build-apk.sh              # Build Android release APK via Gradle
└── pre-demo-warmup.sh        # Ping cloud backend endpoints before SIH presentation
```

---

## 7. .gitignore Essentials

```
# Dependencies
node_modules/
__pycache__/
*.pyc

# Android Build Outputs
mobile/android/.gradle/
mobile/android/app/build/
*.apk
*.aab

# Environment Keys
.env
.env.local
.env.production

# Backend Uploads
backend/uploads/

# IDE & OS
.vscode/
.idea/
.DS_Store
Thumbs.db

# Logs
*.log

# AI Training Artifacts
ai/training/runs/
ai/training/dataset/
```

---

*All terminology in this document follows `00_PROJECT_INDEX.md`.*
