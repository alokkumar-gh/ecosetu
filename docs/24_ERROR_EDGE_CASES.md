# EcoSetu — Error and Edge Cases

> **Reference:** All terminology follows `00_PROJECT_INDEX.md`.

---

## 1. Collection Request Edge Cases

### EC-CR-01: No Collector Available

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Citizen submits a request but no collector accepts |
| **Detection** | Request remains in `SUBMITTED` status beyond 7 days |
| **Expected Behavior** | Request transitions to `EXPIRED` automatically (or on next access) |
| **User Impact** | Citizen notified: "No collector was available. Please create a new request." |
| **Recovery** | Citizen creates a new request |

### EC-CR-02: Collector Rejects / Ignores Request

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Collector views a request but doesn't accept it |
| **Expected Behavior** | Request stays in `SUBMITTED`; visible to other collectors |
| **Note** | There is no explicit "reject" action for browsing — collectors simply don't accept |

### EC-CR-03: Two Collectors Try to Accept Simultaneously

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Race condition: two collectors click "Accept" at the same time |
| **Expected Behavior** | First request succeeds (200); second receives `409 CONFLICT` |
| **Implementation** | Database transaction with status check: `WHERE status = 'SUBMITTED'` ensures only one can succeed |

### EC-CR-04: Citizen Cancels After Acceptance

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Citizen cancels request after a collector has accepted but before pickup |
| **Expected Behavior** | Request → `CANCELLED`, Pickup → `CANCELLED`, collector notified |
| **Cancellation reason** | Required (citizen must explain) |

### EC-CR-05: Request with Zero Items

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Citizen tries to submit request without any items |
| **Expected Behavior** | Validation error: "At least one item is required" |
| **Enforcement** | Server-side validation on `POST /api/v1/collection-requests` |

### EC-CR-06: Duplicate Items in Multiple Requests

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Citizen tries to add the same item to two active requests |
| **Expected Behavior** | `409 CONFLICT`: "One or more items are already in an active request" |
| **Enforcement** | Service layer checks item status before associating with request |

---

## 2. Pickup Edge Cases

### EC-PU-01: Collector Cannot Reach Location

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Collector accepted but cannot physically reach the pickup location |
| **Expected Behavior** | Collector can cancel the pickup (status → `CANCELLED`, request → `SUBMITTED` to allow re-acceptance) |
| **Future** | Add a "report issue" flow with admin notification |

### EC-PU-02: Items Don't Match Request

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Collector arrives and finds items different from description |
| **Expected Behavior** | Collector updates actual item details during pickup completion (weight, notes). Collector can mark discrepancy in notes. |
| **Note** | For MVP, there is no formal dispute system. Collector completes pickup with accurate data. |

### EC-PU-03: Partial Pickup

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Collector can only collect some items (e.g., item too heavy) |
| **Expected Behavior** | Collector marks individual items as collected/not-collected during pickup completion |
| **Implementation** | Items array in completion request allows per-item status |

---

## 3. Consignment Edge Cases

### EC-CO-01: Recycler Rejects Consignment

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Recycler inspects material and rejects it |
| **Expected Behavior** | Consignment → `REJECTED` with reason; collector notified; items remain in `COLLECTED` status |
| **Recovery** | Collector can create a new consignment to a different recycler |

### EC-CO-02: Items in Wrong Status

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Attempt to consign items that aren't in `COLLECTED` status |
| **Expected Behavior** | `400 VALIDATION_ERROR`: "Items must be in COLLECTED status" |
| **Enforcement** | Service layer validates item statuses before consignment creation |

### EC-CO-03: Recycler Doesn't Accept Category

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Consignment contains items in categories the recycler doesn't accept |
| **Expected Behavior** | Recycler can still reject with reason "Material not accepted" |
| **Future** | Validate against recycler's `accepted_categories` during consignment creation |

---

## 4. AI Prediction Edge Cases

### EC-AI-01: AI Service Unavailable

| Attribute | Detail |
|-----------|--------|
| **Scenario** | AI microservice is down or unreachable |
| **Expected Behavior** | Backend returns item without prediction; frontend shows manual category selection |
| **User sees** | No error message (AI is optional); category selector is pre-selected to empty |
| **Logging** | Warning logged server-side |

### EC-AI-02: Low Confidence Prediction

| Attribute | Detail |
|-----------|--------|
| **Scenario** | AI returns confidence < 0.50 |
| **Expected Behavior** | Frontend shows "Could not identify. Please select manually." |
| **User action** | Manual category selection |

### EC-AI-03: Incorrect AI Prediction

| Attribute | Detail |
|-----------|--------|
| **Scenario** | AI confidently predicts wrong category |
| **Expected Behavior** | User overrides prediction; `was_accepted = false` and `user_corrected_category` logged |
| **Impact** | Correction data available for model improvement |

### EC-AI-04: Non-Electronics Image

| Attribute | Detail |
|-----------|--------|
| **Scenario** | User uploads photo of food, furniture, or other non-electronics |
| **Expected Behavior** | AI returns low confidence or incorrect prediction; user selects "OTHER" manually |
| **Note** | The model is not trained to detect "not electronics" — it will try to classify any image |

### EC-AI-05: AI Timeout

| Attribute | Detail |
|-----------|--------|
| **Scenario** | AI inference takes longer than 10 seconds |
| **Expected Behavior** | Backend times out; returns item without prediction; same as service unavailable |

---

## 5. File Upload Edge Cases

### EC-FU-01: Invalid File Type

| Attribute | Detail |
|-----------|--------|
| **Scenario** | User uploads `.pdf`, `.exe`, `.docx`, etc. as image |
| **Expected Behavior** | `400`: "Only JPEG and PNG images are accepted" |
| **Enforcement** | MIME type check + magic bytes verification |

### EC-FU-02: File Too Large

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Image exceeds 5MB limit |
| **Expected Behavior** | `400`: "File size must be under 5MB" |
| **Enforcement** | multer `limits.fileSize` + frontend validation |

### EC-FU-03: Corrupt Image

| Attribute | Detail |
|-----------|--------|
| **Scenario** | File has valid extension but corrupt content |
| **Expected Behavior** | Image storage may fail; `500` with generic error; user retries |

### EC-FU-04: Upload During Network Interruption

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Network drops during file upload |
| **Expected Behavior** | Frontend shows error: "Upload failed. Please try again." |
| **Recovery** | User retries upload |

---

## 6. Authentication Edge Cases

### EC-AUTH-01: Expired Access Token

| Attribute | Detail |
|-----------|--------|
| **Scenario** | User's access token expires during a session |
| **Expected Behavior** | API returns `401`; frontend attempts token refresh via refresh endpoint; if refresh succeeds, retries original request; if refresh fails, redirects to login |

### EC-AUTH-02: Expired Refresh Token

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Refresh token expires (7 days) |
| **Expected Behavior** | Refresh endpoint returns `401`; user must log in again |
| **User sees** | Redirected to login page with message "Session expired. Please log in again." |

### EC-AUTH-03: Suspended Account Login

| Attribute | Detail |
|-----------|--------|
| **Scenario** | User with `SUSPENDED` status tries to log in |
| **Expected Behavior** | Login returns `403`: "Your account has been suspended. Contact support." |

### EC-AUTH-04: Rate Limited Login

| Attribute | Detail |
|-----------|--------|
| **Scenario** | More than 10 login attempts from same IP in 15 minutes |
| **Expected Behavior** | `429`: "Too many login attempts. Please try again later." |
| **User sees** | Error message with approximate wait time |

---

## 7. Location Edge Cases

### EC-LOC-01: Browser Denies Location Access

| Attribute | Detail |
|-----------|--------|
| **Scenario** | User denies geolocation permission |
| **Expected Behavior** | Map centered on default location (Delhi); user manually places pin |
| **Note** | Geolocation is optional — manual pin placement always works |

### EC-LOC-02: Invalid Coordinates

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Request submitted with coordinates outside valid range |
| **Expected Behavior** | `400 VALIDATION_ERROR`: latitude must be -90 to 90, longitude -180 to 180 |

### EC-LOC-03: Collector Far From Any Requests

| Attribute | Detail |
|-----------|--------|
| **Scenario** | No collection requests within collector's service radius |
| **Expected Behavior** | Available requests list returns empty; empty state: "No requests in your area" |
| **Suggestion** | Collector can increase search radius |

---

## 8. Data Integrity Edge Cases

### EC-DI-01: Duplicate E-Waste Item Submission

| Attribute | Detail |
|-----------|--------|
| **Scenario** | User accidentally submits the same item twice |
| **Expected Behavior** | Both items are saved (no duplicate detection in MVP); user can delete draft items |
| **Note** | Automated duplicate detection is a future enhancement |

### EC-DI-02: Incorrect Weight Entry

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Collector enters unrealistic weight (e.g., 500kg for a phone) |
| **Expected Behavior** | Validation warning if weight > 50kg for a single item; collector can override with confirmation |
| **Note** | Soft validation (warning) rather than hard block |

### EC-DI-03: Incomplete Recycling Record

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Recycler marks processing as started but never completes |
| **Expected Behavior** | Record stays in `PROCESSING` status indefinitely |
| **Admin action** | Admin can view stale records via analytics; contact recycler |
| **Future** | Auto-reminder if processing exceeds expected duration |

---

## 9. Network and System Edge Cases

### EC-NET-01: Backend Unavailable

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Render backend spun down or crashed |
| **Expected Behavior** | Frontend shows error: "Unable to connect to server. Please try again." |
| **Recovery** | Render auto-restarts; user retries after ~30 seconds |

### EC-NET-02: Database Connection Lost

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Neon connection drops |
| **Expected Behavior** | Backend returns `500` for data operations; Prisma retries connection |
| **Logging** | Error logged server-side |

### EC-NET-03: Slow Network

| Attribute | Detail |
|-----------|--------|
| **Scenario** | User on slow 2G/3G network; requests take > 5 seconds |
| **Expected Behavior** | Loading skeleton screens display; image compression runs locally to minimize payload; request timeout set to 30s |

---

## 10. Android Mobile & Hardware Edge Cases

### EC-AND-01: Camera Permission Denied

| Attribute | Detail |
|-----------|--------|
| **Scenario** | User denies `android.permission.CAMERA` when prompted |
| **Expected Behavior** | App displays an educational dialog: *"Camera permission is required to photograph e-waste"*; provides "Open App Settings" button and "Pick from Gallery" fallback |
| **Recovery** | User grants permission in Android Settings or chooses photo from device gallery |

### EC-AND-02: Device GPS Disabled or Location Permission Denied

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Location services disabled in device quick settings or user denies `ACCESS_FINE_LOCATION` |
| **Expected Behavior** | App prompts user to enable GPS; if denied, falls back to manual street address entry and default city map coordinates |
| **Recovery** | Manual text entry ensures request submission is never completely blocked |

### EC-AND-03: Low Device Storage During Photo Capture

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Android device has < 50MB free storage when taking a photo |
| **Expected Behavior** | Camera service catches disk exception before compression/upload; shows friendly Snackbar: *"Insufficient device storage. Please free up space to take photos."* |
| **Recovery** | Prevents app crash; user can retry after clearing storage |

### EC-AND-04: Offline / Intermittent Field Connectivity

| Attribute | Detail |
|-----------|--------|
| **Scenario** | Collector completes a pickup in a basement or rural area with zero connectivity |
| **Expected Behavior** | Action is stored in `offlineQueue` in AsyncStorage; UI shows: *"Saved offline — will synchronize when back online"*; NetInfo triggers auto-sync upon reconnection |
| **Recovery** | Seamless background synchronization without data loss |

### EC-AND-05: App Backgrounded / Killed During Image Upload

| Attribute | Detail |
|-----------|--------|
| **Scenario** | User receives incoming phone call or OS kills app during multi-part image upload |
| **Expected Behavior** | Temporary compressed image URI remains in local cache; on app relaunch, citizen is prompted to resume or retry the submission |
| **Recovery** | Citizen does not need to re-photograph the e-waste item |

---

*All terminology in this document follows `00_PROJECT_INDEX.md`.*
