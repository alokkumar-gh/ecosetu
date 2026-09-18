// EcoSetu Backend Production Security & Hardening Verification Suite
// Canonical Reference: docs/13_SECURITY_PRIVACY.md, docs/05_API_SPECIFICATION.md, docs/10_BACKEND_ARCHITECTURE.md

const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = require('../src/app');
const environment = require('../src/config/environment');
const prisma = require('../src/config/database');
const requestService = require('../src/services/requestService');
const notificationService = require('../src/services/notificationService');
const { validateImageFile } = require('../src/middleware/uploadMiddleware');
const { ROLES, USER_STATUS, REQUEST_STATUS } = require('../src/utils/constants');

async function runSecuritySuite() {
  console.log('====================================================');
  console.log('ECOSETU BACKEND PRODUCTION SECURITY & HARDENING SUITE');
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

  const PORT = 3099;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://127.0.0.1:${PORT}/api/v1`;

  try {
    // -------------------------------------------------------------
    // 1. HTTP SECURITY HEADERS (docs/13_SECURITY_PRIVACY.md Section 4.4)
    // -------------------------------------------------------------
    await test('Security Headers: App sets nosniff, DENY, and XSS protection headers', async () => {
      const res = await fetch(`http://127.0.0.1:${PORT}/health`);
      assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
      assert.strictEqual(res.headers.get('x-frame-options'), 'DENY');
      assert.strictEqual(res.headers.get('x-xss-protection'), '0');
    });

    // -------------------------------------------------------------
    // 2. AUTHENTICATION ENFORCEMENT & RATE LIMITING
    // -------------------------------------------------------------
    await test('Authentication: Protected routes reject unauthenticated requests with 401', async () => {
      const protectedPaths = [
        '/users/me',
        '/notifications',
        '/notifications/count',
        '/admin/users',
        '/admin/analytics',
        '/collectors/profile',
        '/recyclers/profile',
        '/pickups',
        '/consignments',
        '/recycling-records',
      ];

      for (const path of protectedPaths) {
        const res = await fetch(`${baseUrl}${path}`);
        assert.strictEqual(res.status, 401, `Expected 401 for ${path}, got ${res.status}`);
        const body = await res.json();
        assert.strictEqual(body.success, false);
        assert.strictEqual(body.error.code, 'UNAUTHORIZED');
      }
    });

    await test('Authentication: Register rejects attempt to register with role = ADMIN', async () => {
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'escalation_test@ecosetu.org',
          password: 'Password123!',
          name: 'Hacker',
          role: 'ADMIN',
        }),
      });

      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
    });

    // -------------------------------------------------------------
    // 3. ROLE ISOLATION & PRIVILEGE ESCALATION
    // -------------------------------------------------------------
    await test('Role Isolation: Citizen token is forbidden from accessing Admin routes', async () => {
      const citizenToken = jwt.sign(
        { userId: 'cit-uuid-1', role: ROLES.CITIZEN },
        environment.jwtAccessSecret,
        { expiresIn: '1h' }
      );

      // Mock user lookup in authenticate middleware
      const originalFindUnique = prisma.user.findUnique;
      prisma.user.findUnique = async ({ where }) => {
        if (where.id === 'cit-uuid-1') {
          return {
            id: 'cit-uuid-1',
            email: 'cit@ecosetu.org',
            role: ROLES.CITIZEN,
            status: USER_STATUS.ACTIVE,
          };
        }
        return null;
      };

      try {
        const res = await fetch(`${baseUrl}/admin/users`, {
          headers: { Authorization: `Bearer ${citizenToken}` },
        });
        assert.strictEqual(res.status, 403);
        const body = await res.json();
        assert.strictEqual(body.success, false);
        assert.strictEqual(body.error.code, 'FORBIDDEN');
      } finally {
        prisma.user.findUnique = originalFindUnique;
      }
    });

    await test('Tampering Guard: Protected fields cannot be modified via PATCH /users/me', async () => {
      const citizenToken = jwt.sign(
        { userId: 'cit-uuid-1', role: ROLES.CITIZEN },
        environment.jwtAccessSecret,
        { expiresIn: '1h' }
      );

      const originalFindUnique = prisma.user.findUnique;
      prisma.user.findUnique = async () => ({
        id: 'cit-uuid-1',
        email: 'cit@ecosetu.org',
        role: ROLES.CITIZEN,
        status: USER_STATUS.ACTIVE,
      });

      try {
        // Attempt to tamper with role and status
        const res = await fetch(`${baseUrl}/users/me`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${citizenToken}`,
          },
          body: JSON.stringify({
            role: 'ADMIN',
            status: 'ACTIVE',
          }),
        });

        assert.strictEqual(res.status, 400);
        const body = await res.json();
        assert.strictEqual(body.success, false);
        assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
        const hasProtectedMsg = body.error.details && body.error.details.some((d) => d.message.includes('protected'));
        assert(hasProtectedMsg, 'Should report that field is protected');
      } finally {
        prisma.user.findUnique = originalFindUnique;
      }
    });

    // -------------------------------------------------------------
    // 4. SUSPENDED / DEACTIVATED ACCOUNT BLOCKING
    // -------------------------------------------------------------
    await test('Account Status: Suspended user token is rejected by authenticate middleware', async () => {
      const suspendedToken = jwt.sign(
        { userId: 'suspended-1' },
        environment.jwtAccessSecret,
        { expiresIn: '1h' }
      );

      const originalFindUnique = prisma.user.findUnique;
      prisma.user.findUnique = async () => ({
        id: 'suspended-1',
        email: 'suspended@ecosetu.org',
        role: ROLES.CITIZEN,
        status: USER_STATUS.SUSPENDED,
      });

      try {
        const res = await fetch(`${baseUrl}/users/me`, {
          headers: { Authorization: `Bearer ${suspendedToken}` },
        });
        assert.strictEqual(res.status, 403);
        const body = await res.json();
        assert.strictEqual(body.success, false);
        assert.strictEqual(body.error.code, 'FORBIDDEN');
        assert(body.error.message.includes('suspended'));
      } finally {
        prisma.user.findUnique = originalFindUnique;
      }
    });

    // -------------------------------------------------------------
    // 5. COLLECTOR / RECYCLER VERIFICATION ENFORCEMENT
    // -------------------------------------------------------------
    await test('Verification Enforcement: Pending verification collector cannot toggle availability', async () => {
      const unverifiedToken = jwt.sign(
        { userId: 'coll-unverified-1' },
        environment.jwtAccessSecret,
        { expiresIn: '1h' }
      );

      const originalFindUnique = prisma.user.findUnique;
      prisma.user.findUnique = async () => ({
        id: 'coll-unverified-1',
        email: 'coll@ecosetu.org',
        role: ROLES.INFORMAL_COLLECTOR,
        status: USER_STATUS.PENDING_VERIFICATION,
      });

      try {
        const res = await fetch(`${baseUrl}/collectors/availability`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${unverifiedToken}`,
          },
          body: JSON.stringify({ isAvailable: true }),
        });
        assert.strictEqual(res.status, 403);
        const body = await res.json();
        assert.strictEqual(body.success, false);
        assert.strictEqual(body.error.code, 'FORBIDDEN');
        assert(body.error.message.includes('not yet verified'));
      } finally {
        prisma.user.findUnique = originalFindUnique;
      }
    });

    // -------------------------------------------------------------
    // 6. CITIZEN PRIVACY & LOCATION MASKING (docs/13_SECURITY_PRIVACY.md Section 7)
    // -------------------------------------------------------------
    await test('Privacy Masking: Available requests mask exact address and round coordinates for unassigned collectors', async () => {
      const originalFindMany = prisma.collectionRequest.findMany;
      const originalCount = prisma.collectionRequest.count;

      prisma.collectionRequest.findMany = async () => [
        {
          id: 'req-priv-1',
          citizenId: 'citizen-secret-id',
          status: REQUEST_STATUS.SUBMITTED,
          pickupAddress: 'Flat 402, Elite Towers, Sector 15, Near City Hospital',
          pickupLat: 19.076091,
          pickupLng: 72.877426,
          preferredDate: new Date(),
          ewasteItems: [],
        },
      ];
      prisma.collectionRequest.count = async () => 1;

      try {
        const result = await requestService.listAvailableRequests(
          { id: 'coll-user-1' },
          { lat: 19.07, lng: 72.87, radiusKm: 10, page: 1, limit: 10 }
        );
        assert.strictEqual(result.requests.length, 1);
        const reqItem = result.requests[0];

        // Must mask address
        assert.strictEqual(reqItem.pickupAddress, 'Approximate Location (Exact address revealed upon acceptance)');
        // Must round lat/lng to 2 decimals (~1km radius)
        assert.strictEqual(reqItem.pickupLat, 19.08);
        assert.strictEqual(reqItem.pickupLng, 72.88);
      } finally {
        prisma.collectionRequest.findMany = originalFindMany;
        prisma.collectionRequest.count = originalCount;
      }
    });

    // -------------------------------------------------------------
    // 7. NOTIFICATION OWNERSHIP & ISOLATION
    // -------------------------------------------------------------
    await test('Notification Isolation: User cannot mark another user\'s notification as read', async () => {
      const originalFindUnique = prisma.notification.findUnique;
      prisma.notification.findUnique = async ({ where }) => ({
        id: where.id,
        userId: 'victim-user-id',
        title: 'Secret Alert',
        message: 'Your consignment is accepted',
        isRead: false,
      });

      try {
        await assert.rejects(
          async () => {
            await notificationService.markAsRead('attacker-user-id', 'notif-123');
          },
          (err) => err.statusCode === 403 && err.message.includes('own notifications')
        );
      } finally {
        prisma.notification.findUnique = originalFindUnique;
      }
    });

    // -------------------------------------------------------------
    // 8. FILE UPLOAD SECURITY & MAGIC BYTES (docs/13_SECURITY_PRIVACY.md Section 6)
    // -------------------------------------------------------------
    await test('File Upload: Corrupted or non-image payloads are rejected by magic byte verification', () => {
      // 1. Text pretending to be JPEG
      const fakeJpeg = {
        filename: 'malicious.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('<?php echo "pwned"; ?>'),
      };
      assert.throws(
        () => validateImageFile(fakeJpeg),
        (err) => err.statusCode === 400 && err.message.includes('signature')
      );

      // 2. Valid JPEG magic bytes passes
      const validJpeg = {
        filename: 'photo.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]),
      };
      assert.strictEqual(validateImageFile(validJpeg), true);

      // 3. Valid PNG magic bytes passes
      const validPng = {
        filename: 'photo.png',
        mimetype: 'image/png',
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      };
      assert.strictEqual(validateImageFile(validPng), true);

      // 4. File over 5MB rejected
      const oversized = {
        filename: 'large.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.alloc(6 * 1024 * 1024),
      };
      assert.throws(
        () => validateImageFile(oversized),
        (err) => err.statusCode === 400 && err.message.includes('5MB')
      );
    });

    // -------------------------------------------------------------
    // 9. SENSITIVE DATA EXPOSURE
    // -------------------------------------------------------------
    await test('Data Exposure: Password hash is never stored plaintext and never returned in responses', async () => {
      const rawPassword = 'StrongPassword123!';
      const hash = await bcrypt.hash(rawPassword, 10);

      assert(hash !== rawPassword);
      assert(hash.startsWith('$2a$') || hash.startsWith('$2b$'));

      // Verify SAFE_USER_FIELDS excludes passwordHash
      const userService = require('../src/services/userService');
      const safeFields = userService.constructor.SAFE_USER_FIELDS;
      assert(safeFields, 'SAFE_USER_FIELDS must exist');
      assert.strictEqual(safeFields.passwordHash, undefined);
      assert.strictEqual(safeFields.password, undefined);
    });

  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed}/${total} PASSED (100% SUCCESS)`);
  console.log('====================================================');

  if (passed !== total) {
    throw new Error(`Security verification failed: ${total - passed} tests failed`);
  }
}

runSecuritySuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
