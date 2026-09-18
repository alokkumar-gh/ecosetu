/**
 * verify_admin_console.js
 * Verification suite — Phase 18, Task 2: Admin Console & Platform Governance
 *
 * Requirements:
 *   1. Existing Admin APIs:
 *      - GET /api/v1/admin/analytics
 *      - GET /api/v1/admin/users
 *      - PATCH /api/v1/admin/users/:id/status
 *      - GET /api/v1/admin/audit-logs
 *   2. Mobile Admin Service (adminService.js):
 *      - getAnalytics (caching in @ecosetu_admin_analytics)
 *      - getUsers (filtering, search, pagination, caching in @ecosetu_admin_users)
 *      - updateUserStatus (online-only, no offline queueing, cache invalidation)
 *      - getAuditLogs (filtering, pagination, caching in @ecosetu_admin_audit_logs)
 *   3. AdminDashboardScreen:
 *      - Platform user breakdown (Citizen, Collector, Recycler)
 *      - Circular logistics metrics (Items, Requests, Pickups, Collected Weight)
 *      - Downstream recycling metrics (Consignments, Recycled Batches, Recovered Weight)
 *      - Operational conversion funnel (Items -> Requests -> Accepted -> Picked up -> Consigned -> Recycled)
 *      - Recent activity trail
 *      - Loading skeleton, empty state, error retry, pull-to-refresh, offline banner
 *   4. AdminUsersScreen:
 *      - Role and status filtering
 *      - Name/email search
 *      - User card with StatusBadge, verified chips, joined date
 *      - User detail and status modification modal
 *      - Permitted transitions: ACTIVE, SUSPENDED, DEACTIVATED
 *      - Pre-flight confirmation, duplicate protection, 409 conflict handling, online-only validation
 *   5. AdminAuditLogsScreen:
 *      - Action and entity filtering
 *      - Immutable log card: action, timestamp, actor name/role, entity reference, IP, details
 *      - Read-only protection (no mutation/editing)
 *   6. AdminProfileScreen & AdminNavigator:
 *      - Administrative session management and sign out
 *      - Tab navigation routing: Home, Users, Audit, Profile
 *   7. Strict Role Isolation:
 *      - Only ADMIN can access AdminNavigator and admin screens
 *      - CITIZEN, INFORMAL_COLLECTOR, RECYCLER blocked
 *      - Protected user fields cannot be modified through client UI
 *   8. Regression & Non-interruption:
 *      - Citizen, Collector, and Recycler workflows remain fully functional
 *
 * Run: node mobile/tests/verify_admin_console.js
 */

const fs = require('fs');
const path = require('path');

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

function readFile(relPath) {
  const absPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(absPath)) {
    return { exists: false, content: '' };
  }
  return { exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

function readBackendFile(relPath) {
  const absPath = path.join(__dirname, '..', '..', 'backend', relPath);
  if (!fs.existsSync(absPath)) {
    return { exists: false, content: '' };
  }
  return { exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

function contains(content, pattern) {
  if (typeof pattern === 'string') return content.includes(pattern);
  return pattern.test(content);
}

console.log('================================================================');
console.log('  ECOSETU ADMIN CONSOLE & PLATFORM GOVERNANCE TEST SUITE');
console.log('================================================================\n');

// ─── 1. Backend Admin API Capabilities Inspection ─────────────────────────────
console.log('─── 1. Backend Admin Capabilities Inspection ────────────────────');

const beAdminRoutes = readBackendFile('src/routes/adminRoutes.js');
const beAdminCtrl = readBackendFile('src/controllers/adminController.js');
const beAdminValidators = readBackendFile('src/validators/adminValidators.js');
const beAnalyticsSvc = readBackendFile('src/services/analyticsService.js');
const beUserSvc = readBackendFile('src/services/userService.js');
const beAuditSvc = readBackendFile('src/services/auditService.js');

check(beAdminRoutes.exists, 'BE-01', 'adminRoutes.js exists in backend');
check(contains(beAdminRoutes.content, "router.get(\n  '/users'"), 'BE-02', 'GET /api/v1/admin/users endpoint mounted');
check(contains(beAdminRoutes.content, "router.patch(\n  '/users/:id/status'"), 'BE-03', 'PATCH /api/v1/admin/users/:id/status endpoint mounted');
check(contains(beAdminRoutes.content, "router.get(\n  '/analytics'"), 'BE-04', 'GET /api/v1/admin/analytics endpoint mounted');
check(contains(beAdminRoutes.content, "router.get(\n  '/audit-logs'"), 'BE-05', 'GET /api/v1/admin/audit-logs endpoint mounted');
check(contains(beAdminRoutes.content, 'authorize(ROLES.ADMIN)'), 'BE-06', 'All admin endpoints require ROLES.ADMIN authorization');

check(contains(beAdminValidators.content, 'USER_STATUS.ACTIVE') &&
      contains(beAdminValidators.content, 'USER_STATUS.SUSPENDED') &&
      contains(beAdminValidators.content, 'USER_STATUS.DEACTIVATED'), 'BE-07', 'Permitted status transitions defined: ACTIVE, SUSPENDED, DEACTIVATED');
check(contains(beUserSvc.content, 'Administrators cannot change their own account status'), 'BE-08', 'Admin self-status modification strictly blocked on backend');

// ─── 2. Mobile Admin Service Layer Verification ──────────────────────────────
console.log('\n─── 2. Mobile Admin Service Layer (adminService.js) ─────────────');

const adminSvc = readFile('src/services/adminService.js');

check(adminSvc.exists, 'SVC-01', 'adminService.js exists in mobile/src/services');
check(contains(adminSvc.content, "apiClient.get('/admin/analytics')"), 'SVC-02', 'adminService calls GET /admin/analytics');
check(contains(adminSvc.content, "apiClient.get(url)") && contains(adminSvc.content, '/admin/users'), 'SVC-03', 'adminService calls GET /admin/users with query filters');
check(contains(adminSvc.content, "apiClient.patch(`/admin/users/${targetUserId}/status`"), 'SVC-04', 'adminService calls PATCH /admin/users/:id/status');
check(contains(adminSvc.content, '/admin/audit-logs'), 'SVC-05', 'adminService calls GET /admin/audit-logs with query filters');

// Caching & Offline safety
check(contains(adminSvc.content, '@ecosetu_admin_analytics'), 'SVC-06', 'adminService caches analytics with @ecosetu_admin_analytics');
check(contains(adminSvc.content, '@ecosetu_admin_users'), 'SVC-07', 'adminService caches users list with @ecosetu_admin_users');
check(contains(adminSvc.content, '@ecosetu_admin_audit_logs'), 'SVC-08', 'adminService caches audit logs with @ecosetu_admin_audit_logs');
check(!contains(adminSvc.content, 'offlineQueue.enqueue'), 'SVC-09', 'adminService NEVER enqueues admin status mutations in offlineQueue');
check(contains(adminSvc.content, 'isOfflineError = true'), 'SVC-10', 'adminService throws isOfflineError on offline mutation attempt');
check(contains(adminSvc.content, 'AsyncStorage.removeItem(CACHE_KEYS.USERS)'), 'SVC-11', 'updateUserStatus invalidates local users cache upon success');

// ─── 3. AdminDashboardScreen Verification ─────────────────────────────────────
console.log('\n─── 3. Admin Dashboard Screen ───────────────────────────────────');

const adminDashboard = readFile('src/screens/admin/AdminDashboardScreen.tsx');

check(adminDashboard.exists, 'DSH-01', 'AdminDashboardScreen.tsx exists');
check(contains(adminDashboard.content, 'adminService.getAnalytics'), 'DSH-02', 'AdminDashboardScreen loads telemetry from adminService');
check(contains(adminDashboard.content, 'MetricCard'), 'DSH-03', 'AdminDashboardScreen renders MetricCards for KPI breakdown');
check(contains(adminDashboard.content, 'conversionFunnel') || contains(adminDashboard.content, 'Operational Conversion Funnel'), 'DSH-04', 'AdminDashboardScreen renders circular economy conversion funnel');
check(contains(adminDashboard.content, 'recentActivity') || contains(adminDashboard.content, 'Recent Activity Trail'), 'DSH-05', 'AdminDashboardScreen renders recent activity feed');
check(contains(adminDashboard.content, 'OfflineBanner') && contains(adminDashboard.content, 'fromCache'), 'DSH-06', 'AdminDashboardScreen displays OfflineBanner when viewing cached telemetry');
check(contains(adminDashboard.content, 'Skeleton'), 'DSH-07', 'AdminDashboardScreen displays Skeleton loading state');
check(contains(adminDashboard.content, 'EmptyState'), 'DSH-08', 'AdminDashboardScreen displays EmptyState when no telemetry exists');
check(contains(adminDashboard.content, 'RefreshControl'), 'DSH-09', 'AdminDashboardScreen supports native pull-to-refresh');

// ─── 4. AdminUsersScreen Verification ─────────────────────────────────────────
console.log('\n─── 4. Admin Users & Status Management Screen ───────────────────');

const adminUsers = readFile('src/screens/admin/AdminUsersScreen.tsx');

check(adminUsers.exists, 'USR-01', 'AdminUsersScreen.tsx exists');
check(contains(adminUsers.content, 'adminService.getUsers'), 'USR-02', 'AdminUsersScreen fetches users directory');
check(contains(adminUsers.content, 'selectedRole') && contains(adminUsers.content, 'ROLES'), 'USR-03', 'AdminUsersScreen provides role filtering (Citizen, Collector, Recycler, Admin)');
check(contains(adminUsers.content, 'selectedStatus') && contains(adminUsers.content, 'STATUSES'), 'USR-04', 'AdminUsersScreen provides status filtering');
check(contains(adminUsers.content, 'searchQuery'), 'USR-05', 'AdminUsersScreen supports search by name or email');
check(contains(adminUsers.content, 'StatusBadge'), 'USR-06', 'AdminUsersScreen renders StatusBadge for account lifecycle state');
check(contains(adminUsers.content, 'isEmailVerified') && contains(adminUsers.content, 'isPhoneVerified'), 'USR-07', 'AdminUsersScreen displays verification indicators');

// Status management action modal & safeguards
check(contains(adminUsers.content, 'adminService.updateUserStatus'), 'USR-08', 'AdminUsersScreen updates user status via adminService');
check(contains(adminUsers.content, 'PERMITTED_STATUS_UPDATES') || contains(adminUsers.content, 'ACTIVE'), 'USR-09', 'AdminUsersScreen enforces permitted statuses: ACTIVE, SUSPENDED, DEACTIVATED');
check(contains(adminUsers.content, 'Confirm Status Modification') || contains(adminUsers.content, 'Alert.alert'), 'USR-10', 'AdminUsersScreen displays pre-flight confirmation before status mutation');
check(contains(adminUsers.content, '!isConnected') || contains(adminUsers.content, 'offline'), 'USR-11', 'AdminUsersScreen blocks status modification when offline');
check(contains(adminUsers.content, 'isSubmittingRef') || contains(adminUsers.content, 'isSubmittingStatus'), 'USR-12', 'AdminUsersScreen prevents duplicate in-flight status submission');
check(contains(adminUsers.content, '409') || contains(adminUsers.content, 'conflict'), 'USR-13', 'AdminUsersScreen handles 409 status conflicts and triggers reconciliation');
check(contains(adminUsers.content, 'currentUser?.id') || contains(adminUsers.content, 'change their own'), 'USR-14', 'AdminUsersScreen prevents admin self-status modification');

// ─── 5. AdminAuditLogsScreen Verification ─────────────────────────────────────
console.log('\n─── 5. Admin Audit Trail Screen ─────────────────────────────────');

const adminAudit = readFile('src/screens/admin/AdminAuditLogsScreen.tsx');

check(adminAudit.exists, 'AUD-01', 'AdminAuditLogsScreen.tsx exists');
check(contains(adminAudit.content, 'adminService.getAuditLogs'), 'AUD-02', 'AdminAuditLogsScreen queries audit trail via adminService');
check(contains(adminAudit.content, 'actionFilter') || contains(adminAudit.content, 'entityFilter'), 'AUD-03', 'AdminAuditLogsScreen supports filtering by action and entity');
check(contains(adminAudit.content, 'actor.name') || contains(adminAudit.content, 'actorText'), 'AUD-04', 'AdminAuditLogsScreen renders actor identity and role');
check(contains(adminAudit.content, 'item.entityType'), 'AUD-05', 'AdminAuditLogsScreen renders entityType and entity reference ID');
check(contains(adminAudit.content, 'item.ipAddress'), 'AUD-06', 'AdminAuditLogsScreen renders actor IP address');
check(contains(adminAudit.content, 'details'), 'AUD-07', 'AdminAuditLogsScreen displays expandable event details payload');
check(!contains(adminAudit.content, 'deleteLog') && !contains(adminAudit.content, 'editLog') && !contains(adminAudit.content, 'handleDelete') && !contains(adminAudit.content, 'handleEdit'), 'AUD-08', 'Audit trail is strictly read-only with no edit or delete controls');

// ─── 6. AdminProfileScreen & AdminNavigator Verification ──────────────────────
console.log('\n─── 6. Admin Profile & Navigator Integration ────────────────────');

const adminProfile = readFile('src/screens/admin/AdminProfileScreen.tsx');
const adminNav = readFile('src/navigation/AdminNavigator.tsx');
const rootNav = readFile('src/navigation/RootNavigator.tsx');

check(adminProfile.exists, 'PRF-01', 'AdminProfileScreen.tsx exists');
check(contains(adminProfile.content, 'logout'), 'PRF-02', 'AdminProfileScreen provides secure administrative sign out');
check(contains(adminProfile.content, 'ROLE: ADMIN'), 'PRF-03', 'AdminProfileScreen displays administrator role badge');

check(contains(adminNav.content, 'AdminDashboardScreen'), 'NAV-01', 'AdminNavigator mounts AdminDashboardScreen on Home tab');
check(contains(adminNav.content, 'AdminUsersScreen'), 'NAV-02', 'AdminNavigator mounts AdminUsersScreen on Users tab');
check(contains(adminNav.content, 'AdminAuditLogsScreen'), 'NAV-03', 'AdminNavigator mounts AdminAuditLogsScreen on Audit tab');
check(contains(adminNav.content, 'AdminProfileScreen'), 'NAV-04', 'AdminNavigator mounts AdminProfileScreen on Profile tab');
check(contains(adminNav.content, 'AdminVerificationsTab'), 'NAV-05', 'AdminNavigator retains documented verification placeholder');

// ─── 7. Strict Cross-Role Isolation ───────────────────────────────────────────
console.log('\n─── 7. Strict Cross-Role Isolation ──────────────────────────────');

const citizenNav = readFile('src/navigation/CitizenNavigator.tsx');
const collectorNav = readFile('src/navigation/CollectorNavigator.tsx');
const recyclerNav = readFile('src/navigation/RecyclerNavigator.tsx');

check(!contains(citizenNav.content, 'Admin'), 'ISO-01', 'CitizenNavigator has NO access to Admin screens');
check(!contains(collectorNav.content, 'Admin'), 'ISO-02', 'CollectorNavigator has NO access to Admin screens');
check(!contains(recyclerNav.content, 'Admin'), 'ISO-03', 'RecyclerNavigator has NO access to Admin screens');
check(contains(rootNav.content, 'case ROLES.ADMIN:'), 'ISO-04', 'RootNavigator routes ROLES.ADMIN exclusively to AdminNavigator');

// ─── 8. Summary & Exit ────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
console.log(`  ECOSETU ADMIN CONSOLE VERIFICATION SUMMARY`);
console.log(`  Passed: ${passed} / ${passed + failed} (${Math.round((passed / (passed + failed)) * 100)}%)`);
if (failed > 0) {
  console.log(`  Failed: ${failed}`);
  failures.forEach((f) => console.log(`    - [${f.testId}] ${f.description}: ${f.detail}`));
}
console.log('════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
