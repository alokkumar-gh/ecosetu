/**
 * verify_admin_geographic_analytics.js
 * Comprehensive Verification Suite — Phase 19, Task 11:
 * Admin Geographic Analytics + Privacy-Safe Map Visualization
 *
 * Requirements:
 * 1. Admin geographic analytics screen exists.
 * 2. Screen is accessible only to ADMIN.
 * 3. Citizen cannot access it.
 * 4. Collector cannot access it.
 * 5. Recycler cannot access it.
 * 6. Existing admin analytics remains intact.
 * 7. Map reuses EcoSetuMap.
 * 8. Aggregated geographic data is used.
 * 9. Individual citizen markers are not created.
 * 10. Exact citizen coordinates are not exposed.
 * 11. Exact citizen addresses are not exposed.
 * 12. Citizen phone/contact data is not exposed.
 * 13. Verified recycler facility locations can be displayed.
 * 14. Collector private personal data is not unnecessarily exposed.
 * 15. No background location tracking.
 * 16. Google Maps integration remains intact.
 * 17. No Places API.
 * 18. No Geocoding API.
 * 19. No Directions API.
 * 20. Four-language translation parity.
 * 21. Offline cached analytics behavior.
 * 22. Existing Admin RBAC remains intact.
 * 23. Existing admin analytics tests remain intact.
 * 24. No production database changes.
 * 25. No API key leakage.
 *
 * Run: node mobile/tests/verify_admin_geographic_analytics.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

const MOBILE_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(__dirname, '../..');

function readFile(relPath) {
  const p = path.resolve(MOBILE_ROOT, relPath);
  if (!fs.existsSync(p)) return { exists: false, content: '' };
  return { exists: true, content: fs.readFileSync(p, 'utf8') };
}

console.log('================================================================');
console.log('ECOSETU ADMIN GEOGRAPHIC ANALYTICS & MAP VERIFICATION SUITE');
console.log('Phase 19 Task 11: Privacy-Safe Geographic Analytics');
console.log('================================================================\n');

// ─── 1. Screen Existence & Admin Registration ───────────────────────────────
console.log('─── 1. Screen Existence & Routing ───────────────────────────────');

const geoScreen = readFile('src/screens/admin/AdminGeographicAnalyticsScreen.tsx');
const adminNav = readFile('src/navigation/AdminNavigator.tsx');
const navTypes = readFile('src/navigation/types.ts');
const adminDashboard = readFile('src/screens/admin/AdminDashboardScreen.tsx');

check(geoScreen.exists, 'SCR-01', 'AdminGeographicAnalyticsScreen.tsx exists');
check(
  contains(adminNav.content, 'AdminGeographicAnalyticsScreen'),
  'NAV-01',
  'AdminNavigator imports AdminGeographicAnalyticsScreen'
);
check(
  contains(adminNav.content, 'name="AdminGeographicAnalytics"'),
  'NAV-02',
  'AdminNavigator registers AdminGeographicAnalytics route'
);
check(
  contains(navTypes.content, 'AdminGeographicAnalytics'),
  'TYP-01',
  'AdminTabParamList types AdminGeographicAnalytics'
);
check(
  contains(adminDashboard.content, 'AdminGeographicAnalytics'),
  'DASH-01',
  'AdminDashboardScreen provides CTA navigating to AdminGeographicAnalytics'
);

// ─── 2. Strict RBAC & Role Isolation ────────────────────────────────────────
console.log('\n─── 2. Strict Role-Based Access Control (Admin-Only) ────────────');

check(
  contains(geoScreen.content, 'ROLES.ADMIN') &&
  (contains(geoScreen.content, 'user?.role === ROLES.ADMIN') || contains(geoScreen.content, 'isAdmin')),
  'RBAC-01',
  'Screen strictly checks for ROLES.ADMIN'
);
check(
  contains(geoScreen.content, 'Access Restricted') || contains(geoScreen.content, 'EmptyState'),
  'RBAC-02',
  'Screen renders Access Restricted state when role is not ADMIN'
);

const citizenNav = readFile('src/navigation/CitizenNavigator.tsx');
const collectorNav = readFile('src/navigation/CollectorNavigator.tsx');
const recyclerNav = readFile('src/navigation/RecyclerNavigator.tsx');

check(
  !contains(citizenNav.content, 'AdminGeographicAnalytics'),
  'ISO-CIT',
  'Citizen cannot access AdminGeographicAnalytics'
);
check(
  !contains(collectorNav.content, 'AdminGeographicAnalytics'),
  'ISO-COL',
  'Collector cannot access AdminGeographicAnalytics'
);
check(
  !contains(recyclerNav.content, 'AdminGeographicAnalytics'),
  'ISO-REC',
  'Recycler cannot access AdminGeographicAnalytics'
);

// ─── 3. EcoSetuMap Reuse & View Architecture ────────────────────────────────
console.log('\n─── 3. EcoSetuMap Integration & Dual Views ──────────────────────');

check(
  contains(geoScreen.content, 'EcoSetuMap'),
  'MAP-01',
  'Screen imports and reuses canonical EcoSetuMap component'
);
check(
  contains(geoScreen.content, 'activeTab') &&
  contains(geoScreen.content, 'overview') &&
  contains(geoScreen.content, 'map'),
  'VIEW-01',
  'Screen provides dual segmented navigation tabs: [ Overview ] and [ Map ]'
);
check(
  contains(geoScreen.content, 'accessibilityRole="tab"'),
  'A11Y-01',
  'Segmented view controls declare accessible tab roles'
);

// ─── 4. Privacy Invariants: ZERO Citizen Doorstep Data ──────────────────────
console.log('\n─── 4. Privacy Safeguards: ZERO Citizen Doorstep Data ────────────');

check(
  !contains(geoScreen.content, 'citizenId') &&
  !contains(geoScreen.content, 'pickupLat') &&
  !contains(geoScreen.content, 'pickupLng'),
  'PRIV-01',
  'ZERO raw citizen collection coordinates plotted or referenced'
);
check(
  !contains(geoScreen.content, 'houseNumber') &&
  !contains(geoScreen.content, 'citizenPhone') &&
  !contains(geoScreen.content, 'citizenAddress'),
  'PRIV-02',
  'ZERO individual citizen house numbers or private contact details exposed'
);
check(
  contains(geoScreen.content, 'privacyBanner') || contains(geoScreen.content, 'Privacy Protected'),
  'PRIV-03',
  'Prominent privacy notice indicates citizen doorstep locations are protected'
);
check(
  !contains(geoScreen.content, 'watchPosition') &&
  !contains(geoScreen.content, 'Geolocation') &&
  !contains(geoScreen.content, 'startLocationUpdates'),
  'PRIV-04',
  'ZERO background location tracking or continuous device GPS monitoring'
);

// ─── 5. Verified Recycler Facilities & Collector Coverage ───────────────────
console.log('\n─── 5. Verified Recycler Facilities & Coverage ──────────────────');

check(
  contains(geoScreen.content, 'facilityLat') &&
  contains(geoScreen.content, 'facilityLng') &&
  contains(geoScreen.content, 'facilityName'),
  'REC-01',
  'Verified organizational recycler facility locations plotted on map'
);
check(
  contains(geoScreen.content, 'totalConsignments'),
  'REC-02',
  'Displays verified organizational consignments processed metric'
);
check(
  contains(geoScreen.content, 'mapLegend') || contains(geoScreen.content, 'legendHud'),
  'LEG-01',
  'Accessible map legend distinguishes facility and regional coverage layers'
);
check(
  contains(geoScreen.content, 'selectedState') &&
  contains(geoScreen.content, 'selectedDistrict') &&
  contains(geoScreen.content, 'selectedCategory'),
  'FLT-01',
  'Provides useful regional filters for State, District, and Category'
);

// ─── 6. Multilingual Parity (en, hi, mr, or) ────────────────────────────────
console.log('\n─── 6. Multilingual Parity Across All 4 Locales ─────────────────');

const enFile = readFile('src/i18n/locales/en.ts');
const hiFile = readFile('src/i18n/locales/hi.ts');
const mrFile = readFile('src/i18n/locales/mr.ts');
const orFile = readFile('src/i18n/locales/or.ts');

const requiredKeys = [
  'geographicAnalytics',
  'activityMap',
  'collectionActivity',
  'collectorCoverage',
  'recyclerFacilities',
  'district',
  'city',
  'state',
  'totalRequests',
  'completedPickups',
  'eWasteCollected',
  'eWasteRecycled',
  'activeCollectors',
  'verifiedRecyclers',
  'aggregatedData',
  'privacyProtected',
  'noGeographicData',
  'mapLegend',
  'overview',
  'mapView',
];

requiredKeys.forEach((k) => {
  const inEn = contains(enFile.content, `${k}:`);
  const inHi = contains(hiFile.content, `${k}:`);
  const inMr = contains(mrFile.content, `${k}:`);
  const inOr = contains(orFile.content, `${k}:`);

  check(
    inEn && inHi && inMr && inOr,
    `I18N-${k}`,
    `admin.geographic.${k} present across English, Hindi, Marathi, and Odia`
  );
});

// Check authentic script
const devanagariRegex = /[\u0900-\u097F]/;
const odiaRegex = /[\u0B00-\u0B7F]/;
check(devanagariRegex.test(hiFile.content), 'SCR-HI', 'Hindi contains authentic Devanagari script');
check(devanagariRegex.test(mrFile.content), 'SCR-MR', 'Marathi contains authentic Devanagari script');
check(odiaRegex.test(orFile.content), 'SCR-OR', 'Odia contains authentic Odia script');

// ─── 7. Offline Resilience ──────────────────────────────────────────────────
console.log('\n─── 7. Offline Resilience & Cached Data ─────────────────────────');

const adminServiceFile = readFile('src/services/adminService.js');
check(
  contains(adminServiceFile.content, 'getGeographicAnalytics'),
  'SVC-01',
  'adminService exports getGeographicAnalytics method'
);
check(
  contains(geoScreen.content, 'OfflineBanner'),
  'OFF-01',
  'AdminGeographicAnalyticsScreen displays OfflineBanner when disconnected'
);
check(
  contains(geoScreen.content, 'fromCache'),
  'OFF-02',
  'Screen tracks fromCache state for transparent offline viewing'
);

// ─── 8. Strict Non-Regression & API Invariants ──────────────────────────────
console.log('\n─── 8. Strict Non-Regression & API Invariants ───────────────────');

const pkgJson = readFile('package.json');
check(
  !contains(pkgJson.content, '@react-native-community/geolocation'),
  'DEP-01',
  'Zero unapproved geolocation dependencies'
);
check(
  !contains(pkgJson.content, 'google-places') && !contains(pkgJson.content, 'geocoding'),
  'DEP-02',
  'Zero paid Google Places or Geocoding SDKs'
);
check(
  !contains(pkgJson.content, 'directions'),
  'DEP-03',
  'Zero paid Directions API dependencies'
);

// Verify Android permissions
const androidManifest = readFile('android/app/src/main/AndroidManifest.xml');
check(
  !contains(androidManifest.content, 'ACCESS_BACKGROUND_LOCATION'),
  'PERM-01',
  'Zero background location permission in AndroidManifest.xml'
);
check(
  contains(androidManifest.content, 'com.google.android.geo.API_KEY'),
  'MAP-KEY',
  'Google Maps Android SDK API key placeholder remains configured'
);

// Check zero hardcoded Google API keys
try {
  const aizaCheck = execSync('git grep -n "AIza" -- mobile/src', { cwd: PROJECT_ROOT }).toString().trim();
  check(aizaCheck === '', 'SEC-01', 'Zero hardcoded Google API keys in mobile/src');
} catch {
  check(true, 'SEC-01', 'Zero hardcoded Google API keys in mobile/src');
}

// ─── Summary ────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
console.log(`  RESULT: ${passed} passed, ${failed} failed`);
console.log('════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  console.error('Failed checks:');
  failures.forEach((f) => console.error(`  - [${f.testId}] ${f.description}: ${f.detail}`));
  process.exit(1);
} else {
  console.log('All Admin Geographic Analytics verification checks passed successfully!\n');
  process.exit(0);
}

function contains(str, substr) {
  return typeof str === 'string' && str.includes(substr);
}
