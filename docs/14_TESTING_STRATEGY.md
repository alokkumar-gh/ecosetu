# EcoSetu — Testing Strategy

> **Reference:** All terminology follows `00_PROJECT_INDEX.md`.

---

## 1. Testing Overview

| Level | Framework / Tool | Scope | Priority |
|-------|------------------|-------|:--------:|
| Unit (Backend) | Jest | Services, utilities, validators | P0 |
| Unit (Mobile) | Jest + React Native Testing Library | Hooks, UI components, AsyncStorage | P1 |
| API Integration | Jest + Supertest | REST endpoint behavior | P0 |
| Database | Jest + Prisma (test DB) | Queries, transactions, migrations | P1 |
| AI Model | pytest | Inference accuracy, API responses | P1 |
| Android Device / E2E | Maestro / Device Testing | Camera, Location, Offline sync, UI flows | P1 |
| Security & Permissions | Manual + automated | Auth, RBAC, Android runtime permissions | P0 |

---

## 2. Unit Testing — Backend

### 2.1 Service Layer Tests

| Service | Key Tests |
|---------|----------|
| `authService` | Password hashing, token generation/verification, expired token rejection |
| `requestService` | Create request, accept request (state transitions), cancel rules enforcement |
| `pickupService` | Complete pickup (item status update), weight recording |
| `consignmentService` | Create consignment (only COLLECTED items), accept/reject |
| `recyclingService` | Status transitions (RECEIVED → PROCESSING → COMPLETED) |
| `notificationService` | Notification creation, unread count |
| `auditService` | Audit log creation (immutable) |
| `fileService` | Image validation (type, size, magic bytes), upload handling |

### 2.2 Validator Tests

| Validator | Key Tests |
|-----------|----------|
| Auth validators | Valid/invalid email, password complexity, role enum |
| E-waste validators | Valid/invalid category, quantity range, file size |
| Request validators | Coordinate ranges, date in future, required fields |

### 2.3 Utility Tests

| Utility | Key Tests |
|---------|----------|
| `locationHelper` | Haversine distance calculation accuracy |
| `responseHelper` | Success/error response format |
| `AppError` | Error code mapping, serialization |

---

## 3. API Integration Testing

### 3.1 Authentication Endpoints

| Test Case | Method | Endpoint | Expected |
|-----------|--------|----------|----------|
| Register valid citizen | POST | `/auth/register` | 201, user + token |
| Register duplicate email | POST | `/auth/register` | 409, CONFLICT |
| Register invalid email | POST | `/auth/register` | 400, VALIDATION_ERROR |
| Register without required fields | POST | `/auth/register` | 400, VALIDATION_ERROR |
| Login valid credentials | POST | `/auth/login` | 200, user + token |
| Login wrong password | POST | `/auth/login` | 401, UNAUTHORIZED |
| Login non-existent email | POST | `/auth/login` | 401, UNAUTHORIZED |
| Login suspended account | POST | `/auth/login` | 403, FORBIDDEN |
| Access protected route without token | GET | `/users/me` | 401, UNAUTHORIZED |
| Access protected route with expired token | GET | `/users/me` | 401, UNAUTHORIZED |
| Refresh valid token | POST | `/auth/refresh` | 200, new access token |

### 3.2 Authorization Tests

| Test Case | Actor | Endpoint | Expected |
|-----------|-------|----------|----------|
| Citizen accesses collector endpoint | CITIZEN | `GET /collectors/profile` | 403 |
| Collector accesses admin endpoint | INFORMAL_COLLECTOR | `GET /admin/users` | 403 |
| Unverified collector browses requests | INFORMAL_COLLECTOR (PENDING) | `GET /collection-requests/available` | 403 |
| Citizen accesses own request | CITIZEN | `GET /collection-requests/:ownId` | 200 |
| Citizen accesses other's request | CITIZEN | `GET /collection-requests/:otherId` | 403 or 404 |

### 3.3 Core Workflow Tests

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Complete collection flow | Create item → Create request → Submit → Accept → Complete pickup | All statuses transition correctly |
| Complete consignment flow | Create consignment → Deliver → Accept | Recycling record created |
| Cancel request before acceptance | Create request → Submit → Cancel | Status: CANCELLED |
| Cancel request after acceptance | Create request → Submit → Accept → Cancel | Status: CANCELLED, collector notified |
| Reject consignment | Create consignment → Deliver → Reject | Status: REJECTED with reason |
| Double-accept prevention | Two collectors try to accept same request | First succeeds (200), second fails (409) |

---

## 4. Frontend Testing

### 4.1 Hook Tests

| Hook | Key Tests |
|------|----------|
| `useAuth` | Login sets user, logout clears user, redirect on unauthenticated |
| `useForm` | Validation triggers on blur/submit, error messages display |
| `useApi` | Loading state management, error handling |

### 4.2 Component Tests

| Component | Key Tests |
|-----------|----------|
| `ProtectedRoute` | Redirects when unauthenticated, renders when authenticated, role check |
| `StatusBadge` | Correct color for each status value |
| `ImageUpload` | File type validation, size validation, preview display |
| `MapPicker` | Coordinates update on click, marker placement |

---

## 5. Database Testing

### 5.1 Migration Tests

| Test | Description |
|------|-------------|
| Fresh migration | Run all migrations on empty database → no errors |
| Seed data | Run seed script → demo data present |
| Rollback | Rollback last migration → no data loss in previous schema |

### 5.2 Constraint Tests

| Test | Description |
|------|-------------|
| Unique email | Inserting duplicate email → unique violation error |
| Foreign key | Deleting user with active requests → constraint error |
| Enum values | Inserting invalid role → validation error |
| Not null | Inserting null for required field → constraint error |

---

## 6. AI Testing

### 6.1 Model Tests

| Test | Description |
|------|-------------|
| Model loads | Model file loads without error |
| Prediction returns | Given a valid image → returns category + confidence |
| Confidence range | Confidence values between 0.0 and 1.0 |
| All classes present | Prediction contains scores for all classes |
| Consistent results | Same image → same prediction (deterministic mode) |

### 6.2 AI API Tests

| Test | Description |
|------|-------------|
| Valid image → prediction | POST valid JPEG → 200, prediction JSON |
| Invalid file type | POST a `.txt` file → 400 |
| Large file | POST >5MB file → 400 |
| No file | POST without file → 400 |
| Corrupt image | POST corrupt JPEG → 400 or 500 with error |

### 6.3 Integration Tests

| Test | Description |
|------|-------------|
| Backend → AI success | Backend sends image to AI service → receives prediction → stores in `ai_predictions` |
| Backend → AI failure | AI service down → backend returns item without prediction → no error to user |
| Backend → AI timeout | AI takes >10s → timeout → graceful fallback |

---

## 7. Security Testing

### 7.1 Authentication Tests

| Test | Description |
|------|-------------|
| Weak password rejected | Password "abc" → validation error |
| JWT tampering | Modified JWT payload → 401 |
| Expired token | Token past expiry → 401 |
| Missing auth header | No Authorization header on protected route → 401 |

### 7.2 Authorization Tests

| Test | Description |
|------|-------------|
| Role boundary | Each role can only access its permitted endpoints |
| Resource ownership | Users cannot access resources they don't own |
| ADMIN-only routes | Non-admin cannot access `/admin/*` |

### 7.3 Input Validation Tests

| Test | Description |
|------|-------------|
| XSS in text fields | `<script>alert('xss')</script>` in name → sanitized/escaped |
| SQL injection in search | `'; DROP TABLE users; --` in search → no effect (Prisma parameterized) |
| Oversized payload | 1MB JSON body → 413 |
| Invalid file type disguised | `.jpg` extension but `.exe` magic bytes → rejected |

### 7.4 Rate Limiting Tests

| Test | Description |
|------|-------------|
| Login rate limit | 11th login attempt in 15 min → 429 |
| Recovery after window | Wait for rate limit window → requests succeed again |

---

## 8. End-to-End Testing

### 8.1 Critical User Flows

| Flow | Steps |
|------|-------|
| **Citizen submits e-waste** | Register → Login → Submit item → Create request → Submit request → Verify status |
| **Collector accepts and completes** | Login → Browse requests → Accept → Start pickup → Complete pickup → Verify items collected |
| **Consignment to recycler** | Collector creates consignment → Recycler accepts → Start processing → Complete recycling |
| **Admin verifies user** | Admin login → View pending verifications → Approve collector → Collector can now browse |
| **Full traceability** | Complete entire flow → Citizen views traceability → All steps shown |

### 8.2 Android Application & Device Acceptance Criteria

| Criteria | Target | Verification Method |
|----------|--------|---------------------|
| All critical mobile flows pass | 100% pass | Physical Android phone / Emulator execution |
| Camera image capture & compression | < 1MB JPEG output | Verified during photo capture on physical device |
| GPS location capture | Accurate coordinates within 100m | Device GPS sensor test in pickup creation |
| Runtime permissions handling | Graceful fallback on denial | Camera/Location denial triggers explanatory dialog |
| Intermittent network handling | Actions queued without crash | Airplane mode toggling test with offline action queue |
| Zero unhandled exceptions | Clean logcat output | Android Logcat monitoring during user walkthroughs |
| Response times | API responses < 500ms (excluding AI) | Network inspector verification |
| Screen density adaptability | No clipped text or layout overflow | Tested on small (360dp) and standard (411dp) screens |
| Android OS version range | 100% functional on Android 7.0+ to Android 16+ | Validated on API 24 (Nougat) emulator and API 34+ modern physical device |

---

## 9. Test Data

### 9.1 Test Users

| Email | Role | Password | Status |
|-------|------|----------|--------|
| `citizen@test.com` | CITIZEN | `Test1234` | ACTIVE |
| `collector@test.com` | INFORMAL_COLLECTOR | `Test1234` | ACTIVE (verified) |
| `collector2@test.com` | INFORMAL_COLLECTOR | `Test1234` | PENDING_VERIFICATION |
| `recycler@test.com` | RECYCLER | `Test1234` | ACTIVE (verified) |
| `admin@test.com` | ADMIN | `Admin1234` | ACTIVE |

### 9.2 Test Database

- Use a separate test database (e.g., `ecosetu_test`)
- Reset before each test suite
- Seed with known test data
- Never test against production/demo data

---

*All terminology in this document follows `00_PROJECT_INDEX.md`.*
