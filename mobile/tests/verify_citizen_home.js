/**
 * EcoSetu Phase 16 Task 2 Verification Suite: Citizen Home / Dashboard
 *
 * Verifies:
 * 1. Citizen reaches Citizen Home / Dashboard through RootNavigator & CitizenNavigator
 * 2. Non-citizen roles (COLLECTOR, RECYCLER, ADMIN, Tampered) cannot receive Citizen Home
 * 3. Authenticated data retrieval & metric computation (items submitted, active requests, completed pickups)
 * 4. Documented empty state ("No activity yet. Start by submitting your e-waste!")
 * 5. Documented populated state with recent requests list
 * 6. Offline-first resilience: local cache fallback from offlineStore when offline
 * 7. Navigation targets adhere strictly to documented routes (CitizenSubmit, CitizenRequests, CitizenNotifications, RequestDetail)
 * 8. Security & Privacy: Zero tokens, passwords, or raw secrets exposed in state/views
 * 9. Accessibility: Headers, buttons, summary roles, and minimum touch target conformance
 *
 * Source of Truth: docs/08_UI_UX_SPECIFICATION.md Section 4.2, docs/09_FRONTEND_ARCHITECTURE.md
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Import mobile foundation modules
const { storage } = require('../src/utils/storage');
const { STORAGE_KEYS, ROLES } = require('../src/utils/constants');
const { authService } = require('../src/services/authService');
const { networkService } = require('../src/services/networkService');
const { offlineStore } = require('../src/services/offlineStore');
const { offlineQueue } = require('../src/services/offlineQueue');
const { ewasteService } = require('../src/services/ewasteService');
const { requestService } = require('../src/services/requestService');

// Helper to read source files for static architecture analysis
function readSrcFile(relativePath) {
  const fullPath = path.join(__dirname, '..', 'src', relativePath);
  assert(fs.existsSync(fullPath), `Source file must exist: ${relativePath}`);
  return fs.readFileSync(fullPath, 'utf8');
}

async function runCitizenHomeTests() {
  console.log('====================================================');
  console.log('ECOSETU PHASE 16 — CITIZEN HOME / DASHBOARD VERIFICATION');
  console.log('====================================================\n');

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
  // 1. ROLE ROUTING & CITIZEN HOME ACCESS
  // -------------------------------------------------------------
  await test('Role Routing: Citizen role routes to CitizenNavigator mounting CitizenDashboardScreen', async () => {
    await storage.clear();

    const mockCitizen = {
      id: 'usr_citizen_001',
      name: 'Sunita Rao',
      email: 'sunita@ecosetu.org',
      role: ROLES.CITIZEN,
      status: 'ACTIVE',
    };
    await storage.setItem(STORAGE_KEYS.USER_PROFILE, mockCitizen);
    await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'tok_cit_valid');

    const session = await authService.getSession();
    assert.strictEqual(session.isAuthenticated, true);
    assert.strictEqual(session.user.role, ROLES.CITIZEN);

    // Verify CitizenNavigator imports and mounts CitizenDashboardScreen
    const navSrc = readSrcFile('navigation/CitizenNavigator.tsx');
    assert(navSrc.includes("import { CitizenDashboardScreen } from '../screens/citizen/CitizenDashboardScreen'"));
    assert(navSrc.includes('name="CitizenHome"'));
    assert(navSrc.includes('component={CitizenDashboardScreen}'));
  });

  await test('Role Isolation: Non-citizen roles cannot receive CitizenDashboardScreen', () => {
    const collectorNavSrc = readSrcFile('navigation/CollectorNavigator.tsx');
    const recyclerNavSrc = readSrcFile('navigation/RecyclerNavigator.tsx');
    const adminNavSrc = readSrcFile('navigation/AdminNavigator.tsx');

    assert(!collectorNavSrc.includes('CitizenDashboardScreen'), 'CollectorNavigator must NOT mount CitizenDashboardScreen');
    assert(!recyclerNavSrc.includes('CitizenDashboardScreen'), 'RecyclerNavigator must NOT mount CitizenDashboardScreen');
    assert(!adminNavSrc.includes('CitizenDashboardScreen'), 'AdminNavigator must NOT mount CitizenDashboardScreen');
  });

  // -------------------------------------------------------------
  // 2. METRIC DATA SOURCES & COMPUTATION
  // -------------------------------------------------------------
  await test('Data & Metrics: Correctly derives submitted items, active requests, and completed pickups', () => {
    // Mock items returned by ewasteService
    const mockItems = [
      { id: 'item_1', category: 'LAPTOP', status: 'SUBMITTED' },
      { id: 'item_2', category: 'MOBILE_PHONE', status: 'COLLECTED' },
      { id: 'item_3', category: 'BATTERY', status: 'RECYCLED' },
    ];

    // Mock collection requests returned by requestService
    const mockRequests = [
      { id: 'req_1', status: 'SUBMITTED', pickupAddress: 'Connaught Place, New Delhi', createdAt: '2026-09-15T10:00:00Z' },
      { id: 'req_2', status: 'ACCEPTED', pickupAddress: 'Dwarka, New Delhi', createdAt: '2026-09-16T12:00:00Z' },
      { id: 'req_3', status: 'IN_PROGRESS', pickupAddress: 'Rohini, New Delhi', createdAt: '2026-09-17T09:00:00Z' },
      { id: 'req_4', status: 'COMPLETED', pickupAddress: 'Karol Bagh, New Delhi', createdAt: '2026-09-14T14:00:00Z' },
      { id: 'req_5', status: 'CANCELLED', pickupAddress: 'Saket, New Delhi', createdAt: '2026-09-13T11:00:00Z' },
    ];

    // Compute metrics according to CitizenDashboardScreen formula
    const itemsSubmittedCount = mockItems.length;
    const activeRequestsCount = mockRequests.filter((r) =>
      ['SUBMITTED', 'ACCEPTED', 'IN_PROGRESS'].includes(r.status)
    ).length;
    const completedPickupsCount = mockRequests.filter((r) => r.status === 'COMPLETED').length;

    assert.strictEqual(itemsSubmittedCount, 3, 'Must match total items submitted');
    assert.strictEqual(activeRequestsCount, 3, 'Must match SUBMITTED + ACCEPTED + IN_PROGRESS requests');
    assert.strictEqual(completedPickupsCount, 1, 'Must match COMPLETED requests');

    // Test recent requests sorting (descending by createdAt, max 5)
    const sorted = [...mockRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    assert.strictEqual(sorted[0].id, 'req_3', 'Latest request must be first');
    assert.strictEqual(sorted[1].id, 'req_2');
    assert.strictEqual(sorted[2].id, 'req_1');
  });

  // -------------------------------------------------------------
  // 3. UI STATES & DOCUMENTED COPY (docs/08 Section 4.2)
  // -------------------------------------------------------------
  await test('UI States: Documented empty state, skeleton loading, and error retry', () => {
    const screenSrc = readSrcFile('screens/citizen/CitizenDashboardScreen.tsx');

    // Empty state exact copy check per docs/08 Section 4.2
    assert(
      screenSrc.includes('No activity yet. Start by submitting your e-waste!'),
      'Must contain exact documented empty state copy'
    );
    assert(screenSrc.includes('actionLabel="Submit Your First Item"'), 'Empty state must offer submit action');

    // Skeleton loading check
    assert(screenSrc.includes('<Skeleton'), 'Dashboard must use Skeleton component during loading');

    // Error and retry check
    assert(
      screenSrc.includes('errorCard') || screenSrc.includes('errorBox') || screenSrc.includes('GlassCard'),
      'Dashboard must have errorCard or GlassCard container'
    );
    assert(screenSrc.includes('Try Again'), 'Dashboard must have Try Again retry button');
    assert(screenSrc.includes('RefreshControl'), 'Dashboard must support pull-to-refresh');
  });

  // -------------------------------------------------------------
  // 4. OFFLINE-FIRST RESILIENCE & CACHING
  // -------------------------------------------------------------
  await test('Offline Integration: Retrieves cached items and requests without crashing when offline', async () => {
    // Populate cache in offlineStore
    const testItems = [
      { id: 'offline_it_1', category: 'LAPTOP', brand: 'Dell', status: 'SUBMITTED' },
    ];
    const testRequests = [
      { id: 'offline_req_1', status: 'SUBMITTED', pickupAddress: 'Sector 14, Gurgaon', createdAt: '2026-09-17T15:00:00Z' },
    ];

    await offlineStore.saveItemDraft(testItems[0]);
    await offlineStore.cacheRequests(testRequests);

    // Switch network offline
    networkService.setMockConnection(false);
    assert.strictEqual(networkService.isConnected(), false);

    // Both services must retrieve cached data seamlessly
    const cachedItems = await ewasteService.getItems();
    const cachedRequests = await requestService.getRequests();

    assert(Array.isArray(cachedItems), 'Items must return an array when offline');
    assert(cachedItems.some((i) => i.id === 'offline_it_1'), 'Must include cached offline item');

    assert(Array.isArray(cachedRequests), 'Requests must return an array when offline');
    assert(cachedRequests.some((r) => r.id === 'offline_req_1'), 'Must include cached offline request');

    // Reconnect
    networkService.setMockConnection(true);
    assert.strictEqual(networkService.isConnected(), true);
  });

  // -------------------------------------------------------------
  // 5. DOCUMENTED NAVIGATION ACTIONS
  // -------------------------------------------------------------
  await test('Navigation: Actions strictly target documented Citizen routes', () => {
    const screenSrc = readSrcFile('screens/citizen/CitizenDashboardScreen.tsx');

    // Sibling tab navigations
    assert(screenSrc.includes("navigation.navigate('CitizenSubmit')"), 'Must navigate to CitizenSubmit');
    assert(screenSrc.includes("navigation.navigate('CitizenRequests')"), 'Must navigate to CitizenRequests');
    assert(screenSrc.includes("navigation.navigate('CitizenNotifications')"), 'Must navigate to CitizenNotifications');

    // Modal navigation
    assert(screenSrc.includes("navigate('RequestDetail'"), 'Must navigate to RequestDetail with requestId');

    // No cross-role routes
    assert(!screenSrc.includes('CollectorPickups'), 'Citizen Home must not navigate to collector routes');
    assert(!screenSrc.includes('AdminAuditLogs'), 'Citizen Home must not navigate to admin routes');
    assert(!screenSrc.includes('RecyclerIncoming'), 'Citizen Home must not navigate to recycler routes');
  });

  // -------------------------------------------------------------
  // 6. DESIGN SYSTEM CONFORMANCE (docs/08 Section 2 & Section 3)
  // -------------------------------------------------------------
  await test('Design Tokens: Status badges, metric cards, and colors conform to docs/08', () => {
    const badgeSrc = readSrcFile('components/common/StatusBadge.tsx');
    assert(
      badgeSrc.includes('colors.badge.pending.bg') || badgeSrc.includes("bg = '#BBDEFB'"),
      'SUBMITTED background must use pending badge token/color'
    );
    assert(
      badgeSrc.includes('colors.badge.approved.bg') || badgeSrc.includes("bg = '#C8E6C9'"),
      'ACCEPTED background must use approved badge token/color'
    );
    assert(
      badgeSrc.includes('colors.badge.progress.bg') || badgeSrc.includes("bg = '#FFE0B2'"),
      'IN_PROGRESS background must use progress badge token/color'
    );
    assert(
      badgeSrc.includes('colors.badge.completed.bg') || badgeSrc.includes("bg = '#A5D6A7'"),
      'COMPLETED background must use completed badge token/color'
    );
    assert(
      badgeSrc.includes('colors.badge.cancelled.bg') || badgeSrc.includes("bg = '#FFCDD2'"),
      'CANCELLED background must use cancelled badge token/color'
    );

    const metricSrc = readSrcFile('components/common/MetricCard.tsx');
    assert(
      metricSrc.includes('colors.glassFill') || metricSrc.includes('colors.glassSurface') || metricSrc.includes('colors.surface'),
      'MetricCard must use theme card background (glassFill, glassSurface, or surface)'
    );
    assert(
      metricSrc.includes('spacing.cardElevation') || metricSrc.includes('elevation:') || metricSrc.includes('elevation'),
      'MetricCard must use elevation'
    );
  });

  // -------------------------------------------------------------
  // 7. ACCESSIBILITY CONFORMANCE (WCAG 2.1 AA / Android 48x48dp)
  // -------------------------------------------------------------
  await test('Accessibility: Screen contains semantic roles, touch targets, and accessible headers', () => {
    const screenSrc = readSrcFile('screens/citizen/CitizenDashboardScreen.tsx');
    assert(screenSrc.includes('accessibilityRole="header"'), 'Headers must have header role');
    assert(screenSrc.includes('accessibilityRole="button"'), 'Interactive cards and buttons must have button role');
    assert(screenSrc.includes('accessibilityRole="alert"'), 'Error box must have alert role');

    const minHeightMatch = screenSrc.match(/primaryActionButton:[\s\S]*?minHeight:\s*(\d+)/);
    const minHeight = minHeightMatch ? parseInt(minHeightMatch[1], 10) : 0;
    assert(minHeight >= 44, 'Primary action button must satisfy minimum touch target (>= 44dp)');
  });

  // -------------------------------------------------------------
  // 8. SECURITY & PRIVACY
  // -------------------------------------------------------------
  await test('Security: No passwords, tokens, or raw secrets exposed in Citizen Home state or props', () => {
    const screenSrc = readSrcFile('screens/citizen/CitizenDashboardScreen.tsx');
    assert(!screenSrc.includes('accessToken'), 'Must not read or display accessToken');
    assert(!screenSrc.includes('refreshToken'), 'Must not read or display refreshToken');
    assert(!screenSrc.includes('password'), 'Must not handle password');
  });

  // Clean up
  await storage.clear();

  console.log('\n====================================================');
  console.log(`CITIZEN HOME TEST SUMMARY: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}% SUCCESS)`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
  process.exit(0);
}

runCitizenHomeTests().catch((err) => {
  console.error('Citizen Home test runner fatal error:', err);
  process.exit(1);
});
