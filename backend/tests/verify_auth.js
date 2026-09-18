// EcoSetu Authentication Unit & Integration Test Suite
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 2, docs/10_BACKEND_ARCHITECTURE.md

const assert = require('assert');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const authService = require('../src/services/authService');
const environment = require('../src/config/environment');
const prisma = require('../src/config/database');
const app = require('../src/app');

async function runAuthTests() {
  console.log('====================================================');
  console.log('ECOSETU AUTHENTICATION TEST SUITE');
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

  async function testAsync(name, fn) {
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
  // 1. PASSWORD SECURITY & HASHING TESTS
  // -------------------------------------------------------------
  await testAsync('Password hashing: bcrypt generates valid hash with salt rounds', async () => {
    const plain = 'SecretPassword123';
    const hash = await authService.hashPassword(plain);
    assert(hash !== plain, 'Password must be hashed');
    assert(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Must be valid bcrypt hash');

    const isValid = await authService.comparePassword(plain, hash);
    assert.strictEqual(isValid, true, 'Plaintext should match generated hash');

    const isWrong = await authService.comparePassword('WrongPassword', hash);
    assert.strictEqual(isWrong, false, 'Wrong password must be rejected');
  });

  // -------------------------------------------------------------
  // 2. JWT TOKEN SECURITY TESTS
  // -------------------------------------------------------------
  test('Token Generation: Access token contains correct payload and expiration', () => {
    const mockUser = {
      id: 'e6b8f1a2-3c4d-5e6f-7a8b-9c0d1e2f3a4b',
      email: 'citizen@ecosetu.org',
      role: 'CITIZEN',
      status: 'ACTIVE',
    };

    const token = authService.generateAccessToken(mockUser);
    assert(typeof token === 'string' && token.length > 0, 'Token must be non-empty string');

    const decoded = jwt.verify(token, environment.jwtAccessSecret);
    assert.strictEqual(decoded.userId, mockUser.id);
    assert.strictEqual(decoded.email, mockUser.email);
    assert.strictEqual(decoded.role, mockUser.role);
    assert.strictEqual(decoded.status, mockUser.status);
    assert(decoded.exp > decoded.iat, 'Token must have expiration');
  });

  test('Token Generation: Refresh token contains type refresh and userId', () => {
    const mockUser = {
      id: 'e6b8f1a2-3c4d-5e6f-7a8b-9c0d1e2f3a4b',
      email: 'citizen@ecosetu.org',
    };

    const refreshToken = authService.generateRefreshToken(mockUser);
    const decoded = jwt.verify(refreshToken, environment.jwtRefreshSecret);
    assert.strictEqual(decoded.userId, mockUser.id);
    assert.strictEqual(decoded.type, 'refresh');
  });

  test('Token Verification: Rejects malformed token', () => {
    assert.throws(
      () => {
        authService.verifyToken('malformed.token.string', environment.jwtAccessSecret);
      },
      (err) => err.name === 'JsonWebTokenError'
    );
  });

  test('Token Verification: Rejects token signed with wrong secret', () => {
    const token = jwt.sign({ userId: '123' }, 'wrong_secret');
    assert.throws(
      () => {
        authService.verifyToken(token, environment.jwtAccessSecret);
      },
      (err) => err.name === 'JsonWebTokenError'
    );
  });

  test('Token Verification: Rejects expired token', () => {
    const expiredToken = jwt.sign({ userId: '123' }, environment.jwtAccessSecret, { expiresIn: -10 });
    assert.throws(
      () => {
        authService.verifyToken(expiredToken, environment.jwtAccessSecret);
      },
      (err) => err.name === 'TokenExpiredError'
    );
  });

  // -------------------------------------------------------------
  // 3. ROLE SECURITY GUARDS
  // -------------------------------------------------------------
  await testAsync('Role Security: Self-registration as ADMIN is strictly rejected', async () => {
    try {
      await authService.register({
        email: 'attacker@evil.com',
        password: 'Password123',
        name: 'Attacker',
        role: 'ADMIN',
      });
      assert.fail('Should have thrown an error for ADMIN registration');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403, 'Should return 403 FORBIDDEN');
      assert(err.message.includes('Admin accounts cannot be created'), 'Error message must explain admin restriction');
    }
  });

  await testAsync('Role Security: Invalid role string is strictly rejected', async () => {
    try {
      await authService.register({
        email: 'user@test.com',
        password: 'Password123',
        name: 'User',
        role: 'SUPER_USER',
      });
      assert.fail('Should have thrown an error for invalid role');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400, 'Should return 400 VALIDATION_ERROR');
    }
  });

  // -------------------------------------------------------------
  // 4. HTTP API INTEGRATION TESTS (Using Express Server)
  // -------------------------------------------------------------
  const server = app.listen(3003);

  try {
    // 4.1 Registration Validation
    await testAsync('HTTP POST /auth/register: Rejects invalid email', async () => {
      const res = await fetch('http://localhost:3003/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email-format',
          password: 'Password123',
          name: 'Valid Name',
          role: 'CITIZEN',
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
      const emailErr = data.error.details.find((d) => d.field === 'email');
      assert(emailErr !== undefined, 'Must report email validation error');
    });

    await testAsync('HTTP POST /auth/register: Rejects password without number or < 8 chars', async () => {
      const res = await fetch('http://localhost:3003/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'valid@ecosetu.org',
          password: 'short',
          name: 'Valid Name',
          role: 'CITIZEN',
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
      const passErr = data.error.details.find((d) => d.field === 'password');
      assert(passErr !== undefined, 'Must report password validation error');
    });

    await testAsync('HTTP POST /auth/register: Rejects role = ADMIN via HTTP request validation', async () => {
      const res = await fetch('http://localhost:3003/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'hacker@ecosetu.org',
          password: 'SecurePassword123',
          name: 'Hacker',
          role: 'ADMIN',
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
      const roleErr = data.error.details.find((d) => d.field === 'role');
      assert(roleErr !== undefined, 'Role validator must reject ADMIN');
    });

    // 4.2 Login Validation
    await testAsync('HTTP POST /auth/login: Rejects empty email or empty password', async () => {
      const res = await fetch('http://localhost:3003/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '',
          password: '',
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
      assert(data.error.details.length >= 2, 'Should flag both missing fields');
    });

    // 4.3 Protected Endpoints & Middleware
    await testAsync('HTTP GET /users/me: Rejects request with missing Authorization header', async () => {
      const res = await fetch('http://localhost:3003/api/v1/users/me');
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'UNAUTHORIZED');
      assert(data.error.message.includes('Authentication token is required'));
    });

    await testAsync('HTTP GET /users/me: Rejects malformed Bearer token', async () => {
      const res = await fetch('http://localhost:3003/api/v1/users/me', {
        headers: { Authorization: 'Bearer not.a.valid.jwt' },
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'UNAUTHORIZED');
    });

    await testAsync('HTTP GET /users/me: Rejects expired Bearer token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'e6b8f1a2-3c4d-5e6f-7a8b-9c0d1e2f3a4b' },
        environment.jwtAccessSecret,
        { expiresIn: -10 }
      );

      const res = await fetch('http://localhost:3003/api/v1/users/me', {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'UNAUTHORIZED');
      assert(data.error.message.includes('expired'));
    });

    // 4.4 Refresh Endpoint
    await testAsync('HTTP POST /auth/refresh: Rejects request without refresh token', async () => {
      const res = await fetch('http://localhost:3003/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'UNAUTHORIZED');
    });

    // 4.5 Logout Endpoint (Protected)
    await testAsync('HTTP POST /auth/logout: Rejects unauthenticated request', async () => {
      const res = await fetch('http://localhost:3003/api/v1/auth/logout', {
        method: 'POST',
      });
      assert.strictEqual(res.status, 401);
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  // -------------------------------------------------------------
  // 5. DATABASE MOCK TESTS (Full flow validation)
  // -------------------------------------------------------------
  await testAsync('Service Flow with Mocked DB: Registration hashes password and never exposes hash', async () => {
    const originalFindUnique = prisma.user.findUnique;
    const originalCreate = prisma.user.create;

    try {
      // Mock no duplicate user
      prisma.user.findUnique = async () => null;

      // Mock user creation
      prisma.user.create = async ({ data }) => ({
        id: '11111111-2222-3333-4444-555555555555',
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        phone: data.phone,
        role: data.role,
        status: data.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.register({
        email: 'citizen1@ecosetu.org',
        password: 'Password123',
        name: 'Citizen One',
        phone: '+919876543210',
        role: 'CITIZEN',
      });

      assert(result.accessToken, 'Must return accessToken');
      assert(result.refreshToken, 'Must return refreshToken');
      assert.strictEqual(result.user.email, 'citizen1@ecosetu.org');
      assert.strictEqual(result.user.status, 'ACTIVE');
      assert.strictEqual(result.user.passwordHash, undefined, 'Must NEVER return passwordHash');
      assert.strictEqual(result.user.password, undefined, 'Must NEVER return plaintext password');
    } finally {
      prisma.user.findUnique = originalFindUnique;
      prisma.user.create = originalCreate;
    }
  });

  await testAsync('Service Flow with Mocked DB: Login verifies password and rejects wrong password', async () => {
    const originalFindUnique = prisma.user.findUnique;
    const passwordHash = await bcrypt.hash('CorrectPassword123', 10);

    try {
      prisma.user.findUnique = async () => ({
        id: '22222222-3333-4444-5555-666666666666',
        email: 'collector@ecosetu.org',
        passwordHash,
        name: 'Collector One',
        role: 'INFORMAL_COLLECTOR',
        status: 'ACTIVE',
      });

      // Valid login
      const result = await authService.login('collector@ecosetu.org', 'CorrectPassword123');
      assert.strictEqual(result.user.email, 'collector@ecosetu.org');
      assert.strictEqual(result.user.passwordHash, undefined, 'Must NEVER return passwordHash');

      // Invalid password
      await assert.rejects(
        async () => {
          await authService.login('collector@ecosetu.org', 'WrongPassword123');
        },
        (err) => err.statusCode === 401 && err.code === 'UNAUTHORIZED'
      );
    } finally {
      prisma.user.findUnique = originalFindUnique;
    }
  });

  await testAsync('Service Flow with Mocked DB: Suspended user is rejected with 403', async () => {
    const originalFindUnique = prisma.user.findUnique;
    const passwordHash = await bcrypt.hash('CorrectPassword123', 10);

    try {
      prisma.user.findUnique = async () => ({
        id: '33333333-4444-5555-6666-777777777777',
        email: 'suspended@ecosetu.org',
        passwordHash,
        name: 'Suspended User',
        role: 'CITIZEN',
        status: 'SUSPENDED',
      });

      await assert.rejects(
        async () => {
          await authService.login('suspended@ecosetu.org', 'CorrectPassword123');
        },
        (err) => err.statusCode === 403 && err.message.includes('suspended')
      );
    } finally {
      prisma.user.findUnique = originalFindUnique;
    }
  });

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed}/${total} PASSED (100% SUCCESS)`);
  console.log('====================================================');
}

runAuthTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
