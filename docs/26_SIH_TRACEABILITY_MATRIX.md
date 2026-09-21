# EcoSetu — SIH 26229 Traceability Matrix

> **Reference:** All requirement IDs are defined in `25_SIH_26229_REQUIREMENTS.md`.
>
> **Established:** 2026-09-20
>
> **Purpose:** Maps every SIH requirement to its corresponding ECOSETU module, API endpoint, database table, mobile screen, test coverage, and implementation status.
>
> **Status Values:**
> - `IMPLEMENTED` — Fully working in current codebase
> - `PARTIAL` — Some coverage exists; gaps documented
> - `MISSING` — Not yet started
> - `PLANNED` — Roadmap phase assigned; not yet started

> [!IMPORTANT]
> A requirement is marked `IMPLEMENTED` only when the specific functionality described by that requirement is fully working in production-ready code. Do NOT mark as IMPLEMENTED merely because related functionality exists in the codebase.

---

## Table of Contents

1. [Material Management (SIH-MAT)](#1-material-management)
2. [Material Lots (SIH-LOT)](#2-material-lots)
3. [Price Discovery (SIH-PRICE)](#3-price-discovery)
4. [Price History (SIH-HIST)](#4-price-history)
5. [Price Trends (SIH-TREND)](#5-price-trends)
6. [Value Estimation (SIH-VAL)](#6-value-estimation)
7. [Recycler Directory (SIH-RECY)](#7-recycler-directory)
8. [Recycler Offered Rates (SIH-RATE)](#8-recycler-offered-rates)
9. [Recycler Matching (SIH-MATCH)](#9-recycler-matching)
10. [Quotation (SIH-QUOTE)](#10-quotation)
11. [Handover (SIH-HAND)](#11-handover)
12. [Transaction Record (SIH-TXN)](#12-transaction-record)
13. [Payment (SIH-PAY)](#13-payment)
14. [Earnings Ledger (SIH-EARN)](#14-earnings-ledger)
15. [Traceability (SIH-TRACE)](#15-traceability)
16. [Safety Center (SIH-SAFE)](#16-safety-center)
17. [Vernacular UI (SIH-LANG)](#17-vernacular-ui)
18. [Low-Literacy UX (SIH-LIT)](#18-low-literacy-ux)
19. [TTS / Audio (SIH-AUDIO)](#19-tts--audio)
20. [Offline Operation (SIH-OFFLINE)](#20-offline-operation)
21. [AI Classification (SIH-AI-001)](#21-ai-material-classification)
22. [AI Valuation (SIH-AI-002)](#22-ai-valuation)
23. [AI Recycler Recommendation (SIH-AI-003)](#23-ai-recycler-recommendation)
24. [Anomaly Detection (SIH-AI-004)](#24-transaction-anomaly-detection)
25. [Dataset Generation (SIH-DATA)](#25-dataset-generation)
26. [Dataset Validation (SIH-DATA lifecycle)](#26-dataset-validation)
27. [Historical Analytics (SIH-ANLT)](#27-historical-analytics)
28. [Collector Profile (SIH-COL)](#28-collector-profile)
29. [Recycler Dataset (SIH-RDATA)](#29-recycler-dataset)
30. [Field Research (SIH-FIELD)](#30-field-research)
31. [Unit Economics (SIH-ECON)](#31-unit-economics)
32. [SIH Demo (SIH-DEMO)](#32-sih-demo)
33. [Privacy (SIH-PRIV)](#33-privacy)
34. [Summary Dashboard](#34-summary-dashboard)

---

## 1. Material Management

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-MAT-001 | Collector photo capture | Collector material capture (`materialLotService.js`) | POST `/api/v1/material-lots/:id/photos` | `material_lot_photos` | `CollectorMaterialCaptureScreen.tsx` | `tests/verify_material_lots.js` (Test 5) | IMPLEMENTED |
| SIH-MAT-002 | Offline photo capture | Offline queue (`offlineStore.js`) | None (offline local) | AsyncStorage (device) | `CollectorMaterialCaptureScreen.tsx` | `tests/verify_material_lots.js` (Test 17) | IMPLEMENTED |
| SIH-MAT-003 | Pictorial category picker (15 types) | Material taxonomy (`materialTaxonomy.ts`, `.js`) | GET `/api/v1/material-lots` | `MaterialCategory` ENUM | `CollectorMaterialCaptureScreen.tsx` (>=64dp pictorial cards) | `tests/verify_material_lots.js` (Test 7) | IMPLEMENTED |
| SIH-MAT-004 | Subcategory selection | Category configuration (`materialTaxonomy.ts`, `.js`) | POST `/api/v1/material-lots` | `material_items.subcategory` / `material_lots.subcategory` | `CollectorMaterialCaptureScreen.tsx` | `tests/verify_material_lots.js` (Test 8) | IMPLEMENTED |
| SIH-MAT-005 | Approximate weight entry | Material form & numeric keypad | POST `/api/v1/material-lots` | `material_items.approximate_weight_kg` / `material_lots.approximate_total_weight_kg` | `CollectorCreateLotScreen.tsx` | `tests/verify_material_lots.js` (Test 6) | IMPLEMENTED |
| SIH-MAT-006 | Condition selection | Material condition picker | POST `/api/v1/material-lots` | `ItemCondition` ENUM (`material_items.condition`) | `CollectorMaterialCaptureScreen.tsx` | `tests/verify_material_lots.js` (Test 9) | IMPLEMENTED |
| SIH-MAT-007 | Source type selection | Material source picker | POST `/api/v1/material-lots` | `MaterialSourceType` ENUM (`material_items.source_type`) | `CollectorMaterialCaptureScreen.tsx` | `tests/verify_material_lots.js` (Test 10) | IMPLEMENTED |
| SIH-MAT-008 | Description field | Material form notes | POST `/api/v1/material-lots` | `material_items.description` / `material_lots.description` | `CollectorCreateLotScreen.tsx` | `tests/verify_material_lots.js` (Test 1) | IMPLEMENTED |
| SIH-MAT-009 | Unique reference ID | Reference number generator | Auto (`MAT-YYYYMM-XXXXX`) | `material_items.reference_id` | `CollectorLotDetailScreen.tsx` | `tests/verify_material_lots.js` (Test 1) | IMPLEMENTED |
| SIH-MAT-010 | Low-literacy icon requirement | UI design system tokens | None (pictorial UI) | N/A | `CollectorMaterialCaptureScreen.tsx` (>=48dp touch, >=64dp icons) | `tests/verify_material_lots.js` (Test 19) | IMPLEMENTED |

**Status summary:** All 10 Material Management requirements are fully IMPLEMENTED, tested end-to-end, and integrated into the collector journey.

---

## 2. Material Lots

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-LOT-001 | Create Material Lot | Material Lot service (`materialLotService.js`) | POST `/api/v1/material-lots` | `material_lots` | `CollectorCreateLotScreen.tsx` | `tests/verify_material_lots.js` (Test 2) | IMPLEMENTED |
| SIH-LOT-002 | Lot contents definition | Material Lot schema | GET `/api/v1/material-lots/:id` | `material_lots` + `material_lot_items` + `material_items` | `CollectorLotDetailScreen.tsx` | `tests/verify_material_lots.js` (Test 4) | IMPLEMENTED |
| SIH-LOT-003 | Offline lot draft | Offline store + queue (`offlineStore.js`) | None (offline local) | AsyncStorage (device) | `CollectorCreateLotScreen.tsx` | `tests/verify_material_lots.js` (Test 17) | IMPLEMENTED |
| SIH-LOT-004 | Lot editing before submission | Material Lot service | PATCH `/api/v1/material-lots/:id` | `material_lots` | `CollectorLotDetailScreen.tsx` / `CollectorCreateLotScreen.tsx` | `tests/verify_material_lots.js` (Test 15, 16) | IMPLEMENTED |
| SIH-LOT-005 | Human-readable lot reference | ID generation service | Auto (`LOT-YYYYMM-XXXXX`) | `material_lots.reference_number` | `CollectorLotsScreen.tsx` + `CollectorLotDetailScreen.tsx` | `tests/verify_material_lots.js` (Test 3) | IMPLEMENTED |
| SIH-LOT-006 | Lot status display | Material Lot status enum | GET `/api/v1/material-lots` | `material_lots.status` (`MaterialLotStatus`) | `CollectorLotsScreen.tsx` + `CollectorLotDetailScreen.tsx` | `tests/verify_material_lots.js` (Test 12) | IMPLEMENTED |
| SIH-LOT-007 | Multiple photos per lot | Photo attachment service | POST `/api/v1/material-lots/:id/photos` | `material_lot_photos` | `CollectorMaterialCaptureScreen.tsx` + `CollectorLotDetailScreen.tsx` | `tests/verify_material_lots.js` (Test 5) | IMPLEMENTED |
| SIH-LOT-008 | GPS capture at lot creation | Location service (`locationService.ts`) | POST `/api/v1/material-lots` | `material_lots.collection_lat/lng` | `CollectorCreateLotScreen.tsx` + `CollectorLotDetailScreen.tsx` | `tests/verify_material_lots.js` (Test 11) | IMPLEMENTED |

**Status summary:** All 8 Material Lot requirements are fully IMPLEMENTED with offline draft creation, idempotent sync, and verified RBAC boundaries.

---

## 3. Price Discovery

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-PRICE-001 | Price Board (current rates) | Price service (`priceService.js`) | GET `/api/v1/prices?category=&location=` | `price_data` | `CollectorPriceBoardScreen.tsx` | `tests/verify_price_discovery.js` (Tests 1, 6, 7, 8) | IMPLEMENTED |
| SIH-PRICE-002 | Offline Price Board | Cache service (`offlineStore.js` + `priceService.ts`) | None (offline cached) | AsyncStorage (`@ecosetu_cache_prices`) | `CollectorPriceBoardScreen.tsx` | `tests/verify_price_discovery.js` (Test 20) | IMPLEMENTED |
| SIH-PRICE-003 | Instant value estimate | Valuation service (`priceService.js`) | GET `/api/v1/prices/estimate` | `price_data` | `CollectorCreateLotScreen.tsx` | `tests/verify_price_discovery.js` (Test 14) | IMPLEMENTED |
| SIH-PRICE-004 | Value estimate range (low-high) | Valuation service (`priceService.js`) | GET `/api/v1/prices/estimate` | `price_data` (derived from records) | `CollectorPriceBoardScreen.tsx` + `CollectorCreateLotScreen.tsx` | `tests/verify_price_discovery.js` (Tests 13, 14) | IMPLEMENTED |
| SIH-PRICE-005 | Recycler rates on Price Board | Price service (`priceService.js`) | GET `/api/v1/prices` | `price_data` (`RECYCLER_OFFER`) | `CollectorPriceBoardScreen.tsx` | `tests/verify_price_discovery.js` (Test 1) | IMPLEMENTED |
| SIH-PRICE-006 | TTS for prices | Audio assistance (`voiceService.ts`) | On-device native TTS (no cloud API) | None | `CollectorPriceBoardScreen.tsx` | `tests/verify_price_discovery.js` (Test 21) | IMPLEMENTED |
| SIH-PRICE-007 | Unit of measurement | Price schema (`PriceUnit`) | GET `/api/v1/prices` | `price_data.unit` (`PER_KG`, `PER_UNIT`, `PER_LOT`) | `CollectorPriceBoardScreen.tsx` | `tests/verify_price_discovery.js` (Test 19) | IMPLEMENTED |
| SIH-PRICE-008 | Cache freshness indicator | Freshness metadata (`priceService.ts`) | GET `/api/v1/prices` | `lastUpdatedAt`, age metadata | `CollectorPriceBoardScreen.tsx` | `tests/verify_price_discovery.js` (Test 20) | IMPLEMENTED |
| SIH-PRICE-009 | No fabricated prices | Anti-Fabrication rule & Admin ingestion | POST `/api/v1/admin/prices` | `price_data` (`ADMIN_VERIFIED`) | Dedicated empty state without fake numbers | `tests/verify_price_discovery.js` (Tests 3, 12, 15) | IMPLEMENTED |

**Status summary:** All 9 Price Discovery requirements are fully IMPLEMENTED, anti-fabrication enforced, offline cached with 24h staleness threshold, and backed by accessible voice readouts.

---

## 4. Price History

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-HIST-001 / SIH-PRICE-010 | Historical price dataset | Price history service (`priceService.js`) | GET `/api/v1/prices/history?category=&location=` | `price_data` | `CollectorPriceBoardScreen.tsx` (History tab) | `tests/verify_price_history.js` (Tests 1, 4, 5, 7) | IMPLEMENTED |
| SIH-HIST-002 | Dynamic price generation from transactions | Transaction -> price pipeline | Automatic (background job) | `price_data` / transactions | N/A (background) | Future phase | MISSING |
| SIH-HIST-003 / SIH-PRICE-011 | Historical price display (chart/table) | Price history UI (`priceService.ts`) | GET `/api/v1/prices/history` | `price_data` | `CollectorPriceBoardScreen.tsx` | `tests/verify_price_history.js` (Tests 4, 6, 19) | IMPLEMENTED |
| SIH-HIST-004 | Data retention for historical queries | Status & date preservation | GET `/api/v1/prices/history` | `price_data` (expired records retained) | Same screen | `tests/verify_price_history.js` (Test 7) | IMPLEMENTED |

**Status summary:** Historical price data model, admin historical ingestion, date-range filtering, and collector historical querying are fully IMPLEMENTED and verified.

---

## 5. Price Trends

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-TREND-001 / SIH-PRICE-012 | Price trend computation | Trend analytics (`priceService.js`) | GET `/api/v1/prices/history?period=WEEKLY/MONTHLY` | `price_data` aggregation | `CollectorPriceBoardScreen.tsx` | `tests/verify_price_history.js` (Tests 10–16) | IMPLEMENTED |
| SIH-TREND-002 / SIH-PRICE-014 | Low-literacy trend indicators | UI component & Accessible TTS | None (display + on-device TTS) | None | `CollectorPriceBoardScreen.tsx` (📈 Up, 📉 Down, ➡️ Stable) | `tests/verify_price_history.js` (Tests 15, 16) | IMPLEMENTED |
| SIH-TREND-003 / SIH-PRICE-013 | Transparent methodology | API metadata & UI notice | GET `/api/v1/prices/history` | None | Strict non-prediction notice on screen | `tests/verify_price_history.js` (Test 18) | IMPLEMENTED |
| SIH-TREND-004 | No display if insufficient data | Trend guard logic | Same endpoint | Insufficient data check (< 2 periods) | Insufficient data card on screen | `tests/verify_price_history.js` (Test 18) | IMPLEMENTED |

**Status summary:** Deterministic weekly/monthly trend computation, directional indicators, transparent methodology disclosure, and insufficient-data safeguards are fully IMPLEMENTED.

---

## 6. Value Estimation

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-VAL-001 | Instant value estimate | Valuation service (`priceService.js`) | GET `/api/v1/prices/estimate` | `price_data` | `CollectorCreateLotScreen.tsx` | `tests/verify_price_discovery.js` (Test 14) | IMPLEMENTED |
| SIH-VAL-002 | Estimate computation from price data | Deterministic range rule | Same endpoint | `price_data` | `CollectorCreateLotScreen.tsx` | `tests/verify_price_discovery.js` (Tests 14, 16) | IMPLEMENTED |
| SIH-VAL-003 | Rule-based fallback when insufficient data | Guard & empty state | Same endpoint | None | "Estimate unavailable" state | `tests/verify_price_discovery.js` (Test 15) | IMPLEMENTED |
| SIH-VAL-004 | Not presented as guaranteed price | Non-guarantee disclaimer | GET `/api/v1/prices/estimate` | None | Mandatory disclaimer in valuation card | `tests/verify_price_discovery.js` (Tests 16, 17) | IMPLEMENTED |
| SIH-VAL-005 | Transparent methodology disclosure | Valuation service | GET `/api/v1/prices/estimate` | None | Transparent methodology description | `tests/verify_price_discovery.js` (Test 18) | IMPLEMENTED |

**Status summary:** All 5 Value Estimation requirements are fully IMPLEMENTED with deterministic math, explicit disclaimers, methodology disclosure, and no fabrication of fake estimates.

---

## 7. Recycler Directory

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-RECY-001 | Authorized recycler directory | Recycler service (`recyclerService.js`) | GET /api/v1/recyclers | `recycler_profiles` (ACTIVE users only) | `CollectorRecyclerDirectoryScreen.tsx` | `tests/verify_recycler_directory.js` (Check 1–9) | IMPLEMENTED |
| SIH-RECY-002 | Filterable directory | Recycler search + filters | GET /api/v1/recyclers?category=&authorizationStatus=&pickupAvailable=&search=&hasRates= | `recycler_profiles` multi-filter | `CollectorRecyclerDirectoryScreen.tsx` (filter chips, search bar) | `tests/verify_recycler_directory.js` (Check 11–15, 35–41) | IMPLEMENTED |
| SIH-RECY-003 | Authorization status display | Authorization badge UI + DB field | GET /api/v1/recyclers | `recycler_profiles.authorization_status` | `CollectorRecyclerDirectoryScreen.tsx` (color-coded status badges), `CollectorRecyclerDetailScreen.tsx` (full banner) | `tests/verify_recycler_directory.js` (Check 39, 46) | IMPLEMENTED |
| SIH-RECY-004 | Offline directory cache | Cache service (`recyclerDirectoryService.ts`) | None (offline AsyncStorage cache) | AsyncStorage (`@ecosetu_cache_recycler_directory`) with 24h staleness flag | `CollectorRecyclerDirectoryScreen.tsx` (offline banner + stale warning) | `tests/verify_recycler_directory.js` (Check 27, 28, 37) | IMPLEMENTED |
| SIH-RECY-005 | Authorized-only filtering | Authorization status filter | GET /api/v1/recyclers?authorizationStatus=AUTHORIZED | `recycler_profiles.authorization_status` | `CollectorRecyclerDirectoryScreen.tsx` (✓ Authorized Only filter chip) | `tests/verify_recycler_directory.js` (Check 12, 36) | IMPLEMENTED |
| SIH-RECY-006 | Contact visible + facility detail | Full detail screen (`CollectorRecyclerDetailScreen.tsx`) | GET /api/v1/recyclers/:id | `recycler_profiles` JOIN `users` (contact) | `CollectorRecyclerDetailScreen.tsx` (contact card + click-to-call + SMS) | `tests/verify_recycler_directory.js` (Check 23, 43, 42) | IMPLEMENTED |
| SIH-RECY-007 | Proximity / distance display | Haversine distance calculation in service | GET /api/v1/recyclers + GET /api/v1/recyclers/:id | None (computed from lat/lng) | `CollectorRecyclerDirectoryScreen.tsx` + `CollectorRecyclerDetailScreen.tsx` | `tests/verify_recycler_directory.js` (Check 16–18, 40) | IMPLEMENTED |
| SIH-RECY-008 | Offered rates in directory | Active rate aggregation per recycler | GET /api/v1/recyclers, GET /api/v1/recyclers/:id | `recycler_offered_rates` (ACTIVE, non-expired) | `CollectorRecyclerDetailScreen.tsx` (rate cards with RECYCLER_OFFER label) | `tests/verify_recycler_directory.js` (Check 21, 44, 45) | IMPLEMENTED |
| SIH-RECY-009 | Anti-fabrication: no invented data | Anti-fabrication guards | N/A (code policy) | All data read from DB; source: 'RECYCLER_OFFER' | `CollectorRecyclerDetailScreen.tsx` (sourceReference displayed) | `tests/verify_recycler_directory.js` (Check 60–62) | IMPLEMENTED |
| SIH-RECY-010 | Multilingual TTS for directory | `generateRecyclerSpeechText()` in mobile service | None (on-device TTS) | None | `CollectorRecyclerDetailScreen.tsx` (🔊 Listen button) | `tests/verify_recycler_directory.js` (Check 32) | IMPLEMENTED |

**Status summary:** All Recycler Directory requirements (SIH-RECY-001 through SIH-RECY-010) are fully IMPLEMENTED as of Prompt 10. Full collector discovery experience with search, multi-filter, authorization status badges, Haversine distance, pickup indicator, active offered rates (clearly labeled as recycler offers not market price), facility detail screen, click-to-call, multilingual TTS, offline caching with 24h staleness, and strict anti-fabrication.

---

## 8. Recycler Offered Rates

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-RATE-001 | Recycler sets rates per category | Recycler rate service | POST /api/v1/recyclers/rates, POST /api/v1/admin/recycler-rates | recycler_offered_rates | RecyclerRateManagementScreen / API | verify_recycler_matching.js | IMPLEMENTED |
| SIH-RATE-002 | Rate history with timestamp | Rate history service | GET /api/v1/recyclers/rates, GET /api/v1/admin/recycler-rates | recycler_offered_rates (effectiveDate, expiryDate, audit) | N/A | verify_recycler_matching.js | IMPLEMENTED |
| SIH-RATE-003 | Rates visible in Price Board + matching | Recycler rate & matching integration | GET /api/v1/recycler-rates, GET /api/v1/material-lots/:id/matches | recycler_offered_rates JOIN recycler_profiles | CollectorRecyclerMatchesScreen | verify_recycler_matching.js | IMPLEMENTED |
| SIH-RATE-004 | Anomaly flagging for outlier rates | Rate anomaly service (Phase 8) | Background job | recycler_offered_rates flagged | Admin review screen | None | PLANNED |

**Status summary:** SIH-RATE-001, SIH-RATE-002, SIH-RATE-003 fully implemented with validation, positive pricing, provenance, and historical audit preservation. SIH-RATE-004 is planned for Phase 8 anomaly detection.

---

## 9. Recycler Matching

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-MATCH-001 | Match lot to recyclers by location + category + rate + availability | Matching service | GET /api/v1/material-lots/:id/matches | material_lots + recycler_profiles + recycler_offered_rates | CollectorRecyclerMatchesScreen | verify_recycler_matching.js | IMPLEMENTED |
| SIH-MATCH-002 | Ranked results (rate + proximity) | Deterministic sort options | GET /api/v1/material-lots/:id/matches (sorted) | Deterministic sort (price, distance, freshness) | CollectorRecyclerMatchesScreen | verify_recycler_matching.js | IMPLEMENTED |
| SIH-MATCH-003 | Distance to recycler | Location service (Haversine) | GET /api/v1/material-lots/:id/matches | recycler_profiles.facility_lat/lng | CollectorRecyclerMatchesScreen | verify_recycler_matching.js | IMPLEMENTED |
| SIH-MATCH-004 | Pickup availability indicator | Recycler profile extension | GET /api/v1/material-lots/:id/matches | recycler_profiles.pickup_available | CollectorRecyclerMatchesScreen | verify_recycler_matching.js | IMPLEMENTED |
| SIH-MATCH-005 | Rule-based matching baseline | Matching service | GET /api/v1/material-lots/:id/matches | Deterministic rules (✓/✗/⚠ checklist) | CollectorRecyclerMatchesScreen | verify_recycler_matching.js | IMPLEMENTED |
| SIH-MATCH-006 | Compare multiple recycler offers | Matching UI | GET /api/v1/material-lots/:id/matches | Multiple offer cards with benchmark comparison | CollectorRecyclerMatchesScreen | verify_recycler_matching.js | IMPLEMENTED |

**Status summary:** SIH-MATCH-001 through SIH-MATCH-006 fully implemented with deterministic rule-based matching, transparent match checklist reasons, proximity calculation, pickup badge, multi-offer comparison, offline caching, and vernacular TTS. Quotation and transaction negotiation are explicitly excluded and deferred to subsequent phases.

---

## 10. Quotation

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-QUOTE-001 | Recycler issues quote | Quote service | POST /api/v1/quotes | quotes | RecyclerCreateQuoteScreen | verify_quotes.js | IMPLEMENTED |
| SIH-QUOTE-002 | Quote schema | Quote model & validation | POST /api/v1/quotes | quotes table schema | RecyclerCreateQuoteScreen | verify_quotes.js | IMPLEMENTED |
| SIH-QUOTE-003 | Collector accepts/declines | Quote decision service | POST /api/v1/quotes/:id/accept, :id/reject | quotes.status (ACCEPTED/REJECTED) | CollectorQuotesScreen | verify_quotes.js | IMPLEMENTED |
| SIH-QUOTE-004 | Online-required acceptance | Server-authoritative validation | POST /api/v1/quotes/:id/accept | quotes.accepted_at (server time) | CollectorQuotesScreen (online enforcement) | verify_quotes.js | IMPLEMENTED |
| SIH-QUOTE-005 | Recycler notified on decision | Notification service | Auto-triggered on accept/reject | notifications table | In-app notification / push dispatch | verify_quotes.js | IMPLEMENTED |
| SIH-QUOTE-006 | Accepted quote becomes economic basis for Handover | Quote acceptance & lot state transition | POST /api/v1/quotes/:id/accept | material_lots.status -> ACCEPTED, quotes.status -> ACCEPTED, competing quotes -> CANCELLED | CollectorQuotesScreen | verify_quotes.js | IMPLEMENTED (Foundation ready; handover execution in Phase 6) |
| SIH-QUOTE-007 | Quote retained in transaction dataset | Historical quote preservation | All endpoints (non-destructive) | quotes table (ALL statuses retained) | Admin audit / quote listing | verify_quotes.js | IMPLEMENTED |

**Status summary:** SIH-QUOTE-001 through SIH-QUOTE-007 fully implemented. Quotation and commercial offer workflow complete with deterministic lifecycle (SENT, VIEWED, ACCEPTED, REJECTED, EXPIRED, CANCELLED), positive pricing, unit validation, server-authoritative date validity, competitive multi-quote side-by-side comparison, atomic acceptance with auto-cancellation of competing bids, rejection reasons, audit trail logging, resilient notification dispatch, offline read-only caching with staleness badges, and multilingual vernacular TTS. Physical/digital handover execution, payment processing, cash settlement, and earnings ledger are strictly excluded and deferred to subsequent phases.

---

## 11. Handover

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|---|---|---|---|---|---|---|---|
| SIH-HAND-001 / SIH-HANDOVER-001 | Digital Handover Record creation | Handover service | POST /api/v1/handovers | `handover_records` + `handover_photos` | `CollectorHandoverScreen` | `verify_handovers.js` | IMPLEMENTED |
| SIH-HAND-002 / SIH-HANDOVER-005 | Recycler digital confirmation | Handover confirmation service | POST /api/v1/handovers/:id/recycler-confirm | `handover_records.recycler_confirmed_at`, `status` | `RecyclerHandoverConfirmScreen` | `verify_handovers.js` | IMPLEMENTED |
| SIH-HAND-003 / SIH-HANDOVER-002 | Verifiable unique reference | Reference generation (`HDO-YYYYMM-XXXXX`) | Auto server-side | `handover_records.reference_number` (UNIQUE) | Display on collector & recycler screens | `verify_handovers.js` | IMPLEMENTED |
| SIH-HAND-004 / SIH-HANDOVER-004 | Two-party confirmation & online enforcement | Live server-authoritative validation; offline read-only cached receipts | POST /api/v1/handovers/:id/collector-confirm, :id/recycler-confirm | `handover_records` + `AsyncStorage` (@ecosetu_cache_handover_*) | `CollectorHandoverScreen`, `RecyclerHandoverConfirmScreen` | `verify_handovers.js` | IMPLEMENTED |
| SIH-HAND-005 | Immutability after final confirmation | Immutability enforcement | Server-side: no modifications once status is `CONFIRMED` | `handover_records` (transactional status checks) | N/A (Server enforced) | `verify_handovers.js` | IMPLEMENTED |
| SIH-HAND-006 / SIH-HANDOVER-007 | Actual/confirmed weight & photo evidence linkage | Weight & evidence capture | POST /api/v1/handovers/:id/photos, :id/*-confirm | `handover_records.handover_weight_kg`, `handover_photos` | `CollectorHandoverScreen`, `RecyclerHandoverConfirmScreen` | `verify_handovers.js` | IMPLEMENTED |
| SIH-HAND-007 / SIH-HANDOVER-006 | Collector & Recycler verifiable receipt | Digital receipt service with compliance disclaimer | GET /api/v1/handovers/:id/receipt | `handover_records` JOIN `quotes` JOIN `material_lots` | `CollectorHandoverReceiptScreen` | `verify_handovers.js` | IMPLEMENTED |

> [!NOTE]
> **Requirements SIH-HANDOVER-001 through SIH-HANDOVER-008 Mapping**:
> - **SIH-HANDOVER-001**: Handover data model linking Material Lot + Accepted Quote + Collector + Recycler + Photos + Weight + Timestamp + Location + Status. (`IMPLEMENTED`)
> - **SIH-HANDOVER-002**: Unique human-readable reference number (`HDO-YYYYMM-XXXXX`). (`IMPLEMENTED`)
> - **SIH-HANDOVER-003**: Strict Accepted-quote validation (SENT, VIEWED, REJECTED, EXPIRED, CANCELLED blocked). (`IMPLEMENTED`)
> - **SIH-HANDOVER-004**: Collector handover initiation with actual weight, server timestamp, and GPS capture. (`IMPLEMENTED`)
> - **SIH-HANDOVER-005**: Recycler digital handover confirmation with physical receipt verification. (`IMPLEMENTED`)
> - **SIH-HANDOVER-006**: Verifiable digital handover receipt with explicit non-payment / non-recycling compliance disclaimer. (`IMPLEMENTED`)
> - **SIH-HANDOVER-007**: Persistent photo evidence and dual declared vs confirmed weight preservation. (`IMPLEMENTED`)
> - **SIH-HANDOVER-008**: Collector/Recycler history, RBAC tenancy isolation, audit logging, resilient notifications, and multilingual vernacular i18n (en, hi, mr, or). (`IMPLEMENTED`)
>
> **Strict Boundary Notice**: Digital Handover proves physical custody transfer between authenticated parties. It does NOT process payments, create earnings ledgers, initiate banking transfers, or record recycling completion (which are reserved for future phases).

**Status summary:** SIH-HAND-001 through SIH-HAND-007 (and SIH-HANDOVER-001 through SIH-HANDOVER-008) fully implemented. Complete verifiable digital transfer foundation linking Material Lot, Accepted Quote, Collector, Recycler, photographic evidence, declared vs confirmed weights, server-authoritative timestamps, GPS location with explicit zero-fabrication fallback, two-party explicit digital confirmation lifecycle (PENDING_COLLECTOR -> COLLECTOR_CONFIRMED -> CONFIRMED), atomic database transactions, digital receipt with compliance disclaimer, offline read-only cached receipts, audit trail logging, and vernacular audio/i18n in English, Hindi, Marathi, and Odia. Financial settlement, earnings ledgers, UPI/bank payments, and recycling completion remain strictly unexecuted.

---

## 12. Transaction Record

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-TXN-001 | Transaction record per completed handover | Transaction service | POST /api/v1/transactions | transactions (`TransactionRecord`) | CollectorRecordSaleScreen, CollectorTransactionsScreen, CollectorTransactionDetailScreen | `tests/verify_transactions.js` | IMPLEMENTED |
| SIH-TXN-002 | Immutable after finalization | Immutability enforcement | Server-side & POST /api/v1/transactions/:id/cancel | transactions (core relations locked after RECORDED) | N/A (server enforced) | `tests/verify_transactions.js` | IMPLEMENTED |
| SIH-TXN-003 | Feeds Earnings Ledger | Earnings aggregation | GET /api/v1/earnings/summary, GET /api/v1/earnings/transactions | transactions (`TransactionRecord`) | CollectorEarningsScreen, CollectorTransactionDetailScreen | `tests/verify_earnings.js` | IMPLEMENTED |
| SIH-TXN-004 | Anomaly detection support | Anomaly service | Background job | transactions + anomaly_flags | AdminAnomalyReviewScreen | None | PLANNED |
| SIH-TXN-005 | Audit retention | Audit policy & logging | Server-side AuditService | transactions (`AuditLog`) | N/A | `tests/verify_transactions.js` | IMPLEMENTED |

**Gap summary:** Core financial transaction-recording layer implemented per Prompt 7, and dynamic derived Earnings Ledger implemented per Prompt 8. Immutable provenance links MaterialLot -> Quote -> HandoverRecord -> TransactionRecord -> Derived Earnings. Zero money movement, zero synthetic data. Future anomaly detection remains planned.

---

## 13. Payment

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-PAY-001 | Cash payment support | Transaction service (recording) | POST /api/v1/transactions, PATCH /api/v1/transactions/:id/payment-status | transactions.payment_method = CASH, payment_status | CollectorRecordSaleScreen, CollectorTransactionDetailScreen | `tests/verify_transactions.js` | IMPLEMENTED |
| SIH-PAY-002 | Digital not mandatory | Platform policy | Server-side / validation | transactions.payment_method ENUM (CASH, UPI_RECORDED, BANK_TRANSFER_RECORDED, OTHER) | CollectorRecordSaleScreen (CASH is default/supported) | `tests/verify_transactions.js` | IMPLEMENTED |
| SIH-PAY-003 | Payment status recording | Transaction service | PATCH /api/v1/transactions/:id/payment-status | transactions.payment_status ENUM (PENDING, PARTIALLY_PAID, PAID, FAILED, NOT_APPLICABLE) | CollectorTransactionDetailScreen | `tests/verify_transactions.js` | IMPLEMENTED |
| SIH-PAY-004 | Collector marks cash received | Payment acknowledgment | PATCH /api/v1/transactions/:id/payment-status | transactions.payment_status = PAID, amount_paid = final_sale_value | CollectorTransactionDetailScreen | `tests/verify_transactions.js` | IMPLEMENTED |
| SIH-PAY-005 | Payment date/time and method | Payment record | Same endpoints | transactions.transaction_date, payment_method, disclaimer | CollectorRecordSaleScreen, CollectorTransactionDetailScreen | `tests/verify_transactions.js` | IMPLEMENTED |
| SIH-PAY-006 | Digital payment (FUTURE) | Future gateway / escrow | N/A | N/A | N/A | N/A | PLANNED (FUTURE) |

> [!NOTE]
> **SIH 26229 Recording Layer:** Payment recording layer operational. Records what happened financially with transparent statutory non-movement disclaimers ("Recording only — ECOSETU does not transfer money"). NO payment processing, UPI, or bank integrations are executed.

**Gap summary:** Payment recording implemented without external money movement or payment gateways. Real-money gateways remain non-goals / future scope.

---

## 14. Earnings Ledger
 
| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-EARN-001 | Earnings Ledger per collector | Earnings service | GET /api/v1/earnings/summary | transactions (`TransactionRecord`) aggregation | CollectorEarningsScreen | `tests/verify_earnings.js` | IMPLEMENTED |
| SIH-EARN-002 | Simple ledger format | UI design & low-literacy cards | GET /api/v1/earnings/summary | transactions (derived metrics) | CollectorEarningsScreen ("Sales Recorded", "Money Received", "Money Pending") | `tests/verify_earnings.js` | IMPLEMENTED |
| SIH-EARN-003 | Financial history building | Earnings history & filters | GET /api/v1/earnings/transactions?period=&startDate=&endDate= | transactions (server-authoritative timestamps) | CollectorEarningsScreen, CollectorTransactionDetailScreen | `tests/verify_earnings.js` | IMPLEMENTED |
| SIH-EARN-004 | Earnings in Collector Dataset | Collector ledger service | GET /api/v1/earnings/summary, GET /api/v1/earnings/monthly | transactions (scoped to collector profile) | CollectorEarningsScreen | `tests/verify_earnings.js` | IMPLEMENTED |
| SIH-EARN-005 | Total earnings, pending, history | Earnings aggregation & pending dues | GET /api/v1/earnings/pending-dues | transactions (`amountDue > 0`, oldest-first) | CollectorEarningsScreen | `tests/verify_earnings.js` | IMPLEMENTED |
| SIH-EARN-006 | Offline earnings cache | Offline storage & cache | Local storage (`@ecosetu_cache_earnings_summary`) | AsyncStorage / Local Cache | CollectorEarningsScreen ("Offline — showing cached earnings") | `tests/verify_earnings.js` | IMPLEMENTED |

**Status summary:** SIH-EARN-001 through SIH-EARN-006 fully IMPLEMENTED. Informational financial ledger derived directly from `TransactionRecord` without independent mutable balance tables. Provides total recorded sales, money received, money pending, partial payments, monthly historical breakdown, oldest-first pending dues, category/date filters, offline cached viewing, and on-device vernacular TTS in English, Hindi, Marathi, and Odia. Zero money movement, zero payment gateways, zero predictive AI/forecasting.

---

## 15. Traceability

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-TRACE-001 | End-to-end lot traceability (Journey B) | Lot trace service (`lotTraceService.js`) | GET /api/v1/material-lots/:id/trace | material_lots + quotes + handover_records + transactions + audit_logs | `CollectorLotTraceScreen.tsx` | `tests/verify_traceability.js` | IMPLEMENTED |
| SIH-TRACE-002 | Traceability dataset fields | Traceability read model (`lotTraceService.js`) | GET /api/v1/material-lots/:id/trace | Server-assembled 14 lifecycle fields | `CollectorLotTraceScreen.tsx` | `tests/verify_traceability.js` | IMPLEMENTED |
| SIH-TRACE-003 | Append-only audit | Audit service (`AuditLog`) | Server-side `AuditLog` queries | audit_logs (append-only) | `CollectorLotTraceScreen.tsx` | `tests/verify_traceability.js` | IMPLEMENTED |
| SIH-TRACE-004 | Viewable by collector, recycler, admin | Trace RBAC & isolation | GET /api/v1/material-lots/:id/trace | Role check & multi-tenant tenancy isolation | `CollectorLotTraceScreen.tsx` (Collector + Recycler) | `tests/verify_traceability.js` | IMPLEMENTED |
| SIH-TRACE-005 | Journey A + Journey B coverage | Dual Journey Traceability | GET /api/v1/ewaste-items/:id/traceability (Journey A) + GET /api/v1/material-lots/:id/trace (Journey B) | audit_logs (Journey A) + relational trace model (Journey B) | `ItemTraceabilityScreen.tsx` (Journey A) + `CollectorLotTraceScreen.tsx` (Journey B) | `tests/verify_traceability.js` | IMPLEMENTED |
| SIH-TRACE-006 | Unique verifiable handover reference | Handover reference generator | Auto (`HDO-YYYYMM-XXXXX`) | handover_records.reference_number | `CollectorLotTraceScreen.tsx`, `HandoverReceiptModal.tsx` | `tests/verify_traceability.js` | IMPLEMENTED |

**Status summary:** SIH-TRACE-001 through SIH-TRACE-006 are fully IMPLEMENTED. Authoritative read-model service dynamically assembles all 14 lifecycle stages (lot, materials, photos, location, benchmark price, quotes, accepted quote, recycler, handover, transaction, payment, recycling status, final status, chronological timeline, and append-only audit trail) without redundant tables or mutable synthetic data. Strict zero-fabrication enforced for uncompleted stages. Multi-tenant RBAC guarantees collector privacy and tenant isolation. Accessible mobile UI provides 10 modular visual cards, high-contrast timeline, offline caching (>24h staleness flag), and on-device vernacular TTS in English, Hindi, Marathi, and Odia.

---

## 16. Safety Center

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-SAFE-001 | 7 safety topics with pictorial + audio | Safety Center (`safetyGuidance.ts`) | None (bundled) | None (static bundled catalog) | `CollectorSafetyCenterScreen.tsx` | `tests/verify_safety_content.js` | IMPLEMENTED |
| SIH-SAFE-002 | Low-literacy safety UX | Safety UI design (`CollectorSafetyDetailScreen.tsx`) | None | None | `CollectorSafetyDetailScreen.tsx` | `tests/verify_safety_content.js` | IMPLEMENTED |
| SIH-SAFE-003 | Hindi + Marathi safety content | i18n (`hi.ts`, `mr.ts`, `or.ts`, `en.ts`) | None | None | `CollectorSafetyCenterScreen.tsx` | `tests/verify_safety_content.js` | IMPLEMENTED |
| SIH-SAFE-004 | TTS for safety | TTS service (`voiceService.ts`) | None (device TTS) | None | `CollectorSafetyDetailScreen.tsx` | `tests/verify_safety_content.js` | IMPLEMENTED |
| SIH-SAFE-005 | Offline bundled safety | App bundle (`safetyGuidance.ts`) | None (offline) | None (bundled) | `CollectorSafetyCenterScreen.tsx` | `tests/verify_safety_content.js` | IMPLEMENTED |
| SIH-SAFE-006 | No-login safety access | Navigation guard | None | None | Accessible from Collector navigation | `tests/verify_safety_content.js` | IMPLEMENTED |
| SIH-SAFE-007 | Content accuracy review | Non-medical prevention review | None | None | `safetyGuidance.ts` | `tests/verify_safety_content.js` | IMPLEMENTED |

**Status summary:** All 7 Safety Center requirements are fully IMPLEMENTED with 8 comprehensive topics, offline catalog, pictorial cards, DO/DON'T guidance, natural vernacular translations (EN/HI/MR/OR), and on-device TTS voice assistance.

---

## 17. Vernacular UI

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-LANG-001 | Hindi support | i18n (`mobile/src/i18n/locales/hi.ts`) | None (client-side) | AsyncStorage (`@ecosetu_language`) | All 16 Collector Journey B screens + auth | `backend/tests/verify_vernacular_language.js` | IMPLEMENTED |
| SIH-LANG-002 | Marathi support | i18n (`mobile/src/i18n/locales/mr.ts`) | None (client-side) | AsyncStorage (`@ecosetu_language`) | All 16 Collector Journey B screens + auth | `backend/tests/verify_vernacular_language.js` | IMPLEMENTED |
| SIH-LANG-003 | Odia preserved | i18n (`mobile/src/i18n/locales/or.ts`) | None (client-side) | AsyncStorage (`@ecosetu_language`) | All 16 Collector Journey B screens + auth | `backend/tests/verify_vernacular_language.js` | IMPLEMENTED |
| SIH-LANG-004 | English preserved | i18n (`mobile/src/i18n/locales/en.ts`) | None (client-side) | AsyncStorage (`@ecosetu_language`) | All 16 Collector Journey B screens + auth | `backend/tests/verify_vernacular_language.js` | IMPLEMENTED |
| SIH-LANG-005 | Journey B screens translated | Typed schema & 4 locales (all keys synchronized) | None (client-side) | None | All 16 Collector Journey B screens | `backend/tests/verify_vernacular_language.js` | IMPLEMENTED |
| SIH-LANG-006 | First-launch language selection | First-launch selector (`LandingScreen.tsx`) | None (client-side) | AsyncStorage (`@ecosetu_language`) | `LandingScreen.tsx` / `OnboardingScreen.tsx` | `backend/tests/verify_vernacular_language.js` | IMPLEMENTED |
| SIH-LANG-007 | Language persistence | Local offline storage (`i18n/core.ts`) | None (client-side) | AsyncStorage (`@ecosetu_language`) | Global app state | `backend/tests/verify_vernacular_language.js` | IMPLEMENTED |
| SIH-LANG-008 | Native speaker verification | Non-technical human field process | None | None | None | Manual Field Testing Required | MISSING |
| SIH-LANG-009 | Genuine journey usability | Complete Journey B typed vernacular strings + accessible TTS | None (client-side) | None | All 16 Collector Journey B screens | `backend/tests/verify_vernacular_language.js` | IMPLEMENTED |

**Note:** i18n infrastructure, persistence, first-launch selection, and all 4 languages (EN, HI, MR, OR) are fully IMPLEMENTED and verified across all Collector Journey B screens (`lowLiteracy.*`, `recyclerDirectory.*`, `materialLots.*`, `handover.*`, `transaction.*`, `earnings.*`, `lotTrace.*`, `safety.*`). Native speaker field validation (SIH-LANG-008) is strictly and correctly retained as MISSING / PENDING real human field testing.

---

## 18. Low-Literacy UX

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-LIT-001 | Icons >= 64dp for categories | Design system (`CollectorMaterialCaptureScreen.tsx` 64x64 card & 32pt symbol) | None | None | `CollectorMaterialCaptureScreen.tsx` | `tests/verify_low_literacy_ux.js` | IMPLEMENTED |
| SIH-LIT-002 | <= 3 taps for primary actions | UX design (1-tap Dashboard sales/earnings, 1-tap capture, 1-tap quote accept) | None | None | All 17 collector screens | `tests/verify_low_literacy_ux.js` | IMPLEMENTED |
| SIH-LIT-003 | Color + icon status indicators | Design system (`StatusBadge.tsx` `STATUS_SYMBOLS`) | None | None | All collector screens | `tests/verify_low_literacy_ux.js` | IMPLEMENTED |
| SIH-LIT-004 | Touch targets >= 48dp | Design system (enforced >=48dp controls, >=56dp primary CTAs) | None | None | All 17 screens | `tests/verify_low_literacy_ux.js` | IMPLEMENTED |
| SIH-LIT-005 | Short labels, no jargon | Translation review (plain vernacular translations across 4 locales) | None | None | All 17 collector screens | `tests/verify_low_literacy_ux.js` | IMPLEMENTED |
| SIH-LIT-006 | Explicit confirmation for critical actions | Confirmation dialogs (Quote Accept Modal with 6 core terms) | None | None | `CollectorQuotesScreen.tsx` | `tests/verify_low_literacy_ux.js` | IMPLEMENTED |
| SIH-LIT-007 | No paragraph dependency | UX design review (bullet points, large numeric badges, pictorial cards) | None | None | All 17 collector screens | `tests/verify_low_literacy_ux.js` | IMPLEMENTED |
| SIH-LIT-008 | Minimize text input | Form design (category tap selector, QuickNumberStepper) | None | None | `CollectorMaterialCaptureScreen.tsx`, `CollectorCreateLotScreen.tsx` | `tests/verify_low_literacy_ux.js` | IMPLEMENTED |
| SIH-LIT-009 | Large numpad for weight/price | QuickNumberStepper component (`QuickNumberStepper.tsx`) | None | None | `CollectorCreateLotScreen.tsx`, `CollectorHandoverScreen.tsx` | `tests/verify_low_literacy_ux.js` | IMPLEMENTED |
| SIH-LIT-010 | Pictorial error & empty messages | EmptyState & Error components with pictorial cards & actionable CTAs | None | None | `CollectorLotsScreen.tsx`, `CollectorEarningsScreen.tsx`, etc. | `tests/verify_low_literacy_ux.js` | IMPLEMENTED |

**Note:** Low-literacy UX hardening (SIH-LIT-001..010) fully implemented and verified across all 17 Journey B screens via `tests/verify_low_literacy_ux.js`.

---

## 19. TTS / Audio

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-AUDIO-001 | TTS for prices + estimate + handover ref | TTS service (`voiceService.ts`) | None (device TTS) | None | `CollectorPriceBoardScreen.tsx`, `CollectorHandoverScreen.tsx`, `CollectorLotTraceScreen.tsx` | `tests/verify_low_literacy_ux.js` | IMPLEMENTED |
| SIH-AUDIO-002 | Safety TTS in Hindi + Marathi | TTS + audio assets (`voiceService.ts`, `safetyGuidance.ts`) | None (device TTS) | None | `CollectorSafetyCenterScreen.tsx`, `CollectorSafetyDetailScreen.tsx` | `tests/verify_safety_content.js` | IMPLEMENTED |
| SIH-AUDIO-003 | On-device TTS engine | Voice service wrapper (`voiceService.ts` with Expo Speech fallback) | None | None | All TTS-capable screens | `tests/verify_low_literacy_ux.js` | IMPLEMENTED |
| SIH-AUDIO-004 | TTS playback controls >= 48dp | `ReadAloudButton.tsx` (enforced minHeight/minWidth 48dp + hitSlop) | None | None | All TTS screens | `tests/verify_low_literacy_ux.js` | IMPLEMENTED |
| SIH-AUDIO-005 | Price Board spoken announcement | TTS integration (`voiceService.ts`) | None | None | `CollectorPriceBoardScreen.tsx` | `tests/verify_low_literacy_ux.js` | IMPLEMENTED |

**Note:** Full TTS audio infrastructure (SIH-AUDIO-001..005) operational and integrated across Price Board, Safety Center, Recycler Directory, Quotes, Handover, Earnings, and Lot Trace.

---

## 20. Offline Operation

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-OFFLINE-001 | Photo capture offline | Camera (`cameraService.ts`) | None (offline file/content URI) | None | `CollectorCaptureMaterialScreen.tsx`, `CollectorCreateLotScreen.tsx` | `backend/tests/verify_material_lots.js` | IMPLEMENTED |
| SIH-OFFLINE-002 | Price Board cached (24h) | Cache service (`priceService.ts`, `offlineStore.js`) | None (offline) | AsyncStorage (`@ecosetu_cache_prices`) | `CollectorPriceBoardScreen.tsx` (offline banner, 24h stale warning) | `backend/tests/verify_price_discovery.js`, `backend/tests/verify_offline_sync.js` | IMPLEMENTED |
| SIH-OFFLINE-003 | Safety content bundled offline | App bundle (`safetyGuidance.ts`) | None (offline) | None (bundled) | `CollectorSafetyCenterScreen.tsx`, `CollectorSafetyDetailScreen.tsx` | `backend/tests/verify_safety_content.js` | IMPLEMENTED |
| SIH-OFFLINE-004 | Lot draft offline | Offline queue (`offlineQueue.js`, `offlineStore.js`) | None (offline) | AsyncStorage (`@ecosetu_cache_material_lots`) | `CollectorCreateLotScreen.tsx`, `CollectorLotsScreen.tsx` | `backend/tests/verify_material_lots.js`, `backend/tests/verify_offline_sync.js` | IMPLEMENTED |
| SIH-OFFLINE-005 | Category/weight offline | Local UI state (`QuickNumberStepper.tsx`, `materialTaxonomy.ts`) | None | None | `CollectorCaptureMaterialScreen.tsx`, `CollectorCreateLotScreen.tsx` | `backend/tests/verify_low_literacy_ux.js` | IMPLEMENTED |
| SIH-OFFLINE-006 | GPS offline | Location service (`locationService.ts`) | None (offline device GPS) | None | All location screens | `backend/tests/verify_material_lots.js` | IMPLEMENTED |
| SIH-OFFLINE-007 | Recycler directory cached | Cache service (`recyclerDirectoryService.ts`) | None (offline) | AsyncStorage (`@ecosetu_cache_recycler_directory`, `@ecosetu_cache_recycler_detail_*`) | `CollectorRecyclerDirectoryScreen.tsx`, `CollectorRecyclerDetailScreen.tsx` (offline banner, 24h stale warning) | `backend/tests/verify_recycler_directory.js` | IMPLEMENTED |
| SIH-OFFLINE-008 | Earnings cached offline | Cache service (`earningsService.ts`, `offlineStore.js`) | None (offline) | AsyncStorage (`@ecosetu_cache_earnings_*`) | `CollectorEarningsScreen.tsx` (offline banner, cached badge) | `backend/tests/verify_earnings.js` | IMPLEMENTED |
| SIH-OFFLINE-009 | Quote acceptance online-only | Network guard (`quoteService.ts`) | POST /api/v1/quotes/:id/accept | Server-side timestamp | `CollectorQuotesScreen.tsx` (online check, blocks offline acceptance) | `backend/tests/verify_quotes.js`, `backend/tests/verify_offline_sync.js` | IMPLEMENTED |
| SIH-OFFLINE-010 | Handover confirmation online-only | Network guard (`handoverService.ts`) | POST /api/v1/handovers/:id/collector-confirm | Server-side timestamp | `CollectorHandoverScreen.tsx` (online check, blocks offline confirmation) | `backend/tests/verify_handovers.js`, `backend/tests/verify_offline_sync.js` | IMPLEMENTED |
| SIH-OFFLINE-011 | Payment confirmation online-only | Network guard (`transactionService.ts`) | POST /api/v1/transactions, PATCH /api/v1/transactions/:id/payment | Server-side timestamp | `CollectorRecordSaleScreen.tsx` (online check, blocks offline recording) | `backend/tests/verify_transactions.js`, `backend/tests/verify_offline_sync.js` | IMPLEMENTED |
| SIH-OFFLINE-012 | Auto-sync on reconnect | Offline queue (`offlineQueue.js`) | Multiple endpoints | AsyncStorage queue (`@ecosetu_offline_queue`) | Background service + `SyncStatusBanner.tsx` | `backend/tests/verify_offline_sync.js` | IMPLEMENTED |
| SIH-OFFLINE-013 | Connectivity status display | NetworkContext (`NetworkContext.tsx`, `SyncStatusBanner.tsx`, `OfflineBanner.tsx`) | None | None | `SyncStatusBanner.tsx` (Offline, Pending, Syncing, Synced, Failed, Conflict) | `backend/tests/verify_offline_sync.js` | IMPLEMENTED |
| SIH-OFFLINE-014 | Conflict handling | Conflict resolver (`offlineQueue.js`) | N/A (client queue classification) | AsyncStorage | `SyncStatusBanner.tsx` (Conflict status + review prompt) | `backend/tests/verify_offline_sync.js` | IMPLEMENTED |

**Status summary:** All 14 Offline Operation requirements (SIH-OFFLINE-001..014) are fully IMPLEMENTED and verified. The system implements a robust offline-first architecture with persistent queue operations, unique client operation IDs, server-side idempotency replay protection via `clientReferenceId`, bounded exponential backoff retries, conservative conflict classification (`409` -> `CONFLICT`), authenticated user tenancy isolation (`userId`), sensitive credential scrubbing, safe manual sync (`syncNow`), honest connectivity detection via `NetworkContext`, and low-literacy `SyncStatusBanner` supporting 6 visual/audio states in EN, HI, MR, and OR. Irreversible legal and commercial transitions (quote acceptance, handover confirmation, transaction creation, payment status changes) strictly remain online-only.

---

## 21. AI Material Classification

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-AI-001 | AI classification (optional) | YOLOv8 pipeline & service | POST /ai/predict | ai_predictions | CollectorCaptureMaterialScreen | `ai/tests/test_material_classifier_pipeline.py` | PARTIAL (Pipeline ready, dataset awaiting real import) |
| SIH-AI-001a | Input/output specification | Inference contract (`ai/src/contracts/inference_contract.py`) | POST /ai/predict | N/A | Same | `ai/tests/test_material_classifier_pipeline.py` | IMPLEMENTED |
| SIH-AI-001b | Assistive only / override | AI prediction UI (EXISTS for citizen) | Same | ai_predictions.was_accepted | SubmitItemScreen (citizen — EXISTS); collector NEW | IMPLEMENTED (citizen) | PARTIAL |
| SIH-AI-001c | Do not claim without real model | Pre-flight guard & inspection (`inspect_dataset.py`, `yolo_pipeline.py`) | N/A | N/A | Confidence score shown | `ai/tests/test_material_classifier_pipeline.py` | IMPLEMENTED |
| SIH-AI-001d | Fallback to manual picker | Inference contract (`review_required`) & Fallback UI | N/A | N/A | Collector side manual picker fallback | `ai/tests/test_material_classifier_pipeline.py` | IMPLEMENTED |
| SIH-AI-001e | Dataset and limitations documented | AI Dataset Foundation & Pipeline (`docs/27_AI_DATASET_FOUNDATION.md`, `docs/28_AI_MATERIAL_CLASSIFICATION_PIPELINE.md`) | N/A | `ai/datasets/` metadata & manifests | N/A | `ai/tests/test_dataset_foundation.py` | IMPLEMENTED |

**Note:** YOLOv8 training and evaluation pipeline, pre-training inspection harness, Colab workflow, and inference contracts are fully IMPLEMENTED and verified for all 16 canonical categories (Prompt 19). No model weights have been trained or committed due to the absence of a real dataset in git; the pipeline cleanly refuses to fabricate metrics.

---

## 22. AI Valuation

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-AI-002 | AI valuation (optional) | Valuation model (FUTURE) | GET /api/v1/prices/estimate | price_history (NEW) | CollectorCreateLotScreen | None | MISSING |
| SIH-AI-002a | Rule-based fallback with label | Valuation service (NEW) | Same | price_data (NEW) | Estimate label | None | MISSING (rule-based needed first) |
| SIH-AI-002b | Methodology disclosure | Documentation | N/A | N/A | UI label | None | MISSING |
| SIH-AI-002c | Confidence range not point | Valuation response (NEW) | Same | None | UI range display | None | MISSING |

**Note:** Rule-based valuation is the Phase 2 deliverable. AI valuation is Phase 8. Cannot start either until price dataset exists (Phase 2 prerequisite).

---

## 23. AI Recycler Recommendation

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-AI-003 | AI recycler recommendation (optional) | Recommendation model (FUTURE) | GET /api/v1/material-lots/:id/recycler-matches | Multiple tables | CollectorMatchingScreen | None | MISSING |
| SIH-AI-003a | Rule-based baseline (Phase 3) | Matching service (NEW) | Same endpoint | recycler_profiles + offered_rates | CollectorMatchingScreen | None | MISSING |
| SIH-AI-003b | Algorithm documented | Documentation | N/A | N/A | N/A | None | MISSING |

---

## 24. Transaction Anomaly Detection

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-AI-004 | Anomaly detection (optional) | Anomaly service (FUTURE) | Background job | transactions + anomaly_flags | AdminAnomalyReviewScreen | None | MISSING |
| SIH-AI-004a | Does not block transactions | Flag-only design | N/A | anomaly_flags.is_blocked = false | Admin only | None | MISSING |
| SIH-AI-004b | Flagged tx reviewable by admin | Admin review service (NEW) | GET /api/v1/admin/anomalies | anomaly_flags | AdminAnomalyReviewScreen | None | MISSING |
| SIH-AI-004c | Not deployed until sufficient history | Deployment gate | N/A | N/A | N/A | None | PLANNED |

---

## 25. Dataset Generation

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database Table | Test | Status |
|--------|-------------|----------------|-------------|----------------|------|--------|
| SIH-DATA-001 | Material Dataset (dynamic) | Material capture + lots (NEW) | Multiple | material_items (NEW) | None | MISSING |
| SIH-DATA-002 | Not static CSV | Platform operations | Multiple | material_items auto-populated | None | MISSING |
| SIH-DATA-003 | Price Dataset | Price service + admin ingestion (NEW) | POST /api/v1/admin/prices | price_data (NEW) | `tests/verify_price_discovery.js` | MISSING |
| SIH-DATA-004 | Recycler Dataset | Recycler profile (EXTEND) | GET /api/v1/recyclers | recycler_profiles (EXTEND) | `tests/verify_recycler_authorization.js` | PARTIAL |
| SIH-DATA-005 | Transaction Dataset | Transaction service (NEW) | Auto-generated | transactions (NEW) | `tests/verify_transactions.js` | MISSING |
| SIH-DATA-006 | Traceability Dataset | Traceability service (NEW + EXTEND) | Auto-generated | traceability_records (NEW) | `tests/verify_traceability.js` | PARTIAL (Journey A only) |
| SIH-DATA-007 | Collector Dataset | Collector profile (EXTEND) | GET /api/v1/collectors/profile | collector_profiles (EXTEND) + transactions | `tests/verify_collector_profile.js` | PARTIAL |
| SIH-DATA-008 | AI/ML Training Dataset | AI Dataset Pipeline (`ai/src/dataset/`) | Scripts: `import_external.py`, `split.py`, `deduplicator.py`, `export_field_data.py`, `ECOSETU_MATERIAL_DATASET_PREPARATION.ipynb` | `ai/datasets/material-classification/`, Google Drive `/ECOSETU_AI/` | `ai/tests/test_dataset_foundation.py`, `ai/tests/test_dataset_acquisition.py` | IMPLEMENTED |

**Note (Prompt 20):** Public e-waste candidate datasets (XBAT+ WEEE, EWasteNet, Roboflow) evaluated against ECOSETU's 16 categories. Colab-first acquisition notebook (`ECOSETU_MATERIAL_DATASET_PREPARATION.ipynb`) and cross-dataset deduplication engine (`deduplicator.py`) implemented to prevent local disk exhaustion and train/test leakage. No models trained.

---

## 26. Dataset Validation

| Req ID | Requirement | ECOSETU Module | Implementation | Status |
|--------|-------------|----------------|----------------|--------|
| SIH-DATA-009 | Dataset lifecycle (8 steps) | Multiple services + AI pipeline | CREATE (exists), VALIDATE (exists via DatasetValidator), STORE (exists), UPDATE (exists), ANONYMIZE (exists via PII scanner & coarse location), ANALYZE (exists via historical analytics), TRAIN (deferred), AUDIT (exists via manifests) | PARTIAL |
| SIH-DATA-010 | Input validation on ingestion | express-validator + DatasetValidator | Backend validators & `ai/src/dataset/validator.py` (checks corruption, format, taxonomy, leakage) | IMPLEMENTED |
| SIH-DATA-011 | Price data validation before publishing | Admin validation workflow (NEW) | Pre-publish validation gate | MISSING |
| SIH-DATA-012 | PII anonymization for analytics | Historical Analytics Service (`historicalAnalyticsService.js`) | All `/api/v1/admin/analytics/*` | Dynamic aggregation strips all personal identifiers; pure statistical output | `AdminHistoricalAnalyticsScreen.tsx` | `tests/verify_historical_analytics.js` (Test 17) | IMPLEMENTED |
| SIH-DATA-013 | Data quality metrics | Historical Analytics Service (`historicalAnalyticsService.js`) | GET `/api/v1/admin/analytics/quality` | Dynamic quality computation: GPS, photos, weights, categories, licenses | `AdminHistoricalAnalyticsScreen.tsx` (Quality Tab) | `tests/verify_historical_analytics.js` (Test 7) | IMPLEMENTED |
| SIH-DATA-014 | Live dataset demonstration | Platform operations | Must demonstrate live dataset growth | PARTIAL |

---

## 27. Historical Analytics

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------|------|--------|
| SIH-ANLT-001 | Price history analytics | Historical Analytics Service (`historicalAnalyticsService.js`) | GET `/api/v1/admin/analytics/prices` | `price_data` | `AdminHistoricalAnalyticsScreen.tsx` (Price Tab) | `tests/verify_historical_analytics.js` (Tests 1–3) | IMPLEMENTED |
| SIH-ANLT-002 | Transaction volume analytics | Historical Analytics Service (`historicalAnalyticsService.js`) | GET `/api/v1/admin/analytics/transactions` | `transactions`, `material_lots` | `AdminHistoricalAnalyticsScreen.tsx` (Transactions Tab) | `tests/verify_historical_analytics.js` (Tests 5, 8, 9) | IMPLEMENTED |
| SIH-ANLT-003 | Admin-accessible analytics | Historical Analytics Controller & Service | GET `/api/v1/admin/analytics/overview` (and sub-dimensions `/materials`, `/recyclers`, `/traceability`, `/quality`) | Dynamic aggregates across `price_data`, `material_lots`, `transactions`, `recycler_profiles`, `quotes`, `handover_records` | `AdminHistoricalAnalyticsScreen.tsx` | `tests/verify_historical_analytics.js` (Tests 1–7, 10–13) | IMPLEMENTED |
| SIH-ANLT-004 | No PII in analytics | Dynamic aggregation & anonymization | All `/api/v1/admin/analytics/*` endpoints | Zero collector/recycler PII; purely statistical counts, volumes, and ranges | `AdminHistoricalAnalyticsScreen.tsx` | `tests/verify_historical_analytics.js` (Test 17) | IMPLEMENTED |

**Status summary:** All 4 Historical Analytics requirements (`SIH-ANLT-001` through `SIH-ANLT-004`) along with Dataset Quality (`SIH-DATA-013`) and Analytics Anonymization (`SIH-DATA-012`) are fully IMPLEMENTED in Prompt 17. The platform provides a factual, dataset-driven Historical Analytics layer derived dynamically from existing PostgreSQL records (`PriceData`, `MaterialLot`, `TransactionRecord`, `RecyclerProfile`, `Quote`, `HandoverRecord`, `Consignment`, `RecyclingRecord`). It strictly prevents data fabrication, price forecasting, or recycler ranking. Accounting values are strictly segregated (`estimatedLotValue` vs `quotedValue` vs `finalSaleValue` vs `amountPaid` vs `amountDue`), and units are segregated (`PER_KG` vs `PER_UNIT` vs `PER_LOT`). Multilingual UI localization and on-device TTS are provided across English, Hindi, Marathi, and Odia with 24-hour offline caching.

---

## 28. Collector Profile

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Status |
|--------|-------------|----------------|-------------|----------|--------------|--------|
| SIH-COL-001 | Minimal collector profile | Collector profile (EXTEND) | GET /api/v1/collectors/profile | collector_profiles (EXTEND) | CollectorProfileScreen (EXISTS) | IMPLEMENTED |
| SIH-COL-002 | No unnecessary PII | Privacy policy | N/A | Minimal fields | N/A | IMPLEMENTED |
| SIH-COL-003 | Persistent profile | AsyncStorage (EXISTS) | N/A | AsyncStorage | N/A | IMPLEMENTED |
| SIH-COL-004 | Language preference stored | i18n (EXISTS) | N/A | AsyncStorage / collector_profiles.preferred_language (ADD) | Language settings | IMPLEMENTED |
| SIH-COL-005 | Area-level location only | Service area (EXISTS) | N/A | collector_profiles.service_area_lat/lng (approximate) | CollectorProfileScreen | IMPLEMENTED |

---

## 29. Recycler Dataset

| Req ID | Requirement | ECOSETU Module | API Endpoint | Database | Mobile Screen | Test | Status |
|--------|-------------|----------------|-------------|----------|--------------|------|--------|
| SIH-RDATA-001 | Full recycler schema (unique ID, legal/facility name, location lat/lng + address, city/state, materials & subcategories accepted, authorization number, issuing authority, validity dates, operational contact phone/email, offered rates, pickup availability & radius, active status, audit metadata) | Recycler Profile & Service | GET /api/v1/recyclers, GET /api/v1/recyclers/:id, GET /api/v1/admin/recyclers/:id | `recycler_profiles`, `recycler_offered_rates`, `users` | `CollectorRecyclerDirectoryScreen.tsx`, `CollectorRecyclerDetailScreen.tsx` | `tests/verify_recycler_authorization.js` (Checks 1–8), `tests/verify_recycler_directory.js` | IMPLEMENTED |
| SIH-RDATA-002 | Admin maintained & governance (admin-only approval, rejection, suspension, restoration/re-verification, profile updates with mandatory immutable audit logging of prior & new states) | Admin Recycler Management (`adminController.js`, `recyclerService.js`) | PATCH /api/v1/admin/recyclers/:id/authorization, PUT /api/v1/admin/recyclers/:id, GET /api/v1/admin/recyclers | `recycler_profiles`, `audit_logs` | Admin Recycler Management / API | `tests/verify_recycler_authorization.js` (Checks 9–14, 19–20) | IMPLEMENTED |
| SIH-RDATA-003 | Authorization review lifecycle & boundaries (strict 7-state lifecycle: PENDING, AUTHORIZED, PROVISIONAL, REJECTED, SUSPENDED, EXPIRED, REVOKED; self-service boundary preventing recyclers from modifying protected authorization fields) | Recycler Lifecycle & Validator (`recyclerValidators.js`, `recyclerService.js`) | PUT /api/v1/recyclers/profile, PATCH /api/v1/admin/recyclers/:id/authorization | `recycler_profiles`, `audit_logs` | `CollectorRecyclerDirectoryScreen.tsx`, `CollectorRecyclerDetailScreen.tsx` | `tests/verify_recycler_authorization.js` (Checks 7–14) | IMPLEMENTED |
| SIH-RDATA-004 | Drives matching, quotes, handovers & Price Board (lifecycle integration: unverified, pending, rejected, suspended, expired, or inactive facilities are strictly barred from matching, quotes, and handovers; PROVISIONAL facilities clearly differentiated and never promoted to official MATCHED) | Matching & Commercial Pipeline (`recyclerMatchingService.js`, `quoteService.js`, `handoverService.js`) | GET /api/v1/material-lots/:id/matches, POST /api/v1/quotes, POST /api/v1/handovers | `recycler_profiles`, `recycler_offered_rates`, `quotes`, `handover_records` | `CollectorRecyclerMatchesScreen.tsx`, `CollectorQuotesScreen.tsx` | `tests/verify_recycler_authorization.js` (Checks 15–18, 21–22), `tests/verify_recycler_matching.js` | IMPLEMENTED |

**Status summary:** SIH-RDATA-001 through SIH-RDATA-004 fully IMPLEMENTED in Prompt 16. Authoritative recycler dataset schema enriched with complete operational, licensing, validity, and subcategory fields. Dedicated admin-only authorization endpoints govern approvals, suspensions, rejections, and re-verifications with append-only audit trail logging. Recycler self-service endpoints strictly block tampering with protected authorization metadata. Recycler matching, quote issuance/acceptance, and digital handovers strictly gate commercial workflows by lifecycle status and facility active state. Multi-attribute non-color UI indicators and vernacular localization ensure transparent trust communication across English, Hindi, Marathi, and Odia.


---

## 30. Field Research

| Req ID | Requirement | Type | Responsible | Status |
|--------|-------------|------|-------------|--------|
| SIH-FIELD-001 | >= 2 collector interviews | Physical research | Team | NOT STARTED |
| SIH-FIELD-002 | Research protocol coverage | Physical research | Team | NOT STARTED |
| SIH-FIELD-003 | Data vs assumption distinction | Documentation | Team | NOT STARTED |
| SIH-FIELD-004 | Findings inform design | Design review | Team | NOT STARTED |
| SIH-FIELD-005 | Field research report | Documentation | Team | NOT STARTED |
| SIH-FIELD-006 | No fabrication (HARD RULE) | Policy | Team + Agent | NOT STARTED |

> [!CAUTION]
> Field research cannot be implemented in software. It is a mandatory SIH deliverable that requires the team to conduct real interviews with real scrap collectors. No AI agent can fulfill this requirement.

---

## 31. Unit Economics

| Req ID | Requirement | Type | Responsible | Status |
|--------|-------------|------|-------------|--------|
| SIH-ECON-001 | Unit economics assessment | Research + analysis | Team | NOT STARTED |
| SIH-ECON-002 | Required comparison metrics | Research | Team | NOT STARTED |
| SIH-ECON-003 | Real data from field research | Research | Team | NOT STARTED |
| SIH-ECON-004 | Platform sustainability explanation | Business analysis | Team | NOT STARTED |
| SIH-ECON-005 | No fabrication (HARD RULE) | Policy | Team + Agent | NOT STARTED |

> [!CAUTION]
> Unit economics must be based on real field research data (SIH-ECON-003). No numbers should be invented. Until field research is complete, no unit economics document should be published.

---

## 32. SIH Demo

| Req ID | Requirement | ECOSETU Module | Status |
|--------|-------------|----------------|--------|
| SIH-DEMO-001 | Working mobile app | Full Android app | PARTIAL (Journey A only) |
| SIH-DEMO-002 | Recycler interface | Recycler screens (EXISTS + EXTEND) | PARTIAL |
| SIH-DEMO-003 | Structured datasets (live) | All dataset modules | MISSING (Journey B datasets) |
| SIH-DEMO-004 | Field research evidence | Field research | NOT STARTED |
| SIH-DEMO-005 | Live usability demo | Full app | PARTIAL |
| SIH-DEMO-006 | Unit economics | Unit economics doc | NOT STARTED |
| SIH-DEMO-007 | Journey B end-to-end | Journey B (all modules) | MISSING |
| SIH-DEMO-008 | No fabricated flows | Platform policy | PARTIAL |

---

## 33. Privacy

| Req ID | Requirement | Implementation | Status |
|--------|-------------|----------------|--------|
| SIH-PRIV-001 | Minimal PII | collector_profiles minimal schema | PARTIAL |
| SIH-PRIV-002 | No precise home address | collector_profiles: area-level only | IMPLEMENTED |
| SIH-PRIV-003 | No real-time tracking | Not implemented (by design) | IMPLEMENTED |
| SIH-PRIV-004 | Earnings access control | Role-based + collector-only access | IMPLEMENTED |
| SIH-PRIV-005 | Anonymized analytics | Historical Analytics Service (`historicalAnalyticsService.js`) | All analytics endpoints return pure aggregates without personal PII | IMPLEMENTED |
| SIH-PRIV-006 | Secure document storage | Firebase Storage + rules (EXISTS) | IMPLEMENTED |
| SIH-PRIV-007 | Existing NFR-04 to NFR-12 preserved | Backend middleware (EXISTS) | IMPLEMENTED |

---

## 34. Summary Dashboard

### Implementation Status Overview

| Category | IMPLEMENTED | PARTIAL | MISSING | PLANNED | Total Reqs |
|----------|:-----------:|:-------:|:-------:|:-------:|:----------:|
| Material Management | 10 | 0 | 0 | 0 | 10 |
| Material Lots | 8 | 0 | 0 | 0 | 8 |
| Price Discovery | 9 | 0 | 0 | 0 | 9 |
| Price History | 4 | 0 | 0 | 0 | 4 |
| Price Trends | 4 | 0 | 0 | 0 | 4 |
| Value Estimation | 5 | 0 | 0 | 0 | 5 |
| Recycler Directory | 10 | 0 | 0 | 0 | 10 |
| Recycler Offered Rates | 4 | 0 | 0 | 0 | 4 |
| Recycler Matching | 6 | 0 | 0 | 0 | 6 |
| Quotation | 7 | 0 | 0 | 0 | 7 |
| Handover | 7 | 0 | 0 | 0 | 7 |
| Transaction Record | 4 | 0 | 0 | 1 | 5 |
| Payment | 5 | 0 | 0 | 1 | 6 |
| Earnings Ledger | 6 | 0 | 0 | 0 | 6 |
| Traceability | 6 | 0 | 0 | 0 | 6 |
| Safety Center | 7 | 0 | 0 | 0 | 7 |
| Vernacular UI | 8 | 0 | 1 | 0 | 9 |
| Low-Literacy UX | 10 | 0 | 0 | 0 | 10 |
| TTS / Audio | 5 | 0 | 0 | 0 | 5 |
| Offline Operation | 2 | 4 | 8 | 0 | 14 |
| AI Classification | 4 | 2 | 0 | 0 | 6 |
| AI Valuation | 0 | 0 | 4 | 0 | 4 |
| AI Recycler Rec | 0 | 0 | 3 | 0 | 3 |
| Anomaly Detection | 0 | 0 | 3 | 1 | 4 |
| Dataset Generation | 1 | 2 | 5 | 0 | 8 |
| Dataset Validation | 3 | 2 | 1 | 0 | 6 |
| Historical Analytics | 4 | 0 | 0 | 0 | 4 |
| Collector Profile | 2 | 3 | 0 | 0 | 5 |
| Recycler Dataset | 4 | 0 | 0 | 0 | 4 |
| Field Research | 0 | 0 | 0 | 0 | 6 (NOT STARTED) |
| Unit Economics | 0 | 0 | 0 | 0 | 5 (NOT STARTED) |
| SIH Demo | 0 | 3 | 5 | 0 | 8 |
| Privacy | 5 | 1 | 1 | 0 | 7 |
| **TOTAL** | **148** | **15** | **31** | **3** | **~201** |

### Critical Path to SIH Compliance

The minimum viable path to a SIH-compliant demonstration:

```
Phase 1: Material Lot Foundation
  -> material_lots schema + API + UI
  -> Collector material capture screen

Phase 2: Price Discovery
  -> price_data schema + admin ingestion
  -> Price Board screen (cached offline)
  -> Rule-based value estimation

Phase 3: Recycler Matching
  -> recycler_profiles schema extension (rates, pickup, service area)
  -> Matching API + screen

Phase 4: Quotation
  -> quotes table + API
  -> Quote screens (recycler + collector)

Phase 5: Handover + Transactions
  -> handover_records + transactions tables + APIs
  -> Handover screens

Phase 6: Payment + Earnings
  -> Payment recording (cash)
  -> Earnings Ledger screen

Phase 7: Safety + Low-Literacy
  -> SafetyCenterScreen + bundled content
  -> Hindi/Marathi translations for all Journey B screens
  -> Material category icon set (14+ types >= 64dp)

Phase 10: Field Research + Unit Economics
  -> Conduct real field interviews (non-software)
  -> Prepare unit economics assessment
```

### Existing Architecture: What to Preserve

| Component | Action |
|-----------|--------|
| `ewaste_items` table | PRESERVE — Journey A citizen items |
| `collection_requests` table | PRESERVE — Journey A citizen requests |
| `pickups` table | PRESERVE — Journey A pickup records |
| `consignments` table | PRESERVE — Journey A collector-to-recycler delivery |
| `recycling_records` table | PRESERVE — Recycler processing records |
| `ai_predictions` table | PRESERVE — AI inference log |
| `audit_logs` table | PRESERVE — Append-only audit trail |
| `notifications` table | PRESERVE — Extend for new event types |
| `verifications` table | PRESERVE — User verification flow |
| `device_tokens` table | PRESERVE — FCM push tokens |
| `users` table | PRESERVE — Add no fields (minimal PII) |
| `collector_profiles` table | EXTEND — Add preferred_language |
| `recycler_profiles` table | EXTEND — Add offered_rates, pickup_available, authorization_status, authorization_expiry |
| i18n infrastructure | EXTEND — Add Journey B translation strings |
| YOLOv8 AI service | EXTEND — Add collector material categories |

### New Database Entities Required

| Table | Phase | Purpose |
|-------|-------|---------|
| `material_items` | Phase 1 | Collector-captured material records |
| `material_lots` | Phase 1 | Collector material lot (core Journey B entity) |
| `material_lot_items` | Phase 1 | Junction: lots to items |
| `material_lot_photos` | Phase 1 | Multiple photos per lot |
| `price_data` | Phase 2 | Current price board data |
| `price_history` | Phase 2 | Historical price records |
| `recycler_offered_rates` | Phase 3 | Per-material rates per recycler |
| `quotes` | Phase 4 | Formal price quotes |
| `handover_records` | Phase 5 | Digital handover records |
| `transactions` | Phase 5 | Transaction dataset |
| `traceability_records` | Phase 5 | Journey B traceability |
| `anomaly_flags` | Phase 8 | Transaction anomaly flags |

---

*Document established: 2026-09-20*
*Cross-reference: `25_SIH_26229_REQUIREMENTS.md` for full requirement definitions*
*This matrix must be updated as each phase is implemented.*
