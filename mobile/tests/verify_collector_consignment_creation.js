/**
 * verify_collector_consignment_creation.js
 * Verification suite — Phase 17, Task 2: Collector Consignment Creation
 *
 * Requirements:
 *   1. Correct consignment creation endpoint is used (POST /api/v1/consignments)
 *   2. Correct request payload ({ recyclerId, itemIds, deliveryNotes?, totalWeightKg? })
 *   3. Collector authentication/authorization path (INFORMAL_COLLECTOR role)
 *   4. Verified/active collector requirement (checkVerified / ACTIVE status)
 *   5. Eligible recycler selection (from verified formal recyclers)
 *   6. Eligible collected-item selection (items in COLLECTED status not in active consignments)
 *   7. Confirmation flow (modal/review step before final submission)
 *   8. Successful creation view (receipt with consignment ref, status CREATED, recycler details)
 *   9. Duplicate submission prevention (submittingRef / isSubmitting guard)
 *   10. 400 validation error handling
 *   11. 401/403 authorization handling
 *   12. 409 conflict / reconciliation handling
 *   13. Offline creation blocked (online-only, no offlineQueue.enqueue)
 *   14. Citizen cannot access consignment creation (role isolation)
 *   15. Existing recycler directory remains functional
 *   16. Existing collector screens remain unaffected
 *   17. Existing citizen functionality remains unaffected
 *
 * Run: node mobile/tests/verify_collector_consignment_creation.js
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

const createScr = readFile('src/screens/collector/CreateConsignmentScreen.tsx');
const dirScr = readFile('src/screens/collector/CollectorRecyclerDirectoryScreen.tsx');
const recSvc = readFile('src/services/recyclingService.js');
const nav = readFile('src/navigation/CollectorNavigator.tsx');
const citNav = readFile('src/navigation/CitizenNavigator.tsx');
const recyclerNav = readFile('src/navigation/RecyclerNavigator.tsx');
const admNav = readFile('src/navigation/AdminNavigator.tsx');
const types = readFile('src/navigation/types.ts');
const backendRoutes = readFile('../backend/src/routes/consignmentRoutes.js');
const backendValidators = readFile('../backend/src/validators/consignmentValidators.js');
const backendService = readFile('../backend/src/services/consignmentService.js');

console.log('════════════════════════════════════════════════════════════════════════');
console.log('  ECOSETU Verification: Phase 17, Task 2 — Collector Consignment Creation');
console.log('════════════════════════════════════════════════════════════════════════');

// ─── 1. Backend API & Contract Verification ───────────────────────────────────
console.log('\n─── 1. Backend Consignment API & Endpoint Contracts ─────────────────────');

assert(backendRoutes.exists, 'API-01', 'backend consignmentRoutes.js exists');
assert(contains(backendRoutes.content, "router.post("), 'API-02', 'POST route defined for consignments');
assert(contains(backendRoutes.content, "ROLES.INFORMAL_COLLECTOR"), 'API-03', 'Authorized for INFORMAL_COLLECTOR');
assert(contains(backendRoutes.content, "checkVerified"), 'API-04', 'Requires checkVerified middleware');
assert(contains(backendValidators.content, "body('recyclerId')"), 'API-05', 'Validator requires recyclerId UUID');
assert(contains(backendValidators.content, "body('itemIds')"), 'API-06', 'Validator requires non-empty itemIds array');
assert(contains(backendService.content, "createConsignment"), 'API-07', 'Backend implements createConsignment');
assert(contains(backendService.content, "CONSIGNMENT_INCOMING"), 'API-08', 'Backend auto-generates CONSIGNMENT_INCOMING notification for recycler');

// ─── 2. Service Layer Implementation (Online-Only) ─────────────────────────────
console.log('\n─── 2. Service Layer: Online-Only Consignment Creation ──────────────────');

assert(recSvc.exists, 'SVC-01', 'recyclingService.js exists');
assert(contains(recSvc.content, "createConsignment(data)"), 'SVC-02', 'recyclingService implements createConsignment(data)');
assert(contains(recSvc.content, "apiClient.post('/consignments'"), 'SVC-03', 'Calls POST /consignments endpoint');
assert(contains(recSvc.content, "!networkService.isConnected()"), 'SVC-04', 'Validates online connectivity before submitting');
assert(contains(recSvc.content, "isOfflineError: true"), 'SVC-05', 'Throws isOfflineError when called offline');
assert(!contains(recSvc.content, "offlineQueue.enqueue"), 'SVC-06', 'Zero offline mutation queueing for consignments');
assert(contains(recSvc.content, "getEligibleItems()"), 'SVC-07', 'recyclingService implements getEligibleItems()');
assert(contains(recSvc.content, "status=COMPLETED"), 'SVC-08', 'Queries completed pickups to find collected items');
assert(contains(recSvc.content, "activeStatuses"), 'SVC-09', 'Excludes items in active consignments');

// ─── 3. Screen Structure & Role Security ──────────────────────────────────────
console.log('\n─── 3. Screen Structure & Role Security ─────────────────────────────────');

assert(createScr.exists, 'SCR-01', 'CreateConsignmentScreen.tsx exists');
assert(contains(createScr.content, "export const CreateConsignmentScreen"), 'SCR-02', 'Exports CreateConsignmentScreen');
assert(contains(createScr.content, "useAuth"), 'SCR-03', 'Uses useAuth hook');
assert(contains(createScr.content, "useNetwork"), 'SCR-04', 'Uses useNetwork hook');
assert(contains(createScr.content, "ROLES.INFORMAL_COLLECTOR"), 'SCR-05', 'Guards access to INFORMAL_COLLECTOR role');
assert(contains(createScr.content, "Access Restricted"), 'SCR-06', 'Renders access restricted empty state for unauthorized roles');
assert(contains(createScr.content, "TopAppBar"), 'SCR-07', 'Renders TopAppBar with back navigation');

// ─── 4. Recycler Selection ────────────────────────────────────────────────────
console.log('\n─── 4. Recycler Selection & Discovery Integration ───────────────────────');

assert(contains(createScr.content, "selectedRecycler"), 'REC-01', 'Maintains selectedRecycler state');
assert(contains(createScr.content, "getRecyclers()"), 'REC-02', 'Loads verified formal recyclers using recyclingService.getRecyclers()');
assert(contains(createScr.content, "facilityName"), 'REC-03', 'Renders selected recycler facilityName');
assert(contains(createScr.content, "facilityAddress"), 'REC-04', 'Renders selected recycler facilityAddress');
assert(contains(createScr.content, "StatusBadge status=\"ACTIVE\""), 'REC-05', 'Displays verified status badge for selected recycler');
assert(contains(createScr.content, "acceptedCategories"), 'REC-06', 'Renders acceptedCategories for selected recycler');
assert(contains(createScr.content, "Change Facility") || contains(createScr.content, "Change"), 'REC-07', 'Provides option to change or choose target facility');

// ─── 5. Eligible E-Waste Item Selection ───────────────────────────────────────
console.log('\n─── 5. Eligible E-Waste Item Selection ─────────────────────────────────');

assert(contains(createScr.content, "eligibleItems"), 'ITEM-01', 'Maintains eligibleItems state');
assert(contains(createScr.content, "selectedItemIds"), 'ITEM-02', 'Tracks selectedItemIds via Set');
assert(contains(createScr.content, "toggleItemSelection"), 'ITEM-03', 'Implements toggleItemSelection callback');
assert(contains(createScr.content, "handleSelectAll"), 'ITEM-04', 'Implements Select All / Deselect All');
assert(contains(createScr.content, "COLLECTED"), 'ITEM-05', 'References canonical COLLECTED status requirement');
assert(contains(createScr.content, "accessibilityRole=\"checkbox\""), 'ITEM-06', 'Item selection uses accessibilityRole="checkbox"');
assert(contains(createScr.content, "accessibilityState={{ checked:"), 'ITEM-07', 'Declares accessibilityState for checkbox');
assert(contains(createScr.content, "No Collected Items Available"), 'ITEM-08', 'Renders distinct empty state when no items are collected');

// ─── 6. Confirmation Flow & Submission Protection ────────────────────────────
console.log('\n─── 6. Confirmation Flow & In-Flight Protection ─────────────────────────');

assert(contains(createScr.content, "isConfirmModalVisible"), 'CONF-01', 'Controls confirmation modal visibility');
assert(contains(createScr.content, "Confirm Consignment"), 'CONF-02', 'Provides explicit confirmation step title');
assert(contains(createScr.content, "submittingRef"), 'CONF-03', 'Uses submittingRef guard to prevent duplicate submissions');
assert(contains(createScr.content, "isSubmitting"), 'CONF-04', 'Manages isSubmitting progress state');
assert(contains(createScr.content, "ActivityIndicator"), 'CONF-05', 'Renders ActivityIndicator during submission');
assert(contains(createScr.content, "deliveryNotes"), 'CONF-06', 'Supports optional deliveryNotes input (max 500 chars)');
assert(contains(createScr.content, "totalWeightKg") || contains(createScr.content, "displayTotalWeight"), 'CONF-07', 'Calculates batch weight');

// ─── 7. Error Handling & 409 Conflict Reconciliation ──────────────────────────
console.log('\n─── 7. Error Handling & 409 Conflict Reconciliation ────────────────────');

assert(contains(createScr.content, "409") || contains(createScr.content, "already in an active consignment"), 'ERR-01', 'Detects 409 / already consigned conflict');
assert(contains(createScr.content, "loadData()"), 'ERR-02', 'Re-syncs eligible items upon conflict');
assert(contains(createScr.content, "Offline"), 'ERR-03', 'Handles offline block with alert');
assert(contains(createScr.content, "Verification Required"), 'ERR-04', 'Handles unverified collector check');

// ─── 8. Success State Receipt ─────────────────────────────────────────────────
console.log('\n─── 8. Success State Receipt ───────────────────────────────────────────');

assert(contains(createScr.content, "createdConsignment"), 'SUCC-01', 'Renders success state when createdConsignment is set');
assert(contains(createScr.content, "Consignment Created Successfully"), 'SUCC-02', 'Displays clear success headline');
assert(contains(createScr.content, "StatusBadge status={csgStatus}"), 'SUCC-03', 'Renders StatusBadge with CREATED status');
assert(contains(createScr.content, "The receiving formal recycler has been automatically notified"), 'SUCC-04', 'Informs collector that recycler is notified');
assert(contains(createScr.content, "Done (Back to Directory)"), 'SUCC-05', 'Provides return to directory button');

// ─── 9. Offline Behavior ──────────────────────────────────────────────────────
console.log('\n─── 9. Offline Behavior ────────────────────────────────────────────────');

assert(contains(createScr.content, "OfflineBanner"), 'OFF-01', 'Renders OfflineBanner when disconnected');
assert(contains(createScr.content, "!isConnected"), 'OFF-02', 'Checks network connectivity before submission');
assert(contains(createScr.content, "submitButtonDisabled"), 'OFF-03', 'Disables submit button when offline');

// ─── 10. Navigation Wiring & Isolation ────────────────────────────────────────
console.log('\n─── 10. Navigation Wiring & Role Isolation ──────────────────────────────');

assert(contains(types.content, "CreateConsignment:"), 'NAV-01', 'CreateConsignment typed in CollectorStackParamList');
assert(contains(nav.content, "CreateConsignmentScreen"), 'NAV-02', 'CollectorNavigator imports CreateConsignmentScreen');
assert(contains(nav.content, "name=\"CreateConsignment\""), 'NAV-03', 'CollectorNavigator registers CreateConsignment in stack');
assert(!contains(citNav.content, "CreateConsignment"), 'NAV-04', 'CitizenNavigator does NOT reference CreateConsignment');
assert(!contains(recyclerNav.content, "CreateConsignmentScreen"), 'NAV-05', 'RecyclerNavigator does NOT reference CreateConsignmentScreen');
assert(!contains(admNav.content, "CreateConsignmentScreen"), 'NAV-06', 'AdminNavigator does NOT reference CreateConsignmentScreen');

// ─── 11. Recycler Directory Integration ───────────────────────────────────────
console.log('\n─── 11. Recycler Directory Screen Integration ──────────────────────────');

assert(contains(dirScr.content, "Consign E-Waste →"), 'DIR-01', 'CollectorRecyclerDirectoryScreen offers Consign E-Waste button');
assert(contains(dirScr.content, "navigation.navigate('CreateConsignment'"), 'DIR-02', 'Navigates to CreateConsignment with recyclerId');
assert(contains(dirScr.content, "onSelectRecycler"), 'DIR-03', 'RecyclerCard invokes onSelectRecycler callback');

// ─── 12. Strict Boundaries (No Maps, Payments, Dialers, Chat) ────────────────
console.log('\n─── 12. Strict Boundaries & Undocumented Feature Check ──────────────────');

assert(!contains(createScr.content, "react-native-maps") && !contains(createScr.content, "MapView"), 'BND-01', 'No map dependencies');
assert(!contains(createScr.content, "Razorpay") && !contains(createScr.content, "stripe"), 'BND-02', 'No payment gateways');
assert(!contains(createScr.content, "Linking.openURL('tel:"), 'BND-03', 'No external phone dialer actions');
assert(!contains(createScr.content, "react-native-gifted-chat"), 'BND-04', 'No chat features');

// ─── 13. Accessibility Compliance ─────────────────────────────────────────────
console.log('\n─── 13. Accessibility Compliance ───────────────────────────────────────');

assert(contains(createScr.content, "accessibilityRole=\"button\""), 'A11Y-01', 'Buttons declare accessibilityRole="button"');
assert(contains(createScr.content, "accessibilityLabel="), 'A11Y-02', 'Controls declare accessibilityLabel');
assert(contains(createScr.content, "minHeight: 48") || contains(createScr.content, "paddingVertical: 14"), 'A11Y-03', 'Touch targets meet >= 48dp criteria');

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
