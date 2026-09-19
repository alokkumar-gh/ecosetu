/**
 * verify_admin_system_health.js
 * EcoSetu — Phase 19 Task 16: Admin Platform Health & System Diagnostics
 *
 * Verifies:
 * 1. Admin-Only RBAC Guard (ROLES.ADMIN check)
 * 2. Navigation Registration & Dashboard CTA
 * 3. Authoritative Backend Health Check & Latency Measurement
 * 4. Factual Status Model (HEALTHY, DEGRADED, UNAVAILABLE, NOT_CONFIGURED, UNKNOWN, OFFLINE)
 * 5. Supported Factual Diagnostics & No Fake Health Claims:
 *    - Backend API
 *    - Database (Factual UNKNOWN)
 *    - AI Microservice (Factual NOT_CONFIGURED)
 *    - Notification/FCM (Factual UNKNOWN)
 *    - Google Maps (Configuration Status)
 *    - Mobile Network (On-Device networkService)
 * 6. Zero Automated Polling Loops / Keep-Alive Requests (No setInterval or setTimeout in screen)
 * 7. Manual On-Demand "Run Diagnostics" with Safe Loading State
 * 8. Offline Resilience & Stale Data Distinction (OfflineBanner, Historical/Cached Snapshot)
 * 9. Security & Privacy Guard (Zero API keys, DATABASE_URL, JWT secrets, or stack traces)
 * 10. Multilingual Parity (100% parity across EN, HI, MR, and OR)
 * 11. Glassmorphism & Accessible Touch Targets (>= 48px)
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
console.log('ECOSETU ADMIN SYSTEM HEALTH & DIAGNOSTICS TEST SUITE');
console.log('Phase 19 Task 16: Admin Platform Health & System Diagnostics');
console.log('================================================================\n');

// ─── 1. Source Files Existence ────────────────────────────────────────────────
console.log('─── 1. Source Files Existence ───────────────────────────────────');
const screen = readFile('src/screens/admin/AdminSystemHealthScreen.tsx');
const adminNav = readFile('src/navigation/AdminNavigator.tsx');
const navTypes = readFile('src/navigation/types.ts');
const dashboard = readFile('src/screens/admin/AdminDashboardScreen.tsx');
const adminService = readFile('src/services/adminService.js');
const networkService = readFile('src/services/networkService.js');
const i18nConfig = readFile('src/i18n/config.ts');
const enLocale = readFile('src/i18n/locales/en.ts');
const hiLocale = readFile('src/i18n/locales/hi.ts');
const mrLocale = readFile('src/i18n/locales/mr.ts');
const orLocale = readFile('src/i18n/locales/or.ts');

check(screen.content.length > 500, 'FILE-01', 'AdminSystemHealthScreen.tsx exists and is populated');
check(adminNav.content.length > 100, 'FILE-02', 'AdminNavigator.tsx exists');
check(navTypes.content.length > 100, 'FILE-03', 'navigation/types.ts exists');
check(dashboard.content.length > 100, 'FILE-04', 'AdminDashboardScreen.tsx exists');
check(adminService.content.length > 100, 'FILE-05', 'adminService.js exists');
check(networkService.content.length > 100, 'FILE-06', 'networkService.js exists');

// ─── 2. Administrator Role Guard ──────────────────────────────────────────────
console.log('\n─── 2. Administrator Role Guard ─────────────────────────────────');
check(contains(screen.content, 'CONST_ROLES.ADMIN'), 'RBAC-01', 'AdminSystemHealthScreen checks CONST_ROLES.ADMIN');
check(contains(screen.content, 'currentUser?.role === CONST_ROLES.ADMIN'), 'RBAC-02', 'Explicit admin role verification on current user');
check(contains(screen.content, '!isAdmin'), 'RBAC-03', 'Restricted access state handled when !isAdmin');
check(contains(screen.content, 'admin.systemHealth.accessRestricted'), 'RBAC-04', 'Displays accessRestricted message for non-admin');

// ─── 3. Navigation & Dashboard CTA ───────────────────────────────────────────
console.log('\n─── 3. Navigation & Dashboard CTA ───────────────────────────────');
check(contains(navTypes.content, 'AdminSystemHealth: undefined;'), 'NAV-01', 'AdminSystemHealth registered in AdminTabParamList');
check(contains(adminNav.content, 'AdminSystemHealthScreen'), 'NAV-02', 'AdminSystemHealthScreen imported in AdminNavigator.tsx');
check(contains(adminNav.content, 'name="AdminSystemHealth"'), 'NAV-03', 'AdminSystemHealth screen registered in Tab.Navigator');
check(contains(adminNav.content, "display: 'none'"), 'NAV-04', 'AdminSystemHealth hidden from bottom tab bar to preserve 5 tabs');
check(contains(dashboard.content, "navigate('AdminSystemHealth')"), 'NAV-05', 'AdminDashboardScreen has CTA navigating to AdminSystemHealth');

// ─── 4. Authoritative Backend Health & Latency ────────────────────────────────
console.log('\n─── 4. Authoritative Backend Health & Latency ───────────────────');
check(contains(adminService.content, 'checkBackendHealth'), 'AUTH-01', 'adminService defines checkBackendHealth()');
check(contains(adminService.content, "apiClient.get('/health'"), 'AUTH-02', 'checkBackendHealth calls GET /health');
check(contains(adminService.content, 'latencyMs'), 'AUTH-03', 'Measures round-trip response latency');
check(contains(screen.content, 'adminService.checkBackendHealth()'), 'AUTH-04', 'AdminSystemHealthScreen consumes checkBackendHealth()');

// ─── 5. Factual Status Model ──────────────────────────────────────────────────
console.log('\n─── 5. Factual Status Model ─────────────────────────────────────');
check(contains(screen.content, "'HEALTHY'"), 'STAT-01', 'Status model includes HEALTHY');
check(contains(screen.content, "'DEGRADED'"), 'STAT-02', 'Status model includes DEGRADED');
check(contains(screen.content, "'UNAVAILABLE'"), 'STAT-03', 'Status model includes UNAVAILABLE');
check(contains(screen.content, "'NOT_CONFIGURED'"), 'STAT-04', 'Status model includes NOT_CONFIGURED');
check(contains(screen.content, "'UNKNOWN'"), 'STAT-05', 'Status model includes UNKNOWN');
check(contains(screen.content, "'OFFLINE'"), 'STAT-06', 'Status model includes OFFLINE');

// ─── 6. Factual Component Diagnostics (No Fake Health Claims) ─────────────────
console.log('\n─── 6. Factual Component Diagnostics ───────────────────────────');
check(contains(screen.content, 'backend_api'), 'DIAG-01', 'Includes Backend API diagnostic');
check(contains(screen.content, 'database'), 'DIAG-02', 'Includes Database diagnostic');
check(contains(screen.content, 'ai_service'), 'DIAG-03', 'Includes AI Classification Microservice diagnostic');
check(contains(screen.content, 'fcm_notifications'), 'DIAG-04', 'Includes Push Notification Layer diagnostic');
check(contains(screen.content, 'google_maps'), 'DIAG-05', 'Includes Google Maps Integration diagnostic');
check(contains(screen.content, 'network'), 'DIAG-06', 'Includes Mobile Network Connectivity diagnostic');

// Verifying strict non-fabrication
check(contains(screen.content, "const dbStatus: HealthStatusType = 'UNKNOWN'"), 'TRUTH-01', 'Database status is strictly UNKNOWN (backend /health does not ping DB)');
check(contains(screen.content, "const aiStatus: HealthStatusType = 'NOT_CONFIGURED'"), 'TRUTH-02', 'AI service is strictly NOT_CONFIGURED (no public health endpoint)');
check(contains(screen.content, "const fcmStatus: HealthStatusType = 'UNKNOWN'"), 'TRUTH-03', 'FCM delivery is strictly UNKNOWN (not verifiable from device)');
check(contains(screen.content, 'isConfigurationOnly'), 'TRUTH-04', 'Google Maps is explicitly flagged as configuration status rather than live ping');

// ─── 7. Zero Polling Loops / Keep-Alive Requests ──────────────────────────────
console.log('\n─── 7. Zero Polling Loops / Keep-Alive Requests ─────────────────');
check(!contains(screen.content, 'setInterval'), 'POLL-01', 'ZERO setInterval in AdminSystemHealthScreen.tsx');
check(!contains(screen.content, 'setTimeout'), 'POLL-02', 'ZERO setTimeout in AdminSystemHealthScreen.tsx');

// ─── 8. Manual Execution & Safe Loading State ─────────────────────────────────
console.log('\n─── 8. Manual Execution & Safe Loading State ───────────────────');
check(contains(screen.content, 'runDiagnostics'), 'EXEC-01', 'Manual runDiagnostics function provided');
check(contains(screen.content, 'isRunning'), 'EXEC-02', 'Tracks isRunning state');
check(contains(screen.content, 'disabled={isRunning}'), 'EXEC-03', 'Disables diagnostic button during execution');
check(contains(screen.content, 'RefreshControl'), 'EXEC-04', 'Provides pull-to-refresh diagnostics');

// ─── 9. Offline Resilience & Stale Data Distinction ───────────────────────────
console.log('\n─── 9. Offline Resilience & Stale Data Distinction ─────────────');
check(contains(screen.content, 'OfflineBanner'), 'OFF-01', 'Renders OfflineBanner when disconnected');
check(contains(screen.content, 'historicalBanner') || contains(screen.content, 'cachedResult'), 'OFF-02', 'Clearly displays cached/historical status');
check(contains(screen.content, 'isLive'), 'OFF-03', 'Distinguishes live check from cached report');
check(contains(adminService.content, 'getCachedSystemHealth'), 'OFF-04', 'Loads cached diagnostics snapshot');
check(contains(adminService.content, 'saveCachedSystemHealth'), 'OFF-05', 'Saves diagnostics snapshot to AsyncStorage');

// ─── 10. Security & Secret Protection ─────────────────────────────────────────
console.log('\n─── 10. Security & Secret Protection ────────────────────────────');
check(!contains(screen.content, 'DATABASE_URL'), 'SEC-01', 'Zero DATABASE_URL in screen');
check(!contains(screen.content, 'AIza'), 'SEC-02', 'Zero Google Maps API keys in screen');
check(!contains(screen.content, 'FIREBASE_PRIVATE_KEY'), 'SEC-03', 'Zero Firebase private keys in screen');
check(!contains(screen.content, 'stack') && !contains(screen.content, 'stackTrace'), 'SEC-04', 'Zero stack traces exposed to administrator');

// ─── 11. Multilingual Parity (39 keys across EN, HI, MR, OR) ──────────────────
console.log('\n─── 11. Multilingual Parity ─────────────────────────────────────');
const requiredKeys = [
  'title', 'subtitle', 'runDiagnostics', 'runningDiagnostics', 'lastChecked',
  'liveCheck', 'cachedResult', 'accessRestricted', 'accessRestrictedMessage',
  'disclaimer', 'statusHealthy', 'statusDegraded', 'statusUnavailable',
  'statusNotConfigured', 'statusUnknown', 'statusOffline', 'backendApiTitle',
  'backendApiDesc', 'backendApiReachable', 'backendApiUnreachable',
  'backendApiOffline', 'databaseTitle', 'databaseDesc', 'databaseExplanation',
  'aiServiceTitle', 'aiServiceDesc', 'aiServiceExplanation', 'fcmTitle',
  'fcmDesc', 'fcmExplanation', 'mapsTitle', 'mapsDesc', 'mapsExplanation',
  'networkTitle', 'networkDesc', 'networkOnline', 'networkOffline',
  'offlineNotice', 'historicalNotice'
];

check(contains(i18nConfig.content, 'systemHealth: {'), 'I18N-01', 'i18n config defines admin.systemHealth interface');

let missingKeysEn = requiredKeys.filter(k => !contains(enLocale.content, `${k}:`));
let missingKeysHi = requiredKeys.filter(k => !contains(hiLocale.content, `${k}:`));
let missingKeysMr = requiredKeys.filter(k => !contains(mrLocale.content, `${k}:`));
let missingKeysOr = requiredKeys.filter(k => !contains(orLocale.content, `${k}:`));

check(missingKeysEn.length === 0, 'I18N-02', `en.ts contains all 39 keys (missing: ${missingKeysEn.join(', ') || 'none'})`);
check(missingKeysHi.length === 0, 'I18N-03', `hi.ts contains all 39 keys (missing: ${missingKeysHi.join(', ') || 'none'})`);
check(missingKeysMr.length === 0, 'I18N-04', `mr.ts contains all 39 keys (missing: ${missingKeysMr.join(', ') || 'none'})`);
check(missingKeysOr.length === 0, 'I18N-05', `or.ts contains all 39 keys (missing: ${missingKeysOr.join(', ') || 'none'})`);

// ─── 12. Glassmorphism & Accessible Touch Targets ─────────────────────────────
console.log('\n─── 12. Glassmorphism & Accessible Touch Targets ────────────────');
check(contains(screen.content, 'minHeight: 48'), 'A11Y-01', 'Interactive button has minimum 48px touch height');
check(contains(screen.content, 'accessibilityRole="button"'), 'A11Y-02', 'Button declares accessibilityRole');
check(contains(screen.content, 'colors.surface') && contains(screen.content, 'colors.divider'), 'UI-01', 'Maintains authentic glassmorphic design system styling');

console.log('\n================================================================');
console.log(`TOTAL CHECKS: ${totalChecks}`);
console.log(`PASSED: ${passedChecks}`);
console.log(`FAILED: ${failedChecks}`);
console.log('================================================================\n');

if (failedChecks > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL ADMIN SYSTEM HEALTH VERIFICATION CHECKS PASSED!\n');
  process.exit(0);
}
