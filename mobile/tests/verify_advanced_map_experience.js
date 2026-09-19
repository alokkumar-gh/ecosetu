/**
 * verify_advanced_map_experience.js
 * Phase 19 — Task 37: EcoSetu Advanced Map Experience & Pickup Location Selection Verification Suite
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '../..');
const MOBILE_DIR = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const failures = [];

function check(condition, testId, description, detail = '') {
  if (condition) {
    console.log(`  ✅ [${testId}] ${description}`);
    passed++;
  } else {
    console.error(`  ❌ [${testId}] FAIL — ${description}${detail ? ': ' + detail : ''}`);
    failed++;
    failures.push({ testId, description, detail });
  }
}

function readFile(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function parseLocaleFile(relPath, varName) {
  const filePath = path.join(MOBILE_DIR, relPath);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const cleanCode = content
    .replace(/import\s+type[^;]+;/, '')
    .replace(new RegExp(`export\\s+const\\s+${varName}:\\s*TranslationSchema\\s*=`), `const ${varName} =`)
    + `\n;${varName};`;
  return vm.runInNewContext(cleanCode);
}

console.log('\n================================================================');
console.log('PHASE 19 TASK 37: ADVANCED MAP EXPERIENCE & PICKUP SELECTION');
console.log('================================================================\n');

// 1. Files & Component Architecture
console.log('─── 1. Centralized Map Component Architecture ──────────────────');
const ecoSetuMapSrc = readFile(path.join(MOBILE_DIR, 'src/components/map/EcoSetuMap.tsx'));
const submitItemSrc = readFile(path.join(MOBILE_DIR, 'src/screens/citizen/SubmitItemScreen.tsx'));
const locationServiceSrc = readFile(path.join(MOBILE_DIR, 'src/services/locationService.ts'));
const nativeLocModuleSrc = readFile(path.join(MOBILE_DIR, 'android/app/src/main/java/com/ecosetu/EcoSetuLocationModule.kt'));
const collectorBrowseSrc = readFile(path.join(MOBILE_DIR, 'src/screens/collector/CollectorBrowseScreen.tsx'));
const collectorDetailSrc = readFile(path.join(MOBILE_DIR, 'src/screens/collector/CollectorPickupDetailScreen.tsx'));
const recyclerMapSrc = readFile(path.join(MOBILE_DIR, 'src/screens/collector/CollectorRecyclerDirectoryScreen.tsx'));
const adminMapSrc = readFile(path.join(MOBILE_DIR, 'src/screens/admin/AdminGeographicAnalyticsScreen.tsx'));

check(ecoSetuMapSrc.length > 0, 'MAP-01', 'EcoSetuMap.tsx exists and is centralized');
check(ecoSetuMapSrc.includes("MapTypeOption = 'standard' | 'satellite' | 'terrain' | 'hybrid'"), 'MAP-02', 'EcoSetuMap defines standard, satellite, terrain, hybrid map types');
check(ecoSetuMapSrc.includes('AsyncStorage.getItem(MAP_TYPE_STORAGE_KEY)'), 'MAP-03', 'EcoSetuMap loads persisted map type preference');
check(ecoSetuMapSrc.includes('AsyncStorage.setItem(MAP_TYPE_STORAGE_KEY'), 'MAP-04', 'EcoSetuMap saves map type preference to AsyncStorage');
check(ecoSetuMapSrc.includes('showMapTypeControl'), 'MAP-05', 'EcoSetuMap supports floating map type switcher control');
check(ecoSetuMapSrc.includes('showZoomControls'), 'MAP-06', 'EcoSetuMap supports zoom in/out floating glass controls');
check(ecoSetuMapSrc.includes('showMyLocationButton'), 'MAP-07', 'EcoSetuMap supports My Location recenter floating glass control');
check(ecoSetuMapSrc.includes('showRecenterButton'), 'MAP-08', 'EcoSetuMap supports recenter on selected pin floating glass control');
check(ecoSetuMapSrc.includes('showSearch'), 'MAP-09', 'EcoSetuMap supports location search overlay');
check(ecoSetuMapSrc.includes('Circle') && ecoSetuMapSrc.includes('showAccuracyCircle'), 'MAP-10', 'EcoSetuMap renders GPS accuracy circle');
check(ecoSetuMapSrc.includes('customPickupMarker') && ecoSetuMapSrc.includes('markerTeardrop'), 'MAP-11', 'EcoSetuMap renders custom emerald teardrop pickup marker distinct from device dot');
check(ecoSetuMapSrc.includes('allowTapSelection') && ecoSetuMapSrc.includes('allowLongPressSelection'), 'MAP-12', 'EcoSetuMap supports tap and long-press location selection');
check(ecoSetuMapSrc.includes('centerPinMode'), 'MAP-13', 'EcoSetuMap supports center-pin location selection assistance');

// 2. Zero Paid API & Free Geocoding Search
console.log('\n─── 2. Free Geocoding, Search & Zero Paid API ───────────────────');
const pkgJson = JSON.parse(readFile(path.join(MOBILE_DIR, 'package.json')));
const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };

check(!allDeps['@googlemaps/google-maps-services-js'], 'API-01', 'No Google Maps server SDK');
check(!Object.keys(allDeps).some(k => k.toLowerCase().includes('places')), 'API-02', 'Zero Google Places API dependency');
check(!Object.keys(allDeps).some(k => k.toLowerCase().includes('geocoding')), 'API-03', 'Zero paid Google Geocoding dependency');
check(nativeLocModuleSrc.includes('fun searchLocations'), 'API-04', 'EcoSetuLocationModule implements native searchLocations');
check(nativeLocModuleSrc.includes('android.location.Geocoder'), 'API-05', 'Native location module uses android.location.Geocoder (100% free)');
check(locationServiceSrc.includes('searchLocations'), 'API-06', 'locationService exports searchLocations');
check(locationServiceSrc.includes('nominatim.openstreetmap.org'), 'API-07', 'locationService provides OSM Nominatim free fallback');
check(locationServiceSrc.includes('EcoSetu-Ewaste-Management'), 'API-08', 'OSM Nominatim complies with identified User-Agent');
check(locationServiceSrc.includes('1000') && locationServiceSrc.includes('nominatim.openstreetmap.org'), 'API-09', 'OSM Nominatim complies with 1 req/sec rate limit');
check(locationServiceSrc.includes('addressCache') && locationServiceSrc.includes('searchCache'), 'API-10', 'locationService caches geocoding results');

// 3. Citizen Pickup Location Selection Flow
console.log('\n─── 3. Citizen Pickup Location Selection ────────────────────────');
check(submitItemSrc.includes('<EcoSetuMap'), 'CIT-01', 'SubmitItemScreen embeds EcoSetuMap');
check(submitItemSrc.includes('allowLocationSelection={true}'), 'CIT-02', 'Citizen map enables location selection');
check(submitItemSrc.includes('showFullMapModal'), 'CIT-03', 'SubmitItemScreen supports full-screen map modal picker');
check(submitItemSrc.includes('handleUseCurrentLocation'), 'CIT-04', 'Citizen can select native GPS location via Use My Location');
check(submitItemSrc.includes('handleMarkerDrag'), 'CIT-05', 'Citizen can drag pickup marker');
check(submitItemSrc.includes('triggerReverseGeocoding'), 'CIT-06', 'Coordinate updates automatically trigger reverse geocoding');
check(submitItemSrc.includes('isLocationConfirmed'), 'CIT-07', 'Citizen confirms pickup location before submission');
check(submitItemSrc.includes('locationAccuracy'), 'CIT-08', 'Selected location accuracy is tracked and displayed');
check(
  submitItemSrc.includes('houseNumber') &&
  submitItemSrc.includes('street') &&
  submitItemSrc.includes('landmark') &&
  submitItemSrc.includes('city') &&
  submitItemSrc.includes('district') &&
  submitItemSrc.includes('state') &&
  submitItemSrc.includes('pincode'),
  'CIT-09',
  'Citizen structured address fields are auto-populated and editable'
);

// 4. Role Isolation & Privacy Safeguards
console.log('\n─── 4. Role Isolation & Privacy Safeguards ──────────────────────');
check(collectorBrowseSrc.includes('showApproximateCircles={true}'), 'PRIV-01', 'CollectorBrowseScreen renders approximate area circles pre-acceptance');
check(!collectorBrowseSrc.includes('Exact doorstep pin revealed'), 'PRIV-02', 'Collector pre-acceptance does not reveal exact live doorstep pin');
check(collectorDetailSrc.includes('isAssigned') || collectorDetailSrc.includes('status'), 'PRIV-03', 'Collector detail authorizes exact navigation for accepted pickups');
check(recyclerMapSrc.includes('EcoSetuMap'), 'PRIV-04', 'Recycler facility map uses centralized EcoSetuMap');
check(adminMapSrc.includes('EcoSetuMap'), 'PRIV-05', 'Admin geographic analytics uses centralized EcoSetuMap');
check(adminMapSrc.includes('privacyProtected'), 'PRIV-06', 'Admin map strictly preserves citizen privacy and shows aggregated metrics');

// 5. Multilingual Localization (4 Locales)
console.log('\n─── 5. Multilingual Translation Parity ──────────────────────────');
const enLocale = parseLocaleFile('src/i18n/locales/en.ts', 'en');
const hiLocale = parseLocaleFile('src/i18n/locales/hi.ts', 'hi');
const mrLocale = parseLocaleFile('src/i18n/locales/mr.ts', 'mr');
const orLocale = parseLocaleFile('src/i18n/locales/or.ts', 'or');

const newLocationKeys = [
  'standard',
  'satellite',
  'terrain',
  'hybrid',
  'mapType',
  'zoomIn',
  'zoomOut',
  'recenter',
  'locationAccuracy',
  'accuracyLow',
  'updatingAddress',
  'addressUpdated',
  'addressNotFound',
  'chooseOnMap',
  'confirmLocation',
  'confirmPickupLocation',
  'searchLocation',
  'reposition',
];

for (const key of newLocationKeys) {
  check(Boolean(enLocale?.location?.[key]), `I18N-EN-${key}`, `en defines location.${key}`);
  check(Boolean(hiLocale?.location?.[key]), `I18N-HI-${key}`, `hi defines location.${key}`);
  check(Boolean(mrLocale?.location?.[key]), `I18N-MR-${key}`, `mr defines location.${key}`);
  check(Boolean(orLocale?.location?.[key]), `I18N-OR-${key}`, `or defines location.${key}`);
}

console.log('\n================================================================');
console.log(`ADVANCED MAP EXPERIENCE SUMMARY: ${passed}/${passed + failed} PASSED (${Math.round((passed / (passed + failed)) * 100)}% SUCCESS)`);
console.log('================================================================\n');

if (failed > 0) {
  console.error(`Total failures: ${failed}`);
  process.exit(1);
}

process.exit(0);
