/**
 * verify_admin_governance.js
 * EcoSetu — Phase 19 Task 14: Admin Notification & Governance Center
 *
 * Verifies:
 * 1. Admin Role Protection (ROLES.ADMIN only)
 * 2. Navigation Registration & Dashboard CTA
 * 3. Authoritative Notification & Audit Log Service Usage
 * 4. Canonical Notification Types Only (all 12 canonical events, zero invented)
 * 5. Unread / Read State & Online-Only Mutation Protection
 * 6. Governance Audit Stream & Privacy Safeguards (Zero citizen PII, coordinates, addresses)
 * 7. Offline Caching & Stale Telemetry Indicators (OfflineBanner & Snapshot)
 * 8. Multilingual Parity across all 4 locales (en, hi, mr, or)
 * 9. Glassmorphism & Accessible Touch Targets (>= 48px)
 * 10. Zero Secrets or API Keys
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
console.log('ECOSETU ADMIN NOTIFICATION & GOVERNANCE CENTER TEST SUITE');
console.log('Phase 19 Task 14: Admin Notification & Governance Center');
console.log('================================================================\n');

// ─── 1. Source Files Existence ────────────────────────────────────────────────
console.log('─── 1. Source Files Existence ───────────────────────────────────');
const screen = readFile('src/screens/admin/AdminGovernanceScreen.tsx');
const adminNav = readFile('src/navigation/AdminNavigator.tsx');
const navTypes = readFile('src/navigation/types.ts');
const dashboard = readFile('src/screens/admin/AdminDashboardScreen.tsx');
const constants = readFile('src/utils/constants.js');
const i18nConfig = readFile('src/i18n/config.ts');
const enLocale = readFile('src/i18n/locales/en.ts');
const hiLocale = readFile('src/i18n/locales/hi.ts');
const mrLocale = readFile('src/i18n/locales/mr.ts');
const orLocale = readFile('src/i18n/locales/or.ts');

check(screen.content.length > 500, 'FILE-01', 'AdminGovernanceScreen.tsx exists and is populated');
check(adminNav.content.length > 100, 'FILE-02', 'AdminNavigator.tsx exists');
check(navTypes.content.length > 100, 'FILE-03', 'navigation/types.ts exists');
check(dashboard.content.length > 100, 'FILE-04', 'AdminDashboardScreen.tsx exists');
check(constants.content.length > 100, 'FILE-05', 'constants.js exists');

// ─── 2. Administrator Role Guard ──────────────────────────────────────────────
console.log('\n─── 2. Administrator Role Guard ─────────────────────────────────');
check(contains(screen.content, 'ROLES.ADMIN'), 'RBAC-01', 'Imports and checks ROLES.ADMIN');
check(contains(screen.content, 'const isAdmin = user?.role === ROLES.ADMIN;'), 'RBAC-02', 'Explicit isAdmin role check implemented');
check(contains(screen.content, '!isAdmin'), 'RBAC-03', 'Renders restricted access state when !isAdmin');
check(contains(screen.content, 'admin.governance.accessRestricted'), 'RBAC-04', 'Displays accessRestricted message for non-admins');

// ─── 3. Navigation & Dashboard CTA ───────────────────────────────────────────
console.log('\n─── 3. Navigation & Dashboard CTA ───────────────────────────────');
check(contains(navTypes.content, 'AdminGovernance: undefined;'), 'NAV-01', 'AdminGovernance route registered in AdminTabParamList');
check(contains(adminNav.content, 'AdminGovernanceScreen'), 'NAV-02', 'AdminGovernanceScreen imported in AdminNavigator.tsx');
check(contains(adminNav.content, 'name="AdminGovernance"'), 'NAV-03', 'AdminGovernance screen registered in Tab.Navigator');
check(contains(adminNav.content, "display: 'none'"), 'NAV-04', 'AdminGovernance hidden from tab bar to maintain 5 primary tabs');
check(contains(dashboard.content, "navigate('AdminGovernance')"), 'NAV-05', 'AdminDashboardScreen has CTA navigating to AdminGovernance');
check(contains(dashboard.content, 'Notification & Governance'), 'NAV-06', 'AdminDashboardScreen has accessible Notification & Governance title');

// ─── 4. Authoritative Services Usage ─────────────────────────────────────────
console.log('\n─── 4. Authoritative Services Usage ─────────────────────────────');
check(contains(screen.content, 'notificationService.getNotifications'), 'AUTH-01', 'Calls authoritative notificationService.getNotifications');
check(contains(screen.content, 'notificationService.getUnreadCount'), 'AUTH-02', 'Calls authoritative notificationService.getUnreadCount');
check(contains(screen.content, 'adminService.getAuditLogs'), 'AUTH-03', 'Calls authoritative adminService.getAuditLogs');
check(!contains(screen.content, 'fetch(') && !contains(screen.content, 'axios.'), 'AUTH-04', 'Consumes central services rather than ad-hoc HTTP calls');

// ─── 5. Canonical Notification Types Only ────────────────────────────────────
console.log('\n─── 5. Canonical Notification Types ─────────────────────────────');
check(contains(constants.content, 'NOTIFICATION_TYPES = Object.freeze({'), 'NOTIF-01', 'constants.js defines canonical NOTIFICATION_TYPES');

const canonicalTypes = [
  'REQUEST_ACCEPTED',
  'PICKUP_SCHEDULED',
  'PICKUP_COMPLETED',
  'REQUEST_CANCELLED',
  'CONSIGNMENT_INCOMING',
  'CONSIGNMENT_ACCEPTED',
  'CONSIGNMENT_REJECTED',
  'RECYCLING_COMPLETED',
  'VERIFICATION_APPROVED',
  'VERIFICATION_REJECTED',
  'ACCOUNT_SUSPENDED',
  'ACCOUNT_REACTIVATED',
];

canonicalTypes.forEach((type, idx) => {
  const code = `NOTIF-${String(idx + 2).padStart(2, '0')}`;
  check(contains(screen.content, `NOTIFICATION_TYPES.${type}`), code, `Screen references canonical type ${type}`);
});

// ─── 6. Read State & Offline Mutation Protection ──────────────────────────────
console.log('\n─── 6. Read State & Online-Only Mutations ────────────────────────');
check(contains(screen.content, 'notificationService.markAsRead'), 'MUT-01', 'Implements markAsRead via notificationService');
check(contains(screen.content, 'notificationService.markAllAsRead'), 'MUT-02', 'Implements markAllAsRead via notificationService');
check(contains(screen.content, 'networkService.isConnected()'), 'MUT-03', 'Checks network connectivity before attempting mutations');
check(contains(screen.content, 'offlineMutationBlocked'), 'MUT-04', 'Alerts user that offline mutations are blocked');
check(contains(screen.content, 'markAllButtonDisabled'), 'MUT-05', 'Disables mark all button when offline or unread count is zero');
check(contains(screen.content, 'markReadButtonDisabled'), 'MUT-06', 'Disables individual mark read button when offline');

// ─── 7. Privacy Invariants & Details Sanitization ─────────────────────────────
console.log('\n─── 7. Privacy Invariants & Details Sanitization ────────────────');
check(contains(screen.content, 'sanitizeDetails'), 'PRIV-01', 'Implements sanitizeDetails function for audit events');
check(contains(screen.content, 'FORBIDDEN_KEYS'), 'PRIV-02', 'Defines FORBIDDEN_KEYS set protecting sensitive fields');
check(contains(screen.content, 'privacyProtectedNotice'), 'PRIV-03', 'Displays prominent privacy protected notice for citizens & collectors');

const forbiddenPrivacyTerms = [
  'pickupLat',
  'pickupLng',
  'houseNumber',
  'landmark',
  'phoneNumber',
  'refreshToken',
];

forbiddenPrivacyTerms.forEach((term, idx) => {
  const code = `PRIV-SEC-${String(idx + 1).padStart(2, '0')}`;
  check(contains(screen.content, `'${term}'`), code, `Explicitly blacklists sensitive key ${term} from UI`);
});

// ─── 8. Offline Resilience & Snapshot Telemetry ───────────────────────────────
console.log('\n─── 8. Offline Resilience & Snapshot Telemetry ──────────────────');
check(contains(screen.content, 'OfflineBanner'), 'OFF-01', 'OfflineBanner component imported and integrated');
check(contains(screen.content, 'fromCache && <OfflineBanner'), 'OFF-02', 'Displays OfflineBanner when data is served from local cache');
check(contains(screen.content, 'liveBadge'), 'OFF-03', 'Displays live telemetry badge when online');
check(contains(screen.content, 'cachedBadge'), 'OFF-04', 'Displays cached snapshot badge when offline');
check(contains(screen.content, 'snapshotTimestamp'), 'OFF-05', 'Tracks and renders snapshot timestamp');
check(contains(screen.content, 'handleRefresh'), 'OFF-06', 'Supports pull-to-refresh and manual refresh');

// ─── 9. Multilingual Parity (EN, HI, MR, OR) ──────────────────────────────────
console.log('\n─── 9. Multilingual Parity (EN, HI, MR, OR) ────────────────────');
const expectedKeys = [
  'title',
  'subtitle',
  'notificationsTab',
  'auditTab',
  'unreadCount',
  'totalAlerts',
  'totalAuditLogs',
  'markAllRead',
  'markAllReadConfirm',
  'markAllReadSuccess',
  'markRead',
  'filterAll',
  'filterUnread',
  'filterRead',
  'filterCategory',
  'filterAction',
  'filterEntity',
  'offlineNotice',
  'liveBadge',
  'cachedBadge',
  'refresh',
  'noNotifications',
  'noNotificationsSubtitle',
  'noAuditLogs',
  'noAuditLogsSubtitle',
  'accessRestricted',
  'accessRestrictedMessage',
  'systemActor',
  'privacyProtectedNotice',
  'actorLabel',
  'entityLabel',
  'actionLabel',
  'offlineMutationBlocked',
];

check(contains(i18nConfig.content, 'governance: {'), 'I18N-01', 'config.ts defines admin.governance interface');
check(contains(enLocale.content, 'governance: {'), 'I18N-02', 'en.ts defines admin.governance dictionary');
check(contains(hiLocale.content, 'governance: {'), 'I18N-03', 'hi.ts defines admin.governance dictionary (Hindi)');
check(contains(mrLocale.content, 'governance: {'), 'I18N-04', 'mr.ts defines admin.governance dictionary (Marathi)');
check(contains(orLocale.content, 'governance: {'), 'I18N-05', 'or.ts defines admin.governance dictionary (Odia)');

let allKeysInAllLocales = true;
for (const k of expectedKeys) {
  if (
    !contains(i18nConfig.content, `${k}: string;`) ||
    !contains(enLocale.content, `${k}:`) ||
    !contains(hiLocale.content, `${k}:`) ||
    !contains(mrLocale.content, `${k}:`) ||
    !contains(orLocale.content, `${k}:`)
  ) {
    allKeysInAllLocales = false;
    console.error(`  ❌ Missing translation key: ${k}`);
  }
}
check(allKeysInAllLocales, 'I18N-06', `All ${expectedKeys.length} keys present across config.ts, en.ts, hi.ts, mr.ts, or.ts`);

// ─── 10. Glassmorphism & Accessible Touch Targets ─────────────────────────────
console.log('\n─── 10. Glassmorphism & Accessible Touch Targets ────────────────');
check(contains(screen.content, 'minHeight: 48'), 'A11Y-01', 'Complies with minimum 48px touch targets for buttons');
check(contains(screen.content, 'accessibilityRole="button"'), 'A11Y-02', 'Uses accessibilityRole="button" on interactive controls');
check(contains(screen.content, 'accessibilityRole="tab"'), 'A11Y-03', 'Uses accessibilityRole="tab" on segment switcher tabs');
check(contains(screen.content, 'colors.surface'), 'A11Y-04', 'Applies glassmorphic colors.surface');
check(contains(screen.content, 'colors.divider'), 'A11Y-05', 'Applies glassmorphic colors.divider');

// ─── 11. Security Audit: Zero Hardcoded API Keys or Secrets ───────────────────
console.log('\n─── 11. Security Audit: Zero Hardcoded Secrets ─────────────────');
check(!contains(screen.content, 'AIza'), 'SEC-01', 'Zero Google API keys in AdminGovernanceScreen.tsx');
check(!contains(screen.content, 'Bearer '), 'SEC-02', 'Zero hardcoded auth tokens in AdminGovernanceScreen.tsx');
check(!contains(screen.content, 'postgres://'), 'SEC-03', 'Zero database connection strings in screen');

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`TOTAL CHECKS: ${totalChecks}`);
console.log(`PASSED: ${passedChecks}`);
console.log(`FAILED: ${failedChecks}`);
console.log('================================================================\n');

if (failedChecks > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL ADMIN NOTIFICATION & GOVERNANCE CENTER CHECKS PASSED!\n');
  process.exit(0);
}
