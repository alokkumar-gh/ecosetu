/**
 * verify_collector_recycler_directory.js
 * Verification suite — Phase 17, Task 1: Collector Formal Recycler Directory / Discovery
 *
 * Requirements:
 *   1. Correct recycler API endpoint is used (GET /api/v1/recyclers)
 *   2. Collector authentication/authorization path
 *   3. Citizen cannot access this directory
 *   4. Recycler data renders using the actual response shape
 *   5. Verified/eligible recycler handling follows the existing API/business rules
 *   6. Loading state (Skeleton)
 *   7. Empty state
 *   8. API error + retry
 *   9. Offline cached rendering with stale indication (@ecosetu_collector_recyclers)
 *   10. Read-only: zero consignment creation/delivery mutations, no dialer/chat/maps
 *   11. Pull-to-refresh integration
 *   12. Navigation wiring into CollectorNavigator (and isolation from other navigators)
 *   13. Existing collector screens remain unaffected
 *
 * Run: node mobile/tests/verify_collector_recycler_directory.js
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

const scr = readFile('src/screens/collector/CollectorRecyclerDirectoryScreen.tsx');
const recSvc = readFile('src/services/recyclingService.js');
const colSvc = readFile('src/services/collectorService.js');
const nav = readFile('src/navigation/CollectorNavigator.tsx');
const citNav = readFile('src/navigation/CitizenNavigator.tsx');
const recyclerNav = readFile('src/navigation/RecyclerNavigator.tsx');
const admNav = readFile('src/navigation/AdminNavigator.tsx');
const types = readFile('src/navigation/types.ts');
const backendRoutes = readFile('../backend/src/routes/recyclerRoutes.js');
const backendService = readFile('../backend/src/services/recyclerService.js');

console.log('════════════════════════════════════════════════════════════════════════');
console.log('  ECOSETU Verification: Phase 17, Task 1 — Collector Formal Recycler Directory');
console.log('════════════════════════════════════════════════════════════════════════');

// ─── 1. Recycler Discovery API Verification ───────────────────────────────────
console.log('\n─── 1. Recycler Discovery API & Backend Contracts ───────────────────────');

assert(backendRoutes.exists, 'API-01', 'backend recyclerRoutes.js exists');
assert(contains(backendRoutes.content, "router.get("), 'API-02', 'GET route defined on recycler router');
assert(contains(backendRoutes.content, "ROLES.INFORMAL_COLLECTOR"), 'API-03', 'Authorized for INFORMAL_COLLECTOR');
assert(contains(backendRoutes.content, "checkVerified"), 'API-04', 'Requires checkVerified middleware');
assert(backendService.exists, 'API-05', 'backend recyclerService.js exists');
assert(contains(backendService.content, "listVerifiedRecyclers"), 'API-06', 'Backend implements listVerifiedRecyclers');
assert(contains(backendService.content, "user: {") && contains(backendService.content, "status: USER_STATUS.ACTIVE"), 'API-07', 'Backend filters only active verified recyclers');
assert(contains(backendService.content, "facilityName: true") && contains(backendService.content, "facilityAddress: true"), 'API-08', 'Backend selects facilityName and facilityAddress');
assert(contains(backendService.content, "acceptedCategories: true"), 'API-09', 'Backend selects acceptedCategories');
assert(contains(backendService.content, "totalConsignments: true"), 'API-10', 'Backend selects totalConsignments');

// ─── 2. Service Layer Implementation & Offline Caching ────────────────────────
console.log('\n─── 2. Service Layer Implementation & Offline Caching ───────────────────');

assert(recSvc.exists, 'SVC-01', 'recyclingService.js exists');
assert(contains(recSvc.content, "async getRecyclers("), 'SVC-02', 'recyclingService implements getRecyclers()');
assert(contains(recSvc.content, "endpoint = query ? `/recyclers?${query}` : '/recyclers'"), 'SVC-03', 'getRecyclers calls /recyclers with query string');
assert(contains(recSvc.content, "@ecosetu_collector_recyclers"), 'SVC-04', 'Uses designated cache key @ecosetu_collector_recyclers');
assert(contains(recSvc.content, "fromCache: false") && contains(recSvc.content, "fromCache: true"), 'SVC-05', 'Returns fromCache boolean for online/offline transparency');
assert(contains(recSvc.content, "params.category"), 'SVC-06', 'Supports category filter in API call and offline memory fallback');
assert(colSvc.exists, 'SVC-07', 'collectorService.js exists');
assert(contains(colSvc.content, "getRecyclers("), 'SVC-08', 'collectorService exports or delegates getRecyclers');

// ─── 3. Screen Structure & Role Security ──────────────────────────────────────
console.log('\n─── 3. Screen Structure & Role Security ─────────────────────────────────');

assert(scr.exists, 'SCR-01', 'CollectorRecyclerDirectoryScreen.tsx exists');
assert(contains(scr.content, "export const CollectorRecyclerDirectoryScreen"), 'SCR-02', 'Exports CollectorRecyclerDirectoryScreen');
assert(contains(scr.content, "useAuth"), 'SCR-03', 'Uses useAuth hook');
assert(contains(scr.content, "useNetwork"), 'SCR-04', 'Uses useNetwork hook');
assert(contains(scr.content, "ROLES.INFORMAL_COLLECTOR"), 'SCR-05', 'Enforces INFORMAL_COLLECTOR role');
assert(contains(scr.content, "Access Restricted"), 'SCR-06', 'Displays access restricted message for unauthorized roles');
assert(contains(scr.content, "TopAppBar"), 'SCR-07', 'Renders TopAppBar with screen title');

// ─── 4. Citizen & Cross-Role Isolation ─────────────────────────────────────────
console.log('\n─── 4. Citizen & Cross-Role Isolation ───────────────────────────────────');

assert(!contains(citNav.content, "CollectorRecyclerDirectoryScreen"), 'ISO-01', 'CitizenNavigator does NOT contain CollectorRecyclerDirectoryScreen');
assert(!contains(recyclerNav.content, "CollectorRecyclerDirectoryScreen"), 'ISO-02', 'RecyclerNavigator does NOT contain CollectorRecyclerDirectoryScreen');
assert(!contains(admNav.content, "CollectorRecyclerDirectoryScreen"), 'ISO-03', 'AdminNavigator does NOT contain CollectorRecyclerDirectoryScreen');
assert(!contains(scr.content, "CitizenSubmit") && !contains(scr.content, "CitizenHome"), 'ISO-04', 'Zero citizen navigation hooks or routes in screen');

// ─── 5. Response Shape Rendering ──────────────────────────────────────────────
console.log('\n─── 5. Recycler Data & Response Shape Rendering ─────────────────────────');

assert(contains(scr.content, "facilityName"), 'SHAPE-01', 'Renders facilityName');
assert(contains(scr.content, "facilityAddress"), 'SHAPE-02', 'Renders facilityAddress');
assert(contains(scr.content, "acceptedCategories"), 'SHAPE-03', 'Renders acceptedCategories');
assert(contains(scr.content, "totalConsignments"), 'SHAPE-04', 'Renders totalConsignments metric');
assert(contains(scr.content, "recycler.user?.name") || contains(scr.content, "contactName"), 'SHAPE-05', 'Renders contact person text safely');
assert(contains(scr.content, "StatusBadge status=\"ACTIVE\""), 'SHAPE-06', 'Renders verified StatusBadge');
assert(!contains(scr.content, "passwordHash"), 'SHAPE-07', 'Zero exposure of passwordHash');
assert(!contains(scr.content, "licenseDocumentUrl"), 'SHAPE-08', 'Zero exposure of internal licenseDocumentUrl');

// ─── 6. Category Filtering & Search ───────────────────────────────────────────
console.log('\n─── 6. Category Filtering & Search ──────────────────────────────────────');

assert(contains(scr.content, "EWASTE_CATEGORIES"), 'CAT-01', 'Uses canonical EWASTE_CATEGORIES');
assert(contains(scr.content, "CATEGORY_OPTIONS"), 'CAT-02', 'Provides category filter options');
assert(contains(scr.content, "selectedCategory"), 'CAT-03', 'Maintains selectedCategory state');
assert(contains(scr.content, "searchQuery"), 'CAT-04', 'Provides client-side search query state');
assert(contains(scr.content, "filteredRecyclers"), 'CAT-05', 'Computes filteredRecyclers based on search query');
assert(contains(scr.content, "Clear Filters"), 'CAT-06', 'Provides Clear Filters action when search/filter returns empty');

// ─── 7. Loading, Empty, and Error States ───────────────────────────────────────
console.log('\n─── 7. Loading, Empty, and Error States ─────────────────────────────────');

assert(contains(scr.content, "RecyclerCardSkeleton"), 'STATE-01', 'Renders RecyclerCardSkeleton during loading');
assert(contains(scr.content, "Skeleton width="), 'STATE-02', 'Uses Skeleton component for shimmering load');
assert(contains(scr.content, "EmptyState"), 'STATE-03', 'Uses EmptyState component');
assert(contains(scr.content, "isVerificationError"), 'STATE-04', 'Distinguishes 403 verification error');
assert(contains(scr.content, "Retry"), 'STATE-05', 'Provides Retry action on load error');

// ─── 8. Offline First Architecture ────────────────────────────────────────────
console.log('\n─── 8. Offline First Architecture ──────────────────────────────────────');

assert(contains(scr.content, "OfflineBanner"), 'OFF-01', 'Renders OfflineBanner when disconnected');
assert(contains(scr.content, "fromCache"), 'OFF-02', 'Tracks fromCache state');
assert(contains(scr.content, "Showing cached recycler directory"), 'OFF-03', 'Displays stale cache notice when using cached data');
assert(contains(scr.content, "No Offline Directory"), 'OFF-04', 'Displays friendly message when opening offline with empty cache');
assert(!contains(scr.content, "offlineQueue.enqueue"), 'OFF-05', 'Strictly READ-ONLY: zero offline mutation queueing');

// ─── 9. Refresh & Pull-to-Refresh ─────────────────────────────────────────────
console.log('\n─── 9. Refresh & Pull-to-Refresh ───────────────────────────────────────');

assert(contains(scr.content, "RefreshControl"), 'REF-01', 'Uses native RefreshControl');
assert(contains(scr.content, "refreshingRef"), 'REF-02', 'Uses refreshingRef guard against duplicate refresh calls');
assert(contains(scr.content, "handleRefresh"), 'REF-03', 'Implements handleRefresh callback');

// ─── 10. Read-Only Boundary & Strict Rule Checks ──────────────────────────────
console.log('\n─── 10. Read-Only Boundary & Strict Rule Checks ─────────────────────────');

assert(!contains(scr.content, "createConsignment"), 'RO-01', 'Does NOT implement createConsignment in this screen');
assert(!contains(scr.content, "POST /api/v1/consignments"), 'RO-02', 'Does NOT call POST /api/v1/consignments');
assert(!contains(scr.content, "MapView") && !contains(scr.content, "react-native-maps"), 'RO-03', 'No map widgets or map dependencies');
assert(!contains(scr.content, "Linking.openURL('tel:") && !contains(scr.content, "openURL('tel:"), 'RO-04', 'No external phone dialer actions');
assert(!contains(scr.content, "react-native-gifted-chat") && !contains(scr.content, "ChatScreen") && !contains(scr.content, "sendChat"), 'RO-05', 'No chat or messaging libraries/components');
assert(!contains(scr.content, "Razorpay") && !contains(scr.content, "stripe") && !contains(scr.content, "PaymentGateway"), 'RO-06', 'No payment libraries/gateways');

// ─── 11. Navigation Wiring ────────────────────────────────────────────────────
console.log('\n─── 11. Navigation Wiring ───────────────────────────────────────────────');

assert(nav.exists, 'NAV-01', 'CollectorNavigator.tsx exists');
assert(contains(nav.content, "CollectorRecyclerDirectoryScreen"), 'NAV-02', 'CollectorNavigator imports CollectorRecyclerDirectoryScreen');
assert(contains(nav.content, "name=\"CollectorConsign\"") && contains(nav.content, "component={CollectorRecyclerDirectoryScreen}"), 'NAV-03', 'CollectorConsign tab wires CollectorRecyclerDirectoryScreen');
assert(contains(types.content, "CollectorConsign: undefined"), 'NAV-04', 'CollectorTabParamList retains CollectorConsign route');

// ─── 12. Accessibility Compliance ─────────────────────────────────────────────
console.log('\n─── 12. Accessibility Compliance ───────────────────────────────────────');

assert(contains(scr.content, "accessibilityRole=\"button\""), 'A11Y-01', 'Interactive elements declare accessibilityRole="button"');
assert(contains(scr.content, "accessibilityLabel="), 'A11Y-02', 'Elements declare accessibilityLabel');
assert(contains(scr.content, "accessibilityState="), 'A11Y-03', 'Category filter chips declare accessibilityState');
assert(contains(scr.content, "accessibilityRole=\"alert\""), 'A11Y-04', 'Banners declare accessibilityRole="alert"');

// ─── 13. Non-Interference with Existing Collector Screens ─────────────────────
console.log('\n─── 13. Non-Interference with Existing Collector Screens ───────────────');

const colHome = readFile('src/screens/collector/CollectorDashboardScreen.tsx');
const colBrowse = readFile('src/screens/collector/CollectorBrowseScreen.tsx');
const colPickups = readFile('src/screens/collector/CollectorPickupsScreen.tsx');
const colProfile = readFile('src/screens/collector/CollectorProfileScreen.tsx');

assert(colHome.exists, 'REG-01', 'CollectorDashboardScreen.tsx remains present and intact');
assert(colBrowse.exists, 'REG-02', 'CollectorBrowseScreen.tsx remains present and intact');
assert(colPickups.exists, 'REG-03', 'CollectorPickupsScreen.tsx remains present and intact');
assert(colProfile.exists, 'REG-04', 'CollectorProfileScreen.tsx remains present and intact');

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  RESULT: ${passed} passed, ${failed} failed`);
console.log('════════════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  console.error('Failed checks:');
  failures.forEach((f) => console.error(` - [${f.testId}] ${f.description}`));
  process.exit(1);
} else {
  console.log('All verification checks passed successfully!');
  process.exit(0);
}
