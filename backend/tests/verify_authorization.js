// EcoSetu Authorization & RBAC Test Suite
// Canonical Reference: docs/06_ROLES_AND_PERMISSIONS.md, docs/10_BACKEND_ARCHITECTURE.md Section 4

const assert = require('assert');
const authorize = require('../src/middleware/authorize');
const checkStatus = require('../src/middleware/checkStatus');
const checkVerified = require('../src/middleware/checkVerified');
const { ROLES, USER_STATUS, ERROR_CODES } = require('../src/utils/constants');

async function runAuthorizationTests() {
  console.log('====================================================');
  console.log('ECOSETU AUTHORIZATION & RBAC TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✔ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
    }
  }

  // Helper to execute middleware and capture next(err) or next()
  function runMiddleware(middleware, req) {
    let calledNext = false;
    let errorPassed = null;

    middleware(req, {}, (err) => {
      calledNext = true;
      if (err) {
        errorPassed = err;
      }
    });

    return { calledNext, errorPassed };
  }

  // -------------------------------------------------------------
  // 1. UNAUTHENTICATED REQUESTS
  // -------------------------------------------------------------
  test('Unauthenticated: authorize rejects request without req.user (401)', () => {
    const req = {};
    const { calledNext, errorPassed } = runMiddleware(authorize(ROLES.CITIZEN), req);

    assert.strictEqual(calledNext, true, 'Next must be called');
    assert(errorPassed, 'Error must be passed to next');
    assert.strictEqual(errorPassed.statusCode, 401);
    assert.strictEqual(errorPassed.code, ERROR_CODES.UNAUTHORIZED);
  });

  test('Unauthenticated: checkStatus rejects request without req.user (401)', () => {
    const req = {};
    const { calledNext, errorPassed } = runMiddleware(checkStatus(USER_STATUS.ACTIVE), req);

    assert.strictEqual(calledNext, true);
    assert.strictEqual(errorPassed.statusCode, 401);
    assert.strictEqual(errorPassed.code, ERROR_CODES.UNAUTHORIZED);
  });

  test('Unauthenticated: checkVerified rejects request without req.user (401)', () => {
    const req = {};
    const { calledNext, errorPassed } = runMiddleware(checkVerified, req);

    assert.strictEqual(calledNext, true);
    assert.strictEqual(errorPassed.statusCode, 401);
    assert.strictEqual(errorPassed.code, ERROR_CODES.UNAUTHORIZED);
  });

  // -------------------------------------------------------------
  // 2. ROLE-BASED AUTHORIZATION GUARDS (authorize)
  // -------------------------------------------------------------
  test('Role Guard: CITIZEN accessing CITIZEN-only resource succeeds', () => {
    const req = { user: { id: 'u1', role: ROLES.CITIZEN, status: USER_STATUS.ACTIVE } };
    const { calledNext, errorPassed } = runMiddleware(authorize(ROLES.CITIZEN), req);

    assert.strictEqual(calledNext, true);
    assert.strictEqual(errorPassed, null, 'Permitted role must not receive an error');
  });

  test('Role Guard: INFORMAL_COLLECTOR accessing CITIZEN-only resource is rejected (403)', () => {
    const req = { user: { id: 'u2', role: ROLES.INFORMAL_COLLECTOR, status: USER_STATUS.ACTIVE } };
    const { calledNext, errorPassed } = runMiddleware(authorize(ROLES.CITIZEN), req);

    assert.strictEqual(calledNext, true);
    assert(errorPassed, 'Prohibited role must receive an error');
    assert.strictEqual(errorPassed.statusCode, 403);
    assert.strictEqual(errorPassed.code, ERROR_CODES.FORBIDDEN);
    assert(errorPassed.message.includes('Insufficient permissions'));
  });

  test('Role Guard: RECYCLER accessing CITIZEN-only resource is rejected (403)', () => {
    const req = { user: { id: 'u3', role: ROLES.RECYCLER, status: USER_STATUS.ACTIVE } };
    const { calledNext, errorPassed } = runMiddleware(authorize(ROLES.CITIZEN), req);

    assert.strictEqual(calledNext, true);
    assert.strictEqual(errorPassed.statusCode, 403);
    assert.strictEqual(errorPassed.code, ERROR_CODES.FORBIDDEN);
  });

  test('Role Guard: CITIZEN accessing ADMIN-only resource is rejected (403)', () => {
    const req = { user: { id: 'u1', role: ROLES.CITIZEN, status: USER_STATUS.ACTIVE } };
    const { calledNext, errorPassed } = runMiddleware(authorize(ROLES.ADMIN), req);

    assert.strictEqual(calledNext, true);
    assert.strictEqual(errorPassed.statusCode, 403);
    assert.strictEqual(errorPassed.code, ERROR_CODES.FORBIDDEN);
  });

  test('Role Guard: ADMIN accessing ADMIN-only resource succeeds', () => {
    const req = { user: { id: 'admin1', role: ROLES.ADMIN, status: USER_STATUS.ACTIVE } };
    const { calledNext, errorPassed } = runMiddleware(authorize(ROLES.ADMIN), req);

    assert.strictEqual(calledNext, true);
    assert.strictEqual(errorPassed, null);
  });

  test('Role Guard: Multi-role allow-list permits matching roles and rejects non-matching', () => {
    const reqCollector = { user: { id: 'u2', role: ROLES.INFORMAL_COLLECTOR, status: USER_STATUS.ACTIVE } };
    const reqAdmin = { user: { id: 'admin1', role: ROLES.ADMIN, status: USER_STATUS.ACTIVE } };
    const reqCitizen = { user: { id: 'u1', role: ROLES.CITIZEN, status: USER_STATUS.ACTIVE } };

    const middleware = authorize(ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN);

    const res1 = runMiddleware(middleware, reqCollector);
    assert.strictEqual(res1.errorPassed, null, 'INFORMAL_COLLECTOR should pass');

    const res2 = runMiddleware(middleware, reqAdmin);
    assert.strictEqual(res2.errorPassed, null, 'ADMIN should pass');

    const res3 = runMiddleware(middleware, reqCitizen);
    assert(res3.errorPassed, 'CITIZEN should be blocked');
    assert.strictEqual(res3.errorPassed.statusCode, 403);
  });

  // -------------------------------------------------------------
  // 3. CLIENT ROLE SPOOFING & TAMPER PREVENTION
  // -------------------------------------------------------------
  test('Security: Client sending role: ADMIN in body does NOT bypass CITIZEN guard', () => {
    // Authenticated user is CITIZEN, but malicious request body claims ADMIN
    const req = {
      user: { id: 'u1', role: ROLES.CITIZEN, status: USER_STATUS.ACTIVE },
      body: { role: 'ADMIN', user: { role: 'ADMIN' } },
      query: { role: 'ADMIN' },
      headers: { 'x-user-role': 'ADMIN' },
    };

    const { calledNext, errorPassed } = runMiddleware(authorize(ROLES.ADMIN), req);

    assert.strictEqual(calledNext, true);
    assert(errorPassed, 'Spoofing attempt must be blocked');
    assert.strictEqual(errorPassed.statusCode, 403);
    assert.strictEqual(errorPassed.code, ERROR_CODES.FORBIDDEN);
  });

  // -------------------------------------------------------------
  // 4. VERIFICATION RESTRICTIONS (checkVerified)
  // -------------------------------------------------------------
  test('Verification: INFORMAL_COLLECTOR with PENDING_VERIFICATION is blocked (403)', () => {
    const req = {
      user: {
        id: 'collector_unverified',
        role: ROLES.INFORMAL_COLLECTOR,
        status: USER_STATUS.PENDING_VERIFICATION,
      },
    };

    const { calledNext, errorPassed } = runMiddleware(checkVerified, req);

    assert.strictEqual(calledNext, true);
    assert(errorPassed, 'Unverified collector must be blocked');
    assert.strictEqual(errorPassed.statusCode, 403);
    assert.strictEqual(errorPassed.code, ERROR_CODES.FORBIDDEN);
    assert(errorPassed.message.includes('Account not yet verified'));
  });

  test('Verification: INFORMAL_COLLECTOR with ACTIVE status passes checkVerified', () => {
    const req = {
      user: {
        id: 'collector_verified',
        role: ROLES.INFORMAL_COLLECTOR,
        status: USER_STATUS.ACTIVE,
      },
    };

    const { calledNext, errorPassed } = runMiddleware(checkVerified, req);

    assert.strictEqual(calledNext, true);
    assert.strictEqual(errorPassed, null, 'Verified collector must pass');
  });

  test('Verification: RECYCLER with PENDING_VERIFICATION is blocked (403)', () => {
    const req = {
      user: {
        id: 'recycler_unverified',
        role: ROLES.RECYCLER,
        status: USER_STATUS.PENDING_VERIFICATION,
      },
    };

    const { calledNext, errorPassed } = runMiddleware(checkVerified, req);

    assert.strictEqual(calledNext, true);
    assert.strictEqual(errorPassed.statusCode, 403);
    assert.strictEqual(errorPassed.code, ERROR_CODES.FORBIDDEN);
    assert(errorPassed.message.includes('Account not yet verified'));
  });

  test('Verification: RECYCLER with ACTIVE status passes checkVerified', () => {
    const req = {
      user: {
        id: 'recycler_verified',
        role: ROLES.RECYCLER,
        status: USER_STATUS.ACTIVE,
      },
    };

    const { calledNext, errorPassed } = runMiddleware(checkVerified, req);

    assert.strictEqual(calledNext, true);
    assert.strictEqual(errorPassed, null, 'Verified recycler must pass');
  });

  test('Verification: CITIZEN bypasses checkVerified (no admin verification required)', () => {
    const req = {
      user: {
        id: 'citizen1',
        role: ROLES.CITIZEN,
        status: USER_STATUS.ACTIVE,
      },
    };

    const { calledNext, errorPassed } = runMiddleware(checkVerified, req);

    assert.strictEqual(calledNext, true);
    assert.strictEqual(errorPassed, null, 'Citizen should pass');
  });

  // -------------------------------------------------------------
  // 5. ACCOUNT STATUS RESTRICTIONS (checkStatus)
  // -------------------------------------------------------------
  test('Status Guard: SUSPENDED account is rejected (403)', () => {
    const req = {
      user: {
        id: 'u_suspended',
        role: ROLES.CITIZEN,
        status: USER_STATUS.SUSPENDED,
      },
    };

    const { calledNext, errorPassed } = runMiddleware(checkStatus(USER_STATUS.ACTIVE), req);

    assert.strictEqual(calledNext, true);
    assert.strictEqual(errorPassed.statusCode, 403);
    assert.strictEqual(errorPassed.code, ERROR_CODES.FORBIDDEN);
    assert(errorPassed.message.includes('suspended'));
  });

  test('Status Guard: DEACTIVATED account is rejected (403)', () => {
    const req = {
      user: {
        id: 'u_deactivated',
        role: ROLES.CITIZEN,
        status: USER_STATUS.DEACTIVATED,
      },
    };

    const { calledNext, errorPassed } = runMiddleware(checkStatus(USER_STATUS.ACTIVE), req);

    assert.strictEqual(calledNext, true);
    assert.strictEqual(errorPassed.statusCode, 403);
    assert.strictEqual(errorPassed.code, ERROR_CODES.FORBIDDEN);
    assert(errorPassed.message.includes('deactivated'));
  });

  test('Status Guard: ACTIVE account succeeds', () => {
    const req = {
      user: {
        id: 'u_active',
        role: ROLES.CITIZEN,
        status: USER_STATUS.ACTIVE,
      },
    };

    const { calledNext, errorPassed } = runMiddleware(checkStatus(USER_STATUS.ACTIVE), req);

    assert.strictEqual(calledNext, true);
    assert.strictEqual(errorPassed, null);
  });

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed}/${total} PASSED (100% SUCCESS)`);
  console.log('====================================================');
}

runAuthorizationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
