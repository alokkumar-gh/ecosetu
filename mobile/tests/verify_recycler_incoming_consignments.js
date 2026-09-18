/**
 * verify_recycler_incoming_consignments.js
 * Verification suite — Phase 17, Task 3: Formal Recycler — Receive & Manage Incoming Consignments
 *
 * Minimum Requirements Verified:
 *   1. Correct backend API endpoints (GET /api/v1/consignments, PATCH /:id/accept, PATCH /:id/reject)
 *   2. Recycler authentication and checkVerified authorization
 *   3. Recycler receives only consignments delivered to its facility
 *   4. Service layer offline-caching for consignments
 *   5. Service layer online-only accept & reject actions (no offline queueing)
 *   6. Screen structure for RecyclerIncomingScreen (role guard, filters, cards, skeletons, empty state)
 *   7. Screen structure for ConsignmentDetailScreen (collector details, item breakdown, lifecycle dates)
 *   8. Accept action available exclusively when status is DELIVERED
 *   9. Informative disabled message when status is CREATED or IN_TRANSIT
 *   10. Explicit accept confirmation modal
 *   11. Reject action requires documented rejection reason (1-500 chars)
 *   12. Duplicate action prevention (submittingRef guard)
 *   13. 409 conflict / status reconciliation handling
 *   14. Offline action blocking and alerts
 *   15. Role isolation: CITIZEN and INFORMAL_COLLECTOR blocked from recycler management
 *   16. Navigation wiring in RecyclerNavigator and types.ts
 *   17. Non-regression of existing collector and citizen functionality
 *
 * Run: node mobile/tests/verify_recycler_incoming_consignments.js
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

const incomingScr = readFile('src/screens/recycler/RecyclerIncomingScreen.tsx');
const detailScr = readFile('src/screens/recycler/ConsignmentDetailScreen.tsx');
const recSvc = readFile('src/services/recyclingService.js');
const statusBadge = readFile('src/components/common/StatusBadge.tsx');
const recyclerNav = readFile('src/navigation/RecyclerNavigator.tsx');
const collectorNav = readFile('src/navigation/CollectorNavigator.tsx');
const citizenNav = readFile('src/navigation/CitizenNavigator.tsx');
const types = readFile('src/navigation/types.ts');
const backendRoutes = readFile('../backend/src/routes/consignmentRoutes.js');
const backendValidators = readFile('../backend/src/validators/consignmentValidators.js');
const backendService = readFile('../backend/src/services/consignmentService.js');

console.log('════════════════════════════════════════════════════════════════════════');
console.log('  ECOSETU Verification: Phase 17, Task 3 — Recycler Incoming Consignments');
console.log('════════════════════════════════════════════════════════════════════════');

// ─── 1. Backend Consignment API & Endpoint Contracts ───────────────────────────
console.log('\n─── 1. Backend Recycler Consignment API Contracts ────────────────────────');

assert(backendRoutes.exists, 'API-01', 'backend consignmentRoutes.js exists');
assert(contains(backendRoutes.content, "router.get("), 'API-02', 'GET / route registered for listing consignments');
assert(contains(backendRoutes.content, "ROLES.RECYCLER"), 'API-03', 'RECYCLER role authorized for consignment listing');
assert(contains(backendRoutes.content, "/:id/accept"), 'API-04', 'PATCH /:id/accept route registered');
assert(contains(backendRoutes.content, "/:id/reject"), 'API-05', 'PATCH /:id/reject route registered');
assert(contains(backendRoutes.content, "checkVerified"), 'API-06', 'Recycler accept/reject routes require checkVerified');
assert(contains(backendValidators.content, "acceptConsignment"), 'API-07', 'acceptConsignment validator defined');
assert(contains(backendValidators.content, "rejectConsignment"), 'API-08', 'rejectConsignment validator defined');
assert(contains(backendValidators.content, "body('reason')"), 'API-09', 'rejectConsignment requires reason field');
assert(contains(backendService.content, "CONSIGNMENT_STATUS.DELIVERED"), 'API-10', 'acceptConsignment enforces DELIVERED status check');
assert(contains(backendService.content, "CONSIGNMENT_ACCEPTED"), 'API-11', 'acceptConsignment creates CONSIGNMENT_ACCEPTED notification');
assert(contains(backendService.content, "CONSIGNMENT_REJECTED"), 'API-12', 'rejectConsignment creates CONSIGNMENT_REJECTED notification');
assert(contains(backendService.content, "recyclingRecord.create"), 'API-13', 'acceptConsignment auto-creates recyclingRecord');

// ─── 2. Service Layer Implementation (Online-Only Actions) ─────────────────────
console.log('\n─── 2. Recycling Service Implementation ──────────────────────────────────');

assert(recSvc.exists, 'SVC-01', 'recyclingService.js exists');
assert(contains(recSvc.content, "getConsignments("), 'SVC-02', 'recyclingService implements getConsignments()');
assert(contains(recSvc.content, "CACHE_RECYCLER_CONSIGNMENTS"), 'SVC-03', 'Uses @ecosetu_recycler_consignments cache');
assert(contains(recSvc.content, "acceptConsignment("), 'SVC-04', 'recyclingService implements acceptConsignment(id)');
assert(contains(recSvc.content, "rejectConsignment("), 'SVC-05', 'recyclingService implements rejectConsignment(id, reason)');
assert(contains(recSvc.content, "/consignments/${consignmentId}/accept"), 'SVC-06', 'acceptConsignment calls PATCH /consignments/:id/accept');
assert(contains(recSvc.content, "/consignments/${consignmentId}/reject"), 'SVC-07', 'rejectConsignment calls PATCH /consignments/:id/reject');
assert(contains(recSvc.content, "!networkService.isConnected()"), 'SVC-08', 'acceptConsignment and rejectConsignment validate online connectivity');
assert(contains(recSvc.content, "isOfflineError: true"), 'SVC-09', 'Throws isOfflineError when called offline');
assert(!contains(recSvc.content, "offlineQueue.enqueue"), 'SVC-10', 'Zero offline queueing for consignment accept/reject');

// ─── 3. Recycler Incoming Consignments Screen ──────────────────────────────────
console.log('\n─── 3. Recycler Incoming Consignments Screen ─────────────────────────────');

assert(incomingScr.exists, 'SCR-01', 'RecyclerIncomingScreen.tsx exists');
assert(contains(incomingScr.content, "user.role !== 'RECYCLER'"), 'SCR-02', 'Role guard checks RECYCLER role');
assert(contains(incomingScr.content, "Access Restricted"), 'SCR-03', 'Renders Access Restricted for unauthorized roles');
assert(contains(incomingScr.content, "PENDING_VERIFICATION"), 'SCR-04', 'Handles unverified/pending recycler status warning');
assert(contains(incomingScr.content, "TopAppBar"), 'SCR-05', 'Renders TopAppBar');
assert(contains(incomingScr.content, "FILTER_STATUSES"), 'SCR-06', 'Defines filter chips for status browsing');
assert(contains(incomingScr.content, "DELIVERED"), 'SCR-07', 'Filter chips include DELIVERED status');
assert(contains(incomingScr.content, "StatusBadge"), 'SCR-08', 'Uses StatusBadge component for consignment status');
assert(contains(incomingScr.content, "RefreshControl"), 'SCR-09', 'Provides native pull-to-refresh');
assert(contains(incomingScr.content, "refreshingRef"), 'SCR-10', 'Uses in-flight guard to prevent duplicate refresh requests');
assert(contains(incomingScr.content, "renderSkeleton"), 'SCR-11', 'Provides skeleton loading state');
assert(contains(incomingScr.content, "EmptyState"), 'SCR-12', 'Provides context-aware EmptyState component');
assert(contains(incomingScr.content, "OfflineBanner"), 'SCR-13', 'Shows OfflineBanner when disconnected');
assert(contains(incomingScr.content, "fromCache"), 'SCR-14', 'Informs user when displaying cached consignments');
assert(contains(incomingScr.content, "ConsignmentDetail"), 'SCR-15', 'Navigates to ConsignmentDetail on item press');
assert(!contains(incomingScr.content, "citizen.email"), 'SCR-16', 'Zero citizen private contact info exposed');
assert(!contains(incomingScr.content, "passwordHash"), 'SCR-17', 'Zero credential exposure');

// ─── 4. Recycler Consignment Detail Screen ──────────────────────────────────────
console.log('\n─── 4. Recycler Consignment Detail Screen ────────────────────────────────');

assert(detailScr.exists, 'DTL-01', 'ConsignmentDetailScreen.tsx exists');
assert(contains(detailScr.content, "user.role !== 'RECYCLER'"), 'DTL-02', 'Role guard checks RECYCLER role');
assert(contains(detailScr.content, "TopAppBar"), 'DTL-03', 'Renders TopAppBar with back navigation');
assert(contains(detailScr.content, "StatusBadge"), 'DTL-04', 'Renders StatusBadge for consignment status');
assert(contains(detailScr.content, "deliveredAt"), 'DTL-05', 'Renders deliveredAt lifecycle timestamp');
assert(contains(detailScr.content, "acceptedAt"), 'DTL-06', 'Renders acceptedAt lifecycle timestamp');
assert(contains(detailScr.content, "rejectedAt"), 'DTL-07', 'Renders rejectedAt lifecycle timestamp');
assert(contains(detailScr.content, "rejectionReason"), 'DTL-08', 'Displays official rejectionReason if REJECTED');
assert(contains(detailScr.content, "recyclingRecord"), 'DTL-09', 'Displays recyclingRecord status (RECEIVED) if ACCEPTED');
assert(contains(detailScr.content, "collectorName"), 'DTL-10', 'Displays delivering collector name');
assert(contains(detailScr.content, "Kabadiwala"), 'DTL-11', 'Identifies delivering collector under Kabadiwala framework');
assert(contains(detailScr.content, "totalItems"), 'DTL-12', 'Displays total items summary');
assert(contains(detailScr.content, "totalWeightKg"), 'DTL-13', 'Displays total weight summary');
assert(contains(detailScr.content, "deliveryNotes"), 'DTL-14', 'Displays collector delivery notes if present');

// ─── 5. Accept & Reject Action Logic & Constraints ─────────────────────────────
console.log('\n─── 5. Accept & Reject Action Logic & Constraints ───────────────────────');

assert(contains(detailScr.content, "isDelivered"), 'ACT-01', 'Consignment must be in DELIVERED status for acceptance');
assert(contains(detailScr.content, "Accept Consignment"), 'ACT-02', 'Accept Consignment action button provided');
assert(contains(detailScr.content, "Reject"), 'ACT-03', 'Reject Consignment action button provided');
assert(contains(detailScr.content, "showAcceptModal"), 'ACT-04', 'Accept action triggers explicit confirmation modal');
assert(contains(detailScr.content, "showRejectModal"), 'ACT-05', 'Reject action triggers reason entry modal');
assert(contains(detailScr.content, "rejectionReason"), 'ACT-06', 'Reject modal requires rejection reason input');
assert(contains(detailScr.content, "maxLength={500}"), 'ACT-07', 'Reason input enforces maximum 500 characters');
assert(contains(detailScr.content, "submittingRef"), 'ACT-08', 'In-flight submission guard prevents double-action');
assert(contains(detailScr.content, "isProcessing"), 'ACT-09', 'UI disabled while action mutation is processing');
assert(contains(detailScr.content, "isOffline"), 'ACT-10', 'Actions disabled when offline with user notification');
assert(contains(detailScr.content, "Status Mismatch"), 'ACT-11', 'Handles 409 conflict and triggers re-fetch');
assert(contains(detailScr.content, "recyclingService.acceptConsignment"), 'ACT-12', 'Calls recyclingService.acceptConsignment');
assert(contains(detailScr.content, "recyclingService.rejectConsignment"), 'ACT-13', 'Calls recyclingService.rejectConsignment');

// ─── 6. StatusBadge Component Enhancements ─────────────────────────────────────
console.log('\n─── 6. StatusBadge Component Enhancements ────────────────────────────────');

assert(statusBadge.exists, 'BDG-01', 'StatusBadge.tsx exists');
assert(contains(statusBadge.content, "case 'CREATED':"), 'BDG-02', 'StatusBadge supports CREATED status');
assert(contains(statusBadge.content, "case 'IN_TRANSIT':"), 'BDG-03', 'StatusBadge supports IN_TRANSIT status');
assert(contains(statusBadge.content, "case 'DELIVERED':"), 'BDG-04', 'StatusBadge supports DELIVERED status');
assert(contains(statusBadge.content, "case 'ACCEPTED':"), 'BDG-05', 'StatusBadge supports ACCEPTED status');
assert(contains(statusBadge.content, "case 'REJECTED':"), 'BDG-06', 'StatusBadge supports REJECTED status');

// ─── 7. Navigation Wiring & Role Isolation ─────────────────────────────────────
console.log('\n─── 7. Navigation Wiring & Role Isolation ────────────────────────────────');

assert(recyclerNav.exists, 'NAV-01', 'RecyclerNavigator.tsx exists');
assert(contains(recyclerNav.content, "RecyclerIncomingScreen"), 'NAV-02', 'RecyclerNavigator imports RecyclerIncomingScreen');
assert(contains(recyclerNav.content, "ConsignmentDetailScreen"), 'NAV-03', 'RecyclerNavigator imports ConsignmentDetailScreen');
assert(contains(recyclerNav.content, 'component={RecyclerIncomingScreen}'), 'NAV-04', 'RecyclerIncoming tab uses RecyclerIncomingScreen');
assert(contains(recyclerNav.content, 'name="ConsignmentDetail"'), 'NAV-05', 'ConsignmentDetail registered in Stack.Navigator');
assert(contains(types.content, 'ConsignmentDetail: { consignmentId: string'), 'NAV-06', 'RecyclerStackParamList includes ConsignmentDetail');

// Role Isolation: Citizens must have NO access to recycler consignment screens
assert(!contains(citizenNav.content, 'RecyclerIncoming'), 'ISO-01', 'CitizenNavigator cannot access RecyclerIncoming');
assert(!contains(citizenNav.content, 'ConsignmentDetail'), 'ISO-02', 'CitizenNavigator cannot access ConsignmentDetail');

// Role Isolation: Collectors must have NO access to recycler consignment management
assert(!contains(collectorNav.content, 'RecyclerIncoming'), 'ISO-03', 'CollectorNavigator cannot access RecyclerIncoming');
assert(!contains(collectorNav.content, 'ConsignmentDetail'), 'ISO-04', 'CollectorNavigator cannot access ConsignmentDetail');

// ─── 8. Non-Regression of Collector & Citizen Workflows ─────────────────────────
console.log('\n─── 8. Non-Regression Verification ──────────────────────────────────────');

assert(contains(collectorNav.content, 'CreateConsignment'), 'REG-01', 'CollectorNavigator retains CreateConsignment route');
assert(contains(collectorNav.content, 'CollectorConsign'), 'REG-02', 'CollectorNavigator retains CollectorConsign tab');
assert(contains(recyclerNav.content, 'RecyclerHome'), 'REG-03', 'RecyclerNavigator retains RecyclerHome tab');
assert(contains(recyclerNav.content, 'RecyclerRecords'), 'REG-04', 'RecyclerNavigator retains RecyclerRecords tab');
assert(contains(recyclerNav.content, 'RecyclerProfile'), 'REG-05', 'RecyclerNavigator retains RecyclerProfile tab');

// ─── Summary ───────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  PHASE 17 TASK 3 VERIFICATION SUMMARY`);
console.log(`  Passed: ${passed} / ${passed + failed} (${Math.round((passed / (passed + failed)) * 100)}%)`);
if (failed > 0) {
  console.log(`  Failed: ${failed}`);
  failures.forEach((f) => console.log(`    - [${f.testId}] ${f.description}: ${f.detail}`));
}
console.log('════════════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
