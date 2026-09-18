# EcoSetu — SIH Demo Flow

> **Reference:** All terminology follows `00_PROJECT_INDEX.md`.

---

## Demo Overview

**Duration:** ~10-12 minutes

**Demonstration Setup:**
- Live **Android physical smartphone** running the installed `EcoSetu` Release APK (`app-release.apk`)
- Screen mirrored to presentation laptop/projector via `scrcpy` (or Android Emulator as secondary mirror)
- Cloud backend hosted on Render + PostgreSQL on Neon

**Demo accounts pre-seeded:**
- `citizen@demo.com` (CITIZEN, ACTIVE)
- `collector@demo.com` (INFORMAL_COLLECTOR, ACTIVE/verified)
- `recycler@demo.com` (RECYCLER, ACTIVE/verified)
- `admin@demo.com` (ADMIN, ACTIVE)
- `newcollector@demo.com` (INFORMAL_COLLECTOR, PENDING_VERIFICATION)

---

## Step 1: Platform Introduction (30 seconds)

| Attribute | Detail |
|-----------|--------|
| **Actor** | Presenter (on Android App) |
| **Screen** | Landing / Splash Screen on Android |
| **Action** | Open EcoSetu Android app; introduce product vision |
| **Backend** | None |
| **Database** | None |
| **Expected Result** | Audience understands problem statement 26229 and the 3 stakeholders |
| **Mock/Prototype?** | No — functional Android mobile screen |

**Talking points:**
- "India generates over 3.2 million tonnes of e-waste annually"
- "Over 90% is collected by informal collectors without formal traceability"
- "EcoSetu bridges the informal collector into the formal recycling chain through this Android application"

---

## Step 2: Citizen Registration & Mobile Auth (1 minute)

| Attribute | Detail |
|-----------|--------|
| **Actor** | Citizen (new mobile user) |
| **Screen** | Register Screen |
| **Action** | Register new citizen account on phone |
| **Backend** | `POST /api/v1/auth/register` |
| **Database** | Creates `users` record with role `CITIZEN`, status `ACTIVE` |
| **Expected Result** | Account created; JWT saved to AsyncStorage; navigates to Citizen Dashboard |
| **Mock/Prototype?** | No — real registration |

---

## Step 3: Camera Capture & AI E-Waste Identification (2 minutes)

| Attribute | Detail |
|-----------|--------|
| **Actor** | Citizen |
| **Screen** | Submit E-Waste Screen |
| **Action** | Tap "Take Photo"; capture real laptop/phone using device camera; AI suggests category; submit item |
| **Backend** | `POST /api/v1/ewaste-items` (multipart) → `POST /predict` (FastAPI) |
| **Database** | Creates `ewaste_items` record, `ai_predictions` record |
| **Expected Result** | Camera captures photo → local compression (< 1MB) → AI predicts "Laptop (92% confidence)" → citizen confirms |
| **Mock/Prototype?** | AI inference is live using fine-tuned YOLOv8 |

**Talking points:**
- "The citizen takes a photo directly using their phone's camera"
- "The app validates and compresses the photo locally to ensure low cellular data usage"
- "Our YOLOv8 model classifies the e-waste category with confidence feedback"
- "The citizen retains full agency: they can accept the suggestion or select manually"

---

## Step 4: Collection Request with GPS Location (1 minute)

| Attribute | Detail |
|-----------|--------|
| **Actor** | Citizen |
| **Screen** | Create Collection Request Screen |
| **Action** | Select submitted item, tap "Use GPS Location", adjust pin on map, submit |
| **Backend** | `POST /api/v1/collection-requests` |
| **Database** | Creates `collection_requests` record with status `SUBMITTED` |
| **Expected Result** | Request created with GPS coordinates; status: "Waiting for collector" |
| **Mock/Prototype?** | Real GPS sensor coordinate capture and OpenStreetMap rendering |

---

## Step 5: Collector Onboarding & Admin Verification (1 minute)

| Attribute | Detail |
|-----------|--------|
| **Actor** | New Collector → Admin |
| **Screen** | Verification Submission → Admin Verification Queue |
| **Action** | Show `newcollector@demo.com` pending verification; switch to Admin View in app; review and approve |
| **Backend** | `PATCH /api/v1/admin/verifications/:id` |
| **Database** | Updates `verifications` to APPROVED, `users` status to ACTIVE |
| **Expected Result** | Collector account activated; can now browse nearby requests |
| **Mock/Prototype?** | Real approval flow inside Android Admin interface |

---

## Step 6: Collector Discovers & Accepts Request (1 minute)

| Attribute | Detail |
|-----------|--------|
| **Actor** | Collector (`collector@demo.com`) |
| **Screen** | Available Requests Screen (Map & List view) |
| **Action** | View map pins of nearby requests; open request detail; tap "Accept Request" |
| **Backend** | `GET /api/v1/collection-requests/available`, `POST /api/v1/collection-requests/:id/accept` |
| **Database** | Updates request to `ACCEPTED`, creates `pickups` record |
| **Expected Result** | Request accepted; full address and citizen contact now revealed |
| **Mock/Prototype?** | Real Haversine spatial filtering on mobile map |

---

## Step 7: Pickup Execution & Photo Proof (1 minute)

| Attribute | Detail |
|-----------|--------|
| **Actor** | Collector |
| **Screen** | Pickup Execution Screen |
| **Action** | Enter verified item weight, take photo proof with phone camera, complete pickup |
| **Backend** | `PATCH /api/v1/pickups/:id/complete` |
| **Database** | Updates pickup to `COMPLETED`, items to `COLLECTED` |
| **Expected Result** | Pickup completed; citizen receives in-app/push notification |
| **Mock/Prototype?** | Real mobile camera proof and weight logging |

---

## Step 8: Consignment to Authorized Recycler (1 minute)

| Attribute | Detail |
|-----------|--------|
| **Actor** | Collector |
| **Screen** | Create Consignment Screen |
| **Action** | Select collected items, select verified recycler from list, create consignment |
| **Backend** | `POST /api/v1/consignments` |
| **Database** | Creates `consignments` and `consignment_items` records |
| **Expected Result** | Consignment created with status `CREATED`; recycler notified |
| **Mock/Prototype?** | Real flow |

---

## Step 9: Recycler Receives & Completes Recycling (1 minute)

| Attribute | Detail |
|-----------|--------|
| **Actor** | Recycler (`recycler@demo.com`) |
| **Screen** | Incoming Consignments → Recycling Records Screen |
| **Action** | Accept consignment; start processing; mark recycling completed |
| **Backend** | `PATCH /api/v1/consignments/:id/accept`, `PATCH /api/v1/recycling-records/:id/complete` |
| **Database** | Creates `recycling_records`, updates items to `RECYCLED` |
| **Expected Result** | Full formal recycling chain recorded |
| **Mock/Prototype?** | Real flow |

---

## Step 10: End-to-End Item Traceability (1 minute)

| Attribute | Detail |
|-----------|--------|
| **Actor** | Citizen (switch back to citizen account) |
| **Screen** | Item Traceability Screen |
| **Action** | Open the item submitted in Step 3; view full lifecycle stepper |
| **Backend** | `GET /api/v1/ewaste-items/:id/traceability` |
| **Database** | Aggregates lifecycle events from all tables |
| **Expected Result** | Visual stepper showing: Submitted → Collected → Consigned → Recycled with timestamps, collector name, and recycler facility |
| **Mock/Prototype?** | Real dynamic data generated during the live demo |

**Talking points:**
- "This closes the loop: end-to-end traceability on a smartphone"
- "Citizens have verifiable proof their electronics were formally recycled rather than dumped or burned"

---

## Step 11: Admin Monitoring & Wrap-Up (1 minute)

| Attribute | Detail |
|-----------|--------|
| **Actor** | Admin / Presenter |
| **Screen** | Admin Dashboard Screen |
| **Action** | Show live metrics (users, pickups completed, kg recycled); outline future web portal roadmap |
| **Backend** | `GET /api/v1/admin/analytics` |
| **Expected Result** | Live metrics reflecting today's transactions |

**Talking points:**
- "Grassroots informal collectors now have a simple, digital, mobile identity"
- "The Android app handles offline field conditions and device camera scanning"
- "The backend API is client-independent, enabling future web portal rollout for institutional clients"

---

## Demo Fallback Plan

| Issue | Fallback |
|-------|----------|
| Phone mirroring fails | Switch to Android Emulator on laptop |
| Cellular / Wi-Fi drops | App demonstrates offline action queuing with local persistence |
| Backend cold start | Pre-warm Render instances 5 minutes before judging |
| AI service unresponsive | Manual category picker fallback within mobile UI |
| Total network outage | Run local backend on `10.0.2.2` via emulator |

---

*All terminology in this document follows `00_PROJECT_INDEX.md`.*
