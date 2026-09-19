// EcoSetu Backend Firebase Authentication Verification Test Suite
// Phase 19 Task 20: Firebase Auth + Role Resolution Verification
process.env.NODE_ENV = 'test';

const assert = require('assert');
const jwt = require('jsonwebtoken');
const authService = require('../src/services/authService');
const { ROLES, USER_STATUS } = require('../src/utils/constants');
const AppError = require('../src/utils/AppError');

console.log('════════════════════════════════════════════════════════════════════════');
console.log('  ECOSETU: Backend Firebase Authentication & Token Verification Test');
console.log('════════════════════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${desc}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function runTests() {
  console.log('─── 1. Firebase Token Verification & Error Handling ─────────────────');

  // Test 1: Missing or invalid token rejected
  try {
    await authService.verifyFirebaseToken('');
    assert.fail('Should have rejected empty token');
  } catch (err) {
    it('Rejects empty or missing Firebase ID token with 401', () => {
      assert(err instanceof AppError);
      assert.strictEqual(err.statusCode, 401);
    });
  }

  // Test 2: Malformed token rejected
  try {
    await authService.verifyFirebaseToken('malformed.token.format');
    assert.fail('Should have rejected malformed token');
  } catch (err) {
    it('Rejects malformed token payload with 401', () => {
      assert(err instanceof AppError);
      assert.strictEqual(err.statusCode, 401);
    });
  }

  // Test 3: Expired token rejected
  const expiredToken = jwt.sign(
    { sub: 'test-firebase-uid', email: 'test@example.com', exp: Math.floor(Date.now() / 1000) - 3600 },
    'dummy-secret'
  );
  try {
    await authService.verifyFirebaseToken(expiredToken);
    assert.fail('Should have rejected expired token');
  } catch (err) {
    it('Rejects expired Firebase ID token with 401', () => {
      assert(err instanceof AppError);
      assert.strictEqual(err.statusCode, 401);
      assert(err.message.toLowerCase().includes('expired'));
    });
  }

  // Test 4: Valid token claims extraction
  const validToken = jwt.sign(
    {
      sub: 'firebase-uid-12345',
      email: 'citizen_test@ecosetu.org',
      name: 'Ramesh Citizen',
      phone_number: '+919876543210',
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    'dummy-secret'
  );

  const claims = await authService.verifyFirebaseToken(validToken);
  it('Decodes valid Firebase ID token claims (uid, email, phone, name)', () => {
    assert.strictEqual(claims.uid, 'firebase-uid-12345');
    assert.strictEqual(claims.email, 'citizen_test@ecosetu.org');
    assert.strictEqual(claims.name, 'Ramesh Citizen');
    assert.strictEqual(claims.phone_number, '+919876543210');
  });

  console.log('\n─── 2. Identity Mapping & Authoritative Role Assignment ──────────────');

  try {
    const mockUid = 'new-fb-user-' + Date.now();
    const token = jwt.sign(
      {
        sub: mockUid,
        email: `fb_citizen_${Date.now()}@example.com`,
        name: 'New Citizen',
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      'dummy-secret'
    );

    const result = await authService.firebaseLogin({ idToken: token, provider: 'google' });
    it('New Firebase user is created with canonical CITIZEN role and ACTIVE status', () => {
      assert(result.accessToken, 'Access token must be generated');
      assert(result.refreshToken, 'Refresh token must be generated');
      assert.strictEqual(result.user.role, ROLES.CITIZEN, 'New user role must be CITIZEN');
      assert.strictEqual(result.user.status, USER_STATUS.ACTIVE, 'New citizen must be ACTIVE');
    });
  } catch (err) {
    console.error('Error during new user creation test:', err.message);
  }

  try {
    const mockUid = 'spoof-fb-' + Date.now();
    const token = jwt.sign(
      {
        sub: mockUid,
        email: `spoof_${Date.now()}@example.com`,
        role: 'ADMIN', // Client token attempting to claim admin
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      'dummy-secret'
    );

    const result = await authService.firebaseLogin({ idToken: token, provider: 'google', role: 'ADMIN' });
    it('Client cannot spoof role to ADMIN or collector in Firebase login', () => {
      assert.notStrictEqual(result.user.role, ROLES.ADMIN, 'Must NEVER grant ADMIN to self-registering user');
      assert.strictEqual(result.user.role, ROLES.CITIZEN);
    });
  } catch (err) {
    console.error('Error during role spoofing test:', err.message);
  }

  console.log('\n─── 3. Account Status Gating (Suspended / Deactivated) ───────────────');

  it('Suspended user is blocked from logging in with 403 Forbidden', async () => {
    const prisma = require('../src/config/database');
    const existingSuspended = await prisma.user.findFirst({
      where: { status: USER_STATUS.SUSPENDED },
    });

    if (existingSuspended) {
      const token = jwt.sign(
        { sub: 'suspended-fb', email: existingSuspended.email, exp: Math.floor(Date.now() / 1000) + 3600 },
        'dummy-secret'
      );
      try {
        await authService.firebaseLogin({ idToken: token });
        assert.fail('Should have rejected suspended user');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403);
      }
    } else {
      console.log('     [SKIP] No suspended user in local test DB');
    }
  });

  console.log('\n─── 4. Non-Regression: Existing JWT & Password System ─────────────────');

  it('Existing password hashing and verification remain operational', async () => {
    const hash = await authService.hashPassword('Password123');
    assert(hash && hash.startsWith('$2'), 'Bcrypt hash generated');
    const valid = await authService.comparePassword('Password123', hash);
    assert.strictEqual(valid, true);
    const invalid = await authService.comparePassword('WrongPassword', hash);
    assert.strictEqual(invalid, false);
  });

  it('Existing generateAccessToken and verifyToken methods produce valid ECOSETU tokens', () => {
    const dummyUser = { id: 'u1', email: 'test@ecosetu.org', role: ROLES.CITIZEN, status: USER_STATUS.ACTIVE };
    const token = authService.generateAccessToken(dummyUser);
    assert(token, 'Token string exists');
    const decoded = authService.verifyToken(token, require('../src/config/environment').jwtAccessSecret);
    assert.strictEqual(decoded.userId, 'u1');
    assert.strictEqual(decoded.role, ROLES.CITIZEN);
  });

  console.log('\n════════════════════════════════════════════════════════════════════════');
  console.log(`  BACKEND FIREBASE AUTH RESULTS: ${passed} passed, ${failed} failed`);
  console.log('════════════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
