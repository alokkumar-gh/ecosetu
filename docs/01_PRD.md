# EcoSetu — Product Requirements Document

> **Reference:** All terminology follows `00_PROJECT_INDEX.md`.

---

## 1. Executive Summary

EcoSetu is a technology platform that integrates informal e-waste collectors (kabadiwalas) into a structured, traceable recycling chain. The platform connects three key stakeholders — citizens generating e-waste, informal collectors who gather it, and authorized recyclers who process it — through an Android mobile application with optional AI-assisted e-waste identification.

The platform creates a transparent chain of custody from e-waste generation to recycling completion, addressing India's growing e-waste crisis while formalizing the role of the informal collection sector. The current primary implementation target is an Android application; a companion web portal is marked as **FUTURE / DEFERRED**.

---

## 2. Problem Statement

**SIH Problem Statement 26229:** Bring the informal collector into the formal recycling chain.

India generates approximately 3.2 million tonnes of e-waste annually (Global E-waste Monitor 2024), with an estimated 90%+ handled by the informal sector. Informal collectors (kabadiwalas) play a vital economic role but operate outside formal systems, leading to:

- **No traceability** — e-waste disappears into unregulated channels
- **Environmental harm** — improper dismantling releases toxic materials
- **Health risks** — collectors handle hazardous materials without protection
- **Economic exploitation** — collectors lack bargaining power without formal recognition
- **Regulatory gaps** — EPR (Extended Producer Responsibility) compliance is difficult to verify
- **Data vacuum** — no reliable data on collection volumes, routes, or recycling rates

---

## 3. Background
The overwhelming majority of India’s end-of-life electronics is collected through informal scrap dealers, waste-pickers, and local aggregators due to their extensive last-mile reach and low collection costs. However, these informal collectors remain largely outside the formal recycling ecosystem. The E-Waste (Management) Rules, 2022 established a formal Extended Producer Responsibility (EPR) framework involving authorized recyclers, but there is currently limited access for informal collectors to participate in this formal recycling chain. As a result, material collected by informal aggregators may undergo unsafe backyard processing such as open-air cable burning, acid leaching of printed circuit boards, and manual desoldering without proper extraction facilities. While materials such as copper and small quantities of gold may be recovered, valuable materials including lithium, cobalt, neodymium, tantalum, gallium, and indium may be lost. These practices also expose workers to significant health and safety risks. The fundamental gap is not only technological but also informational and institutional. Informal collectors may not know the prevailing fair price of materials, which nearby recyclers are authorized, how to complete a compliant material handover, or how to obtain a documented record of the transaction. Consequently, there is limited incentive for collectors to prefer the formal recycling route Problem: Design and develop a vernacular, low-literacy, offline-tolerant mobile platform that enables informal scrap collectors to discover fair prices, connect directly with authorized recyclers, complete a documented and traceable handover of collected materials, and receive payment. The platform should make the formal recycling channel an economically attractive and convenient option for informal collectors rather than creating an additional compliance burden The platform should: • Allow collectors to photograph, categorize, and create digital lots of collected materials such as CRTs, LCD panels, PCBs, cables, batteries, motors and magnet-bearing assemblies, and mixed plastics, enter approximate weight, and receive an instant value estimate. • Provide a price discovery and historical price dataset containing material category, sub-category,location, date, prevailing buying price, unit of measurement, approximate market range, and recycler/aggregator offered price. The system should use this dataset to provide transparent and current price information to collectors and identify basic price trends. • Maintain a material and transaction dataset containing lot/reference ID, material category, material description, photograph/image reference, approximate weight, estimated value, quoted price, final sale value, date and time of collection, collection location, recycler details, and transaction status. This dataset should enable traceability of material from collection to authorized recycling. • Maintain an authorized recycler/aggregator dataset containing recycler/aggregator name, facility location, materials accepted, authorization/registration details, authorization status, contact details, offered rates, pickup availability, and service area. The platform should use this information to identify and rank suitable authorized recyclers for a collector's lot. • Use the collected material image, category, weight, location, historical price, and transaction data to support AI/ML-based features such as material classification, approximate valuation, recycler matching, and identification of abnormal or inconsistent transaction values, wherever sufficient training data is available. • Provide current buying rates for different material categories and locations through a simple price board, including spoken price information and basic price trends. • Match collected lots with nearby authorized recyclers or aggregators based on location, material category, offered rate, pickup availability, and authorization status. • Generate a digital and verifiable handover/transfer record containing photographs, weight, timestamp, GPS/location details, and a unique reference that can be confirmed by the recycler. • Maintain an easy-to-understand earnings ledger showing transactions, payments, and pending dues, thereby building a usable financial and transaction history for collectors. • Provide pictorial and/or audio-based safety guidance on hazardous practices, including improper burning or opening of materials and safe handling of batteries and CRTs. • Support Marathi and Hindi at a minimum and provide a genuinely usable interface for users with limited literacy. • Operate in low-connectivity environments through an offline-first architecture, allowing core activities to be completed offline and synchronized when connectivity becomes available. • Support entry-level Android devices with a small application size and low memory requirements. Allow cash-based transactions while keeping digital payment optional and not making it a prerequisite for using the platform. Dataset Requirements: The solution should be designed to create and utilize structured datasets generated through field operations and platform transactions. The minimum dataset should cover the following: • Material Dataset: Material category, sub-category, material description, image, approximate weight, condition, source type, and estimated value. • Price Dataset: Material category, location, date/time, buying price, selling/quoted price, unit, recycler/aggregator, and historical price information. • Recycler Dataset: Recycler/facility name, location, materials accepted, authorization status/details,contact information, offered rate, pickup availability, and service area. • Transaction Dataset: Unique lot ID, collector ID, material category, quantity/weight, quoted price, final price, recycler ID, collection location, handover location, date/time, payment status, and transaction status. • Traceability Dataset: Lot ID, photographs, weight, timestamp, GPS/location, handover reference number, recycler confirmation, and subsequent transaction status. • Collector Dataset: A minimal profile containing collector ID, preferred language, general operating location, transaction history, and earnings history. The system should avoid collecting unnecessary personal information. • AI/ML Training Dataset: Where AI/ML functionality is proposed, teams should develop or use appropriately sourced datasets containing material images, material categories, weights, prices, locations, and transaction records for model training and validation. Teams should clearly identify the source, quality, size, and limitations of such datasets. • The dataset should support data cleaning, validation, anonymization where required, historical analysis, price prediction, material classification, recycler recommendation, and transaction-level traceability. • Teams should demonstrate how the dataset is generated, stored, validated, updated, and used by the application rather than treating the dataset as a static database. Expected Outcome: The proposed solution should create a simple digital bridge between informal collectors and the formal recycling ecosystem, improving price transparency, enabling traceable material handovers, connecting collectors with authorized recyclers, promoting safer handling practices, and encouraging greater participation in the formal recycling chain. The solution should include a working mobile application, recycler-side interface, structured datasets for materials, prices, recyclers and transactions, field research involving at least two working scrap collectors or aggregators, and a live usability demonstration. Teams should also provide a short unit-economics assessment comparing the collector's existing earnings with the potential earnings through the proposed platform and explaining how the platform can sustain its operations.


### The Informal Collection Ecosystem

Kabadiwalas are informal waste collectors who purchase scrap and recyclables from households and businesses. For e-waste:

1. Citizens accumulate old electronics
2. Kabadiwalas visit door-to-door or operate from fixed locations
3. Items are sold to aggregators or dismantlers
4. Components are separated (often unsafely)
5. Valuable materials are extracted; the rest is discarded

### Why Integration Matters

- **For citizens:** Convenient, responsible disposal with pickup service
- **For collectors:** Formal recognition, consistent demand, fair pricing access
- **For recyclers:** Reliable supply chain with material documentation
- **For regulators:** Data for EPR compliance and policy-making
- **For environment:** Reduced toxic exposure from unregulated processing

---

## 4. Problem Analysis

| Problem | Impact | Platform Solution |
|---------|--------|------------------|
| No way for citizens to find collectors | E-waste accumulates or enters landfills | Collection request system with location matching |
| Collectors have no formal identity | Cannot access formal recycling channels | Digital profile and verification system |
| No chain of custody | Impossible to verify responsible recycling | End-to-end traceability from submission to recycling |
| No data on e-waste flows | Policy-making lacks evidence | Analytics dashboard from platform transactions |
| Hazardous material handling | Health risks for collectors | Category identification helps flag hazardous items |
| Manual item identification | Slow, error-prone categorization | Optional AI-assisted e-waste identification |

---

## 5. Target Users

### 5.1 Citizen (`CITIZEN`)

- **Who:** Any person or household with e-waste to dispose of
- **Technical profile:** Smartphone user, basic app literacy
- **Motivation:** Convenient, responsible e-waste disposal
- **Frequency:** Occasional (few times per year)
- **Key needs:** Easy submission, pickup scheduling, confirmation of responsible recycling

### 5.2 Informal Collector (`INFORMAL_COLLECTOR`)

- **Who:** Kabadiwala, street-level scrap collector, small recycling shop owner
- **Technical profile:** Smartphone user, variable literacy; may prefer simple interfaces
- **Motivation:** Consistent demand, fair access to recyclers, formal recognition
- **Frequency:** Daily use
- **Key needs:** See nearby requests, accept/reject, confirm pickups, deliver to recyclers

### 5.3 Recycler (`RECYCLER`)

- **Who:** Authorized e-waste recycling facility or registered processor
- **Technical profile:** Smartphone/tablet user (with future web dashboard access), moderate technical literacy
- **Motivation:** Reliable supply with documentation for compliance
- **Frequency:** Daily use
- **Key needs:** Receive consignments, record processing, generate compliance reports

### 5.4 Administrator (`ADMIN`)

- **Who:** Platform operator (student team member for SIH demo)
- **Technical profile:** Full technical access
- **Motivation:** Platform integrity, user verification, dispute resolution
- **Frequency:** Regular monitoring
- **Key needs:** Verify users, monitor activity, handle issues, view analytics

### 5.5 Business / Institution (`BUSINESS`) — FUTURE

- **Who:** Offices, schools, IT companies with bulk e-waste
- **Status:** Deferred to future enhancements
- **Rationale:** Adds complexity without changing core workflow for MVP

---

## 6. User Pain Points

### Citizens
- "I have old electronics but don't know how to dispose of them responsibly"
- "I don't know if my kabadiwala actually recycles items properly"
- "I want confirmation that my e-waste was recycled, not dumped"

### Informal Collectors
- "I walk around hoping to find customers — no reliable demand"
- "I can't prove I'm a legitimate collector"
- "I don't have direct access to authorized recyclers"

### Recyclers
- "I need documented incoming material for compliance"
- "Supply from informal channels is unpredictable"
- "I can't verify the source of materials I receive"

### Regulators (indirect beneficiaries)
- "We have no data on informal e-waste collection volumes"
- "EPR compliance is difficult to verify without traceability"

---

## 7. Product Vision

> A simple, transparent platform where **citizens** can responsibly dispose of e-waste, **informal collectors** are recognized and connected to formal channels, and **recyclers** receive documented material — creating a traceable chain from generation to recycling.

---

## 8. Product Goals

| # | Goal | Metric |
|---|------|--------|
| G1 | Enable citizens to submit e-waste for collection | Collection requests created |
| G2 | Connect citizens with verified informal collectors | Requests accepted by collectors |
| G3 | Facilitate collector-to-recycler handover | Consignments delivered |
| G4 | Create end-to-end traceability | Items with complete lifecycle records |
| G5 | Provide platform analytics | Dashboard with real metrics |
| G6 | Optional AI-assisted item identification | Predictions with measured accuracy |

---

## 9. Non-Goals

The following are explicitly NOT in scope for the MVP:

| Non-Goal | Reason |
|----------|--------|
| Payment processing | Informal transactions happen offline; payment integration adds complexity and regulatory burden |
| Real-time GPS tracking of collectors | Privacy concern; unnecessary for prototype |
| Blockchain-based traceability | No genuine technical advantage over a well-audited database for this scale |
| WhatsApp/SMS integration | Requires paid APIs; in-app notifications suffice for demo |
| Government EPR portal integration | No publicly accessible API exists |
| Aadhaar verification | Requires government partnership; mock only |
| Multi-language support | English-only MVP; i18n architecture noted |
| Gamification / rewards | Not core to the problem statement |
| IoT weighing integration | Requires hardware; manual weight entry suffices |
| Bulk business workflows | Deferred; see Section 5.5 |

---

## 10. Core Features

### F1 — User Registration and Authentication
- Role-based registration (Citizen, Informal Collector, Recycler)
- Email + password authentication
- JWT-based session management
- Admin-seeded accounts

### F2 — User Verification
- Informal Collectors and Recyclers submit verification documents
- Admin reviews and approves/rejects
- Only verified users can perform platform operations

### F3 — E-Waste Item Submission
- Citizens submit e-waste items with:
  - Category (from canonical list)
  - Description
  - Estimated quantity
  - Photo (optional)
  - Condition
- Optional AI-assisted category identification from photo

### F4 — Collection Request
- Citizen groups submitted items into a collection request
- Specifies pickup address and preferred time window
- Location captured via map selection (Leaflet + OSM)

### F5 — Request Discovery and Acceptance
- Verified Informal Collectors see available requests in their area
- Accept/reject requests
- Only one collector per request

### F6 — Pickup Confirmation
- Collector confirms pickup with:
  - Items collected (verified against request)
  - Actual weight (manual entry)
  - Pickup photo (optional)
- Citizen receives pickup confirmation notification

### F7 — Consignment to Recycler
- Collector creates a consignment from collected items
- Selects a verified recycler
- Recycler receives consignment notification

### F8 — Recycling Record
- Recycler accepts consignment
- Records processing details
- Marks recycling as completed
- Completion visible in traceability chain

### F9 — Traceability View
- Any authorized user can view the lifecycle of an item:
  - Submission → Collection → Handover → Recycling
- Each step has timestamp and actor

### F10 — Admin Dashboard
- User verification management
- Platform activity overview
- Basic analytics (counts, trends)
- User management (suspend/reactivate)

### F11 — AI-Assisted E-Waste Identification (Optional Enhancement)
- Citizen uploads photo → model predicts category
- Prediction shown as suggestion (not forced)
- Citizen can accept or override
- Confidence score displayed
- Low-confidence predictions flagged

### F12 — Notifications
- In-app notifications for key events:
  - Request submitted/accepted/completed
  - Pickup scheduled/completed
  - Consignment delivered/accepted
  - Verification approved/rejected

---

## 11. User Stories

### Citizen Stories

| ID | Story | Priority |
|----|-------|----------|
| US-C01 | As a CITIZEN, I want to register and create an account so I can use the platform | Must Have |
| US-C02 | As a CITIZEN, I want to submit e-waste items with category and description so collectors know what to expect | Must Have |
| US-C03 | As a CITIZEN, I want to upload a photo of my e-waste so the AI can suggest a category | Nice to Have |
| US-C04 | As a CITIZEN, I want to create a collection request with my address so a collector can pick up my items | Must Have |
| US-C05 | As a CITIZEN, I want to see the status of my collection request so I know when to expect pickup | Must Have |
| US-C06 | As a CITIZEN, I want to receive a notification when a collector accepts my request | Must Have |
| US-C07 | As a CITIZEN, I want to view the traceability chain of my items to confirm responsible recycling | Should Have |

### Informal Collector Stories

| ID | Story | Priority |
|----|-------|----------|
| US-IC01 | As an INFORMAL_COLLECTOR, I want to register and submit my profile for verification | Must Have |
| US-IC02 | As an INFORMAL_COLLECTOR, I want to see available collection requests near my location | Must Have |
| US-IC03 | As an INFORMAL_COLLECTOR, I want to accept a collection request so I can schedule a pickup | Must Have |
| US-IC04 | As an INFORMAL_COLLECTOR, I want to confirm a pickup with collected item details | Must Have |
| US-IC05 | As an INFORMAL_COLLECTOR, I want to create a consignment to deliver items to a recycler | Must Have |
| US-IC06 | As an INFORMAL_COLLECTOR, I want to see my collection history and statistics | Should Have |

### Recycler Stories

| ID | Story | Priority |
|----|-------|----------|
| US-R01 | As a RECYCLER, I want to register and submit my facility details for verification | Must Have |
| US-R02 | As a RECYCLER, I want to receive consignment notifications from collectors | Must Have |
| US-R03 | As a RECYCLER, I want to accept or reject incoming consignments | Must Have |
| US-R04 | As a RECYCLER, I want to record recycling completion for accepted consignments | Must Have |
| US-R05 | As a RECYCLER, I want to view my processing history | Should Have |

### Admin Stories

| ID | Story | Priority |
|----|-------|----------|
| US-A01 | As an ADMIN, I want to review and approve/reject user verification requests | Must Have |
| US-A02 | As an ADMIN, I want to view platform analytics (total collections, active users, etc.) | Should Have |
| US-A03 | As an ADMIN, I want to suspend or reactivate user accounts | Must Have |
| US-A04 | As an ADMIN, I want to view audit logs for platform activity | Should Have |

---

## 12. Functional Requirements

### FR-AUTH: Authentication
| ID | Requirement |
|----|------------|
| FR-AUTH-01 | System SHALL support registration with email, password, name, phone, and role |
| FR-AUTH-02 | System SHALL hash passwords using bcrypt with minimum 10 salt rounds |
| FR-AUTH-03 | System SHALL issue JWT tokens on successful login |
| FR-AUTH-04 | System SHALL validate JWT on every protected request |
| FR-AUTH-05 | System SHALL support logout by client-side token removal |

### FR-USER: User Management
| ID | Requirement |
|----|------------|
| FR-USER-01 | System SHALL enforce role-based access on all endpoints |
| FR-USER-02 | System SHALL require verification for INFORMAL_COLLECTOR and RECYCLER before allowing operational actions |
| FR-USER-03 | System SHALL allow ADMIN to approve or reject verification requests |
| FR-USER-04 | System SHALL allow ADMIN to suspend or reactivate accounts |

### FR-EWASTE: E-Waste Submission
| ID | Requirement |
|----|------------|
| FR-EWASTE-01 | System SHALL allow CITIZEN to create e-waste items with category, description, quantity, condition |
| FR-EWASTE-02 | System SHALL accept optional image upload for e-waste items |
| FR-EWASTE-03 | System SHALL limit image uploads to JPEG/PNG, max 5MB |
| FR-EWASTE-04 | System SHALL validate category against canonical category list |

### FR-CR: Collection Requests
| ID | Requirement |
|----|------------|
| FR-CR-01 | System SHALL allow CITIZEN to create a collection request with address, location coordinates, and preferred time |
| FR-CR-02 | System SHALL associate one or more e-waste items with a collection request |
| FR-CR-03 | System SHALL display available requests to verified INFORMAL_COLLECTORs |
| FR-CR-04 | System SHALL allow only one collector to accept a request |
| FR-CR-05 | System SHALL update request status through its lifecycle |

### FR-PICKUP: Pickup
| ID | Requirement |
|----|------------|
| FR-PICKUP-01 | System SHALL create a pickup record when a collector starts collection |
| FR-PICKUP-02 | System SHALL allow collector to confirm items collected and weight |
| FR-PICKUP-03 | System SHALL notify citizen when pickup is completed |

### FR-CONSIGN: Consignment
| ID | Requirement |
|----|------------|
| FR-CONSIGN-01 | System SHALL allow INFORMAL_COLLECTOR to create a consignment to a RECYCLER |
| FR-CONSIGN-02 | System SHALL notify RECYCLER of incoming consignment |
| FR-CONSIGN-03 | System SHALL allow RECYCLER to accept or reject consignment |

### FR-RECYCLE: Recycling
| ID | Requirement |
|----|------------|
| FR-RECYCLE-01 | System SHALL allow RECYCLER to create a recycling record for accepted consignments |
| FR-RECYCLE-02 | System SHALL track recycling status (RECEIVED → PROCESSING → COMPLETED) |

### FR-TRACE: Traceability
| ID | Requirement |
|----|------------|
| FR-TRACE-01 | System SHALL maintain a complete audit trail for each e-waste item |
| FR-TRACE-02 | System SHALL display the lifecycle chain to authorized users |

### FR-AI: AI Identification
| ID | Requirement |
|----|------------|
| FR-AI-01 | System SHALL optionally accept an image and return a category prediction |
| FR-AI-02 | System SHALL return a confidence score with each prediction |
| FR-AI-03 | System SHALL allow users to override AI predictions |
| FR-AI-04 | System SHALL log all predictions for quality monitoring |

### FR-NOTIF: Notifications
| ID | Requirement |
|----|------------|
| FR-NOTIF-01 | System SHALL create in-app notifications for status changes |
| FR-NOTIF-02 | System SHALL display unread notification count |
| FR-NOTIF-03 | System SHALL allow users to mark notifications as read |

---

## 13. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|------------|
| NFR-01 | Performance | API responses SHALL complete within 500ms for standard operations |
| NFR-02 | Performance | AI inference SHALL complete within 5 seconds per image |
| NFR-03 | Performance | System SHALL support 100 concurrent users (prototype scale) |
| NFR-04 | Security | All passwords SHALL be hashed; plaintext storage is forbidden |
| NFR-05 | Security | All API endpoints SHALL validate authentication and authorization |
| NFR-06 | Security | File uploads SHALL be validated for type, size, and content |
| NFR-07 | Availability | System SHALL target 99% uptime during SIH demonstration |
| NFR-08 | Usability | All forms SHALL provide validation feedback |
| NFR-09 | Usability | Android application SHALL operate on Android 7.0+ (Nougat / API 24) through latest Android models (Android 14, 15, and 16+ / API 35+) and support diverse smartphone screen densities (hdpi to xxxhdpi) |
| NFR-10 | Accessibility | System SHALL meet mobile accessibility guidelines with 48x48dp minimum touch targets |
| NFR-11 | Data | System SHALL not delete e-waste lifecycle records (soft delete only) |
| NFR-12 | Privacy | System SHALL collect only data necessary for platform operation |
| NFR-13 | Hardware | Application SHALL integrate Android camera for direct photo capture with client-side compression (< 1MB) |
| NFR-14 | Hardware | Application SHALL access device GPS location for pickup coordinate capture |
| NFR-15 | Offline / Network | Application SHALL tolerate intermittent 3G/4G connectivity via local action caching and automatic retry |
| NFR-16 | Permissions | Application SHALL request Android runtime permissions (Camera, Fine/Coarse Location, Notifications) only on demand |

---

## 14. Success Metrics

| Metric | Target (Demo) | Measurement |
|--------|--------------|-------------|
| End-to-end flow completion | ≥ 1 complete cycle demonstrated | Item traced from submission to recycling |
| Collection requests created | ≥ 5 demo requests | Database count |
| Collector verification | ≥ 2 verified collectors | Verification records |
| AI prediction accuracy | Reported honestly (not fabricated) | Evaluated on test set |
| Traceability completeness | 100% of demo items traced | Audit log coverage |
| System uptime during demo | 100% | Monitoring during presentation |

---

## 15. Constraints

| Constraint | Impact |
|-----------|--------|
| Student team (6 members) | Limited development bandwidth |
| SIH timeline (~36 hours hackathon + prep) | Must prioritize MVP features |
| Zero budget | Must use free-tier services only |
| No government API access | EPR/Aadhaar integrations must be mocked |
| No real e-waste dataset available | AI model uses available open datasets + custom collection |
| Demo environment only | Not production-hardened |

---

## 16. Assumptions

| # | Assumption |
|---|-----------|
| A1 | Users have Android smartphones (Android 7.0+ / API 24 to latest Android 16+) with mobile data or Wi-Fi connectivity |
| A2 | Users can provide a valid email address for registration |
| A3 | Collectors and recyclers are willing to undergo platform verification |
| A4 | Location services (GPS) are available on user devices for address/pickup coordinate capture |
| A5 | Free-tier hosting can handle demo-scale load |
| A6 | Image uploads from phone cameras are of sufficient quality for AI inference |
| A7 | The student team has basic React Native / JavaScript, Node.js, and Python familiarity |

---

## 17. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AI model accuracy too low for useful predictions | Medium | Medium | AI is assistive only; users always override; display confidence scores |
| Free-tier services rate-limited during demo | Low | High | Pre-test demo flow; have local fallback |
| Team cannot complete all features in time | Medium | High | Strict MVP priority; cut AI before core workflows |
| No real collectors/recyclers for demo | High | Medium | Use demo accounts with realistic data |
| Database hosting runs out of free storage | Low | Medium | Seed minimal demo data; use Neon's 0.5GB free tier |

---

## 18. MVP Scope

### In MVP

| Feature | Priority |
|---------|----------|
| User registration and login | P0 |
| Role-based access control | P0 |
| Collector/Recycler verification | P0 |
| E-waste item submission | P0 |
| Collection request creation | P0 |
| Request discovery and acceptance | P0 |
| Pickup confirmation | P0 |
| Consignment creation | P0 |
| Recycling record | P0 |
| Traceability view | P1 |
| Admin dashboard | P1 |
| In-app notifications | P1 |
| Basic analytics | P2 |
| AI-assisted identification | P2 |

### NOT in MVP

| Feature | Rationale |
|---------|-----------|
| Business/institution accounts | Adds complexity; core flow works without it |
| Payment processing | Offline transactions; regulatory complexity |
| Real-time chat | Not essential for prototype |
| SMS/WhatsApp paid gateways | Requires paid third-party APIs |
| Multi-language support | English suffices for SIH demo |
| Advanced analytics / ML predictions | Focus on functional platform first |
| Web Application (Portal) | **FUTURE / DEFERRED** — Current MVP is Android mobile application; web portal will consume same backend APIs |

---

## 19. Future Enhancements

These are NOT part of the current build but are documented for completeness:

1. **Future Web Application & Management Portal** — Desktop browser portal for bulk institutional e-waste management, recycler desktop operations, and advanced administrator analytics consuming the existing backend APIs
2. **Business/Institution Module** — Bulk e-waste submission for offices, schools, IT companies
3. **Payment Integration** — UPI/wallet integration for formal transactions
4. **SMS/WhatsApp Notifications** — Reach users without constant app access
5. **Multi-language Support** — Hindi, Marathi, and regional languages via i18n
6. **Route Optimization** — Suggest efficient pickup routes for collectors via mobile navigation
7. **Collector Ratings** — Citizen feedback on collector service
8. **Recycler Compliance Reports** — Automated EPR-style downloadable reports
9. **IoT Weighing** — Bluetooth digital scale integration for accurate weight capture
10. **Government Portal Integration** — When/if national EPR APIs become available
11. **Marketplace** — Allow recyclers to list material availability and buying rates

---

*All terminology in this document follows `00_PROJECT_INDEX.md`.*
