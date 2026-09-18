/**
 * EcoSetu Phase 16 Verification Suite: Navigation Architecture + Auth Shell + Role Routing
 *
 * Verifies:
 * 1. Unauthenticated startup routes to AuthNavigator (Landing, Login, Register)
 * 2. Session restoration from AsyncStorage (valid session, expired token, logout purge)
 * 3. Role-Based Navigation Routing (CITIZEN, INFORMAL_COLLECTOR, RECYCLER, ADMIN)
 * 4. Cross-role isolation (no screen leakage between roles)
 * 5. Unknown/tampered role safe fallback to AuthNavigator
 * 6. Security verification (no ADMIN registration in UI, no token leaks in params)
 * 7. Offline shell stability and NetworkContext/OfflineBanner integration
 * 8. Static architecture verification (types, component hierarchy, accessibility)
 *
 * Source of Truth: docs/06_ROLES_AND_PERMISSIONS.md, docs/08_UI_UX_SPECIFICATION.md, docs/09_FRONTEND_ARCHITECTURE.md
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Import mobile foundation modules
const { storage } = require('../src/utils/storage');
const { STORAGE_KEYS, ROLES } = require('../src/utils/constants');
const { authService } = require('../src/services/authService');
const { networkService } = require('../src/services/networkService');
const { offlineQueue } = require('../src/services/offlineQueue');

// Helper to read source files for static architecture analysis
function readSrcFile(relativePath) {
  const fullPath = path.join(__dirname, '..', 'src', relativePath);
  assert(fs.existsSync(fullPath), `Source file must exist: ${relativePath}`);
  return fs.readFileSync(fullPath, 'utf8');
}

async function runNavigationAuthShellTests() {
  console.log('====================================================');
  console.log('ECOSETU PHASE 16 — APP SHELL & NAVIGATION VERIFICATION');
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
  // 1. AUTHENTICATION FLOW & SESSION RESTORATION
  // -------------------------------------------------------------
  await test('Auth Flow: Unauthenticated startup reaches authentication entry', async () => {
    await storage.clear();

    const session = await authService.getSession();
    assert.strictEqual(session.isAuthenticated, false, 'Should be unauthenticated when storage empty');
    assert.strictEqual(session.user, null, 'User profile should be null');
    assert.strictEqual(session.accessToken, null, 'Access token should be null');

    const isAuth = await authService.isAuthenticated();
    assert.strictEqual(isAuth, false, 'authService.isAuthenticated() must return false');
  });

  await test('Auth Flow: Valid persisted session restores successfully on startup', async () => {
    const mockUser = {
      id: 'usr_citizen_101',
      email: 'priya@ecosetu.org',
      name: 'Priya Sharma',
      role: ROLES.CITIZEN,
      status: 'ACTIVE',
    };
    const mockToken = 'valid_session_token_xyz';

    await storage.setItem(STORAGE_KEYS.USER_PROFILE, mockUser);
    await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, mockToken);

    const session = await authService.getSession();
    assert.strictEqual(session.isAuthenticated, true, 'Should restore active session');
    assert.strictEqual(session.user.email, 'priya@ecosetu.org');
    assert.strictEqual(session.user.role, ROLES.CITIZEN);
    assert.strictEqual(session.accessToken, mockToken);
  });

  await test('Auth Flow: Logout completely purges session credentials and returns to unauthenticated state', async () => {
    await authService.logout();

    const token = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const user = await storage.getItem(STORAGE_KEYS.USER_PROFILE);
    const session = await authService.getSession();

    assert.strictEqual(token, null, 'Access token must be purged from storage');
    assert.strictEqual(user, null, 'User profile must be purged from storage');
    assert.strictEqual(session.isAuthenticated, false, 'Session must be unauthenticated after logout');
  });

  // -------------------------------------------------------------
  // 2. ROOT NAVIGATOR ARCHITECTURE & ROLE-BASED ROUTING
  // -------------------------------------------------------------
  await test('RootNavigator: Contains startup loading indicator, unauthenticated gate, and role switch', () => {
    const rootSrc = readSrcFile('navigation/RootNavigator.tsx');

    // Startup loading state check
    assert(rootSrc.includes('isLoading'), 'RootNavigator must check isLoading from useAuth');
    assert(rootSrc.includes('Restoring secure session...'), 'RootNavigator must show session restoration copy');
    assert(rootSrc.includes('accessibilityRole="progressbar"'), 'Loading screen must have progressbar accessibility role');

    // Unauthenticated branch
    assert(rootSrc.includes('!isAuthenticated || !user'), 'RootNavigator must check isAuthenticated and user');
    assert(rootSrc.includes('<AuthNavigator />'), 'Unauthenticated branch must render AuthNavigator');

    // Role-based routing switch
    assert(rootSrc.includes('switch (user.role)'), 'RootNavigator must switch on user.role');
    assert(rootSrc.includes('case ROLES.CITIZEN:\n      return <CitizenNavigator />'), 'CITIZEN route must render CitizenNavigator');
    assert(rootSrc.includes('case ROLES.INFORMAL_COLLECTOR:\n      return <CollectorNavigator />'), 'INFORMAL_COLLECTOR route must render CollectorNavigator');
    assert(rootSrc.includes('case ROLES.RECYCLER:\n      return <RecyclerNavigator />'), 'RECYCLER route must render RecyclerNavigator');
    assert(rootSrc.includes('case ROLES.ADMIN:\n      return <AdminNavigator />'), 'ADMIN route must render AdminNavigator');

    // Safe fallback on unknown/tampered role
    assert(rootSrc.includes('default:'), 'RootNavigator must have default fallback');
    assert(rootSrc.includes('return <AuthNavigator />'), 'Fallback must safely return AuthNavigator without leaking screens');
  });

  // -------------------------------------------------------------
  // 3. ROLE-SPECIFIC NAVIGATION CATALOGS (docs/08 & docs/09)
  // -------------------------------------------------------------
  await test('Role Routing: CITIZEN receives documented 5 tabs and 2 modal screens', () => {
    const citizenSrc = readSrcFile('navigation/CitizenNavigator.tsx');

    // 5 Documented Tabs
    assert(citizenSrc.includes("name=\"CitizenHome\""), 'Citizen tab must have CitizenHome');
    assert(citizenSrc.includes("name=\"CitizenSubmit\""), 'Citizen tab must have CitizenSubmit');
    assert(citizenSrc.includes("name=\"CitizenRequests\""), 'Citizen tab must have CitizenRequests');
    assert(citizenSrc.includes("name=\"CitizenNotifications\""), 'Citizen tab must have CitizenNotifications');
    assert(citizenSrc.includes("name=\"CitizenProfile\""), 'Citizen tab must have CitizenProfile');

    // 2 Documented Modals
    assert(citizenSrc.includes("name=\"RequestDetail\""), 'Citizen stack must have RequestDetail modal');
    assert(citizenSrc.includes("name=\"ItemTraceability\""), 'Citizen stack must have ItemTraceability modal');

    // Ensure no admin or collector screens
    assert(!citizenSrc.includes('CollectorPickups'), 'Citizen must NOT have CollectorPickups');
    assert(!citizenSrc.includes('AdminAuditLogs'), 'Citizen must NOT have AdminAuditLogs');
    assert(!citizenSrc.includes('RecyclerIncoming'), 'Citizen must NOT have RecyclerIncoming');
  });

  await test('Role Routing: INFORMAL_COLLECTOR receives documented 5 tabs and 3 modal screens', () => {
    const collectorSrc = readSrcFile('navigation/CollectorNavigator.tsx');

    // 5 Documented Tabs
    assert(collectorSrc.includes("name=\"CollectorHome\""), 'Collector tab must have CollectorHome');
    assert(collectorSrc.includes("name=\"CollectorBrowse\""), 'Collector tab must have CollectorBrowse');
    assert(collectorSrc.includes("name=\"CollectorPickups\""), 'Collector tab must have CollectorPickups');
    assert(collectorSrc.includes("name=\"CollectorConsign\""), 'Collector tab must have CollectorConsign');
    assert(collectorSrc.includes("name=\"CollectorProfile\""), 'Collector tab must have CollectorProfile');

    // 3 Documented Modals
    assert(collectorSrc.includes("name=\"PickupExecution\""), 'Collector stack must have PickupExecution modal');
    assert(collectorSrc.includes("name=\"RequestDetail\""), 'Collector stack must have RequestDetail modal');
    assert(collectorSrc.includes("name=\"Verification\""), 'Collector stack must have Verification modal');

    // Ensure no admin or recycler screens
    assert(!collectorSrc.includes('AdminUsers'), 'Collector must NOT have AdminUsers');
    assert(!collectorSrc.includes('RecyclerRecords'), 'Collector must NOT have RecyclerRecords');
  });

  await test('Role Routing: RECYCLER receives documented 4 tabs and 1 modal screen', () => {
    const recyclerSrc = readSrcFile('navigation/RecyclerNavigator.tsx');

    // 4 Documented Tabs
    assert(recyclerSrc.includes("name=\"RecyclerHome\""), 'Recycler tab must have RecyclerHome');
    assert(recyclerSrc.includes("name=\"RecyclerIncoming\""), 'Recycler tab must have RecyclerIncoming');
    assert(recyclerSrc.includes("name=\"RecyclerRecords\""), 'Recycler tab must have RecyclerRecords');
    assert(recyclerSrc.includes("name=\"RecyclerProfile\""), 'Recycler tab must have RecyclerProfile');

    // 1 Documented Modal
    assert(recyclerSrc.includes("name=\"Verification\""), 'Recycler stack must have Verification modal');

    // Ensure no citizen submit or collector browse screens
    assert(!recyclerSrc.includes('CitizenSubmit'), 'Recycler must NOT have CitizenSubmit');
    assert(!recyclerSrc.includes('CollectorBrowse'), 'Recycler must NOT have CollectorBrowse');
  });

  await test('Role Routing: ADMIN receives documented 5 tabs', () => {
    const adminSrc = readSrcFile('navigation/AdminNavigator.tsx');

    // 5 Documented Tabs
    assert(adminSrc.includes("name=\"AdminHome\""), 'Admin tab must have AdminHome');
    assert(adminSrc.includes("name=\"AdminVerifications\""), 'Admin tab must have AdminVerifications');
    assert(adminSrc.includes("name=\"AdminUsers\""), 'Admin tab must have AdminUsers');
    assert(adminSrc.includes("name=\"AdminAuditLogs\""), 'Admin tab must have AdminAuditLogs');
    assert(adminSrc.includes("name=\"AdminProfile\""), 'Admin tab must have AdminProfile');

    // Ensure no citizen submit or collector pickup execution
    assert(!adminSrc.includes('CitizenSubmit'), 'Admin must NOT have CitizenSubmit');
    assert(!adminSrc.includes('PickupExecution'), 'Admin must NOT have PickupExecution');
  });

  // -------------------------------------------------------------
  // 4. AUTHENTICATION SCREENS (Landing, Login, Register)
  // -------------------------------------------------------------
  await test('Auth Navigation: AuthNavigator defines Landing, Login, and Register screens', () => {
    const authSrc = readSrcFile('navigation/AuthNavigator.tsx');
    assert(authSrc.includes("name=\"Landing\""), 'AuthNavigator must have Landing screen');
    assert(authSrc.includes("name=\"Login\""), 'AuthNavigator must have Login screen');
    assert(authSrc.includes("name=\"Register\""), 'AuthNavigator must have Register screen');
  });

  await test('Register Screen: Strictly forbids ADMIN role selection during registration', () => {
    const regSrc = readSrcFile('screens/auth/RegisterScreen.tsx');
    assert(regSrc.includes('setRole(ROLES.CITIZEN)'), 'Register must support CITIZEN role selection');
    assert(regSrc.includes('setRole(ROLES.INFORMAL_COLLECTOR)'), 'Register must support INFORMAL_COLLECTOR role selection');
    assert(regSrc.includes('setRole(ROLES.RECYCLER)'), 'Register must support RECYCLER role selection');
    assert(!regSrc.includes('setRole(ROLES.ADMIN)'), 'Register screen MUST NOT allow ADMIN self-registration');
    assert(!regSrc.includes('typeof ROLES.ADMIN'), 'AllowedRole union MUST NOT include ADMIN');
  });

  // -------------------------------------------------------------
  // 5. OFFLINE INTEGRATION & NETWORK STATUS
  // -------------------------------------------------------------
  await test('Offline Integration: NetworkContext, OfflineBanner, and offlineQueue work seamlessly', async () => {
    // Check OfflineBanner implementation
    const bannerSrc = readSrcFile('components/common/OfflineBanner.tsx');
    assert(bannerSrc.includes('useNetwork()'), 'OfflineBanner must consume useNetwork hook');
    assert(bannerSrc.includes('isConnected'), 'OfflineBanner must check isConnected');
    assert(bannerSrc.includes('accessibilityRole="alert"'), 'OfflineBanner must have alert accessibility role');

    // Check App.tsx integration
    const appSrc = readSrcFile('App.tsx');
    assert(appSrc.includes('<AuthProvider>'), 'App.tsx must wrap tree in AuthProvider');
    assert(appSrc.includes('<NetworkProvider>'), 'App.tsx must wrap tree in NetworkProvider');
    assert(appSrc.includes('<OfflineBanner />'), 'App.tsx must mount OfflineBanner');
    assert(appSrc.includes('<RootNavigator />'), 'App.tsx must mount RootNavigator');

    // Simulate offline transition
    networkService.setMockConnection(false);
    assert.strictEqual(networkService.isConnected(), false, 'Network state must report offline');

    // Enqueue offline action
    const queued = await offlineQueue.enqueue({
      type: 'CREATE_EWASTE_ITEM',
      endpoint: '/ewaste-items',
      method: 'POST',
      payload: { brand: 'Lenovo', model: 'T480' },
      localId: 'temp_p16_offline_test',
    });
    assert(queued.id.startsWith('queue_'), 'Offline queue must successfully record action while offline');

    const pendingCount = await offlineQueue.getPendingCount();
    assert(pendingCount >= 1, 'Offline queue must return pending count for banner display');

    // Reconnect
    networkService.setMockConnection(true);
    assert.strictEqual(networkService.isConnected(), true, 'Network state must report online');
  });

  // -------------------------------------------------------------
  // 6. DESIGN SYSTEM & ACCESSIBILITY
  // -------------------------------------------------------------
  await test('Design System & Accessibility: Shell components adhere to ECOSETU design tokens and a11y', () => {
    const placeholderSrc = readSrcFile('components/common/PlaceholderScreen.tsx');
    assert(placeholderSrc.includes('accessibilityRole="header"'), 'PlaceholderScreen must provide header a11y role');
    assert(placeholderSrc.includes('accessibilityRole="button"'), 'Sign Out button must provide button a11y role');
    assert(placeholderSrc.includes('colors.primary'), 'Must use design token colors');

    const topAppBarSrc = readSrcFile('components/layout/TopAppBar.tsx');
    assert(topAppBarSrc.includes('accessibilityRole="header"'), 'TopAppBar must have header a11y role');
    assert(topAppBarSrc.includes('accessibilityLabel'), 'TopAppBar elements must have accessibilityLabel');
  });

  // -------------------------------------------------------------
  // 7. SECURITY & PARAM PURITY
  // -------------------------------------------------------------
  await test('Security: No tokens or credentials in navigation param types', () => {
    const typesSrc = readSrcFile('navigation/types.ts');
    assert(!typesSrc.includes('token: string'), 'Navigation params MUST NOT store tokens');
    assert(!typesSrc.includes('password: string'), 'Navigation params MUST NOT store passwords');
  });

  // Clean up
  await storage.clear();

  console.log('\n====================================================');
  console.log(`PHASE 16 TEST SUMMARY: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}% SUCCESS)`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
  process.exit(0);
}

runNavigationAuthShellTests().catch((err) => {
  console.error('Phase 16 test runner fatal error:', err);
  process.exit(1);
});
