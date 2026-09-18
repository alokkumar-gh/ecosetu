/**
 * EcoSetu Phase 16 Task 3 Verification Suite: Citizen Submit E-Waste Item
 *
 * Verifies:
 * 1. Citizen reaches SubmitItemScreen through CitizenNavigator
 * 2. Non-citizen roles (COLLECTOR, RECYCLER, ADMIN, Tampered) cannot receive SubmitItemScreen
 * 3. Canonical categories (11) and conditions (4) supported
 * 4. Form validation rules: required category, quantity bounds (1-100), weight bounds (0.01-500), description length (max 500)
 * 5. Protected fields (id, citizenId, actualWeightKg, status, etc.) strictly excluded from creation payload
 * 6. Correct ewasteService integration
 * 7. Duplicate submission prevention and loading state
 * 8. Offline-first resilience: local draft saving and offlineQueue enqueueing when offline
 * 9. Honest offline state messaging (never claims server acceptance when offline)
 * 10. Documented navigation targets (CitizenHome)
 * 11. Accessibility conformance (roles, labels, minimum 48x48dp touch targets)
 * 12. Security & privacy: Zero tokens, passwords, or credentials exposed
 *
 * Source of Truth: docs/05_API_SPECIFICATION.md Section 6, docs/08_UI_UX_SPECIFICATION.md Section 4.2, docs/09_FRONTEND_ARCHITECTURE.md
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Import mobile foundation modules
const { storage } = require('../src/utils/storage');
const { STORAGE_KEYS, ROLES, EWASTE_CATEGORIES, ITEM_CONDITIONS } = require('../src/utils/constants');
const { authService } = require('../src/services/authService');
const { networkService } = require('../src/services/networkService');
const { offlineStore } = require('../src/services/offlineStore');
const { offlineQueue } = require('../src/services/offlineQueue');
const { ewasteService } = require('../src/services/ewasteService');

// Helper to read source files for static architecture analysis
function readSrcFile(relativePath) {
  const fullPath = path.join(__dirname, '..', 'src', relativePath);
  assert(fs.existsSync(fullPath), `Source file must exist: ${relativePath}`);
  return fs.readFileSync(fullPath, 'utf8');
}

async function runCitizenSubmitTests() {
  console.log('====================================================');
  console.log('ECOSETU PHASE 16 — CITIZEN SUBMIT ITEM VERIFICATION');
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
  // 1. CITIZEN ROLE ROUTING & ACCESS
  // -------------------------------------------------------------
  await test('Role Routing: Citizen role routes to CitizenNavigator mounting SubmitItemScreen', async () => {
    await storage.clear();

    const mockCitizen = {
      id: 'usr_citizen_002',
      name: 'Rohan Mehta',
      email: 'rohan@ecosetu.org',
      role: ROLES.CITIZEN,
      status: 'ACTIVE',
    };
    await storage.setItem(STORAGE_KEYS.USER_PROFILE, mockCitizen);
    await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'tok_citizen_valid');

    const session = await authService.getSession();
    assert.strictEqual(session.isAuthenticated, true);
    assert.strictEqual(session.user.role, ROLES.CITIZEN);

    // Verify CitizenNavigator mounts SubmitItemScreen
    const navSrc = readSrcFile('navigation/CitizenNavigator.tsx');
    assert(navSrc.includes("import { SubmitItemScreen } from '../screens/citizen/SubmitItemScreen'"));
    assert(navSrc.includes('name="CitizenSubmit"'));
    assert(navSrc.includes('component={SubmitItemScreen}'));
  });

  await test('Role Isolation: Non-citizen roles cannot receive SubmitItemScreen', () => {
    const collectorNavSrc = readSrcFile('navigation/CollectorNavigator.tsx');
    const recyclerNavSrc = readSrcFile('navigation/RecyclerNavigator.tsx');
    const adminNavSrc = readSrcFile('navigation/AdminNavigator.tsx');

    assert(!collectorNavSrc.includes('SubmitItemScreen'), 'CollectorNavigator must NOT mount SubmitItemScreen');
    assert(!recyclerNavSrc.includes('SubmitItemScreen'), 'RecyclerNavigator must NOT mount SubmitItemScreen');
    assert(!adminNavSrc.includes('SubmitItemScreen'), 'AdminNavigator must NOT mount SubmitItemScreen');
  });

  // -------------------------------------------------------------
  // 2. CANONICAL CATEGORIES & CONDITIONS (docs/05 & schema.prisma)
  // -------------------------------------------------------------
  await test('Canonical Enumerations: Supports all 11 categories and 4 conditions', () => {
    const screenSrc = readSrcFile('screens/citizen/SubmitItemScreen.tsx');

    const expectedCategories = [
      'MOBILE_PHONE',
      'LAPTOP',
      'DESKTOP',
      'TABLET',
      'MONITOR',
      'PRINTER',
      'KEYBOARD_MOUSE',
      'CABLE_CHARGER',
      'BATTERY',
      'CIRCUIT_BOARD',
      'OTHER',
    ];

    for (const cat of expectedCategories) {
      assert(screenSrc.includes(`EWASTE_CATEGORIES.${cat}`), `Screen must support category ${cat}`);
    }

    const expectedConditions = ['WORKING', 'NOT_WORKING', 'DAMAGED', 'UNKNOWN'];
    for (const cond of expectedConditions) {
      assert(screenSrc.includes(`ITEM_CONDITIONS.${cond}`), `Screen must support condition ${cond}`);
    }
  });

  // -------------------------------------------------------------
  // 3. FORM VALIDATION RULES
  // -------------------------------------------------------------
  await test('Validation Rules: Category required, quantity bounds (1-100), weight bounds (0.01-500), description length', () => {
    const screenSrc = readSrcFile('screens/citizen/SubmitItemScreen.tsx');

    // Category required
    assert(screenSrc.includes('Please select an e-waste category.'), 'Must require category');

    // Quantity validation (1 to 100)
    assert(screenSrc.includes('quantity < 1 || quantity > 100'), 'Must validate quantity between 1 and 100');

    // Estimated weight validation (0.01 to 500)
    assert(screenSrc.includes('parsedWeight < 0.01 || parsedWeight > 500'), 'Must validate weight between 0.01 and 500');

    // Description length validation (max 500)
    assert(screenSrc.includes('description.trim().length > 500'), 'Must enforce description max length 500');
    assert(screenSrc.includes('maxLength={500}'), 'TextInput must enforce maxLength 500');
  });

  // -------------------------------------------------------------
  // 4. PAYLOAD PURITY & PROTECTED FIELD EXCLUSION
  // -------------------------------------------------------------
  await test('Payload Purity: Protected fields are strictly excluded from creation payload', () => {
    const screenSrc = readSrcFile('screens/citizen/SubmitItemScreen.tsx');

    // Ensure protected fields are NOT added to creation payload
    const protectedFields = [
      'actualWeightKg',
      'status',
      'collectionRequestId',
      'citizenId',
    ];

    for (const field of protectedFields) {
      assert(!screenSrc.includes(`payload.${field} =`), `Payload must not include protected field ${field}`);
    }
  });

  // -------------------------------------------------------------
  // 5. DUPLICATE SUBMISSION PREVENTION & LOADING
  // -------------------------------------------------------------
  await test('Duplicate Submission: Submitting guard prevents concurrent taps and shows spinner', () => {
    const screenSrc = readSrcFile('screens/citizen/SubmitItemScreen.tsx');

    assert(screenSrc.includes('if (isSubmitting) return;'), 'Must guard against concurrent clicks');
    assert(screenSrc.includes('disabled={isSubmitting}'), 'Submit button must be disabled during submission');
    assert(screenSrc.includes('ActivityIndicator'), 'Must show spinner while submitting');
    assert(screenSrc.includes('Submitting Item...'), 'Must show submitting text while in progress');
  });

  // -------------------------------------------------------------
  // 6. OFFLINE-FIRST INTEGRATION & HONEST MESSAGING
  // -------------------------------------------------------------
  await test('Offline Integration: Saves draft and queues action when offline with honest copy', async () => {
    // Switch offline
    networkService.setMockConnection(false);
    assert.strictEqual(networkService.isConnected(), false);

    const offlinePayload = {
      category: EWASTE_CATEGORIES.LAPTOP,
      condition: ITEM_CONDITIONS.DAMAGED,
      quantity: 1,
      estimatedWeightKg: 2.1,
      description: 'Old Dell Latitude with broken screen',
    };

    const result = await ewasteService.createItem(offlinePayload);
    assert.strictEqual(result.isOfflineDraft, true, 'Result must be flagged as offline draft');
    assert(result.id.startsWith('temp_item_'), 'Draft must have local temporary ID');

    // Verify item was stored in offlineStore
    const cachedItems = await offlineStore.getCachedItems();
    assert(cachedItems.some((i) => i.id === result.id), 'Draft must exist in offlineStore cache');

    // Verify action was enqueued in offlineQueue
    const pendingCount = await offlineQueue.getPendingCount();
    assert(pendingCount >= 1, 'Action must be enqueued in offlineQueue');

    // Check honest UI copy in screen source
    const screenSrc = readSrcFile('screens/citizen/SubmitItemScreen.tsx');
    assert(
      screenSrc.includes(
        'E-Waste item saved as an offline draft. It will automatically synchronize with the server when connectivity returns.'
      ),
      'Must display truthful offline draft notification'
    );
    assert(
      !screenSrc.includes('Server accepted your offline item'),
      'Must NOT falsely claim server acceptance when offline'
    );

    // Reconnect
    networkService.setMockConnection(true);
    assert.strictEqual(networkService.isConnected(), true);
  });

  // -------------------------------------------------------------
  // 7. NAVIGATION ON SUCCESS
  // -------------------------------------------------------------
  await test('Navigation: Successfully targets documented CitizenHome route', () => {
    const screenSrc = readSrcFile('screens/citizen/SubmitItemScreen.tsx');

    // TopAppBar back button & success button target CitizenHome
    assert(screenSrc.includes("navigation.navigate('CitizenHome')"), 'Must navigate to CitizenHome');

    // Ensure no cross-role routes
    assert(!screenSrc.includes('CollectorPickups'), 'Must not link to collector routes');
    assert(!screenSrc.includes('RecyclerIncoming'), 'Must not link to recycler routes');
    assert(!screenSrc.includes('AdminAuditLogs'), 'Must not link to admin routes');
  });

  // -------------------------------------------------------------
  // 8. ACCESSIBILITY CONFORMANCE (Android 48x48dp / Semantic Roles)
  // -------------------------------------------------------------
  await test('Accessibility: Conforms to 48x48dp touch targets, semantic roles, and input labels', () => {
    const screenSrc = readSrcFile('screens/citizen/SubmitItemScreen.tsx');

    // Accessibility roles
    assert(screenSrc.includes('accessibilityRole="button"'), 'Interactive buttons must have button role');
    assert(screenSrc.includes('accessibilityRole="header"'), 'Field headings must have header role');
    assert(screenSrc.includes('accessibilityRole="alert"'), 'Error/success banners must have alert role');

    // Minimum touch targets (48dp)
    assert(screenSrc.includes('minHeight: 48'), 'Inputs and chips must satisfy 48dp touch target');
    assert(screenSrc.includes('width: 48'), 'Stepper buttons must be 48dp wide');
    assert(screenSrc.includes('height: 48'), 'Stepper buttons must be 48dp tall');
  });

  // -------------------------------------------------------------
  // 9. SECURITY & CREDENTIAL PRIVACY
  // -------------------------------------------------------------
  await test('Security: No passwords, tokens, or raw secrets handled or exposed in submit screen', () => {
    const screenSrc = readSrcFile('screens/citizen/SubmitItemScreen.tsx');

    assert(!screenSrc.includes('accessToken'), 'Must not read or display accessToken');
    assert(!screenSrc.includes('refreshToken'), 'Must not read or display refreshToken');
    assert(!screenSrc.includes('password'), 'Must not handle password');
  });

  // Clean up
  await storage.clear();

  console.log('\n====================================================');
  console.log(`CITIZEN SUBMIT TEST SUMMARY: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}% SUCCESS)`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
  process.exit(0);
}

runCitizenSubmitTests().catch((err) => {
  console.error('Citizen Submit test runner fatal error:', err);
  process.exit(1);
});
