# EcoSetu — Notification System

> **Reference:** All terminology follows `00_PROJECT_INDEX.md`.

---

## 1. Overview

The notification system provides in-app alerts and Android notifications for the EcoSetu mobile application. Notifications are persisted in the `notifications` PostgreSQL database table and delivered to the user through the Android Top App Bar badge, the Notifications Screen tab, and Android system notification channels.

---

## 2. Notification Events

| Event | Trigger | Recipient(s) | Title | Message Template |
|-------|---------|-------------|-------|-----------------|
| `REQUEST_ACCEPTED` | Collector accepts a collection request | CITIZEN (request owner) | "Request Accepted" | "A collector has accepted your collection request." |
| `PICKUP_SCHEDULED` | Collector schedules pickup | CITIZEN (request owner) | "Pickup Scheduled" | "Your pickup is scheduled for {date}." |
| `PICKUP_COMPLETED` | Collector completes pickup | CITIZEN (request owner) | "Pickup Completed" | "Your e-waste has been collected. {itemCount} items, {weight}kg total." |
| `REQUEST_CANCELLED` | Citizen cancels accepted request | INFORMAL_COLLECTOR (assigned) | "Request Cancelled" | "The collection request has been cancelled by the citizen." |
| `CONSIGNMENT_INCOMING` | Collector creates consignment | RECYCLER (target) | "Incoming Consignment" | "A new consignment of {itemCount} items ({weight}kg) is being delivered." |
| `CONSIGNMENT_ACCEPTED` | Recycler accepts consignment | INFORMAL_COLLECTOR (creator) | "Consignment Accepted" | "Your consignment has been accepted by {recyclerName}." |
| `CONSIGNMENT_REJECTED` | Recycler rejects consignment | INFORMAL_COLLECTOR (creator) | "Consignment Rejected" | "Your consignment was rejected. Reason: {reason}" |
| `RECYCLING_COMPLETED` | Recycler completes recycling | CITIZEN (original owner) | "Recycling Complete" | "Your e-waste has been formally recycled by {recyclerName}." |
| `VERIFICATION_APPROVED` | Admin approves verification | INFORMAL_COLLECTOR or RECYCLER | "Verification Approved" | "Your account has been verified. You can now use the platform." |
| `VERIFICATION_REJECTED` | Admin rejects verification | INFORMAL_COLLECTOR or RECYCLER | "Verification Rejected" | "Your verification was not approved. Reason: {reason}. You can resubmit." |
| `ACCOUNT_SUSPENDED` | Admin suspends account | Affected user | "Account Suspended" | "Your account has been suspended. Reason: {reason}" |
| `ACCOUNT_REACTIVATED` | Admin reactivates account | Affected user | "Account Reactivated" | "Your account has been reactivated." |

---

## 3. Notification Data Model

| Field | Description |
|-------|-------------|
| `id` | UUID |
| `user_id` | Recipient |
| `type` | Event type (from table above) |
| `title` | Short title |
| `message` | Full message text |
| `is_read` | Boolean (default false) |
| `reference_type` | Entity type for deep-linking (e.g., `collection_request`, `consignment`) |
| `reference_id` | Entity ID for deep-linking |
| `created_at` | Timestamp |

---

## 4. Notification Delivery

### 4.1 Creation

Notifications are created server-side by the `notificationService` within the relevant business operation:

```
Service performs action (e.g., collector accepts request)
  → Status update saved to database
  → notificationService.create(citizenId, 'REQUEST_ACCEPTED', title, message, 'collection_request', requestId)
  → Both operations within same database transaction
```

### 4.2 Display

**Top App Bar Bell:**
- Displays red unread count badge
- Tapping navigates directly to `NotificationsScreen`

**Notifications Screen (FlatList):**
- Chronological list of user notifications
- Unread notifications highlighted with surface tint
- Tap notification card → deep-links to referenced entity screen (e.g. `RequestDetail`, `ConsignmentDetail`)
- "Mark All Read" action button in App Bar

### 4.3 Android System Notifications

- Created with Android Notification Channel: `ecosetu_alerts` (Importance: HIGH)
- Displays heads-up banner on phone when app is foregrounded or backgrounded
- Tapping system notification launches app directly to the relevant screen

### 4.4 Mobile Polling

- Mobile app checks `GET /api/v1/notifications/count` periodically while active
- Full notification list refreshed on pull-to-refresh or screen focus

### 4.5 Firebase Cloud Messaging (FCM) Push Delivery

- **Role:** Push notification delivery layer for the Android notification channel `ecosetu_alerts`.
- **Authoritative Source:** PostgreSQL `notifications` table remains authoritative. The database notification is always created and committed first.
- **Registration:** Authenticated Android client obtains registration token from Firebase and posts to `POST /api/v1/notifications/device-token`.
- **Unregistration:** Upon user logout, client calls `DELETE /api/v1/notifications/device-token` with the registration token.
- **Resilience:** FCM failure never breaks or rolls back database transactions. Stale tokens are deactivated automatically when FCM returns unregistration errors.

---

## 5. API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/notifications` | List notifications (paginated, optionally unread only) |
| `GET /api/v1/notifications/count` | Get unread count |
| `PATCH /api/v1/notifications/:id/read` | Mark single notification as read |
| `PATCH /api/v1/notifications/read-all` | Mark all as read |
| `POST /api/v1/notifications/device-token` | Register/activate Android FCM device token for authenticated user |
| `DELETE /api/v1/notifications/device-token` | Unregister/deactivate Android FCM device token on logout |

---

## 6. Notification Preferences

For the MVP, all notifications are enabled for all users. There is no preference system.

**Future enhancement:** Allow users to toggle notification types on/off.

---

## 7. Failure Handling

| Failure Scenario | Handling |
|-----------------|---------|
| Notification creation fails | Log error; do not fail the parent business operation |
| Notification table unavailable | Business operation continues; notification is lost (acceptable for MVP) |
| Too many notifications | Pagination handles display; no automatic cleanup in MVP |

---

## 8. Future Enhancements

| Enhancement | Description | Requirement |
|-------------|-------------|-------------|
| **Email notifications** | Send email for critical events | Email service (SendGrid free tier: 100/day) |
| **SMS notifications** | Send SMS for pickup reminders | SMS API (paid) |
| **Push notifications** | Remote Android push alerts when app is closed | Firebase Cloud Messaging (FCM) |
| **WhatsApp notifications** | Reach users on WhatsApp | WhatsApp Business API (paid) |
| **WebSocket** | Real-time notification delivery | Socket.io or native WebSocket |
| **Notification preferences** | User-controlled notification settings | Preferences table + UI |

---

*All terminology in this document follows `00_PROJECT_INDEX.md`.*
