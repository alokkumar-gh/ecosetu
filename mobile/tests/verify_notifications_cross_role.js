/**
 * verify_notifications_cross_role.js
 * Cross-Role Notification Integration & Validation Test Suite
 * Phase 18 — Task 4: Cross-Role Notification Integration & Validation
 *
 * Canonical Reference:
 *   - docs/23_NOTIFICATION_SYSTEM.md (Sections 1–8)
 *   - docs/05_API_SPECIFICATION.md (Section 13)
 *   - docs/06_ROLES_AND_PERMISSIONS.md
 *   - docs/07_BUSINESS_WORKFLOWS.md
 *   - docs/21_TRACEABILITY_AND_AUDIT.md
 *   - backend/src/utils/constants.js (NOTIFICATION_TYPES)
 *   - backend/src/services/notificationService.js
 *
 * Requirements Verified:
 *   1. Canonical notification types
 *   2. Event-to-recipient mapping
 *   3. Citizen notification behavior
 *   4. Collector notification behavior where documented
 *   5. Recycler notification behavior where documented
 *   6. Admin behavior where documented
 *   7. Notification ownership isolation
 *   8. Unread count behavior
 *   9. Read mutation behavior
 *   10. Read-all behavior
 *   11. Offline behavior
 *   12. Cache consistency
 *   13. Duplicate prevention
 *   14. Verification notifications
 *   15. Consignment notifications
 *   16. Recycling completion notifications
 *   17. Account status notifications
 *   18. E2E notification propagation
 *
 * Run: node mobile/tests/verify_notifications_cross_role.js
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
  const absPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(absPath)) return { exists: false, content: '' };
  return { exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

function readBackendFile(relPath) {
  const absPath = path.resolve(__dirname, '../../backend', relPath);
  if (!fs.existsSync(absPath)) return { exists: false, content: '' };
  return { exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

function contains(content, pattern) {
  if (typeof pattern === 'string') return content.includes(pattern);
  return pattern.test(content);
}

console.log('================================================================');
console.log('  ECOSETU CROSS-ROLE NOTIFICATION INTEGRATION & VALIDATION');
console.log('================================================================\n');

// ─── Load subjects ─────────────────────────────────────────────────────────────

const constantsFile   = readBackendFile('src/utils/constants.js');
const schemaFile      = readBackendFile('prisma/schema.prisma');
const beNotifSvc      = readBackendFile('src/services/notificationService.js');
const beReqSvc        = readBackendFile('src/services/requestService.js');
const bePickupSvc     = readBackendFile('src/services/pickupService.js');
const beConsignSvc    = readBackendFile('src/services/consignmentService.js');
const beRecyclingSvc  = readBackendFile('src/services/recyclingService.js');
const beUserSvc       = readBackendFile('src/services/userService.js');
const beVerifSvc      = readBackendFile('src/services/verificationService.js');
const beNotifCtrl     = readBackendFile('src/controllers/notificationController.js');
const beNotifRoutes   = readBackendFile('src/routes/notificationRoutes.js');

const mobNotifSvc     = readFile('src/services/notificationService.js');
const citizenNotifScr = readFile('src/screens/citizen/CitizenNotificationsScreen.tsx');
const citizenNav      = readFile('src/navigation/CitizenNavigator.tsx');
const collectorNav    = readFile('src/navigation/CollectorNavigator.tsx');
const recyclerNav     = readFile('src/navigation/RecyclerNavigator.tsx');
const adminNav        = readFile('src/navigation/AdminNavigator.tsx');

// ─── 1. Canonical Notification Types (docs/23 Section 2) ──────────────────────
console.log('─── 1. Canonical Notification Types ─────────────────────────────');

const expectedTypes = [
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

expectedTypes.forEach((t, i) => {
  const id = `TYP-${String(i + 1).padStart(2, '0')}`;
  check(contains(constantsFile.content, `${t}: '${t}'`), id, `NOTIFICATION_TYPES defines ${t}`);
});

// ─── 2. Event-to-Recipient Mapping ─────────────────────────────────────────────
console.log('\n─── 2. Event-to-Recipient Mapping ───────────────────────────────');

check(contains(beReqSvc.content, 'result.request.citizenId'), 'MAP-01', 'REQUEST_ACCEPTED recipient is CITIZEN');
check(contains(bePickupSvc.content, 'pickup.collectionRequest.citizenId'), 'MAP-02', 'PICKUP_COMPLETED recipient is CITIZEN');
check(contains(beReqSvc.content, 'collectorProfile.userId') && contains(beReqSvc.content, 'REQUEST_CANCELLED'), 'MAP-03', 'REQUEST_CANCELLED recipient is INFORMAL_COLLECTOR');
check(contains(beConsignSvc.content, 'recyclerProfile.userId') && contains(beConsignSvc.content, 'CONSIGNMENT_INCOMING'), 'MAP-04', 'CONSIGNMENT_INCOMING recipient is RECYCLER');
check(contains(beConsignSvc.content, 'consignment.collector.userId') && contains(beConsignSvc.content, 'CONSIGNMENT_ACCEPTED'), 'MAP-05', 'CONSIGNMENT_ACCEPTED recipient is INFORMAL_COLLECTOR');
check(contains(beConsignSvc.content, 'consignment.collector.userId') && contains(beConsignSvc.content, 'CONSIGNMENT_REJECTED'), 'MAP-06', 'CONSIGNMENT_REJECTED recipient is INFORMAL_COLLECTOR');
check(contains(beRecyclingSvc.content, 'ci.ewasteItem?.citizenId') && contains(beRecyclingSvc.content, 'RECYCLING_COMPLETED'), 'MAP-07', 'RECYCLING_COMPLETED recipient is CITIZEN');
check(contains(beVerifSvc.content, 'verification.userId') && contains(beVerifSvc.content, 'VERIFICATION_APPROVED'), 'MAP-08', 'VERIFICATION_APPROVED recipient is applicant user');
check(contains(beVerifSvc.content, 'verification.userId') && contains(beVerifSvc.content, 'VERIFICATION_REJECTED'), 'MAP-09', 'VERIFICATION_REJECTED recipient is applicant user');
check(contains(beUserSvc.content, 'targetUserId') && contains(beUserSvc.content, 'ACCOUNT_SUSPENDED'), 'MAP-10', 'ACCOUNT_SUSPENDED recipient is affected user');
check(contains(beUserSvc.content, 'targetUserId') && contains(beUserSvc.content, 'ACCOUNT_REACTIVATED'), 'MAP-11', 'ACCOUNT_REACTIVATED recipient is affected user');

// ─── 3. Citizen Notification Behavior ──────────────────────────────────────────
console.log('\n─── 3. Citizen Notification Behavior ────────────────────────────');

check(citizenNotifScr.exists, 'CTZ-01', 'CitizenNotificationsScreen.tsx exists');
check(contains(citizenNav.content, 'CitizenNotificationsScreen'), 'CTZ-02', 'CitizenNavigator mounts CitizenNotificationsScreen on Alerts tab');
check(contains(citizenNotifScr.content, 'REQUEST_ACCEPTED'), 'CTZ-03', 'CitizenNotificationsScreen renders REQUEST_ACCEPTED');
check(contains(citizenNotifScr.content, 'PICKUP_COMPLETED'), 'CTZ-04', 'CitizenNotificationsScreen renders PICKUP_COMPLETED');
check(contains(citizenNotifScr.content, 'RECYCLING_COMPLETED'), 'CTZ-05', 'CitizenNotificationsScreen renders RECYCLING_COMPLETED as informational');
check(contains(citizenNotifScr.content, 'collection_request') && contains(citizenNotifScr.content, 'RequestDetail'), 'CTZ-06', 'Citizen deep-links collection_request to RequestDetail');
check(contains(citizenNotifScr.content, 'isCollectorRelated'), 'CTZ-07', 'Reinforces Kabadiwala-first wording for collector events');

// ─── 4. Collector Notification Behavior (Audit / Backend) ─────────────────────
console.log('\n─── 4. Collector Notification Behavior ──────────────────────────');

check(contains(beNotifRoutes.content, 'authenticate'), 'COL-01', 'Backend notification endpoints available to authenticated collectors');
check(contains(beReqSvc.content, 'REQUEST_CANCELLED'), 'COL-02', 'REQUEST_CANCELLED emitted on citizen cancellation');
check(contains(beConsignSvc.content, 'CONSIGNMENT_ACCEPTED'), 'COL-03', 'CONSIGNMENT_ACCEPTED emitted on recycler acceptance');
check(contains(beConsignSvc.content, 'CONSIGNMENT_REJECTED'), 'COL-04', 'CONSIGNMENT_REJECTED emitted on recycler rejection');
check(!contains(collectorNav.content, 'CitizenNotificationsScreen'), 'COL-05', 'CollectorNavigator does not mount CitizenNotificationsScreen (role isolation)');

// ─── 5. Recycler Notification Behavior (Audit / Backend) ──────────────────────
console.log('\n─── 5. Recycler Notification Behavior ───────────────────────────');

check(contains(beConsignSvc.content, 'CONSIGNMENT_INCOMING'), 'REC-01', 'CONSIGNMENT_INCOMING emitted when collector consign batch');
check(contains(beConsignSvc.content, 'recyclerProfile.userId'), 'REC-02', 'Consignment notification targets specific facility user');
check(!contains(recyclerNav.content, 'CitizenNotificationsScreen'), 'REC-03', 'RecyclerNavigator does not mount CitizenNotificationsScreen (role isolation)');

// ─── 6. Admin Notification Behavior (Audit) ───────────────────────────────────
console.log('\n─── 6. Admin Notification Behavior ──────────────────────────────');

check(!contains(beVerifSvc.content, 'notificationService.createNotification') || !contains(beVerifSvc.content, 'ADMIN'), 'ADM-01', 'Admin does not receive self-notifications (governed via Audit Logs)');
check(!contains(adminNav.content, 'CitizenNotificationsScreen'), 'ADM-02', 'AdminNavigator does not mount CitizenNotificationsScreen');
check(contains(beVerifSvc.content, 'auditService.logAction'), 'ADM-03', 'Admin verification actions governed through immutable audit trail');

// ─── 7. Notification Ownership Isolation & Security ───────────────────────────
console.log('\n─── 7. Notification Ownership Isolation & Security ──────────────');

check(contains(beNotifSvc.content, 'where = { userId }') || contains(beNotifSvc.content, 'where: { userId }'), 'SEC-01', 'listNotifications scopes query strictly to authenticated userId');
check(contains(beNotifSvc.content, 'userId,\n        isRead: false') || contains(beNotifSvc.content, 'userId') && contains(beNotifSvc.content, 'isRead: false'), 'SEC-02', 'getUnreadCount scopes query strictly to authenticated userId');
check(contains(beNotifSvc.content, 'notification.userId !== userId'), 'SEC-03', 'markAsRead blocks cross-user notification updates with 403 Forbidden');
check(contains(beNotifSvc.content, 'userId,\n        isRead: false') || contains(beNotifSvc.content, 'userId') && contains(beNotifSvc.content, 'updateMany'), 'SEC-04', 'markAllAsRead updates only current user notifications');
check(!contains(beNotifRoutes.content, "router.post(\n  '/'") && !contains(beNotifRoutes.content, "router.post('/')") && !contains(beNotifRoutes.content, 'createNotification'), 'SEC-05', 'No client-accessible notification creation endpoint exists');

// ─── 8. Unread Count Behavior ─────────────────────────────────────────────────
console.log('\n─── 8. Unread Count Behavior ────────────────────────────────────');

check(contains(beNotifRoutes.content, "router.get(\n  '/count'") || contains(beNotifRoutes.content, "'/count'"), 'CNT-01', 'GET /api/v1/notifications/count registered before /:id');
check(contains(mobNotifSvc.content, "apiClient.get('/notifications/count')"), 'CNT-02', 'Mobile calls GET /notifications/count');
check(contains(mobNotifSvc.content, '@ecosetu_notifications_unread_count'), 'CNT-03', 'Mobile caches unread count in @ecosetu_notifications_unread_count');

// ─── 9. Read Mutation Behavior ────────────────────────────────────────────────
console.log('\n─── 9. Read Mutation Behavior ───────────────────────────────────');

check(contains(beNotifRoutes.content, "'/:id/read'"), 'RED-01', 'PATCH /api/v1/notifications/:id/read mounted');
check(contains(mobNotifSvc.content, "apiClient.patch(`/notifications/${notificationId}/read`"), 'RED-02', 'Mobile calls PATCH /notifications/:id/read');
check(contains(mobNotifSvc.content, 'isOfflineError') || contains(mobNotifSvc.content, 'Cannot mark'), 'RED-03', 'Mobile blocks markAsRead when offline (throws isOfflineError)');
check(contains(mobNotifSvc.content, 'AsyncStorage.setItem(CACHE_KEY'), 'RED-04', 'markAsRead reconciles local cache state');

// ─── 10. Read-All Mutation Behavior ───────────────────────────────────────────
console.log('\n─── 10. Read-All Mutation Behavior ──────────────────────────────');

check(contains(beNotifRoutes.content, "'/read-all'"), 'RDA-01', 'PATCH /api/v1/notifications/read-all mounted before /:id/read');
check(contains(mobNotifSvc.content, "apiClient.patch('/notifications/read-all'"), 'RDA-02', 'Mobile calls PATCH /notifications/read-all');
check(contains(mobNotifSvc.content, 'isOfflineError') || contains(mobNotifSvc.content, 'Cannot mark'), 'RDA-03', 'Mobile blocks markAllAsRead when offline');
check(contains(mobNotifSvc.content, 'AsyncStorage.setItem(COUNT_CACHE_KEY, \'0\')'), 'RDA-04', 'markAllAsRead sets unread count cache to 0');

// ─── 11. Offline Read-Only Behavior ───────────────────────────────────────────
console.log('\n─── 11. Offline Read-Only Behavior ──────────────────────────────');

check(contains(mobNotifSvc.content, '_getCachedNotifications'), 'OFF-01', 'Mobile falls back to cached notifications when offline');
check(contains(mobNotifSvc.content, 'fromCache: true'), 'OFF-02', 'Returns fromCache: true when serving from cache');
check(contains(citizenNotifScr.content, 'OfflineBanner'), 'OFF-03', 'CitizenNotificationsScreen displays OfflineBanner when offline');
check(contains(citizenNotifScr.content, 'fromCache') && contains(citizenNotifScr.content, 'cachedNotice'), 'OFF-04', 'Displays cached data notice when viewing cached notifications');

// ─── 12. Cache Consistency & Optimistic Rollback ──────────────────────────────
console.log('\n─── 12. Cache Consistency & Optimistic Rollback ─────────────────');

check(contains(citizenNotifScr.content, 'setNotifications((prev) =>') && contains(citizenNotifScr.content, 'isRead: true'), 'CCH-01', 'Screen optimistically marks notification as read');
check(contains(citizenNotifScr.content, 'isRead: false'), 'CCH-02', 'Screen rolls back optimistic update on API failure');
check(contains(citizenNotifScr.content, 'pendingMarkRead'), 'CCH-03', 'Prevents duplicate in-flight mark-read requests');
check(contains(citizenNotifScr.content, 'isMarkingAll'), 'CCH-04', 'Prevents duplicate in-flight mark-all-read requests');
check(contains(citizenNotifScr.content, 'seen = new Set()') || contains(citizenNotifScr.content, 'uniqueList'), 'CCH-05', 'Screen deduplicates notification list by ID on load');

// ─── 13. Idempotency & Duplicate Prevention in Triggers ───────────────────────
console.log('\n─── 13. Idempotency & Duplicate Prevention ──────────────────────');

check(contains(beReqSvc.content, 'REQUEST_STATUS.SUBMITTED') && (contains(beReqSvc.content, 'badRequest') || contains(beReqSvc.content, 'conflict') || contains(beReqSvc.content, '409')), 'IDM-01', 'Request acceptance enforces SUBMITTED guard before notifying');
check(contains(bePickupSvc.content, 'PICKUP_STATUS.IN_PROGRESS') && (contains(bePickupSvc.content, 'badRequest') || contains(bePickupSvc.content, 'conflict')), 'IDM-02', 'Pickup completion enforces IN_PROGRESS guard before notifying');
check(contains(beConsignSvc.content, 'CONSIGNMENT_STATUS.DELIVERED') && (contains(beConsignSvc.content, 'badRequest') || contains(beConsignSvc.content, 'conflict')), 'IDM-03', 'Consignment acceptance enforces DELIVERED guard before notifying');
check(contains(beRecyclingSvc.content, 'RECYCLING_STATUS.PROCESSING') && (contains(beRecyclingSvc.content, 'badRequest') || contains(beRecyclingSvc.content, 'conflict')), 'IDM-04', 'Recycling completion enforces PROCESSING guard before notifying');
check(contains(beRecyclingSvc.content, 'new Set'), 'IDM-05', 'Recycling completion deduplicates citizen recipient IDs');
check(contains(beUserSvc.content, 'previousStatus !== USER_STATUS.SUSPENDED') || contains(beUserSvc.content, 'targetUser.status !== USER_STATUS.SUSPENDED'), 'IDM-06', 'Suspension notification is idempotent (not sent if already suspended)');
check(contains(beVerifSvc.content, 'VERIFICATION_STATUS.PENDING') && (contains(beVerifSvc.content, 'conflict') || contains(beVerifSvc.content, '409')), 'IDM-07', 'Verification review enforces PENDING guard (409 on duplicate review)');

// ─── 14. Verification Notifications ───────────────────────────────────────────
console.log('\n─── 14. Verification Notifications ──────────────────────────────');

check(contains(beVerifSvc.content, 'VERIFICATION_APPROVED'), 'VRF-01', 'verificationService sends VERIFICATION_APPROVED on approval');
check(contains(beVerifSvc.content, 'VERIFICATION_REJECTED'), 'VRF-02', 'verificationService sends VERIFICATION_REJECTED on rejection');
check(contains(beVerifSvc.content, 'referenceType: \'verification\''), 'VRF-03', 'Verification notifications reference verification entity');

// ─── 15. Consignment Notifications ────────────────────────────────────────────
console.log('\n─── 15. Consignment Notifications ───────────────────────────────');

check(contains(beConsignSvc.content, 'CONSIGNMENT_INCOMING'), 'CSG-01', 'consignmentService sends CONSIGNMENT_INCOMING on consignment creation');
check(contains(beConsignSvc.content, 'CONSIGNMENT_ACCEPTED'), 'CSG-02', 'consignmentService sends CONSIGNMENT_ACCEPTED on consignment acceptance');
check(contains(beConsignSvc.content, 'CONSIGNMENT_REJECTED'), 'CSG-03', 'consignmentService sends CONSIGNMENT_REJECTED on consignment rejection');

// ─── 16. Recycling Completion Notifications ───────────────────────────────────
console.log('\n─── 16. Recycling Completion Notifications ──────────────────────');

check(contains(beRecyclingSvc.content, 'RECYCLING_COMPLETED'), 'REC-04', 'recyclingService sends RECYCLING_COMPLETED on processing completion');
check(contains(beRecyclingSvc.content, 'referenceType: \'recycling_record\''), 'REC-05', 'Recycling notification references recycling_record entity');

// ─── 17. Account Status Notifications ─────────────────────────────────────────
console.log('\n─── 17. Account Status Notifications ────────────────────────────');

check(contains(beUserSvc.content, 'ACCOUNT_SUSPENDED'), 'USR-01', 'userService sends ACCOUNT_SUSPENDED on suspension');
check(contains(beUserSvc.content, 'ACCOUNT_REACTIVATED'), 'USR-02', 'userService sends ACCOUNT_REACTIVATED on reactivation');
check(contains(beUserSvc.content, 'referenceType: \'user\''), 'USR-03', 'Account status notifications reference user entity');

// ─── 18. End-to-End Notification Propagation ─────────────────────────────────
console.log('\n─── 18. End-to-End Notification Propagation ─────────────────────');

check(contains(schemaFile.content, 'model Notification'), 'E2E-01', 'Notification model defined in PostgreSQL Prisma schema');
check(contains(schemaFile.content, 'idx_n_read'), 'E2E-02', 'Composite index idx_n_read optimizes unread queries');
check(contains(beNotifSvc.content, 'notification.create'), 'E2E-03', 'notificationService persists notifications server-side');
check(contains(citizenNotifScr.content, 'notificationService.getNotifications'), 'E2E-04', 'Mobile displays server-persisted notifications in UI');
check(contains(citizenNotifScr.content, 'unreadNotificationsCount'), 'E2E-05', 'TopAppBar displays authoritative server unread badge');

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
console.log(`  ECOSETU NOTIFICATION INTEGRATION SUMMARY`);
console.log(`  Passed: ${passed} / ${passed + failed} (${Math.round((passed / (passed + failed)) * 100)}%)`);
if (failed > 0) {
  console.log(`  Failed: ${failed}`);
  failures.forEach((f) => console.log(`    - [${f.testId}] ${f.description}: ${f.detail}`));
}
console.log('════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
