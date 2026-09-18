# EcoSetu — Security and Privacy

> **Reference:** All terminology follows `00_PROJECT_INDEX.md`.

---

## 1. Security Overview

This document covers security measures appropriate for an SIH prototype. The measures are real (not fake) but proportional to the project's scope and threat model, covering both the client-independent backend and the Android mobile application.

---

## 2. Authentication Security

### 2.1 Password Handling

| Requirement | Implementation |
|-------------|---------------|
| Hashing algorithm | bcrypt |
| Salt rounds | 10 (minimum) |
| Minimum password length | 8 characters |
| Password complexity | At least 1 letter + 1 number |
| Plaintext storage | **FORBIDDEN** |
| Password in logs | **FORBIDDEN** |
| Password in API response | **FORBIDDEN** |

### 2.2 JWT Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Access token expiry | 15 minutes | Short-lived; limits damage if intercepted |
| Refresh token expiry | 7 days | Convenience for mobile users; reduces frequent re-login |
| Android token storage | App-private AsyncStorage (`@ecosetu_token`) | Sandboxed to EcoSetu Android package; inaccessible to other apps |
| Future Web token storage | In-memory + httpOnly cookie | Reserved for deferred web portal |
| Signing algorithm | HS256 | Standard, performant for prototype |
| Token secrets | Random 64+ character strings | Via environment variables |

### 2.3 Session Security

| Measure | Implementation |
|---------|---------------|
| Token refresh | Automatic on 401 via mobile API client wrapper |
| Logout | Client purges AsyncStorage tokens; server invalidates refresh token |
| Concurrent sessions | Allowed (multiple Android devices) |
| Token revocation | Handled via expiry and client-side purge (MVP scope) |

> **MVP Limitation:** True token revocation requires a blocklist (database or Redis). For the prototype, token expiry is the only revocation mechanism. This is acceptable for demo scale.

---

## 3. Authorization

### 3.1 Role-Based Access Control

- Every protected endpoint checks user role against allowed roles
- Authorization is enforced **server-side** in middleware
- Frontend hides unauthorized UI elements (UX only, not security)
- Resource ownership verified for endpoints that access specific records

### 3.2 Authorization Bypass Prevention

| Attack | Mitigation |
|--------|-----------|
| Changing role in JWT | JWT is signed; tampering invalidates signature |
| Accessing other user's resources | Ownership check in controller/service layer |
| Unverified user performing operations | `checkVerified` middleware on operational endpoints |
| Escalating to ADMIN | ADMIN role cannot be selected during registration; seeded only |

---

## 4. API Security

### 4.1 Input Validation

| Measure | Implementation |
|---------|---------------|
| Validation library | express-validator |
| Where validated | Server-side (always); client-side (UX only) |
| Sanitization | Trim strings, escape HTML in text fields |
| Type checking | Enforce expected types (string, number, UUID, enum) |
| Length limits | Max length on all string fields |
| Enum validation | Validate against canonical values (roles, statuses, categories) |

### 4.2 Rate Limiting

| Endpoint Group | Window | Max Requests | Per |
|---------------|--------|:------------:|-----|
| Auth (login/register) | 15 min | 10 | IP |
| AI prediction | 1 hour | 20 | User |
| File upload | 1 hour | 30 | User |
| General API | 15 min | 100 | User |

Rate limit headers in response:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

### 4.3 CORS

| Setting | Value |
|---------|-------|
| Allowed origin | `CORS_ORIGIN` env variable (specific domain, not `*`) |
| Allowed methods | GET, POST, PATCH, PUT, DELETE |
| Allowed headers | Content-Type, Authorization |
| Credentials | true (for refresh token cookie) |

### 4.4 HTTP Security Headers

Set via `helmet` middleware (or manual headers):

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `0` (rely on CSP instead) |
| `Strict-Transport-Security` | `max-age=31536000` (in production) |
| `Content-Security-Policy` | Restrictive policy appropriate for SPA |

### 4.5 Request Size Limits

| Type | Limit |
|------|-------|
| JSON body | 10KB |
| File upload | 5MB per file |
| URL parameters | Validated for type and range |

---

## 5. Database Security

| Measure | Implementation |
|---------|---------------|
| SQL injection | Prevented by Prisma ORM (parameterized queries) |
| Connection string | Via `DATABASE_URL` environment variable |
| Connection encryption | SSL required in production (Neon enforces this) |
| Least privilege | Database user has only necessary permissions |
| Audit logs | Append-only; no UPDATE/DELETE on `audit_logs` table |

---

## 6. File Upload Security

| Measure | Implementation |
|---------|---------------|
| Allowed types | JPEG, PNG (images); PDF (documents) |
| MIME type check | Validate `Content-Type` header |
| Magic bytes check | Verify first bytes match claimed type |
| File size limit | 5MB maximum |
| Filename sanitization | Generate UUID filenames; never use original filename in storage |
| Storage isolation | Uploads stored in separate directory/bucket from application code |
| No execution | Upload directory has no execute permissions |
| Virus scanning | Not implemented (MVP limitation) |

### Image-Specific Validation

1. Check file extension matches `.jpg`, `.jpeg`, `.png`
2. Check MIME type is `image/jpeg` or `image/png`
3. Check magic bytes: JPEG starts with `FF D8 FF`; PNG starts with `89 50 4E 47`
4. Reject if any check fails (prevents polyglot file attacks)

---

## 7. Location Data Security

| Data | Sensitivity | Protection |
|------|-------------|-----------|
| Pickup address (exact) | High | Visible only to assigned collector + admin |
| Pickup coordinates | High | Exact coords only for assigned collector; approximate area for browsing |
| Collector service area | Medium | Visible only to system (for matching) and admin |
| Recycler facility location | Low | Visible to verified collectors (for consignment) |

### Privacy Measure: Approximate Location for Browsing

When collectors browse available requests:
- Show approximate area (e.g., neighborhood name or 1km radius circle)
- Do NOT show exact address or pin location
- Exact address revealed only after acceptance

---

## 8. Secrets Management

### 8.1 Environment Variables

| Secret | Source | NEVER Do |
|--------|--------|----------|
| `JWT_ACCESS_SECRET` | `.env` file (local) / hosting platform secret store | Hardcode in source |
| `JWT_REFRESH_SECRET` | `.env` file / secret store | Commit to git |
| `DATABASE_URL` | `.env` file / secret store | Log in error messages |
| `CLOUDINARY_API_SECRET` | `.env` file / secret store | Expose in API response |

### 8.2 Rules

1. `.env` file MUST be in `.gitignore`
2. `.env.example` with placeholder values MUST be committed
3. No secrets in source code, comments, or documentation
4. No secrets in frontend environment variables (they are public)
5. Different secrets for development and production

---

## 9. Audit Logging

### 9.1 What Is Logged

| Event | Logged Data |
|-------|-------------|
| User registration | User ID, role, IP |
| Login success/failure | User ID (if found), IP, timestamp |
| Verification approved/rejected | User ID, admin ID, decision |
| Account suspended/reactivated | User ID, admin ID, reason |
| Collection request submitted | Request ID, citizen ID |
| Request accepted | Request ID, collector ID |
| Pickup completed | Pickup ID, collector ID, weight |
| Consignment created | Consignment ID, collector ID, recycler ID |
| Recycling completed | Record ID, recycler ID |

### 9.2 Audit Log Integrity

- Audit logs are **append-only** (no UPDATE, no DELETE)
- `created_at` is set by the database, not the application
- Each entry includes the actor (user or SYSTEM)
- IP address recorded for security-relevant events

---

## 10. Data Retention and Privacy

### 10.1 Data Minimization

| Data | Why Collected | Mandatory? | Retention |
|------|-------------|:----------:|-----------|
| Email | Authentication, notifications | Yes | Account lifetime |
| Name | Display in platform interactions | Yes | Account lifetime |
| Phone | Pickup coordination | No | Account lifetime; deletable by user |
| Password hash | Authentication | Yes | Account lifetime |
| Pickup address | Collection logistics | Yes (per request) | Retained for traceability |
| ID document | Verification | Yes (for collectors/recyclers) | Delete after verification complete (future) |
| E-waste photos | Item identification, AI input | No | Retained with item record |
| Location coordinates | Request matching, map display | Yes (per request) | Retained for traceability |

### 10.2 Data Access by Role

| Data | CITIZEN | COLLECTOR | RECYCLER | ADMIN |
|------|:-------:|:---------:|:--------:|:-----:|
| Own profile | ✅ | ✅ | ✅ | ✅ |
| Other user's email | ❌ | ❌ | ❌ | ✅ |
| Other user's phone | ❌ | Only assigned | Only consigned | ✅ |
| ID documents | ❌ | ❌ | ❌ | ✅ |
| Pickup addresses | Own only | Accepted only | ❌ | ✅ |
| Audit logs | ❌ | ❌ | ❌ | ✅ |

### 10.3 Right to Deletion (Future)

Not implemented in MVP but documented:
- Users should be able to request account deletion
- Deletion should anonymize personal data but preserve traceability records
- E-waste lifecycle records are retained (with anonymized actor references)

---

## 11. Threat Model

### 11.1 Common Threats and Mitigations

| Threat | Risk | Mitigation |
|--------|:----:|-----------|
| **Brute force login** | Medium | Rate limiting (10 attempts/15min), bcrypt slow hashing |
| **JWT theft** | Low | Short expiry (15min), sandboxed AsyncStorage, HTTPS |
| **SQL injection** | Low | Prisma ORM (parameterized queries) |
| **Mobile Reverse Engineering**| Medium | ProGuard / R8 bytecode shrinking and obfuscation |
| **Unauthorized Camera/GPS** | Low | Explicit Android runtime permissions requested on demand |
| **File upload attack** | Medium | Type/size validation, magic byte check, UUID filenames |
| **IDOR (accessing other's data)** | Medium | Ownership checks in service layer |
| **Privilege escalation** | Low | Server-side role checks, ADMIN not registerable |
| **Data exposure in logs** | Medium | Never log passwords, tokens, or PII |
| **Secrets in code** | Medium | `.env` files, `.gitignore`, env var validation on startup |
| **Denial of service** | Low | Rate limiting, request size limits |
| **Man-in-the-middle** | Low | HTTPS in production (Render enforce this) |

### 11.2 Android Application Security

1. **Sandboxed Local Storage:** Tokens and cached offline actions are stored within the Android application's sandboxed private storage directory (`/data/data/com.ecosetu/`), inaccessible to other applications without root privileges.
2. **Runtime Permissions:** Camera (`android.permission.CAMERA`), Location (`android.permission.ACCESS_FINE_LOCATION`), and Notifications are requested with user prompts only when the respective feature is actively triggered.
3. **Release Obfuscation:** The release APK uses Android R8 / ProGuard rules to minify code, strip debug symbols, and protect API route structures.

### 11.2 Accepted Risks (Prototype)

| Risk | Reason for Acceptance |
|------|----------------------|
| No token revocation blacklist | Acceptable for demo; tokens expire in 15 minutes |
| No 2FA | Excessive for SIH prototype |
| No encrypted database fields | Neon provides encryption at rest |
| No virus scanning on uploads | Acceptable for demo with validated file types |
| No WAF | Free-tier hosting doesn't include WAF |
| No penetration testing | Out of scope for student project |

---

*All terminology in this document follows `00_PROJECT_INDEX.md`.*
