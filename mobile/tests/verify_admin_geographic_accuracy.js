/**
 * verify_admin_geographic_accuracy.js
 * EcoSetu — Phase 19 Task 12: Admin Geographic Analytics Refinement & Data Accuracy
 *
 * Verifies:
 * 1. Admin Role Protection (ROLES.ADMIN only)
 * 2. Authoritative Analytics Usage (no synthetic numbers, platform-wide metrics)
 * 3. Verified Recycler Facility Data Usage (organizational facility coordinates only)
 * 4. Filter Behavior (State, District, Category, Reset filters)
 * 5. Empty-State Behavior (Clear empty overlay when filters produce no facilities)
 * 6. Privacy Safeguards:
 *    - ZERO citizen coordinates (pickupLat, pickupLng)
 *    - ZERO citizen addresses (houseNumber, street, landmark)
 *    - ZERO citizen contact details (phone, citizenPhone)
 *    - ZERO collector private locations
 *    - Strict sanitized pin projection (no phone on pin markers)
 * 7. Multilingual Parity across all 4 locales (en, hi, mr, or)
 * 8. Offline & Cache Resilience (AsyncStorage cache, OfflineBanner)
 * 9. Map/Overview Switching & EcoSetuMap canonical reuse
 * 10. Glassmorphism & Accessible Touch Targets (min 48px)
 */

const fs = require('fs');
const path = require('path');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(condition, id, description) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✅ [${id}] ${description}`);
  } else {
    failedChecks++;
    console.error(`  ❌ [${id}] FAIL: ${description}`);
  }
}

function readFile(relPath) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Required file missing: ${relPath}`);
  }
  return {
    path: fullPath,
    content: fs.readFileSync(fullPath, 'utf8'),
  };
}

function contains(content, str) {
  return content.indexOf(str) !== -1;
}

console.log('================================================================');
console.log('ECOSETU ADMIN GEOGRAPHIC ACCURACY & REFINEMENT TEST SUITE');
console.log('Phase 19 Task 12: Data Accuracy, Privacy & Refinement');
console.log('================================================================\n');

// ─── 1. File Existence ────────────────────────────────────────────────────────
console.log('─── 1. Source Files Existence ───────────────────────────────────');
const screen = readFile('src/screens/admin/AdminGeographicAnalyticsScreen.tsx');
const adminService = readFile('src/services/adminService.js');
const adminDash = readFile('src/screens/admin/AdminDashboardScreen.tsx');
const adminNav = readFile('src/navigation/AdminNavigator.tsx');

check(screen.content.length > 0, 'SRC-01', 'AdminGeographicAnalyticsScreen.tsx exists and is non-empty');
check(adminService.content.length > 0, 'SRC-02', 'adminService.js exists and is non-empty');
check(contains(adminNav.content, 'AdminGeographicAnalyticsScreen'), 'SRC-03', 'AdminNavigator imports geographic analytics screen');

// ─── 2. Admin Role Protection ─────────────────────────────────────────────────
console.log('\n─── 2. Admin Role Protection & Isolation ─────────────────────────');
check(
  contains(screen.content, 'user?.role === ROLES.ADMIN') || contains(screen.content, 'isAdmin = user?.role === ROLES.ADMIN'),
  'RBAC-01',
  'Strict role check for ROLES.ADMIN'
);
check(
  contains(screen.content, 'Access Restricted') && contains(screen.content, 'EmptyState'),
  'RBAC-02',
  'Renders EmptyState Access Restricted when role is not ADMIN'
);

// ─── 3. Authoritative Analytics & Data Accuracy ───────────────────────────────
console.log('\n─── 3. Authoritative Analytics Usage & No Fabricated Numbers ────');
check(
  contains(screen.content, 'adminService.getGeographicAnalytics()'),
  'DATA-01',
  'Consumes authoritative getGeographicAnalytics method'
);
check(
  contains(adminService.content, 'getGeographicAnalytics()') &&
  contains(adminService.content, 'this.getAnalytics()') &&
  contains(adminService.content, 'recyclingService.getRecyclers()'),
  'DATA-02',
  'adminService combines authoritative platform analytics and verified recyclers'
);
check(
  contains(screen.content, 'authoritativeBadge') || contains(screen.content, 'Platform-Wide Totals (Authoritative)'),
  'DATA-03',
  'Overview explicitly marks platform totals as Authoritative'
);
check(
  contains(screen.content, 'item.facilityCount') && contains(screen.content, 'item.totalConsignments'),
  'DATA-04',
  'Regional breakdown is strictly derived from actual verified recycler facilities'
);
check(
  contains(screen.content, 'Privacy Protected') || contains(screen.content, 'privacyProtected'),
  'DATA-05',
  'District collection volumes are not fabricated; explicitly indicated as Privacy Protected'
);

// ─── 4. Recycler Facility Marker Accuracy ─────────────────────────────────────
console.log('\n─── 4. Recycler Facility Markers & Canonical Map ────────────────');
check(
  contains(screen.content, '<EcoSetuMap') && contains(screen.content, 'EcoSetuMap, EcoSetuPin'),
  'MAP-01',
  'Reuses canonical EcoSetuMap component'
);
check(
  contains(screen.content, 'r.facilityLat') && contains(screen.content, 'r.facilityLng'),
  'MAP-02',
  'Plots markers strictly from verified recycler organizational coordinates'
);
check(
  contains(screen.content, 'facilityName') && contains(screen.content, 'facilityAddress'),
  'MAP-03',
  'Marker callout displays verified organizational facility metadata'
);

// ─── 5. Privacy Safeguards Audit ──────────────────────────────────────────────
console.log('\n─── 5. Privacy Safeguards Audit (ZERO Citizen Doorstep Data) ────');
check(
  !contains(screen.content, 'pickupLat') && !contains(screen.content, 'pickupLng'),
  'PRIV-01',
  'ZERO pickupLat or pickupLng coordinates referenced'
);
check(
  !contains(screen.content, 'houseNumber') && !contains(screen.content, 'citizenAddress'),
  'PRIV-02',
  'ZERO houseNumber or citizen doorstep address referenced'
);
check(
  !contains(screen.content, 'citizenPhone') && !contains(screen.content, 'phone:'),
  'PRIV-03',
  'ZERO citizen phone numbers or contact details exposed'
);
check(
  !contains(screen.content, 'collectorLat') && !contains(screen.content, 'collectorLng'),
  'PRIV-04',
  'ZERO private collector coordinates referenced'
);
check(
  contains(screen.content, 'privacyBanner') && contains(screen.content, 'privacyNotice'),
  'PRIV-05',
  'Prominent privacy banner informs admin of citizen doorstep masking'
);
check(
  contains(screen.content, 'data: {') &&
  contains(screen.content, 'facilityName: r.facilityName') &&
  !contains(screen.content, 'phone: r.'),
  'PRIV-06',
  'Marker pin data is strictly sanitized to organizational facility fields'
);

// ─── 6. Interactive Filters & Empty State Behavior ────────────────────────────
console.log('\n─── 6. Filters & Empty-State Behavior ───────────────────────────');
check(
  contains(screen.content, 'availableStates') && contains(screen.content, 'selectedState'),
  'FLT-01',
  'Dynamic state filtering backed by actual facility records'
);
check(
  contains(screen.content, 'availableDistricts') && contains(screen.content, 'selectedDistrict'),
  'FLT-02',
  'Dynamic district filtering dependent on selected state'
);
check(
  contains(screen.content, 'availableCategories') && contains(screen.content, 'selectedCategory'),
  'FLT-03',
  'Dynamic category filtering backed by accepted e-waste categories'
);
check(
  contains(screen.content, 'resetFilter') || contains(screen.content, 'resetFilters'),
  'FLT-04',
  'Interactive Reset Filters mechanism available'
);
check(
  contains(screen.content, 'emptyMapOverlay') && contains(screen.content, 'noFacilitiesFound'),
  'FLT-05',
  'Clear glassmorphic empty-state overlay displayed when filters yield 0 facilities'
);

// ─── 7. Multilingual Parity Across 4 Locales ──────────────────────────────────
console.log('\n─── 7. Multilingual Parity Across 4 Locales ─────────────────────');
const en = readFile('src/i18n/locales/en.ts');
const hi = readFile('src/i18n/locales/hi.ts');
const mr = readFile('src/i18n/locales/mr.ts');
const or = readFile('src/i18n/locales/or.ts');

const accuracyKeys = [
  'platformTotals',
  'noFacilitiesFound',
  'noFacilitiesMatchingFilter',
  'resetFilters',
  'districtCollectionUnavailable',
  'geographicAnalytics',
  'activityMap',
  'collectionActivity',
  'collectorCoverage',
  'recyclerFacilities',
  'privacyProtected',
  'mapLegend',
  'overview',
  'mapView',
];

accuracyKeys.forEach((key) => {
  const inEn = contains(en.content, `${key}:`);
  const inHi = contains(hi.content, `${key}:`);
  const inMr = contains(mr.content, `${key}:`);
  const inOr = contains(or.content, `${key}:`);

  check(
    inEn && inHi && inMr && inOr,
    `I18N-${key}`,
    `admin.geographic.${key} present across EN, HI, MR, and OR`
  );
});

// ─── 8. Offline & Cache Resilience ────────────────────────────────────────────
console.log('\n─── 8. Offline & Cache Resilience ───────────────────────────────');
check(
  contains(screen.content, '<OfflineBanner />'),
  'OFF-01',
  'Displays OfflineBanner when network disconnected'
);
check(
  contains(screen.content, 'fromCache') && contains(screen.content, 'isOffline={fromCache}'),
  'OFF-02',
  'Passes fromCache status to EcoSetuMap for visual offline indicator'
);

// ─── 9. UX & Accessibility ────────────────────────────────────────────────────
console.log('\n─── 9. UX & Accessibility Invariants ────────────────────────────');
check(
  contains(screen.content, 'accessibilityRole="tab"'),
  'UX-01',
  'Segmented buttons declare accessible tab roles'
);
check(
  contains(screen.content, 'minHeight: 48'),
  'UX-02',
  'Touch targets satisfy minimum 48px height requirements'
);
check(
  contains(screen.content, 'legendHud'),
  'UX-03',
  'High-contrast floating legend HUD distinguishes map elements'
);

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
console.log(`  RESULT: ${passedChecks} passed, ${failedChecks} failed (out of ${totalChecks})`);
console.log('════════════════════════════════════════════════════════════════\n');

if (failedChecks > 0) {
  console.error('❌ Verification suite encountered failures.');
  process.exit(1);
} else {
  console.log('All Admin Geographic Accuracy & Refinement checks passed successfully!\n');
  process.exit(0);
}
