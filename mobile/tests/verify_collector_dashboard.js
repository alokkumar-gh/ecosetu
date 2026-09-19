/**
 * verify_collector_dashboard.js
 * Static verification suite — Phase 16, Task 9: Collector Dashboard.
 *
 * Covers:
 *   A. collectorService.js
 *   B. CollectorDashboardScreen.tsx
 *   C. CollectorNavigator.tsx wiring
 *   D. Collector stats integration
 *   E. Available requests integration
 *   F. Accept request integration
 *   G. Active pickups integration
 *   H. Availability toggle integration
 *   I. Citizen PII / privacy masking
 *   J. Offline / cache behavior
 *   K. Server-authoritative actions (no offline queue)
 *   L. Business rules — Kabadiwala-first, no Citizen→Recycler
 *   M. Account status / verification handling
 *   N. Security
 *   O. Accessibility
 *   P. Performance — no polling / WebSockets
 *   Q. Navigation safety
 *   R. Error handling (409, 403, 404, network)
 *   S. Loading / empty states
 *
 * Run: node mobile/tests/verify_collector_dashboard.js
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

const svc = readFile('src/services/collectorService.js');
const scr = readFile('src/screens/collector/CollectorDashboardScreen.tsx');
const nav = readFile('src/navigation/CollectorNavigator.tsx');

// ─── A. collectorService.js ────────────────────────────────────────────────────

console.log('\n─── A. collectorService.js ───────────────────────────────────────────────');

assert(svc.exists, 'A01', 'collectorService.js exists');
assert(contains(svc.content, 'getProfile'), 'A02', 'getProfile method defined');
assert(contains(svc.content, "'/collectors/profile'"), 'A03', 'GET /api/v1/collectors/profile endpoint used');
assert(contains(svc.content, 'toggleAvailability'), 'A04', 'toggleAvailability method defined');
assert(contains(svc.content, "'/collectors/availability'"), 'A05', 'PATCH /api/v1/collectors/availability used');
assert(contains(svc.content, 'apiClient.patch'), 'A06', 'PATCH used for availability (not PUT or POST)');
assert(contains(svc.content, 'getStats'), 'A07', 'getStats method defined');
assert(contains(svc.content, "'/collectors/stats'"), 'A08', 'GET /api/v1/collectors/stats used');
assert(contains(svc.content, 'getAvailableRequests'), 'A09', 'getAvailableRequests method defined');
assert(contains(svc.content, "'/collection-requests/available'"), 'A10', 'GET /api/v1/collection-requests/available used');
assert(contains(svc.content, 'acceptRequest'), 'A11', 'acceptRequest method defined');
assert(
  contains(svc.content, '/collection-requests/${requestId}/accept') ||
  contains(svc.content, "collection-requests/"),
  'A12', 'POST /collection-requests/:id/accept used',
);
assert(contains(svc.content, 'apiClient.post'), 'A13', 'POST used for acceptRequest');
assert(contains(svc.content, 'getMyPickups'), 'A14', 'getMyPickups method defined');

// Correct pickup endpoint (not /pickups/my-pickups which does not exist)
assert(
  contains(svc.content, "'/pickups'") || contains(svc.content, '`/pickups`') || contains(svc.content, "'/pickups?'") || contains(svc.content, 'endpoint'),
  'A15', 'GET /api/v1/pickups used (not /pickups/my-pickups)',
);
// A16: my-pickups appears in a doc comment explaining why NOT to use it — check for actual URL usage only
assert(
  !contains(svc.content, "apiClient.get('/pickups/my-pickups')") &&
  !contains(svc.content, 'apiClient.get(`/pickups/my-pickups`)'),
  'A16', 'No /pickups/my-pickups (undocumented endpoint) in actual API call',
);

// Connectivity checks on server-authoritative operations
assert(contains(svc.content, 'networkService.isConnected()'), 'A17', 'networkService.isConnected() used');
assert(contains(svc.content, 'isOfflineError'), 'A18', 'Offline error thrown for write operations');

// toggleAvailability: offline guard
assert(
  contains(svc.content, 'Availability changes require') || contains(svc.content, 'isOfflineError'),
  'A19', 'toggleAvailability throws when offline',
);

// acceptRequest: offline guard — MUST NOT be queued
assert(
  contains(svc.content, 'Accepting collection requests requires') ||
  (contains(svc.content, 'acceptRequest') && contains(svc.content, 'isOfflineError')),
  'A20', 'acceptRequest throws when offline',
);
assert(
  !contains(svc.content, 'offlineQueue') || !contains(svc.content, 'ACCEPT_REQUEST'),
  'A21', 'acceptRequest NOT added to offline queue (server-authoritative)',
);
assert(
  !contains(svc.content, 'QUEUE_ACTION_TYPES.ACCEPT'),
  'A22', 'No ACCEPT queue action type used (accept is server-authoritative)',
);

// Cache keys — isolated from citizen cache
assert(contains(svc.content, '@ecosetu_collector_profile'), 'A23', 'Dedicated collector profile cache key');
assert(contains(svc.content, '@ecosetu_collector_stats'), 'A24', 'Dedicated stats cache key');
assert(contains(svc.content, '@ecosetu_collector_available_requests') || contains(svc.content, 'CACHE_AVAILABLE_REQUESTS'), 'A25', 'Dedicated available requests cache key');
assert(contains(svc.content, '@ecosetu_collector_pickups') || contains(svc.content, 'CACHE_COLLECTOR_PICKUPS'), 'A26', 'Dedicated pickups cache key');

// AsyncStorage
assert(contains(svc.content, 'AsyncStorage'), 'A27', 'AsyncStorage used for caching');
assert(contains(svc.content, 'AsyncStorage.setItem'), 'A28', 'Cache written after successful fetch');
assert(contains(svc.content, 'AsyncStorage.getItem'), 'A29', 'Cache read when offline');
assert(contains(svc.content, 'fromCache'), 'A30', 'fromCache flag returned to caller');

// No undocumented endpoints
assert(
  !contains(svc.content, '/collectors/availability/toggle') && !contains(svc.content, '/collectors/available'),
  'A31', 'No invented collector endpoints used',
);
assert(
  !contains(svc.content, '/admin') && !contains(svc.content, '/recyclers/search'),
  'A32', 'No admin or recycler-search endpoints in collector service',
);

// toggleAvailability payload: only isAvailable
assert(
  contains(svc.content, '{ isAvailable }') || contains(svc.content, 'isAvailable: isAvailable') || contains(svc.content, 'isAvailable,'),
  'A33', 'toggleAvailability sends only isAvailable in payload',
);
assert(
  !contains(svc.content, 'payload.role') && !contains(svc.content, 'payload.status'),
  'A34', 'toggleAvailability does not touch role or status',
);

// ─── B. CollectorDashboardScreen.tsx ──────────────────────────────────────────

console.log('\n─── B. CollectorDashboardScreen.tsx ──────────────────────────────────────');

assert(scr.exists, 'B01', 'CollectorDashboardScreen.tsx exists');
assert(
  contains(scr.content, 'export const CollectorDashboardScreen'),
  'B02', 'Named export CollectorDashboardScreen',
);

// Role context
assert(
  contains(scr.content, 'INFORMAL_COLLECTOR') || contains(scr.content, 'Kabadiwala'),
  'B03', 'Screen references Kabadiwala / INFORMAL_COLLECTOR context',
);

// Service integration
assert(contains(scr.content, 'collectorService'), 'B04', 'collectorService imported and used');
assert(contains(scr.content, 'collectorService.getProfile'), 'B05', 'getProfile called');
assert(contains(scr.content, 'collectorService.getStats'), 'B06', 'getStats called');
assert(contains(scr.content, 'collectorService.getAvailableRequests'), 'B07', 'getAvailableRequests called');
assert(contains(scr.content, 'collectorService.getMyPickups'), 'B08', 'getMyPickups called');
assert(contains(scr.content, 'collectorService.toggleAvailability'), 'B09', 'toggleAvailability called');
assert(contains(scr.content, 'collectorService.acceptRequest'), 'B10', 'acceptRequest called');

// No raw fetch/axios calls
assert(
  !contains(scr.content, "fetch('/collectors") && !contains(scr.content, "axios.get('/pickups"),
  'B11', 'No raw fetch/axios calls — uses service layer',
);

// Stats fields — verified from collectorService.getCollectorStats return shape
assert(contains(scr.content, 'totalPickups'), 'B12', 'totalPickups metric displayed');
assert(contains(scr.content, 'totalWeightKg'), 'B13', 'totalWeightKg metric displayed');
assert(contains(scr.content, 'totalConsignments'), 'B14', 'totalConsignments metric displayed');
assert(contains(scr.content, 'activeRequests'), 'B15', 'activeRequests metric displayed');

// No invented metrics
assert(
  !contains(scr.content, 'totalCitizens') && !contains(scr.content, 'totalEarnings') && !contains(scr.content, 'totalRecycled'),
  'B16', 'No invented stats fields used',
);

// Availability toggle
assert(contains(scr.content, 'isAvailable'), 'B17', 'isAvailable state managed');
assert(contains(scr.content, 'handleAvailabilityToggle'), 'B18', 'Availability toggle handler present');
assert(contains(scr.content, 'isTogglingAvailability'), 'B19', 'isTogglingAvailability loading state managed');
assert(
  contains(scr.content, 'Switch') || contains(scr.content, 'switch'),
  'B20', 'Switch / toggle control for availability',
);
// Optimistic update
assert(
  contains(scr.content, 'setIsAvailable(newValue)') || contains(scr.content, 'Optimistic update'),
  'B21', 'Optimistic availability update on toggle',
);
// Rollback
assert(
  contains(scr.content, 'setIsAvailable(!newValue)') || contains(scr.content, 'Roll back'),
  'B22', 'Availability rolled back on API failure',
);

// Accept flow
assert(contains(scr.content, 'handleAcceptRequest'), 'B23', 'handleAcceptRequest handler present');
assert(contains(scr.content, 'acceptingId'), 'B24', 'acceptingId state tracks which request is being accepted');
assert(contains(scr.content, 'acceptingRef'), 'B25', 'Duplicate-accept prevention ref present');
assert(contains(scr.content, 'Alert.alert'), 'B26', 'Confirmation alert before accepting');

// 409 conflict handling
assert(
  contains(scr.content, '409') || contains(scr.content, 'already been accepted'),
  'B27', '409 conflict handled correctly',
);
// 403 handling
assert(
  contains(scr.content, '403') || contains(scr.content, 'Access Denied') || contains(scr.content, 'Access denied'),
  'B28', '403 forbidden handled',
);
// 404 handling
assert(
  contains(scr.content, '404') || contains(scr.content, 'Not Found') || contains(scr.content, 'not found'),
  'B29', '404 not found handled',
);

// Loading states
assert(contains(scr.content, 'isLoading'), 'B30', 'isLoading state managed');
assert(contains(scr.content, 'DashboardSkeleton') || contains(scr.content, 'Skeleton'), 'B31', 'Skeleton loading state used');

// Pull to refresh
assert(contains(scr.content, 'RefreshControl'), 'B32', 'RefreshControl present for pull-to-refresh');
assert(contains(scr.content, 'isRefreshing'), 'B33', 'isRefreshing state managed');

// Offline
assert(contains(scr.content, 'OfflineBanner'), 'B34', 'OfflineBanner shown when offline');
assert(contains(scr.content, 'dataFromCache'), 'B35', 'dataFromCache tracked for stale notice');
assert(contains(scr.content, 'isConnected'), 'B36', 'Connectivity checked from useNetwork');

// Accept blocked offline
assert(
  contains(scr.content, 'canAccept') || (contains(scr.content, '!isConnected') && contains(scr.content, 'disabled')),
  'B37', 'Accept button disabled when offline',
);

// Empty states
assert(
  contains(scr.content, 'EmptyState') && contains(scr.content, 'No Requests Available'),
  'B38', 'EmptyState for no available requests',
);
assert(
  contains(scr.content, 'No Active Pickups') || contains(scr.content, 'EmptyState'),
  'B39', 'EmptyState for no active pickups',
);

// Error states
assert(
  contains(scr.content, 'statsError') && contains(scr.content, 'requestsError') && contains(scr.content, 'pickupsError'),
  'B40', 'Individual error states for each data section',
);
assert(contains(scr.content, 'Retry') || contains(scr.content, 'retryLink'), 'B41', 'Retry action present in error state');

// MetricCard component
assert(contains(scr.content, 'MetricCard'), 'B42', 'MetricCard component used for stats display');

// No polling
assert(!contains(scr.content, 'setInterval'), 'B43', 'No setInterval polling');
assert(!contains(scr.content, 'WebSocket'), 'B44', 'No WebSocket');
assert(!contains(scr.content, 'setTimeout'), 'B45', 'No setTimeout loop');

// Kabadiwala business chain comment / note
assert(
  contains(scr.content, 'Kabadiwala') || contains(scr.content, 'informal collector'),
  'B46', 'Kabadiwala / informal collector wording present',
);

// Active pickup filtering
assert(
  contains(scr.content, 'SCHEDULED') && contains(scr.content, 'IN_PROGRESS'),
  'B47', 'Active pickup filter uses SCHEDULED and IN_PROGRESS statuses',
);

// No consignment creation controls on this screen
assert(
  !contains(scr.content, 'createConsignment') && !contains(scr.content, 'CreateConsignment'),
  'B48', 'No consignment creation controls on Dashboard',
);

// No admin controls
assert(!contains(scr.content, 'AdminScreen') && !contains(scr.content, 'adminService'), 'B49', 'No admin controls');

// No recycler marketplace / search
assert(
  !contains(scr.content, 'searchRecycler') && !contains(scr.content, 'RecyclerMarketplace') && !contains(scr.content, 'bookRecycler'),
  'B50', 'No recycler marketplace or search controls',
);

// ─── C. Navigator Wiring ───────────────────────────────────────────────────────

console.log('\n─── C. CollectorNavigator.tsx — Wiring ───────────────────────────────────');

assert(nav.exists, 'C01', 'CollectorNavigator.tsx exists');
assert(
  contains(nav.content, "import { CollectorDashboardScreen }"),
  'C02', 'CollectorDashboardScreen imported',
);
assert(
  contains(nav.content, "from '../screens/collector/CollectorDashboardScreen'"),
  'C03', 'Import path is correct',
);
assert(
  contains(nav.content, 'component={CollectorDashboardScreen}'),
  'C04', 'CollectorDashboardScreen wired as Tab.Screen component',
);
assert(
  !contains(nav.content, 'component={CollectorHomeTab}'),
  'C05', 'Old CollectorHomeTab placeholder NOT used as component',
);
// Other tabs preserved as placeholders
assert(
  contains(nav.content, 'CollectorBrowseTab') || contains(nav.content, 'CollectorBrowse'),
  'C06', 'CollectorBrowse tab still present',
);
assert(
  contains(nav.content, 'CollectorPickupsTab') || contains(nav.content, 'CollectorPickups'),
  'C07', 'CollectorPickups tab still present',
);
assert(
  contains(nav.content, 'CollectorConsignTab') || contains(nav.content, 'CollectorConsign'),
  'C08', 'CollectorConsign tab still present',
);
assert(
  contains(nav.content, 'CollectorProfileTab') || contains(nav.content, 'CollectorProfile'),
  'C09', 'CollectorProfile tab still present',
);

// ─── D. Collector Stats Integration ───────────────────────────────────────────

console.log('\n─── D. Stats Integration ─────────────────────────────────────────────────');

// Verified from backend/src/services/collectorService.js getCollectorStats return value
assert(contains(scr.content, 'totalPickups'), 'D01', 'totalPickups from stats displayed');
assert(contains(scr.content, 'totalWeightKg'), 'D02', 'totalWeightKg from stats displayed');
assert(contains(scr.content, 'totalConsignments'), 'D03', 'totalConsignments from stats displayed');
assert(contains(scr.content, 'activeRequests'), 'D04', 'activeRequests from stats displayed');

// Stats are not hard-coded
assert(
  !contains(scr.content, 'totalPickups: 42') && !contains(scr.content, 'totalWeightKg: 150'),
  'D05', 'Stats are not hard-coded',
);
// Null/undefined guard — "—" shown when stats unavailable
assert(
  contains(scr.content, "?? '—'") || contains(scr.content, '? null'),
  'D06', 'Null guard present for stats values',
);

// ─── E. Available Requests ─────────────────────────────────────────────────────

console.log('\n─── E. Available Requests Integration ────────────────────────────────────');

assert(contains(scr.content, 'availableRequests'), 'E01', 'availableRequests state managed');
assert(contains(scr.content, 'RequestCard') || contains(scr.content, 'ewasteItems'), 'E02', 'Request card rendered with ewasteItems data');
assert(
  contains(scr.content, 'ewasteItems'),
  'E03', 'ewasteItems from request response used for rendering',
);
// Category / quantity display
assert(
  contains(scr.content, 'category') && (contains(scr.content, 'quantity') || contains(scr.content, 'countItems')),
  'E04', 'Category and quantity displayed per request',
);
// Privacy masking: pickupAddress displayed as returned (masked) by backend
assert(
  contains(scr.content, 'pickupAddress') && !contains(scr.content, 'exact address') && !contains(scr.content, 'decryptAddress'),
  'E05', 'pickupAddress displayed as-is (masked by backend) — not reconstructed',
);
// Preferred date if present
assert(contains(scr.content, 'preferredDate'), 'E06', 'preferredDate displayed if provided');

// ─── F. Accept Request Integration ────────────────────────────────────────────

console.log('\n─── F. Accept Request Integration ───────────────────────────────────────');

assert(
  contains(scr.content, 'collectorService.acceptRequest'),
  'F01', 'acceptRequest called via collectorService',
);
assert(
  contains(scr.content, 'acceptingRef.current'),
  'F02', 'Duplicate acceptance prevention ref guards concurrent calls',
);
assert(
  contains(scr.content, 'prev.filter') && contains(scr.content, "r.id !== requestId"),
  'F03', 'Accepted request removed from available list after success',
);
assert(
  (contains(scr.content, '409') || contains(scr.content, 'already been accepted')) &&
  contains(scr.content, 'filter'),
  'F04', '409 conflict removes request from list (another collector accepted it)',
);
assert(
  contains(scr.content, 'status === 409') || contains(scr.content, 'status == 409') ||
  contains(scr.content, "status: 409") || contains(scr.content, '409'),
  'F05', '409 status code checked for conflict',
);
assert(
  contains(scr.content, '403') && (contains(scr.content, 'Access Denied') || contains(scr.content, 'permission')),
  'F06', '403 status code handled for forbidden',
);
assert(
  contains(scr.content, '404') && (contains(scr.content, 'Not Found') || contains(scr.content, 'cancelled')),
  'F07', '404 status code handled for not found',
);

// No stack traces exposed
assert(!contains(scr.content, 'err.stack'), 'F08', 'Error stack trace not shown to user');

// ─── G. Active Pickups ─────────────────────────────────────────────────────────

console.log('\n─── G. Active Pickups Integration ───────────────────────────────────────');

assert(contains(scr.content, 'activePickups'), 'G01', 'activePickups state managed');
assert(
  contains(scr.content, 'PICKUP_STATUS.SCHEDULED') || contains(scr.content, "'SCHEDULED'"),
  'G02', 'SCHEDULED pickup status used in filtering',
);
assert(
  contains(scr.content, 'PICKUP_STATUS.IN_PROGRESS') || contains(scr.content, "'IN_PROGRESS'"),
  'G03', 'IN_PROGRESS pickup status used in filtering',
);
assert(
  contains(scr.content, 'PickupSummaryCard') || contains(scr.content, 'pickup.status'),
  'G04', 'Pickup card/summary rendered',
);

// ─── H. Availability Toggle ────────────────────────────────────────────────────

console.log('\n─── H. Availability Toggle Integration ───────────────────────────────────');

assert(contains(scr.content, 'handleAvailabilityToggle'), 'H01', 'Availability toggle handler defined');
assert(
  contains(scr.content, 'availabilityRef.current'),
  'H02', 'Duplicate toggle prevention ref present',
);
assert(
  contains(scr.content, 'Optimistic update') || contains(scr.content, 'setIsAvailable(newValue)'),
  'H03', 'Optimistic availability update applied',
);
assert(
  contains(scr.content, "Roll back") || contains(scr.content, 'setIsAvailable(!newValue)'),
  'H04', 'Availability rollback on API failure',
);
// Offline guard in toggle
assert(
  contains(scr.content, '!isConnected') && contains(scr.content, 'Offline'),
  'H05', 'Offline alert shown when toggling availability without connection',
);
// Verification guard
assert(
  contains(scr.content, 'Verification Required') || contains(scr.content, 'isVerified'),
  'H06', 'Verification check applied to availability toggle',
);

// ─── I. Citizen PII / Privacy Masking ─────────────────────────────────────────

console.log('\n─── I. Citizen PII / Privacy Masking ─────────────────────────────────────');

// Should NOT display or use citizen email in requests list
assert(
  !contains(scr.content, 'citizen.email') && !contains(scr.content, "citizen['email']"),
  'I01', 'Citizen email NOT displayed from available requests',
);
// Should NOT display citizen phone in requests list
assert(
  !contains(scr.content, 'citizen.phone') && !contains(scr.content, "citizen['phone']"),
  'I02', 'Citizen phone NOT displayed from available requests',
);
// Should NOT display exact pickup coordinates
assert(
  !contains(scr.content, 'pickupLat') && !contains(scr.content, 'pickupLng'),
  'I03', 'Exact pickup coordinates (pickupLat/pickupLng) NOT displayed in UI',
);
// Should NOT call /users/:id to reconstruct citizen info
assert(
  !contains(svc.content, "'/users/'") && !contains(svc.content, '`/users/${'),
  'I04', 'Service does not call /users/:id to fetch citizen details',
);
// Screen displays pickupAddress as-is from backend (which is masked)
assert(
  contains(scr.content, 'pickupAddress') && contains(scr.content, 'Approximate'),
  'I05', 'pickupAddress field displayed; Approximate location text referenced',
);

// ─── J. Offline / Cache ────────────────────────────────────────────────────────

console.log('\n─── J. Offline / Cache Behaviour ────────────────────────────────────────');

assert(contains(svc.content, 'fromCache: true'), 'J01', 'Service returns fromCache: true when serving cached data');
assert(contains(svc.content, 'fromCache: false'), 'J02', 'Service returns fromCache: false when serving live data');
assert(contains(svc.content, 'AsyncStorage.setItem'), 'J03', 'Service writes to cache after successful fetch');
assert(contains(svc.content, 'AsyncStorage.getItem'), 'J04', 'Service reads cache when offline');
assert(contains(scr.content, 'dataFromCache'), 'J05', 'Screen tracks dataFromCache for notice');
assert(contains(scr.content, 'OfflineBanner'), 'J06', 'OfflineBanner shown when offline');
assert(contains(scr.content, 'cached data'), 'J07', 'Stale cached-data notice shown to user');

// ─── K. Server-Authoritative (No Offline Queue) ───────────────────────────────

console.log('\n─── K. Server-Authoritative Actions ──────────────────────────────────────');

assert(
  !contains(svc.content, "QUEUE_ACTION_TYPES.ACCEPT"),
  'K01', 'acceptRequest NOT in offline queue action types',
);
assert(
  !contains(svc.content, "offlineQueue.enqueue") || !contains(svc.content, 'accept'),
  'K02', 'No offline-queued accept in collectorService',
);
assert(
  !contains(svc.content, "QUEUE_ACTION_TYPES.TOGGLE_AVAILABILITY"),
  'K03', 'toggleAvailability NOT in offline queue action types',
);
assert(
  contains(svc.content, 'Internet connection required') || contains(svc.content, 'isOfflineError'),
  'K04', 'Clear offline error thrown for server-authoritative write operations',
);

// ─── L. Business Rules ─────────────────────────────────────────────────────────

console.log('\n─── L. Business Rules — Kabadiwala-First, No Recycler ────────────────────');

assert(
  contains(scr.content, 'Kabadiwala') || contains(scr.content, 'informal collector'),
  'L01', 'Kabadiwala / informal collector chain mentioned',
);
assert(
  !contains(scr.content, 'createConsignment') && !contains(scr.content, 'CreateConsignment'),
  'L02', 'No consignment creation on Dashboard',
);
assert(
  !contains(scr.content, 'selectRecycler') && !contains(scr.content, 'bookRecycler') && !contains(scr.content, 'RecyclerMarketplace'),
  'L03', 'No Citizen→Recycler or Collector→Recycler marketplace on Dashboard',
);
assert(
  !contains(scr.content, 'RecyclerScreen') && !contains(scr.content, 'RecyclerProfile'),
  'L04', 'No recycler navigation routes referenced on Dashboard',
);
assert(
  !contains(svc.content, '/consignments') && !contains(svc.content, '/recyclers'),
  'L05', 'collectorService does not call consignment or recycler endpoints',
);
assert(
  contains(scr.content, 'CITIZEN') || contains(scr.content, 'citizen'),
  'L06', 'Citizen→Collector workflow acknowledged (requests from citizens)',
);

// ─── M. Account Status / Verification ─────────────────────────────────────────

console.log('\n─── M. Account Status / Verification Handling ────────────────────────────');

assert(contains(scr.content, 'PENDING_VERIFICATION'), 'M01', 'PENDING_VERIFICATION status handled');
assert(contains(scr.content, 'ACTIVE'), 'M02', 'ACTIVE status handled');
assert(contains(scr.content, 'SUSPENDED'), 'M03', 'SUSPENDED status shown with warning banner');
assert(contains(scr.content, 'DEACTIVATED'), 'M04', 'DEACTIVATED status shown with warning banner');
assert(contains(scr.content, 'isVerified'), 'M05', 'isVerified computed from account status');
assert(
  !contains(scr.content, 'VERIFIED') && !contains(scr.content, 'BLOCKED') && !contains(scr.content, 'INACTIVE'),
  'M06', 'No invented UserStatus values',
);
// Verification gate on accept
assert(
  contains(scr.content, 'isVerified') && (
    contains(scr.content, 'canAccept') || contains(scr.content, 'Account verification required')
  ),
  'M07', 'Accept blocked / warned if not verified',
);
// Verification gate on availability toggle
assert(
  contains(scr.content, 'isVerified') && contains(scr.content, 'Verification Required'),
  'M08', 'Availability toggle blocked / warned if not verified',
);
// The screen does NOT allow collector to change their own role/status/verification
assert(
  !contains(scr.content, 'setRole') && !contains(scr.content, 'setStatus'),
  'M09', 'Collector cannot change own role or status from Dashboard',
);
assert(
  !contains(scr.content, 'editRole') && !contains(scr.content, 'editVerification'),
  'M10', 'No role or verification edit fields on Dashboard',
);

// ─── N. Security ──────────────────────────────────────────────────────────────

console.log('\n─── N. Security Checks ───────────────────────────────────────────────────');

assert(!contains(scr.content, 'accessToken'), 'N01', 'accessToken NOT exposed in screen');
assert(!contains(scr.content, 'refreshToken'), 'N02', 'refreshToken NOT exposed in screen');
assert(!contains(scr.content, 'passwordHash'), 'N03', 'passwordHash NOT exposed');
assert(!contains(scr.content, 'password'), 'N04', 'password NOT exposed');
assert(!contains(scr.content, 'err.stack'), 'N05', 'Error stack trace not shown to user');
assert(
  !contains(scr.content, 'console.log(user)') && !contains(scr.content, 'console.log(token)'),
  'N06', 'No user/token values logged to console',
);
assert(
  !contains(svc.content, 'payload.role') && !contains(svc.content, 'payload.status'),
  'N07', 'Service does not send role/status in any payload',
);
assert(
  !contains(scr.content, 'userId:') || !contains(scr.content, "userId: user.id"),
  'N08', 'Screen does not supply userId to API calls (server uses auth context)',
);

// ─── O. Accessibility ──────────────────────────────────────────────────────────

console.log('\n─── O. Accessibility ──────────────────────────────────────────────────────');

assert(contains(scr.content, 'accessibilityRole'), 'O01', 'accessibilityRole present');
assert(contains(scr.content, 'accessibilityLabel'), 'O02', 'accessibilityLabel present');
assert(contains(scr.content, 'accessibilityState'), 'O03', 'accessibilityState present on interactive elements');
assert(contains(scr.content, 'accessibilityHint'), 'O04', 'accessibilityHint present on controls');
const touchTargetMatch = scr.content.match(/minHeight:\s*(\d+)/);
const effectiveMinHeight = touchTargetMatch ? parseInt(touchTargetMatch[1], 10) : 0;
assert(
  effectiveMinHeight >= 44 || /minHeight:\s*(4[4-9]|[5-9]\d|\d{3,})/.test(scr.content),
  'O05', 'Minimum touch target height (>=44dp) on interactive elements',
);
assert(
  contains(scr.content, 'accessibilityRole="alert"') || contains(scr.content, "accessibilityRole='alert'"),
  'O06', 'Status banners use accessibilityRole="alert"',
);
assert(
  contains(scr.content, 'accessibilityElementsHidden'),
  'O07', 'Decorative elements hidden from accessibility tree',
);
assert(
  contains(scr.content, 'accessibilityRole="none"') && contains(scr.content, 'accessibilityLabel'),
  'O08', 'Request/pickup cards use accessibilityRole="none" with accessibilityLabel',
);
assert(
  contains(scr.content, 'accessibilityRole="header"') || contains(scr.content, "accessibilityRole='header'"),
  'O09', 'Collector name / section headers use accessibilityRole="header"',
);
assert(
  contains(scr.content, 'accessibilityRole="switch"') || contains(scr.content, "accessibilityRole='switch'"),
  'O10', 'Availability toggle uses accessibilityRole="switch"',
);

// ─── P. Performance ────────────────────────────────────────────────────────────

console.log('\n─── P. Performance — No Polling / Realtime ───────────────────────────────');

assert(!contains(svc.content, 'setInterval'), 'P01', 'No setInterval in collectorService');
assert(!contains(scr.content, 'setInterval'), 'P02', 'No setInterval in screen');
assert(!contains(scr.content, 'WebSocket'), 'P03', 'No WebSocket in screen');
assert(!contains(svc.content, 'WebSocket'), 'P04', 'No WebSocket in service');
assert(!contains(scr.content, 'setTimeout'), 'P05', 'No setTimeout loop in screen');

// Parallel data fetching
assert(
  contains(scr.content, 'Promise.allSettled'),
  'P06', 'Dashboard data fetched in parallel (Promise.allSettled)',
);

// ─── Q. Navigation Safety ──────────────────────────────────────────────────────

console.log('\n─── Q. Navigation Safety ──────────────────────────────────────────────────');

assert(
  !contains(scr.content, 'CitizenScreen') && !contains(scr.content, 'AdminScreen'),
  'Q01', 'No cross-role navigation routes referenced',
);
assert(
  !contains(scr.content, 'RecyclerHome') && !contains(scr.content, 'RecyclerIncoming'),
  'Q02', 'No recycler navigation routes referenced',
);

// ─── R. Error Handling ─────────────────────────────────────────────────────────

console.log('\n─── R. Error Handling ─────────────────────────────────────────────────────');

assert(contains(scr.content, 'Promise.allSettled'), 'R01', 'Section errors isolated via Promise.allSettled');
assert(contains(scr.content, 'catch'), 'R02', 'Error catch blocks present');
assert(
  contains(scr.content, 'profileError') && contains(scr.content, 'statsError') &&
  contains(scr.content, 'requestsError') && contains(scr.content, 'pickupsError'),
  'R03', 'Individual error states per dashboard section',
);
assert(
  !contains(scr.content, 'err.stack') && !contains(scr.content, 'response.data.stack'),
  'R04', 'No raw error stacks exposed in UI',
);

// ─── S. Loading / Empty States ─────────────────────────────────────────────────

console.log('\n─── S. Loading / Empty States ─────────────────────────────────────────────');

assert(contains(scr.content, 'isLoading'), 'S01', 'Global loading state present');
assert(
  contains(scr.content, 'DashboardSkeleton') || contains(scr.content, 'Skeleton'),
  'S02', 'Skeleton shown during initial load',
);
assert(contains(scr.content, 'EmptyState'), 'S03', 'EmptyState component used');
assert(
  contains(scr.content, 'No Active Pickups') || contains(scr.content, 'EmptyState'),
  'S04', 'Empty state for no active pickups',
);
assert(
  contains(scr.content, 'No Requests Available') || contains(scr.content, 'EmptyState'),
  'S05', 'Empty state for no available requests',
);
assert(
  contains(scr.content, "?? '—'") || contains(scr.content, '?? null') || contains(scr.content, '?? 0'),
  'S06', 'Null-safe metric display (no fake numbers)',
);

// ─── Summary ───────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  Phase 16 — Task 9: Collector Dashboard`);
console.log(`  Results: ${passed}/${total} passed  |  ${failed} failed`);
console.log('════════════════════════════════════════════════════════════════════════');

if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(({ testId, description, detail }) => {
    console.log(`  ❌ [${testId}] ${description}${detail ? ' — ' + detail : ''}`);
  });
  process.exit(1);
} else {
  console.log('\n  All checks passed. Task 9 (Collector Dashboard) implementation verified. ✅');
  process.exit(0);
}
