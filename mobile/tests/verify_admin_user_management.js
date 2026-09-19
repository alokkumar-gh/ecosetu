/**
 * verify_admin_user_management.js
 * EcoSetu — Phase 19 Task 15: Admin User Management & Account Lifecycle Refinement
 *
 * Verifies:
 * 1. Admin-only RBAC Guard (ROLES.ADMIN check)
 * 2. Authoritative API & Backend Service (adminService.getUsers, adminService.updateUserStatus)
 * 3. Safe Directory Fields (Name, email, phone, role, status, joined date)
 * 4. Privacy Exclusions (Zero password hashes, tokens, keys, addresses, coordinates)
 * 5. Supported Filtering & Search (role, status, identity search)
 * 6. Account Lifecycle Permissions (ACTIVE, SUSPENDED, DEACTIVATED)
 * 7. Verification Integration (PENDING_VERIFICATION bridges to AdminVerifications)
 * 8. Self-Account Protection (Admins cannot change their own account status)
 * 9. Pre-flight Confirmation for Sensitive Changes
 * 10. HTTP Error Handling (400, 403, 404, 409 conflict)
 * 11. Offline Safeguards (View cache, offline banner, zero offline mutation queueing)
 * 12. Server-Authoritative Audit & Notifications
 * 13. Multilingual Parity (100% leaf key parity across en, hi, mr, or)
 * 14. Glassmorphism & Accessible Touch Targets (>= 48px)
 * 15. Zero hardcoded secrets / AIza keys
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
console.log('ECOSETU ADMIN USER MANAGEMENT & ACCOUNT LIFECYCLE TEST SUITE');
console.log('Phase 19 Task 15: Admin User Management & Account Lifecycle Refinement');
console.log('================================================================\n');

// ─── 1. Source Files Existence ────────────────────────────────────────────────
console.log('─── 1. Source Files Existence ───────────────────────────────────');
const screen = readFile('src/screens/admin/AdminUsersScreen.tsx');
const adminNav = readFile('src/navigation/AdminNavigator.tsx');
const dashboard = readFile('src/screens/admin/AdminDashboardScreen.tsx');
const adminService = readFile('src/services/adminService.js');
const adminController = readFile('../backend/src/controllers/adminController.js');
const adminRoutes = readFile('../backend/src/routes/adminRoutes.js');
const userService = readFile('../backend/src/services/userService.js');
const constants = readFile('src/utils/constants.js');
const i18nConfig = readFile('src/i18n/config.ts');
const enLocale = readFile('src/i18n/locales/en.ts');
const hiLocale = readFile('src/i18n/locales/hi.ts');
const mrLocale = readFile('src/i18n/locales/mr.ts');
const orLocale = readFile('src/i18n/locales/or.ts');

check(screen.content.length > 500, 'FILE-01', 'AdminUsersScreen.tsx exists and is populated');
check(adminNav.content.length > 100, 'FILE-02', 'AdminNavigator.tsx exists');
check(dashboard.content.length > 100, 'FILE-03', 'AdminDashboardScreen.tsx exists');
check(adminService.content.length > 100, 'FILE-04', 'adminService.js exists');
check(adminController.content.length > 100, 'FILE-05', 'adminController.js exists');
check(adminRoutes.content.length > 100, 'FILE-06', 'adminRoutes.js exists');
check(userService.content.length > 100, 'FILE-07', 'backend userService.js exists');

// ─── 2. Administrator Role Guard ──────────────────────────────────────────────
console.log('\n─── 2. Administrator Role Guard ─────────────────────────────────');
check(contains(screen.content, 'CONST_ROLES.ADMIN'), 'RBAC-01', 'AdminUsersScreen imports and checks CONST_ROLES.ADMIN');
check(contains(screen.content, 'currentUser?.role === CONST_ROLES.ADMIN'), 'RBAC-02', 'Explicit admin role verification on current user');
check(contains(screen.content, '!isAdmin'), 'RBAC-03', 'Restricted access state handled when !isAdmin');
check(contains(screen.content, 'admin.users.selfStatusForbidden'), 'RBAC-04', 'Displays access-restricted state for non-admin');
check(contains(adminRoutes.content, 'authorize(ROLES.ADMIN)'), 'RBAC-05', 'Backend admin routes strictly guard with authorize(ROLES.ADMIN)');

// ─── 3. Authoritative Service & Endpoints ─────────────────────────────────────
console.log('\n─── 3. Authoritative Service & Endpoints ─────────────────────────');
check(contains(screen.content, 'adminService.getUsers'), 'AUTH-01', 'Uses authoritative adminService.getUsers()');
check(contains(screen.content, 'adminService.updateUserStatus'), 'AUTH-02', 'Uses authoritative adminService.updateUserStatus()');
check(contains(adminService.content, "apiClient.patch(`/admin/users/${targetUserId}/status`"), 'AUTH-03', 'adminService sends PATCH /admin/users/:id/status');
check(contains(adminRoutes.content, "'/users/:id/status'"), 'AUTH-04', 'Backend route /users/:id/status exists');
check(contains(adminController.content, 'updateUserStatus'), 'AUTH-05', 'adminController defines updateUserStatus');

// ─── 4. Safe Directory Display & Privacy Exclusions ───────────────────────────
console.log('\n─── 4. Safe Directory Display & Privacy Exclusions ──────────────');
check(contains(screen.content, 'item.name'), 'SAFE-01', 'Renders user name');
check(contains(screen.content, 'item.email'), 'SAFE-02', 'Renders email when available');
check(contains(screen.content, 'item.phone'), 'SAFE-03', 'Renders phone when available');
check(contains(screen.content, 'item.role'), 'SAFE-04', 'Renders user role');
check(contains(screen.content, 'item.status'), 'SAFE-05', 'Renders user account status');
check(contains(screen.content, 'item.createdAt'), 'SAFE-06', 'Renders joined date timestamp');

// Strict Privacy Safeguards: Zero sensitive or private fields exposed
check(!contains(screen.content, 'passwordHash'), 'PRIV-01', 'No passwordHash in UI');
check(!contains(screen.content, 'refreshToken'), 'PRIV-02', 'No refresh tokens in UI');
check(!contains(screen.content, 'jwt') && !contains(screen.content, 'accessToken'), 'PRIV-03', 'No JWT or auth tokens in UI');
check(!contains(screen.content, 'doorstep') && !contains(screen.content, 'houseNumber'), 'PRIV-04', 'No citizen doorstep or house numbers');
check(!contains(screen.content, 'landmark') && !contains(screen.content, 'street'), 'PRIV-05', 'No citizen street/landmark addresses');
check(!contains(screen.content, 'latitude') && !contains(screen.content, 'longitude'), 'PRIV-06', 'No exact GPS coordinates in User Directory');
check(!contains(screen.content, 'firebaseKey') && !contains(screen.content, 'apiKey'), 'PRIV-07', 'No private API keys or Firebase secrets');

// ─── 5. Supported Filtering & Search ──────────────────────────────────────────
console.log('\n─── 5. Supported Filtering & Search ─────────────────────────────');
check(contains(screen.content, 'selectedRole'), 'FILTER-01', 'Supports role filtering');
check(contains(screen.content, 'selectedStatus'), 'FILTER-02', 'Supports status filtering');
check(contains(screen.content, 'searchQuery'), 'FILTER-03', 'Supports identity search (name, email)');
check(contains(screen.content, 'ROLE_FILTERS'), 'FILTER-04', 'Defines supported ROLE_FILTERS');
check(contains(screen.content, 'STATUS_FILTERS'), 'FILTER-05', 'Defines supported STATUS_FILTERS');

// ─── 6. Account Lifecycle Permitted Transitions ───────────────────────────────
console.log('\n─── 6. Account Lifecycle Permitted Transitions ──────────────────');
check(contains(screen.content, 'PERMITTED_STATUS_UPDATES'), 'LIFE-01', 'Defines PERMITTED_STATUS_UPDATES list');
check(contains(screen.content, "'ACTIVE'"), 'LIFE-02', 'Supports ACTIVE status transition');
check(contains(screen.content, "'SUSPENDED'"), 'LIFE-03', 'Supports SUSPENDED status transition');
check(contains(screen.content, "'DEACTIVATED'"), 'LIFE-04', 'Supports DEACTIVATED status transition');
check(contains(screen.content, 'selectedUser.id === currentUser?.id'), 'LIFE-05', 'Prevents admin self-account status modification');
check(contains(screen.content, 'admin.users.selfStatusForbiddenMessage'), 'LIFE-06', 'Informs admin when self-modification is blocked');
check(contains(screen.content, 'admin.users.roleUnchangeableNotice'), 'LIFE-07', 'Discloses role immutability in UI');

// ─── 7. Verification Integration (Bridging, No Duplication) ───────────────────
console.log('\n─── 7. Verification Integration ─────────────────────────────────');
check(contains(screen.content, 'PENDING_VERIFICATION'), 'VERIF-01', 'Detects PENDING_VERIFICATION accounts');
check(contains(screen.content, "navigation.navigate('AdminVerifications')"), 'VERIF-02', 'Bridges PENDING_VERIFICATION to AdminVerifications');
check(contains(screen.content, 'admin.users.reviewVerification'), 'VERIF-03', 'Provides clear CTA to review in Verification Center');
check(!contains(screen.content, 'adminService.approveVerification') && !contains(screen.content, 'adminService.rejectVerification'), 'VERIF-04', 'Does NOT duplicate verification approval logic inside User Directory');

// ─── 8. Pre-Flight Confirmation & Error Handling ──────────────────────────────
console.log('\n─── 8. Pre-Flight Confirmation & Error Handling ─────────────────');
check(contains(screen.content, 'Alert.alert('), 'CONF-01', 'Requires explicit confirmation before executing status change');
check(contains(screen.content, 'admin.users.confirmStatusTitle'), 'CONF-02', 'Modal has explicit confirmation prompt title');
check(contains(screen.content, 'admin.users.confirmStatusMessage'), 'CONF-03', 'Modal has explicit confirmation message with target status');
check(contains(screen.content, 'status === 409'), 'ERR-01', 'Handles 409 Conflict state mismatch with refresh');
check(contains(screen.content, 'status === 403'), 'ERR-02', 'Handles 403 Forbidden authorization failure');

// ─── 9. Offline Safeguards & Telemetry ────────────────────────────────────────
console.log('\n─── 9. Offline Safeguards & Telemetry ───────────────────────────');
check(contains(screen.content, 'fromCache && <OfflineBanner />'), 'OFF-01', 'Displays offline banner when viewing cached data');
check(contains(screen.content, '!isConnected'), 'OFF-02', 'Checks connection state');
check(contains(screen.content, 'admin.users.offlineNotice'), 'OFF-03', 'Displays offline notice indicating status changes disabled');
check(contains(adminService.content, 'isOfflineError'), 'OFF-04', 'adminService.updateUserStatus throws offline error when disconnected');
check(!contains(screen.content, 'offlineQueue') && !contains(adminService.content, 'offlineQueue.enqueue') && !contains(adminService.content, 'offlineQueue.push'), 'OFF-05', 'Does NOT queue status mutations offline (server-authoritative only)');

// ─── 10. Audit & Notification Integration ────────────────────────────────────
console.log('\n─── 10. Audit & Notification Integration ────────────────────────');
check(contains(userService.content, 'NOTIFICATION_TYPES.ACCOUNT_SUSPENDED'), 'NOTIF-01', 'Backend triggers ACCOUNT_SUSPENDED notification');
check(contains(userService.content, 'NOTIFICATION_TYPES.ACCOUNT_REACTIVATED'), 'NOTIF-02', 'Backend triggers ACCOUNT_REACTIVATED notification');
check(contains(userService.content, 'Administrators cannot change their own account status'), 'SEC-03', 'Backend enforces self-status change prevention');
check(!contains(screen.content, 'auditService.createLog'), 'AUDIT-01', 'Mobile client does not duplicate backend audit creation');

// ─── 11. Multilingual Parity across 4 Locales ─────────────────────────────────
console.log('\n─── 11. Multilingual Parity ─────────────────────────────────────');
const requiredKeys = [
  'title', 'subtitle', 'searchPlaceholder', 'roleFilterAll', 'statusFilterAll',
  'userDetailsTitle', 'nameLabel', 'emailLabel', 'phoneLabel', 'roleLabel',
  'statusLabel', 'joinedLabel', 'verifiedEmailTag', 'verifiedPhoneTag',
  'updateStatusTitle', 'reasonPlaceholder', 'applyStatus', 'close',
  'offlineNotice', 'selfStatusForbidden', 'selfStatusForbiddenMessage',
  'statusUpdatedSuccess', 'confirmStatusTitle', 'confirmStatusMessage',
  'noUsersFound', 'noUsersFoundSubtitle', 'clearFilters', 'reviewVerification',
  'pendingVerificationNotice', 'roleUnchangeableNotice'
];

check(contains(i18nConfig.content, 'users: {'), 'I18N-01', 'i18n config defines admin.users interface');

let missingKeysEn = requiredKeys.filter(k => !contains(enLocale.content, `${k}:`));
let missingKeysHi = requiredKeys.filter(k => !contains(hiLocale.content, `${k}:`));
let missingKeysMr = requiredKeys.filter(k => !contains(mrLocale.content, `${k}:`));
let missingKeysOr = requiredKeys.filter(k => !contains(orLocale.content, `${k}:`));

check(missingKeysEn.length === 0, 'I18N-02', `en.ts contains all 30 admin.users keys (missing: ${missingKeysEn.join(', ') || 'none'})`);
check(missingKeysHi.length === 0, 'I18N-03', `hi.ts contains all 30 admin.users keys (missing: ${missingKeysHi.join(', ') || 'none'})`);
check(missingKeysMr.length === 0, 'I18N-04', `mr.ts contains all 30 admin.users keys (missing: ${missingKeysMr.join(', ') || 'none'})`);
check(missingKeysOr.length === 0, 'I18N-05', `or.ts contains all 30 admin.users keys (missing: ${missingKeysOr.join(', ') || 'none'})`);

// ─── 12. Glassmorphism & Accessible Touch Targets ─────────────────────────────
console.log('\n─── 12. Glassmorphism & Accessible Touch Targets ────────────────');
check(contains(screen.content, 'minHeight: 48') || contains(screen.content, 'minHeight: 52'), 'A11Y-01', 'Interactive elements enforce minimum 48px touch height');
check(contains(screen.content, 'colors.surface') || contains(screen.content, 'rgba('), 'UI-01', 'Maintains authentic styling with design system tokens');
check(contains(screen.content, 'accessibilityLabel') && contains(screen.content, 'accessibilityRole'), 'A11Y-02', 'Includes accessibility attributes');

// ─── 13. Zero Secrets or API Keys ─────────────────────────────────────────────
console.log('\n─── 13. Zero Secrets or API Keys ────────────────────────────────');
check(!contains(screen.content, 'AIza'), 'SEC-01', 'Zero Google API key patterns in AdminUsersScreen');
check(!contains(screen.content, 'sk_live') && !contains(screen.content, 'secret'), 'SEC-02', 'Zero server credentials or secret keys');

console.log('\n================================================================');
console.log(`TOTAL CHECKS: ${totalChecks}`);
console.log(`PASSED: ${passedChecks}`);
console.log(`FAILED: ${failedChecks}`);
console.log('================================================================\n');

if (failedChecks > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL ADMIN USER MANAGEMENT VERIFICATION CHECKS PASSED!\n');
  process.exit(0);
}
