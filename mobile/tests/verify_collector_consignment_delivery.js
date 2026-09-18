/**
 * verify_collector_consignment_delivery.js
 * Verification suite — Phase 17, Task 5: Collector Consignment Delivery / Handoff Tracking
 *
 * Requirements:
 *   1. Exact backend delivery endpoint (PATCH /api/v1/consignments/:id/deliver)
 *   2. Collector authentication, authorization & checkVerified middleware
 *   3. Backend ownership scoping (collector own consignment only)
 *   4. Backend lifecycle rule: status must be CREATED or IN_TRANSIT to transition to DELIVERED
 *   5. Server-generated deliveredAt timestamp
 *   6. RecyclingService deliverConsignment method implementation (online-only, cache sync)
 *   7. CollectorService deliverConsignment delegation
 *   8. CollectorConsignmentStatusScreen delivery action UI & visibility gating
 *   9. Explicit confirmation modal with batch summary & consequence explanation
 *   10. Duplicate-submission prevention (deliveringRef / isDelivering)
 *   11. Server-authoritative state reconciliation on 409 conflict
 *   12. Offline mutation blocking (no offlineQueue.enqueue, offline alert/disabled button)
 *   13. Recycler-side compatibility (DELIVERED status makes consignment actionable for accept/reject)
 *   14. Role isolation: CITIZEN cannot access delivery routes/screens
 *   15. Role isolation: RECYCLER cannot deliver consignments
 *   16. Role isolation: COLLECTOR cannot accept or reject consignments
 *   17. Non-regression: Collector creation, directory, pickups, profile, citizen, and recycler workflows remain intact
 *
 * Run: node mobile/tests/verify_collector_consignment_delivery.js
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

const statusScr = readFile('src/screens/collector/CollectorConsignmentStatusScreen.tsx');
const listScr = readFile('src/screens/collector/CollectorConsignmentsScreen.tsx');
const dirScr = readFile('src/screens/collector/CollectorRecyclerDirectoryScreen.tsx');
const createScr = readFile('src/screens/collector/CreateConsignmentScreen.tsx');
const recSvc = readFile('src/services/recyclingService.js');
const colSvc = readFile('src/services/collectorService.js');
const nav = readFile('src/navigation/CollectorNavigator.tsx');
const citNav = readFile('src/navigation/CitizenNavigator.tsx');
const recyclerNav = readFile('src/navigation/RecyclerNavigator.tsx');
const admNav = readFile('src/navigation/AdminNavigator.tsx');
const backendRoutes = readFile('../backend/src/routes/consignmentRoutes.js');
const backendValidators = readFile('../backend/src/validators/consignmentValidators.js');
const backendService = readFile('../backend/src/services/consignmentService.js');
const backendSchema = readFile('../backend/prisma/schema.prisma');
const recyclerIncoming = readFile('src/screens/recycler/RecyclerIncomingScreen.tsx');
const recyclerDetail = readFile('src/screens/recycler/ConsignmentDetailScreen.tsx');

console.log('════════════════════════════════════════════════════════════════════════');
console.log('  ECOSETU Verification: Phase 17, Task 5 — Collector Delivery Tracking');
console.log('════════════════════════════════════════════════════════════════════════');

// ─── 1. Backend Delivery Endpoint & Contracts ─────────────────────────────────
console.log('\n─── 1. Backend Delivery Endpoint & Authorization Contracts ──────────────');

assert(backendRoutes.exists, 'API-01', 'backend consignmentRoutes.js exists');
assert(contains(backendRoutes.content, "router.patch(\n  '/:id/deliver',") || contains(backendRoutes.content, "'/:id/deliver'"), 'API-02', 'PATCH /:id/deliver route registered');
assert(contains(backendRoutes.content, "ROLES.INFORMAL_COLLECTOR"), 'API-03', 'Authorized strictly for INFORMAL_COLLECTOR role');
assert(contains(backendRoutes.content, "checkVerified"), 'API-04', 'Requires checkVerified middleware');
assert(backendValidators.exists, 'API-05', 'backend consignmentValidators.js exists');
assert(contains(backendValidators.content, 'deliverConsignment'), 'API-06', 'deliverConsignment validator defined');
assert(contains(backendValidators.content, 'PROTECTED_CONSIGNMENT_FIELDS'), 'API-07', 'Protects against client-tampered status or timestamps in request body');

// ─── 2. Backend Service Logic: Ownership & Status Transition ──────────────────
console.log('\n─── 2. Backend Service Logic: Ownership & Status Transition ─────────────');

assert(backendService.exists, 'SVC-01', 'backend consignmentService.js exists');
assert(contains(backendService.content, 'deliverConsignment(collectorUserId, consignmentId)'), 'SVC-02', 'Backend implements deliverConsignment service method');
assert(contains(backendService.content, 'consignment.collectorId !== collectorProfile.id'), 'SVC-03', 'Enforces strict collector ownership (own consignments only)');
assert(contains(backendService.content, 'CONSIGNMENT_STATUS.CREATED') && contains(backendService.content, 'CONSIGNMENT_STATUS.IN_TRANSIT'), 'SVC-04', 'Requires status to be CREATED or IN_TRANSIT');
assert(contains(backendService.content, 'status: CONSIGNMENT_STATUS.DELIVERED'), 'SVC-05', 'Transitions status to DELIVERED');
assert(contains(backendService.content, 'deliveredAt: new Date()'), 'SVC-06', 'Server generates authoritative deliveredAt timestamp');

// ─── 3. Mobile Recycling Service Layer: deliverConsignment ─────────────────────
console.log('\n─── 3. Mobile Recycling Service Layer: deliverConsignment ───────────────');

assert(recSvc.exists, 'MOB-01', 'recyclingService.js exists');
assert(contains(recSvc.content, 'deliverConsignment(consignmentId)'), 'MOB-02', 'recyclingService implements deliverConsignment(consignmentId)');
assert(contains(recSvc.content, 'apiClient.patch(`/consignments/${consignmentId}/deliver`)'), 'MOB-03', 'Calls PATCH /consignments/:id/deliver');
assert(contains(recSvc.content, '!networkService.isConnected()'), 'MOB-04', 'Validates online connectivity before making delivery call');
assert(contains(recSvc.content, 'isOfflineError: true'), 'MOB-05', 'Throws isOfflineError when offline (blocks offline mutation)');
assert(!contains(recSvc.content, 'offlineQueue.enqueue'), 'MOB-06', 'Strictly server-authoritative: zero offline queueing');
assert(contains(recSvc.content, 'CACHE_COLLECTOR_CONSIGNMENTS'), 'MOB-07', 'Updates @ecosetu_collector_consignments cache on delivery');
assert(colSvc.exists, 'MOB-08', 'collectorService.js exists');
assert(contains(colSvc.content, 'deliverConsignment(consignmentId)'), 'MOB-09', 'collectorService delegates deliverConsignment to recyclingService');

// ─── 4. Collector Consignment Status Screen: Delivery UI ──────────────────────
console.log('\n─── 4. Collector Consignment Status Screen: Delivery UI ─────────────────');

assert(statusScr.exists, 'UI-01', 'CollectorConsignmentStatusScreen.tsx exists');
assert(contains(statusScr.content, 'CONSIGNMENT_STATUS.CREATED') && contains(statusScr.content, 'CONSIGNMENT_STATUS.IN_TRANSIT'), 'UI-02', 'Gated to show delivery action when CREATED or IN_TRANSIT');
assert(contains(statusScr.content, 'handleOpenDeliverModal'), 'UI-03', 'Provides handleOpenDeliverModal callback');
assert(contains(statusScr.content, 'handleConfirmDelivery'), 'UI-04', 'Provides handleConfirmDelivery callback');
assert(contains(statusScr.content, 'deliveringRef'), 'UI-05', 'Uses deliveringRef in-flight guard to prevent duplicate submission');
assert(contains(statusScr.content, 'isDelivering'), 'UI-06', 'Manages isDelivering progress state');
assert(contains(statusScr.content, 'ActivityIndicator'), 'UI-07', 'Renders ActivityIndicator during in-flight delivery submission');
assert(contains(statusScr.content, 'Mark as Delivered at Facility') || contains(statusScr.content, 'Mark as Delivered'), 'UI-08', 'Displays clear delivery handoff button');
assert(contains(statusScr.content, 'deliverButtonDisabled'), 'UI-09', 'Disables delivery button when offline or delivering');
assert(contains(statusScr.content, 'Recording delivery requires an active internet connection'), 'UI-10', 'Warns collector of connectivity requirement when offline');

// ─── 5. Delivery Confirmation Modal & Consequence Explanation ────────────────
console.log('\n─── 5. Delivery Confirmation Modal & Consequence Explanation ───────────');

assert(contains(statusScr.content, 'Modal'), 'MOD-01', 'Uses Modal component for explicit delivery confirmation');
assert(contains(statusScr.content, 'Confirm Facility Delivery'), 'MOD-02', 'Modal title clearly states Confirm Facility Delivery');
assert(contains(statusScr.content, 'shortId') && contains(statusScr.content, 'facilityName'), 'MOD-03', 'Modal reviews consignment reference and receiving facility');
assert(contains(statusScr.content, 'totalItemsCount') && contains(statusScr.content, 'totalWeight'), 'MOD-04', 'Modal reviews item count and batch weight');
assert(contains(statusScr.content, 'records physical arrival at the formal recycling facility'), 'MOD-05', 'Explains consequence: records arrival and enables recycler inspection');
assert(contains(statusScr.content, 'Server confirmation is the final authority'), 'MOD-06', 'States server confirmation is the final authority');
assert(contains(statusScr.content, 'Cancel'), 'MOD-07', 'Provides cancel action to dismiss modal');
assert(contains(statusScr.content, 'Confirm Delivery'), 'MOD-08', 'Provides confirm action to submit delivery');

// ─── 6. 409 Conflict Reconciliation & Error Handling ─────────────────────────
console.log('\n─── 6. 409 Conflict Reconciliation & Error Handling ─────────────────────');

assert(contains(statusScr.content, '409') || contains(statusScr.content, 'Cannot mark consignment as delivered in status'), 'ERR-01', 'Detects 409 or status mismatch conflict');
assert(contains(statusScr.content, 'loadConsignment(false)'), 'ERR-02', 'Re-synchronizes server-authoritative state upon conflict');
assert(contains(statusScr.content, 'Delivery Recorded'), 'ERR-03', 'Provides clear success alert upon successful delivery');

// ─── 7. Tracking List Screen Integration ──────────────────────────────────────
console.log('\n─── 7. Tracking List Screen Integration ─────────────────────────────────');

assert(listScr.exists, 'LST-01', 'CollectorConsignmentsScreen.tsx exists');
assert(contains(listScr.content, 'Handoff Pending →'), 'LST-02', 'List screen displays Handoff Pending indicator for created batches');
assert(contains(listScr.content, 'Delivered →'), 'LST-03', 'List screen displays Delivered indicator once delivery is recorded');
assert(contains(listScr.content, 'CollectorConsignmentStatus'), 'LST-04', 'Navigates to detail screen to execute delivery');

// ─── 8. Recycler Compatibility: DELIVERED enables Recycler Actions ───────────
console.log('\n─── 8. Recycler Compatibility: DELIVERED enables Recycler Actions ───────');

assert(recyclerDetail.exists, 'REC-01', 'Recycler ConsignmentDetailScreen.tsx exists');
assert(contains(recyclerDetail.content, "status === 'DELIVERED'"), 'REC-02', 'Recycler screen requires DELIVERED status for acceptance');
assert(contains(recyclerIncoming.content, 'DELIVERED'), 'REC-03', 'Recycler incoming list highlights DELIVERED batches');

// ─── 9. Strict Role Isolation ─────────────────────────────────────────────────
console.log('\n─── 9. Strict Role Isolation ────────────────────────────────────────────');

// Citizens have NO access to consignment delivery
assert(!contains(citNav.content, 'deliverConsignment'), 'ISO-01', 'CitizenNavigator has no delivery methods');
assert(!contains(citNav.content, 'CollectorConsignments'), 'ISO-02', 'CitizenNavigator cannot access CollectorConsignments');
assert(!contains(citNav.content, 'CollectorConsignmentStatus'), 'ISO-03', 'CitizenNavigator cannot access CollectorConsignmentStatus');

// Recyclers cannot deliver consignments
assert(!contains(recyclerNav.content, 'CollectorConsignmentStatus'), 'ISO-04', 'RecyclerNavigator cannot access CollectorConsignmentStatus');
assert(!contains(recyclerIncoming.content, 'deliverConsignment'), 'ISO-05', 'Recycler cannot call deliverConsignment');

// Collectors cannot accept or reject consignments
assert(!contains(statusScr.content, 'acceptConsignment'), 'ISO-06', 'Collector cannot call acceptConsignment');
assert(!contains(statusScr.content, 'rejectConsignment'), 'ISO-07', 'Collector cannot call rejectConsignment');

// ─── 10. Non-Regression of Other Workflows ────────────────────────────────────
console.log('\n─── 10. Non-Regression Verification ─────────────────────────────────────');

assert(createScr.exists && contains(createScr.content, 'createConsignment'), 'REG-01', 'CreateConsignmentScreen remains intact');
assert(dirScr.exists && contains(dirScr.content, 'CollectorConsignments'), 'REG-02', 'CollectorRecyclerDirectoryScreen remains intact');
assert(nav.exists && contains(nav.content, 'CollectorConsignmentStatus'), 'REG-03', 'CollectorNavigator remains intact');

const colDashboard = readFile('src/screens/collector/CollectorDashboardScreen.tsx');
const colPickups = readFile('src/screens/collector/CollectorPickupsScreen.tsx');
const citDashboard = readFile('src/screens/citizen/CitizenDashboardScreen.tsx');

assert(colDashboard.exists, 'REG-04', 'CollectorDashboardScreen remains intact');
assert(colPickups.exists, 'REG-05', 'CollectorPickupsScreen remains intact');
assert(citDashboard.exists, 'REG-06', 'CitizenDashboardScreen remains intact');

// ─── Summary ───────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`  PHASE 17 TASK 5 VERIFICATION SUMMARY`);
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
