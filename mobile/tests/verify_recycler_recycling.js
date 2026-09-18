/**
 * verify_recycler_recycling.js
 * Verification suite — Phase 17, Task 6: Formal Recycler — Recycling Processing & Completion
 *
 * Requirements:
 *   1. Exact backend recycling endpoints:
 *      - GET /api/v1/recycling-records
 *      - PATCH /api/v1/recycling-records/:id/start-processing
 *      - PATCH /api/v1/recycling-records/:id/complete
 *   2. Recycler authentication, authorization & checkVerified middleware
 *   3. Facility ownership scoping on recycling records
 *   4. Backend lifecycle rule: status must be RECEIVED to start processing -> PROCESSING
 *   5. Backend lifecycle rule: status must be PROCESSING to complete recycling -> COMPLETED
 *   6. Atomically updates linked e-waste items from CONSIGNED to RECYCLED
 *   7. Audit logging: RECYCLING_STARTED & RECYCLING_COMPLETED
 *   8. Notification dispatch: RECYCLING_COMPLETED sent to original citizen owners
 *   9. Citizen traceability integration reflects recycling lifecycle events
 *   10. RecyclingService implementation:
 *       - getRecyclingRecords (offline-first, caching in @ecosetu_recycler_records)
 *       - startProcessing (online-only, no offlineQueue, cache sync)
 *       - completeRecycling (online-only, validation, no offlineQueue, cache sync)
 *   11. RecyclerRecordsScreen (metrics, filters, card list, quick action modals, offline disabling, 409 conflict handling)
 *   12. RecyclingRecordDetailScreen (stepper, timestamps, item breakdown, start & complete actions, input validation)
 *   13. RecyclerNavigator integration (wires RecyclerRecords tab and RecyclingRecordDetail stack screen)
 *   14. Role isolation: CITIZEN and INFORMAL_COLLECTOR have NO access to recycling processing
 *   15. Non-regression: Consignment creation, delivery, incoming acceptance, and citizen traceability remain intact
 *
 * Run: node mobile/tests/verify_recycler_recycling.js
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

function readBackendFile(relPath) {
  const absPath = path.join(__dirname, '../../backend', relPath);
  if (!fs.existsSync(absPath)) return { exists: false, content: '' };
  return { exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

function contains(content, pattern) {
  if (typeof pattern === 'string') return content.includes(pattern);
  return pattern.test(content);
}

// ─── Load Subjects ────────────────────────────────────────────────────────────

// Backend subjects
const beRoutes = readBackendFile('src/routes/recyclingRoutes.js');
const beValidators = readBackendFile('src/validators/recyclingValidators.js');
const beController = readBackendFile('src/controllers/recyclingController.js');
const beService = readBackendFile('src/services/recyclingService.js');
const beIndex = readBackendFile('src/routes/index.js');
const beEwaste = readBackendFile('src/services/ewasteService.js');

// Mobile subjects
const recyclingSvc = readFile('src/services/recyclingService.js');
const recordsScr = readFile('src/screens/recycler/RecyclerRecordsScreen.tsx');
const detailScr = readFile('src/screens/recycler/RecyclingRecordDetailScreen.tsx');
const incomingScr = readFile('src/screens/recycler/RecyclerIncomingScreen.tsx');
const csgDetailScr = readFile('src/screens/recycler/ConsignmentDetailScreen.tsx');
const recyclerNav = readFile('src/navigation/RecyclerNavigator.tsx');
const citizenNav = readFile('src/navigation/CitizenNavigator.tsx');
const collectorNav = readFile('src/navigation/CollectorNavigator.tsx');
const types = readFile('src/navigation/types.ts');
const statusBadge = readFile('src/components/common/StatusBadge.tsx');

console.log('================================================================');
console.log('  PHASE 17, TASK 6: RECYCLING PROCESSING & COMPLETION TESTS');
console.log('================================================================\n');

// ─── 1. Backend Endpoint Contract & Architecture ──────────────────────────────
console.log('─── 1. Backend Endpoints & Architecture ───────────────────────────');

assert(beRoutes.exists, 'BE-01', 'recyclingRoutes.js exists in backend');
assert(beValidators.exists, 'BE-02', 'recyclingValidators.js exists in backend');
assert(beController.exists, 'BE-03', 'recyclingController.js exists in backend');
assert(beService.exists, 'BE-04', 'recyclingService.js exists in backend');

assert(contains(beIndex.content, "router.use('/recycling-records'"), 'BE-05', 'Mounted at /api/v1/recycling-records');

// GET /api/v1/recycling-records
assert(contains(beRoutes.content, "router.get("), 'BE-06', 'Defines GET / endpoint for listing records');
assert(contains(beRoutes.content, 'ROLES.RECYCLER'), 'BE-07', 'GET / permits RECYCLER role');
assert(contains(beRoutes.content, 'ROLES.ADMIN'), 'BE-08', 'GET / permits ADMIN role');
assert(contains(beService.content, 'where.recyclerId = recyclerProfile.id'), 'BE-09', 'GET / scopes records by recyclerId for RECYCLER');

// PATCH /api/v1/recycling-records/:id/start-processing
assert(contains(beRoutes.content, "'/:id/start-processing'"), 'BE-10', 'Defines PATCH /:id/start-processing endpoint');
assert(contains(beRoutes.content, 'checkVerified'), 'BE-11', 'start-processing enforces checkVerified middleware');
assert(contains(beService.content, 'record.status !== RECYCLING_STATUS.RECEIVED'), 'BE-12', 'start-processing requires RECEIVED status');
assert(contains(beService.content, 'status: RECYCLING_STATUS.PROCESSING'), 'BE-13', 'start-processing transitions status to PROCESSING');
assert(contains(beService.content, 'processingStartedAt: new Date()'), 'BE-14', 'start-processing records server timestamp');
assert(contains(beService.content, "action: 'RECYCLING_STARTED'"), 'BE-15', 'start-processing logs RECYCLING_STARTED audit event');

// PATCH /api/v1/recycling-records/:id/complete
assert(contains(beRoutes.content, "'/:id/complete'"), 'BE-16', 'Defines PATCH /:id/complete endpoint');
assert(contains(beService.content, 'record.status !== RECYCLING_STATUS.PROCESSING'), 'BE-17', 'complete requires PROCESSING status');
assert(contains(beService.content, 'status: RECYCLING_STATUS.COMPLETED'), 'BE-18', 'complete transitions status to COMPLETED');
assert(contains(beService.content, 'completedAt: new Date()'), 'BE-19', 'complete records server timestamp');
assert(contains(beService.content, 'status: ITEM_STATUS.RECYCLED'), 'BE-20', 'complete atomically updates items to RECYCLED');
assert(contains(beService.content, "action: 'RECYCLING_COMPLETED'"), 'BE-21', 'complete logs RECYCLING_COMPLETED audit event');
assert(contains(beService.content, 'NOTIFICATION_TYPES.RECYCLING_COMPLETED'), 'BE-22', 'complete notifies citizen owners of e-waste');

// Citizen Traceability
assert(contains(beEwaste.content, 'RECYCLING_STARTED'), 'BE-23', 'ewasteService traceability chain includes RECYCLING_STARTED');
assert(contains(beEwaste.content, 'RECYCLING_COMPLETED'), 'BE-24', 'ewasteService traceability chain includes RECYCLING_COMPLETED');

// ─── 2. Mobile Recycling Service ──────────────────────────────────────────────
console.log('\n─── 2. Mobile Recycling Service ─────────────────────────────────');

assert(contains(recyclingSvc.content, 'CACHE_RECYCLER_RECORDS'), 'SVC-01', 'Exports CACHE_RECYCLER_RECORDS token');
assert(contains(recyclingSvc.content, '@ecosetu_recycler_records'), 'SVC-02', 'Cache key is @ecosetu_recycler_records');
assert(contains(recyclingSvc.content, 'async getRecyclingRecords'), 'SVC-03', 'Implements getRecyclingRecords(params)');
assert(contains(recyclingSvc.content, '/recycling-records'), 'SVC-04', 'getRecyclingRecords queries /recycling-records');
assert(contains(recyclingSvc.content, 'fromCache'), 'SVC-05', 'Returns fromCache indicator for offline awareness');

// Online-only mutation checks
assert(contains(recyclingSvc.content, 'async startProcessing(recordId)'), 'SVC-06', 'Implements startProcessing(recordId)');
assert(contains(recyclingSvc.content, 'networkService.isConnected()'), 'SVC-07', 'startProcessing checks networkService.isConnected()');
assert(contains(recyclingSvc.content, 'isOfflineError = true'), 'SVC-08', 'Throws offline error without queuing');
assert(!contains(recyclingSvc.content, 'offlineQueue.enqueue'), 'SVC-09', 'Mutations are NEVER queued into offlineQueue');
assert(contains(recyclingSvc.content, 'start-processing'), 'SVC-10', 'startProcessing patches start-processing endpoint');

assert(contains(recyclingSvc.content, 'async completeRecycling(recordId, data'), 'SVC-11', 'Implements completeRecycling(recordId, data)');
assert(contains(recyclingSvc.content, '/complete'), 'SVC-12', 'completeRecycling patches complete endpoint');
assert(contains(recyclingSvc.content, 'processingNotes'), 'SVC-13', 'Supports processingNotes in completion payload');
assert(contains(recyclingSvc.content, 'outputDescription'), 'SVC-14', 'Supports outputDescription in completion payload');
assert(contains(recyclingSvc.content, 'outputWeightKg'), 'SVC-15', 'Supports outputWeightKg in completion payload');
assert(contains(recyclingSvc.content, 'weight < 0'), 'SVC-16', 'Validates non-negative outputWeightKg');

// ─── 3. RecyclerRecordsScreen Implementation ──────────────────────────────────
console.log('\n─── 3. RecyclerRecordsScreen Implementation ────────────────────');

assert(recordsScr.exists, 'SCR-01', 'RecyclerRecordsScreen.tsx exists');
assert(contains(recordsScr.content, 'export const RecyclerRecordsScreen'), 'SCR-02', 'Exports RecyclerRecordsScreen component');
assert(contains(recordsScr.content, 'Recycling Records'), 'SCR-03', 'Renders Recycling Records top app bar');
assert(contains(recordsScr.content, 'useAuth()'), 'SCR-04', 'Uses useAuth hook for user role access check');
assert(contains(recordsScr.content, "user.role !== 'RECYCLER'"), 'SCR-05', 'Enforces RECYCLER role guard');
assert(contains(recordsScr.content, 'Access Restricted'), 'SCR-06', 'Renders Access Restricted for unauthorized roles');

// Filtering and Metrics
assert(contains(recordsScr.content, 'FILTER_STATUSES'), 'SCR-07', 'Defines filter statuses array');
assert(contains(recordsScr.content, 'RECEIVED'), 'SCR-08', 'Supports RECEIVED filter status');
assert(contains(recordsScr.content, 'PROCESSING'), 'SCR-09', 'Supports PROCESSING filter status');
assert(contains(recordsScr.content, 'COMPLETED'), 'SCR-10', 'Supports COMPLETED filter status');
assert(contains(recordsScr.content, 'metricsContainer'), 'SCR-11', 'Renders summary metrics header');

// Cards & Data Display
assert(contains(recordsScr.content, '#REC-'), 'SCR-12', 'Displays formatted record reference (#REC-...)');
assert(contains(recordsScr.content, '#CSG-'), 'SCR-13', 'Displays associated consignment reference (#CSG-...)');
assert(contains(recordsScr.content, '<StatusBadge'), 'SCR-14', 'Renders authoritative StatusBadge');
assert(contains(recordsScr.content, 'receivedAt'), 'SCR-15', 'Displays receivedAt date');
assert(contains(recordsScr.content, 'completedAt'), 'SCR-16', 'Displays completedAt date');
assert(contains(recordsScr.content, 'outputWeightKg'), 'SCR-17', 'Displays recovered output yield weight');
assert(contains(recordsScr.content, 'outputDescription'), 'SCR-18', 'Displays yield description');

// Quick Actions & Double-tap Prevention
assert(contains(recordsScr.content, 'Start Processing ⚙️'), 'SCR-19', 'Renders Start Processing button on RECEIVED status');
assert(contains(recordsScr.content, 'Complete Recycling ✅'), 'SCR-20', 'Renders Complete Recycling button on PROCESSING status');
assert(contains(recordsScr.content, 'submittingRef'), 'SCR-21', 'Employs submittingRef for double-tap prevention');
assert(contains(recordsScr.content, 'isSubmittingAction'), 'SCR-22', 'Employs isSubmittingAction state');
assert(contains(recordsScr.content, 'isOffline && styles.btnDisabled'), 'SCR-23', 'Disables action buttons when offline');
assert(contains(recordsScr.content, '409'), 'SCR-24', 'Handles 409 conflict responses with server reconciliation');

// ─── 4. RecyclingRecordDetailScreen Implementation ────────────────────────────
console.log('\n─── 4. RecyclingRecordDetailScreen Implementation ──────────────');

assert(detailScr.exists, 'DTL-01', 'RecyclingRecordDetailScreen.tsx exists');
assert(contains(detailScr.content, 'export const RecyclingRecordDetailScreen'), 'DTL-02', 'Exports RecyclingRecordDetailScreen component');
assert(contains(detailScr.content, 'stepperContainer'), 'DTL-03', 'Renders lifecycle stepper (Received -> Processing -> Completed)');
assert(contains(detailScr.content, 'Lifecycle Audit Timestamps'), 'DTL-04', 'Renders audit timestamps card');
assert(contains(detailScr.content, 'Consignment Items'), 'DTL-05', 'Renders consignment e-waste items breakdown');
assert(contains(detailScr.content, 'CONSIGNED'), 'DTL-06', 'Displays item CONSIGNED state');
assert(contains(detailScr.content, 'RECYCLED'), 'DTL-07', 'Displays item RECYCLED transition');
assert(contains(detailScr.content, 'Start Processing ⚙️'), 'DTL-08', 'Renders Start Processing operational card when RECEIVED');
assert(contains(detailScr.content, 'Complete Recycling ✅'), 'DTL-09', 'Renders Complete Recycling operational card when PROCESSING');

// Completion form validation
assert(contains(detailScr.content, 'outputWeightKg'), 'DTL-10', 'Provides output weight input field');
assert(contains(detailScr.content, 'outputDescription'), 'DTL-11', 'Provides output description input field');
assert(contains(detailScr.content, 'processingNotes'), 'DTL-12', 'Provides processing notes input field');
assert(contains(detailScr.content, 'weightNum < 0'), 'DTL-13', 'Validates non-negative output weight');
assert(contains(detailScr.content, '1000'), 'DTL-14', 'Validates max 1000 chars on processing notes');
assert(contains(detailScr.content, '500'), 'DTL-15', 'Validates max 500 chars on output description');
assert(contains(detailScr.content, 'submittingRef'), 'DTL-16', 'Double-tap prevention in detail screen');
assert(contains(detailScr.content, 'isOffline && styles.btnDisabled'), 'DTL-17', 'Disables actions when offline in detail screen');

// ─── 5. StatusBadge & Theme ───────────────────────────────────────────────────
console.log('\n─── 5. StatusBadge & Theme ──────────────────────────────────────');

assert(contains(statusBadge.content, "case 'RECEIVED':"), 'BDG-01', 'StatusBadge explicitly handles RECEIVED');
assert(contains(statusBadge.content, "case 'PROCESSING':"), 'BDG-02', 'StatusBadge handles PROCESSING');
assert(contains(statusBadge.content, "case 'COMPLETED':"), 'BDG-03', 'StatusBadge handles COMPLETED');
assert(contains(statusBadge.content, "case 'RECYCLED':"), 'BDG-04', 'StatusBadge handles RECYCLED');

// ─── 6. Navigation Wiring & Types ─────────────────────────────────────────────
console.log('\n─── 6. Navigation Wiring & Types ────────────────────────────────');

assert(contains(types.content, 'RecyclerRecords: undefined'), 'NAV-01', 'RecyclerTabParamList retains RecyclerRecords route');
assert(contains(types.content, 'RecyclingRecordDetail: { recordId: string'), 'NAV-02', 'RecyclerStackParamList defines RecyclingRecordDetail route');
assert(contains(recyclerNav.content, 'RecyclerRecordsScreen'), 'NAV-03', 'RecyclerNavigator imports RecyclerRecordsScreen');
assert(contains(recyclerNav.content, 'RecyclingRecordDetailScreen'), 'NAV-04', 'RecyclerNavigator imports RecyclingRecordDetailScreen');
assert(contains(recyclerNav.content, 'name="RecyclerRecords"'), 'NAV-05', 'RecyclerRecords tab is wired to RecyclerRecordsScreen');
assert(contains(recyclerNav.content, 'name="RecyclingRecordDetail"'), 'NAV-06', 'RecyclingRecordDetail stack screen is registered');

// ─── 7. Role Isolation ────────────────────────────────────────────────────────
console.log('\n─── 7. Role Isolation ───────────────────────────────────────────');

assert(!contains(citizenNav.content, 'RecyclerRecords'), 'ISO-01', 'CitizenNavigator cannot access RecyclerRecords');
assert(!contains(citizenNav.content, 'RecyclingRecordDetail'), 'ISO-02', 'CitizenNavigator cannot access RecyclingRecordDetail');
assert(!contains(collectorNav.content, 'RecyclerRecords'), 'ISO-03', 'CollectorNavigator cannot access RecyclerRecords');
assert(!contains(collectorNav.content, 'RecyclingRecordDetail'), 'ISO-04', 'CollectorNavigator cannot access RecyclingRecordDetail');
assert(!contains(collectorNav.content, 'startProcessing'), 'ISO-05', 'CollectorNavigator cannot access startProcessing');
assert(!contains(collectorNav.content, 'completeRecycling'), 'ISO-06', 'CollectorNavigator cannot access completeRecycling');
assert(!contains(citizenNav.content, 'startProcessing'), 'ISO-07', 'CitizenNavigator cannot access startProcessing');
assert(!contains(citizenNav.content, 'completeRecycling'), 'ISO-08', 'CitizenNavigator cannot access completeRecycling');

// ─── 8. Non-Regression of Existing Workflows ──────────────────────────────────
console.log('\n─── 8. Non-Regression Verification ──────────────────────────────');

assert(incomingScr.exists, 'REG-01', 'RecyclerIncomingScreen.tsx remains intact');
assert(csgDetailScr.exists, 'REG-02', 'ConsignmentDetailScreen.tsx remains intact');
assert(contains(recyclerNav.content, 'RecyclerIncoming'), 'REG-03', 'RecyclerNavigator retains RecyclerIncoming tab');
assert(contains(recyclerNav.content, 'ConsignmentDetail'), 'REG-04', 'RecyclerNavigator retains ConsignmentDetail screen');
assert(contains(collectorNav.content, 'CollectorConsignments'), 'REG-05', 'Collector consignment screens intact');
assert(contains(collectorNav.content, 'CollectorConsignmentStatus'), 'REG-06', 'Collector tracking intact');
assert(contains(citizenNav.content, 'ItemTraceability'), 'REG-07', 'Citizen ItemTraceability screen intact');

// ─── Summary ───────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
console.log(`  PHASE 17 TASK 6 VERIFICATION SUMMARY`);
console.log(`  Passed: ${passed} / ${passed + failed} (${Math.round((passed / (passed + failed)) * 100)}%)`);
if (failed > 0) {
  console.log(`  Failed: ${failed}`);
  failures.forEach((f) => console.log(`    - [${f.testId}] ${f.description}: ${f.detail}`));
}
console.log('════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
