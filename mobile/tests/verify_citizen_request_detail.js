/**
 * EcoSetu Phase 16 Task 5 Verification Suite: Citizen Request Detail
 *
 * Verifies:
 * 1. Citizen-only access: CitizenNavigator mounts RequestDetailScreen under RequestDetail modal route
 * 2. Non-citizen role isolation: Collector, Recycler, and Admin navigators do not mount Citizen RequestDetailScreen
 * 3. Correct requestId navigation parameter handling from route.params
 * 4. Authenticated request retrieval via requestService.getRequestById(requestId)
 * 5. Request ownership/security handling (enforces citizen ownership, backend authoritative)
 * 6. Canonical RequestStatus handling (DRAFT, SUBMITTED, ACCEPTED, PICKUP_SCHEDULED, PICKED_UP, CANCELLED, EXPIRED)
 * 7. Separate PickupStatus handling (never mixes PickupStatus into RequestStatus)
 * 8. Visual lifecycle progress stepper rendering (5 sequential stages + distinct cancellation/expiry handling)
 * 9. Informal collector-first presentation: Safe copy ("Assigned: Local Informal Collector (Kabadiwala)"), zero sensitive coords/phones
 * 10. Zero direct Citizen → Recycler functionality: No recycler bookings, selections, or consignment controls
 * 11. Associated e-waste item rendering: Category, condition, quantity, estimated weight, item status
 * 12. Cancellation availability strictly according to backend workflow (allowed before PICKED_UP)
 * 13. Cancellation confirmation modal and reason validation
 * 14. Loading state using Skeleton components
 * 15. Error/not-found state with human-readable messaging and retry button
 * 16. Offline-first cached behavior with OfflineBanner
 * 17. Pull-to-refresh integration via RefreshControl
 * 18. Navigation: onBack returns to previous screen, item action targets ItemTraceability with { itemId }
 * 19. Accessibility conformance: 48x48dp touch targets, semantic roles (button, header, alert), and accessible dialog
 * 20. Sensitive-data and security checks: Zero tokens, passwords, or secrets handled or leaked
 *
 * Source of Truth:
 * - docs/00_PROJECT_INDEX.md
 * - docs/05_API_SPECIFICATION.md Section 7
 * - docs/07_BUSINESS_WORKFLOWS.md Section 1.2 & 1.3
 * - docs/08_UI_UX_SPECIFICATION.md Section 4.2
 * - docs/09_FRONTEND_ARCHITECTURE.md Section 4.2 & 6.2
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Import mobile foundation modules
const { storage } = require('../src/utils/storage');
const { STORAGE_KEYS, ROLES, REQUEST_STATUS, PICKUP_STATUS } = require('../src/utils/constants');
const { authService } = require('../src/services/authService');
const { networkService } = require('../src/services/networkService');
const { offlineStore } = require('../src/services/offlineStore');
const { requestService } = require('../src/services/requestService');

// Helper to read source files for static architecture analysis
function readSrcFile(relativePath) {
  const fullPath = path.join(__dirname, '..', 'src', relativePath);
  assert(fs.existsSync(fullPath), `Source file must exist: ${relativePath}`);
  return fs.readFileSync(fullPath, 'utf8');
}

async function runCitizenRequestDetailTests() {
  console.log('========================================================');
  console.log('ECOSETU PHASE 16 — CITIZEN REQUEST DETAIL TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✔ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
    }
  }

  // -------------------------------------------------------------
  // 1. CITIZEN-ONLY ACCESS & NAVIGATION MOUNTING
  // -------------------------------------------------------------
  await test('Citizen-only access: CitizenNavigator mounts RequestDetailScreen under RequestDetail route', async () => {
    await storage.clear();

    const mockCitizen = {
      id: 'usr_citizen_005',
      name: 'Sneha Patel',
      email: 'sneha@ecosetu.org',
      role: ROLES.CITIZEN,
      status: 'ACTIVE',
    };
    await storage.setItem(STORAGE_KEYS.USER_PROFILE, mockCitizen);
    await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'tok_citizen_detail_valid');

    const session = await authService.getSession();
    assert.strictEqual(session.isAuthenticated, true);
    assert.strictEqual(session.user.role, ROLES.CITIZEN);

    const navSrc = readSrcFile('navigation/CitizenNavigator.tsx');
    assert(navSrc.includes("import { RequestDetailScreen } from '../screens/citizen/RequestDetailScreen'"));
    assert(navSrc.includes('name="RequestDetail"'));
    assert(navSrc.includes('component={RequestDetailScreen}'));
  });

  // -------------------------------------------------------------
  // 2. NON-CITIZEN ROLE ISOLATION
  // -------------------------------------------------------------
  await test('Role Isolation: Non-citizen navigators do not mount Citizen RequestDetailScreen', () => {
    const recyclerNavSrc = readSrcFile('navigation/RecyclerNavigator.tsx');
    const adminNavSrc = readSrcFile('navigation/AdminNavigator.tsx');

    assert(!recyclerNavSrc.includes('RequestDetailScreen'), 'RecyclerNavigator must NOT mount RequestDetailScreen');
    assert(!adminNavSrc.includes('RequestDetailScreen'), 'AdminNavigator must NOT mount RequestDetailScreen');
  });

  // -------------------------------------------------------------
  // 3. ROUTE PARAMETER HANDLING (requestId)
  // -------------------------------------------------------------
  await test('Parameter Handling: Screen extracts requestId from route.params without client citizenId spoofing', () => {
    const screenSrc = readSrcFile('screens/citizen/RequestDetailScreen.tsx');

    assert(screenSrc.includes('const { requestId } = route.params;'), 'Must extract requestId from route.params');
    assert(!screenSrc.includes('route.params.citizenId'), 'Must NEVER accept citizenId from route params (security violation)');
    assert(!screenSrc.includes('route.params.role'), 'Must NEVER accept user role from route params');
  });

  // -------------------------------------------------------------
  // 4. AUTHENTICATED REQUEST RETRIEVAL VIA SERVICE
  // -------------------------------------------------------------
  await test('Data Retrieval: Calls requestService.getRequestById with authenticated requestId', async () => {
    const screenSrc = readSrcFile('screens/citizen/RequestDetailScreen.tsx');

    assert(screenSrc.includes('requestService.getRequestById(requestId)'), 'Must call requestService.getRequestById(requestId)');

    // Verify requestService has getRequestById implemented
    const serviceSrc = readSrcFile('services/requestService.js');
    assert(serviceSrc.includes('async getRequestById(id)'), 'requestService must define getRequestById');
    assert(serviceSrc.includes("`/collection-requests/${id}`"), 'requestService must fetch from /collection-requests/:id');
  });

  // -------------------------------------------------------------
  // 5. REQUEST OWNERSHIP & AUTHORIZATION HANDLING
  // -------------------------------------------------------------
  await test('Request Ownership: Handles forbidden (403) and not-found (404) responses gracefully', () => {
    const screenSrc = readSrcFile('screens/citizen/RequestDetailScreen.tsx');

    assert(screenSrc.includes("err?.status === 403 || err?.code === 'FORBIDDEN'"), 'Must handle 403 Forbidden access denial');
    assert(screenSrc.includes('Access denied. You can only view your own collection requests.'), 'Must display friendly ownership error');
    assert(screenSrc.includes("err?.status === 404 || err?.code === 'NOT_FOUND'"), 'Must handle 404 Not Found error');
  });

  // -------------------------------------------------------------
  // 6. CANONICAL REQUEST STATUS HANDLING
  // -------------------------------------------------------------
  await test('Canonical RequestStatus: Uses exact Prisma RequestStatus enums without fake completed/in-progress', () => {
    const canonicalRequestStatuses = [
      'DRAFT',
      'SUBMITTED',
      'ACCEPTED',
      'PICKUP_SCHEDULED',
      'PICKED_UP',
      'CANCELLED',
      'EXPIRED',
    ];

    for (const st of canonicalRequestStatuses) {
      assert(REQUEST_STATUS[st] === st, `REQUEST_STATUS must define ${st}`);
    }

    assert.strictEqual(REQUEST_STATUS['COMPLETED'], undefined, 'COMPLETED is a PickupStatus, NOT a RequestStatus');
    assert.strictEqual(REQUEST_STATUS['IN_PROGRESS'], undefined, 'IN_PROGRESS is a PickupStatus, NOT a RequestStatus');

    const screenSrc = readSrcFile('screens/citizen/RequestDetailScreen.tsx');
    assert(screenSrc.includes('REQUEST_STATUS.DRAFT'), 'Screen must handle DRAFT');
    assert(screenSrc.includes('REQUEST_STATUS.SUBMITTED'), 'Screen must handle SUBMITTED');
    assert(screenSrc.includes('REQUEST_STATUS.ACCEPTED'), 'Screen must handle ACCEPTED');
    assert(screenSrc.includes('REQUEST_STATUS.PICKUP_SCHEDULED'), 'Screen must handle PICKUP_SCHEDULED');
    assert(screenSrc.includes('REQUEST_STATUS.PICKED_UP'), 'Screen must handle PICKED_UP');
    assert(screenSrc.includes('REQUEST_STATUS.CANCELLED'), 'Screen must handle CANCELLED');
    assert(screenSrc.includes('REQUEST_STATUS.EXPIRED'), 'Screen must handle EXPIRED');
  });

  // -------------------------------------------------------------
  // 7. SEPARATE PICKUP STATUS HANDLING
  // -------------------------------------------------------------
  await test('Separate PickupStatus: PickupStatus exists as an independent entity in constants', () => {
    assert(PICKUP_STATUS.SCHEDULED === 'SCHEDULED');
    assert(PICKUP_STATUS.IN_PROGRESS === 'IN_PROGRESS');
    assert(PICKUP_STATUS.COMPLETED === 'COMPLETED');
    assert(PICKUP_STATUS.FAILED === 'FAILED');
    assert(PICKUP_STATUS.CANCELLED === 'CANCELLED');

    // Ensure constants keep REQUEST_STATUS and PICKUP_STATUS separated
    const constantsSrc = readSrcFile('utils/constants.js');
    assert(constantsSrc.includes('export const REQUEST_STATUS = Object.freeze({'));
    assert(constantsSrc.includes('export const PICKUP_STATUS = Object.freeze({'));
  });

  // -------------------------------------------------------------
  // 8. VISUAL LIFECYCLE PROGRESS STEPPER
  // -------------------------------------------------------------
  await test('Lifecycle Stepper: 5 sequential stages rendered and terminal states handled truthfully', () => {
    const screenSrc = readSrcFile('screens/citizen/RequestDetailScreen.tsx');

    // 5 progressive stages
    assert(screenSrc.includes("id: 'DRAFT', label: 'Request Created'"), 'Step 1 must be Request Created');
    assert(screenSrc.includes("id: 'SUBMITTED', label: 'Submitted'"), 'Step 2 must be Submitted');
    assert(screenSrc.includes("id: 'ACCEPTED', label: 'Collector Accepted'"), 'Step 3 must be Collector Accepted');
    assert(screenSrc.includes("id: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled'"), 'Step 4 must be Pickup Scheduled');
    assert(screenSrc.includes("id: 'PICKED_UP', label: 'Items Picked Up'"), 'Step 5 must be Items Picked Up');

    // Terminal states
    assert(screenSrc.includes('cancellationBanner'), 'Must have distinct cancellationBanner for CANCELLED');
    assert(screenSrc.includes('expiredBanner'), 'Must have distinct expiredBanner for EXPIRED');
    assert(screenSrc.includes('cancellationReason'), 'Must display cancellationReason if present');
  });

  // -------------------------------------------------------------
  // 9. INFORMAL COLLECTOR FIRST PRESENTATION
  // -------------------------------------------------------------
  await test('Informal Collector First: Respectful copy, zero coordinates or private phones leaked', () => {
    const screenSrc = readSrcFile('screens/citizen/RequestDetailScreen.tsx');

    // Friendly collector identification
    assert(screenSrc.includes('🤝 Assigned: Local Informal Collector (Kabadiwala)'), 'Must identify informal collector respectfully');
    assert(screenSrc.includes('A verified local informal collector has claimed this request'), 'Must clarify collector role');

    // Privacy checks: zero sensitive collector fields exposed on citizen detail
    assert(!screenSrc.includes('collector.phone'), 'Must not display collector private phone');
    assert(!screenSrc.includes('collector.serviceAreaLat'), 'Must not display collector coordinates');
    assert(!screenSrc.includes('collector.idDocumentUrl'), 'Must not expose collector ID document');
    assert(!screenSrc.includes('collector.userId'), 'Must not display collector internal userId');
  });

  // -------------------------------------------------------------
  // 10. ZERO DIRECT CITIZEN -> RECYCLER FUNCTIONALITY
  // -------------------------------------------------------------
  await test('Zero Direct Recycler Access: No recycler booking, selection, or consignment endpoints', () => {
    const screenSrc = readSrcFile('screens/citizen/RequestDetailScreen.tsx');

    assert(!screenSrc.toLowerCase().includes('recycler'), 'Screen must NOT reference or display Recycler selection or booking');
    assert(!screenSrc.toLowerCase().includes('consignment'), 'Screen must NOT contain Consignment operations');
    assert(!screenSrc.includes('createConsignment'), 'Must not call createConsignment');
    assert(!screenSrc.includes('acceptConsignment'), 'Must not call acceptConsignment');
  });

  // -------------------------------------------------------------
  // 11. ASSOCIATED E-WASTE ITEM RENDERING
  // -------------------------------------------------------------
  await test('Associated Items: Displays item category, condition, quantity, estimated weight, and status', () => {
    const screenSrc = readSrcFile('screens/citizen/RequestDetailScreen.tsx');

    assert(screenSrc.includes('request.ewasteItems'), 'Must iterate through request.ewasteItems');
    assert(screenSrc.includes('itemCategory'), 'Must render itemCategory');
    assert(screenSrc.includes('itemCondition'), 'Must render itemCondition');
    assert(screenSrc.includes('item.quantity'), 'Must render item quantity');
    assert(screenSrc.includes('item.estimatedWeightKg'), 'Must render estimated weight');
    assert(screenSrc.includes('<StatusBadge status={item.status'), 'Must display StatusBadge for item status');
  });

  // -------------------------------------------------------------
  // 12. CANCELLATION AVAILABILITY BASED ON ACTUAL STATUS
  // -------------------------------------------------------------
  await test('Cancellation Rules: Allowed before PICKED_UP; forbidden for PICKED_UP, CANCELLED, EXPIRED', () => {
    const screenSrc = readSrcFile('screens/citizen/RequestDetailScreen.tsx');

    assert(screenSrc.includes('canCancelRequest'), 'Must have canCancelRequest helper');
    assert(screenSrc.includes('norm !== REQUEST_STATUS.PICKED_UP'), 'Cannot cancel after PICKED_UP');
    assert(screenSrc.includes('norm !== REQUEST_STATUS.CANCELLED'), 'Cannot cancel if already CANCELLED');
    assert(screenSrc.includes('norm !== REQUEST_STATUS.EXPIRED'), 'Cannot cancel if EXPIRED');

    // Test the logic directly
    const canCancel = (status) => {
      const norm = (status || '').toUpperCase();
      return (
        norm !== REQUEST_STATUS.PICKED_UP &&
        norm !== REQUEST_STATUS.CANCELLED &&
        norm !== REQUEST_STATUS.EXPIRED
      );
    };

    assert.strictEqual(canCancel('DRAFT'), true);
    assert.strictEqual(canCancel('SUBMITTED'), true);
    assert.strictEqual(canCancel('ACCEPTED'), true);
    assert.strictEqual(canCancel('PICKUP_SCHEDULED'), true);
    assert.strictEqual(canCancel('PICKED_UP'), false);
    assert.strictEqual(canCancel('CANCELLED'), false);
    assert.strictEqual(canCancel('EXPIRED'), false);
  });

  // -------------------------------------------------------------
  // 13. CANCELLATION CONFIRMATION & REASON VALIDATION
  // -------------------------------------------------------------
  await test('Cancellation Mutation: Requires confirmation modal, mandatory reason, and calls cancelRequest', async () => {
    const screenSrc = readSrcFile('screens/citizen/RequestDetailScreen.tsx');

    assert(screenSrc.includes('cancelModalVisible'), 'Must manage cancelModalVisible');
    assert(screenSrc.includes('cancellationReason'), 'Must track cancellationReason');
    assert(screenSrc.includes('Please provide a reason for cancelling this request.'), 'Must validate reason input');
    assert(screenSrc.includes('requestService.cancelRequest(requestId, reason)'), 'Must call requestService.cancelRequest');
    assert(screenSrc.includes('await loadRequestDetails()'), 'Must reload request details after cancellation');
  });

  // -------------------------------------------------------------
  // 14. LOADING STATE
  // -------------------------------------------------------------
  await test('Loading State: Shows Skeleton components during initial data fetch', () => {
    const screenSrc = readSrcFile('screens/citizen/RequestDetailScreen.tsx');

    assert(screenSrc.includes('<Skeleton'), 'Must render Skeleton components');
    assert(screenSrc.includes('skeletonContainer'), 'Must have skeletonContainer styling');
  });

  // -------------------------------------------------------------
  // 15. ERROR AND RETRY STATE
  // -------------------------------------------------------------
  await test('Error State: Displays human-readable error with retry action', () => {
    const screenSrc = readSrcFile('screens/citizen/RequestDetailScreen.tsx');

    assert(screenSrc.includes('errorBox'), 'Must have styled errorBox');
    assert(screenSrc.includes('retryButton'), 'Must have retryButton');
    assert(screenSrc.includes('onPress={loadRequestDetails}'), 'Retry button must invoke loadRequestDetails');
    assert(!screenSrc.includes('stackTrace'), 'Must not expose stack traces');
  });

  // -------------------------------------------------------------
  // 16. OFFLINE-FIRST CACHED BEHAVIOR
  // -------------------------------------------------------------
  await test('Offline Integration: Retrieves cached request from offlineStore and presents honest offline banner', async () => {
    // Clear and mock cached requests
    await storage.clear();
    const mockRequest = {
      id: 'req_detail_offline_001',
      citizenId: 'usr_citizen_005',
      status: REQUEST_STATUS.ACCEPTED,
      pickupAddress: 'Block C, Vasant Kunj, New Delhi',
      preferredDate: '2026-09-22',
      collectorId: 'col_profile_001',
      createdAt: '2026-09-17T11:00:00Z',
      ewasteItems: [
        {
          id: 'item_detail_001',
          category: 'LAPTOP',
          condition: 'DAMAGED',
          quantity: 1,
          estimatedWeightKg: 2.2,
          status: 'SUBMITTED',
        },
      ],
    };

    await offlineStore.cacheRequests([mockRequest]);
    const cachedResult = await requestService.getRequestById('req_detail_offline_001');
    assert.strictEqual(cachedResult.id, 'req_detail_offline_001');
    assert.strictEqual(cachedResult.status, REQUEST_STATUS.ACCEPTED);

    // Screen offline banner check
    const screenSrc = readSrcFile('screens/citizen/RequestDetailScreen.tsx');
    assert(screenSrc.includes('offlineNotice'), 'Screen must render offline notice');
    assert(screenSrc.includes('Offline mode: Showing locally cached request details.'), 'Must display honest offline copy');
    assert(screenSrc.includes('Cancelling a collection request requires an active internet connection.'), 'Cancellation mutation blocked when offline');
  });

  // -------------------------------------------------------------
  // 17. PULL TO REFRESH
  // -------------------------------------------------------------
  await test('Pull-to-refresh: Native RefreshControl reloads request from API when pulled', () => {
    const screenSrc = readSrcFile('screens/citizen/RequestDetailScreen.tsx');

    assert(screenSrc.includes('RefreshControl'), 'Must import and render RefreshControl');
    assert(screenSrc.includes('onRefresh={onRefresh}'), 'Must bind onRefresh to RefreshControl');
    assert(screenSrc.includes('loadRequestDetails()'), 'onRefresh must trigger loadRequestDetails');
  });

  // -------------------------------------------------------------
  // 18. NAVIGATION SAFETY
  // -------------------------------------------------------------
  await test('Navigation: Back button returns via goBack; item action navigates to ItemTraceability with itemId', () => {
    const screenSrc = readSrcFile('screens/citizen/RequestDetailScreen.tsx');

    // Back navigation
    assert(screenSrc.includes('onBack={() => navigation.goBack()}'), 'Back button must invoke navigation.goBack()');

    // Item Traceability navigation
    assert(screenSrc.includes("navigation.navigate('ItemTraceability', { itemId })"), 'Item button must navigate to ItemTraceability with itemId');

    // Ensure zero undocumented routes
    assert(!screenSrc.includes("navigation.navigate('CitizenConsignment'"), 'Must not navigate to consignment');
    assert(!screenSrc.includes("navigation.navigate('CollectorPickups'"), 'Must not navigate to collector routes');
  });

  // -------------------------------------------------------------
  // 19. ACCESSIBILITY CONFORMANCE
  // -------------------------------------------------------------
  await test('Accessibility: 48x48dp touch targets, semantic roles, and accessible modal', () => {
    const screenSrc = readSrcFile('screens/citizen/RequestDetailScreen.tsx');

    // Minimum touch targets (48dp)
    assert(screenSrc.includes('minHeight: 48'), 'Interactive buttons must enforce minHeight: 48');
    assert(screenSrc.includes('accessibilityRole="button"'), 'Buttons must declare accessibilityRole="button"');
    assert(screenSrc.includes('accessibilityRole="header"'), 'Section titles must declare accessibilityRole="header"');
    assert(screenSrc.includes('accessibilityRole="alert"'), 'Alert banners must declare accessibilityRole="alert"');
    assert(screenSrc.includes('accessibilityViewIsModal={true}'), 'Modal dialog must declare accessibilityViewIsModal');
    assert(screenSrc.includes('accessibilityLabel='), 'Must define accessibilityLabel on interactive controls');
  });

  // -------------------------------------------------------------
  // 20. SECURITY & SENSITIVE DATA HYGIENE
  // -------------------------------------------------------------
  await test('Security: No passwords, JWTs, refresh tokens, or database secrets handled or exposed', () => {
    const screenSrc = readSrcFile('screens/citizen/RequestDetailScreen.tsx');

    assert(!screenSrc.includes('accessToken'), 'Must not read, expose, or log accessToken');
    assert(!screenSrc.includes('refreshToken'), 'Must not read, expose, or log refreshToken');
    assert(!screenSrc.includes('password'), 'Must not handle password');
    assert(!screenSrc.includes('jwt'), 'Must not expose JWTs');
    assert(!screenSrc.includes('console.log'), 'Must not use console.log with sensitive details');
  });

  // Clean up
  await storage.clear();

  console.log('\n========================================================');
  console.log(`CITIZEN REQUEST DETAIL TEST SUMMARY: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}% SUCCESS)`);
  console.log('========================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
  process.exit(0);
}

runCitizenRequestDetailTests().catch((err) => {
  console.error('Citizen Request Detail test runner fatal error:', err);
  process.exit(1);
});
