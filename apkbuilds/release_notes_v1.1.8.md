### EcoSetu v1.1.8 Release Notes — Collector Map Visibility & Realtime Pickup Sync

#### Highlights:
- **Collector Map Live Pickup Visibility**:
  - Restored geographic pins on Collector **Browse Map** by returning privacy-masked GPS coordinates (`pickupLat`, `pickupLng` rounded to 2 decimal places / ~1.1km neighborhood level).
  - Preserved citizen privacy: exact GPS coordinates, location accuracy, and direct contact details remain strictly hidden until the citizen accepts the collector's offer.
  - Calculated Haversine distance (`distanceKm`) between collector's location and request location for immediate proximity badges.
  - Broadened backend geographic filtering to prevent narrow radius locks (defaulting to 50km with district and state fallbacks).
- **Assigned Pickups Screen & Dynamic Workload Synchronization**:
  - Fixed dashboard navigation miswiring: clicking "Browse Map →" routes directly to `CollectorBrowse` in `MAP` view (`{ initialView: 'MAP' }`), while "Pending Pickups" routes to `CollectorPickups`.
  - Added React Navigation `useFocusEffect` to both `CollectorBrowseScreen` and `CollectorPickupsScreen` for authoritative server refresh whenever the screen becomes active.
  - Integrated push notification / realtime listener in `collectorSyncService` for `OFFER_ACCEPTED`, `REQUEST_ACCEPTED`, `PICKUP_ASSIGNED`, and `PICKUP_SCHEDULED`, updating the assigned workload without requiring an app restart.
  - Handled the complete Prisma pickup lifecycle (`SCHEDULED` -> `IN_PROGRESS` -> `COMPLETED`) with active status filtering excluding terminal states.
- **Pristine SIH Demo Database Integrity**:
  - 100% zero-leak automated regression testing executed against live backend and database.
  - Clean state verified: all user accounts and collector verification profiles intact.

#### Artifacts:
- `EcoSetu-v1.1.8-release.apk` (VersionCode: 18, VersionName: 1.1.8)
- `app-release.apk`
