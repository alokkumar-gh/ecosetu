/**
 * verify_recycler_facility_map.js
 * Comprehensive verification suite — Phase 19, Task 9:
 * Recycler Facility Map + Verified Recycler Locations
 *
 * Checks:
 *   1. Recycler Directory has List/Map toggle.
 *   2. Existing recycler directory behavior remains intact.
 *   3. Map reuses EcoSetuMap.
 *   4. Only verified/authorized recycler facilities are displayed.
 *   5. Unauthorized recycler states are excluded.
 *   6. Facility markers consume backend-provided coordinates.
 *   7. No coordinate reconstruction.
 *   8. Facility detail displays authorized location data.
 *   9. External Google Maps navigation exists.
 *   10. Navigation is gated by valid facility coordinates.
 *   11. No Directions API.
 *   12. No Places API.
 *   13. No Geocoding API.
 *   14. No background location.
 *   15. No private recycler account data is unnecessarily exposed.
 *   16. Four-language translation parity (en, hi, mr, or).
 *   17. Offline cached recycler directory behavior.
 *   18. Existing collector/recycler RBAC remains unchanged.
 *   19. Existing Google Maps integration remains intact.
 *   20. Existing collector map privacy remains intact.
 *
 * Run: node mobile/tests/verify_recycler_facility_map.js
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

console.log('════════════════════════════════════════════════════════════════════════');
console.log('  ECOSETU Verification: Phase 19, Task 9 — Recycler Facility Map');
console.log('════════════════════════════════════════════════════════════════════════');

// ─── 1. Load Screen & Component Subjects ───────────────────────────────────────
const directoryScreen = readFile('src/screens/collector/CollectorRecyclerDirectoryScreen.tsx');
const facilityDetailScreen = readFile('src/screens/collector/RecyclerFacilityDetailScreen.tsx');
const ecoSetuMap = readFile('src/components/map/EcoSetuMap.tsx');
const collectorNav = readFile('src/navigation/CollectorNavigator.tsx');
const navTypes = readFile('src/navigation/types.ts');
const recyclingSvc = readFile('src/services/recyclingService.js');
const backendRecyclerSvc = readFile('../backend/src/services/recyclerService.js');
const mobilePkg = readFile('package.json');

// ─── 1. Recycler Directory has List / Map Toggle ──────────────────────────────
console.log('\n─── 1. Recycler Directory List / Map Toggle ─────────────────────────────');
assert(directoryScreen.exists, 'DIR-01', 'CollectorRecyclerDirectoryScreen.tsx exists');
assert(contains(directoryScreen.content, "viewMode") && contains(directoryScreen.content, "'LIST'") && contains(directoryScreen.content, "'MAP'"), 'DIR-02', 'Declares viewMode state with LIST and MAP modes');
assert(contains(directoryScreen.content, "listView") && contains(directoryScreen.content, "mapView"), 'DIR-03', 'Uses localized keys for List and Map toggle');
assert(contains(directoryScreen.content, "accessibilityRole=\"button\""), 'DIR-04', 'Toggle buttons declare accessible button role');
assert(contains(directoryScreen.content, "accessibilityState={{ selected:"), 'DIR-05', 'Toggle buttons declare accessibilityState with selected state');
assert(contains(directoryScreen.content, "useState<'LIST' | 'MAP'>('LIST')"), 'DIR-06', 'List view is the default initial view');

// ─── 2. Existing Recycler Directory Behavior Remains Intact ───────────────────
console.log('\n─── 2. Existing Recycler Directory Behavior Intact ──────────────────────');
assert(contains(directoryScreen.content, "EWASTE_CATEGORIES"), 'EXT-01', 'Preserves canonical category filter constants');
assert(contains(directoryScreen.content, "CATEGORY_OPTIONS"), 'EXT-02', 'Preserves category chip options');
assert(contains(directoryScreen.content, "selectedCategory"), 'EXT-03', 'Preserves selected category state');
assert(contains(directoryScreen.content, "searchQuery"), 'EXT-04', 'Preserves client-side search query state');
assert(contains(directoryScreen.content, "filteredRecyclers"), 'EXT-05', 'Computes filtered recyclers based on active search/category filter');
assert(contains(directoryScreen.content, "RecyclerCardSkeleton"), 'EXT-06', 'Preserves shimmer skeletons for loading state');
assert(contains(directoryScreen.content, "EmptyState"), 'EXT-07', 'Preserves comprehensive EmptyState handling');
assert(contains(directoryScreen.content, "RefreshControl"), 'EXT-08', 'Preserves pull-to-refresh mechanism');
assert(contains(directoryScreen.content, "CreateConsignment"), 'EXT-09', 'Preserves consignment handoff navigation');

// ─── 3. Map Reuses EcoSetuMap ──────────────────────────────────────────────────
console.log('\n─── 3. Map Reuses EcoSetuMap ────────────────────────────────────────────');
assert(ecoSetuMap.exists, 'MAP-01', 'EcoSetuMap.tsx exists');
assert(contains(directoryScreen.content, "import { EcoSetuMap"), 'MAP-02', 'CollectorRecyclerDirectoryScreen imports EcoSetuMap');
assert(contains(facilityDetailScreen.content, "import { EcoSetuMap"), 'MAP-03', 'RecyclerFacilityDetailScreen imports EcoSetuMap');
assert(!contains(directoryScreen.content, "MapView") && !contains(directoryScreen.content, "react-native-maps"), 'MAP-04', 'CollectorRecyclerDirectoryScreen avoids direct MapView or react-native-maps imports');
assert(!contains(directoryScreen.content, "Marker"), 'MAP-05', 'CollectorRecyclerDirectoryScreen avoids Marker imports (uses EcoSetuPin)');

// ─── 4. Only Verified / Authorized Recycler Facilities Displayed ──────────────
console.log('\n─── 4. Only Verified / Authorized Recycler Facilities Displayed ─────────');
assert(backendRecyclerSvc.exists, 'AUTH-01', 'backend recyclerService.js exists');
assert(contains(backendRecyclerSvc.content, "status: USER_STATUS.ACTIVE"), 'AUTH-02', 'Backend queries only ACTIVE users');
assert(contains(backendRecyclerSvc.content, "role: ROLES.RECYCLER"), 'AUTH-03', 'Backend queries only RECYCLER role');
assert(contains(directoryScreen.content, "ROLES.INFORMAL_COLLECTOR"), 'AUTH-04', 'Enforces collector access boundary');
assert(contains(directoryScreen.content, "StatusBadge status=\"ACTIVE\""), 'AUTH-05', 'Displays ACTIVE verified status badge');

// ─── 5. Unauthorized Recycler States Excluded ──────────────────────────────────
console.log('\n─── 5. Unauthorized Recycler States Excluded ────────────────────────────');
assert(contains(directoryScreen.content, "isVerificationError"), 'UNAUTH-01', 'Directory handles collector pending verification error state');
assert(contains(directoryScreen.content, "Access Restricted"), 'UNAUTH-02', 'Unauthorized roles receive Access Restricted state');
assert(!contains(backendRecyclerSvc.content, "status: USER_STATUS.PENDING_VERIFICATION"), 'UNAUTH-03', 'Backend does NOT include PENDING_VERIFICATION in public recycler directory');
assert(!contains(backendRecyclerSvc.content, "status: USER_STATUS.SUSPENDED"), 'UNAUTH-04', 'Backend does NOT include SUSPENDED in public recycler directory');

// ─── 6. Facility Markers Consume Backend-Provided Coordinates ─────────────────
console.log('\n─── 6. Facility Markers Consume Backend Coordinates ────────────────────');
assert(contains(backendRecyclerSvc.content, "facilityLat: true"), 'COORD-01', 'Backend selects facilityLat');
assert(contains(backendRecyclerSvc.content, "facilityLng: true"), 'COORD-02', 'Backend selects facilityLng');
assert(contains(backendRecyclerSvc.content, "facilityAddress: true"), 'COORD-03', 'Backend selects facilityAddress');
assert(contains(directoryScreen.content, "r.facilityLat") && contains(directoryScreen.content, "r.facilityLng"), 'COORD-04', 'Directory screen maps backend facilityLat and facilityLng to map pins');
assert(contains(directoryScreen.content, "pins={facilityPins}"), 'COORD-05', 'Passes backend-mapped facilityPins into EcoSetuMap');

// ─── 7. No Coordinate Reconstruction ──────────────────────────────────────────
console.log('\n─── 7. No Coordinate Reconstruction ────────────────────────────────────');
assert(!contains(directoryScreen.content, "fetchCoords") && !contains(directoryScreen.content, "geocodeAddress"), 'NO-REC-01', 'No address geocoding or coordinate derivation in directory screen');
assert(!contains(facilityDetailScreen.content, "fetchCoords") && !contains(facilityDetailScreen.content, "geocodeAddress"), 'NO-REC-02', 'No address geocoding or coordinate derivation in detail screen');
assert(contains(directoryScreen.content, "typeof lat === 'number'") && contains(directoryScreen.content, "lat >= -90"), 'NO-REC-03', 'Directly validates numerical coordinates range');

// ─── 8. Facility Detail Displays Authorized Location Data ─────────────────────
console.log('\n─── 8. Facility Detail Screen ──────────────────────────────────────────');
assert(facilityDetailScreen.exists, 'DET-01', 'RecyclerFacilityDetailScreen.tsx exists');
assert(contains(facilityDetailScreen.content, "facilityName"), 'DET-02', 'Displays facilityName');
assert(contains(facilityDetailScreen.content, "facilityAddress"), 'DET-03', 'Displays facilityAddress');
assert(contains(facilityDetailScreen.content, "acceptedCategories"), 'DET-04', 'Displays acceptedCategories');
assert(contains(facilityDetailScreen.content, "city") && contains(facilityDetailScreen.content, "district") && contains(facilityDetailScreen.content, "state"), 'DET-05', 'Displays structured district/state/pincode from authorized API response');
assert(contains(facilityDetailScreen.content, "EcoSetuMap"), 'DET-06', 'Displays exact facility map location on EcoSetuMap');
assert(contains(facilityDetailScreen.content, "showApproximateCircles={false}"), 'DET-07', 'Facility map uses exact pin without approximate circles');
assert(contains(collectorNav.content, "RecyclerFacilityDetailScreen"), 'DET-08', 'CollectorNavigator registers RecyclerFacilityDetailScreen');
assert(contains(navTypes.content, "RecyclerFacilityDetail"), 'DET-09', 'CollectorStackParamList types RecyclerFacilityDetail screen params');

// ─── 9. External Google Maps Navigation ───────────────────────────────────────
console.log('\n─── 9. External Google Maps Navigation ─────────────────────────────────');
assert(contains(facilityDetailScreen.content, "google.navigation:q="), 'NAV-INT-01', 'Facility detail uses google.navigation:q= Android intent');
assert(contains(facilityDetailScreen.content, "geo:"), 'NAV-INT-02', 'Facility detail uses geo: URI intent');
assert(contains(facilityDetailScreen.content, "https://www.google.com/maps/dir/"), 'NAV-INT-03', 'Facility detail uses web maps fallback URL');
assert(contains(directoryScreen.content, "google.navigation:q=") || contains(directoryScreen.content, "handleNavigateToFacility"), 'NAV-INT-04', 'Directory map popup includes external navigation handler');
assert(!contains(facilityDetailScreen.content, "MapViewDirections"), 'NAV-INT-05', 'No internal turn-by-turn routing inside app');

// ─── 10. Navigation Gated by Valid Coordinates ────────────────────────────────
console.log('\n─── 10. Navigation Gated by Valid Coordinates ──────────────────────────');
assert(contains(facilityDetailScreen.content, "hasValidCoordinates"), 'GATE-01', 'Detail screen gates navigation behind hasValidCoordinates check');
assert(contains(facilityDetailScreen.content, "!hasValidCoordinates && styles.navButtonDisabled"), 'GATE-02', 'Disables navigation button if facility coordinates are invalid or missing');
assert(contains(facilityDetailScreen.content, "disabled={!hasValidCoordinates}"), 'GATE-03', 'Button element disabled prop enforced');

// ─── 11-14. Zero Forbidden SDKs & APIs ────────────────────────────────────────
console.log('\n─── 11-14. Zero Forbidden SDKs, APIs & Tracking ────────────────────────');
assert(!contains(mobilePkg.content, "@react-native-google-maps/directions") && !contains(mobilePkg.content, "react-native-directions"), 'FORBID-01', 'Zero Directions API dependencies in package.json');
assert(!contains(mobilePkg.content, "react-native-google-places-autocomplete") && !contains(mobilePkg.content, "google-places"), 'FORBID-02', 'Zero Places API dependencies in package.json');
assert(!contains(mobilePkg.content, "react-native-geocoder"), 'FORBID-03', 'Zero Geocoding API dependencies in package.json');
assert(!contains(mobilePkg.content, "react-native-background-geolocation"), 'FORBID-04', 'Zero background location tracking library');
assert(!contains(directoryScreen.content, "watchPosition") && !contains(facilityDetailScreen.content, "watchPosition"), 'FORBID-05', 'Zero background location watch listeners');
assert(!contains(directoryScreen.content, "react-native-tts") && !contains(facilityDetailScreen.content, "react-native-tts"), 'FORBID-06', 'Zero voice/TTS dependencies');

// ─── 15. Zero Private Recycler Data Unnecessarily Exposed ─────────────────────
console.log('\n─── 15. Zero Private Recycler Data Exposed ─────────────────────────────');
assert(!contains(directoryScreen.content, "passwordHash") && !contains(facilityDetailScreen.content, "passwordHash"), 'PRIV-01', 'Zero passwordHash field references');
assert(!contains(directoryScreen.content, "licenseDocumentUrl") && !contains(facilityDetailScreen.content, "licenseDocumentUrl"), 'PRIV-02', 'Zero internal licenseDocumentUrl exposed');
assert(!contains(backendRecyclerSvc.content, "passwordHash: true"), 'PRIV-03', 'Backend never selects passwordHash');

// ─── 16. Four-Language Translation Parity ─────────────────────────────────────
console.log('\n─── 16. Four-Language Translation Parity ────────────────────────────────');
const i18nConfig = readFile('src/i18n/config.ts');
const enLocale = readFile('src/i18n/locales/en.ts');
const hiLocale = readFile('src/i18n/locales/hi.ts');
const mrLocale = readFile('src/i18n/locales/mr.ts');
const orLocale = readFile('src/i18n/locales/or.ts');

const requiredKeys = [
  'listView',
  'mapView',
  'verifiedFacility',
  'facilityLocation',
  'navigateToFacility',
  'openInGoogleMaps',
  'navigationUnavailable',
  'navigationUnavailableDesc',
  'facilityDetails',
  'noFacilityLocation',
  'offlineFacilityData',
  'address',
  'city',
  'district',
  'state',
  'pincode',
  'consignmentsProcessed',
];

requiredKeys.forEach((k) => {
  assert(contains(i18nConfig.content, `${k}: string;`), `I18N-CFG-${k}`, `config.ts defines collector.recyclers.${k}`);
  assert(contains(enLocale.content, `${k}:`), `I18N-EN-${k}`, `en.ts contains ${k}`);
  assert(contains(hiLocale.content, `${k}:`), `I18N-HI-${k}`, `hi.ts contains ${k}`);
  assert(contains(mrLocale.content, `${k}:`), `I18N-MR-${k}`, `mr.ts contains ${k}`);
  assert(contains(orLocale.content, `${k}:`), `I18N-OR-${k}`, `or.ts contains ${k}`);
});

// ─── 17. Offline Cached Recycler Directory Behavior ───────────────────────────
console.log('\n─── 17. Offline Cached Directory Behavior ──────────────────────────────');
assert(contains(recyclingSvc.content, "@ecosetu_collector_recyclers"), 'OFF-CACHE-01', 'Recycling service caches data under @ecosetu_collector_recyclers');
assert(contains(directoryScreen.content, "OfflineBanner"), 'OFF-CACHE-02', 'Directory renders OfflineBanner');
assert(contains(facilityDetailScreen.content, "OfflineBanner"), 'OFF-CACHE-03', 'Facility detail renders OfflineBanner');
assert(contains(directoryScreen.content, "fromCache"), 'OFF-CACHE-04', 'Directory tracks fromCache state');
assert(contains(directoryScreen.content, "isOffline={!isConnected}"), 'OFF-CACHE-05', 'EcoSetuMap receives isOffline prop');

// ─── 18. Existing Collector / Recycler RBAC Remains Unchanged ─────────────────
console.log('\n─── 18. Collector / Recycler RBAC Intact ───────────────────────────────');
assert(contains(directoryScreen.content, "user?.role === ROLES.INFORMAL_COLLECTOR"), 'RBAC-01', 'Preserves INFORMAL_COLLECTOR check');
assert(contains(collectorNav.content, "name=\"CollectorConsign\""), 'RBAC-02', 'Preserves CollectorConsign tab in collector navigator');
assert(contains(collectorNav.content, "name=\"RecyclerFacilityDetail\""), 'RBAC-03', 'Collector navigator exposes RecyclerFacilityDetail');

// ─── 19. Existing Google Maps Integration Remains Intact ──────────────────────
console.log('\n─── 19. Google Maps Integration Intact ─────────────────────────────────');
const androidManifest = readFile('android/app/src/main/AndroidManifest.xml');
assert(contains(androidManifest.content, "com.google.android.geo.API_KEY"), 'GMAP-01', 'AndroidManifest.xml retains com.google.android.geo.API_KEY metadata');
assert(contains(ecoSetuMap.content, "PROVIDER_GOOGLE"), 'GMAP-02', 'EcoSetuMap retains PROVIDER_GOOGLE configuration');

// ─── 20. Existing Collector Map Privacy Remains Intact ────────────────────────
console.log('\n─── 20. Collector Map Privacy Intact ───────────────────────────────────');
const browseScr = readFile('src/screens/collector/CollectorBrowseScreen.tsx');
assert(contains(browseScr.content, "privacyProtected") && contains(browseScr.content, "approximatePickupArea"), 'PRIV-COLL-01', 'CollectorBrowseScreen preserves approximate location zone for unassigned requests');
assert(!contains(browseScr.content, "exactDoorstep"), 'PRIV-COLL-02', 'Browse screen does not reveal exact doorstep before acceptance');

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  RESULT: ${passed} passed, ${failed} failed`);
console.log('════════════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  console.error('Failed checks:');
  failures.forEach((f) => console.error(` - [${f.testId}] ${f.description}: ${f.detail}`));
  process.exit(1);
} else {
  console.log('All Recycler Facility Map verification checks passed successfully!');
  process.exit(0);
}
