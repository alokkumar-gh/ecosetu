# ECOSETU — BUSINESS-FIRST APP TRANSFORMATION MASTER PLAN
**SIH 2026 Problem Statement 26229 — Production-Oriented Supply Chain Architecture**

---

## 1. Executive Summary & Current Architecture Audit

### 1.1 Baseline Status
- **Git Commit Baseline:** `5eb21425b0aa7affe1fa11e6b5945dd3482625d7` (origin/main).
- **Physical Handset Verified:** vivo V2561 (Android 16, API 36, 1260x2800).
- **Current Architecture Model:** React Native (TypeScript) frontend communicating with Node.js/Express + PostgreSQL/Prisma backend. 
- **The Core Problem with Prior Redesign:** The prior discarded redesign attempted cosmetic overhaul (excessive glassmorphism, decorative cards, fragmented unlinked views) without aligning with the economic reality of the informal e-waste collector.
- **Strategic Direction:** EcoSetu is a **formal e-waste supply-chain platform** connecting **Citizen $\rightarrow$ Informal Collector $\rightarrow$ Authorized Recycler $\rightarrow$ Formal Recycling Facility $\rightarrow$ Auditable Transaction Record**. The informal collector is the primary economic agent.

```
       +-----------------------------------------------------------+
       |               ECOSETU SUPPLY CHAIN PLATFORM               |
       +-----------------------------------------------------------+
                                     |
       +-----------------------------+-----------------------------+
       |                             |                             |
+--------------+            +-------------------+           +--------------+
|   CITIZEN    |            | INFORMAL COLLECTOR|           |   RECYCLER   |
| (Journey A)  |            |   (Journey B)     |           | (Journey C)  |
+--------------+            +-------------------+           +--------------+
       |                              |                            |
       | Submit E-Waste               | Capture Material / Lot     | Discover Lots
       | Request Doorstep Pickup      | Price Discovery (Honest)   | Make Price Offers
       | Assign Collector             | Recycler Matching & Quote  | Negotiate / Accept
       | Digital Handover Receipt     | Negotiation & Counter-Offer| Handover & Weight
       | Trace Recycling Loop         | Handover, Payment, Receipt | Processing Record
       |                              | Earnings & Traceability    | Regulatory Compliance
       +------------------------------+----------------------------+
                                     |
                                     v
                        +-------------------------+
                        |      ADMINISTRATOR      |
                        | Platform Governance     |
                        | CPCB/SPCB Verifications |
                        | Market Price Standards  |
                        | Audit Trail & Integrity |
                        +-------------------------+
```

---

## 2. Target Business Architecture

### 2.1 Non-Negotiable Business Rules
1. **Collector Autonomy:** EcoSetu never dictates final transaction prices; the collector controls all commercial decisions.
2. **Honest Price Discovery:** Price estimates combine verified admin market standards + recycler posted bids + historical transactions. If verified price data is absent ($0$ records), UI displays an honest unavailable state.
3. **No Fabricated Data:** Zero fake recyclers, zero fake CPCB/SPCB numbers, zero synthetic ratings, zero fake transaction logs.
4. **Transparent Role Separation:** Distinct navigation and information architecture for Collector, Citizen, Recycler, and Admin.
5. **Low-Literacy First:** Large touch targets, pictorial cards, voice TTS guidance, numeric inputs, minimal typing.
6. **Robust Offline Queue:** Material capture, offline lot drafts, photos, weights, and GPS stored in local SQLite/AsyncStorage with background sync.

---

## 3. Role-by-Role Navigation Architecture

### 3.1 Collector Navigation (Economic Engine)
- **Tabs (5):**
  1. `CollectorHome` (Business Status Dashboard)
  2. `CollectorMaterial` (My Inventory & Lots: Draft, Available, Quoted, Accepted)
  3. `CollectorDeals` (Active Negotiations, Quotes, Handover Queue)
  4. `CollectorEarnings` (Cash/Digital revenue, pending payments, daily/weekly stats)
  5. `CollectorProfile` (Identity verification, operating area, language, safety center)

### 3.2 Citizen Navigation (Simple & Clean)
- **Tabs (4):**
  1. `CitizenHome` (Quick Submit CTA, active requests overview, recent pickups)
  2. `CitizenRequests` (Submitted e-waste items, scheduled pickups, assigned collectors)
  3. `CitizenTrace` (End-to-end item journey from doorstep to formal recycler)
  4. `CitizenProfile` (Address book, contact details, language selector)

### 3.3 Recycler Navigation (Operations & Sourcing)
- **Tabs (5):**
  1. `RecyclerMarketplace` (Discover available material lots within service area)
  2. `RecyclerIncoming` (Active consignments, scheduled handovers, weight verification)
  3. `RecyclerOffers` (Active quotes submitted, negotiation status, accepted deals)
  4. `RecyclerInventory` (Received inventory, processing logs, batch records)
  5. `RecyclerProfile` (CPCB/SPCB regulatory credentials, accepted materials, facility capacity)

### 3.4 Admin Navigation (Governance & Compliance)
- **Tabs (5):**
  1. `AdminOperations` (System health, platform activity, active transactions)
  2. `AdminVerifications` (Collector KYC & Recycler CPCB/SPCB license approval queue)
  3. `AdminPrices` (Market price standards per material/subcategory/region)
  4. `AdminData` (Data quality monitors, suspicious transaction flags, audit logs)
  5. `AdminReports` (Formal e-waste flow compliance reports, statutory downloads)

---

## 4. Collector Journey B (End-to-End Business Flow)

```
[ Step 1: Capture Material ]
  ├── Photo (Camera / Gallery)
  ├── Material Category & Subcategory (Visual Icons)
  ├── Condition (Working, Scrap, Dismantled)
  ├── Weight (Numeric entry + unit)
  └── GPS Location (Device location or manual area)
        │
        v
[ Step 2: Value Discovery & Lot Creation ]
  ├── Verified Market Baseline (Admin Benchmark)
  ├── Active Recycler Bid Range
  └── Create Material Lot (Draft / Open for Bidding)
        │
        v
[ Step 3: Recycler Matching & Offer Comparison ]
  ├── Query Authorized Recyclers (Proximity, Material Compatibility)
  ├── Transparent Reason Badges (Authorized, Pickup Available, Distance)
  └── Side-by-Side Offer Comparison Card
        │
        v
[ Step 4: Negotiation & Quote Acceptance ]
  ├── Recycler Quote Review
  ├── Counter-Offer / Direct Accept
  └── Quote Locked (Deal Status: ACCEPTED)
        │
        v
[ Step 5: Physical Handover & Weight Verification ]
  ├── Handover Scheduled (Time, Facility / Doorstep Location)
  ├── Dual Verification PIN
  ├── Final Calibrated Weight Confirmation
  └── Photo Proof of Handover
        │
        v
[ Step 6: Payment Recording & Earnings ]
  ├── Payment Method (Cash Recorded / Digital)
  ├── Immutable Digital Handover Receipt
  └── Earnings Dashboard Updated (Daily / Weekly / Monthly)
        │
        v
[ Step 7: Traceability & Recycler Processing ]
  └── Batch Processing & Final Recycling Certificate
```

---

## 5. Citizen Journey A (Streamlined Household & Institutional Sourcing)

1. **Submit E-Waste:** Select category (e.g. Old Smartphone, Laptop, Cable), enter quantity/condition, capture photo, select address.
2. **Doorstep Pickup Request:** Choose convenient time slot; request broadcast to nearby verified collectors.
3. **Collector Assignment & Pickup:** Collector accepts, arrives at doorstep, weighs item, provides immediate handover receipt.
4. **Impact & Traceability:** Citizen views tracking timeline showing item moving to formal recycling facility.

---

## 6. Recycler Workflow (B2B Material Sourcing & Compliance)

1. **Marketplace Discovery:** Filter lots by material type (e.g. Copper Cable, PCB Grade A, Li-Ion Batteries), minimum weight, and distance radius.
2. **Make Offer / Quote:** Submit bid with offered rate (₹/kg), pickup terms, and expiration window.
3. **Negotiation:** Receive collector counter-offers, adjust bid, or confirm final acceptance.
4. **Inbound Handover:** Inspect physical lot, verify PIN, record official scale weight, confirm payout.
5. **Processing & Compliance:** Log disassembly/refining recovery rates, generate EPR certificate proofs for CPCB/SPCB compliance.

---

## 7. Admin Workflow (Governance, Price Regulation & Verification)

1. **Verification Queue:** Review uploaded Government IDs (Aadhaar/PAN for collectors; CPCB/SPCB authorization certificates for recyclers).
2. **Price Standard Management:** Set regional benchmark buying/selling price floors/ceilings per material category with effective date ranges.
3. **Audit Trail Review:** Monitor transaction histories, price deviations, suspicious cancellations, and unverified recyclers.
4. **E-Waste Stream Governance:** Download compliance summaries for state pollution control boards.

---

## 8. Screen Mapping Matrix

| Current Screen File | Target Role & Business Function | Target Navigation Position | Action Required |
|---|---|---|---|
| `CollectorDashboardScreen.tsx` | Collector Home (Business Status) | `CollectorHome` (Tab 1) | Modify: Transform into business-first status screen |
| `CollectorMaterialCaptureScreen.tsx` | Step 1 of Lot Creation (Photo/Spec) | Modal / Stack | Modify: Streamline 7-step wizard |
| `CollectorCreateLotScreen.tsx` | Step 2 of Lot Creation (Lot Packaging) | Modal / Stack | Modify: Unify with Material Capture |
| `CollectorLotsScreen.tsx` | My Material (Inventory Management) | `CollectorMaterial` (Tab 2) | Modify: Add tabbed filters (Draft, Quoted, Done) |
| `CollectorLotDetailScreen.tsx` | Material Lot Specifications & Actions | Stack | Modify: Bind to dynamic quotes & matching |
| `CollectorPriceBoardScreen.tsx` | Honest Price Discovery Board | Stack / Quick Access | Modify: Enforce honest empty state & 3-way split |
| `CollectorRecyclerDirectoryScreen.tsx` | Recycler Directory & Authorization | Stack / Browse | Reusable: Keep existing verified directory |
| `CollectorRecyclerMatchesScreen.tsx` | Automated Matching for Lot | Stack | Modify: Transparent match factors & offers |
| `CollectorQuotesScreen.tsx` | Offer Comparison & Negotiation | `CollectorDeals` (Tab 3) | Modify: Multi-bid comparison & counter-offer |
| `CollectorHandoverScreen.tsx` | Physical Handover Execution | Stack | Modify: Dual-PIN & weight discrepancy check |
| `CollectorHandoverReceiptScreen.tsx` | Immutable Transaction Receipt | Stack | Reusable: High-fidelity receipt view |
| `CollectorEarningsScreen.tsx` | Collector Revenue & Cashflow | `CollectorEarnings` (Tab 4) | Modify: Honest stats (Today, Week, Month) |
| `CollectorSafetyCenterScreen.tsx` | Low-Literacy Safety & PPE Guide | `CollectorProfile` | Reusable: 7 pictorial safety topics + TTS |
| `CollectorSafetyDetailScreen.tsx` | Topic Detail with Audio Playback | Stack | Reusable: Preserved |
| `CollectorLotTraceScreen.tsx` | Material Traceability Timeline | Stack | Modify: Real milestone binding |
| `CollectorProfileScreen.tsx` | Profile, KYC, Operating Area | `CollectorProfile` (Tab 5) | Modify: Add KYC status & service radius |
| `SubmitItemScreen.tsx` | Citizen E-Waste Submission | `CitizenSubmit` (Tab 2) | Modify: Visual 3-step item submission |
| `CitizenDashboardScreen.tsx` | Citizen Home | `CitizenHome` (Tab 1) | Modify: Clean, non-cluttered household view |
| `CitizenRequestsScreen.tsx` | Citizen Active Requests | `CitizenRequests` (Tab 2) | Modify: Pickup status tracker |
| `RequestDetailScreen.tsx` | Request Details & Collector Info | Modal / Stack | Modify: Contact privacy gate before acceptance |
| `ItemTraceabilityScreen.tsx` | Citizen E-Waste Impact & Trace | `CitizenTrace` (Tab 3) | Modify: Visual journey to recycler |
| `RecyclerDashboardScreen.tsx` | Recycler Operations Dashboard | `RecyclerHome` (Tab 1) | Modify: Focus on pending bids & incoming lots |
| `RecyclerIncomingScreen.tsx` | Inbound Consignments & Lots | `RecyclerIncoming` (Tab 2) | Modify: Handover scheduling & weight logs |
| `RecyclerCreateQuoteScreen.tsx` | Bid Submission & Pricing | Stack | Modify: Rate entry with validity window |
| `RecyclerProfileScreen.tsx` | Dynamic Recycler Profile & CPCB | `RecyclerProfile` (Tab 5) | Reusable: Already dynamic from P0 repair |
| `AdminDashboardScreen.tsx` | System Overview & KPIs | `AdminHome` (Tab 1) | Modify: Platform operations overview |
| `AdminVerificationsScreen.tsx` | Recycler & Collector Approvals | `AdminVerifications` (Tab 2) | Reusable: KYC document approval workflow |
| `AdminGovernanceScreen.tsx` | Policy, Audit Logs & Rules | `AdminData` (Tab 4) | Modify: Regulatory audit trail |

---

## 9. Reusable Components & Libraries
- **Voice Context & Native TTS:** `CollectorVoiceContext.tsx`, `EcoSetuTTSModule.kt`, `EcoSetuSpeechModule.kt` (Tested & working on physical handset).
- **Location Module:** `EcoSetuLocationModule.kt` (Hardware GPS acquisition verified on vivo V2561).
- **Theme Foundation:** `mobile/src/theme/colors.ts`, `spacing.ts`, `typography.ts` (Existing GitHub baseline palette: `#071E22`, `#0D3B43`, `#10B981`, `#F59E0B`).
- **i18n Localization Engine:** `mobile/src/i18n/index.tsx` (English, Hindi, Marathi, Odia fully wired).
- **Design Tokens:** `EcoSetuBackground.tsx`, `StatusBadge.tsx`, `ReceiptCard.tsx`.

---

## 10. Screens Requiring Modification

### 10.1 `CollectorDashboardScreen.tsx` (P0 Transformation)
- **Changes:**
  - Remove generic decorative metrics.
  - Insert top status bar: Online/Offline toggle, Operating Hub, Today's Quick Tally.
  - Insert Hero Quick Action: Large `[ + Add Material ]` button.
  - Insert Section: `Active Deals` (Lots currently with open quotes or pending handover).
  - Insert Section: `Today's Business Snapshot` (Completed sales, pending payout, active inventory weight).
  - Insert Quick Shortcuts: Price Discovery, Recycler Directory, Safety Hub.

### 10.2 `CollectorQuotesScreen.tsx` (Negotiation & Offer Comparison)
- **Changes:**
  - Build side-by-side recycler comparison cards.
  - Highlight: Offered Rate (₹/kg), Distance, Authorization Badge, Pickup vs Self-Delivery.
  - Add explicit Counter-Offer dialog (Collector specifies target ₹/kg).
  - Add Accept Quote button with instant confirmation PIN creation.

### 10.3 `CollectorPriceBoardScreen.tsx` (Honest Price Discovery)
- **Changes:**
  - Display 3 separate data streams:
    1. **Market Standard (Admin):** Benchmark baseline.
    2. **Active Recycler Bids:** Real bids submitted by verified facilities.
    3. **Recent Local Sales:** Real transaction averages.
  - Display honest empty state when records are 0.

### 10.4 `CollectorEarningsScreen.tsx` (Financial Management)
- **Changes:**
  - Replace hardcoded charts with real aggregated transaction queries.
  - Categorize by: Cash Received vs Bank Transfer.
  - Time filters: Today, This Week, This Month, All Time.

---

## 11. Screens Requiring Consolidation
- **Consolidation 1 (Material Lot Flow):** Merge `CollectorMaterialCaptureScreen.tsx` and `CollectorCreateLotScreen.tsx` into a single, cohesive 5-step wizard (`CollectorMaterialCaptureScreen.tsx`) to avoid fragmented navigation.
- **Consolidation 2 (Recycler Detail):** Merge `RecyclerFacilityDetailScreen.tsx` into `CollectorRecyclerDetailScreen.tsx` with privacy gating intact.
- **Consolidation 3 (Consignments vs Deals):** Merge `CollectorConsignmentsScreen.tsx` and `CollectorConsignmentStatusScreen.tsx` into the unified `CollectorDealsScreen.tsx`.

---

## 12. Obsolete / Redundant Screens to Deprecate
- `CreateConsignmentScreen.tsx` (Redundant legacy screen; superseded by dynamic `CollectorCreateLotScreen` + `CollectorQuotesScreen`).
- `CollectorBrowseScreen.tsx` (Generic request map; should be integrated into Citizen Request Pickup tab if enabled for collector).

---

## 13. Backend & API Dependencies

| Endpoint | Method | Required Payload / Response | Backend Status |
|---|---|---|---|
| `/api/v1/material-lots` | `POST` | Create lot with photos, category, weight, coords | `Implemented` |
| `/api/v1/material-lots/my-lots` | `GET` | Return collector's lots with quote counts | `Implemented` |
| `/api/v1/quotes/lot/:lotId` | `GET` | List all recycler bids for specific lot | `Implemented` |
| `/api/v1/quotes/:id/counter` | `POST` | Collector submits counter-rate | `Requires route wire-up` |
| `/api/v1/quotes/:id/accept` | `POST` | Lock quote, generate Handover PIN | `Implemented` |
| `/api/v1/handovers/confirm` | `POST` | Verify dual PIN, record final scale weight | `Implemented` |
| `/api/v1/earnings/summary` | `GET` | Aggregate payments by period (cash/digital) | `Implemented` |
| `/api/v1/prices/market-board` | `GET` | Verified admin prices + recycler bid averages | `Implemented` |
| `/api/v1/recyclers/directory` | `GET` | Authorized recyclers with privacy masked contact | `Implemented (P0 Repair #2)` |

---

## 14. Database & Prisma Schema Verification
The current `schema.prisma` already possesses the complete data model:
- `MaterialLot` (Category, weight, photos, location, status: `DRAFT`, `AVAILABLE`, `QUOTED`, `ACCEPTED`, `HANDED_OVER`, `COMPLETED`).
- `RecyclerQuote` (Offered rate, min/max quantity, expiration, counter-offer history, status: `PENDING`, `ACCEPTED`, `REJECTED`, `EXPIRED`).
- `HandoverTransaction` (Dual PIN verification, initial weight, scale weight, total price, payment method, receipt signature).
- `PaymentRecord` (Amount, method: `CASH`, `UPI`, `BANK_TRANSFER`, status).
- `PriceStandard` (Admin verified price reference per material/subcategory/region).
- `RecyclerProfile` & `CollectorProfile` (CPCB/SPCB authorizations, KYC docs).

---

## 15. Offline Requirements
- **Local Cache:** SQLite / AsyncStorage stores draft material captures (offline photos as local URI, weights, GPS coordinates).
- **Background Sync Engine:** Automatically syncs pending lots when network connectivity returns.
- **Online-Only Gate:** Critical financial actions (Quote Acceptance, Handover Confirmation, Final Payment) remain strictly online-only to prevent double-spending or stale quote execution.

---

## 16. Localization & Low-Literacy Strategy
- **Languages:** English, Hindi (हिन्दी), Marathi (मराठी), Odia (ଓଡ଼ିଆ).
- **Strict Rule:** Zero hardcoded strings in new components; all labels sourced from `mobile/src/i18n/translations/`.
- **Low-Literacy Design Tokens:**
  - 48px+ touch targets.
  - Iconic material representations (e.g. 📱 for mobile, 💻 for laptop, 🔌 for cable).
  - Clear color cues: Green for earnings/success, Amber for pending action, Neutral Slate for completed.
  - Native Audio readouts via `EcoSetuTTSModule` on critical price and deal confirmation screens.

---

## 17. SIH Problem Statement 26229 Requirement Mapping

| SIH ID | Requirement Description | EcoSetu Architecture Module |
|---|---|---|
| `SIH-COLL-001` | Material Lot Inventory & Photo Capture | `CollectorMaterialCaptureScreen.tsx` |
| `SIH-COLL-002` | Value Estimation & Price Discovery | `CollectorPriceBoardScreen.tsx` |
| `SIH-COLL-003` | Recycler Matching & Distance Filter | `CollectorRecyclerMatchesScreen.tsx` |
| `SIH-COLL-004` | Multi-Quote Comparison & Bidding | `CollectorQuotesScreen.tsx` |
| `SIH-COLL-005` | Commercial Autonomy & Negotiation | `CollectorQuotesScreen.tsx` (Counter-Offer) |
| `SIH-COLL-006` | Dual PIN Handover & Weight Verification | `CollectorHandoverScreen.tsx` |
| `SIH-COLL-007` | Cash & Digital Payment Receipts | `CollectorHandoverReceiptScreen.tsx` |
| `SIH-COLL-008` | Collector Earnings Dashboard | `CollectorEarningsScreen.tsx` |
| `SIH-COLL-009` | Offline Capability for Field Operations | Offline Sync Engine + Local Cache |
| `SIH-COLL-010` | Multilingual & Low-Literacy Usability | 4 Languages + TTS Native Module |
| `SIH-RECY-001` | Recycler Marketplace & Lot Discovery | `RecyclerMarketplaceScreen.tsx` |
| `SIH-RECY-006` | Recycler Contact Privacy Gate | Backend Privacy Filter (P0 Repair #2) |
| `SIH-ADMN-001` | CPCB/SPCB License Verification Queue | `AdminVerificationsScreen.tsx` |
| `SIH-ADMN-002` | Market Price Standard Administration | `AdminPriceBoardScreen.tsx` |

---

## 18. Fake Data & Mock Elimination Plan
- **Rule:** No synthetic constants for prices or recyclers in screens.
- **Audit Findings:**
  - Hardcoded recycler profiles eliminated in P0 Repair #1.
  - Contact privacy phone numbers masked in P0 Repair #2.
  - Price board empty state enforced: when `marketPrices.length === 0`, render honest "Market Price Benchmark Unavailable" rather than dummy ₹150/kg.

---

## 19. AI Boundaries
- **Policy:** EcoSetu operates deterministically using rule-based classification and verified market price baselines.
- **Boundary:** No fake AI claims. Machine learning vision models will only be enabled if a real, trained model is provided. Manual pictorial category selection is the authoritative primary workflow.

---

## 20. Phased Implementation Plan

```
+-------------------------------------------------------------------------------+
| PHASE 1: Information Architecture & Navigation Foundation                    |
| - Update CollectorNavigator, CitizenNavigator, RecyclerNavigator, Admin      |
| - Align tab structures to role-by-role business needs                         |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| PHASE 2: Collector Home + Material Inventory + Deal Lifecycle                |
| - Build Business-First Collector Home (Active deals, earnings snapshot)       |
| - Consolidate Material Capture & Lot Packaging Wizard                         |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| PHASE 3: Price Discovery + Recycler Matching + Offer Comparison              |
| - Implement 3-tier Price Board (Standard, Bids, Sales) with honest empty state|
| - Implement Recycler Matching & Side-by-Side Offer Comparison Card            |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| PHASE 4: Negotiation + Dual-PIN Handover + Payment Receipts                  |
| - Add Counter-Offer flow in Quotes Screen                                     |
| - Build Dual-PIN Handover verification and Immutable Digital Receipt          |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| PHASE 5: Earnings Analytics + End-to-End Traceability Timeline                |
| - Real aggregated earnings by time period and payment method                  |
| - Visual milestone traceability from Citizen to Formal Recycling Facility     |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| PHASE 6: Recycler Operations & Sourcing Workflow                              |
| - Recycler Marketplace lot inspection, Quote submission, and Inbound Handover |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| PHASE 7: Citizen Workflow Simplification                                      |
| - Clean 3-step E-waste submission and Doorstep Pickup tracking               |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| PHASE 8: Admin Governance & Price Standards                                   |
| - Verification queue for CPCB/SPCB licenses and Regional Price Management     |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| PHASE 9: Localization (HI/MR/OR/EN) & Offline Queue Hardening                |
| - Full translation verification across all updated screens                    |
| - Offline lot creation and SQLite sync validation                             |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| PHASE 10: Fresh Release Build & Physical Handset Validation                   |
| - Build fresh APK, compute SHA-256 identity, test on physical vivo V2561      |
+-------------------------------------------------------------------------------+
```

---

## 21. Risk Analysis & Mitigation

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| **UI Regressions / Broken Theming** | HIGH | Maintain existing theme colors (`#071E22`, `#10B981`) and baseline components; avoid third-party UI library bloat. |
| **Data Inconsistency on Empty State** | MEDIUM | Ensure every list and dashboard renders elegant, honest empty states when database records are 0. |
| **Offline Sync Collisions** | MEDIUM | Assign client-generated UUIDs for offline material lot drafts and sync sequentially. |
| **Physical Device Performance** | LOW | Keep UI hierarchy shallow and optimize image asset sizes before upload. |

---

## 22. EXACT FIRST IMPLEMENTATION TASK

### Task: Phase 1 — Information Architecture & Role Navigation Alignment
1. **Target:** Update `mobile/src/navigation/CollectorNavigator.tsx`, `CitizenNavigator.tsx`, `RecyclerNavigator.tsx`, and `AdminNavigator.tsx`.
2. **Collector Tabs:** Align to `[HOME, MATERIAL, DEALS, EARNINGS, PROFILE]`.
3. **Citizen Tabs:** Align to `[HOME, SUBMIT, REQUESTS, TRACE, PROFILE]`.
4. **Recycler Tabs:** Align to `[MARKETPLACE, INCOMING, OFFERS, INVENTORY, PROFILE]`.
5. **Admin Tabs:** Align to `[OPERATIONS, VERIFICATIONS, PRICES, AUDIT, PROFILE]`.
6. **Constraint:** Zero breaking changes to existing stack screens; preserve all existing P0 repairs.
