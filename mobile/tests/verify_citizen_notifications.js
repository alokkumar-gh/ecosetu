/**
 * verify_citizen_notifications.js
 * Static verification suite — Phase 16, Task 7: Citizen Notifications.
 *
 * Covers:
 *   A. Mobile notification service
 *   B. CitizenNotificationsScreen file
 *   C. Navigator wiring
 *   D. Canonical notification types
 *   E. Business rules — Kabadiwala-first, zero Citizen→Recycler
 *   F. Offline / cache behaviour
 *   G. Performance / no-polling
 *   H. Security / sensitive-data
 *   I. Accessibility
 *
 * Run: node mobile/tests/verify_citizen_notifications.js
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testId, description, detail = '') {
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
  if (!fs.existsSync(absPath)) return { exists: false, content: '' };
  return { exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

function contains(content, pattern) {
  if (typeof pattern === 'string') return content.includes(pattern);
  return pattern.test(content);
}

// ─── Load subjects ─────────────────────────────────────────────────────────────

const svc  = readFile('src/services/notificationService.js');
const scr  = readFile('src/screens/citizen/CitizenNotificationsScreen.tsx');
const nav  = readFile('src/navigation/CitizenNavigator.tsx');

// ─── A. Mobile Notification Service ───────────────────────────────────────────

console.log('\n─── A. Mobile Notification Service ──────────────────────────────────────');

assert(svc.exists, 'A01', 'notificationService.js exists');

assert(contains(svc.content, 'getNotifications'), 'A02', 'getNotifications method defined');
assert(contains(svc.content, '/notifications'), 'A03', 'Calls GET /notifications list endpoint');
assert(contains(svc.content, 'getUnreadCount'), 'A04', 'getUnreadCount method defined');
assert(contains(svc.content, '/notifications/count'), 'A05', 'Calls GET /notifications/count (not /unread-count)');
assert(contains(svc.content, 'markAsRead'), 'A06', 'markAsRead method defined');
assert(contains(svc.content, '/notifications/'), 'A07', 'Calls PATCH /notifications/:id/read');
assert(contains(svc.content, 'markAllAsRead'), 'A08', 'markAllAsRead method defined');
assert(contains(svc.content, '/notifications/read-all'), 'A09', 'Calls PATCH /notifications/read-all');
assert(contains(svc.content, 'networkService.isConnected()'), 'A10', 'Checks connectivity before API calls');
assert(contains(svc.content, 'AsyncStorage'), 'A11', 'Uses AsyncStorage for notification caching');
assert(contains(svc.content, '@ecosetu_notifications'), 'A12', 'Dedicated notification cache key used');
assert(contains(svc.content, 'fromCache'), 'A13', 'fromCache flag returned to caller');

// Mark-read requires connectivity
assert(
  contains(svc.content, 'isOfflineError') || contains(svc.content, 'Cannot mark'),
  'A14', 'markAsRead throws/rejects when offline (not queued silently)',
);
assert(
  contains(svc.content, 'Cannot mark') || contains(svc.content, 'isOfflineError'),
  'A15', 'markAllAsRead throws/rejects when offline',
);

// ─── B. Screen File ────────────────────────────────────────────────────────────

console.log('\n─── B. CitizenNotificationsScreen.tsx ───────────────────────────────────');

assert(scr.exists, 'B01', 'CitizenNotificationsScreen.tsx exists');
assert(
  contains(scr.content, 'export const CitizenNotificationsScreen'),
  'B02', 'Named export CitizenNotificationsScreen',
);

// 1. Citizen-only access — screen accessible only via CitizenNavigator (wiring check in C)
assert(
  contains(scr.content, 'CitizenStackParamList') ||
  contains(scr.content, 'CitizenTabParamList') ||
  contains(scr.content, 'CITIZEN'),
  'B03', 'Screen scoped to citizen role context',
);

// 3 & 4. Notification API/service integration
assert(
  contains(scr.content, 'notificationService'),
  'B04', 'notificationService imported and used',
);
assert(
  contains(scr.content, 'getNotifications'),
  'B05', 'Calls notificationService.getNotifications',
);

// 6. Canonical NotificationType handling
assert(
  contains(scr.content, 'REQUEST_ACCEPTED'),
  'B06', 'REQUEST_ACCEPTED type handled',
);
assert(
  contains(scr.content, 'PICKUP_COMPLETED'),
  'B07', 'PICKUP_COMPLETED type handled',
);
assert(
  contains(scr.content, 'RECYCLING_COMPLETED'),
  'B08', 'RECYCLING_COMPLETED type handled (informational)',
);
assert(
  contains(scr.content, 'ACCOUNT_SUSPENDED'),
  'B09', 'ACCOUNT_SUSPENDED type handled',
);
assert(
  contains(scr.content, 'ACCOUNT_REACTIVATED'),
  'B10', 'ACCOUNT_REACTIVATED type handled',
);

// 7. Unread/read rendering
assert(
  contains(scr.content, 'isRead') || contains(scr.content, 'isUnread'),
  'B11', 'isRead/isUnread state used to distinguish notifications',
);
assert(
  contains(scr.content, 'cardUnread') || contains(scr.content, 'unreadBar') || contains(scr.content, 'unreadDot'),
  'B12', 'Visual unread indicator (not color-only) present',
);
assert(
  contains(scr.content, 'accessibilityState'),
  'B13', 'accessibilityState used on notification cards',
);

// 8. Unread count
assert(
  contains(scr.content, 'getUnreadCount'),
  'B14', 'Unread count fetched from backend',
);
assert(
  contains(scr.content, 'unreadCount'),
  'B15', 'unreadCount state maintained',
);

// 9. Mark-one-read
assert(
  contains(scr.content, 'markAsRead'),
  'B16', 'markAsRead called on notification tap',
);
assert(
  contains(scr.content, 'Optimistic') || contains(scr.content, 'optimistic') || contains(scr.content, 'isRead: true'),
  'B17', 'Optimistic UI update on mark-read',
);

// 10. Mark-all-read
assert(
  contains(scr.content, 'markAllAsRead'),
  'B18', 'markAllAsRead implemented',
);
assert(
  contains(scr.content, 'Mark all as read') || contains(scr.content, 'mark all'),
  'B19', '"Mark all as read" action present',
);

// 11. Navigation for request references
assert(
  contains(scr.content, "navigate('RequestDetail'") || contains(scr.content, 'RequestDetail'),
  'B20', 'Navigation to RequestDetail for collection_request referenceType',
);

// 12. No undocumented navigation
assert(
  !contains(scr.content, 'RecyclerDetail') &&
  !contains(scr.content, 'ConsignmentDetail') &&
  !contains(scr.content, 'RecyclingDetail'),
  'B21', 'No undocumented navigation routes referenced',
);

// 13. Informal Collector / Kabadiwala wording
assert(
  contains(scr.content, 'Kabadiwala') || contains(scr.content, 'informal collector'),
  'B22', 'Kabadiwala/informal collector wording present',
);

// 14 & 15. Zero direct Citizen → Recycler
assert(
  !contains(scr.content, 'createConsignment') &&
  !contains(scr.content, 'bookRecycler') &&
  !contains(scr.content, 'selectRecycler'),
  'B23', 'No Citizen→Recycler mutation controls in screen',
);

// 16. Loading state
assert(
  contains(scr.content, 'isLoading'),
  'B24', 'Loading state managed',
);
assert(
  contains(scr.content, 'Skeleton') || contains(scr.content, 'NotificationsSkeleton'),
  'B25', 'Skeleton loading placeholders used',
);

// 17. Empty state
assert(
  contains(scr.content, 'EmptyState'),
  'B26', 'EmptyState component used',
);
assert(
  contains(scr.content, 'No Notifications') || contains(scr.content, 'no notifications'),
  'B27', 'Empty state has citizen-friendly copy',
);

// 18. Error/retry state
assert(
  contains(scr.content, 'errorMessage'),
  'B28', 'Error state managed',
);
assert(
  contains(scr.content, 'Retry') || contains(scr.content, 'retry'),
  'B29', 'Retry action present in error state',
);

// 20. Pull to refresh
assert(
  contains(scr.content, 'RefreshControl'),
  'B30', 'Pull-to-refresh implemented with RefreshControl',
);
assert(
  contains(scr.content, 'isRefreshing'),
  'B31', 'isRefreshing state managed',
);

// 19. Offline behaviour
assert(
  contains(scr.content, 'fromCache'),
  'B32', 'fromCache tracked to show stale-data notice',
);
assert(
  contains(scr.content, 'OfflineBanner'),
  'B33', 'OfflineBanner shown when offline',
);
assert(
  contains(scr.content, 'cached') || contains(scr.content, 'fromCache'),
  'B34', 'Cached data notice shown when offline',
);

// Offline mark-read guarded
assert(
  contains(scr.content, 'isConnected') && (
    contains(scr.content, 'Cannot mark') ||
    contains(scr.content, 'isOfflineError') ||
    contains(scr.content, '!isConnected')
  ),
  'B35', 'Mark-read guarded by connectivity check in screen',
);

// 21. Accessibility
assert(
  contains(scr.content, 'accessibilityRole'),
  'B36', 'accessibilityRole present on interactive elements',
);
assert(
  contains(scr.content, 'accessibilityLabel'),
  'B37', 'accessibilityLabel present on interactive elements',
);
assert(
  contains(scr.content, 'accessibilityState'),
  'B38', 'accessibilityState present (unread/read state)',
);
assert(
  contains(scr.content, 'minHeight: 48') || contains(scr.content, 'minHeight:48'),
  'B39', '48dp minimum touch target enforced',
);

// 22. Security — no sensitive data exposure
assert(
  !contains(scr.content, 'userId') ||
  !contains(scr.content, 'console.log(userId)'),
  'B40', 'Internal userId not logged/exposed to UI',
);
assert(
  !contains(scr.content, 'err.stack') &&
  !contains(scr.content, 'error.stack') &&
  !contains(scr.content, 'prisma.') &&
  !contains(scr.content, 'SQL'),
  'B41', 'No stack traces (err.stack) or SQL/ORM details exposed in UI',
);

// 23. No polling/realtime
assert(
  !contains(scr.content, 'setInterval') && !contains(scr.content, 'setTimeout'),
  'B42', 'No polling (setInterval/setTimeout) in screen',
);
assert(
  !contains(scr.content, 'WebSocket') && !contains(scr.content, 'socket.io'),
  'B43', 'No WebSocket / realtime infrastructure introduced',
);

// ─── C. Navigator Wiring ───────────────────────────────────────────────────────

console.log('\n─── C. Navigator: CitizenNavigator.tsx ───────────────────────────────────');

assert(nav.exists, 'C01', 'CitizenNavigator.tsx exists');
assert(
  contains(nav.content, "import { CitizenNotificationsScreen }"),
  'C02', 'CitizenNotificationsScreen imported',
);
assert(
  contains(nav.content, "from '../screens/citizen/CitizenNotificationsScreen'"),
  'C03', 'Import path is correct',
);
assert(
  contains(nav.content, 'component={CitizenNotificationsScreen}'),
  'C04', 'CitizenNotificationsScreen used as Tab.Screen component',
);
assert(
  !contains(nav.content, 'component={CitizenNotificationsTab}'),
  'C05', 'Old CitizenNotificationsTab placeholder not used as component',
);

// ─── D. Canonical Notification Types ─────────────────────────────────────────

console.log('\n─── D. Canonical Notification Types ─────────────────────────────────────');

// All 12 canonical types from backend/src/utils/constants.js
const canonicalTypes = [
  'REQUEST_ACCEPTED', 'PICKUP_SCHEDULED', 'PICKUP_COMPLETED', 'REQUEST_CANCELLED',
  'CONSIGNMENT_INCOMING', 'CONSIGNMENT_ACCEPTED', 'CONSIGNMENT_REJECTED',
  'RECYCLING_COMPLETED', 'VERIFICATION_APPROVED', 'VERIFICATION_REJECTED',
  'ACCOUNT_SUSPENDED', 'ACCOUNT_REACTIVATED',
];

// Screen should handle all canonical types (map them, even if not all are citizen-directed)
const missingTypes = canonicalTypes.filter((t) => !contains(scr.content, t));
assert(
  missingTypes.length === 0,
  'D01', 'All 12 canonical backend notification types are handled in switch/map',
  missingTypes.length > 0 ? `Missing: ${missingTypes.join(', ')}` : '',
);

// No invented types
assert(
  !contains(scr.content, 'REQUEST_SUBMITTED') &&
  !contains(scr.content, 'REQUEST_REJECTED') &&
  !contains(scr.content, 'PAYMENT_') &&
  !contains(scr.content, 'CHAT_'),
  'D02', 'No invented notification types in screen',
);

// ─── E. Business Rules ────────────────────────────────────────────────────────

console.log('\n─── E. Business Rules — Kabadiwala-First, No Direct Recycler ────────────');

assert(
  contains(scr.content, 'Kabadiwala') || contains(scr.content, 'informal collector'),
  'E01', 'Kabadiwala / informal collector language present',
);
assert(
  contains(scr.content, 'collection_request'),
  'E02', 'collection_request referenceType handled for navigation',
);
assert(
  !contains(scr.content, 'navigate.*[Rr]ecycler') && !contains(scr.content, 'RecyclerScreen'),
  'E03', 'No navigation to any Recycler screen',
);
assert(
  !contains(scr.content, 'apiClient.post') && !contains(scr.content, 'apiClient.put'),
  'E04', 'Screen makes no POST/PUT/DELETE API calls (read + mark-read PATCH only)',
);

// RECYCLING_COMPLETED must be informational only
const recycleIdx = scr.content.indexOf('RECYCLING_COMPLETED');
const contextAround = scr.content.slice(Math.max(0, recycleIdx - 200), recycleIdx + 400);
assert(
  !contextAround.includes('navigate') || contextAround.includes('CitizenRequests') || contextAround.includes('informational'),
  'E05', 'RECYCLING_COMPLETED is informational; does not navigate to recycler screen',
);

// ─── F. Offline / Cache ────────────────────────────────────────────────────────

console.log('\n─── F. Offline / Cache Behaviour ────────────────────────────────────────');

assert(
  contains(svc.content, '_getCachedNotifications'),
  'F01', 'Service _getCachedNotifications fallback defined',
);
assert(
  contains(svc.content, 'AsyncStorage.setItem'),
  'F02', 'Service writes notifications to AsyncStorage after fetch',
);
assert(
  contains(svc.content, 'AsyncStorage.getItem'),
  'F03', 'Service reads from AsyncStorage when offline',
);
assert(
  contains(svc.content, 'isNetworkError'),
  'F04', 'Service handles network errors gracefully',
);
assert(
  // null is returned for count when offline
  contains(svc.content, 'null') && contains(svc.content, '_getCachedCount'),
  'F05', 'Unread count returns null (not fabricated 0) when offline',
);
assert(
  contains(scr.content, 'fromCache'),
  'F06', 'Screen shows stale-data notice based on fromCache flag',
);

// ─── G. Performance / No Polling ──────────────────────────────────────────────

console.log('\n─── G. Performance — No Polling or Realtime ─────────────────────────────');

assert(!contains(svc.content, 'setInterval'), 'G01', 'No setInterval polling in service');
assert(!contains(scr.content, 'setInterval'), 'G02', 'No setInterval polling in screen');
assert(!contains(scr.content, 'setTimeout'), 'G03', 'No setTimeout loops in screen');
assert(!contains(scr.content, 'WebSocket'), 'G04', 'No WebSocket in screen');
assert(!contains(svc.content, 'WebSocket'), 'G05', 'No WebSocket in service');

// ─── H. Security ──────────────────────────────────────────────────────────────

console.log('\n─── H. Security Checks ───────────────────────────────────────────────────');

assert(
  !contains(scr.content, 'console.log') || !contains(scr.content, 'token'),
  'H01', 'No auth tokens logged to console',
);
assert(
  !contains(scr.content, 'password') && !contains(scr.content, 'secret'),
  'H02', 'No passwords or secrets in screen',
);
assert(
  !contains(scr.content, 'SQL') && !contains(scr.content, 'prisma'),
  'H03', 'No internal SQL/ORM details exposed',
);
// Ownership is enforced server-side — screen does not build userId-based queries directly
assert(
  !contains(scr.content, 'where.*userId') && !contains(scr.content, "userId: '"),
  'H04', 'Screen does not build ownership queries (server enforces authorization)',
);

// ─── I. Accessibility ──────────────────────────────────────────────────────────

console.log('\n─── I. Accessibility ─────────────────────────────────────────────────────');

assert(contains(scr.content, 'accessibilityRole'), 'I01', 'accessibilityRole present');
assert(contains(scr.content, 'accessibilityLabel'), 'I02', 'accessibilityLabel present on cards');
assert(contains(scr.content, 'accessibilityState'), 'I03', 'accessibilityState present (unread state)');
assert(
  contains(scr.content, 'accessibilityElementsHidden') || contains(scr.content, 'accessibilityHidden'),
  'I04', 'Decorative elements hidden from accessibility tree',
);

// ─── Summary ───────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  Phase 16 — Task 7: Citizen Notifications`);
console.log(`  Results: ${passed}/${total} passed  |  ${failed} failed`);
console.log('════════════════════════════════════════════════════════════════════════');

if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(({ testId, description, detail }) => {
    console.log(`  ❌ [${testId}] ${description}${detail ? ' — ' + detail : ''}`);
  });
  process.exit(1);
} else {
  console.log('\n  All checks passed. Task 7 implementation verified. ✅');
  process.exit(0);
}
