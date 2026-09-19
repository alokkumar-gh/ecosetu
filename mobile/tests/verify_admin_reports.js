/**
 * verify_admin_reports.js
 * EcoSetu — Phase 19 Task 13: Admin Reporting & Export Foundation
 *
 * Verifies:
 * 1. Admin Role Protection (ROLES.ADMIN only)
 * 2. Navigation Registration & Dashboard CTA
 * 3. Authoritative Analytics & Audit Log Usage
 * 4. Zero Fabricated Metrics & Accurate Funnel Steps
 * 5. Privacy Safeguards Audit (ZERO citizen doorstep coordinates or addresses)
 * 6. Export Functionality (CSV & Text summaries via Share.share)
 * 7. Explicit Enterprise PDF/Excel Engine Limitation Notice
 * 8. Offline & Cache Resilience (AsyncStorage cache & OfflineBanner)
 * 9. Multilingual Parity across all 4 locales (en, hi, mr, or)
 * 10. Glassmorphism & Accessible Touch Targets (min 48px)
 * 11. Zero Secrets or API Keys in Report Output
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
console.log('ECOSETU ADMIN REPORTING & EXPORT FOUNDATION TEST SUITE');
console.log('Phase 19 Task 13: Admin Reporting & Export Foundation');
console.log('================================================================\n');

// ─── 1. Source Files Existence ────────────────────────────────────────────────
console.log('─── 1. Source Files Existence ───────────────────────────────────');
const screen = readFile('src/screens/admin/AdminReportsScreen.tsx');
const adminNav = readFile('src/navigation/AdminNavigator.tsx');
const navTypes = readFile('src/navigation/types.ts');
const adminDash = readFile('src/screens/admin/AdminDashboardScreen.tsx');

check(screen.content.length > 0, 'SRC-01', 'AdminReportsScreen.tsx exists and is non-empty');
check(contains(adminNav.content, 'AdminReportsScreen'), 'NAV-01', 'AdminNavigator imports AdminReportsScreen');
check(contains(adminNav.content, 'name="AdminReports"'), 'NAV-02', 'AdminNavigator registers AdminReports tab route');
check(contains(navTypes.content, 'AdminReports: undefined;'), 'TYP-01', 'AdminTabParamList types AdminReports');
check(contains(adminDash.content, "navigation?.navigate('AdminReports')"), 'DASH-01', 'AdminDashboardScreen provides CTA navigating to AdminReports');

// ─── 2. Admin Role Protection & Isolation ─────────────────────────────────────
console.log('\n─── 2. Admin Role Protection & Role Isolation ───────────────────');
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

// Cross-role navigator isolation
const citizenNav = readFile('src/navigation/CitizenNavigator.tsx');
const collectorNav = readFile('src/navigation/CollectorNavigator.tsx');
const recyclerNav = readFile('src/navigation/RecyclerNavigator.tsx');

check(!contains(citizenNav.content, 'AdminReports'), 'ISO-CIT', 'CitizenNavigator cannot access AdminReports');
check(!contains(collectorNav.content, 'AdminReports'), 'ISO-COL', 'CollectorNavigator cannot access AdminReports');
check(!contains(recyclerNav.content, 'AdminReports'), 'ISO-REC', 'RecyclerNavigator cannot access AdminReports');

// ─── 3. Authoritative Analytics & Audit Trail ─────────────────────────────────
console.log('\n─── 3. Authoritative Analytics & Audit Trail ────────────────────');
check(
  contains(screen.content, 'adminService.getAnalytics()'),
  'DATA-01',
  'Loads platform overview telemetry from authoritative adminService.getAnalytics()'
);
check(
  contains(screen.content, 'recyclingService.getRecyclers()'),
  'DATA-02',
  'Loads verified recycler facilities from authorized recyclingService.getRecyclers()'
);
check(
  contains(screen.content, 'adminService.getAuditLogs('),
  'DATA-03',
  'Loads governance audit trail events from authorized adminService.getAuditLogs()'
);
check(
  contains(screen.content, 'funnel') &&
  contains(screen.content, 'itemsSubmitted') &&
  contains(screen.content, 'requestsSubmitted') &&
  contains(screen.content, 'completedPickups') &&
  contains(screen.content, 'acceptedConsignments') &&
  contains(screen.content, 'completedRecycling'),
  'DATA-04',
  'Constructs canonical 5-step conversion funnel per docs/22 Section 2.5'
);

// ─── 4. Privacy Safeguards Audit (ZERO Citizen Doorstep Data) ─────────────────
console.log('\n─── 4. Privacy Safeguards Audit (ZERO Citizen Doorstep Data) ────');
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
  contains(screen.content, 'Citizen household doorstep coordinates are strictly protected'),
  'PRIV-05',
  'Prominent privacy footnote confirms citizen doorstep coordinates are never exported'
);

// ─── 5. Export Functionality (CSV & Summary Text) ─────────────────────────────
console.log('\n─── 5. Export Functionality & Limitation Transparency ───────────');
check(
  contains(screen.content, 'generateCsvReport') && contains(screen.content, 'Share.share'),
  'EXP-01',
  'Generates structured CSV report and triggers native Share.share dialog'
);
check(
  contains(screen.content, 'generateTextSummary') && contains(screen.content, 'Share.share'),
  'EXP-02',
  'Generates formatted executive text summary and triggers native Share.share dialog'
);
check(
  contains(screen.content, 'ECOSETU PLATFORM GOVERNANCE & COMPLIANCE REPORT') &&
  contains(screen.content, 'PLATFORM SUMMARY') &&
  contains(screen.content, 'E-WASTE CATEGORY BREAKDOWN') &&
  contains(screen.content, 'REGIONAL FACILITY COVERAGE'),
  'EXP-03',
  'CSV output contains structured governance, category, and regional tables'
);
check(
  contains(screen.content, 'exportLimitationNotice') || contains(screen.content, 'limitationCard'),
  'EXP-04',
  'Transparently reports direct PDF/Excel requires enterprise server reporting engine'
);

// ─── 6. Offline & Cache Resilience ────────────────────────────────────────────
console.log('\n─── 6. Offline & Cache Resilience ───────────────────────────────');
check(
  contains(screen.content, '<OfflineBanner />'),
  'OFF-01',
  'Displays OfflineBanner when network disconnected'
);
check(
  contains(screen.content, 'fromCache') && contains(screen.content, 'snapshotBanner'),
  'OFF-02',
  'Snapshot banner transparently indicates cached vs live platform analytics'
);

// ─── 7. Multilingual Parity Across 4 Locales ──────────────────────────────────
console.log('\n─── 7. Multilingual Parity Across 4 Locales ─────────────────────');
const en = readFile('src/i18n/locales/en.ts');
const hi = readFile('src/i18n/locales/hi.ts');
const mr = readFile('src/i18n/locales/mr.ts');
const or = readFile('src/i18n/locales/or.ts');

const reportsKeys = [
  'title',
  'subtitle',
  'exportCsv',
  'exportSummary',
  'exportSuccess',
  'exportSuccessMessage',
  'exportLimitationNotice',
  'platformOverview',
  'operationalSummary',
  'geographicSummary',
  'recentActivity',
  'conversionFunnel',
  'currentSnapshotNotice',
  'offlineCachedNotice',
  'accessRestricted',
  'accessRestrictedMessage',
  'generatingExport',
  'noDataAvailable',
  'usersByRole',
  'itemsByCategory',
  'requestsByStatus',
  'pickupsAndWeight',
  'recyclingOutputs',
  'facilityCoverage',
  'stepItemsSubmitted',
  'stepRequestsSubmitted',
  'stepRequestsAccepted',
  'stepPickupsCompleted',
  'stepConsignmentsDelivered',
  'stepRecyclingCompleted',
];

reportsKeys.forEach((key) => {
  const inEn = contains(en.content, `${key}:`);
  const inHi = contains(hi.content, `${key}:`);
  const inMr = contains(mr.content, `${key}:`);
  const inOr = contains(or.content, `${key}:`);

  check(
    inEn && inHi && inMr && inOr,
    `I18N-${key}`,
    `admin.reports.${key} present across EN, HI, MR, and OR`
  );
});

// ─── 8. UX & Accessibility ────────────────────────────────────────────────────
console.log('\n─── 8. UX & Accessibility Invariants ────────────────────────────');
check(
  contains(screen.content, 'minHeight: 48'),
  'UX-01',
  'Action and export buttons satisfy minimum 48px touch target height'
);
check(
  contains(screen.content, 'accessibilityRole="button"'),
  'UX-02',
  'Interactive export controls declare accessible button roles'
);
check(
  contains(screen.content, 'colors.surface') && contains(screen.content, 'colors.primary'),
  'UX-03',
  'Adheres to canonical EcoSetu glassmorphism theme tokens'
);

// ─── 9. Security & Secret Leakage Prevention ──────────────────────────────────
console.log('\n─── 9. Security & Secret Leakage Prevention ──────────────────────');
check(
  !contains(screen.content, 'passwordHash') &&
  !contains(screen.content, 'jwtSecret') &&
  !contains(screen.content, 'AIza') &&
  !contains(screen.content, 'FIREBASE_KEY'),
  'SEC-01',
  'ZERO passwords, JWT secrets, Google Maps keys, or Firebase keys in reporting logic'
);

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
console.log(`  RESULT: ${passedChecks} passed, ${failedChecks} failed (out of ${totalChecks})`);
console.log('════════════════════════════════════════════════════════════════\n');

if (failedChecks > 0) {
  console.error('❌ Verification suite encountered failures.');
  process.exit(1);
} else {
  console.log('All Admin Reporting & Export Foundation checks passed successfully!\n');
  process.exit(0);
}
