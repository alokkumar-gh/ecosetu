### EcoSetu v1.1.5 Release Notes

#### Highlights:
- **Collector Complete Pickup Dialog Fix**: Fixed the dual-button flex overflow bug where the Cancel button occupied 100% width and pushed the Confirm CTA offscreen. Replaced with a single prominent full-width CTA: `✓ Complete Pickup ({weight} kg)` with clean modal dismissal.
- **Collector Price Offer / Payout Transparency**:
  - Added direct **Agreed Doorstep Payout** (₹) display across Pickup cards, Pickup Details screen, and Dashboard Pending Pickups.
  - Added dedicated **Offers (Bids)** tab in My Pickups with live tracking of pending, accepted, and counter offers.
  - Quick action links to give, edit, and negotiate price offers on open collection requests.
- **Backend Collector Offer & Pickup Queries**: Enhanced `listPickups`, `getPickupById`, and `listCollectorOffers` with authenticated offer data, item relations, and sanitized citizen details.

#### Artifacts:
- `EcoSetu-v1.1.5-release.apk`
- `app-release.apk`
