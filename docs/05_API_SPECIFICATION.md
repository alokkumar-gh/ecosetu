# EcoSetu — API Specification

> **Reference:** All terminology follows `00_PROJECT_INDEX.md`.

---

## 1. API Overview

The EcoSetu REST API is strictly client-independent. It is consumed by the **EcoSetu Android Application** for all mobile operations (including image capture uploads and GPS coordinate logging) and will equally serve the future deferred web portal without modifications.

- **Base URL:** `/api/v1`
- **Protocol:** HTTPS (HTTP in development)
- **Format:** JSON request/response bodies
- **Authentication:** JWT Bearer token in `Authorization` header (`Bearer <access_token>`)
- **Content-Type:** `application/json` (unless file upload, then `multipart/form-data`)

### Common Headers

| Header | Value | Required |
|--------|-------|:--------:|
| `Content-Type` | `application/json` | Yes |
| `Authorization` | `Bearer <access_token>` | On protected routes |

### Common Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": [{ "field": "email", "message": "Email is required" }]
  }
}
```

### Common Error Codes

| HTTP Status | Error Code | Meaning |
|:-----------:|-----------|---------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource state conflict |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

---

## 2. Authentication Endpoints

### POST `/api/v1/auth/register`

Register a new user.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | No |
| **Roles** | Public |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|:--------:|-----------|
| `email` | string | Yes | Valid email, max 255 chars |
| `password` | string | Yes | Min 8 chars, must contain letter + number |
| `name` | string | Yes | Min 2 chars, max 100 chars |
| `phone` | string | No | Valid phone format |
| `role` | string | Yes | One of: `CITIZEN`, `INFORMAL_COLLECTOR`, `RECYCLER` |

**Success Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "string",
      "name": "string",
      "role": "CITIZEN",
      "status": "ACTIVE"
    },
    "accessToken": "jwt_string"
  }
}
```

**Error Responses:** `400` (validation), `409` (email exists)

---

### POST `/api/v1/auth/login`

Authenticate an existing user.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | No |
| **Roles** | Public |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|:--------:|-----------|
| `email` | string | Yes | Valid email |
| `password` | string | Yes | Non-empty |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "string",
      "name": "string",
      "role": "string",
      "status": "string"
    },
    "accessToken": "jwt_string"
  }
}
```

**Error Responses:** `400` (validation), `401` (invalid credentials), `403` (account suspended)

**Notes:** Refresh token is set as httpOnly cookie.

---

### POST `/api/v1/auth/refresh`

Refresh an expired access token.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Refresh token cookie |
| **Roles** | Any authenticated |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_string"
  }
}
```

**Error Responses:** `401` (invalid/expired refresh token)

---

### POST `/api/v1/auth/logout`

Clear refresh token.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | Any authenticated |

**Success Response:** `200 OK`

---

## 3. User Endpoints

### GET `/api/v1/users/me`

Get current user profile.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | Any authenticated |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "string",
      "name": "string",
      "phone": "string",
      "role": "string",
      "status": "string",
      "avatarUrl": "string",
      "createdAt": "ISO8601"
    }
  }
}
```

---

### PATCH `/api/v1/users/me`

Update current user profile.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | Any authenticated |

**Request Body (partial):**

| Field | Type | Required | Validation |
|-------|------|:--------:|-----------|
| `name` | string | No | Min 2, max 100 chars |
| `phone` | string | No | Valid phone format |

**Success Response:** `200 OK`

---

### PATCH `/api/v1/users/me/avatar`

Upload profile avatar.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | Any authenticated |
| **Content-Type** | `multipart/form-data` |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|:--------:|-----------|
| `avatar` | file | Yes | JPEG/PNG, max 2MB |

**Success Response:** `200 OK`

---

## 4. Collector Endpoints

### GET `/api/v1/collectors/profile`

Get current collector's profile.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `INFORMAL_COLLECTOR` |

**Success Response:** `200 OK` — Returns collector profile with user data.

---

### PUT `/api/v1/collectors/profile`

Create or update collector profile.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `INFORMAL_COLLECTOR` |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|:--------:|-----------|
| `serviceAreaLat` | number | No | Valid latitude (-90 to 90) |
| `serviceAreaLng` | number | No | Valid longitude (-180 to 180) |
| `serviceRadiusKm` | number | No | 1 to 50 |
| `bio` | string | No | Max 500 chars |

**Success Response:** `200 OK`

---

### PATCH `/api/v1/collectors/availability`

Toggle collector availability.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `INFORMAL_COLLECTOR` (verified) |

**Request Body:**

| Field | Type | Required |
|-------|------|:--------:|
| `isAvailable` | boolean | Yes |

**Success Response:** `200 OK`

---

### GET `/api/v1/collectors/stats`

Get collector statistics.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `INFORMAL_COLLECTOR` |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "totalPickups": 12,
    "totalWeightKg": 45.5,
    "totalConsignments": 5,
    "activeRequests": 2
  }
}
```

---

## 5. Recycler Endpoints

### GET `/api/v1/recyclers/profile`

Get current recycler's profile.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `RECYCLER` |

---

### PUT `/api/v1/recyclers/profile`

Create or update recycler profile.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `RECYCLER` |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|:--------:|-----------|
| `facilityName` | string | Yes | Max 200 chars |
| `facilityAddress` | string | Yes | Non-empty |
| `facilityLat` | number | No | Valid latitude |
| `facilityLng` | number | No | Valid longitude |
| `licenseNumber` | string | No | Max 100 chars |
| `acceptedCategories` | string[] | Yes | Array of valid category IDs |

**Success Response:** `200 OK`

---

### GET `/api/v1/recyclers`

List all verified recyclers (for collectors creating consignments).

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `INFORMAL_COLLECTOR`, `ADMIN` |

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by accepted category |

**Success Response:** `200 OK` — Array of recycler profiles (public info only).

---

## 6. E-Waste Item Endpoints

### POST `/api/v1/ewaste-items`

Submit a new e-waste item.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `CITIZEN` |
| **Content-Type** | `multipart/form-data` |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|:--------:|-----------|
| `category` | string | Yes | Valid canonical category |
| `description` | string | No | Max 500 chars |
| `quantity` | integer | No | Default 1, min 1, max 100 |
| `condition` | string | No | `WORKING`, `NOT_WORKING`, `DAMAGED`, `UNKNOWN` |
| `estimatedWeightKg` | number | No | Min 0.01, max 500 |
| `image` | file | No | JPEG/PNG, max 5MB |
| `requestAiPrediction` | boolean | No | If true, triggers AI classification |

**Success Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "item": {
      "id": "uuid",
      "category": "LAPTOP",
      "description": "Old HP laptop, broken screen",
      "quantity": 1,
      "condition": "DAMAGED",
      "imageUrl": "https://...",
      "status": "SUBMITTED"
    },
    "aiPrediction": {
      "predictedCategory": "LAPTOP",
      "confidence": 0.92,
      "modelVersion": "v1.0"
    }
  }
}
```

**Notes:** `aiPrediction` is null if `requestAiPrediction` is false or AI service is unavailable.

---

### GET `/api/v1/ewaste-items`

List current user's e-waste items.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `CITIZEN` |

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by item status |
| `category` | string | Filter by category |
| `page` | integer | Page number (default 1) |
| `limit` | integer | Items per page (default 20, max 50) |

**Success Response:** `200 OK` — Paginated list.

---

### GET `/api/v1/ewaste-items/:id`

Get a specific e-waste item.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `CITIZEN` (own), `INFORMAL_COLLECTOR` (assigned), `RECYCLER` (consigned), `ADMIN` |

**Success Response:** `200 OK`

**Error Responses:** `403` (not authorized to view), `404` (not found)

---

### GET `/api/v1/ewaste-items/:id/traceability`

Get full lifecycle traceability for an item.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `CITIZEN` (own), `ADMIN` |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "item": { "id": "uuid", "category": "LAPTOP", "createdAt": "ISO8601" },
    "events": [
      { "event": "SUBMITTED", "timestamp": "ISO8601", "actor": "Citizen Name" },
      { "event": "COLLECTED", "timestamp": "ISO8601", "actor": "Collector Name" },
      { "event": "CONSIGNED", "timestamp": "ISO8601", "actor": "Collector Name" },
      { "event": "RECYCLED", "timestamp": "ISO8601", "actor": "Recycler Facility" }
    ]
  }
}
```

---

## 7. Collection Request Endpoints

### POST `/api/v1/collection-requests`

Create a new collection request.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `CITIZEN` |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|:--------:|-----------|
| `itemIds` | string[] | Yes | Array of e-waste item UUIDs (min 1) |
| `pickupAddress` | string | Yes | Non-empty, max 500 chars |
| `pickupLat` | number | Yes | Valid latitude |
| `pickupLng` | number | Yes | Valid longitude |
| `preferredDate` | string | No | ISO date, must be today or future |
| `preferredTimeStart` | string | No | HH:mm format |
| `preferredTimeEnd` | string | No | HH:mm format, must be after start |
| `notes` | string | No | Max 500 chars |

**Success Response:** `201 Created`

**Error Responses:** `400` (invalid items), `409` (items already in another request)

---

### GET `/api/v1/collection-requests`

List collection requests for current user.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `CITIZEN` (own requests), `ADMIN` (all) |

**Query Parameters:** `status`, `page`, `limit`

---

### GET `/api/v1/collection-requests/available`

List available requests for collectors.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `INFORMAL_COLLECTOR` (verified) |

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `lat` | number | Collector's current latitude |
| `lng` | number | Collector's current longitude |
| `radiusKm` | number | Search radius (default: profile setting) |
| `page` | integer | Page number |
| `limit` | integer | Items per page |

**Success Response:** `200 OK` — Returns requests with status `SUBMITTED`, within radius. Addresses are approximate (not exact) until accepted.

---

### GET `/api/v1/collection-requests/:id`

Get specific request details.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `CITIZEN` (own), `INFORMAL_COLLECTOR` (accepted), `ADMIN` |

---

### POST `/api/v1/collection-requests/:id/submit`

Move request from DRAFT to SUBMITTED.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `CITIZEN` (own) |

**Validation:** Request must be in `DRAFT` status and have at least 1 item.

**Success Response:** `200 OK`

---

### POST `/api/v1/collection-requests/:id/accept`

Collector accepts a request.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `INFORMAL_COLLECTOR` (verified) |

**Validation:** Request must be in `SUBMITTED` status. Collector must be verified and available.

**Success Response:** `200 OK` — Creates a PICKUP record, updates request to `ACCEPTED`.

**Error Responses:** `409` (already accepted by another collector)

---

### POST `/api/v1/collection-requests/:id/cancel`

Cancel a collection request.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `CITIZEN` (own, before PICKED_UP), `ADMIN` |

**Request Body:**

| Field | Type | Required |
|-------|------|:--------:|
| `reason` | string | Yes |

**Validation:** Cannot cancel after `PICKED_UP`.

**Success Response:** `200 OK`

---

## 8. Pickup Endpoints

### GET `/api/v1/pickups`

List pickups for current collector.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `INFORMAL_COLLECTOR` |

**Query Parameters:** `status`, `page`, `limit`

---

### GET `/api/v1/pickups/:id`

Get pickup details.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `INFORMAL_COLLECTOR` (own), `CITIZEN` (own request), `ADMIN` |

---

### PATCH `/api/v1/pickups/:id/start`

Mark pickup as in progress.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `INFORMAL_COLLECTOR` (assigned) |

**Validation:** Pickup must be in `SCHEDULED` status.

**Success Response:** `200 OK` — Updates status to `IN_PROGRESS`, sets `started_at`.

---

### PATCH `/api/v1/pickups/:id/complete`

Mark pickup as completed.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `INFORMAL_COLLECTOR` (assigned) |
| **Content-Type** | `multipart/form-data` |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|:--------:|-----------|
| `totalWeightKg` | number | Yes | Min 0.01 |
| `collectorNotes` | string | No | Max 500 chars |
| `pickupPhoto` | file | No | JPEG/PNG, max 5MB |
| `items` | JSON | Yes | Array of `{ itemId, actualWeightKg }` |

**Validation:** Pickup must be in `IN_PROGRESS` status.

**Success Response:** `200 OK` — Updates pickup to `COMPLETED`, request to `PICKED_UP`, item statuses to `COLLECTED`.

---

## 9. Consignment Endpoints

### POST `/api/v1/consignments`

Create a consignment to a recycler.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `INFORMAL_COLLECTOR` (verified) |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|:--------:|-----------|
| `recyclerId` | string | Yes | Valid recycler profile UUID |
| `itemIds` | string[] | Yes | Array of collected item UUIDs |
| `totalWeightKg` | number | No | Min 0.01 |
| `deliveryNotes` | string | No | Max 500 chars |

**Validation:** Items must be in `COLLECTED` status. Recycler must be verified.

**Success Response:** `201 Created`

---

### GET `/api/v1/consignments`

List consignments.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `INFORMAL_COLLECTOR` (own), `RECYCLER` (received), `ADMIN` |

**Query Parameters:** `status`, `page`, `limit`

---

### PATCH `/api/v1/consignments/:id/deliver`

Mark consignment as delivered.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `INFORMAL_COLLECTOR` (own) |

**Validation:** Status must be `CREATED` or `IN_TRANSIT`.

**Success Response:** `200 OK` — Updates to `DELIVERED`.

---

### PATCH `/api/v1/consignments/:id/accept`

Recycler accepts a delivered consignment.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `RECYCLER` (assigned) |

**Validation:** Status must be `DELIVERED`.

**Success Response:** `200 OK` — Updates to `ACCEPTED`, creates a recycling record with status `RECEIVED`.

---

### PATCH `/api/v1/consignments/:id/reject`

Recycler rejects a consignment.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `RECYCLER` (assigned) |

**Request Body:**

| Field | Type | Required |
|-------|------|:--------:|
| `reason` | string | Yes |

**Success Response:** `200 OK` — Updates to `REJECTED`.

---

## 10. Recycling Record Endpoints

### GET `/api/v1/recycling-records`

List recycling records.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `RECYCLER` (own), `ADMIN` |

---

### PATCH `/api/v1/recycling-records/:id/start-processing`

Begin processing materials.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `RECYCLER` (own) |

**Validation:** Status must be `RECEIVED`.

---

### PATCH `/api/v1/recycling-records/:id/complete`

Mark recycling as completed.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `RECYCLER` (own) |
| **Content-Type** | `multipart/form-data` |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|:--------:|-----------|
| `processingNotes` | string | No | Max 1000 chars |
| `outputDescription` | string | No | Max 500 chars |
| `outputWeightKg` | number | No | Min 0 |
| `certificate` | file | No | PDF/JPEG/PNG, max 5MB |

**Validation:** Status must be `PROCESSING`.

**Success Response:** `200 OK` — Updates all linked items to `RECYCLED`, creates audit log entry.

---

## 11. AI Endpoints

### POST `/api/v1/ai/predict`

Classify an e-waste image.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `CITIZEN` |
| **Content-Type** | `multipart/form-data` |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|:--------:|-----------|
| `image` | file | Yes | JPEG/PNG, max 5MB |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "prediction": {
      "category": "LAPTOP",
      "confidence": 0.92,
      "allPredictions": [
        { "category": "LAPTOP", "confidence": 0.92 },
        { "category": "TABLET", "confidence": 0.05 },
        { "category": "MONITOR", "confidence": 0.02 }
      ],
      "modelVersion": "v1.0",
      "inferenceTimeMs": 340
    }
  }
}
```

**Error Responses:** `400` (invalid image), `503` (AI service unavailable)

**Notes:** If the AI service is down, the endpoint returns `503` and the frontend falls back to manual category selection. This is documented behavior, not a bug.

---

### POST `/api/v1/ai/feedback`

Submit user feedback on an AI prediction.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `CITIZEN` |

**Request Body:**

| Field | Type | Required |
|-------|------|:--------:|
| `predictionId` | string | Yes |
| `wasAccepted` | boolean | Yes |
| `correctedCategory` | string | No (required if wasAccepted = false) |

**Success Response:** `200 OK`

---

## 12. Verification Endpoints

### POST `/api/v1/verifications`

Submit a verification request.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `INFORMAL_COLLECTOR`, `RECYCLER` |
| **Content-Type** | `multipart/form-data` |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|:--------:|-----------|
| `document` | file | Yes | PDF/JPEG/PNG, max 5MB |

**Success Response:** `201 Created`

---

### GET `/api/v1/verifications/me`

Get current user's verification status.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `INFORMAL_COLLECTOR`, `RECYCLER` |

---

## 13. Notification Endpoints

### GET `/api/v1/notifications`

Get current user's notifications.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | Any authenticated |

**Query Parameters:** `unreadOnly` (boolean), `page`, `limit`

---

### PATCH `/api/v1/notifications/:id/read`

Mark a notification as read.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | Any authenticated (own notifications only) |

---

### PATCH `/api/v1/notifications/read-all`

Mark all notifications as read.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | Any authenticated |

---

### GET `/api/v1/notifications/count`

Get unread notification count.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | Any authenticated |

**Success Response:** `200 OK`

```json
{ "success": true, "data": { "unreadCount": 5 } }
```

---

### POST `/api/v1/notifications/device-token`

Register or refresh an Android FCM registration token for push delivery.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | Any authenticated |

**Request Body:**

| Field | Type | Required | Validation |
|---|---|:---:|---|
| `token` | string | Yes | 32 to 500 characters, valid token string |
| `platform` | string | No | Default: `'android'` |

**Success Response:** `200 OK`
```json
{ "success": true, "message": "Device token registered successfully" }
```

---

### DELETE `/api/v1/notifications/device-token`

Unregister / deactivate an Android FCM registration token on user logout.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | Any authenticated |

**Request Body:**

| Field | Type | Required | Validation |
|---|---|:---:|---|
| `token` | string | Yes | 32 to 500 characters |

**Success Response:** `200 OK`
```json
{ "success": true, "message": "Device token unregistered successfully" }
```

---

## 14. Administration Endpoints

### GET `/api/v1/admin/verifications`

List pending verification requests.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `ADMIN` |

**Query Parameters:** `status` (default: `PENDING`), `page`, `limit`

---

### PATCH `/api/v1/admin/verifications/:id`

Approve or reject a verification.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `ADMIN` |

**Request Body:**

| Field | Type | Required |
|-------|------|:--------:|
| `status` | string | Yes (`APPROVED` or `REJECTED`) |
| `reviewNotes` | string | No |

**Side Effects:** If approved, updates user status to `ACTIVE`. Sends notification.

---

### GET `/api/v1/admin/users`

List all users.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `ADMIN` |

**Query Parameters:** `role`, `status`, `search` (name/email), `page`, `limit`

---

### PATCH `/api/v1/admin/users/:id/status`

Update user account status.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `ADMIN` |

**Request Body:**

| Field | Type | Required |
|-------|------|:--------:|
| `status` | string | Yes (`ACTIVE`, `SUSPENDED`, `DEACTIVATED`) |
| `reason` | string | No |

---

### GET `/api/v1/admin/analytics`

Get platform analytics.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `ADMIN` |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "totalUsers": { "citizen": 50, "collector": 10, "recycler": 3 },
    "totalRequests": 120,
    "totalPickups": 85,
    "totalConsignments": 30,
    "totalRecycled": 25,
    "totalWeightKg": 450.5,
    "recentActivity": []
  }
}
```

---

### GET `/api/v1/admin/audit-logs`

View audit trail.

| Attribute | Value |
|-----------|-------|
| **Auth Required** | Yes |
| **Roles** | `ADMIN` |

**Query Parameters:** `action`, `entityType`, `actorId`, `startDate`, `endDate`, `page`, `limit`

---

## 15. Rate Limits

| Endpoint Group | Limit |
|---------------|-------|
| Auth (login/register) | 10 requests per 15 minutes per IP |
| AI prediction | 20 requests per hour per user |
| File upload | 30 requests per hour per user |
| All other endpoints | 100 requests per 15 minutes per user |

---

*All terminology in this document follows `00_PROJECT_INDEX.md`.*
