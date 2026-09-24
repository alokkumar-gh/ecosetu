# ECOSETU — MARKETPLACE PHASE 7 ARCHITECTURAL DISCOVERY & AUDIT
## Dispute Resolution & Return Workflows

**Audit Date:** September 22, 2026  
**Target Milestone:** Marketplace Phase 7 (SIH 26229)  
**Git Baseline:** `5eb21425b0aa7affe1fa11e6b5945dd3482625d7` + Phase 6 Additions  

---

### 1. EXISTING RELEVANT ENTITIES & SCHEMA AUDIT

A thorough inspection of `backend/prisma/schema.prisma` and related services was conducted:

| Entity | Primary Table | Key Fields | Existing Status Enum / Values |
|---|---|---|---|
| **MaterialLot** | `material_lots` | `id`, `referenceNumber`, `category`, `approximateTotalWeightKg`, `collectorId` | `MaterialLotStatus`: `DRAFT`, `OPEN`, `QUOTED`, `ACCEPTED`, `HANDOVER_PENDING`, `COMPLETED` |
| **Quote** | `quotes` | `id`, `referenceNumber`, `quotedUnitPrice`, `quotedTotal`, `validUntil`, `status` | `QuoteStatus`: `SENT`, `VIEWED`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED` |
| **HandoverRecord** | `handover_records` | `id`, `referenceNumber`, `declaredWeightKg`, `handoverWeightKg`, `collectorConfirmedAt`, `recyclerConfirmedAt` | `HandoverStatus`: `PENDING_COLLECTOR`, `COLLECTOR_CONFIRMED`, `RECYCLER_CONFIRMED`, `CONFIRMED`, `CANCELLED` |
| **TransactionRecord** | `transactions` | `id`, `referenceNumber`, `quantity`, `finalSaleValue`, `amountPaid`, `amountDue`, `paymentStatus` | `TransactionStatus`: `DRAFT`, `RECORDED`, `CANCELLED`<br>`PaymentStatus`: `PENDING`, `PAID`, `PARTIALLY_PAID`, `FAILED` |
| **PickupBatch** | `pickup_batches` | `id`, `referenceNumber`, `scheduledDate`, `status` | `BatchStatus`: `PLANNED`, `SCHEDULED`, `IN_PROGRESS`, `ARRIVED`, `COLLECTING`, `COMPLETED`, `CANCELLED` |
| **PickupBatchLot** | `pickup_batch_lots`| `id`, `batchId`, `materialLotId`, `status` | `status` (string: `ACTIVE`, etc.) |
| **SourcingRequest**| `sourcing_requests`| `id`, `referenceNumber`, `status` | `SourcingRequestStatus`: `DRAFT`, `OPEN`, `PAUSED`, `FULFILLED`, `EXPIRED`, `CANCELLED` |
| **AuditLog** | `audit_logs` | `id`, `action`, `actorId`, `entityType`, `entityId`, `details`, `timestamp` | Append-only security & compliance trail |

#### Discovery on Pre-Existing Dispute/Return Models:
* **No explicit `MarketplaceDispute` model exists** in the Prisma schema.
* **No explicit `MarketplaceDisputeEvent` model exists**.
* Cancellation currently exists only as discrete status flags (`CANCELLED` on Quote, Handover, Transaction) with simple `cancellationReason` strings, but lacks structured multi-party negotiation, evidence, weight variance arbitration, partial lot acceptance, or physical return tracking.
* Therefore, a dedicated `MarketplaceDispute` and `MarketplaceDisputeEvent` model must be created and linked directly to the canonical entities.

---

### 2. EXISTING STATE MACHINES & BUSINESS LOGIC

1. **Quote $\rightarrow$ Handover Transition:**
   - An accepted quote creates a `HandoverRecord` with status `PENDING_COLLECTOR`.
   - Handover requires dual physical confirmation (`COLLECTOR_CONFIRMED` + `RECYCLER_CONFIRMED` $\rightarrow$ `CONFIRMED`).
2. **Handover $\rightarrow$ Transaction Transition:**
   - Only a `CONFIRMED` Handover allows recording a `TransactionRecord`.
   - `TransactionRecord` locks `finalSaleValue = quantity × finalUnitPrice`.
3. **Pickup Batch Independence:**
   - Lots in a `PickupBatch` maintain independent commercial terms and individual settlements. Handover is recorded per-lot, not per-batch.

---

### 3. IDENTIFIED GAPS IN EXISTING ARCHITECTURE

1. **Weight Variance Arbitration Gap:**
   - When a collector and recycler disagree on weight during handover or after delivery, there is no formal mechanism to contest `handoverWeightKg` without either accepting the discrepancy or abandoning the deal.
2. **Material / Condition Mismatch Handling:**
   - If material delivered does not match the listed category or grade, no workflow exists for renegotiating classification or requesting return.
3. **Partial Acceptance Gap:**
   - Recyclers who wish to accept only part of a lot (e.g., 15 kg accepted, 5 kg contaminated/rejected) currently have no first-class model to settle the accepted portion while releasing/returning the remainder.
4. **Physical Rejection at Handover:**
   - Recycler rejecting a lot at pickup currently only has an informal cancellation option that doesn't track custody, reason, or return custody.
5. **Return Workflow Gap:**
   - No tracking for returned goods (`RETURN_PENDING` $\rightarrow$ `RETURNED`).
6. **Payment Dispute & Correction Gap:**
   - Inaccurately recorded amounts cannot be adjusted without deleting or cancelling transactions, violating immutable audit trail principles.
7. **Traceability Integration:**
   - Journey B Traceability stops at Settlement/Payment and does not reflect disputes or resolution adjustments.

---

### 4. REUSABLE SERVICES & PATTERNS

* **Reference Generation:** `crypto.randomBytes` pattern `DSP-YYYYMM-XXXXX` matching `LOT-`, `QTE-`, `HDO-`, `TXN-`, `BAT-`, `SRC-`.
* **Database Transactions:** `prisma.$transaction(async (tx) => { ... })` ensuring atomic state changes.
* **Audit Logging:** `auditService.logAction` with entity type `disputes`.
* **Notifications:** `notificationService.createNotification` delivering push/in-app notifications to counterparties.
* **Storage & Offline Caching:** Mobile `storage.getItem` / `storage.setItem` via `@react-native-async-storage/async-storage`.
* **Visual Components:** `GlassCard`, `TopAppBar`, `StatusBadge`, `NegotiationTimeline` pattern.
* **Localization Schema:** Centralized `TranslationSchema` in `mobile/src/i18n/config.ts` supporting `en`, `hi`, `mr`, `or`.

---

### 5. EXACT PHASE 7 IMPLEMENTATION PLAN

#### A. Database Schema (`backend/prisma/schema.prisma`):
1. Add `DisputeType` enum:
   `WEIGHT_MISMATCH`, `MATERIAL_MISMATCH`, `CONDITION_MISMATCH`, `PARTIAL_ACCEPTANCE`, `HANDOVER_REJECTION`, `HANDOVER_DISPUTE`, `PAYMENT_DISPUTE`, `CANCELLATION_REQUEST`, `RETURN_REQUEST`, `OTHER`
2. Add `DisputeStatus` enum:
   `OPEN`, `UNDER_REVIEW`, `PARTIALLY_RESOLVED`, `RESOLVED`, `REJECTED`, `CANCELLED`, `RETURN_PENDING`, `RETURNED`
3. Add `DisputeResolutionType` enum:
   `WEIGHT_CORRECTION`, `PRICE_ADJUSTMENT`, `PARTIAL_ACCEPTANCE`, `RETURN_ACCEPTED`, `DEAL_CANCELLED`, `REJECTED_NO_ACTION`, `MUTUAL_AGREEMENT`
4. Add `MarketplaceDispute` model:
   - Primary key, `disputeReference` (`DSP-YYYYMM-XXXXX`), relations to `MaterialLot`, `Quote`, `HandoverRecord`, `TransactionRecord` (optional), `PickupBatch` (optional), `User` (openedBy, resolvedBy).
   - Numerical fields: `disputedEstimatedWeightKg`, `disputedFinalWeightKg`, `disputedQuantityKg`, `disputedAmount`, `resolvedWeightKg`, `resolvedAmount`.
   - Resolution metadata: `resolutionType`, `resolutionNotes`, `resolvedAt`.
5. Add `MarketplaceDisputeEvent` model:
   - `id`, `disputeId`, `actorUserId`, `actorRole`, `eventType`, `previousStatus`, `newStatus`, `note`, `metadata`, `createdAt`.
6. Add `DISPUTED` to `MaterialLotStatus` and `DISPUTED`, `REJECTED` to `HandoverStatus`.

#### B. Backend Services & APIs:
1. `backend/src/services/disputeService.js`:
   - `openDispute`: Ownership verification, deduplication of active disputes for the same entity, server-side derivation of participants.
   - `listDisputes`: Role-scoped filtering (Collector sees own lots/transactions; Recycler sees accepted lots/transactions; Admin sees all).
   - `getDisputeById`: Full details, timeline events, masked counterparty contact info.
   - `respondToDispute`: Counterparty response, counter-proposals (e.g. proposed weight or partial weight).
   - `resolveDispute`: Server-authoritative resolution, weight correction (`authoritative weight × agreed rate`), transaction adjustment, immutable audit recording.
   - `cancelDispute`: Cancellation of dispute or pre-handover deal cancellation.
   - `initiateReturn`: Rejection return flow (`RETURN_PENDING`).
   - `completeReturn`: Server confirmation of return completion (`RETURNED`).
2. `backend/src/controllers/disputeController.js` & `backend/src/routes/disputeRoutes.js`.
3. Update `backend/src/services/lotTraceService.js` to include dispute events in the chronological timeline.

#### C. Mobile Frontend & UX:
1. `mobile/src/services/disputeService.ts`: TypeScript service with offline caching.
2. `mobile/src/screens/collector/CollectorDisputeDetailScreen.tsx`: Dispute details, status badge, evidence, timeline, action buttons (Respond, Accept Resolution, Request Return, Confirm Return, Cancel).
3. `mobile/src/screens/collector/CollectorDisputesScreen.tsx`: List of active/past collector disputes.
4. `mobile/src/screens/recycler/RecyclerDisputesScreen.tsx`: List of disputes involving recycler purchases.
5. `mobile/src/screens/recycler/RecyclerDisputeDetailScreen.tsx`: Recycler detail view with proposal and resolution actions.
6. `mobile/src/screens/admin/AdminDisputesScreen.tsx`: Operational overview for administrative visibility.
7. Entry points: "Report a Problem" modal / button on `CollectorLotDetailScreen`, `CollectorTransactionDetailScreen`, `CollectorHandoverReceiptScreen`, and `RecyclerLotDetailScreen`.
8. Dispute Timeline component displaying chronological events.

#### D. Multilingual Localization:
Add full `disputes` namespace across `en.ts`, `hi.ts`, `mr.ts`, `or.ts`, and `config.ts`.

#### E. Verification & Regression Testing:
1. `backend/tests/verify_marketplace_phase7.js` (at least 35 comprehensive checks).
2. Regression against Phases 1–6 (all 11 existing test suites).
3. Static data audit: Zero prohibited keywords.
4. Mobile TypeScript check: 0 errors.
5. Android release APK compilation.
