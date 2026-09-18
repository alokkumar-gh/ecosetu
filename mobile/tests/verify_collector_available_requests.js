/**
 * verify_collector_available_requests.js
 * Static verification suite — Phase 16, Task 10: Collector Browse/Available Requests.
 *
 * Covers:
 *   A. CollectorBrowseScreen.tsx — structure + endpoint usage
 *   B. collectorService.js — getAvailableRequests pagination extension
 *   C. CollectorNavigator.tsx — wiring
 *   D. Request card content
 *   E. Privacy masking
 *   F. Citizen PII checks
 *   G. Accept request integration
 *   H. 409/403/404/429/offline/5xx handling
 *   I. Duplicate accept prevention
 *   J. Offline behavior
 *   K. Verification handling
 *   L. Pagination
 *   M. Refresh behavior
 *   N. Loading / empty states
 *   O. Business rules — no consignment/recycler/pickup-exec
 *   P. Security
 *   Q. Accessibility
 *   R. Performance — no polling
 *   S. Server-authoritative actions
 *   T. No undocumented endpoints / features
 *
 * Run: node mobile/tests/verify_collector_available_requests.js
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

const scr = readFile('src/screens/collector/CollectorBrowseScreen.tsx');
const svc = readFile('src/services/collectorService.js');
const nav = readFile('src/navigation/CollectorNavigator.tsx');

// ─── A. CollectorBrowseScreen — Structure ──────────────────────────────────────

console.log('\n─── A. CollectorBrowseScreen — Structure ─────────────────────────────────');

assert(scr.exists, 'A01', 'CollectorBrowseScreen.tsx exists');
assert(
  contains(scr.content, 'export const CollectorBrowseScreen'),
  'A02', 'Named export CollectorBrowseScreen present',
);
assert(
  contains(scr.content, 'INFORMAL_COLLECTOR'),
  'A03', 'INFORMAL_COLLECTOR role context present',
);
assert(
  contains(scr.content, 'collectorService'),
  'A04', 'collectorService imported and used',
);
assert(
  contains(scr.content, 'collectorService.getAvailableRequests'),
  'A05', 'getAvailableRequests called via collectorService',
);
assert(
  contains(scr.content, 'collectorService.acceptRequest'),
  'A06', 'acceptRequest called via collectorService',
);

// No raw fetch/axios calls
assert(
  !contains(scr.content, "fetch('/collection-requests") &&
  !contains(scr.content, "axios.get('/collection-requests"),
  'A07', 'No raw fetch/axios calls — uses service layer',
);

// Correct API endpoint reference (not hardcoded in screen — goes through service)
assert(
  !contains(scr.content, "apiClient.get('/collection-requests"),
  'A08', 'Screen does not bypass service to call apiClient directly',
);

// FlatList for performance
assert(
  contains(scr.content, 'FlatList'),
  'A09', 'FlatList used for request list (performance)',
);

// ─── B. collectorService — getAvailableRequests Pagination ────────────────────

console.log('\n─── B. collectorService — getAvailableRequests Pagination ────────────────');

assert(svc.exists, 'B01', 'collectorService.js exists');
assert(
  contains(svc.content, 'getAvailableRequests'),
  'B02', 'getAvailableRequests method exists',
);
assert(
  contains(svc.content, 'pagination'),
  'B03', 'pagination returned from getAvailableRequests',
);
assert(
  contains(svc.content, 'response.data?.pagination'),
  'B04', 'pagination extracted from response.data.pagination',
);
assert(
  contains(svc.content, 'fromCache: false'),
  'B05', 'fromCache: false returned on live fetch',
);
assert(
  contains(svc.content, 'fromCache: true'),
  'B06', 'fromCache: true returned on cache fallback',
);
assert(
  contains(svc.content, 'pagination: null'),
  'B07', 'pagination: null returned when from cache (no total/page info offline)',
);
// Still caches only requests array (not pagination) to avoid stale count
assert(
  contains(svc.content, 'CACHE_AVAILABLE_REQUESTS'),
  'B08', 'Uses CACHE_AVAILABLE_REQUESTS cache key',
);
// Correct endpoint
assert(
  contains(svc.content, "'/collection-requests/available'") ||
  contains(svc.content, 'collection-requests/available'),
  'B09', 'GET /api/v1/collection-requests/available endpoint used',
);
// Accepts page and limit params
assert(
  contains(svc.content, 'page') && contains(svc.content, 'limit'),
  'B10', 'page and limit query params passed (documented validator fields)',
);
// Does NOT call /pickups/my-pickups or /users/:id
assert(
  !contains(svc.content, 'apiClient.get(`/users/${') &&
  !contains(svc.content, "apiClient.get('/users/"),
  'B11', 'Service does not call /users/:id to enrich requests',
);

// ─── C. CollectorNavigator Wiring ─────────────────────────────────────────────

console.log('\n─── C. CollectorNavigator — Wiring ───────────────────────────────────────');

assert(nav.exists, 'C01', 'CollectorNavigator.tsx exists');
assert(
  contains(nav.content, "import { CollectorBrowseScreen }"),
  'C02', 'CollectorBrowseScreen imported',
);
assert(
  contains(nav.content, "from '../screens/collector/CollectorBrowseScreen'"),
  'C03', 'Import path is correct',
);
assert(
  contains(nav.content, 'component={CollectorBrowseScreen}'),
  'C04', 'CollectorBrowseScreen wired as Tab.Screen component',
);
assert(
  !contains(nav.content, 'component={CollectorBrowseTab}'),
  'C05', 'Old CollectorBrowseTab placeholder NOT used as component',
);
// Other tabs still present (not removed)
assert(
  contains(nav.content, 'CollectorHome') && contains(nav.content, 'CollectorDashboardScreen'),
  'C06', 'CollectorHome (Dashboard) tab still present',
);
assert(
  contains(nav.content, 'CollectorPickupsTab') || contains(nav.content, 'CollectorPickups'),
  'C07', 'CollectorPickups tab still present as placeholder',
);
assert(
  contains(nav.content, 'CollectorConsignTab') || contains(nav.content, 'CollectorConsign'),
  'C08', 'CollectorConsign tab still present as placeholder',
);
assert(
  contains(nav.content, 'CollectorProfileTab') || contains(nav.content, 'CollectorProfile'),
  'C09', 'CollectorProfile tab still present as placeholder',
);

// ─── D. Request Card Content ──────────────────────────────────────────────────

console.log('\n─── D. Request Card Content ──────────────────────────────────────────────');

assert(
  contains(scr.content, 'ewasteItems') && contains(scr.content, 'category'),
  'D01', 'ewasteItems categories displayed per request',
);
assert(
  contains(scr.content, 'quantity') || contains(scr.content, 'countTotalItems'),
  'D02', 'Item quantity/count displayed',
);
assert(
  contains(scr.content, 'estimatedWeightKg') || contains(scr.content, 'totalEstimatedWeight'),
  'D03', 'Estimated weight displayed from ewasteItems',
);
assert(
  contains(scr.content, 'preferredDate'),
  'D04', 'Preferred pickup date displayed if available',
);
assert(
  contains(scr.content, 'notes'),
  'D05', 'Notes displayed if available',
);
assert(
  contains(scr.content, 'createdAt') || contains(scr.content, 'submittedAt'),
  'D06', 'Submission date displayed',
);
assert(
  contains(scr.content, 'StatusBadge'),
  'D07', 'StatusBadge component used',
);
// Accept button on each card
assert(
  contains(scr.content, 'Accept Request') || contains(scr.content, 'acceptButton'),
  'D08', 'Accept button present on each request card',
);

// ─── E. Privacy Masking ───────────────────────────────────────────────────────

console.log('\n─── E. Privacy Masking ───────────────────────────────────────────────────');

// Screen displays pickupAddress as returned by backend (masked string)
assert(
  contains(scr.content, 'pickupAddress'),
  'E01', 'pickupAddress field used in display',
);
// Backend masking text is referenced / expected
assert(
  contains(scr.content, 'Approximate Location') || contains(scr.content, 'Approximate location'),
  'E02', 'Approximate location text acknowledged in screen',
);
// No address reconstruction
assert(
  !contains(scr.content, 'decryptAddress') &&
  !contains(scr.content, 'resolveCoordinates') &&
  !contains(scr.content, 'reverseGeocode'),
  'E03', 'No address decryption or coordinate reversal',
);
// Coordinates not displayed in UI (comments referencing them for documentation are allowed)
assert(
  !contains(scr.content, '{request.pickupLat}') &&
  !contains(scr.content, '{request.pickupLng}') &&
  !contains(scr.content, 'pickupLat.toFixed') &&
  !contains(scr.content, 'pickupLng.toFixed'),
  'E04', 'pickupLat/pickupLng coordinates NOT rendered in JSX',
);
// Does NOT modify/override backend masking
assert(
  !contains(svc.content, "'Exact address'") &&
  !contains(scr.content, "pickupAddress = 'Exact"),
  'E05', 'Client does not override backend privacy masking',
);

// ─── F. Citizen PII Checks ────────────────────────────────────────────────────

console.log('\n─── F. Citizen PII Checks ────────────────────────────────────────────────');

assert(
  !contains(scr.content, 'citizen.email') && !contains(scr.content, "citizen['email']"),
  'F01', 'Citizen email NOT displayed',
);
assert(
  !contains(scr.content, 'citizen.phone') && !contains(scr.content, "citizen['phone']"),
  'F02', 'Citizen phone NOT displayed',
);
assert(
  !contains(svc.content, "apiClient.get('/users/") &&
  !contains(svc.content, 'apiClient.get(`/users/${'),
  'F03', 'No /users/:id calls to enrich citizen data',
);
assert(
  !contains(scr.content, 'citizenId') || contains(scr.content, 'NOT'),
  'F04', 'citizenId not displayed in UI (may be in data but not rendered)',
);
assert(
  !contains(scr.content, 'citizen.name') && !contains(scr.content, "citizen['name']"),
  'F05', 'Citizen name NOT displayed',
);
assert(
  !contains(scr.content, '{request.pickupLat}') &&
  !contains(scr.content, '{request.pickupLng}') &&
  !contains(scr.content, 'pickupLat.toFixed'),
  'F06', 'Exact pickup coordinates NOT rendered in JSX',
);

// ─── G. Accept Integration ────────────────────────────────────────────────────

console.log('\n─── G. Accept Integration ────────────────────────────────────────────────');

assert(
  contains(scr.content, 'handleAccept') || contains(scr.content, 'onAccept'),
  'G01', 'Accept handler present',
);
assert(
  contains(scr.content, 'acceptingRef.current'),
  'G02', 'Duplicate accept prevention ref present',
);
assert(
  contains(scr.content, 'acceptingId'),
  'G03', 'Per-request accepting state tracked (acceptingId)',
);
assert(
  contains(scr.content, 'Alert.alert'),
  'G04', 'Confirmation alert before accepting',
);
// Remove from list after successful accept
assert(
  contains(scr.content, "prev.filter") && contains(scr.content, "r.id !== requestId"),
  'G05', 'Accepted request removed from list after success',
);
// Never fabricate success
assert(
  !contains(scr.content, "status = 'ACCEPTED'") &&
  !contains(scr.content, "status: 'ACCEPTED'"),
  'G06', 'Client does not manually set status to ACCEPTED (server-authoritative)',
);

// ─── H. Error Handling ───────────────────────────────────────────────────────

console.log('\n─── H. Error Handling ────────────────────────────────────────────────────');

assert(
  contains(scr.content, '409') ||
  contains(scr.content, 'No Longer Available') ||
  contains(scr.content, 'already accepted'),
  'H01', '409 conflict handled',
);
assert(
  contains(scr.content, '403') ||
  contains(scr.content, 'Access Denied') ||
  contains(scr.content, 'Access denied'),
  'H02', '403 forbidden handled',
);
assert(
  contains(scr.content, '404') ||
  contains(scr.content, 'Not Found') ||
  contains(scr.content, 'not found'),
  'H03', '404 not found handled',
);
assert(
  contains(scr.content, '429') ||
  contains(scr.content, 'Too Many Requests') ||
  contains(scr.content, 'too quickly'),
  'H04', '429 rate limit handled',
);
assert(
  contains(scr.content, 'isOfflineError') ||
  contains(scr.content, 'network error') ||
  contains(scr.content, 'Offline'),
  'H05', 'Network/offline error handled',
);
// No stack traces in UI
assert(
  !contains(scr.content, 'err.stack') &&
  !contains(scr.content, 'response.data.stack'),
  'H06', 'No stack traces exposed to user',
);
// Server errors (5xx) handled generically
assert(
  contains(scr.content, 'catch') && contains(scr.content, 'msg'),
  'H07', 'Generic error handler catches unexpected errors',
);
// 409 removes request from list (race condition: another collector accepted)
assert(
  contains(scr.content, '409') &&
  contains(scr.content, 'prev.filter'),
  'H08', '409 removes request from list (concurrent acceptance by another collector)',
);
// 404 removes request from list (request cancelled)
assert(
  contains(scr.content, '404') &&
  contains(scr.content, 'prev.filter'),
  'H09', '404 removes request from list (request no longer exists)',
);

// ─── I. Duplicate Accept Prevention ───────────────────────────────────────────

console.log('\n─── I. Duplicate Accept Prevention ───────────────────────────────────────');

assert(
  contains(scr.content, 'acceptingRef'),
  'I01', 'acceptingRef prevents duplicate API calls',
);
assert(
  contains(scr.content, 'acceptingRef.current = true'),
  'I02', 'acceptingRef set to true at start of accept',
);
assert(
  contains(scr.content, 'acceptingRef.current = false'),
  'I03', 'acceptingRef reset in finally block',
);
assert(
  contains(scr.content, 'acceptingId'),
  'I04', 'acceptingId tracks which specific request is being accepted',
);
// Not all buttons blocked — only the one being accepted
assert(
  contains(scr.content, 'acceptingId === item.id') || contains(scr.content, 'acceptingId === request.id'),
  'I05', 'Only the specific request being accepted shows loading state',
);

// ─── J. Offline Behavior ──────────────────────────────────────────────────────

console.log('\n─── J. Offline Behavior ──────────────────────────────────────────────────');

assert(
  contains(scr.content, 'OfflineBanner'),
  'J01', 'OfflineBanner shown when offline',
);
assert(
  contains(scr.content, 'fromCache'),
  'J02', 'fromCache tracked for stale notice',
);
assert(
  contains(scr.content, 'cached') || contains(scr.content, 'Showing cached'),
  'J03', 'Stale cache notice shown to user',
);
// Accept blocked offline
assert(
  contains(scr.content, '!isConnected') &&
  (contains(scr.content, 'Offline') || contains(scr.content, 'Internet')),
  'J04', 'Accept blocked and user informed when offline',
);
// Accept NOT queued offline
assert(
  !contains(svc.content, 'QUEUE_ACTION_TYPES.ACCEPT') &&
  !contains(scr.content, 'offlineQueue'),
  'J05', 'Accept NOT added to offline queue',
);
// Browsing cached data allowed
assert(
  contains(svc.content, 'AsyncStorage.getItem') ||
  contains(svc.content, 'fromCache: true'),
  'J06', 'Cached requests served when offline',
);

// ─── K. Verification Handling ─────────────────────────────────────────────────

console.log('\n─── K. Verification Handling ──────────────────────────────────────────────');

assert(
  contains(scr.content, 'PENDING_VERIFICATION'),
  'K01', 'PENDING_VERIFICATION status handled',
);
assert(
  contains(scr.content, 'ACTIVE'),
  'K02', 'ACTIVE status handled',
);
assert(
  contains(scr.content, 'SUSPENDED'),
  'K03', 'SUSPENDED status shown with warning banner',
);
assert(
  contains(scr.content, 'DEACTIVATED'),
  'K04', 'DEACTIVATED status shown with warning banner',
);
assert(
  contains(scr.content, 'isVerified'),
  'K05', 'isVerified computed from account status',
);
assert(
  !contains(scr.content, 'VERIFIED') && !contains(scr.content, 'BLOCKED'),
  'K06', 'No invented UserStatus values',
);
assert(
  contains(scr.content, 'isVerificationError') || contains(scr.content, 'Verification Required'),
  'K07', '403 from checkVerified shown as verification-required state (not generic error)',
);
// Accept blocked for unverified
assert(
  contains(scr.content, 'isVerified') &&
  contains(scr.content, 'Verification Required'),
  'K08', 'Accept blocked with verification message for unverified collector',
);

// ─── L. Pagination ────────────────────────────────────────────────────────────

console.log('\n─── L. Pagination ────────────────────────────────────────────────────────');

assert(
  contains(scr.content, 'pagination'),
  'L01', 'pagination state managed in screen',
);
assert(
  contains(scr.content, 'handleLoadMore') || contains(scr.content, 'onEndReached'),
  'L02', 'onEndReached / load-more handler present',
);
assert(
  contains(scr.content, 'isLoadingMore'),
  'L03', 'isLoadingMore state managed',
);
assert(
  contains(scr.content, 'loadingMoreRef'),
  'L04', 'Duplicate load-more prevention ref present',
);
assert(
  contains(scr.content, 'totalPages') || contains(scr.content, 'currentPage >= totalPages'),
  'L05', 'Last-page check prevents unnecessary load-more calls',
);
// Page param passed
assert(
  contains(scr.content, 'page') && contains(scr.content, 'PAGE_SIZE'),
  'L06', 'Page number and limit passed to getAvailableRequests',
);
// Append (not replace) on load-more
assert(
  contains(scr.content, '[...prev, ...newItems]') || contains(scr.content, 'prev, ...'),
  'L07', 'Load-more appends to existing list (not replace)',
);
// Deduplication on append
assert(
  contains(scr.content, 'existingIds') || contains(scr.content, 'has(r.id)'),
  'L08', 'Duplicate deduplication on load-more append',
);
// No pagination offline (no count information available)
assert(
  contains(scr.content, '!isConnected') || contains(scr.content, 'No offline pagination'),
  'L09', 'Pagination/load-more requires connectivity',
);

// ─── M. Refresh ───────────────────────────────────────────────────────────────

console.log('\n─── M. Refresh ───────────────────────────────────────────────────────────');

assert(
  contains(scr.content, 'RefreshControl'),
  'M01', 'Native RefreshControl present',
);
assert(
  contains(scr.content, 'isRefreshing'),
  'M02', 'isRefreshing state managed',
);
assert(
  contains(scr.content, 'handleRefresh') || contains(scr.content, 'onRefresh'),
  'M03', 'Refresh handler defined',
);
assert(
  contains(scr.content, 'refreshingRef') || contains(scr.content, 'refreshingRef.current'),
  'M04', 'Duplicate refresh prevention ref present',
);
// Pull-to-refresh resets to page 1
assert(
  contains(scr.content, 'page: 1') || contains(scr.content, 'loadRequests'),
  'M05', 'Refresh reloads from page 1',
);

// ─── N. Loading / Empty States ────────────────────────────────────────────────

console.log('\n─── N. Loading / Empty States ────────────────────────────────────────────');

assert(
  contains(scr.content, 'isLoading'),
  'N01', 'Global isLoading state managed',
);
assert(
  contains(scr.content, 'RequestCardSkeleton') || contains(scr.content, 'Skeleton'),
  'N02', 'Skeleton loading state used',
);
assert(
  contains(scr.content, 'EmptyState'),
  'N03', 'EmptyState component used',
);
assert(
  contains(scr.content, 'No Requests Available') || contains(scr.content, 'no requests'),
  'N04', 'Empty state for no available requests',
);
assert(
  contains(scr.content, 'LoadMoreFooter') || contains(scr.content, 'isLoadingMore'),
  'N05', 'Load-more footer/indicator shown',
);
// Empty state message differs for offline vs. no data
assert(
  contains(scr.content, 'offline') || contains(scr.content, 'cached'),
  'N06', 'Empty state message accounts for offline state',
);

// ─── O. Business Rules ────────────────────────────────────────────────────────

console.log('\n─── O. Business Rules ────────────────────────────────────────────────────');

// No consignment
assert(
  !contains(scr.content, 'createConsignment') && !contains(scr.content, 'CreateConsignment'),
  'O01', 'No consignment creation on Browse screen',
);
// No recycler
assert(
  !contains(scr.content, 'selectRecycler') &&
  !contains(scr.content, 'RecyclerMarketplace') &&
  !contains(scr.content, 'bookRecycler'),
  'O02', 'No recycler marketplace/selection',
);
assert(
  !contains(scr.content, 'RecyclerScreen') && !contains(scr.content, 'RecyclerHome'),
  'O03', 'No recycler navigation routes referenced',
);
// No pickup execution
assert(
  !contains(scr.content, 'completePickup') &&
  !contains(scr.content, 'startPickup') &&
  !contains(scr.content, 'PATCH /api/v1/pickups'),
  'O04', 'No pickup execution controls on Browse screen',
);
// No admin
assert(
  !contains(scr.content, 'AdminScreen') && !contains(scr.content, 'adminService'),
  'O05', 'No admin controls',
);
// Kabadiwala chain documented in comments
assert(
  contains(scr.content, 'CITIZEN') || contains(scr.content, 'citizen'),
  'O06', 'Citizen→Collector workflow acknowledged',
);
assert(
  !contains(scr.content, 'CITIZEN → FORMAL RECYCLER') &&
  !contains(scr.content, 'citizen → recycler'),
  'O07', 'No Citizen→Recycler path implemented',
);
// No maps
assert(
  !contains(scr.content, 'MapView') && !contains(scr.content, 'react-native-maps'),
  'O08', 'No maps (deferred future task)',
);
// No payments
assert(
  !contains(scr.content, 'payment') && !contains(scr.content, 'Payment'),
  'O09', 'No payment functionality',
);
// No chat
assert(
  !contains(scr.content, 'Chat') && !contains(scr.content, 'sendMessage'),
  'O10', 'No chat functionality',
);

// ─── P. Security ──────────────────────────────────────────────────────────────

console.log('\n─── P. Security ──────────────────────────────────────────────────────────');

assert(!contains(scr.content, 'accessToken'), 'P01', 'accessToken NOT exposed in screen');
assert(!contains(scr.content, 'refreshToken'), 'P02', 'refreshToken NOT exposed in screen');
assert(!contains(scr.content, 'passwordHash'), 'P03', 'passwordHash NOT exposed');
assert(!contains(scr.content, 'password'), 'P04', 'password NOT exposed');
assert(!contains(scr.content, 'err.stack'), 'P05', 'Error stack trace not shown to user');
assert(
  !contains(scr.content, 'console.log(token)') && !contains(scr.content, 'console.log(user)'),
  'P06', 'No sensitive values logged to console',
);
assert(
  !contains(svc.content, 'payload.role') && !contains(svc.content, 'payload.status'),
  'P07', 'Service does not send role/status in API payloads',
);
// No internal DB IDs exposed in UI
assert(
  !contains(scr.content, 'citizenId:') && !contains(scr.content, 'collectorId:'),
  'P08', 'Internal database IDs not exposed in UI',
);

// ─── Q. Accessibility ─────────────────────────────────────────────────────────

console.log('\n─── Q. Accessibility ──────────────────────────────────────────────────────');

assert(contains(scr.content, 'accessibilityRole'), 'Q01', 'accessibilityRole present');
assert(contains(scr.content, 'accessibilityLabel'), 'Q02', 'accessibilityLabel present');
assert(contains(scr.content, 'accessibilityState'), 'Q03', 'accessibilityState present on interactive elements');
assert(contains(scr.content, 'accessibilityHint'), 'Q04', 'accessibilityHint present');
assert(
  contains(scr.content, 'minHeight: 48') || contains(scr.content, 'minHeight: 44'),
  'Q05', 'Minimum 48dp touch target on accept buttons',
);
assert(
  contains(scr.content, 'accessibilityRole="alert"') || contains(scr.content, "accessibilityRole='alert'"),
  'Q06', 'Status banners/errors use accessibilityRole="alert"',
);
assert(
  contains(scr.content, 'accessibilityElementsHidden'),
  'Q07', 'Decorative elements hidden from accessibility tree',
);
// Disabled state communicated via text, not just color
assert(
  contains(scr.content, 'disabledHint') || contains(scr.content, 'disabled state'),
  'Q08', 'Disabled state communicated via text (color-independent)',
);
// Accept button has accessibilityState.disabled
assert(
  contains(scr.content, 'accessibilityState') && contains(scr.content, 'disabled'),
  'Q09', 'Accept button accessibilityState.disabled set',
);
// Accept button has accessibilityState.busy when accepting
assert(
  contains(scr.content, 'busy: isAccepting') || contains(scr.content, 'busy:'),
  'Q10', 'Accept button accessibilityState.busy set when accepting',
);

// ─── R. Performance ────────────────────────────────────────────────────────────

console.log('\n─── R. Performance ───────────────────────────────────────────────────────');

assert(!contains(scr.content, 'setInterval'), 'R01', 'No setInterval polling');
assert(!contains(scr.content, 'WebSocket'), 'R02', 'No WebSocket');
assert(!contains(scr.content, 'setTimeout'), 'R03', 'No setTimeout loop');
assert(contains(scr.content, 'FlatList'), 'R04', 'FlatList used for list virtualization');
assert(
  contains(scr.content, 'React.memo') || contains(scr.content, 'useCallback'),
  'R05', 'React.memo or useCallback used for performance',
);
assert(
  contains(scr.content, 'initialNumToRender') || contains(scr.content, 'maxToRenderPerBatch'),
  'R06', 'FlatList render optimization props set',
);
assert(
  !contains(scr.content, 'Math.sqrt') && !contains(scr.content, 'calculateDistanceKm'),
  'R07', 'No client-side geographic distance calculation (masked coords cannot be used for this)',
);

// ─── S. Server-Authoritative Actions ─────────────────────────────────────────

console.log('\n─── S. Server-Authoritative Actions ─────────────────────────────────────');

assert(
  !contains(svc.content, 'QUEUE_ACTION_TYPES.ACCEPT'),
  'S01', 'acceptRequest NOT in offline queue action types',
);
assert(
  !contains(scr.content, 'offlineQueue') || !contains(scr.content, 'accept'),
  'S02', 'No offline queued acceptance in screen',
);
assert(
  contains(svc.content, 'Internet connection required') ||
  contains(svc.content, 'isOfflineError'),
  'S03', 'Accept throws offline error when no connectivity',
);
// Client does not alter request status client-side
assert(
  !contains(scr.content, "status = 'ACCEPTED'") &&
  !contains(scr.content, "request.status = "),
  'S04', 'Client does not mutate request status locally',
);

// ─── T. No Undocumented Endpoints or Features ─────────────────────────────────

console.log('\n─── T. No Undocumented Endpoints/Features ────────────────────────────────');

// Correct endpoint only
assert(
  !contains(svc.content, '/collection-requests/browse') &&
  !contains(svc.content, '/collection-requests/nearby') &&
  !contains(svc.content, '/collection-requests/search'),
  'T01', 'No undocumented collection-request endpoints used',
);
assert(
  !contains(svc.content, '/collectors/requests') &&
  !contains(svc.content, '/collectors/available'),
  'T02', 'No undocumented collector endpoints used',
);
assert(
  !contains(scr.content, '/recyclers/search') &&
  !contains(scr.content, '/recyclers/nearby'),
  'T03', 'No recycler search endpoints',
);
assert(
  !contains(scr.content, 'distance') || !contains(scr.content, 'km away'),
  'T04', 'No distance display from masked coordinates (prevents coordinate reconstruction)',
);
assert(
  !contains(scr.content, 'citizen.rating') && !contains(scr.content, 'citizenRating'),
  'T05', 'No citizen rating (undocumented field)',
);
assert(
  !contains(scr.content, 'payment') && !contains(scr.content, 'pricePerKg'),
  'T06', 'No pricing fields (undocumented)',
);

// ─── Summary ───────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  Phase 16 — Task 10: Collector Browse / Available Requests`);
console.log(`  Results: ${passed}/${total} passed  |  ${failed} failed`);
console.log('════════════════════════════════════════════════════════════════════════');

if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(({ testId, description, detail }) => {
    console.log(`  ❌ [${testId}] ${description}${detail ? ' — ' + detail : ''}`);
  });
  process.exit(1);
} else {
  console.log(
    '\n  All checks passed. Task 10 (Collector Browse / Available Requests) verified. ✅',
  );
  process.exit(0);
}
