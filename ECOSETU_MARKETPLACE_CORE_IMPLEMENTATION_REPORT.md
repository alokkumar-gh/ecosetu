# EcoSetu Marketplace Core Foundation Implementation Report
**SIH 26229 | Business-First Economic Marketplace — Implementation Task #1**
**Canonical Git Baseline:** `5eb21425b0aa7affe1fa11e6b5945dd3482625d7`

---

## 1. Existing Marketplace Architecture Discovered

During our audit of the canonical GitHub baseline, we identified that EcoSetu already had strong relational schemas and service abstractions for material handling and quotation, but lacked the bidirectional marketplace linkage between informal collectors and formal recyclers:

1. **Material Lots (`MaterialLot`, `MaterialItem`, `MaterialLotPhoto`):**
   - Collectors could create lots with items, weights, and photos.
   - Statuses supported: `DRAFT`, `OPEN`, `QUOTED`, `ACCEPTED`, `IN_TRANSIT`, `DELIVERED`, `PROCESSED`, `CANCELLED`.
   - *Previous Gap:* Recyclers were blocked with `403 Forbidden` from listing or viewing available lots on `GET /api/v1/material-lots`.

2. **Commercial Quotes (`Quote`):**
   - Recyclers could quote a lot (`quotedUnitPrice`, `quotedQuantity`, `quotedTotal`, `validUntil`, `status`).
   - Quote statuses supported: `SENT`, `VIEWED`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED`.
   - Quote acceptance automatically locked the lot (`ACCEPTED`) and auto-cancelled competing quotes with `COMPETING_QUOTE_ACCEPTED`.
   - *Previous Gap:* No endpoint existed for two-sided counter-offers / negotiations (`POST /api/v1/quotes/:id/counter`).

3. **Recycler Profiles & Discovery (`RecyclerProfile`):**
   - Recycler profile holds authorized categories, facility address, and contact privacy boundaries (SIH-RECY-006).

---

## 2. Existing Components Reused

Without introducing duplicate UI systems or changing the global visual language:
- `mobile/src/components/eco/EcoSetuBackground.tsx` & `mobile/src/components/glass/*` (`GlassCard`, `GlassAvatar`).
- `mobile/src/screens/collector/CollectorQuotesScreen.tsx` — Extended with factual sort controls and counter-offer negotiation modal.
- `mobile/src/screens/recycler/RecyclerCreateQuoteScreen.tsx` — Reused directly for recycler offer submission.
- `mobile/src/screens/recycler/RecyclerDashboardScreen.tsx` — Purged hardcoded dummy consignments, bound dynamically to live backend APIs, and added a Sourcing Marketplace discovery card.

---

## 3. Existing APIs Reused

- `GET /api/v1/material-lots` — Reused for collector lot management and recycler marketplace discovery.
- `GET /api/v1/material-lots/:id` — Reused for lot detail inspection with role-based privacy masking.
- `GET /api/v1/material-lots/:id/quotes` — Reused for collector quotation overview.
- `POST /api/v1/quotes` — Reused for recycler offer creation.
- `POST /api/v1/quotes/:id/accept` — Reused for server-authoritative quote acceptance & lot locking.
- `POST /api/v1/quotes/:id/reject` — Reused for collector quote rejection.
- `POST /api/v1/quotes/:id/cancel` — Reused for recycler quote cancellation.
- `GET /api/v1/recyclers/profile` — Reused for dynamic recycler dashboard profile loading.
- `GET /api/v1/consignments` — Reused for dynamic recycler incoming consignments.

---

## 4. APIs Changed / Added

1. **`GET /api/v1/material-lots`:**
   - Updated authorization middleware and `materialLotService.listMaterialLots` to allow `ROLES.RECYCLER`.
   - Automatically scopes recycler queries to `status: { in: ['OPEN', 'QUOTED'] }` (excluding `DRAFT`).
   - Implemented contact privacy masking (omits collector phone/email for recycler requests).
   - Injected real-time offer count `_count: { select: { quotes: true } }`.

2. **`GET /api/v1/material-lots/:id`:**
   - Allowed `ROLES.RECYCLER` to view non-draft lots.
   - Enforced collector phone/email masking for recycler requests.

3. **`POST /api/v1/quotes/:id/counter` (NEW ENDPOINT):**
   - Added `counterQuote` validator, controller, service, and route.
   - Allows Collector or Recycler to propose a revised rate (`counterUnitPrice`, `notes`).
   - Preserves historical trail in `notes` (`[Collector Counter @ ₹.../kg...]` / `[Recycler Counter @ ₹.../kg...]`).
   - Recalculates total mathematical amount and emits audit logs (`QUOTE_COUNTERED`) and push notifications.

---

## 5. Database Changes

- **Zero schema alterations / zero migrations required:** The existing Prisma schema (`Quote`, `MaterialLot`, `AuditLog`, `Notification`) completely supported the negotiation and discovery model.

---

## 6. Collector Marketplace Flow

1. Collector lists material lot via `POST /api/v1/material-lots` with status `OPEN`.
2. As recyclers discover and submit offers, the lot transitions to `QUOTED`.
3. Collector navigates to `CollectorQuotesScreen` for the lot:
   - Sees factual sorting chips: **Highest Rate**, **Pickup Available**, **Newest**.
   - Inspects real buyer details (facility name, verified status, offered rate, mathematical total, validity).
   - Can propose a **Counter-Offer** with desired rate and negotiation notes.
   - Accepts the winning quote $\rightarrow$ transitions lot to `ACCEPTED` and automatically cancels competing quotes.

---

## 7. Recycler Marketplace Flow

1. Recycler enters **RecyclerMarketplaceScreen** from the Dashboard Sourcing Card.
2. Discovers real open lots (`OPEN`, `QUOTED`) filtered by category, subcategory, condition, weight.
3. Lot card displays factual lot details: weight, condition, location, current offer count, listed date.
4. Recycler clicks **Make Offer** $\rightarrow$ opens `RecyclerCreateQuoteScreen`.
5. Enters offered unit price (₹/kg), quantity, validity period, and delivery notes.
6. Submits quote $\rightarrow$ quote created with status `SENT`, notifying the collector.

---

## 8. Offer & Negotiation Flow

```
[ Collector: LIST LOT (OPEN) ]
              │
              ├───> [ Recycler 1: SUBMIT QUOTE (₹220/kg) ] ───> [ Lot Status: QUOTED ]
              │
              ├───> [ Recycler 2: SUBMIT QUOTE (₹240/kg) ] ───> [ Multiple Offers Active ]
              │
              ▼
[ Collector Compares Quotes (Factual Sort: Highest Rate, Pickup, Newest) ]
              │
              ├───> [ Propose Counter-Offer: ₹260/kg ] ───> [ Notes trail updated ]
              │                                                     │
              │                                                     ▼
              │                                      [ Recycler Revises: ₹250/kg ]
              │                                                     │
              ▼                                                     ▼
[ Collector: ACCEPT QUOTE (Recycler 1 @ ₹250/kg) ]
              │
              ├───> [ Winning Quote Status: ACCEPTED ]
              ├───> [ Lot Status: ACCEPTED (Commercially Locked) ]
              └───> [ Competing Quote (Recycler 2): CANCELLED (COMPETING_QUOTE_ACCEPTED) ]
```

---

## 9. Authorization & Privacy Behavior

- **Contact Privacy (SIH-RECY-006):** Prior to quote acceptance, collectors' personal phone numbers and emails are masked/omitted from recycler responses (`listMaterialLots`, `getMaterialLotById`).
- **Recycler Eligibility:** Only active, authorized/provisional recyclers can issue quotes. Unauthorized, pending, or suspended recyclers are blocked with `403 Forbidden`.
- **Tenancy Isolation:** Collectors can only view/accept quotes on their own lots. Recyclers can only counter/cancel their own quotes.

---

## 10. Empty-State Behavior

- **Strictly Honest:** Zero mock listings, zero fake buyer facilities (such as "GreenEarth" or "EcoMetals"), zero fake prices, and zero fake CPCB numbers are generated.
- When 0 lots exist in a category or service area, the UI displays an honest message:
  *"No material lots currently available in your service area. Check back soon or reset filters."*

---

## 11. Offline Behavior

- Offline collectors and recyclers can view cached lots, cached quotes, and cached profiles.
- Commercial commitments (Quote Creation, Counter-Offers, Quote Acceptance) remain strictly **server-authoritative / online-only** to ensure atomic consistency across competing parties.

---

## 12. Localization Changes

- UI strings for sorting chips, counter-offer modals, rate inputs, negotiation notes, and marketplace discovery were wired into the vernacular i18n system with fallback protection across English (`en`), Hindi (`hi`), Marathi (`mr`), and Odia (`or`).

---

## 13. Tests Executed

1. `backend/tests/verify_marketplace_core.js` (NEW comprehensive suite):
   - Collector lot creation (OPEN & DRAFT).
   - Recycler discovery (OPEN/QUOTED inclusion, DRAFT exclusion).
   - Contact privacy enforcement (phone/email masked).
   - Recycler 1 offer submission.
   - Recycler 2 competing offer submission.
   - Collector multi-offer view.
   - Collector counter-offer submission & note trail preservation.
   - Recycler revision / negotiation response.
   - Quote acceptance, commercial lot locking, competing quote auto-cancellation.
   - Unauthorized recycler rejection.
   - Honest empty state verification.
2. `backend/tests/verify_material_lots.js` (20 verification checks).
3. `backend/tests/verify_quotes.js` (31 verification checks).
4. `mobile` TypeScript compiler validation (`npx tsc --noEmit`).

---

## 14. Test Results

| Test Suite | Total Checks | Status |
| :--- | :--- | :--- |
| `verify_marketplace_core.js` | 12 Phases | **PASS (100%)** |
| `verify_material_lots.js` | 20 Checks | **PASS (100%)** |
| `verify_quotes.js` | 31 Checks | **PASS (100%)** |
| `npx tsc --noEmit` (mobile) | Strict Typecheck | **PASS (0 errors)** |

---

## 15. TypeScript Result

```
> mobile@1.0.0 typecheck
> npx tsc --noEmit

Exit code: 0 (Zero errors)
```

---

## 16. Files Changed

### Backend:
- [materialLotRoutes.js](file:///e:/EcoSetu/backend/src/routes/materialLotRoutes.js) — Authorized `ROLES.RECYCLER` for lot listing & viewing.
- [materialLotService.js](file:///e:/EcoSetu/backend/src/services/materialLotService.js) — Implemented recycler lot discovery, status filtering, offer count injection, and contact privacy masking.
- [quoteRoutes.js](file:///e:/EcoSetu/backend/src/routes/quoteRoutes.js) — Added `POST /api/v1/quotes/:id/counter` route.
- [quoteValidators.js](file:///e:/EcoSetu/backend/src/validators/quoteValidators.js) — Added `counterQuote` validator schema.
- [quoteController.js](file:///e:/EcoSetu/backend/src/controllers/quoteController.js) — Added `counterQuote` handler.
- [quoteService.js](file:///e:/EcoSetu/backend/src/services/quoteService.js) — Added `counterQuote` negotiation service logic.
- [verify_marketplace_core.js](file:///e:/EcoSetu/backend/tests/verify_marketplace_core.js) — Automated test suite.

### Mobile:
- [quoteService.ts](file:///e:/EcoSetu/mobile/src/services/quoteService.ts) — Added `counterQuote` API method.
- [CollectorQuotesScreen.tsx](file:///e:/EcoSetu/mobile/src/screens/collector/CollectorQuotesScreen.tsx) — Added factual sort controls, counter-offer button, rate calculator, and negotiation modal.
- [RecyclerMarketplaceScreen.tsx](file:///e:/EcoSetu/mobile/src/screens/recycler/RecyclerMarketplaceScreen.tsx) — Created marketplace sourcing discovery screen.
- [RecyclerDashboardScreen.tsx](file:///e:/EcoSetu/mobile/src/screens/recycler/RecyclerDashboardScreen.tsx) — Purged dummy consignments, wired live API data, added marketplace sourcing card.
- [RecyclerNavigator.tsx](file:///e:/EcoSetu/mobile/src/navigation/RecyclerNavigator.tsx) — Registered `RecyclerMarketplace` screen.
- [types.ts](file:///e:/EcoSetu/mobile/src/navigation/types.ts) — Added `RecyclerMarketplace` navigation route type.

---

## 17. Remaining Marketplace Gaps (For Subsequent Phases)

1. **Multi-round Counter History UI Component:** Currently, negotiation history is appended to `notes` and recorded in `AuditLog`. In Phase 2, a dedicated timeline chat/negotiation thread bubble component can render individual back-and-forth rounds.
2. **GPS Distance Calculation on Live Handsets:** Distance sorting currently relies on service area / city matching when GPS coordinates are null.
3. **Escrow / Formal Payment Settlement (Implementation Task #2):** Quote acceptance sets the commercial agreement basis; payment and digital invoice generation will be connected during Handover & Settlement integration.
