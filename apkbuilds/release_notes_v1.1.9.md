### EcoSetu v1.1.9 Release Notes — Digital Handover Dark Glass Redesign, Recycler Bidding & Quotation Isolation

#### Highlights:
- **Collector Portal — Digital Handover UI Unification**:
  - Redesigned `CollectorHandoverScreen.tsx` from scratch to strictly follow the ECOSETU dark glass aesthetic, replacing disparate light-mode components with native glowing glassmorphic cards and typography.
  - Consignment Summary card displaying Consignment ID, Created date, Delivery status, Lot ID, Item count, and Verified weight badges.
  - Recycler Profile card featuring user identity, organization details, role badges, and warehouse location.
  - Multi-mode Handover Verification:
    - Interactive OTP verification mode with styled OTP code input & Instant Verify action.
    - QR Code camera simulation frame with animated glowing scanline & flash toggle.
    - Recycler Authorized PIN mode.
  - Material Items breakdown with lot badges, category tags, and verified weights.
  - Comprehensive action bar with "Confirm Handover" and "Report Issue" workflows.

- **Recycler Portal — Bid Persistence & Live Inline Edit**:
  - Fixed `materialLotService.js` marketplace query so lots in `QUOTED` status remain visible to the Recycler who quoted them instead of disappearing from the marketplace.
  - Dynamically attached `myOffer` payload (`offeredPricePerKg`, `totalOfferAmount`, `status`, `notes`, `createdAt`) for the authenticated recycler.
  - Added React Navigation `useFocusEffect` across `RecyclerMarketplaceScreen`, `RecyclerMarketScreen`, and `RecyclerLotDetailScreen` for live server updates upon returning to the screen.
  - Enhanced `MaterialLotCard` with an eye-catching "OFFER SUBMITTED" banner showing the recycler's active bid per kg and total amount, alongside an immediate `[ EDIT OFFER ]` action triggering `quoteService.counterQuote`.

- **Quotation & Bidding — Language Lock & Financial Compliance**:
  - Solved inadvertent vernacular translation bugs on critical monetary/quotation figures.
  - Implemented `<QuotationLanguageScope>` provider in `src/i18n` locking the locale context to English (`en`) for bidding and quotation screens while preserving multilingual vernacular features across citizen and onboarding workflows.
  - Added `useQuotationI18n()` hook for strictly controlled translation resolution.
  - Applied to `CollectorQuotesScreen.tsx` and `RecyclerCreateQuoteScreen.tsx`.

- **Pristine SIH Demo Database Integrity**:
  - Zero-mutation read-only forensic inspection completed for database state.
  - Confirmed 1 Collection Request, 1 Pickup, and 1 Pickup Offer represent a genuine, completed end-to-end demo transaction between `akalokkumarsahu23` (Citizen) and `rajeshsenapati2005` (Collector) at terminal states (`PICKED_UP`, `COMPLETED`, `ACCEPTED`).
  - Strict compliance maintained: no automated deletions, no fake data seeded, no test records injected.

#### Artifacts:
- `EcoSetu-v1.1.9-release.apk` (VersionCode: 19, VersionName: 1.1.9, Size: ~57.85 MB)
  - **SHA-256**: `9B0C12689F1BC1328BBE226E8283A70CBA0979CF7A58A50BDC98458BACB057BB`
- `app-release.apk` (Universal release mirror)
