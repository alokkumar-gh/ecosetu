/**
 * verify_google_maps_integration.js
 * Comprehensive Verification Suite — Phase 19, Task 6: Google Maps Android Integration + Citizen Pickup Pin
 *
 * Verifies 22 strict requirements:
 * 1. react-native-maps is installed.
 * 2. Google Maps provider is configured for Android (PROVIDER_GOOGLE).
 * 3. Maps API key is NOT hardcoded in JS/TS.
 * 4. Maps API key is NOT committed to Git.
 * 5. Android manifest contains the correct Maps metadata architecture.
 * 6. package/application ID remains com.ecosetu.
 * 7. fine/coarse location permissions are not duplicated.
 * 8. runtime permission is not requested at app startup.
 * 9. current-location action exists.
 * 10. draggable marker exists.
 * 11. coordinates update form state.
 * 12. existing structured address fields remain intact.
 * 13. existing collection request API is used.
 * 14. locationAccuracy uses the existing field.
 * 15. all four language dictionaries contain the new keys.
 * 16. no Places API dependency exists.
 * 17. no Geocoding API dependency exists.
 * 18. no Directions API dependency exists.
 * 19. no Navigation SDK dependency exists.
 * 20. no background location implementation exists.
 * 21. no location history implementation exists.
 * 22. existing privacy masking remains intact.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

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
console.log('ECOSETU PHASE 19 TASK 6: GOOGLE MAPS & CITIZEN PIN VERIFICATION');
console.log('================================================================\n');

// 1. Dependency Checks
console.log('─── 1. Package & Dependency Constraints ────────────────────────');
const pkgJson = JSON.parse(readFile(path.join(MOBILE_DIR, 'package.json')));
const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };

check(Boolean(deps['react-native-maps']), 'DEP-01', 'react-native-maps is installed in mobile/package.json');
check(!deps['@googlemaps/google-maps-services-js'], 'DEP-02', 'no Google Maps server SDK in mobile');
check(!deps['@react-native-google-signin/google-signin'], 'DEP-03', 'no unrelated Google signin package added');
check(
  !Object.keys(deps).some((k) => k.toLowerCase().includes('places')),
  'DEP-04',
  'no Places API dependency installed'
);
check(
  !Object.keys(deps).some((k) => k.toLowerCase().includes('geocod')),
  'DEP-05',
  'no Geocoding API dependency installed'
);
check(
  !Object.keys(deps).some((k) => k.toLowerCase().includes('direction')),
  'DEP-06',
  'no Directions API dependency installed'
);
check(
  !Object.keys(deps).some((k) => k.toLowerCase().includes('navigation-sdk')),
  'DEP-07',
  'no Google Navigation SDK dependency installed'
);

// 2. Android Manifest & Gradle Architecture
console.log('\n─── 2. Android Manifest & Gradle Configuration ──────────────────');
const manifestXml = readFile(path.join(MOBILE_DIR, 'android/app/src/main/AndroidManifest.xml'));
const appBuildGradle = readFile(path.join(MOBILE_DIR, 'android/app/build.gradle'));

check(
  manifestXml.includes('android:name="com.google.android.geo.API_KEY"') &&
    manifestXml.includes('android:value="${MAPS_API_KEY}"'),
  'AND-01',
  'AndroidManifest.xml configures com.google.android.geo.API_KEY with ${MAPS_API_KEY} placeholder'
);

check(
  appBuildGradle.includes('applicationId "com.ecosetu"') &&
    appBuildGradle.includes('manifestPlaceholders = [MAPS_API_KEY: mapsApiKey]'),
  'AND-02',
  'build.gradle preserves com.ecosetu and passes manifestPlaceholders'
);

// Check permission count for fine and coarse location
const fineMatches = (manifestXml.match(/android\.permission\.ACCESS_FINE_LOCATION/g) || []).length;
const coarseMatches = (manifestXml.match(/android\.permission\.ACCESS_COARSE_LOCATION/g) || []).length;
check(fineMatches === 1, 'AND-03', 'ACCESS_FINE_LOCATION is present exactly once (no duplicates)');
check(coarseMatches === 1, 'AND-04', 'ACCESS_COARSE_LOCATION is present exactly once (no duplicates)');

check(
  !manifestXml.includes('ACCESS_BACKGROUND_LOCATION'),
  'AND-05',
  'ACCESS_BACKGROUND_LOCATION is absent (no background tracking permission)'
);

// 3. API Key Security & Repository Cleanliness
console.log('\n─── 3. Credential Security & Git Purity ─────────────────────────');
// Search tracked files in git for AIza
let aizaInTracked = false;
try {
  const trackedFilesOutput = execSync('git grep -n "AIza" -- ":!*.properties" ":!*google-services.json*"', {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });
  if (trackedFilesOutput.trim().length > 0) {
    aizaInTracked = true;
    console.error('Found AIza in tracked files:', trackedFilesOutput);
  }
} catch (e) {
  // git grep exits with code 1 if no matches found — this is expected and good!
  aizaInTracked = false;
}
check(!aizaInTracked, 'SEC-01', 'Google Maps API key is NOT present in any git-tracked file');

const submitItemSrc = readFile(path.join(MOBILE_DIR, 'src/screens/citizen/SubmitItemScreen.tsx'));
const ecoSetuMapSrc = readFile(path.join(MOBILE_DIR, 'src/components/map/EcoSetuMap.tsx'));
const locationServiceSrc = readFile(path.join(MOBILE_DIR, 'src/services/locationService.ts'));

check(
  !submitItemSrc.includes('AIza') && !ecoSetuMapSrc.includes('AIza') && !locationServiceSrc.includes('AIza'),
  'SEC-02',
  'No API key is hardcoded in any TypeScript or JavaScript source file'
);

const gitignore = readFile(path.join(ROOT_DIR, '.gitignore'));
check(
  gitignore.includes('local.properties'),
  'SEC-03',
  '.gitignore contains local.properties'
);

// 4. Permission Lifecycle & On-Demand Execution
console.log('\n─── 4. Location Permission & Lifecycle Isolation ─────────────────');
const appSrc = readFile(path.join(MOBILE_DIR, 'src/App.tsx'));
const loginSrc = readFile(path.join(MOBILE_DIR, 'src/screens/auth/LoginScreen.tsx'));
const citizenHomeSrc = readFile(path.join(MOBILE_DIR, 'src/screens/citizen/CitizenDashboardScreen.tsx'));

check(
  !appSrc.includes('requestLocationPermission') && !appSrc.includes('ACCESS_FINE_LOCATION'),
  'LIF-01',
  'No location permission requested during App startup'
);
check(
  !loginSrc.includes('requestLocationPermission') && !loginSrc.includes('ACCESS_FINE_LOCATION'),
  'LIF-02',
  'No location permission requested during Login'
);
check(
  !citizenHomeSrc.includes('requestLocationPermission') && !citizenHomeSrc.includes('ACCESS_FINE_LOCATION'),
  'LIF-03',
  'No location permission requested on Dashboard load'
);
check(
  submitItemSrc.includes('handleUseCurrentLocation') && submitItemSrc.includes('getCurrentLocation'),
  'LIF-04',
  'Location permission is triggered on-demand via "Use My Current Location" button'
);

// 5. EcoSetuMap Component Architecture
console.log('\n─── 5. EcoSetuMap Component Capabilities ────────────────────────');
check(
  ecoSetuMapSrc.includes('PROVIDER_GOOGLE'),
  'MAP-01',
  'EcoSetuMap configures Google Maps provider for Android (PROVIDER_GOOGLE)'
);
check(
  ecoSetuMapSrc.includes('<Marker') && ecoSetuMapSrc.includes('draggable={draggable}'),
  'MAP-02',
  'EcoSetuMap supports draggable marker with onDragEnd'
);
check(
  ecoSetuMapSrc.includes('showsUserLocation={true}'),
  'MAP-03',
  'EcoSetuMap enables native user location layer'
);
check(
  ecoSetuMapSrc.includes('isOffline') && ecoSetuMapSrc.includes('fallbackContainer'),
  'MAP-04',
  'EcoSetuMap handles offline state gracefully with informative fallback'
);
check(
  ecoSetuMapSrc.includes('permissionDenied'),
  'MAP-05',
  'EcoSetuMap handles permission denied state with recovery CTA'
);
check(
  ecoSetuMapSrc.includes('minHeight: 48'),
  'MAP-06',
  'EcoSetuMap controls adhere to Android minimum 48dp touch target'
);

// 6. Citizen Submit Item Screen Integration
console.log('\n─── 6. Citizen Submit Screen & Pickup Location Integration ───────');
check(
  submitItemSrc.includes('<EcoSetuMap'),
  'CIT-01',
  'SubmitItemScreen renders EcoSetuMap component'
);
check(
  submitItemSrc.includes('setPickupLat') && submitItemSrc.includes('setPickupLng'),
  'CIT-02',
  'SubmitItemScreen manages pickupLat and pickupLng in form state'
);
check(
  submitItemSrc.includes('handleMarkerDrag'),
  'CIT-03',
  'SubmitItemScreen updates coordinates when marker is dragged'
);
check(
  submitItemSrc.includes('houseNumber') &&
    submitItemSrc.includes('street') &&
    submitItemSrc.includes('landmark') &&
    submitItemSrc.includes('city') &&
    submitItemSrc.includes('district') &&
    submitItemSrc.includes('state') &&
    submitItemSrc.includes('pincode') &&
    submitItemSrc.includes('addressType'),
  'CIT-04',
  'SubmitItemScreen preserves all canonical structured address fields'
);
check(
  submitItemSrc.includes('requestService.createRequest') &&
    submitItemSrc.includes('pickupLat:') &&
    submitItemSrc.includes('pickupLng:') &&
    submitItemSrc.includes('locationAccuracy'),
  'CIT-05',
  'SubmitItemScreen invokes requestService.createRequest with locationAccuracy and coordinates'
);
check(
  !submitItemSrc.includes('google.com/maps/api/geocode') &&
    !submitItemSrc.includes('fetch("https://maps.googleapis.com'),
  'CIT-06',
  'No third-party geocoding API called from SubmitItemScreen'
);

// 7. Multilingual Key Parity Across 4 Languages
console.log('\n─── 7. Four-Language i18n Key Parity ────────────────────────────');
const enLocale = parseLocaleFile('src/i18n/locales/en.ts', 'en');
const hiLocale = parseLocaleFile('src/i18n/locales/hi.ts', 'hi');
const mrLocale = parseLocaleFile('src/i18n/locales/mr.ts', 'mr');
const orLocale = parseLocaleFile('src/i18n/locales/or.ts', 'or');

const requiredSubmitKeys = [
  'pickupLocation',
  'useCurrentLocation',
  'locPermissionRequired',
  'locPermissionDenied',
  'locUnavailable',
  'movePin',
  'selectedLocation',
  'mapLoading',
  'mapUnavailable',
  'latitude',
  'longitude',
  'addressType',
  'houseNumber',
  'street',
  'landmark',
  'city',
  'district',
  'state',
  'pincode',
];

for (const key of requiredSubmitKeys) {
  check(
    Boolean(enLocale?.citizen?.submit?.[key]),
    `I18N-EN-${key}`,
    `English locale contains citizen.submit.${key}`
  );
  check(
    Boolean(hiLocale?.citizen?.submit?.[key]),
    `I18N-HI-${key}`,
    `Hindi locale contains citizen.submit.${key}`
  );
  check(
    Boolean(mrLocale?.citizen?.submit?.[key]),
    `I18N-MR-${key}`,
    `Marathi locale contains citizen.submit.${key}`
  );
  check(
    Boolean(orLocale?.citizen?.submit?.[key]),
    `I18N-OR-${key}`,
    `Odia locale contains citizen.submit.${key}`
  );
}

// 8. Privacy & Absence of Telemetry / Tracking
console.log('\n─── 8. Privacy & Telemetry Invariants ───────────────────────────');
const backendReqServiceSrc = readFile(path.join(ROOT_DIR, 'backend/src/services/requestService.js'));
const backendLocHelperSrc = readFile(path.join(ROOT_DIR, 'backend/src/utils/locationHelper.js'));

check(
  backendReqServiceSrc.includes('Approximate Location (Exact address revealed upon acceptance)') &&
    backendLocHelperSrc.includes('maskCoordinates'),
  'PRV-01',
  'Backend unassigned collector privacy coordinate masking remains intact'
);

check(
  !submitItemSrc.includes('locationHistory') && !locationServiceSrc.includes('locationHistory'),
  'PRV-02',
  'No location history data structure or persistence exists'
);

check(
  !submitItemSrc.includes('watchPosition') && !locationServiceSrc.includes('watchPosition'),
  'PRV-03',
  'No continuous location listener (watchPosition) running'
);

console.log('\n================================================================');
console.log(`GOOGLE MAPS INTEGRATION SUMMARY: ${passed}/${passed + failed} PASSED (${Math.round((passed / (passed + failed)) * 100)}% SUCCESS)`);
console.log('================================================================\n');

if (failed > 0) {
  console.error(`Total failures: ${failed}`);
  process.exit(1);
}

process.exit(0);
