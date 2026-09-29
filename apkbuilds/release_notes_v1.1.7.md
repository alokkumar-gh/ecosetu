### EcoSetu v1.1.7 Release Notes — SIH Demo Edition

#### Highlights:
- **Critical Pickup-Request & Collector Delivery Fixes**:
  - Fixed request delivery from Citizen to eligible Collectors: removed narrow 5km restriction, expanded default search radius to 50km with matching city/district fallbacks.
  - Eliminated hardcoded Mumbai coordinates when manual addresses are submitted without GPS fix.
- **End-to-End E-Waste Photo Pipeline & Streaming**:
  - Resolved `AuthorizedImage` double-URL concatenation (`/api/v1/api/v1/...`) preventing photos from loading.
  - Upgraded image upload to dedicated multipart client with 130s timeout and strict server storage persistence.
  - Streamed high-resolution photos securely to both Citizens and eligible Collectors with role-based authorization.
- **Collector Bidding & Live Offer Workflow**:
  - Restored full bidding lifecycle: Collectors can submit (`OFFER SUBMITTED · ₹X`) and edit offers without duplicates.
  - Maintained persistent visibility of "Offers Received" for Citizens upon offer acceptance with clear `Accepted` and `Declined` badges.
  - Normalized Collector profile and name metadata for immediate display on accepted requests.
  - Real-time sync deduplication prioritizing authoritative server responses over skeleton push notifications.
- **Pristine SIH Demo Database State**:
  - Reusable transaction-safe database cleanup script (`backend/scripts/cleanup-sih-demo-data.js`) with pre-cleanup backup.
  - 100% of User accounts (Citizens, Collectors, Recyclers, Admins) and verification profiles preserved.
  - All test/stale requests and pickups reset for a clean, end-to-end live hackathon demonstration.

#### Artifacts:
- `EcoSetu-v1.1.7-release.apk` (VersionCode: 17, VersionName: 1.1.7)
- `app-release.apk`
