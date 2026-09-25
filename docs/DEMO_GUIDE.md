# ECOSETU — Evaluator Demonstration Guide

This guide provides step-by-step instructions for evaluating and testing the **EcoSetu** platform during demonstration or review sessions.

---

## 1. Quick Setup & Environment Preparation

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- Expo CLI / Android Studio / Android Device (for mobile testing)
- Python 3.10+ (for AI service local testing)

### Step 1: Install Dependencies
```bash
# Backend dependencies
cd backend
npm install

# Mobile dependencies
cd ../mobile
npm install
```

### Step 2: Environment Configuration
1. Copy `.env.example` to `.env` in `backend/` and `mobile/`.
2. Ensure `DATABASE_URL` points to your PostgreSQL instance (or use the pre-configured cloud database in `.env`).

### Step 3: Launch Services
```bash
# Terminal 1: Backend API
cd backend
npm run dev

# Terminal 2: Mobile Application
cd mobile
npx expo start --android
```

---

## 2. Step-by-Step Evaluator Test Scenarios

### Scenario A: Citizen Onboarding & E-Waste Submission
1. **Launch App**: Open the EcoSetu mobile application on an Android device or emulator.
2. **Onboarding & Language**: Swipe through the 5-slide visual onboarding carousel. Select a preferred language (e.g. English, Hindi, Marathi, Odia).
3. **Register / Login as Citizen**:
   - Tap **Get Started** -> Choose **Citizen** role.
   - Or Sign In with demo credentials: `citizen@ecosetu.org` / `Password123!`.
4. **Submit E-Waste Item**:
   - Tap **Submit Item** on the dashboard.
   - Capture/select an e-waste item image (e.g., printed circuit board, smartphone).
   - Observe the **AI E-Waste Classifier** detecting the material category, estimated recovery valuation, and Green Credit points.
   - Confirm and submit the collection request.

---

### Scenario B: Collector Logistics & Offline Pickup
1. **Switch Role / Login as Collector**:
   - Sign In with demo credentials: `collector@ecosetu.org` / `Password123!`.
2. **Browse & Accept Requests**:
   - Inspect the **Browse Requests** map view or list.
   - Tap an incoming pickup request -> Tap **Accept Pickup**.
3. **Complete Pickup**:
   - Navigate to the pickup detail view.
   - Enter measured item weight (kg) and confirm condition.
   - Complete handover and trigger instant digital payment confirmation.
4. **Offline Mode Testing**:
   - Toggle Device Airplane Mode ON.
   - Record a new collection pickup.
   - Observe the item saved to the local **SQLite sync queue**.
   - Toggle Airplane Mode OFF -> Observe automatic background sync.

---

### Scenario C: Recycler Batch Ingestion & Facility Management
1. **Login as Recycler**:
   - Sign In with demo credentials: `recycler@ecosetu.org` / `Password123!`.
2. **Incoming Consignments**:
   - View incoming consignments from informal collectors in **Facility Queue**.
   - Inspect material category breakdown, total batch weight, and origin details.
   - Tap **Accept & Confirm Ingestion**.
3. **EPR Batch Certificates**:
   - Generate a digital batch manifest with immutable chain-of-custody logging.

---

### Scenario D: Admin Control Center & System Telemetry
1. **Login as Administrator**:
   - Sign In with the configured ECOSETU administrator credentials (`admin@ecosetu.org`).
2. **Explore Sidebar Navigation (`AdminShell`)**:
   - Toggle the collapsible side drawer (expanded 220px / collapsed 60px icon mode).
   - Use global search palette (`Ctrl+K` or search bar).
3. **Inspect Key Admin Screens**:
   - **Dashboard**: View executive KPIs, collection funnel, action items, and live feed.
   - **Verifications**: Review pending collector/recycler authorization requests.
   - **Geographic Analytics**: Inspect regional facility cluster map and privacy-safe activity zones.
   - **System Health**: Run on-demand diagnostic checks to test API latency and database connections.
   - **Reports**: Export platform compliance summaries in CSV or text formats.

---

### Scenario E: EcoSaathi Vernacular Voice & AI Assistant
1. **Open EcoSaathi Assistant**: Tap the floating **EcoSaathi AI** button on any screen.
2. **Ask Questions**:
   - Ask about e-waste disposal guidelines, local collection points, or Green Credits.
   - Test speech synthesis (Read Aloud) in multiple Indian languages.

---

## 3. Demo Credentials Reference

| Role | Email | Password | Primary Purpose |
|---|---|---|---|
| **Citizen** | `citizen@ecosetu.org` | `Password123!` | Pickup requests & AI appraisal |
| **Collector** | `collector@ecosetu.org` | `Password123!` | Collection logistics & offline queue |
| **Recycler** | `recycler@ecosetu.org` | `Password123!` | Facility ingestion & EPR manifest |
| **Admin** | `admin@ecosetu.org` | *Use configured administrator credentials* | Control center & platform telemetry |
