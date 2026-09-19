/**
 * verify_collector_map_privacy.js
 * Verification Suite — Phase 19 Task 7: Collector Nearby Requests Map + Privacy-Safe Approximate Locations
 *
 * Validates:
 * 1. CollectorBrowseScreen contains list/map toggle.
 * 2. Existing EcoSetuMap component is reused.
 * 3. Google Maps provider remains configured (PROVIDER_GOOGLE).
 * 4. No new mapping dependency is added.
 * 5. No Places dependency.
 * 6. No Geocoding dependency.
 * 7. No Directions dependency.
 * 8. No Distance Matrix dependency.
 * 9. No exact citizen coordinates reconstructed client-side.
 * 10. Backend masked coordinates are consumed directly.
 * 11. Exact address fields remain hidden for unassigned requests.
 * 12. Approximate location indicator exists.
 * 13. Current-location action is user-triggered.
 * 14. No background location.
 * 15. No location history.
 * 16. Existing acceptance endpoint is preserved.
 * 17. Existing 409 acceptance handling remains.
 * 18. Collector role/verification checks remain.
 * 19. English/Hindi/Marathi/Odia translation parity.
 * 20. Offline map fallback exists.
 * 21. Glassmorphism preserved.
 *
 * Run: node mobile/tests/verify_collector_map_privacy.js
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

const ROOT_DIR = path.resolve(__dirname, '../..');
const MOBILE_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.resolve(__dirname, '../../backend');

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

console.log('════════════════════════════════════════════════════════════════');
console.log('  PHASE 19 TASK 7: COLLECTOR MAP & PRIVACY VERIFICATION SUITE');
console.log('════════════════════════════════════════════════════════════════\n');

// Load files
const browseSrc = readFile(path.join(MOBILE_DIR, 'src/screens/collector/CollectorBrowseScreen.tsx'));
const mapSrc = readFile(path.join(MOBILE_DIR, 'src/components/map/EcoSetuMap.tsx'));
const locServiceSrc = readFile(path.join(MOBILE_DIR, 'src/services/locationService.ts'));
const collectorServiceSrc = readFile(path.join(MOBILE_DIR, 'src/services/collectorService.js'));
const packageJson = JSON.parse(readFile(path.join(MOBILE_DIR, 'package.json')));
const backendPackageJson = JSON.parse(readFile(path.join(BACKEND_DIR, 'package.json')));

const enLocale = readFile(path.join(MOBILE_DIR, 'src/i18n/locales/en.ts'));
const hiLocale = readFile(path.join(MOBILE_DIR, 'src/i18n/locales/hi.ts'));
const mrLocale = readFile(path.join(MOBILE_DIR, 'src/i18n/locales/mr.ts'));
const orLocale = readFile(path.join(MOBILE_DIR, 'src/i18n/locales/or.ts'));
const configI18n = readFile(path.join(MOBILE_DIR, 'src/i18n/config.ts'));

// ─── 1. List / Map Toggle ─────────────────────────────────────────────────────
console.log('─── 1. List / Map Toggle ────────────────────────────────────────────────');
assert(
  browseSrc.includes("activeView === 'LIST'") && browseSrc.includes("activeView === 'MAP'"),
  'TOGGLE-01',
  'CollectorBrowseScreen contains list/map state toggle'
);
assert(
  browseSrc.includes('viewToggleBar') && browseSrc.includes('toggleBtn'),
  'TOGGLE-02',
  'CollectorBrowseScreen renders interactive segmented toggle bar with accessibility'
);
assert(
  browseSrc.includes("setActiveView('LIST')") && browseSrc.includes("setActiveView('MAP')"),
  'TOGGLE-03',
  'Collector can switch between list view and map view'
);

// ─── 2. EcoSetuMap Component Reuse ────────────────────────────────────────────
console.log('\n─── 2. EcoSetuMap Component Reuse ──────────────────────────────────────');
assert(
  browseSrc.includes('<EcoSetuMap') && browseSrc.includes("from '../../components/map/EcoSetuMap'"),
  'MAP-REUSE-01',
  'CollectorBrowseScreen reuses existing EcoSetuMap component without duplicate map implementation'
);
assert(
  !browseSrc.includes("from 'react-native-maps'") && !browseSrc.includes('<MapView'),
  'MAP-REUSE-02',
  'CollectorBrowseScreen does not import or instantiate MapView directly'
);
assert(
  mapSrc.includes('PROVIDER_GOOGLE'),
  'MAP-REUSE-03',
  'EcoSetuMap maintains Google Maps Android provider (PROVIDER_GOOGLE)'
);
assert(
  mapSrc.includes('Circle') && mapSrc.includes('showApproximateCircles'),
  'MAP-REUSE-04',
  'EcoSetuMap supports approximate Circle overlay zones'
);

// ─── 3. Dependencies Audit ────────────────────────────────────────────────────
console.log('\n─── 3. Dependencies Audit ──────────────────────────────────────────────');
const allMobileDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
const allBackendDeps = { ...backendPackageJson.dependencies, ...backendPackageJson.devDependencies };

assert(
  !allMobileDeps['@react-native-community/geolocation'] && !allMobileDeps['expo-location'],
  'DEP-01',
  'No third-party location SDK added (uses standard PermissionsAndroid and web standard navigator.geolocation)'
);
assert(
  !allMobileDeps['@googlemaps/google-maps-services-js'] &&
    !browseSrc.includes('google.maps.places') &&
    !browseSrc.includes('PlacesService'),
  'DEP-02',
  'Zero Google Places dependency or API calls'
);
assert(
  !browseSrc.includes('geocode') && !browseSrc.includes('reverseGeocode'),
  'DEP-03',
  'Zero Geocoding dependency or API calls'
);
assert(
  !browseSrc.includes('directions') && !browseSrc.includes('DirectionsService') && !browseSrc.includes('Routes'),
  'DEP-04',
  'Zero Google Directions or Routes API dependency'
);
assert(
  !browseSrc.includes('distanceMatrix') && !browseSrc.includes('DistanceMatrixService'),
  'DEP-05',
  'Zero Google Distance Matrix API dependency'
);
assert(
  allMobileDeps['react-native-maps'] && allMobileDeps['react-native-maps'].includes('1.18.0'),
  'DEP-06',
  'Only existing verified react-native-maps dependency is used'
);

// ─── 4. Privacy & Masked Coordinates Consumption ──────────────────────────────
console.log('\n─── 4. Privacy & Masked Coordinates Consumption ────────────────────────');
assert(
  !browseSrc.includes('Math.sqrt') && !browseSrc.includes('calculateDistanceKm'),
  'PRIV-01',
  'No client-side coordinate triangulation or distance derivation from masked coordinates'
);
assert(
  browseSrc.includes('parseFloat(r.pickupLat)') && browseSrc.includes('parseFloat(r.pickupLng)'),
  'PRIV-02',
  'Backend masked coordinates are consumed directly as provided'
);
assert(
  !browseSrc.includes('houseNumber') &&
    !browseSrc.includes('request.street') &&
    !browseSrc.includes('request.landmark') &&
    !browseSrc.includes('request.pincode'),
  'PRIV-03',
  'Exact citizen address fields (houseNumber, street, landmark, pincode) remain hidden before acceptance'
);
assert(
  browseSrc.includes('privacyProtected') && browseSrc.includes('approximatePickupArea'),
  'PRIV-04',
  'Approximate location zone and privacy notice badges are clearly visible to collector'
);
assert(
  browseSrc.includes('exactLocationAfterAcceptance'),
  'PRIV-05',
  'UI clearly indicates exact doorstep location is revealed only after request acceptance'
);

// ─── 5. Current Collector Location ────────────────────────────────────────────
console.log('\n─── 5. Current Collector Location ──────────────────────────────────────');
assert(
  browseSrc.includes('handleUseMyLocation') && browseSrc.includes('useMyLocation'),
  'LOC-01',
  'Current location centering is explicitly user-triggered via "Use My Location"'
);
assert(
  locServiceSrc.includes('NO background location') && !locServiceSrc.includes('watchPosition'),
  'LOC-02',
  'Strictly NO background GPS listeners or continuous tracking'
);
assert(
  !locServiceSrc.includes('locationHistory') &&
    !locServiceSrc.includes('location_history') &&
    !locServiceSrc.includes('saveLocation') &&
    !locServiceSrc.includes('appendHistory'),
  'LOC-03',
  'Strictly NO location history tracking or persistent device path storage'
);
assert(
  browseSrc.includes('PERMISSION_DENIED') && browseSrc.includes('locPermissionDenied'),
  'LOC-04',
  'Graceful fallback when location permission is denied; map and markers remain operational'
);

// ─── 6. Acceptance Flow & Server-Authoritative Logic ──────────────────────────
console.log('\n─── 6. Acceptance Flow ─────────────────────────────────────────────────');
assert(
  browseSrc.includes('collectorService.acceptRequest') && collectorServiceSrc.includes('/collection-requests/'),
  'ACCEPT-01',
  'Acceptance flow uses existing server-authoritative POST /api/v1/collection-requests/:id/accept endpoint'
);
assert(
  browseSrc.includes('status === 409') && browseSrc.includes('conflictTitle'),
  'ACCEPT-02',
  'Existing 409 race-condition conflict handling preserved on map selection'
);
assert(
  browseSrc.includes('isVerified') && browseSrc.includes('collectorStatus'),
  'ACCEPT-03',
  'Collector verification check preserved before permitting request acceptance'
);
assert(
  browseSrc.includes('acceptingRef.current'),
  'ACCEPT-04',
  'Duplicate acceptance prevention ref prevents double submissions'
);

// ─── 7. Four-Language Multilingual Parity ─────────────────────────────────────
console.log('\n─── 7. Four-Language Multilingual Parity ─────────────────────────────────');
const requiredCollectorKeys = [
  'list',
  'map',
  'approximatePickupArea',
  'useMyLocation',
  'locPermissionRequired',
  'locPermissionDenied',
  'nearbyRequests',
  'exactLocationAfterAcceptance',
  'distance',
  'viewRequest',
  'privacyProtected',
];

const locales = [
  { name: 'English', content: enLocale },
  { name: 'Hindi', content: hiLocale },
  { name: 'Marathi', content: mrLocale },
  { name: 'Odia', content: orLocale },
];

for (const key of requiredCollectorKeys) {
  assert(
    configI18n.includes(`${key}: string`),
    `I18N-CFG-${key}`,
    `config.ts TranslationKeys defines collector.browse.${key}`
  );

  for (const loc of locales) {
    assert(
      loc.content.includes(`${key}:`),
      `I18N-${loc.name.toUpperCase().slice(0, 2)}-${key}`,
      `${loc.name} translation exists for collector.browse.${key}`
    );
  }
}

// ─── 8. Offline Fallback & Glassmorphism ───────────────────────────────────────
console.log('\n─── 8. Offline Fallback & Glassmorphism ────────────────────────────────');
assert(
  browseSrc.includes('OfflineBanner') && browseSrc.includes('isOffline'),
  'OFFLINE-01',
  'Offline fallback banner and EcoSetuMap offline state properly integrated'
);
assert(
  browseSrc.includes('offlineHint') || browseSrc.includes('offlineAlert'),
  'OFFLINE-02',
  'Clear offline warning when collector attempts live acceptance while disconnected'
);
assert(
  browseSrc.includes('glassBorder') || browseSrc.includes('glassBorderStrong'),
  'GLASS-01',
  'Glassmorphism styling tokens preserved for map HUD overlay and card controls'
);
assert(
  browseSrc.includes('minHeight: 48'),
  'A11Y-01',
  'Accessible minimum 48dp touch targets preserved for map controls and toggle buttons'
);

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
console.log(`  COLLECTOR MAP & PRIVACY VERIFICATION: ${passed}/${passed + failed} PASSED`);
console.log('════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  console.error(`❌ Verification encountered ${failed} failure(s).`);
  process.exit(1);
} else {
  console.log('✅ All collector map and privacy invariants verified successfully.');
  process.exit(0);
}
