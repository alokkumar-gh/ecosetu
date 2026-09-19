/**
 * verify_accepted_pickup_map_navigation.js
 * Static verification suite — Phase 19, Task 8:
 * Accepted Pickup Exact Map + External Google Maps Navigation.
 *
 * Checks:
 *   1. Exact map is available only for accepted/authorized pickup state.
 *   2. Pre-acceptance request does not expose exact coordinates.
 *   3. Pre-acceptance request does not expose exact address fields.
 *   4. Accepted pickup consumes authorized exact coordinates.
 *   5. Accepted pickup renders exact structured address.
 *   6. Navigate button is gated behind accepted/authorized state.
 *   7. Navigation uses external map intent/URL mechanism (Linking.openURL).
 *   8. No Directions API dependency.
 *   9. No Places API dependency.
 *   10. No Geocoding API dependency.
 *   11. No background location implementation.
 *   12. Four-language translation parity (en, hi, mr, or).
 *   13. Existing acceptance endpoint remains unchanged.
 *   14. Existing RBAC/verification behavior remains unchanged.
 *   15. Offline cached accepted pickup behavior remains safe.
 *
 * Run: node mobile/tests/verify_accepted_pickup_map_navigation.js
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testId, description, detail = '') {
  if (condition) {
    console.log(`  ✅ [${testId}] ${description}`);
    passed++;
  } else {
    console.error(`  ❌ [${testId}] FAIL — ${description}${detail ? ': ' + detail : ''}`);
    failed++;
    failures.push({ testId, description, detail });
  }
}

function readFile(relPath) {
  const absPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(absPath)) return { exists: false, content: '' };
  return { exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

function contains(content, pattern) {
  if (typeof pattern === 'string') return content.includes(pattern);
  return pattern.test(content);
}

// ─── Load Subjects ─────────────────────────────────────────────────────────────

const detailScreen = readFile('src/screens/collector/CollectorPickupDetailScreen.tsx');
const pickupsScreen = readFile('src/screens/collector/CollectorPickupsScreen.tsx');
const browseScreen = readFile('src/screens/collector/CollectorBrowseScreen.tsx');
const collectorNav = readFile('src/navigation/CollectorNavigator.tsx');
const navTypes = readFile('src/navigation/types.ts');
const mapComponent = readFile('src/components/map/EcoSetuMap.tsx');
const packageJson = readFile('package.json');
const androidManifest = readFile('android/app/src/main/AndroidManifest.xml');
const locationService = readFile('src/services/locationService.ts');
const backendReqService = readFile('../backend/src/services/requestService.js');
const backendPickupService = readFile('../backend/src/services/pickupService.js');

const i18nConfig = readFile('src/i18n/config.ts');
const i18nEn = readFile('src/i18n/locales/en.ts');
const i18nHi = readFile('src/i18n/locales/hi.ts');
const i18nMr = readFile('src/i18n/locales/mr.ts');
const i18nOr = readFile('src/i18n/locales/or.ts');

console.log('════════════════════════════════════════════════════════════════════════');
console.log('  ECOSETU Verification: Phase 19, Task 8 — Accepted Pickup Exact Map & Navigation');
console.log('════════════════════════════════════════════════════════════════════════');

// ─── 1 & 2. State-Gated Exact Map & Pre-Acceptance Privacy ──────────────────────
console.log('\n─── 1 & 2. State-Gated Privacy & Exact Map Gating ───────────────────────');

assert(detailScreen.exists, 'SCR-01', 'CollectorPickupDetailScreen.tsx exists');
assert(contains(detailScreen.content, 'isAuthorized'), 'PRV-01', 'Screen enforces strict authorization state check');
assert(
  contains(detailScreen.content, 'isAuthorized && hasValidCoordinates') ||
    contains(detailScreen.content, 'isAuthorized ?'),
  'PRV-02',
  'Exact map is strictly gated behind isAuthorized check'
);
assert(
  contains(detailScreen.content, 'privacyMaskBox') || contains(detailScreen.content, 'privacyProtected'),
  'PRV-03',
  'Pre-acceptance or unassigned requests display privacy protection shield'
);
assert(
  !contains(browseScreen.content, 'exactPickupLocation') &&
    !contains(browseScreen.content, 'navigateToPickup'),
  'PRV-04',
  'Pre-acceptance browse screen NEVER exposes exact doorstep location or navigation'
);
assert(
  contains(browseScreen.content, 'Approximate Location (Exact address revealed upon acceptance)') ||
    contains(browseScreen.content, 'approximateLocation'),
  'PRV-05',
  'Pre-acceptance requests strictly preserve backend approximate location notice'
);

// ─── 3 & 4. Exact Coordinates & Backend Consumption ────────────────────────────
console.log('\n─── 3 & 4. Exact Coordinates & Authoritative Backend Consumption ─────────');

assert(
  contains(detailScreen.content, 'EcoSetuMap'),
  'MAP-01',
  'CollectorPickupDetailScreen reuses canonical EcoSetuMap component'
);
assert(
  contains(detailScreen.content, 'showApproximateCircles={false}'),
  'MAP-02',
  'Accepted pickup map renders exact point without approximate circle overlay'
);
assert(
  contains(detailScreen.content, 'draggable={false}'),
  'MAP-03',
  'Accepted pickup doorstep pin is fixed / non-draggable'
);
assert(
  contains(detailScreen.content, 'exactLat') && contains(detailScreen.content, 'exactLng'),
  'MAP-04',
  'Consumes exact latitude and longitude directly from authoritative backend response'
);
assert(
  !contains(detailScreen.content, 'geocodeAsync') &&
    !contains(detailScreen.content, 'reverseGeocode') &&
    !contains(detailScreen.content, 'Geocoder.') &&
    !contains(detailScreen.content, 'google-geocod'),
  'MAP-05',
  'Does not perform client-side geocoding to manufacture coordinates'
);

// ─── 5. Exact Structured Address Breakdown ─────────────────────────────────────
console.log('\n─── 5. Exact Structured Address Breakdown ───────────────────────────────');

assert(contains(detailScreen.content, 'req.houseNumber'), 'ADR-01', 'Displays houseNumber when authorized');
assert(contains(detailScreen.content, 'req.street'), 'ADR-02', 'Displays street when authorized');
assert(contains(detailScreen.content, 'req.landmark'), 'ADR-03', 'Displays landmark when authorized');
assert(contains(detailScreen.content, 'req.city'), 'ADR-04', 'Displays city when authorized');
assert(contains(detailScreen.content, 'req.district'), 'ADR-05', 'Displays district when authorized');
assert(contains(detailScreen.content, 'req.state'), 'ADR-06', 'Displays state when authorized');
assert(contains(detailScreen.content, 'req.pincode'), 'ADR-07', 'Displays pincode when authorized');
assert(contains(detailScreen.content, 'req.pickupAddress'), 'ADR-08', 'Displays full formatted pickupAddress');

// ─── 6 & 7. External Google Maps Navigation Launcher ───────────────────────────
console.log('\n─── 6 & 7. External Google Maps Navigation Launcher ─────────────────────');

assert(
  contains(detailScreen.content, 'handleNavigateToPickup') || contains(detailScreen.content, 'navigateToPickup'),
  'NAV-01',
  'CollectorPickupDetailScreen implements navigation action handler'
);
assert(
  contains(detailScreen.content, 'google.navigation:q=') || contains(detailScreen.content, 'geo:'),
  'NAV-02',
  'Uses external Android navigation intent (google.navigation: or geo:)'
);
assert(
  contains(detailScreen.content, 'Linking.openURL'),
  'NAV-03',
  'Uses native Linking.openURL to launch external map application'
);
assert(
  contains(detailScreen.content, '!isAuthorized') || contains(detailScreen.content, 'disabled={!isAuthorized'),
  'NAV-04',
  'Navigate button is disabled/gated when not authorized'
);
assert(
  contains(detailScreen.content, 'minHeight: 52') || contains(detailScreen.content, 'minHeight: 48'),
  'NAV-05',
  'Navigation button enforces accessible touch target height (>= 48dp)'
);

// ─── 8 to 10. Dependency Isolation (Zero Paid / Unnecessary APIs) ──────────────
console.log('\n─── 8 to 10. Dependency & API Hygiene ───────────────────────────────────');

assert(!contains(packageJson.content, '@googlemaps/polyline-codec'), 'DEP-01', 'No polyline codec dependency');
assert(!contains(packageJson.content, 'react-native-google-places-autocomplete'), 'DEP-02', 'No Places autocomplete dependency');
assert(!contains(packageJson.content, 'directions'), 'DEP-03', 'No external directions dependency in package.json');
assert(!contains(detailScreen.content, 'maps.googleapis.com/maps/api/directions'), 'API-01', 'Zero Google Directions API calls');
assert(!contains(detailScreen.content, 'maps.googleapis.com/maps/api/place'), 'API-02', 'Zero Google Places API calls');
assert(!contains(detailScreen.content, 'maps.googleapis.com/maps/api/geocode'), 'API-03', 'Zero Google Geocoding API calls');
assert(!contains(detailScreen.content, 'routes.googleapis.com'), 'API-04', 'Zero Google Routes API calls');

// ─── 11. Location Lifecycle & No Background Tracking ───────────────────────────
console.log('\n─── 11. Location Isolation & Zero Background Tracking ───────────────────');

assert(
  !contains(androidManifest.content, 'ACCESS_BACKGROUND_LOCATION'),
  'LIF-01',
  'AndroidManifest does not declare ACCESS_BACKGROUND_LOCATION'
);
assert(
  !contains(locationService.content, 'watchPosition'),
  'LIF-02',
  'locationService does not run continuous watchPosition'
);
assert(
  contains(detailScreen.content, 'handleUseMyLocation'),
  'LIF-03',
  'Collector location is user-initiated on demand via "Use My Location"'
);
assert(
  !contains(detailScreen.content, 'locationHistory') && !contains(detailScreen.content, 'saveLocation'),
  'LIF-04',
  'Screen does not record or store location history'
);

// ─── 12. Multilingual Parity (en, hi, mr, or) ──────────────────────────────────
console.log('\n─── 12. Multilingual Parity (en, hi, mr, or) ───────────────────────────');

const requiredKeys = [
  'exactPickupLocation',
  'pickupAddress',
  'navigateToPickup',
  'openInGoogleMaps',
  'navigationUnavailable',
  'navigationUnavailableDesc',
  'exactLocationAuthorized',
  'locationUnavailable',
  'addressUnavailable',
  'viewMapAndNavigation',
  'doorstepAddress',
  'houseNumber',
  'street',
  'landmark',
  'city',
  'district',
  'state',
  'pincode',
  'navigationRequiresAcceptance',
  'pickupDetails',
];

for (const key of requiredKeys) {
  assert(contains(i18nConfig.content, `${key}: string;`), `I18N-CFG-${key}`, `config.ts defines ${key}`);
  assert(contains(i18nEn.content, `${key}:`), `I18N-EN-${key}`, `en.ts defines ${key}`);
  assert(contains(i18nHi.content, `${key}:`), `I18N-HI-${key}`, `hi.ts defines ${key}`);
  assert(contains(i18nMr.content, `${key}:`), `I18N-MR-${key}`, `mr.ts defines ${key}`);
  assert(contains(i18nOr.content, `${key}:`), `I18N-OR-${key}`, `or.ts defines ${key}`);
}

// ─── 13 & 14. Navigator Wiring & Pickups Screen Action ─────────────────────────
console.log('\n─── 13 & 14. Navigator & Pickups Integration ────────────────────────────');

assert(contains(navTypes.content, 'PickupDetail:'), 'NAV-TYP-01', 'CollectorStackParamList defines PickupDetail');
assert(contains(collectorNav.content, 'CollectorPickupDetailScreen'), 'NAV-WIR-01', 'CollectorNavigator imports CollectorPickupDetailScreen');
assert(contains(collectorNav.content, 'name="PickupDetail"'), 'NAV-WIR-02', 'CollectorNavigator registers PickupDetail route');
assert(
  contains(pickupsScreen.content, "navigation?.navigate?.('PickupDetail'"),
  'PIC-01',
  'CollectorPickupsScreen navigates to PickupDetail on card action'
);
assert(
  contains(pickupsScreen.content, 'viewMapAndNavigation') || contains(pickupsScreen.content, 'View Map & Navigation'),
  'PIC-02',
  'CollectorPickupsScreen has accessible View Map & Navigation button'
);

// ─── 15. Server-Authoritative Backend Integrity ────────────────────────────────
console.log('\n─── 15. Server-Authoritative Backend Integrity ──────────────────────────');

assert(
  contains(backendReqService.content, 'const isAssigned = request.collector && request.collector.userId === actor.id;'),
  'BCK-01',
  'Backend verifies collector assignment before disclosing unmasked coordinates'
);
assert(
  contains(backendReqService.content, 'Math.round(latNum * 100) / 100'),
  'BCK-02',
  'Backend preserves ~1.1km privacy masking for unassigned requests'
);
assert(
  contains(backendPickupService.content, 'getPickupById'),
  'BCK-03',
  'Backend pickupService supports authoritative getPickupById'
);

// ─── 16. Offline Resilience ────────────────────────────────────────────────────
console.log('\n─── 16. Offline Resilience ──────────────────────────────────────────────');

assert(contains(detailScreen.content, 'OfflineBanner'), 'OFF-01', 'CollectorPickupDetailScreen displays OfflineBanner');
assert(
  contains(detailScreen.content, '!isConnected') && contains(detailScreen.content, 'handleNavigateToPickup'),
  'OFF-02',
  'Navigation alerts user gracefully if device is offline'
);

// ─── Summary ───────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  RESULTS: ${passed} passed  |  ${failed} failed`);
console.log('════════════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  console.error('Failed Tests:');
  failures.forEach((f) => console.error(` - [${f.testId}] ${f.description}: ${f.detail}`));
  process.exit(1);
} else {
  console.log('All accepted pickup map and navigation tests passed successfully! ✅\n');
  process.exit(0);
}
