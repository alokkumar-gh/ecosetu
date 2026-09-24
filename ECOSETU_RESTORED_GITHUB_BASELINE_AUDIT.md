# EcoSetu — Restored GitHub Baseline UI & Architecture Audit

**Audit Date:** September 22, 2026 (10:10 IST)  
**Audit Mode:** Strict Read-Only Baseline Architecture & UI Inspection  
**Restored Canonical Commit:** `5eb21425b0aa7affe1fa11e6b5945dd3482625d7` (`origin/main`)  
**Commit Title:** `feat: EcoSetu v1.0.3 - Vernacular Low-Literacy UX, Material Lots & Historical Analytics`

---

## 1. Git Baseline Identity Verification

| Invariant | Result | Verification Output |
| :--- | :--- | :--- |
| **Active Branch** | `main` | `git branch` |
| **HEAD SHA** | `5eb21425b0aa7affe1fa11e6b5945dd3482625d7` | `git rev-parse HEAD` |
| **Remote Tracking** | `origin/main` (Up to date) | `git status` |
| **Origin Remote SHA** | `5eb21425b0aa7affe1fa11e6b5945dd3482625d7` | `git rev-parse origin/main` |
| **Working Tree Status** | **100% Clean (0 modified, 0 staged)** | `git status` |

---

## 2. UI Screen Inventory (59 Total Screens in Restored Baseline)

### A. Informal Collector Role Screens (27 Screens in `mobile/src/screens/collector/`)

| Screen | Route / Navigation Path | Purpose & Business Function | Data Source & Service | Localization | Known UX / UI Issues |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`CollectorDashboardScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorHome` | Main operational dashboard with metrics, availability switch, and quick-action navigation banners. | `collectorService` (`GET /api/v1/collectors/stats`, `/available`) | `t('collector.dashboard.*')` | High vertical stack of action banners; good functionality but long scroll. |
| **`CollectorMaterialCaptureScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorMaterialCapture` | Step 1 of Lot creation: Photo capture + pictorial taxonomy grid + condition/source picker. | `cameraService`, `materialTaxonomy.ts` | `t('materialLots.*')` | Operates cleanly; uses large touch cards. |
| **`CollectorCreateLotScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorCreateLot` | Step 2 of Lot creation: Approximate weight stepper, location capture, value estimate preview. | `materialLotService`, `priceService` | `t('materialLots.*')` | Clean stepper integration and GPS fallback. |
| **`CollectorLotsScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorLots` | List of collector's material lots with status filtering (DRAFT, READY_FOR_MATCHING, QUOTED, HANDED_OVER). | `materialLotService.listLots()` | `t('materialLots.*')` | Standard list card layout. |
| **`CollectorLotDetailScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorLotDetail` | Detailed inspection of single lot, item photos, GPS, status badge, and action CTAs. | `materialLotService.getLotById()` | `t('materialLots.*')` | Clean card hierarchy. |
| **`CollectorPriceBoardScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorPriceBoard` | Real-time buying rates board, 24h staleness detection, TTS spoken prices, historical trends. | `priceService.getCurrentPrices()`, `getTrends()` | `t('priceBoard.*')` | Comprehensive dual-source board; displays honest empty state when DB empty. |
| **`CollectorRecyclerDirectoryScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorRecyclerDirectory` | Searchable directory of authorized formal recyclers with CPCB status and service areas. | `recyclerDirectoryService.getDirectory()` | `t('recyclerDirectory.*')` | Operates smoothly with search and filter chips. |
| **`CollectorRecyclerDetailScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorRecyclerDetail` | Inspection of recycler facility, accepted waste streams, published rates, and contact privacy gate. | `recyclerDirectoryService.getRecyclerDetail()` | `t('recyclerDirectory.*')` | **P0 UX Finding:** In restored baseline, contact phone/call button was visible on detail screen prior to quote acceptance (fixed in audit validation). |
| **`CollectorRecyclerMatchesScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorRecyclerMatches` | Economic matching engine UI: displays ranked list of eligible authorized recyclers for a lot. | `recyclerMatchingService.getMatchesForLot()` | `t('recyclerMatching.*')` | Shows matching reasons, distance, and rates. |
| **`CollectorQuotesScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorQuotes` | Received recycler quotes, price comparison, online-only accept/decline modal. | `quoteService.getQuotesForLot()` | `t('quote.*')` | Interactive decision modals for accept/decline. |
| **`CollectorHandoverScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorHandover` | Digital Handover initiation: GPS capture, weight verification, photos, verification PIN generation. | `handoverService.initiateHandover()` | `t('handover.*')` | Step-by-step handover confirmation flow. |
| **`CollectorHandoverReceiptScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorHandoverReceipt` | Immutable digital handover receipt with `HND-YYYYMM-XXXXX` reference code. | `handoverService.getHandoverById()` | `t('handover.*')` | Printable/shareable digital receipt format. |
| **`CollectorEarningsScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorEarnings` | Earnings ledger: total sales, cash collected, pending recycler dues, time filters (Today, This Month). | `earningsService.getCollectorSummary()` | `t('earnings.*')` | Clean financial summary with pending due items. |
| **`CollectorTransactionsScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorTransactions` | List of historical completed sales transactions with payment statuses. | `transactionService.listTransactions()` | `t('transaction.*')` | Paginated transaction ledger list. |
| **`CollectorTransactionDetailScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorTransactionDetail` | Detailed receipt of individual transaction with payment breakdown. | `transactionService.getTransactionById()` | `t('transaction.*')` | Transaction breakdown and timestamps. |
| **`CollectorLotTraceScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorLotTrace` | End-to-end custody chain traceability timeline: capture $\rightarrow$ lot $\rightarrow$ match $\rightarrow$ quote $\rightarrow$ handover $\rightarrow$ payment $\rightarrow$ recycling. | `lotTraceService.fetchLotTrace()` | `t('traceability.*')` | Rich vertical milestone timeline with TTS narration. |
| **`CollectorSafetyCenterScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorSafetyCenter` | 7 occupational health safety topics bundled offline with pictorial cards and audio TTS overview. | `data/safetyGuidance.ts` | `t('safety.*')` | Completely offline-first; large pictorial topic cards. |
| **`CollectorSafetyDetailScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorSafetyDetail` | Deep dive into specific hazard (e.g. Battery Handling, Acid Leaching) with do/don't cards and audio. | `data/safetyGuidance.ts` | `t('safety.*')` | High contrast hazard cards and voice read-aloud. |
| **`CollectorBrowseScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorBrowseTab` | Map + filterable list of available citizen collection requests. | `collectorService.getAvailableRequests()` | `t('collector.browse.*')` | Interactive map and list view with distance indicators. |
| **`CollectorPickupsScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorPickupsTab` | Scheduled and active citizen pickups assigned to collector. | `collectorService.getMyPickups()` | `t('collector.pickups.*')` | Tabbed active/completed pickup lists. |
| **`CollectorPickupDetailScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorPickupDetail` | Citizen pickup execution screen with OTP verification and item checking. | `pickupService.getPickupDetail()` | `t('collector.pickups.*')` | OTP verification step and navigation button. |
| **`CollectorProfileScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorProfileTab` | Collector personal profile, vehicle registration, operating city, language switch. | `collectorService.getProfile()` | `t('collector.profile.*')` | Clean profile details and logout CTA. |
| **`CollectorConsignmentsScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorConsignments` | Legacy consignment batching screen (Journey A to Journey B transition bridge). | `consignmentService.listConsignments()` | `t('consignments.*')` | Legacy bridge kept for backward compatibility. |
| **`CollectorConsignmentStatusScreen`**| `CollectorNavigator` $\rightarrow$ `CollectorConsignmentStatus`| Consignment status tracker. | `consignmentService.getConsignment()` | `t('consignments.*')` | Legacy bridge tracker. |
| **`CreateConsignmentScreen`** | `CollectorNavigator` $\rightarrow$ `CreateConsignment` | Legacy batch creation flow. | `consignmentService.createConsignment()` | `t('consignments.*')` | Legacy bridge flow. |
| **`CollectorRecordSaleScreen`** | `CollectorNavigator` $\rightarrow$ `CollectorRecordSale` | Fast cash sale entry screen. | `transactionService.recordCashSale()` | `t('transaction.*')` | Quick cash recording form. |
| **`RecyclerFacilityDetailScreen`** | `CollectorNavigator` $\rightarrow$ `RecyclerFacilityDetail` | Secondary recycler profile view. | `recyclerService.getFacility()` | `t('recycler.*')` | Secondary view redundant with `CollectorRecyclerDetailScreen`. |

---

### B. Formal Recycler Role Screens (8 Screens in `mobile/src/screens/recycler/`)

| Screen | Route | Purpose | Data Source | Known UX Finding |
| :--- | :--- | :--- | :--- | :--- |
| **`RecyclerDashboardScreen`** | `RecyclerNavigator` $\rightarrow$ `RecyclerHome` | Recycler facility overview, active consignments, processing capacity. | `recyclingService.getStats()` | Clean SaaS summary cards. |
| **`RecyclerIncomingScreen`** | `RecyclerNavigator` $\rightarrow$ `RecyclerIncoming` | List of incoming material batches and delivered consignments. | `recyclingService.getIncoming()` | Filterable by status (DELIVERED, IN_TRANSIT). |
| **`ConsignmentDetailScreen`** | `RecyclerNavigator` $\rightarrow$ `ConsignmentDetail` | Deep inspection of incoming consignment, weight verification, acceptance/rejection. | `recyclingService.getConsignment()` | Multi-step acceptance with inspection notes. |
| **`RecyclerCreateQuoteScreen`** | `RecyclerNavigator` $\rightarrow$ `RecyclerCreateQuote` | Formal price quote creation for a collector's Material Lot. | `quoteService.createQuote()` | Simple, clean pricing form with validity days. |
| **`RecyclerHandoverConfirmScreen`** | `RecyclerNavigator` $\rightarrow$ `RecyclerHandoverConfirm` | Digital Handover acceptance with PIN verification and weight confirmation. | `handoverService.confirmHandover()` | PIN entry keypad and weight adjustment. |
| **`RecyclerRecordsScreen`** | `RecyclerNavigator` $\rightarrow$ `RecyclerRecords` | Historical recycling processing logs for CPCB compliance reporting. | `recyclingService.listRecords()` | Audit-ready historical record ledger. |
| **`RecyclingRecordDetailScreen`** | `RecyclerNavigator` $\rightarrow$ `RecyclingRecordDetail` | Detailed CPCB processing certificate view with material fractions recovered. | `recyclingService.getRecordDetail()` | Detailed mass-balance recovery breakdown. |
| **`RecyclerProfileScreen`** | `RecyclerNavigator` $\rightarrow$ `RecyclerProfile` | Facility regulatory details, CPCB license, capacity, accepted categories. | `useAuth()` | **P0 Finding:** Restored baseline contains static mock values (`CPCB/EW/REG/2026/0488`, `31 March 2028`). Needs live backend hook. |

---

### C. Citizen Role Screens (7 Screens in `mobile/src/screens/citizen/`)

| Screen | Route | Purpose | Data Source |
| :--- | :--- | :--- | :--- |
| **`CitizenDashboardScreen`** | `CitizenNavigator` $\rightarrow$ `CitizenHome` | Citizen welcome dashboard, environmental impact points, active requests summary. | `ewasteService.getStats()` |
| **`SubmitItemScreen`** | `CitizenNavigator` $\rightarrow$ `SubmitItem` | Citizen e-waste item submission with photo capture and AI classification fallback. | `ewasteService.submitItem()` |
| **`CitizenRequestsScreen`** | `CitizenNavigator` $\rightarrow$ `CitizenRequests` | Citizen collection requests list with real-time status badges. | `requestService.getMyRequests()` |
| **`RequestDetailScreen`** | `CitizenNavigator` $\rightarrow$ `RequestDetail` | Detailed view of request, assigned collector info, and pickup schedule. | `requestService.getRequestDetail()` |
| **`ItemTraceabilityScreen`** | `CitizenNavigator` $\rightarrow$ `ItemTraceability` | Citizen view of downstream recycling lifecycle for their submitted e-waste. | `ewasteService.getTraceability()` |
| **`CitizenNotificationsScreen`**| `CitizenNavigator` $\rightarrow$ `CitizenNotifications` | In-app notification inbox. | `notificationService.list()` |
| **`CitizenProfileScreen`** | `CitizenNavigator` $\rightarrow$ `CitizenProfile` | Citizen account settings, default address, language selection. | `useAuth()` |

---

### D. System Administrator Screens (11 Screens in `mobile/src/screens/admin/`)

| Screen | Route | Purpose |
| :--- | :--- | :--- |
| **`AdminDashboardScreen`** | `AdminNavigator` $\rightarrow$ `AdminDashboard` | High-level system overview, active users, total material tonnage. |
| **`AdminHistoricalAnalyticsScreen`** | `AdminNavigator` $\rightarrow$ `AdminHistoricalAnalytics` | Time-series charts across 7d/30d/90d/1y, material volume, price trends, geographic maps. |
| **`AdminGeographicAnalyticsScreen`** | `AdminNavigator` $\rightarrow$ `AdminGeographicAnalytics` | Regional distribution of collection volume across cities and districts. |
| **`AdminVerificationsScreen`** | `AdminNavigator` $\rightarrow$ `AdminVerifications` | Queue for reviewing and approving Collector and Recycler onboarding applications. |
| **`AdminUsersScreen`** | `AdminNavigator` $\rightarrow$ `AdminUsers` | User management and account status toggles (ACTIVE, SUSPENDED, DEACTIVATED). |
| **`AdminGovernanceScreen`** | `AdminNavigator` $\rightarrow$ `AdminGovernance` | Platform policy parameters, compliance rules, and threshold configurations. |
| **`AdminReportsScreen`** | `AdminNavigator` $\rightarrow$ `AdminReports` | CPCB/SPCB regulatory export reports generation. |
| **`AdminNotificationCenterScreen`** | `AdminNavigator` $\rightarrow$ `AdminNotificationCenter` | Broadcast announcements and emergency alerts dispatch. |
| **`AdminSystemHealthScreen`** | `AdminNavigator` $\rightarrow$ `AdminSystemHealth` | Service health indicators (Database, Storage, AI microservice). |
| **`AdminAuditLogsScreen`** | `AdminNavigator` $\rightarrow$ `AdminAuditLogs` | Immutable system audit log viewer. |
| **`AdminProfileScreen`** | `AdminNavigator` $\rightarrow$ `AdminProfile` | Admin credentials management. |

---

### E. Authentication & Account Gating Screens (6 Screens in `mobile/src/screens/auth/`)

| Screen | Purpose |
| :--- | :--- |
| **`LandingScreen`** | Initial welcoming screen with role selection and platform overview. |
| **`LoginScreen`** | Phone number / password login + Firebase authentication bridge. |
| **`RegisterScreen`** | Multi-role registration (Citizen, Informal Collector, Formal Recycler). |
| **`PendingVerificationScreen`**| Gate screen for Collectors/Recyclers awaiting admin review. |
| **`AccountSuspendedScreen`** | Gate screen for suspended users. |
| **`AccountDeactivatedScreen`** | Gate screen for deactivated accounts. |

---

## 3. Design System & Theming Inventory

The restored baseline contains a unified **SaaS Glassmorphism Theme** (`mobile/src/theme/`):

- **Canvas & Backgrounds:**
  - `colors.backgroundDeep` (`#02080D`): Deep cosmic black canvas.
  - `colors.backgroundBase` (`#030C12`): Primary screen background.
  - `GradientBackground.tsx` / `EcoSetuBackground.tsx`: Radial emerald glow layers.
- **Glass Card Tokens:**
  - `colors.glassFill` (`rgba(6, 21, 27, 0.72)`): Translucent frosted surface.
  - `colors.glassBorder` (`rgba(255, 255, 255, 0.12)`): Crisp subtle glass border.
  - `colors.glassBorderStrong` (`rgba(45, 212, 191, 0.32)`): Active emerald border highlight.
- **Brand Colors:**
  - `colors.primary` (`#10B981`): Vibrant emerald green.
  - `colors.navyBrand` (`#0F2942`): Authoritative EcoSetu deep navy.
  - `colors.secondary` (`#06B6D4`): Environmental cyan / teal.
  - `colors.warning` (`#F59E0B`): Amber warning accent.
- **Typography:**
  - Inter / Roboto high-contrast text: `textPrimary` (`#FFFFFF`), `textSecondary` (`#CBD5E1`), `textTertiary` (`#94A3B8`).

---

## 4. SIH 26229 Requirements Baseline Mapping

| Module / Area | Baseline Requirement IDs | Restored Baseline Status | Summary Evidence |
| :--- | :--- | :---: | :--- |
| **Material Taxonomy & Capture** | `SIH-MAT-001..010` | **IMPLEMENTED** | `CollectorMaterialCaptureScreen` (15 categories, conditions, sources, camera). |
| **Material Lot Lifecycle** | `SIH-LOT-001..008` | **IMPLEMENTED** | `CollectorCreateLotScreen`, `CollectorLotsScreen`, `materialLotService`. |
| **Price Discovery & Price Board** | `SIH-PRICE-001..009` | **IMPLEMENTED** | `CollectorPriceBoardScreen`, `priceService`, 24h staleness, honest empty states. |
| **Price History & Trends** | `SIH-HIST-001`, `SIH-TREND-001` | **IMPLEMENTED** | `historicalAnalyticsService`, deterministic trend formulas. |
| **Value Estimation** | `SIH-VAL-001..005` | **IMPLEMENTED** | `priceService.calculateEstimate()`, rule-based ranges with explicit disclaimers. |
| **Recycler Directory & Privacy** | `SIH-RECY-001..006` | **PARTIAL** | Directory works; contact privacy gate in `CollectorRecyclerDetailScreen` needs enforcement. |
| **Recycler Offered Rates** | `SIH-RATE-001..004` | **PARTIAL** | Backend rate CRUD exists; recycler rate management screen missing in restored baseline. |
| **Recycler Matching** | `SIH-MATCH-001..006` | **PARTIAL** | `CollectorRecyclerMatchesScreen` exists; matching service returns NOT_ELIGIBLE candidates in payload. |
| **Quotation & Handover** | `SIH-QUOTE-001`, `SIH-HAND-001` | **IMPLEMENTED** | `CollectorQuotesScreen`, `CollectorHandoverScreen`, `HND-YYYYMM-XXXXX` codes. |
| **Payment & Earnings Ledger** | `SIH-PAY-001`, `SIH-EARN-001` | **IMPLEMENTED** | `CollectorEarningsScreen`, cash recording, pending dues tracking. |
| **Traceability Chain** | `SIH-TRACE-001..006` | **IMPLEMENTED** | `CollectorLotTraceScreen`, complete 7-milestone lifecycle audit. |
| **Safety Center** | `SIH-SAFE-001..006` | **IMPLEMENTED** | `CollectorSafetyCenterScreen`, 7 offline topics bundled with audio overview. |
| **Multilingual Parity** | `SIH-LANG-001..007` | **IMPLEMENTED** | 100% key parity across EN, HI, MR, OR (`tsc --noEmit` clean). |
| **Low-Literacy UX Standards** | `SIH-LIT-001..010` | **IMPLEMENTED** | $\ge 48\text{dp}$ touch targets, numeric steppers, icon-first cards. |

---

## 5. Hardcoded / Fake Data Audit in Restored Baseline

During our deep code search of the restored `5eb2142` commit, the following items were identified:

1. **`mobile/src/screens/recycler/RecyclerProfileScreen.tsx` (Lines 102, 112, 117):**
   - **Hardcoded Values:** License No: `CPCB/EW/REG/2026/0488`, Valid Until: `31 March 2028`, Daily Capacity: `5,000 kg / day`.
   - **Severity:** **P0 Fix Required**. Must be dynamically fetched from authenticated user's `RecyclerProfile` model.
2. **`mobile/src/screens/collector/CollectorRecyclerDetailScreen.tsx` (Lines 520–545):**
   - **Contact Gating Issue:** Phone call & message buttons are rendered unconditionally on the detail screen before quote acceptance.
   - **Severity:** **P0 Privacy Gating Required** (`SIH-RECY-006`).
3. **`backend/src/services/recyclerMatchingService.js` (Line 232):**
   - **Matching Filter Issue:** Recyclers with `NOT_ELIGIBLE` status are returned in the final API response array rather than being strictly pruned at the backend security boundary.
   - **Severity:** **P0 Authorization Filter Required** (`SIH-RECY-005`).

---

## 6. Recommended Next Implementation Task

To maintain strict stability and adhere to the **SIH 26229 Priority Hierarchy**, we should execute targeted, non-destructive P0 repairs directly on top of this restored baseline without modifying any UI themes or screen layouts.

### Recommended Single Immediate Task:
> **P0 Repair #1: Enforce Recycler Profile Dynamic Database Binding & Remove Hardcoded CPCB Values in `RecyclerProfileScreen.tsx`**  
> (Replace static mock license strings with authenticated `recyclerService.getProfile()` backend data contracts).
