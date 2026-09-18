# EcoSetu — Technology Stack

> **Reference:** All terminology follows `00_PROJECT_INDEX.md`.

---

## 1. Stack Summary

| Layer | Technology | Version | License |
|-------|-----------|---------|---------|
| Client (MVP) | Android Application (React Native) | 0.73+ | MIT |
| Build System | Android Gradle + Metro Bundler | Gradle 8.x | Apache 2.0 |
| Styling | React Native StyleSheet (Flexbox) | Built-in | MIT |
| Navigation | React Navigation (Native Stack + Tabs) | 6.x | MIT |
| Hardware Access | Android Camera & GPS Geolocation | Native SDKs | MIT / Apache 2.0 |
| Mobile Storage | @react-native-async-storage | 1.x | MIT |
| Maps | react-native-maps + OpenStreetMap | 1.10+ | MIT |
| Backend | Node.js | 20 LTS | MIT |
| API Framework | Express.js | 4.x | MIT |
| ORM | Prisma | 5.x | Apache 2.0 |
| Validation | express-validator | 7.x | MIT |
| Auth | jsonwebtoken + bcryptjs | — | MIT |
| File Upload | multer | 1.x | MIT |
| Logging | winston | 3.x | MIT |
| Rate Limiting | express-rate-limit | 7.x | MIT |
| Database | PostgreSQL | 15+ | PostgreSQL License |
| AI Runtime | Python | 3.10+ | PSF |
| AI Framework | Ultralytics YOLOv8 | 8.x | AGPL-3.0 |
| AI Server | FastAPI | 0.100+ | MIT |
| AI Image Processing | Pillow | 10.x | HPND |
| Mobile Testing | Jest + React Native Testing Library | — | MIT |
| Backend Testing | Jest (backend), pytest (AI) | — | MIT |
| Web Portal | **FUTURE / DEFERRED** (React/Vite) | — | — |

---

## 2. Mandatory Technologies

### 2.1 React Native 0.73+ (Android Target)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Native Android mobile application client |
| **Reason** | Leverages React component patterns, JSX, and JavaScript while compiling to native Android APKs. Direct access to phone camera, GPS, and local storage |
| **Free tier** | Fully free and open-source |
| **OS Compatibility** | Android 7.0 (Nougat / API 24) through latest Android 16+ (API 35/36+) |
| **Alternatives considered** | Flutter (requires Dart learning curve), Kotlin/Jetpack Compose (separate codebase with no JS sharing), Cordova/Capacitor (inferior camera performance and webview latency) |
| **Limitations** | Requires Android SDK / Gradle build setup; native dependency linking |

### 2.2 Android Gradle + Metro Bundler

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Android application build tool and JS asset packager |
| **Reason** | Standard Android build pipeline producing installable `.apk` and `.aab` packages for direct USB sideloading and physical device demonstration at SIH |
| **Free tier** | Fully free and open-source |
| **Alternatives considered** | Expo Application Services (build queue limits on free tier; local Gradle build is unlimited and offline-capable) |
| **Limitations** | Requires initial Android SDK and JDK 17 environment setup |

### 2.3 React Native StyleSheet + Material Design Tokens

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Mobile UI styling and responsive component layout |
| **Reason** | Built directly into React Native, native flexbox layout engine, zero runtime overhead, responsive across diverse Android screen densities (hdpi to xxxhdpi) |
| **Free tier** | Built-in |
| **Alternatives considered** | NativeWind (adds Babel build complexity), styled-components (runtime penalty on lower-end devices) |
| **Limitations** | Requires establishing centralized color/spacing design tokens |

### 2.4 Node.js 20 LTS + Express.js 4

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Backend runtime and API framework |
| **Reason** | Same language as frontend (JavaScript), minimal learning curve, huge ecosystem, Express is the most widely documented Node framework |
| **Free tier** | Fully free and open-source |
| **Alternatives considered** | Fastify (faster but less documented), Koa (less ecosystem), NestJS (over-engineered for prototype), Django/Flask (adds Python to backend stack) |
| **Limitations** | Single-threaded (adequate for prototype scale); Express is unopinionated (requires structure discipline) |

### 2.5 PostgreSQL 15+

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Relational database |
| **Reason** | Free, battle-tested, supports JSON fields, excellent for structured data with relationships |
| **Free tier** | Neon free tier (0.5GB storage, autoscaling compute) |
| **Alternatives considered** | MySQL (equally valid), SQLite (no concurrent access), MongoDB (relational data fits SQL better) |
| **Limitations** | 0.5GB on Neon free tier (sufficient for demo data) |

### 2.6 Prisma 5

| Attribute | Detail |
|-----------|--------|
| **Purpose** | ORM and database toolkit |
| **Reason** | Type-safe queries, auto-generated client, declarative schema, built-in migrations |
| **Free tier** | Fully free and open-source |
| **Alternatives considered** | Sequelize (more boilerplate), Knex (query builder only), TypeORM (TypeScript-first) |
| **Limitations** | Schema-first approach requires rebuild on changes; adds abstraction layer |

### 2.7 JWT + bcryptjs

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Authentication and password hashing |
| **Reason** | Stateless auth (no session store needed), well-understood, free |
| **Free tier** | Fully free and open-source |
| **Alternatives considered** | Session-based auth (requires session store), Passport.js (adds complexity for simple JWT), OAuth only (requires third-party providers) |
| **Limitations** | Token revocation requires additional logic (acceptable for prototype) |

### 2.8 react-native-maps + OpenStreetMap

| Attribute | Detail |
|-----------|--------|
| **Purpose** | In-app map rendering and pickup location coordinate selection |
| **Reason** | Native Android map component, supports free OpenStreetMap tile overlays or Google Maps provider |
| **Free tier** | Fully free (OSM tiles / default mobile map provider) |
| **Alternatives considered** | Mapbox SDK (paid tier requirements), Google Maps SDK (requires API billing setup) |
| **Limitations** | Requires Android Google Play Services / API key configuration for Google provider; OSM tiles provide offline-capable fallback |

### 2.9 Python 3.10+ + FastAPI

| Attribute | Detail |
|-----------|--------|
| **Purpose** | AI inference service |
| **Reason** | Python is the standard for ML; FastAPI is lightweight with auto-generated docs |
| **Free tier** | Fully free and open-source |
| **Alternatives considered** | Flask (less modern), Django (too heavy for single-purpose service), Node.js (poor ML library support) |
| **Limitations** | Adds a second language to the stack (justified for AI ecosystem) |

### 2.10 YOLOv8 (Ultralytics)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | E-waste image detection/classification |
| **Reason** | State-of-the-art object detection, pretrained on COCO (80 classes include electronics), easy fine-tuning API, runs on CPU |
| **Free tier** | Free and open-source (AGPL-3.0) |
| **Alternatives considered** | TensorFlow/MobileNet (classification only, less convenient), EfficientDet (more complex setup), custom CNN (requires large dataset) |
| **Limitations** | AGPL license requires open-sourcing (acceptable for SIH project); CPU inference is slower than GPU but adequate |

> **License Note:** YOLOv8's AGPL-3.0 license requires that the source code of applications using it be made available. Since this is a student/SIH project (not commercial), this is not a concern. For future commercial use, Ultralytics offers a commercial license.

---

## 3. Optional Technologies

These are used if time permits but are not required for core functionality.

### 3.1 Cloudinary

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Cloud image storage and transformation |
| **Reason** | 25GB free storage, automatic image optimization, CDN delivery |
| **Free tier** | 25GB storage, 25GB bandwidth/month |
| **Alternatives** | Local filesystem (dev only), AWS S3 free tier (12 months), Firebase Storage (5GB) |
| **When to use** | When deploying to hosted environments where local disk is ephemeral |

### 3.2 Maestro / Detox

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Mobile UI end-to-end testing |
| **Reason** | Simple YAML-based flows (Maestro) for Android device/emulator interaction |
| **Free tier** | Fully free and open-source |
| **When to use** | If time allows for automated mobile UI testing |

### 3.3 React Native Chart Kit / SVG

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Mobile analytics summary charts |
| **Reason** | Native SVG-rendered charts for Android screens (collection stats, weight summaries) |
| **Free tier** | Fully free and open-source |
| **Alternatives** | Victory Native (heavier bundle), pure flexbox progress bars |
| **When to use** | When rendering visual summaries on Collector/Citizen dashboards |

---

## 4. Hosting and Deployment

| Service / Target | Purpose | Limits / Characteristics | Alternative |
|------------------|---------|-------------------------|-------------|
| **Android APK / AAB** | Mobile App Distribution | Standalone debug/release APK for physical device installation | Direct USB sideloading / APK link |
| **Render** | Backend + AI hosting | 750 hours/month, spins down after 15min idle | Railway (500 hours/month) |
| **Neon** | PostgreSQL database | 0.5GB storage, autoscaling compute | Supabase (500MB), ElephantSQL (20MB) |
| **Cloudinary** | Image storage | 25GB storage, 25GB bandwidth | Local disk (dev), Firebase Storage |
| **GitHub** | Version control | Unlimited public repos | GitLab |
| **Web Portal (Future)** | **FUTURE / DEFERRED** | Deferred desktop browser portal | Vercel / Netlify (in future phase) |

---

## 5. Development Tools

| Tool | Purpose | Required? |
|------|---------|:---------:|
| Node.js 20 LTS | JavaScript runtime & Metro bundler | ✅ |
| npm | Package manager | ✅ |
| JDK 17 & Android SDK | Android compilation & Gradle build | ✅ |
| Python 3.10+ | AI service runtime | ✅ |
| pip | Python package manager | ✅ |
| Git | Version control | ✅ |
| PostgreSQL client | Local database (dev) | ✅ |
| Android Device / Emulator | App testing and SIH live demonstration | ✅ |
| VS Code | Editor (recommended) | Optional |
| Postman / Thunder Client | API testing | Optional |
| pgAdmin / DBeaver | Database GUI | Optional |

---

## 6. Technology Decision Matrix

| Requirement | Decision | Justification |
|------------|----------|---------------|
| Why an Android mobile app? | Android Application | Field operations require mobility: informal collectors and citizens need physical camera integration for scanning e-waste, GPS for pickup coordinates, and offline resilience |
| Why React Native for Android? | React Native | Enables fast mobile development utilizing React component paradigms while compiling to true native Android APKs with full device hardware access |
| Why defer the Web App? | **FUTURE / DEFERRED** | Mobile is where collection and handover physically occur. The backend REST API is client-agnostic so a web portal can be added later without backend redesign |
| Why not TypeScript? | JavaScript | Reduces syntax overhead for fast prototyping; TypeScript can be introduced incrementally |
| Why not GraphQL? | REST API | Simpler, standard HTTP caching/multipart upload support, adequate for relational endpoints |
| Why not MongoDB? | PostgreSQL | Relational lifecycle model (users → requests → pickups → consignments) fits SQL constraints better |
| Why separate AI service? | Microservice | Isolates Python ML runtime, independently deployable, prevents blocking Node.js event loop |
| Why not Docker for dev? | Direct installation | Simpler setup for student team; Docker documented as optional |

---

*All terminology in this document follows `00_PROJECT_INDEX.md`.*
