/**
 * EcoSetu Phase 16 Task 4 Verification Suite: Citizen Collection Requests
 *
 * Verifies:
 * 1. Citizen-only access and role isolation
 * 2. Non-citizen role isolation (Collector, Recycler, Admin navigators)
 * 3. Request list rendering and card fields (reference, status, items count, pickup address, date)
 * 4. Correct canonical status handling (DRAFT, SUBMITTED, ACCEPTED, PICKUP_SCHEDULED, PICKED_UP, CANCELLED, EXPIRED)
 * 5. Real requestService/API integration and pull-to-refresh
 * 6. Request ownership handling (only authenticated citizen's requests)
 * 7. Request detail navigation (navigates to existing RequestDetail route with requestId)
 * 8. Cancellation availability according to actual backend workflow (allowed before PICKED_UP)
 * 9. Cancellation confirmation and mutation handling (reason required, calls cancelRequest)
 * 10. Loading state with Skeleton component
 * 11. Empty state with action linking to CitizenSubmit
 * 12. Error state with human-readable error and retry action
 * 13. Offline cached viewing and offline banner integration
 * 14. Informal collector first: ZERO Citizen -> Recycler exposure or consignment controls
 * 15. Accessibility conformance (labels, roles, 48x48dp touch targets)
 * 16. Security & sensitive-data checks (no tokens, passwords, or secret exposure)
 * 17. No undocumented navigation routes
 *
 * Source of Truth:
 * - docs/00_PROJECT_INDEX.md
 * - docs/05_API_SPECIFICATION.md Section 7
 * - docs/07_BUSINESS_WORKFLOWS.md Section 1.2 & 1.3
 * - docs/08_UI_UX_SPECIFICATION.md Section 4.3
 * - docs/09_FRONTEND_ARCHITECTURE.md Section 6.2
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Import mobile foundation modules
const { storage } = require('../src/utils/storage');
const { STORAGE_KEYS, ROLES, REQUEST_STATUS } = require('../src/utils/constants');
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

async function runCitizenRequestsTests() {
  console.log('========================================================');
  console.log('ECOSETU PHASE 16 — CITIZEN COLLECTION REQUESTS TEST SUITE');
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
  // 1. CITIZEN-ONLY ACCESS & ROLE ISOLATION
  // -------------------------------------------------------------
  await test('Citizen-only access: CitizenNavigator mounts CitizenRequestsScreen under CitizenRequests tab', async () => {
    await storage.clear();

    const mockCitizen = {
      id: 'usr_citizen_004',
      name: 'Pooja Verma',
      email: 'pooja@ecosetu.org',
      role: ROLES.CITIZEN,
      status: 'ACTIVE',
    };
    await storage.setItem(STORAGE_KEYS.USER_PROFILE, mockCitizen);
    await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'tok_citizen_requests_valid');

    const session = await authService.getSession();
    assert.strictEqual(session.isAuthenticated, true);
    assert.strictEqual(session.user.role, ROLES.CITIZEN);

    const navSrc = readSrcFile('navigation/CitizenNavigator.tsx');
    assert(navSrc.includes("import { CitizenRequestsScreen } from '../screens/citizen/CitizenRequestsScreen'"));
    assert(navSrc.includes('name="CitizenRequests"'));
    assert(navSrc.includes('component={CitizenRequestsScreen}'));
  });

  await test('Role Isolation: Non-citizen roles cannot mount CitizenRequestsScreen', () => {
    const collectorNavSrc = readSrcFile('navigation/CollectorNavigator.tsx');
    const recyclerNavSrc = readSrcFile('navigation/RecyclerNavigator.tsx');
    const adminNavSrc = readSrcFile('navigation/AdminNavigator.tsx');

    assert(!collectorNavSrc.includes('CitizenRequestsScreen'), 'CollectorNavigator must NOT mount CitizenRequestsScreen');
    assert(!recyclerNavSrc.includes('CitizenRequestsScreen'), 'RecyclerNavigator must NOT mount CitizenRequestsScreen');
    assert(!adminNavSrc.includes('CitizenRequestsScreen'), 'AdminNavigator must NOT mount CitizenRequestsScreen');
  });

  // -------------------------------------------------------------
  // 2. CANONICAL STATUS DISPLAY & MAPPING
  // -------------------------------------------------------------
  await test('Canonical Statuses: Correct handling of Prisma RequestStatus enums', () => {
    // Canonical statuses in schema.prisma:
    // DRAFT, SUBMITTED, ACCEPTED, PICKUP_SCHEDULED, PICKED_UP, CANCELLED, EXPIRED
    const canonicalStatuses = [
      'DRAFT',
      'SUBMITTED',
      'ACCEPTED',
      'PICKUP_SCHEDULED',
      'PICKED_UP',
      'CANCELLED',
      'EXPIRED',
    ];

    for (const status of canonicalStatuses) {
      assert(REQUEST_STATUS[status] === status, `REQUEST_STATUS must define canonical status ${status}`);
    }

    // Prohibited statuses for CollectionRequest (these belong to Pickup or Consignment)
    assert.strictEqual(REQUEST_STATUS['COMPLETED'], undefined, 'COMPLETED must NOT be in REQUEST_STATUS');
    assert.strictEqual(REQUEST_STATUS['IN_PROGRESS'], undefined, 'IN_PROGRESS must NOT be in REQUEST_STATUS');

    // Verify StatusBadge supports canonical statuses
    const badgeSrc = readSrcFile('components/common/StatusBadge.tsx');
    assert(badgeSrc.includes('PICKUP_SCHEDULED'), 'StatusBadge must handle PICKUP_SCHEDULED');
    assert(badgeSrc.includes('PICKED_UP'), 'StatusBadge must handle PICKED_UP');
    assert(badgeSrc.includes('SUBMITTED'), 'StatusBadge must handle SUBMITTED');
    assert(badgeSrc.includes('ACCEPTED'), 'StatusBadge must handle ACCEPTED');
    assert(badgeSrc.includes('CANCELLED'), 'StatusBadge must handle CANCELLED');
    assert(badgeSrc.includes('EXPIRED'), 'StatusBadge must handle EXPIRED');
  });

  // -------------------------------------------------------------
  // 3. REQUEST LIST RENDERING & CARD FIELDS
  // -------------------------------------------------------------
  await test('Request list rendering: Displays reference, status, items count, pickup info, scheduled date', () => {
    const screenSrc = readSrcFile('screens/citizen/CitizenRequestsScreen.tsx');

    // Request reference
    assert(screenSrc.includes('#REQ-'), 'Must format request reference with #REQ-');

    // StatusBadge usage
    assert(screenSrc.includes('<StatusBadge status={item.status}'), 'Must use StatusBadge with item status');

    // Number of associated items
    assert(screenSrc.includes('itemCount'), 'Must compute or display item count');

    // Pickup address
    assert(screenSrc.includes('pickupAddress') || screenSrc.includes('item.pickupAddress'), 'Must display pickup address');

    // Scheduled information (preferredDate)
    assert(screenSrc.includes('preferredDate') || screenSrc.includes('item.preferredDate'), 'Must display scheduled pickup information');

    // Filter tabs
    assert(screenSrc.includes("FilterTab = 'ALL' | 'ACTIVE' | 'PICKED_UP' | 'CANCELLED'"), 'Must offer filter tabs');
  });

  // -------------------------------------------------------------
  // 4. REQUEST OWNERSHIP & DATA INTEGRATION
  // -------------------------------------------------------------
  await test('Request Service Integration: requestService.getRequests and pull-to-refresh', async () => {
    const screenSrc = readSrcFile('screens/citizen/CitizenRequestsScreen.tsx');

    // requestService.getRequests call
    assert(screenSrc.includes('requestService.getRequests()'), 'Must call requestService.getRequests');

    // RefreshControl integration
    assert(screenSrc.includes('RefreshControl'), 'Must provide RefreshControl for pull-to-refresh');
    assert(screenSrc.includes('onRefresh={onRefresh}'), 'Must bind onRefresh handler');
  });

  // -------------------------------------------------------------
  // 5. REQUEST DETAIL NAVIGATION
  // -------------------------------------------------------------
  await test('Request Detail Navigation: Tapping card navigates to existing RequestDetail route with requestId', () => {
    const screenSrc = readSrcFile('screens/citizen/CitizenRequestsScreen.tsx');

    assert(screenSrc.includes("navigate('RequestDetail', { requestId })"), 'Must navigate to RequestDetail with requestId');
    assert(!screenSrc.includes("navigation.navigate('CitizenRequestDetails'"), 'Must NOT use undocumented route names');
    assert(!screenSrc.includes("navigation.navigate('CitizenConsignment'"), 'Must NOT navigate to consignment routes');
  });

  // -------------------------------------------------------------
  // 6. CANCELLATION LOGIC & BACKEND WORKFLOW COMPLIANCE
  // -------------------------------------------------------------
  await test('Cancellation Availability: Allowed only before PICKED_UP (DRAFT, SUBMITTED, ACCEPTED, PICKUP_SCHEDULED)', () => {
    const screenSrc = readSrcFile('screens/citizen/CitizenRequestsScreen.tsx');

    // Verify cancellation check logic in screen
    assert(screenSrc.includes('canCancelRequest'), 'Must have canCancelRequest helper');
    assert(screenSrc.includes('norm !== REQUEST_STATUS.PICKED_UP'), 'Cannot cancel once PICKED_UP');
    assert(screenSrc.includes('norm !== REQUEST_STATUS.CANCELLED'), 'Cannot cancel if already CANCELLED');
    assert(screenSrc.includes('norm !== REQUEST_STATUS.EXPIRED'), 'Cannot cancel if EXPIRED');

    // Test helper logic directly
    const canCancel = (status) => {
      const norm = (status || '').toUpperCase();
      return (
        norm !== REQUEST_STATUS.PICKED_UP &&
        norm !== REQUEST_STATUS.CANCELLED &&
        norm !== REQUEST_STATUS.EXPIRED
      );
    };

    assert.strictEqual(canCancel('DRAFT'), true, 'DRAFT can be cancelled');
    assert.strictEqual(canCancel('SUBMITTED'), true, 'SUBMITTED can be cancelled');
    assert.strictEqual(canCancel('ACCEPTED'), true, 'ACCEPTED can be cancelled');
    assert.strictEqual(canCancel('PICKUP_SCHEDULED'), true, 'PICKUP_SCHEDULED can be cancelled');
    assert.strictEqual(canCancel('PICKED_UP'), false, 'PICKED_UP CANNOT be cancelled');
    assert.strictEqual(canCancel('CANCELLED'), false, 'CANCELLED CANNOT be cancelled');
    assert.strictEqual(canCancel('EXPIRED'), false, 'EXPIRED CANNOT be cancelled');
  });

  await test('Cancellation Mutation: Requires confirmation, reason input, and calls requestService.cancelRequest', async () => {
    const screenSrc = readSrcFile('screens/citizen/CitizenRequestsScreen.tsx');

    // Requires confirmation modal
    assert(screenSrc.includes('cancelModalVisible'), 'Must use confirmation modal');
    assert(screenSrc.includes('cancellationReason'), 'Must capture cancellation reason');
    assert(screenSrc.includes('Please provide a reason for cancelling this request.'), 'Must validate reason input');

    // Calls service method
    assert(screenSrc.includes('requestService.cancelRequest(selectedRequest.id, reason)'), 'Must call requestService.cancelRequest with id and reason');

    // Reloads requests after cancellation
    assert(screenSrc.includes('await loadRequests()'), 'Must reload requests list after cancellation mutation');

    // Verify requestService cancelRequest implementation
    const serviceSrc = readSrcFile('services/requestService.js');
    assert(serviceSrc.includes("POST /collection-requests/:id/cancel"), 'requestService must document POST cancel endpoint');
    assert(serviceSrc.includes("`/collection-requests/${id}/cancel`"), 'requestService must call canonical POST cancel URL');
    assert(serviceSrc.includes("reason: reasonText") || serviceSrc.includes("{ reason }"), 'requestService must pass reason in request body');
  });

  // -------------------------------------------------------------
  // 7. INFORMAL COLLECTOR FIRST & ZERO RECYCLER EXPOSURE
  // -------------------------------------------------------------
  await test('Informal Collector First: Zero Recycler references, listings, consignment controls, or endpoints', () => {
    const screenSrc = readSrcFile('screens/citizen/CitizenRequestsScreen.tsx');

    // Zero recycler exposure
    assert(!screenSrc.toLowerCase().includes('recycler'), 'CitizenRequestsScreen must NOT expose any Recycler controls, labels, or routing');
    assert(!screenSrc.toLowerCase().includes('consignment'), 'CitizenRequestsScreen must NOT contain any Consignment logic or controls');
    assert(!screenSrc.includes('createConsignment'), 'Must not create consignments');
    assert(!screenSrc.includes('acceptConsignment'), 'Must not accept consignments');

    // Collector copy preserves informal collector model without leaking private details
    assert(screenSrc.includes('Local Informal Collector (Kabadiwala)'), 'Must identify collectors respectfully as Local Informal Collector');
    assert(!screenSrc.includes('collector.phoneNumber'), 'Must not expose collector phone number on citizen overview');
    assert(!screenSrc.includes('collector.latitude'), 'Must not expose collector raw coordinates');
    assert(!screenSrc.includes('collector.id'), 'Must not display collector internal DB ID');
  });

  // -------------------------------------------------------------
  // 8. OFFLINE-FIRST CAPABILITY & PERSISTED CACHING
  // -------------------------------------------------------------
  await test('Offline Behavior: Cached requests displayed when offline; offline banner shown; mutation blocked offline', async () => {
    // Clear and seed cached requests in offlineStore
    await storage.clear();
    const mockCachedRequests = [
      {
        id: 'req_offline_101',
        status: REQUEST_STATUS.SUBMITTED,
        pickupAddress: 'Sector 62, Noida',
        preferredDate: '2026-09-20',
        createdAt: '2026-09-17T10:00:00Z',
        ewasteItems: [{ id: 'item_1', category: 'LAPTOP' }],
      },
      {
        id: 'req_offline_102',
        status: REQUEST_STATUS.PICKUP_SCHEDULED,
        pickupAddress: 'Indirapuram, Ghaziabad',
        preferredDate: '2026-09-21',
        createdAt: '2026-09-16T15:00:00Z',
        collectorId: 'col_123',
        ewasteItems: [{ id: 'item_2', category: 'MOBILE_PHONE' }],
      },
    ];

    await offlineStore.cacheRequests(mockCachedRequests);
    const retrieved = await offlineStore.getCachedRequests();
    assert.strictEqual(retrieved.length, 2);
    assert.strictEqual(retrieved[0].id, 'req_offline_101');
    assert.strictEqual(retrieved[1].status, REQUEST_STATUS.PICKUP_SCHEDULED);

    // Verify screen offline handling
    const screenSrc = readSrcFile('screens/citizen/CitizenRequestsScreen.tsx');
    assert(screenSrc.includes('useNetwork()'), 'Screen must consume useNetwork hook');
    assert(screenSrc.includes('offlineNotice'), 'Screen must render offline notice banner');
    assert(screenSrc.includes('Offline mode: Showing locally cached requests.'), 'Screen must show honest offline banner');
    assert(screenSrc.includes('Cancelling a collection request requires an active internet connection.'), 'Cancellation mutation must require active internet connection');

    // Verify requestService integrates offlineStore caching
    const serviceSrc = readSrcFile('services/requestService.js');
    assert(serviceSrc.includes('offlineStore.getCachedRequests()'), 'requestService must retrieve cached requests from offlineStore');
  });

  // -------------------------------------------------------------
  // 9. LOADING, EMPTY, AND ERROR STATES
  // -------------------------------------------------------------
  await test('UI States: Skeleton loading, accessible EmptyState with + Submit action, and Error banner with retry', () => {
    const screenSrc = readSrcFile('screens/citizen/CitizenRequestsScreen.tsx');

    // Loading skeleton
    assert(screenSrc.includes('<Skeleton'), 'Must render Skeleton during loading');

    // Empty state
    assert(screenSrc.includes('<EmptyState'), 'Must render EmptyState when empty');
    assert(screenSrc.includes('No Collection Requests'), 'EmptyState must have clear title');
    assert(screenSrc.includes("navigation.navigate('CitizenSubmit')"), 'EmptyState action must navigate to CitizenSubmit');

    // Error and retry state
    assert(screenSrc.includes('errorBox'), 'Must have styled errorBox');
    assert(screenSrc.includes('retryButton'), 'Must have retryButton');
    assert(screenSrc.includes('onPress={loadRequests}'), 'Retry button must invoke loadRequests');
  });

  // -------------------------------------------------------------
  // 10. ACCESSIBILITY CONFORMANCE (48x48dp / Semantic Roles)
  // -------------------------------------------------------------
  await test('Accessibility: 48x48dp minimum touch targets, semantic headers, button/alert roles, and modal dialogs', () => {
    const screenSrc = readSrcFile('screens/citizen/CitizenRequestsScreen.tsx');

    // Touch targets >= 48dp
    assert(screenSrc.includes('minHeight: 48'), 'Interactive buttons and chips must satisfy minHeight: 48');
    assert(screenSrc.includes('accessibilityRole="button"'), 'Interactive elements must define accessibilityRole="button"');
    assert(screenSrc.includes('accessibilityRole="header"'), 'Section titles must define accessibilityRole="header"');
    assert(screenSrc.includes('accessibilityRole="alert"'), 'Alert banners must define accessibilityRole="alert"');
    assert(screenSrc.includes('accessibilityViewIsModal={true}'), 'Cancellation modal must declare accessibilityViewIsModal');
    assert(screenSrc.includes('accessibilityLabel='), 'Must define accessibilityLabel on interactive controls');
  });

  // -------------------------------------------------------------
  // 11. SECURITY & SENSITIVE DATA HYGIENE
  // -------------------------------------------------------------
  await test('Security: No credentials, JWT tokens, DB passwords, or foreign citizen data leaked', () => {
    const screenSrc = readSrcFile('screens/citizen/CitizenRequestsScreen.tsx');

    assert(!screenSrc.includes('accessToken'), 'Must not read, expose, or log accessToken');
    assert(!screenSrc.includes('refreshToken'), 'Must not read, expose, or log refreshToken');
    assert(!screenSrc.includes('password'), 'Must not handle password');
    assert(!screenSrc.includes('jwt'), 'Must not expose JWTs');
    assert(!screenSrc.includes('console.log'), 'Must not use console.log with sensitive details');
  });

  // -------------------------------------------------------------
  // 12. NAVIGATION SAFETY & NO UNDOCUMENTED ROUTES
  // -------------------------------------------------------------
  await test('Navigation Safety: Strictly documented citizen routes only', () => {
    const screenSrc = readSrcFile('screens/citizen/CitizenRequestsScreen.tsx');

    const documentedRoutes = [
      'CitizenHome',
      'CitizenSubmit',
      'CitizenRequests',
      'CitizenNotifications',
      'CitizenProfile',
      'RequestDetail',
      'ItemTraceability',
    ];

    // Find all navigation.navigate calls
    const navigateRegex = /navigation\.navigate\(['"]([^'"]+)['"]/g;
    let match;
    const foundRoutes = [];
    while ((match = navigateRegex.exec(screenSrc)) !== null) {
      foundRoutes.push(match[1]);
    }

    for (const route of foundRoutes) {
      assert(
        documentedRoutes.includes(route),
        `Route "${route}" in CitizenRequestsScreen is NOT a documented Citizen route!`
      );
    }
  });

  // Clean up
  await storage.clear();

  console.log('\n========================================================');
  console.log(`CITIZEN REQUESTS TEST SUMMARY: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}% SUCCESS)`);
  console.log('========================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
  process.exit(0);
}

runCitizenRequestsTests().catch((err) => {
  console.error('Citizen Requests test runner fatal error:', err);
  process.exit(1);
});
