/**
 * verify_collector_consignment_tracking.js
 * Verification suite — Phase 17, Task 4: Informal Collector Consignment Tracking & Status
 *
 * Requirements:
 *   1. Correct collector consignment endpoint & backend ownership scoping
 *   2. Authenticated collector authorization & citizen isolation
 *   3. Recycling service getCollectorConsignments & offline caching (@ecosetu_collector_consignments)
 *   4. CollectorService delegation
 *   5. CollectorConsignmentsScreen list rendering & filtering
 *   6. Canonical status rendering (CREATED, IN_TRANSIT, DELIVERED, ACCEPTED, REJECTED)
 *   7. CollectorConsignmentStatusScreen detail rendering & authoritative status display
 *   8. Server-authoritative rejection reason display
 *   9. Lifecycle timestamps (createdAt, deliveredAt, acceptedAt, rejectedAt)
 *   10. Pull-to-refresh with in-flight guard
 *   11. Offline cache & stale indicator
 *   12. Strictly READ-ONLY: zero collector-side accept/reject mutation controls
 *   13. Navigation wiring into CollectorNavigator & strict role isolation
 *   14. Integration with Recycler Directory & Consignment Creation receipt
 *   15. Non-regression of existing collector, recycler, and citizen functionality
 *
 * Run: node mobile/tests/verify_collector_consignment_tracking.js
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

// ─── Load Subjects ────────────────────────────────────────────────────────────

const listScr = readFile('src/screens/collector/CollectorConsignmentsScreen.tsx');
const detailScr = readFile('src/screens/collector/CollectorConsignmentStatusScreen.tsx');
const dirScr = readFile('src/screens/collector/CollectorRecyclerDirectoryScreen.tsx');
const createScr = readFile('src/screens/collector/CreateConsignmentScreen.tsx');
const recSvc = readFile('src/services/recyclingService.js');
const colSvc = readFile('src/services/collectorService.js');
const nav = readFile('src/navigation/CollectorNavigator.tsx');
const citNav = readFile('src/navigation/CitizenNavigator.tsx');
const recyclerNav = readFile('src/navigation/RecyclerNavigator.tsx');
const admNav = readFile('src/navigation/AdminNavigator.tsx');
const types = readFile('src/navigation/types.ts');
const backendRoutes = readFile('../backend/src/routes/consignmentRoutes.js');
const backendService = readFile('../backend/src/services/consignmentService.js');
const backendSchema = readFile('../backend/prisma/schema.prisma');
const recyclerIncoming = readFile('src/screens/recycler/RecyclerIncomingScreen.tsx');
const recyclerDetail = readFile('src/screens/recycler/ConsignmentDetailScreen.tsx');

console.log('════════════════════════════════════════════════════════════════════════');
console.log('  ECOSETU Verification: Phase 17, Task 4 — Collector Consignment Tracking');
console.log('════════════════════════════════════════════════════════════════════════');

// ─── 1. Backend Consignment API & Collector Ownership Scoping ─────────────────
console.log('\n─── 1. Backend Consignment API & Collector Ownership Scoping ───────────');

assert(backendRoutes.exists, 'API-01', 'backend consignmentRoutes.js exists');
assert(contains(backendRoutes.content, 'router.get') && contains(backendRoutes.content, 'listConsignments'), 'API-02', 'GET route registered for listing consignments');
assert(contains(backendRoutes.content, "ROLES.INFORMAL_COLLECTOR"), 'API-03', 'INFORMAL_COLLECTOR authorized for consignment listing');
assert(backendService.exists, 'API-04', 'backend consignmentService.js exists');
assert(contains(backendService.content, 'listConsignments'), 'API-05', 'Backend implements listConsignments service');
assert(contains(backendService.content, 'collectorProfile.id') && contains(backendService.content, 'collectorId'), 'API-06', 'Backend scopes listing to authenticated collector ID');
assert(backendSchema.exists && contains(backendSchema.content, 'rejectionReason'), 'API-07', 'Backend Consignment model defines rejectionReason');
assert(contains(backendService.content, 'ewasteItem:') && contains(backendService.content, 'consignmentItems:'), 'API-08', 'Backend includes ewasteItem in consignment items query');

// ─── 2. Service Layer: getCollectorConsignments & Offline Cache ───────────────
console.log('\n─── 2. Service Layer Implementation & Offline Caching ───────────────────');

assert(recSvc.exists, 'SVC-01', 'recyclingService.js exists');
assert(contains(recSvc.content, 'getCollectorConsignments'), 'SVC-02', 'recyclingService implements getCollectorConsignments()');
assert(contains(recSvc.content, '@ecosetu_collector_consignments'), 'SVC-03', 'Uses @ecosetu_collector_consignments cache key');
assert(contains(recSvc.content, 'CACHE_COLLECTOR_CONSIGNMENTS'), 'SVC-04', 'Exports CACHE_COLLECTOR_CONSIGNMENTS');
assert(contains(recSvc.content, 'fromCache: true'), 'SVC-05', 'Returns fromCache flag for offline transparency');
assert(contains(recSvc.content, 'cached.unshift(consignment)'), 'SVC-06', 'createConsignment pre-populates collector consignments cache');
assert(colSvc.exists, 'SVC-07', 'collectorService.js exists');
assert(contains(colSvc.content, 'getConsignments'), 'SVC-08', 'collectorService exports getConsignments');

// ─── 3. Collector Consignments List Screen ────────────────────────────────────
console.log('\n─── 3. Collector Consignments List Screen ───────────────────────────────');

assert(listScr.exists, 'LST-01', 'CollectorConsignmentsScreen.tsx exists');
assert(contains(listScr.content, 'CollectorConsignmentsScreen'), 'LST-02', 'Exports CollectorConsignmentsScreen');
assert(contains(listScr.content, 'INFORMAL_COLLECTOR'), 'LST-03', 'Enforces INFORMAL_COLLECTOR role access');
assert(contains(listScr.content, 'Access Restricted'), 'LST-04', 'Renders Access Restricted message for unauthorized roles');
assert(contains(listScr.content, 'TopAppBar'), 'LST-05', 'Renders TopAppBar with screen title');
assert(contains(listScr.content, 'StatusBadge'), 'LST-06', 'Renders StatusBadge for canonical status display');
assert(contains(listScr.content, 'OfflineBanner'), 'LST-07', 'Renders OfflineBanner when disconnected');
assert(contains(listScr.content, 'EmptyState'), 'LST-08', 'Renders EmptyState when no consignments exist');
assert(contains(listScr.content, 'RefreshControl'), 'LST-09', 'Provides native pull-to-refresh');
assert(contains(listScr.content, 'refreshingRef'), 'LST-10', 'Guards against duplicate in-flight refresh calls');
assert(contains(listScr.content, 'Showing cached consignment records'), 'LST-11', 'Informs collector when viewing cached/offline data');
assert(contains(listScr.content, 'CollectorConsignmentStatus'), 'LST-12', 'Navigates to CollectorConsignmentStatus on card press');

// ─── 4. Filter Chips & Canonical Status Filtering ─────────────────────────────
console.log('\n─── 4. Filter Chips & Canonical Status Filtering ────────────────────────');

assert(contains(listScr.content, "'ALL'"), 'FLT-01', 'Provides All filter chip');
assert(contains(listScr.content, "'CREATED'"), 'FLT-02', 'Provides Created filter chip');
assert(contains(listScr.content, "'IN_TRANSIT'"), 'FLT-03', 'Provides In Transit filter chip');
assert(contains(listScr.content, "'DELIVERED'"), 'FLT-04', 'Provides Delivered filter chip');
assert(contains(listScr.content, "'ACCEPTED'"), 'FLT-05', 'Provides Accepted filter chip');
assert(contains(listScr.content, "'REJECTED'"), 'FLT-06', 'Provides Rejected filter chip');

// ─── 5. Collector Consignment Status Screen (Detail View) ─────────────────────
console.log('\n─── 5. Collector Consignment Status Screen (Detail View) ────────────────');

assert(detailScr.exists, 'DTL-01', 'CollectorConsignmentStatusScreen.tsx exists');
assert(contains(detailScr.content, 'CollectorConsignmentStatusScreen'), 'DTL-02', 'Exports CollectorConsignmentStatusScreen');
assert(contains(detailScr.content, 'INFORMAL_COLLECTOR'), 'DTL-03', 'Guards access to INFORMAL_COLLECTOR');
assert(contains(detailScr.content, 'StatusBadge'), 'DTL-04', 'Renders StatusBadge for authoritative status');
assert(contains(detailScr.content, 'createdAt'), 'DTL-05', 'Displays createdAt lifecycle timestamp');
assert(contains(detailScr.content, 'deliveredAt'), 'DTL-06', 'Displays deliveredAt lifecycle timestamp');
assert(contains(detailScr.content, 'acceptedAt'), 'DTL-07', 'Displays acceptedAt lifecycle timestamp');
assert(contains(detailScr.content, 'rejectedAt'), 'DTL-08', 'Displays rejectedAt lifecycle timestamp');
assert(contains(detailScr.content, 'rejectionReason'), 'DTL-09', 'Displays server-authoritative rejectionReason if rejected');
assert(contains(detailScr.content, 'facilityName'), 'DTL-10', 'Displays receiving facility name');
assert(contains(detailScr.content, 'facilityAddress'), 'DTL-11', 'Displays receiving facility address');
assert(contains(detailScr.content, 'totalItems'), 'DTL-12', 'Displays total consigned items count');
assert(contains(detailScr.content, 'totalWeightKg') || contains(detailScr.content, 'totalWeight'), 'DTL-13', 'Displays batch weight');
assert(contains(detailScr.content, 'deliveryNotes'), 'DTL-14', 'Displays delivery notes if present');

// ─── 6. Strict Read-Only Boundary & Zero Collector Mutation Controls ─────────
console.log('\n─── 6. Strict Read-Only Boundary & Zero Collector Mutation Controls ─────');

assert(!contains(listScr.content, 'acceptConsignment') && !contains(detailScr.content, 'acceptConsignment'), 'RO-01', 'Collector screens do NOT implement acceptConsignment');
assert(!contains(listScr.content, 'rejectConsignment') && !contains(detailScr.content, 'rejectConsignment'), 'RO-02', 'Collector screens do NOT implement rejectConsignment');
assert(!contains(listScr.content, 'PATCH /consignments') && !contains(detailScr.content, 'PATCH /consignments'), 'RO-03', 'Collector screens do NOT call PATCH /consignments');
assert(!contains(listScr.content, 'offlineQueue.enqueue') && !contains(detailScr.content, 'offlineQueue.enqueue'), 'RO-04', 'Strict read-only: no offline mutation queuing');
assert(!contains(listScr.content, 'MapView') && !contains(detailScr.content, 'MapView'), 'RO-05', 'No map widgets or maps dependencies');
assert(!contains(listScr.content, 'Razorpay') && !contains(detailScr.content, 'Razorpay'), 'RO-06', 'No payment gateways or settlements');
assert(!contains(listScr.content, 'react-native-gifted-chat') && !contains(detailScr.content, 'react-native-gifted-chat'), 'RO-07', 'No chat features');

// ─── 7. Navigation Wiring & Strict Cross-Role Isolation ───────────────────────
console.log('\n─── 7. Navigation Wiring & Strict Cross-Role Isolation ──────────────────');

assert(contains(types.content, 'CollectorConsignments: undefined'), 'NAV-01', 'CollectorStackParamList types CollectorConsignments');
assert(contains(types.content, 'CollectorConsignmentStatus: { consignmentId: string'), 'NAV-02', 'CollectorStackParamList types CollectorConsignmentStatus');
assert(contains(nav.content, 'CollectorConsignmentsScreen'), 'NAV-03', 'CollectorNavigator imports CollectorConsignmentsScreen');
assert(contains(nav.content, 'CollectorConsignmentStatusScreen'), 'NAV-04', 'CollectorNavigator imports CollectorConsignmentStatusScreen');
assert(contains(nav.content, 'name="CollectorConsignments"'), 'NAV-05', 'CollectorNavigator registers CollectorConsignments');
assert(contains(nav.content, 'name="CollectorConsignmentStatus"'), 'NAV-06', 'CollectorNavigator registers CollectorConsignmentStatus');

// Citizens must have NO access to consignment screens
assert(!contains(citNav.content, 'CollectorConsignments'), 'ISO-01', 'CitizenNavigator cannot access CollectorConsignments');
assert(!contains(citNav.content, 'CollectorConsignmentStatus'), 'ISO-02', 'CitizenNavigator cannot access CollectorConsignmentStatus');
assert(!contains(citNav.content, 'ConsignmentDetail'), 'ISO-03', 'CitizenNavigator cannot access ConsignmentDetail');
assert(!contains(citNav.content, 'RecyclerIncoming'), 'ISO-04', 'CitizenNavigator cannot access RecyclerIncoming');

// Collectors must NOT access recycler management screens
assert(!contains(nav.content, 'RecyclerIncoming'), 'ISO-05', 'CollectorNavigator cannot access RecyclerIncoming');
assert(!contains(nav.content, 'ConsignmentDetailScreen'), 'ISO-06', 'CollectorNavigator does not import recycler ConsignmentDetailScreen');

// ─── 8. Flow Integration: Directory & Creation Screens ────────────────────────
console.log('\n─── 8. Flow Integration: Directory & Creation Screens ───────────────────');

assert(contains(dirScr.content, 'CollectorConsignments'), 'INT-01', 'CollectorRecyclerDirectoryScreen links to CollectorConsignments');
assert(contains(createScr.content, 'CollectorConsignmentStatus'), 'INT-02', 'CreateConsignmentScreen links to CollectorConsignmentStatus');
assert(contains(createScr.content, 'Track Consignment'), 'INT-03', 'CreateConsignmentScreen renders Track Consignment action on receipt');

// ─── 9. Non-Regression of Other Roles & Existing Collector Workflows ──────────
console.log('\n─── 9. Non-Regression Verification ──────────────────────────────────────');

const colHome = readFile('src/screens/collector/CollectorDashboardScreen.tsx');
const colBrowse = readFile('src/screens/collector/CollectorBrowseScreen.tsx');
const colPickups = readFile('src/screens/collector/CollectorPickupsScreen.tsx');
const colProfile = readFile('src/screens/collector/CollectorProfileScreen.tsx');
const citHome = readFile('src/screens/citizen/CitizenDashboardScreen.tsx');

assert(colHome.exists, 'REG-01', 'CollectorDashboardScreen.tsx remains intact');
assert(colBrowse.exists, 'REG-02', 'CollectorBrowseScreen.tsx remains intact');
assert(colPickups.exists, 'REG-03', 'CollectorPickupsScreen.tsx remains intact');
assert(colProfile.exists, 'REG-04', 'CollectorProfileScreen.tsx remains intact');
assert(citHome.exists, 'REG-05', 'CitizenDashboardScreen.tsx remains intact');
assert(recyclerIncoming.exists, 'REG-06', 'RecyclerIncomingScreen.tsx remains intact');
assert(recyclerDetail.exists, 'REG-07', 'Recycler ConsignmentDetailScreen.tsx remains intact');

// ─── Summary ───────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  PHASE 17 TASK 4 VERIFICATION SUMMARY`);
console.log(`  Passed: ${passed} / ${passed + failed} (${Math.round((passed / (passed + failed)) * 100)}%)`);
if (failed > 0) {
  console.log(`  Failed: ${failed}`);
  failures.forEach((f) => console.log(`    - [${f.testId}] ${f.description}: ${f.detail}`));
}
console.log('════════════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All verification checks passed successfully!');
  process.exit(0);
}
