# EcoSetu — SIH 2026 Problem Statement 26229 Requirements Baseline

> **Document Status:** AUTHORITATIVE BASELINE — Supersedes prior product requirements where they conflict with SIH 26229.
>
> **Established:** 2026-09-20
>
> **Priority in the requirement hierarchy:**
> - PRIORITY 1 → This document (SIH 26229 requirements)
> - PRIORITY 2 → New SIH specification created here
> - PRIORITY 3 → Existing `/docs` architecture
> - PRIORITY 4 → Existing implementation / code

---

## Table of Contents

1. [Problem Statement Summary](#1-problem-statement-summary)
2. [User Personas](#2-user-personas)
3. [Business Journeys](#3-business-journeys)
4. [Functional Requirements](#4-functional-requirements)
5. [Dataset Requirements](#5-dataset-requirements)
6. [AI/ML Requirements](#6-aiml-requirements)
7. [Safety Requirements](#7-safety-requirements)
8. [Vernacular Requirements](#8-vernacular-requirements)
9. [Low-Literacy UX Requirements](#9-low-literacy-ux-requirements)
10. [Offline Requirements](#10-offline-requirements)
11. [Privacy and Security Requirements](#11-privacy-and-security-requirements)
12. [Unit Economics Requirement](#12-unit-economics-requirement)
13. [Field Research Requirement](#13-field-research-requirement)
14. [SIH Demonstration Requirements](#14-sih-demonstration-requirements)
15. [Current ECOSETU Coverage](#15-current-ecosetu-coverage)
16. [Missing Functionality](#16-missing-functionality)
17. [Partially Implemented Functionality](#17-partially-implemented-functionality)
18. [Future Roadmap](#18-future-roadmap)
19. [Requirements Index](#19-requirements-index)
20. [Architectural Conflicts](#20-architectural-conflicts)

---

## 1. Problem Statement Summary

### 1.1 Official SIH Problem Statement 26229

India's informal e-waste collection ecosystem — operated by kabadiwalas, waste-pickers, and local aggregators — handles the overwhelming majority of end-of-life electronics. However, the informal sector remains **excluded from the formal recycling chain** defined under the E-Waste (Management) Rules, 2022 and the Extended Producer Responsibility (EPR) framework.

Key consequences of this exclusion:

| Problem | Impact |
|---------|--------|
| No price transparency | Collectors cannot verify fair prices; suffer economic exploitation |
| No access to authorized recyclers | Material enters unsafe backyard processing |
| Unsafe practices | Cable burning, acid leaching, manual desoldering without safety equipment |
| Loss of critical materials | Lithium, cobalt, neodymium, tantalum, gallium, indium lost |
| Health risks | Workers exposed to toxic materials without protection |
| No formal transaction records | No basis for EPR compliance or earnings history |
| No incentive for formal channel | Formal recycling is perceived as burdensome, not beneficial |

### 1.2 Mandated Solution

> Design and develop a **vernacular, low-literacy, offline-tolerant mobile platform** that enables informal scrap collectors to:
> - discover fair prices
> - photograph and categorize collected materials
> - create digital material lots
> - enter approximate weight
> - receive instant value estimates
> - discover authorized recyclers/aggregators
> - compare recycler offers
> - match lots with suitable authorized recyclers
> - complete documented material handovers
> - maintain traceability
> - receive payment
> - maintain earnings history
> - access safety guidance
> - operate in low-connectivity environments

The platform must make the **formal recycling route economically attractive and convenient** for informal collectors — NOT an additional compliance burden.

---

## 2. User Personas

### 2.1 Primary Persona — Informal Scrap Collector (Kabadiwala)

| Attribute | Description |
|-----------|-------------|
| **Role** | `INFORMAL_COLLECTOR` |
| **Who** | Street-level kabadiwala, waste-picker, small aggregator |
| **Literacy** | Low to medium; may not read Hindi/Marathi fluently |
| **Device** | Entry-level Android (3000–8000 INR range); 2GB RAM typical |
| **Connectivity** | Intermittent 2G/3G/4G; frequently offline in field |
| **Language** | Marathi or Hindi primary; regional dialect common |
| **Daily pattern** | Street collection all day; admin tasks in evening |
| **Motivation** | Better prices; formal recognition; payment certainty |
| **Pain point** | Does not know fair price; cannot find authorized recyclers; no receipt |

### 2.2 Authorized Recycler / Aggregator

| Attribute | Description |
|-----------|-------------|
| **Role** | `RECYCLER` |
| **Who** | CPCB/State PCB authorized recycling facility or registered aggregator |
| **Technical profile** | Moderate literacy; smartphone or tablet |
| **Motivation** | Reliable material supply; documented compliance; EPR chain |
| **Pain point** | Unreliable informal supply; no material documentation |

### 2.3 Citizen (E-Waste Generator)

| Attribute | Description |
|-----------|-------------|
| **Role** | `CITIZEN` |
| **Who** | Household or small business with end-of-life electronics |
| **Journey** | Submits e-waste for collection by informal collector |
| **Status** | Preserved from existing ECOSETU architecture (Journey A) |

### 2.4 Platform Administrator

| Attribute | Description |
|-----------|-------------|
| **Role** | `ADMIN` |
| **Who** | Platform operator; manages users, prices, recycler data |
| **Responsibilities** | Verification; price data ingestion; recycler dataset maintenance; dispute resolution |

---

## 3. Business Journeys

### 3.1 Journey A — Citizen Collection Journey (Preserved from Existing Architecture)

```
Citizen
  -> submits e-waste item (photo, category, description)
  -> creates collection request (GPS location, preferred time)
Informal Collector
  -> discovers nearby requests
  -> accepts request
  -> performs pickup (photo proof, weight entry)
  -> creates material lot from collected items
  -> [continues to Journey B]
Authorized Recycler
  -> receives consignment / handover
  -> accepts, processes, completes
Traceability Record
  -> Full lifecycle from generation to recycling
```

> **Status:** Partially implemented. Core flow exists. Material Lot, Handover, Payment, Earnings are MISSING.

### 3.2 Journey B — Collector Economic Workflow (Primary SIH Requirement — MISSING)

```
Informal Collector
  -> photographs collected material (camera, offline-capable)
  -> selects category and subcategory (pictorial picker)
  -> selects condition and source type
  -> enters approximate weight
  -> receives instant value estimate (rule-based or AI)
  -> opens Price Board
  -> views current buying rates by material + location
  -> views price history and trends
  -> browses nearby authorized recyclers
  -> views recycler offered rates for their material
  -> selects a recycler for matching / quote request
  -> receives recycler quote
  -> accepts or declines quote
  -> creates formal Handover / Transfer Record
     (photos + weight + GPS + timestamp + unique reference)
  -> recycler confirms handover
  -> receives payment (cash or digital)
  -> transaction recorded in Earnings Ledger
```

> **Status:** ENTIRELY MISSING. No Material Lot, no Price Discovery, no Price Board, no Recycler Matching (by material/rate), no Quotation, no formal Handover Record, no Payment, no Earnings Ledger.

### 3.3 Both Journeys Must Coexist

The platform must serve **both** journeys simultaneously. Journey A (citizen-initiated collection) feeds material into Journey B (collector economic workflow). Neither replaces the other.

---

## 4. Functional Requirements

### Module 1 — Material Management

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-MAT-001 | System SHALL allow collectors to photograph collected materials using the device camera | P0 |
| SIH-MAT-002 | System SHALL allow offline photo capture with local storage pending sync | P0 |
| SIH-MAT-003 | System SHALL provide a pictorial material category picker covering: CRTs, LCD panels, PCBs, cables, batteries, motors/magnet assemblies, mixed plastics, mobile phones, laptops, monitors, printers, keyboards/mice, desktop computers, tablets | P0 |
| SIH-MAT-004 | System SHALL support material subcategory selection within each primary category | P1 |
| SIH-MAT-005 | System SHALL allow entry of approximate weight (manual entry; IoT optional future) | P0 |
| SIH-MAT-006 | System SHALL allow selection of material condition (working / not working / damaged / unknown) | P0 |
| SIH-MAT-007 | System SHALL allow selection of source type (household / commercial / industrial / street) | P1 |
| SIH-MAT-008 | System SHALL store material description with each captured item | P1 |
| SIH-MAT-009 | System SHALL assign a unique reference ID to each captured material record | P0 |
| SIH-MAT-010 | Category picker MUST use large icons and minimal text suitable for low-literacy users | P0 |

**Existing code reusable:** `ewaste_items` table and `SubmitItemScreen.tsx` cover citizen-side capture. Collector-side material capture is MISSING.

**Dependencies:** SIH-LOT-001, SIH-DATA-001, SIH-OFFLINE-001

---

### Module 2 — Material Lots

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-LOT-001 | System SHALL allow collectors to create a digital Material Lot from one or more captured material items | P0 |
| SIH-LOT-002 | A Material Lot SHALL contain: lot ID, material category, subcategory, description, photos, approximate weight, condition, source type, estimated value, collection location, collection date/time, collector ID | P0 |
| SIH-LOT-003 | System SHALL allow lot drafts to be created and saved offline | P0 |
| SIH-LOT-004 | System SHALL allow a lot to be edited before submission to a recycler | P1 |
| SIH-LOT-005 | Each lot SHALL receive a unique, human-readable reference number | P0 |
| SIH-LOT-006 | System SHALL display lot status clearly (Draft / Open / Quoted / Accepted / Handover Pending / Completed) | P0 |
| SIH-LOT-007 | System SHALL allow multiple photos per lot | P1 |
| SIH-LOT-008 | GPS location SHALL be captured automatically when a lot is created | P0 |

**Existing code reusable:** `consignments` table is conceptually related but is collector-to-recycler delivery; collector-owned lot does not exist. Requires new schema entity.

**Dependencies:** SIH-MAT-001, SIH-PRICE-003, SIH-RECY-005, SIH-HAND-001, SIH-DATA-002

---

### Module 3 — Price Discovery

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-PRICE-001 | System SHALL provide a Price Board showing current buying rates per material category and location | P0 |
| SIH-PRICE-002 | Price Board SHALL be accessible offline using cached data | P0 |
| SIH-PRICE-003 | System SHALL show an instant value estimate when a collector enters material, weight, and location | P0 |
| SIH-PRICE-004 | Value estimate SHALL show an approximate range (low to high) based on historical prices and recycler rates | P0 |
| SIH-PRICE-005 | System SHALL show recycler-offered rates alongside market range for each material category | P1 |
| SIH-PRICE-006 | Price Board SHALL support TTS / spoken price information | P1 |
| SIH-PRICE-007 | System SHALL show the unit of measurement for each price (per kg / per unit / per lot) | P0 |
| SIH-PRICE-008 | System SHALL clearly indicate when cached prices were last updated | P0 |
| SIH-PRICE-009 | Prices MUST reflect actual market data; fabricated prices are PROHIBITED | P0 |

**Existing code reusable:** NONE. No price infrastructure exists.

**Dependencies:** SIH-DATA-003, SIH-HIST-001, SIH-OFFLINE-002

---

### Module 4 — Price History

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-HIST-001 | System SHALL maintain a historical price dataset: material category, subcategory, location, date, buying price, quoted price, unit, recycler/aggregator | P0 |
| SIH-HIST-002 | Historical prices SHALL be generated dynamically from actual platform transactions | P0 |
| SIH-HIST-003 | System SHALL display historical price data to collectors in a simple chart or table | P1 |
| SIH-HIST-004 | Historical data SHALL be preserved for analytics, ML training, and audit | P0 |

**Existing code reusable:** NONE. No price history table exists.

**Dependencies:** SIH-DATA-003, SIH-TREND-001

---

### Module 5 — Price Trends

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-TREND-001 | System SHALL identify and display basic price trends for each material category | P1 |
| SIH-TREND-002 | Trend display SHALL be understandable by low-literacy users (up/down arrow, color coding) | P1 |
| SIH-TREND-003 | Trend computation SHALL be transparent — methodology must be documented | P1 |
| SIH-TREND-004 | Where insufficient data exists, trends SHALL NOT be displayed or SHALL be clearly labelled as Estimated | P0 |

**Existing code reusable:** NONE.

**Dependencies:** SIH-HIST-001, SIH-AI-002

---

### Module 6 — Value Estimation

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-VAL-001 | System SHALL provide an instant value estimate when collector provides: material category, approximate weight, and location | P0 |
| SIH-VAL-002 | Value estimate SHALL be computed from: current price data + historical averages + recycler offered rates | P0 |
| SIH-VAL-003 | Where AI/ML is used for valuation, the methodology SHALL be clearly disclosed | P0 |
| SIH-VAL-004 | Where insufficient data exists, rule-based estimates are acceptable with clear Estimate label | P0 |
| SIH-VAL-005 | Value estimate SHALL never be presented as a guaranteed price | P0 |

**Existing code reusable:** NONE. Estimated weight field exists in `ewaste_items` but no valuation logic.

**Dependencies:** SIH-PRICE-003, SIH-DATA-003, SIH-AI-002

---

### Module 7 — Recycler Directory

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-RECY-001 | System SHALL maintain an authorized recycler directory with: facility name, location, materials accepted, authorization details, authorization status, contact details, offered rates, pickup availability, service area | P0 |
| SIH-RECY-002 | Recycler directory SHALL be searchable and filterable by material category and location | P0 |
| SIH-RECY-003 | Recycler listing SHALL display authorization status clearly (Authorized / Pending / Expired) | P0 |
| SIH-RECY-004 | Recycler directory SHALL be available offline using cached data | P1 |
| SIH-RECY-005 | Only authorized/verified recyclers SHALL appear in matching results | P0 |
| SIH-RECY-006 | Recycler contact details SHALL be accessible after lot submission (not before) | P1 |

**Existing code reusable:** `recycler_profiles` table and `CollectorRecyclerDirectoryScreen.tsx` exist. MISSING: per-material offered rates, pickup availability flag, service area, authorization expiry.

**Dependencies:** SIH-DATA-004, SIH-MATCH-001

---

### Module 8 — Recycler Offered Rates

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-RATE-001 | System SHALL allow recyclers to set offered rates per material category | P0 |
| SIH-RATE-002 | Offered rates SHALL be stored with timestamp and recycler ID for historical analysis | P0 |
| SIH-RATE-003 | Offered rates SHALL be visible to collectors in the Price Board and recycler matching results | P0 |
| SIH-RATE-004 | System SHALL flag offered rates that deviate significantly from market range | P2 |

**Existing code reusable:** NONE. `recycler_profiles.accepted_categories` is category-only; no rate per material.

**Dependencies:** SIH-DATA-003, SIH-DATA-004, SIH-AI-004

---

### Module 9 — Recycler Matching

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-MATCH-001 | System SHALL match a collector material lot to suitable authorized recyclers based on: location, material category, offered rate, pickup availability, authorization status | P0 |
| SIH-MATCH-002 | Matching results SHALL be ranked by a combination of offered rate and proximity | P0 |
| SIH-MATCH-003 | System SHALL show distance to recycler facility from collector current location | P0 |
| SIH-MATCH-004 | System SHALL indicate pickup availability (recycler picks up vs collector delivers) | P0 |
| SIH-MATCH-005 | Matching algorithm SHALL be rule-based initially; AI-powered matching is a Phase 8 enhancement | P1 |
| SIH-MATCH-006 | System SHALL allow collector to compare multiple recycler offers before selecting | P0 |

**Existing code reusable:** `CollectorRecyclerDirectoryScreen.tsx` exists but lacks material/rate-based matching.

**Dependencies:** SIH-RECY-001, SIH-RATE-001, SIH-LOT-001, SIH-AI-003

---

### Module 10 — Quotation

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-QUOTE-001 | System SHALL allow a recycler to issue a formal price quote for a collector material lot | P0 |
| SIH-QUOTE-002 | A Quote SHALL contain: lot ID, recycler ID, material category, quantity/weight, quoted price, unit, quote validity period, recycler contact | P0 |
| SIH-QUOTE-003 | System SHALL allow a collector to accept or decline a quote | P0 |
| SIH-QUOTE-004 | Quote acceptance SHALL be an online-only, server-authoritative irreversible action | P0 |
| SIH-QUOTE-005 | System SHALL notify the recycler when a collector accepts or declines a quote | P0 |
| SIH-QUOTE-006 | Accepted quotes SHALL initiate the Handover flow | P0 |
| SIH-QUOTE-007 | System SHALL retain all quotes (accepted, declined, expired) in the Transaction Dataset | P0 |

**Existing code reusable:** `consignments` table is partially related but lacks: price quote, quote validity, collector accept/decline, formal quote record.

**Dependencies:** SIH-MATCH-001, SIH-HAND-001, SIH-DATA-005

---

### Module 11 — Handover

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-HAND-001 | System SHALL generate a digital Handover / Transfer Record containing: photographs, weight, timestamp, GPS/location, unique handover reference, collector ID, recycler ID | P0 |
| SIH-HAND-002 | Handover record SHALL be confirmed by the recycler (digital acknowledgment) | P0 |
| SIH-HAND-003 | Handover record SHALL be verifiable (unique reference that cannot be fabricated) | P0 |
| SIH-HAND-004 | System SHALL allow offline handover initiation (draft), with online confirmation required | P0 |
| SIH-HAND-005 | Handover record SHALL be immutable after recycler confirmation | P0 |
| SIH-HAND-006 | Handover record SHALL feed directly into Traceability Dataset | P0 |
| SIH-HAND-007 | Collector SHALL receive a copy of the handover record (digital receipt) | P0 |

**Existing code reusable:** `consignments` table handles delivery but lacks: formal handover reference number, handover GPS, handover photo, recycler digital confirmation, immutability guarantee.

**Dependencies:** SIH-QUOTE-006, SIH-TRACE-001, SIH-DATA-006

---

### Module 12 — Transaction Record

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-TXN-001 | System SHALL maintain a transaction record for every completed lot handover: unique lot ID, collector ID, material category, quantity/weight, quoted price, final price, recycler ID, collection location, handover location, date/time, payment status, transaction status | P0 |
| SIH-TXN-002 | Transaction records SHALL be immutable after finalization | P0 |
| SIH-TXN-003 | Transaction records SHALL feed into the Earnings Ledger | P0 |
| SIH-TXN-004 | Transaction dataset SHALL support anomaly detection for unusual prices | P2 |
| SIH-TXN-005 | All transaction records SHALL be retained for audit and analytics | P0 |

**Existing code reusable:** `recycling_records` handles recycler-side processing but lacks: quoted price, final price, payment status, collector earnings linkage.

**Dependencies:** SIH-HAND-001, SIH-EARN-001, SIH-DATA-005

---

### Module 13 — Payment

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-PAY-001 | System SHALL support cash-based transactions as the primary payment mode | P0 |
| SIH-PAY-002 | Digital payment SHALL be optional and MUST NOT be a prerequisite for using the platform | P0 |
| SIH-PAY-003 | Payment status SHALL be recorded: PENDING / CASH_RECEIVED / DIGITAL_RECEIVED | P0 |
| SIH-PAY-004 | System SHALL allow collector to mark payment as received (cash acknowledgment) | P0 |
| SIH-PAY-005 | System SHALL record payment date/time and method | P1 |
| SIH-PAY-006 | Digital payment integration (UPI) is a FUTURE enhancement — not required for MVP | FUTURE |

**Existing code reusable:** NONE. Prior PRD explicitly excluded payment processing.

> **CONFLICT-01 with `01_PRD.md`:** Old PRD Section 9 lists "Payment processing" as an explicit Non-Goal. SIH-PAY-001 through SIH-PAY-005 SUPERSEDE this. Cash-based payment recording must be implemented. See [Section 20](#20-architectural-conflicts).

**Dependencies:** SIH-TXN-001, SIH-EARN-001

---

### Module 14 — Earnings Ledger

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-EARN-001 | System SHALL maintain an Earnings Ledger for each collector: transactions, payments received, pending dues | P0 |
| SIH-EARN-002 | Earnings Ledger SHALL be presented in a simple, easy-to-understand format | P0 |
| SIH-EARN-003 | Earnings Ledger SHALL build a usable financial history for collectors | P0 |
| SIH-EARN-004 | Earnings history SHALL be part of the Collector Dataset | P0 |
| SIH-EARN-005 | Earnings Ledger SHALL show: total earnings, pending dues, transaction history sorted by date | P0 |
| SIH-EARN-006 | Earnings data SHALL be accessible offline (read-only, cached) | P1 |

**Existing code reusable:** `CollectorDashboardScreen.tsx` has basic stats (`total_pickups`) but no earnings/payment tracking.

**Dependencies:** SIH-PAY-001, SIH-TXN-001, SIH-DATA-007

---

### Module 15 — Traceability

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-TRACE-001 | Every material lot SHALL eventually be traceable end-to-end: Lot -> Collector -> Material -> Weight -> Price/Quote -> Recycler -> Handover -> Payment -> Recycling -> Final status | P0 |
| SIH-TRACE-002 | Traceability chain SHALL include: lot ID, photographs, weight, timestamp, GPS/location, handover reference, recycler confirmation, subsequent transaction status | P0 |
| SIH-TRACE-003 | System SHALL maintain traceability data as an append-only audit record | P0 |
| SIH-TRACE-004 | Traceability chain SHALL be viewable by collector, recycler, and admin | P0 |
| SIH-TRACE-005 | Traceability chain SHALL cover BOTH Journey A (citizen-submitted) AND Journey B (collector-sourced) material | P0 |
| SIH-TRACE-006 | System SHALL assign a unique, verifiable handover reference number | P0 |

**Existing code reusable:** `ItemTraceabilityScreen.tsx` and `audit_logs` table cover citizen-submitted item lifecycle (Journey A). Collector-economic traceability (Journey B) is MISSING.

**Dependencies:** SIH-HAND-001, SIH-TXN-001, SIH-DATA-006

---

### Module 16 — Safety Center

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-SAFE-001 | System SHALL provide pictorial and/or audio safety guidance covering: cable burning, acid leaching, unsafe PCB processing, battery handling, CRT handling, electrical hazards, protective equipment | P0 |
| SIH-SAFE-002 | Safety content SHALL be understandable by low-literacy users (pictorial primary, text secondary) | P0 |
| SIH-SAFE-003 | Safety content SHALL be available in Hindi and Marathi | P0 |
| SIH-SAFE-004 | TTS (Text-to-Speech) SHALL be available for all safety guidance | P1 |
| SIH-SAFE-005 | Safety content SHALL be accessible offline (bundled with application) | P0 |
| SIH-SAFE-006 | Safety guidance SHALL be accessible from collector home screen without login | P1 |
| SIH-SAFE-007 | Safety content SHALL be reviewed for accuracy against recognized occupational health guidelines | P1 |

**Existing code reusable:** NONE. No Safety Center exists.

**Dependencies:** SIH-LANG-001, SIH-LIT-001, SIH-OFFLINE-003

---

### Module 17 — Vernacular UI

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-LANG-001 | Application SHALL support Hindi as a primary language | P0 |
| SIH-LANG-002 | Application SHALL support Marathi as a primary language | P0 |
| SIH-LANG-003 | Application SHALL preserve existing Odia language support | P0 |
| SIH-LANG-004 | Application SHALL preserve existing English language support | P0 |
| SIH-LANG-005 | Translation SHALL cover ALL major collector user journeys: Collector Home, Price Board, Material Lot, Recycler Matching, Quotes, Handover, Payment, Earnings, Notifications, Safety | P0 |
| SIH-LANG-006 | Language selection SHALL be available at first launch without requiring login | P0 |
| SIH-LANG-007 | Language preference SHALL be persisted locally | P0 |
| SIH-LANG-008 | Translation SHALL be verified by native speakers for accuracy and natural usage | P1 |
| SIH-LANG-009 | English-only key parity is NOT sufficient; journeys must be genuinely usable in the selected language | P0 |

**Existing code reusable:** i18n infrastructure exists (4 languages). New screens (Price Board, Material Lot, Handover, Earnings, Safety) have no translations yet.

**Dependencies:** SIH-LIT-001, SIH-AUDIO-001

---

### Module 18 — Low-Literacy UX

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-LIT-001 | Material category picker SHALL use large icons >= 64dp with pictorial representation | P0 |
| SIH-LIT-002 | All primary collector actions SHALL require <= 3 taps to initiate | P0 |
| SIH-LIT-003 | Status indicators SHALL use color and icon (not text-only) | P0 |
| SIH-LIT-004 | All touch targets SHALL be >= 48x48dp | P0 |
| SIH-LIT-005 | Labels SHALL use short words; avoid industry jargon in Hindi/Marathi UI | P0 |
| SIH-LIT-006 | Critical actions (accept quote, confirm handover) SHALL require explicit confirmation | P0 |
| SIH-LIT-007 | Interface SHALL NOT depend on reading long paragraphs at any point in the collector journey | P0 |
| SIH-LIT-008 | Forms SHALL minimize text input; prefer pickers, sliders, and camera | P0 |
| SIH-LIT-009 | Numeric inputs (weight, price) SHALL support keypad with large keys | P0 |
| SIH-LIT-010 | Error messages SHALL use pictorial + short-text format | P1 |

**Existing code reusable:** Design tokens in `08_UI_UX_SPECIFICATION.md` are aligned. Existing collector screens partially comply. New screens need enforcement.

**Dependencies:** SIH-AUDIO-001, SIH-LANG-001

---

### Module 19 — TTS / Audio Guidance

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-AUDIO-001 | System SHALL provide TTS for critical information: current prices, value estimate, recycler details, handover reference | P1 |
| SIH-AUDIO-002 | Safety guidance SHALL have TTS playback in Hindi and Marathi | P1 |
| SIH-AUDIO-003 | TTS SHALL use on-device Android TTS engine (no cloud dependency for core function) | P1 |
| SIH-AUDIO-004 | TTS playback controls SHALL be clearly visible (large play button >= 48dp) | P1 |
| SIH-AUDIO-005 | Price Board SHALL support spoken price announcement | P1 |

**Existing code reusable:** NONE. No TTS integration exists.

**Dependencies:** SIH-LANG-001, SIH-SAFE-004

---

### Module 20 — Offline-First Operation

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-OFFLINE-001 | Material photo capture SHALL function fully offline | P0 |
| SIH-OFFLINE-002 | Price Board SHALL function offline using cached prices (max 24h stale with timestamp indicator) | P0 |
| SIH-OFFLINE-003 | Safety content SHALL be bundled with app and accessible fully offline | P0 |
| SIH-OFFLINE-004 | Material Lot creation SHALL function offline (draft mode, sync when online) | P0 |
| SIH-OFFLINE-005 | Category selection and weight entry SHALL function offline | P0 |
| SIH-OFFLINE-006 | GPS location capture SHALL function offline | P0 |
| SIH-OFFLINE-007 | Recycler directory SHALL be cached for offline browsing | P1 |
| SIH-OFFLINE-008 | Earnings Ledger SHALL be readable offline (cached) | P1 |
| SIH-OFFLINE-009 | Quote acceptance SHALL require online connectivity (server-authoritative) | P0 |
| SIH-OFFLINE-010 | Handover confirmation SHALL require online connectivity (irreversible state) | P0 |
| SIH-OFFLINE-011 | Payment confirmation SHALL require online connectivity | P0 |
| SIH-OFFLINE-012 | Offline drafts SHALL sync automatically when connectivity is restored | P0 |
| SIH-OFFLINE-013 | App SHALL display current connectivity status clearly to user | P0 |
| SIH-OFFLINE-014 | Offline sync conflicts SHALL be detected and handled gracefully | P1 |

**Existing code reusable:** `offlineQueue.js` architecture planned. `NetworkContext` is planned. Partial implementation for basic request caching.

**Dependencies:** SIH-LOT-003, SIH-PRICE-002, SIH-SAFE-005

---

### Module 21 — AI Material Classification

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-AI-001 | System MAY provide AI-based material classification from photos | P2 |
| SIH-AI-001a | Input: material image. Output: material category and subcategory with confidence score | P2 |
| SIH-AI-001b | AI prediction SHALL be assistive only; collector can always override | P0 (if AI implemented) |
| SIH-AI-001c | AI SHALL NOT be claimed as functional without a real trained model and dataset | P0 |
| SIH-AI-001d | Where AI is unavailable, system SHALL fall back to manual pictorial picker | P0 |
| SIH-AI-001e | AI model source, dataset size, training methodology, and known limitations SHALL be documented | P0 (if AI implemented) |

**Existing code reusable:** YOLOv8n-cls architecture exists for citizen-side items. Extension to collector-captured materials requires expanded dataset and coverage.

**Dependencies:** SIH-DATA-008, SIH-MAT-001

---

### Module 22 — AI Valuation

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-AI-002 | System MAY provide AI-assisted valuation using: material, weight, location, historical price, transaction data | P2 |
| SIH-AI-002a | Until sufficient training data exists, rule-based valuation is acceptable with Estimated label | P0 |
| SIH-AI-002b | AI valuation methodology SHALL be documented and disclosed | P0 (if AI implemented) |
| SIH-AI-002c | AI valuations SHALL include confidence range, not point estimates | P1 (if AI implemented) |

**Existing code reusable:** NONE. No valuation model or training data exists.

**Dependencies:** SIH-DATA-008, SIH-HIST-001

---

### Module 23 — AI Recycler Recommendation

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-AI-003 | System MAY provide AI-powered recycler recommendation using: material, location, price, authorization, pickup availability | P2 |
| SIH-AI-003a | Until AI is available, rule-based matching by proximity + accepted categories + offered rate is the baseline | P0 |
| SIH-AI-003b | Recommendation ranking algorithm SHALL be documented | P1 |

**Existing code reusable:** NONE.

**Dependencies:** SIH-MATCH-001, SIH-DATA-004

---

### Module 24 — Transaction Anomaly Detection

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-AI-004 | System MAY identify abnormal or inconsistent transaction values using historical data | P2 |
| SIH-AI-004a | Anomaly detection SHALL NOT block transactions; it SHALL only flag for admin review | P0 (if implemented) |
| SIH-AI-004b | Flagged transactions SHALL be logged and reviewable by admin | P1 (if implemented) |
| SIH-AI-004c | Anomaly detection SHALL NOT be deployed until sufficient transaction history exists | P0 |

**Existing code reusable:** `audit_logs` is the foundation. No anomaly detection logic exists.

**Dependencies:** SIH-DATA-005, SIH-AI-004

---

### Module 25 — Dataset Generation

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-DATA-001 | Platform SHALL generate a Material Dataset dynamically through field operations: category, subcategory, description, image, weight, condition, source type, estimated value | P0 |
| SIH-DATA-002 | Material Dataset SHALL NOT be a static CSV; it MUST grow with platform use | P0 |
| SIH-DATA-003 | Platform SHALL generate a Price Dataset: category, location, date/time, buying price, quoted price, unit, recycler/aggregator, historical | P0 |
| SIH-DATA-004 | Platform SHALL maintain a Recycler Dataset: facility name, location, materials accepted, authorization details, authorization status, contact, offered rates, pickup availability, service area | P0 |
| SIH-DATA-005 | Platform SHALL generate a Transaction Dataset: lot ID, collector ID, category, weight, quoted price, final price, recycler ID, collection location, handover location, date/time, payment status, transaction status | P0 |
| SIH-DATA-006 | Platform SHALL generate a Traceability Dataset: lot ID, photographs, weight, timestamp, GPS/location, handover reference, recycler confirmation, subsequent transaction status | P0 |
| SIH-DATA-007 | Platform SHALL maintain a Collector Dataset: collector ID, preferred language, general operating location, transaction history, earnings history | P0 |
| SIH-DATA-008 | Where AI is proposed, Platform SHALL develop or source an AI/ML Training Dataset: material images, categories, weights, prices, locations, transaction records | P1 (if AI implemented) |

**Existing code reusable:** Partial. `ewaste_items`, `audit_logs`, `recycler_profiles` partially cover some fields.

**Dependencies:** SIH-DATA-009 (lifecycle), SIH-DATA-010 (validation)

---

### Module 26 — Dataset Validation

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-DATA-009 | System SHALL implement dataset lifecycle: CREATE -> VALIDATE -> STORE -> UPDATE -> ANONYMIZE -> ANALYZE -> TRAIN/INFER -> AUDIT | P0 |
| SIH-DATA-010 | System SHALL validate data on ingestion (type, range, completeness) | P0 |
| SIH-DATA-011 | Price data ingested by admin SHALL be validated before publishing to Price Board | P0 |
| SIH-DATA-012 | System SHALL support anonymization of collector PII for analytics | P1 |
| SIH-DATA-013 | System SHALL maintain data quality metrics (completeness, freshness, error rate) | P2 |
| SIH-DATA-014 | Teams MUST demonstrate dataset is generated, stored, validated, updated, and used — not treated as a static demo CSV | P0 |

**Existing code reusable:** `audit_logs` provides the AUDIT step. Input validation middleware exists. Full lifecycle management is MISSING.

**Dependencies:** SIH-DATA-001 through SIH-DATA-008

---

### Module 27 — Historical Analytics

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-ANLT-001 | System SHALL support historical analysis of price data (trends by category, location, time) | P1 |
| SIH-ANLT-002 | System SHALL support analytics of transaction volumes by collector, recycler, category | P1 |
| SIH-ANLT-003 | Analytics SHALL be accessible to admin and inform platform operations | P1 |
| SIH-ANLT-004 | Analytics SHALL NOT expose individual collector PII | P0 |

**Existing code reusable:** `22_ANALYTICS_AND_REPORTING.md` exists. Basic admin analytics implemented. Price/earnings analytics are MISSING.

**Dependencies:** SIH-DATA-003, SIH-DATA-005

---

### Module 28 — Collector Profile

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-COL-001 | Collector profile SHALL contain minimal information: collector ID, preferred language, general operating location, transaction history, earnings history | P0 |
| SIH-COL-002 | System SHALL NOT collect unnecessary personal information from collectors | P0 |
| SIH-COL-003 | Collector profile SHALL be persisted between sessions | P0 |
| SIH-COL-004 | Preferred language SHALL be stored in collector profile and applied automatically | P0 |
| SIH-COL-005 | General operating location (area-level) is sufficient; real-time GPS tracking is NOT required | P0 |

**Existing code reusable:** `collector_profiles` table exists. Missing: preferred_language field, earnings_history linkage.

**Dependencies:** SIH-DATA-007, SIH-LANG-007

---

### Module 29 — Recycler Dataset

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-RDATA-001 | Recycler dataset SHALL include: facility name, location (lat/lng + address), materials accepted (with subcategories), authorization/registration details, authorization status, contact (phone, email), offered rates per material, pickup availability, service area | P0 |
| SIH-RDATA-002 | Recycler dataset SHALL be maintained by admin and validated | P0 |
| SIH-RDATA-003 | Authorization status SHALL be regularly reviewed and updated | P1 |
| SIH-RDATA-004 | Recycler dataset SHALL be used to drive recycler matching and Price Board | P0 |

**Existing code reusable:** `recycler_profiles` covers facility name, address, lat/lng, license, accepted_categories. Missing: offered_rates per material, pickup_available, pickup_radius, service_area, authorization_expiry.

**Dependencies:** SIH-DATA-004, SIH-RECY-001

---

### Modules 30-31 — Transaction Dataset and Traceability Dataset

Covered under Module 12 (SIH-TXN-001 through SIH-TXN-005), Module 15 (SIH-TRACE-001 through SIH-TRACE-006), and Module 25 (SIH-DATA-005, SIH-DATA-006). See those sections.

---

### Module 32 — Field Research

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-FIELD-001 | SIH requires field research involving at minimum 2 working scrap collectors or aggregators | P0 (SIH MANDATORY) |
| SIH-FIELD-002 | Field research SHALL document: collector interviews, workflow observations, price discovery methods, material categories encountered, payment practices, safety practices observed, language preferences, connectivity available, smartphone usage patterns, existing recycler relationships | P0 |
| SIH-FIELD-003 | Field research data SHALL be clearly distinguished from assumed or fabricated data | P0 |
| SIH-FIELD-004 | Field research findings SHALL inform: vernacular UI decisions, material category taxonomy, price range calibration, recycler matching priorities | P0 |
| SIH-FIELD-005 | Field research report SHALL be prepared and included in SIH submission | P0 |
| SIH-FIELD-006 | Field research data SHALL NEVER be fabricated | P0 (HARD RULE) |

**Existing code reusable:** N/A. This is a physical research activity, not implementable in software.

---

### Module 33 — Unit Economics

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-ECON-001 | The SIH submission SHALL include a unit economics assessment comparing: collector existing informal workflow vs ECOSETU formal workflow | P0 (SIH MANDATORY) |
| SIH-ECON-002 | Unit economics SHALL cover: material revenue, price difference (formal vs informal), transport cost, time, rejected material, payment delay, platform operational cost, collector net earnings | P0 |
| SIH-ECON-003 | All real numbers SHALL come from field research or clearly labelled assumptions | P0 |
| SIH-ECON-004 | Unit economics SHALL explain how the platform sustains its operations | P0 |
| SIH-ECON-005 | Economic results SHALL NEVER be fabricated | P0 (HARD RULE) |

**Existing code reusable:** N/A. This is a research/analysis document.

---

### Module 34 — SIH Live Demonstration

| ID | Requirement | Priority |
|----|-------------|----------|
| SIH-DEMO-001 | SIH demonstration SHALL include a working mobile application | P0 |
| SIH-DEMO-002 | SIH demonstration SHALL include a recycler-side interface | P0 |
| SIH-DEMO-003 | SIH demonstration SHALL include structured datasets for: materials, prices, recyclers, transactions | P0 |
| SIH-DEMO-004 | SIH demonstration SHALL include field research with >= 2 scrap collectors or aggregators | P0 |
| SIH-DEMO-005 | SIH demonstration SHALL include a live usability demonstration | P0 |
| SIH-DEMO-006 | SIH demonstration SHALL include unit economics assessment | P0 |
| SIH-DEMO-007 | ECOSETU demonstration SHALL show Journey B (collector economic workflow) end-to-end | P0 |
| SIH-DEMO-008 | ECOSETU demonstration SHALL NOT rely on fabricated data or mock flows for core requirements | P0 |

---

## 5. Dataset Requirements

### 5.1 Material Dataset Schema

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| material_id | UUID | Yes | Unique identifier |
| category | ENUM | Yes | Primary material category |
| subcategory | VARCHAR | Yes | Material subcategory |
| description | TEXT | No | Collector description |
| image_urls | TEXT[] | Yes | Photo references (min 1) |
| approximate_weight_kg | DECIMAL | Yes | Collector estimate |
| condition | ENUM | Yes | working/not_working/damaged/unknown |
| source_type | ENUM | Yes | household/commercial/industrial/street |
| estimated_value | DECIMAL | No | System estimate at capture time |
| collector_id | UUID | Yes | Collector who captured |
| capture_timestamp | TIMESTAMPTZ | Yes | When material was captured |
| capture_location | POINT | Yes | GPS at time of capture |
| lot_id | UUID | No | Associated lot (if assigned) |
| created_at | TIMESTAMPTZ | Yes | Record creation |
| updated_at | TIMESTAMPTZ | Yes | Last update |

### 5.2 Price Dataset Schema

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| price_id | UUID | Yes | Unique identifier |
| category | ENUM | Yes | Material category |
| subcategory | VARCHAR | No | Material subcategory |
| location | POINT | Yes | Geographic location (area-level) |
| location_name | VARCHAR | Yes | Human-readable area name |
| date_effective | DATE | Yes | Date price is valid |
| date_expires | DATE | No | Expiry date (NULL = current) |
| buying_price | DECIMAL | Yes | Market buying price |
| selling_quoted_price | DECIMAL | No | Recycler quoted price |
| unit | ENUM | Yes | per_kg / per_unit / per_lot |
| market_range_low | DECIMAL | No | Low end of market range |
| market_range_high | DECIMAL | No | High end of market range |
| recycler_id | UUID | No | Recycler offering this price |
| data_source | VARCHAR | Yes | Source of price data |
| created_at | TIMESTAMPTZ | Yes | |
| updated_at | TIMESTAMPTZ | Yes | |

### 5.3 Recycler Dataset Schema

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| recycler_id | UUID | Yes | Unique identifier |
| user_id | UUID | Yes | Platform user account |
| facility_name | VARCHAR | Yes | Official facility name |
| facility_address | TEXT | Yes | Full address |
| facility_lat | DECIMAL | Yes | Latitude |
| facility_lng | DECIMAL | Yes | Longitude |
| authorization_number | VARCHAR | No | CPCB/SPCB registration number |
| authorization_document_url | VARCHAR | No | Uploaded authorization document |
| authorization_status | ENUM | Yes | AUTHORIZED / PENDING / EXPIRED |
| authorization_expiry | DATE | No | Authorization expiry date |
| materials_accepted | JSONB | Yes | Array of category+subcategory objects |
| offered_rates | JSONB | No | Map of category to rate per unit |
| pickup_available | BOOLEAN | Yes | Whether recycler offers pickup |
| pickup_area_radius_km | DECIMAL | No | Pickup service radius |
| service_area | JSONB | No | Service area polygon |
| contact_phone | VARCHAR | No | Contact phone |
| contact_email | VARCHAR | No | Contact email |
| created_at | TIMESTAMPTZ | Yes | |
| updated_at | TIMESTAMPTZ | Yes | |

### 5.4 Transaction Dataset Schema

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| transaction_id | UUID | Yes | Unique transaction identifier |
| lot_id | UUID | Yes | Material lot reference |
| collector_id | UUID | Yes | Collector identifier |
| recycler_id | UUID | Yes | Recycler identifier |
| material_category | ENUM | Yes | Primary material category |
| material_subcategory | VARCHAR | No | Subcategory |
| quantity_weight_kg | DECIMAL | Yes | Final agreed weight |
| quoted_price | DECIMAL | Yes | Recycler quoted price |
| final_price | DECIMAL | No | Final agreed price |
| price_unit | ENUM | Yes | per_kg / per_unit / per_lot |
| collection_location | POINT | No | Where material was collected |
| handover_location | POINT | Yes | Where handover occurred |
| handover_timestamp | TIMESTAMPTZ | Yes | When handover occurred |
| handover_reference | VARCHAR | Yes | Unique handover reference number |
| payment_status | ENUM | Yes | PENDING / CASH_RECEIVED / DIGITAL_RECEIVED |
| payment_timestamp | TIMESTAMPTZ | No | When payment received |
| transaction_status | ENUM | Yes | QUOTED/ACCEPTED/HANDOVER_PENDING/HANDOVER_COMPLETE/PAYMENT_COMPLETE/DISPUTED |
| created_at | TIMESTAMPTZ | Yes | |
| updated_at | TIMESTAMPTZ | Yes | |

### 5.5 Traceability Dataset Schema

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| trace_id | UUID | Yes | Unique traceability record ID |
| lot_id | UUID | Yes | Material lot |
| handover_reference | VARCHAR | Yes | Unique handover reference |
| photograph_urls | TEXT[] | Yes | Handover photos |
| weight_kg | DECIMAL | Yes | Verified weight at handover |
| capture_timestamp | TIMESTAMPTZ | Yes | When material was captured |
| handover_timestamp | TIMESTAMPTZ | Yes | When handover occurred |
| capture_gps | POINT | No | GPS at material capture |
| handover_gps | POINT | Yes | GPS at handover |
| collector_id | UUID | Yes | Collector |
| recycler_id | UUID | Yes | Recycler |
| recycler_confirmation | BOOLEAN | Yes | Whether recycler confirmed |
| recycler_confirmed_at | TIMESTAMPTZ | No | When recycler confirmed |
| subsequent_status | VARCHAR | No | Downstream recycling status |
| citizen_request_id | UUID | No | Originating citizen request (if Journey A) |
| created_at | TIMESTAMPTZ | Yes | |

### 5.6 Collector Dataset Schema

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| collector_id | UUID | Yes | Platform collector identifier |
| preferred_language | ENUM | Yes | hi / mr / or / en |
| general_operating_area | VARCHAR | Yes | Area-level location (not precise address) |
| operating_location | POINT | No | Approximate area centroid |
| transaction_history | Reference | Yes | Linked to Transaction Dataset |
| earnings_history | Reference | Yes | Linked to Earnings records |
| created_at | TIMESTAMPTZ | Yes | |
| updated_at | TIMESTAMPTZ | Yes | |

> **Privacy Note:** Do NOT store precise home address, Aadhaar, or other sensitive PII beyond what is minimally required.

---

## 6. AI/ML Requirements

### 6.1 Material Classification (SIH-AI-001)
- Input: material image
- Output: category/subcategory + confidence score
- Model must be trained on real data or clearly documented open datasets
- Confidence threshold must be shown to user
- Fallback: manual pictorial picker (always available)
- Do not claim AI accuracy without measured evaluation on a test set

### 6.2 Approximate Valuation (SIH-AI-002)
- Input: material + weight + location + historical price + transaction data
- Output: estimated value range
- Until sufficient data exists: rule-based lookup from price table is acceptable with Estimate label
- Valuation methodology must be documented

### 6.3 Recycler Recommendation (SIH-AI-003)
- Input: material + location + price + authorization + pickup availability
- Output: ranked recycler candidates
- Until AI is available: rule-based matching (proximity + accepted categories + offered rate) is the baseline
- Ranking algorithm must be documented

### 6.4 Transaction Anomaly Detection (SIH-AI-004)
- Identify unusual/inconsistent prices or transaction values
- Must NOT be deployed until sufficient transaction history exists
- Flagged transactions must not block operations — admin review only

### 6.5 AI Honesty Rules (HARD RULES — violation invalidates SIH submission)

| Rule | Requirement |
|------|-------------|
| AI-HONEST-01 | Do NOT claim AI functionality without a real trained model |
| AI-HONEST-02 | Do NOT fabricate accuracy numbers |
| AI-HONEST-03 | Do NOT use AI label on rule-based or lookup logic |
| AI-HONEST-04 | Always show confidence scores |
| AI-HONEST-05 | Always document dataset source, size, quality, and limitations |

---

## 7. Safety Requirements

### 7.1 Safety Topics Required by SIH 26229

| Topic ID | Topic | Content Type |
|----------|-------|-------------|
| SIH-SAFE-CABLE | Cable burning — why dangerous, what to do instead | Image + Audio |
| SIH-SAFE-ACID | Acid leaching of PCBs — health risks, proper handling | Image + Audio |
| SIH-SAFE-PCB | Unsafe PCB dismantling — proper facility requirement | Image + Audio |
| SIH-SAFE-BAT | Battery handling — lithium, lead-acid, NiMH hazards | Image + Audio |
| SIH-SAFE-CRT | CRT handling — lead glass, implosion risk | Image + Audio |
| SIH-SAFE-ELEC | Electrical hazards — capacitors, live circuits | Image + Audio |
| SIH-SAFE-PPE | Protective equipment — gloves, masks, eye protection | Image + Audio |

### 7.2 Safety UX Requirements
- Content must be understandable without reading (pictorial primary)
- Each safety topic: max 3 images + 1 audio explanation
- Safety section accessible from home screen without login
- Bundle content with app — do not depend on network for safety access
- Hindi and Marathi audio recordings required

---

## 8. Vernacular Requirements

### 8.1 Supported Languages

| Language | Script | Priority | Current Status |
|----------|--------|----------|----------------|
| Hindi | Devanagari | P0 (SIH mandatory) | Implemented — partial screens |
| Marathi | Devanagari | P0 (SIH mandatory) | Implemented — partial screens |
| Odia | Odia | Preserve | Implemented |
| English | Latin | Preserve | Implemented |

### 8.2 Translation Coverage Required

| Screen / Journey | Hindi | Marathi | Gap |
|-----------------|-------|---------|-----|
| Collector Home | Partial | Partial | New Journey B strings missing |
| Price Board | Missing | Missing | New screen entirely missing |
| Material Lot | Missing | Missing | New screen entirely missing |
| Value Estimate | Missing | Missing | New screen entirely missing |
| Recycler Matching | Missing | Missing | New screen entirely missing |
| Quotes | Missing | Missing | New screen entirely missing |
| Handover | Missing | Missing | New screen entirely missing |
| Payment | Missing | Missing | New screen entirely missing |
| Earnings Ledger | Missing | Missing | New screen entirely missing |
| Safety Center | Missing | Missing | New screen entirely missing |
| Notifications | Partial | Partial | New notification types missing |

---

## 9. Low-Literacy UX Requirements

### Core Principles
1. Icon-first: Every material category has a recognizable icon >= 64dp
2. Color-coded status: Red/amber/green for all status indicators
3. Minimal text input: Camera, pickers, sliders preferred over keyboard
4. Large touch targets: >= 48dp all interactive elements
5. Voice assistance: TTS for prices, estimates, handover reference
6. Simple confirmation: Yes/No with icon — no multi-step form confirmation
7. Progressive disclosure: Show only what is needed for the current step
8. No jargon: Avoid consignment, EPR, traceability in collector-facing UI

### Material Category Icon Set Required

All 14+ SIH-mandated categories need pictorial icons:
CRT monitor, LCD panel, PCB/circuit board, cable/wire, battery, motor/magnet assembly, mixed plastic, mobile phone, laptop, desktop computer, tablet, printer, keyboard+mouse, standalone monitor.

---

## 10. Offline Requirements

### Offline-Capable (Core Activities)

| Activity | Offline Mode | Sync Trigger |
|----------|-------------|-------------|
| Material photo capture | Full | On connect |
| Material lot creation (draft) | Full | On connect |
| Category selection | Full | N/A |
| Weight entry | Full | N/A |
| GPS location capture | Full | N/A |
| Price Board view | Cached (24h) | On connect |
| Recycler directory view | Cached | On connect |
| Safety content | Bundled | Never |
| Earnings Ledger read | Cached | On connect |

### Online-Required (Irreversible Actions)

| Activity | Reason |
|----------|--------|
| Quote acceptance | Server-authoritative; irreversible |
| Handover confirmation | Immutable record creation |
| Payment confirmation | Financial record |
| Recycler acceptance | Server-authoritative |
| New user registration | Account creation |
| Admin verification | Admin action |

### Synchronization Protocol
- Offline drafts SHALL sync automatically when connectivity restores
- Sync conflicts SHALL be detected and flagged (not silently overwritten)
- Sync status SHALL be visible to user (Pending / Syncing / Synced)
- Failed sync SHALL be retried with exponential backoff

---

## 11. Privacy and Security Requirements

| ID | Requirement |
|----|-------------|
| SIH-PRIV-001 | Collector dataset SHALL be minimal — no unnecessary PII collected |
| SIH-PRIV-002 | Precise home address of collectors SHALL NOT be stored (area-level only) |
| SIH-PRIV-003 | Real-time GPS tracking of collectors is NOT required and SHALL NOT be implemented |
| SIH-PRIV-004 | Earnings data SHALL be accessible only to the individual collector and admin |
| SIH-PRIV-005 | Analytics SHALL use anonymized data; individual collector PII not exposed |
| SIH-PRIV-006 | Verification documents SHALL be stored securely and accessible only to admin |
| SIH-PRIV-007 | All NFR-04 through NFR-12 from `01_PRD.md` are preserved |

---

## 12. Unit Economics Requirement

The SIH final submission must include a Unit Economics Assessment. This is a research deliverable, not a software feature.

### Required Comparison

| Metric | Current Informal | ECOSETU Formal |
|--------|-----------------|---------------|
| Revenue per kg (copper cable) | From field research | From price board data |
| Revenue per unit (mobile phone) | From field research | From recycler offered rates |
| Price discovery time | From field research | Platform price board |
| Transport cost | From field research | Pickup availability (recycler pickup) |
| Time from collection to payment | From field research | Transaction dataset |
| Rejected/unrecoverable material | From field research | Platform tracking |
| Payment certainty | From field research | Transaction + payment record |
| Collector net earnings per day | From field research | Earnings ledger estimate |

> All numbers must come from field research or clearly labelled assumptions. Fabrication is PROHIBITED (SIH-ECON-005).

---

## 13. Field Research Requirement

### What is Required

Field research involving **at minimum 2 working scrap collectors or aggregators**.

This is a SIH mandatory deliverable. It CANNOT be fabricated.

### Research Protocol

| Topic | Research Method |
|-------|----------------|
| Current price discovery methods | Interview + observation |
| Material categories collected daily | Observation + inventory review |
| Payment practices (cash vs digital) | Interview |
| Safety practices observed | Direct observation |
| Language preferences and literacy | Interview |
| Connectivity and smartphone usage | Observation + interview |
| Existing recycler relationships | Interview |
| Daily workflow (routes, hours, volumes) | Observation |
| Current earnings (approximate) | Interview (voluntary) |
| Pain points in current workflow | Interview |

### Output Required
- Field Research Report (documentation)
- Interview notes (anonymized)
- Photographic evidence where appropriate
- Summary of findings to inform design decisions

---

## 14. SIH Demonstration Requirements

The live SIH demonstration must show:

1. Working mobile application (Journey A + Journey B)
2. Recycler-side interface (quote issuance, handover confirmation)
3. Structured datasets: materials, prices, recyclers, transactions (live, not static CSV)
4. Field research evidence with >= 2 collectors
5. Live usability demonstration (real device, real flows)
6. Unit economics assessment (formal vs informal comparison)
7. End-to-end Journey B: lot creation -> quote -> handover -> confirmation -> earnings ledger
8. Safety Center demonstration
9. Hindi/Marathi language demonstration
10. Offline capability demonstration

---

## 15. Current ECOSETU Coverage

### What EXISTS (as of 2026-09-20)

| SIH Module | Coverage | Notes |
|-----------|----------|-------|
| Auth / Registration | IMPLEMENTED | JWT, roles, verification flow |
| Citizen item submission | IMPLEMENTED | SubmitItemScreen, ewaste_items |
| Collection requests | IMPLEMENTED | Full citizen journey |
| Collector request browsing | IMPLEMENTED | CollectorBrowseScreen |
| Pickup confirmation | IMPLEMENTED | CollectorPickupDetailScreen |
| Consignment creation | IMPLEMENTED | CreateConsignmentScreen |
| Recycler consignment acceptance | IMPLEMENTED | Recycler screens |
| Recycling record | IMPLEMENTED | recycling_records table |
| Item traceability (Journey A) | IMPLEMENTED | ItemTraceabilityScreen |
| Admin dashboard | IMPLEMENTED | Verification, analytics, audit |
| In-app notifications | IMPLEMENTED | FCM + in-app |
| i18n infrastructure | IMPLEMENTED | 4 languages (en/hi/mr/or) |
| Camera integration | IMPLEMENTED | Photo capture + compression |
| GPS integration | IMPLEMENTED | Location capture |
| Basic offline resilience | PARTIAL | Queue architecture planned but incomplete |
| AI material classification | PARTIAL | YOLOv8 for citizen side only |
| Low-literacy design tokens | PARTIAL | Design system exists; not enforced on all new screens |

---

## 16. Missing Functionality

### Critical (P0 — Required for SIH)

1. **Material Lots** — Core data entity for Journey B (SIH-LOT-001 through SIH-LOT-008)
2. **Price Board** — Core user-facing feature (SIH-PRICE-001 through SIH-PRICE-009)
3. **Price Dataset** — Core data infrastructure (SIH-DATA-003, SIH-HIST-001)
4. **Value Estimation** — Core user value proposition (SIH-VAL-001 through SIH-VAL-005)
5. **Recycler Offered Rates** — Required for matching and price board (SIH-RATE-001 through SIH-RATE-003)
6. **Recycler Matching by material + rate + location** — Core feature (SIH-MATCH-001 through SIH-MATCH-006)
7. **Quotation system** — Required for formal transaction (SIH-QUOTE-001 through SIH-QUOTE-007)
8. **Handover Record** — Required for traceability (SIH-HAND-001 through SIH-HAND-007)
9. **Payment Recording (cash)** — Required; conflicts with old PRD non-goal (SIH-PAY-001 through SIH-PAY-005)
10. **Earnings Ledger** — Required for SIH (SIH-EARN-001 through SIH-EARN-006)
11. **Safety Center** — Required for SIH (SIH-SAFE-001 through SIH-SAFE-007)
12. **Hindi/Marathi coverage** for all new Journey B screens
13. **Journey B end-to-end** — Not demonstrable without items 1 through 11

### Important (P1)

14. Recycler directory extended schema (offered rates, pickup availability, service area, authorization expiry)
15. TTS for prices and safety
16. Price history and trends
17. Offline sync completion
18. Dataset lifecycle management
19. Material subcategory taxonomy
20. Pictorial material category icons (14+ categories)

### Future (P2)

21. AI Valuation model
22. AI Recycler Recommendation model
23. Transaction Anomaly Detection
24. Digital payment integration (UPI)
25. IoT weighing integration

---

## 17. Partially Implemented Functionality

| Feature | Existing Implementation | Gap |
|---------|------------------------|-----|
| Recycler profile | recycler_profiles: facility, address, lat/lng, license, accepted_categories | Missing: offered_rates per material, pickup_available flag, pickup_radius, service_area, authorization_expiry |
| Collector profile | collector_profiles: service area, availability toggle | Missing: preferred_language field, earnings linkage |
| Traceability | Journey A fully traced via ItemTraceabilityScreen | Journey B traceability entirely absent |
| Vernacular UI | 4 languages with i18n infrastructure | New Journey B screens have no translations |
| Offline operation | Basic queue architecture in roadmap | Price board cache, lot draft sync, earnings cache not implemented |
| AI classification | YOLOv8n-cls for citizen item submission | No coverage for collector-captured material lots |
| Notification system | Implemented for existing lifecycle events | No notifications for price updates, quotes, handover, payment |
| Dataset generation | Transaction/audit data generated dynamically | No price dataset, no Journey B traceability dataset, no collector earnings dataset |

---

## 18. Future Roadmap

### Phase 1 — Material Lot Foundation
- Collector-side material capture (photo + category + weight + GPS)
- Material Lot entity (database schema + API)
- Lot management UI (create, view, edit, draft)
- Offline lot draft support

### Phase 2 — Price Discovery
- Price Dataset database schema
- Admin price ingestion interface
- Price Board UI (category + location filter, cached offline)
- Value Estimation engine (rule-based v1)
- Price display with TTS support

### Phase 3 — Recycler Matching
- Recycler schema extension (offered rates, pickup availability, service area, authorization expiry)
- Matching algorithm (proximity + accepted categories + offered rate)
- Recycler comparison UI for collector

### Phase 4 — Quotation
- Quote creation (recycler side)
- Quote viewing and accept/decline (collector side)
- Quote notification flow
- Quote dataset generation

### Phase 5 — Handover + Transactions
- Handover Record schema + API
- Handover creation (collector + recycler confirmation)
- Transaction Dataset generation
- Traceability Dataset extension (Journey B)

### Phase 6 — Payments + Earnings
- Payment recording (cash acknowledgment)
- Earnings Ledger UI
- Collector Dataset earnings history
- Payment notifications

### Phase 7 — Safety + Low-Literacy UX
- Safety Center (7 topics: pictorial + audio per topic)
- Hindi/Marathi audio recordings
- Low-literacy UX enforcement across all collector screens
- Material category icon set (14+ categories >= 64dp)
- TTS integration (on-device Android TTS)

### Phase 8 — AI/ML
- Expanded material classification dataset (collector-captured images)
- AI valuation model (if sufficient price + transaction data)
- AI recycler recommendation (if sufficient data)
- Transaction anomaly detection (if sufficient transaction history)

### Phase 9 — Dataset Analytics
- Dataset lifecycle tooling (validate -> anonymize -> analyze)
- Price trend computation
- Admin analytics for price and transaction datasets
- Data quality metrics dashboard

### Phase 10 — Field Validation + Unit Economics + SIH Demo
- Field research (minimum 2 collectors)
- Unit economics assessment (formal vs informal comparison)
- SIH demonstration preparation
- End-to-end Journey B demonstration rehearsal

---

## 19. Requirements Index

### All Requirement IDs (alphabetical by prefix)

**SIH-AI:** SIH-AI-001, SIH-AI-001a, SIH-AI-001b, SIH-AI-001c, SIH-AI-001d, SIH-AI-001e, SIH-AI-002, SIH-AI-002a, SIH-AI-002b, SIH-AI-002c, SIH-AI-003, SIH-AI-003a, SIH-AI-003b, SIH-AI-004, SIH-AI-004a, SIH-AI-004b, SIH-AI-004c

**SIH-ANLT:** SIH-ANLT-001, SIH-ANLT-002, SIH-ANLT-003, SIH-ANLT-004

**SIH-AUDIO:** SIH-AUDIO-001, SIH-AUDIO-002, SIH-AUDIO-003, SIH-AUDIO-004, SIH-AUDIO-005

**SIH-COL:** SIH-COL-001, SIH-COL-002, SIH-COL-003, SIH-COL-004, SIH-COL-005

**SIH-DATA:** SIH-DATA-001 through SIH-DATA-014

**SIH-DEMO:** SIH-DEMO-001 through SIH-DEMO-008

**SIH-EARN:** SIH-EARN-001 through SIH-EARN-006

**SIH-ECON:** SIH-ECON-001 through SIH-ECON-005

**SIH-FIELD:** SIH-FIELD-001 through SIH-FIELD-006

**SIH-HAND:** SIH-HAND-001 through SIH-HAND-007

**SIH-HIST:** SIH-HIST-001 through SIH-HIST-004

**SIH-LANG:** SIH-LANG-001 through SIH-LANG-009

**SIH-LIT:** SIH-LIT-001 through SIH-LIT-010

**SIH-LOT:** SIH-LOT-001 through SIH-LOT-008

**SIH-MATCH:** SIH-MATCH-001 through SIH-MATCH-006

**SIH-MAT:** SIH-MAT-001 through SIH-MAT-010

**SIH-OFFLINE:** SIH-OFFLINE-001 through SIH-OFFLINE-014

**SIH-PAY:** SIH-PAY-001 through SIH-PAY-006

**SIH-PRICE:** SIH-PRICE-001 through SIH-PRICE-009

**SIH-PRIV:** SIH-PRIV-001 through SIH-PRIV-007

**SIH-QUOTE:** SIH-QUOTE-001 through SIH-QUOTE-007

**SIH-RATE:** SIH-RATE-001 through SIH-RATE-004

**SIH-RDATA:** SIH-RDATA-001 through SIH-RDATA-004

**SIH-RECY:** SIH-RECY-001 through SIH-RECY-006

**SIH-SAFE:** SIH-SAFE-001 through SIH-SAFE-007

**SIH-TRACE:** SIH-TRACE-001 through SIH-TRACE-006

**SIH-TREND:** SIH-TREND-001 through SIH-TREND-004

**SIH-TXN:** SIH-TXN-001 through SIH-TXN-005

**SIH-VAL:** SIH-VAL-001 through SIH-VAL-005

---

## 20. Architectural Conflicts

The following conflicts exist between the old ECOSETU PRD/architecture and the SIH 26229 requirements. They are documented here. Do NOT resolve silently. STOP and report if a destructive architectural change is required.

### CONFLICT-01: Payment Processing

| | Old PRD | SIH Requirement |
|--|---------|----------------|
| Document | 01_PRD.md Section 9 Non-Goals | SIH-PAY-001 through SIH-PAY-005 |
| Old stance | "Payment processing — explicitly NOT in scope for MVP" | Cash-based payment recording IS required |
| Conflict | Direct conflict — old PRD calls it a non-goal; SIH 26229 mandates it | |
| Resolution | SIH SUPERSEDES. Cash payment acknowledgment recording must be implemented. Full digital payment (UPI) remains FUTURE. No existing code needs to be deleted. New payment tables/fields must be added. |

### CONFLICT-02: Multi-Language Support

| | Old PRD | SIH Requirement |
|--|---------|----------------|
| Document | 01_PRD.md Section 9 Non-Goals | SIH-LANG-001, SIH-LANG-002 |
| Old stance | "Multi-language support — English suffices for SIH demo" | Hindi + Marathi are MANDATORY per SIH 26229 |
| Conflict | Old PRD called multi-language a non-goal; SIH makes it mandatory | |
| Resolution | i18n was later implemented in code (Hindi, Marathi, Odia, English). Conflict partially resolved. New Journey B screens still need translations. |
| Status | Partially resolved in code; documentation conflict persists between old PRD Non-Goals and current implementation. |

### CONFLICT-03: Material Lot as Core Entity

| | Old Architecture | SIH Requirement |
|--|---------|----------------|
| Document | 04_DATABASE_SCHEMA.md | SIH-LOT-001 through SIH-LOT-008 |
| Old stance | No Material Lot entity. Consignment is the closest analog but represents collector-to-recycler delivery, not collector-owned material | Material Lot is the CORE entity for Journey B — the fundamental unit of the collector economic workflow |
| Conflict | Existing schema has no `material_lots` table. `consignments` serves a different purpose. | |
| Resolution | New `material_lots` table must be created. Existing `consignments` table is preserved and remains in use. No existing tables should be deleted. The Lot entity is upstream of Consignment in the data flow. |
| Risk | Database migration required. Ensure consignment flow continues to work after new entity is added. |

### CONFLICT-04: Journey B Entirely Missing

| | Old Architecture | SIH Requirement |
|--|---------|----------------|
| Document | 07_BUSINESS_WORKFLOWS.md | SIH-DEMO-007 |
| Old stance | Collector workflow ends at consignment creation. No price discovery, no quotation, no earnings, no payment. | Complete Journey B (price discovery -> lot -> matching -> quote -> handover -> payment -> earnings) is an SIH core requirement |
| Conflict | Journey B does not exist in any existing document or implementation | |
| Resolution | Journey B must be built on top of existing infrastructure. Journey A is entirely preserved and unaffected. |

### CONFLICT-05: Safety Center Not Mentioned

| | Old PRD | SIH Requirement |
|--|---------|----------------|
| Document | 01_PRD.md (entirely absent) | SIH-SAFE-001 through SIH-SAFE-007 |
| Old stance | Safety guidance not mentioned anywhere in existing docs | Safety guidance is EXPLICITLY required by SIH 26229 problem statement |
| Conflict | Old docs simply do not address safety — it was an omission, not a conscious exclusion | |
| Resolution | Safety Center must be created as a new independent feature. No existing architecture conflicts with this addition. |

---

*Document established: 2026-09-20*
*Baseline authority: SIH 2026 Problem Statement 26229*
*All subsequent implementation tasks must trace to requirement IDs in this document.*
*Do NOT modify this document to retroactively match old architecture — update old architecture instead.*
