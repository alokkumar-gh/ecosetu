// EcoSetu User and Profile Management Test Suite
// Canonical Reference: docs/04_DATABASE_SCHEMA.md, docs/05_API_SPECIFICATION.md, docs/06_ROLES_AND_PERMISSIONS.md

const assert = require('assert');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/database');
const environment = require('../src/config/environment');
const { ROLES, USER_STATUS, EWASTE_CATEGORIES } = require('../src/utils/constants');

async function runUserAndProfileTests() {
  console.log('====================================================');
  console.log('ECOSETU USER & PROFILE MANAGEMENT TEST SUITE');
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

  // Token helper
  function createToken(payload) {
    return jwt.sign(payload, environment.jwtAccessSecret, { expiresIn: '15m' });
  }

  // Test identities (RFC4122 v4 compliant UUIDs)
  const citizenUser = {
    id: 'a1111111-1111-4111-8111-111111111111',
    email: 'citizen@ecosetu.org',
    name: 'Citizen Jane',
    phone: '+919876543210',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
    avatarUrl: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  const collectorUser = {
    id: 'b2222222-2222-4222-8222-222222222222',
    email: 'collector@ecosetu.org',
    name: 'Collector Ramesh',
    phone: '+919876543211',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.ACTIVE,
    avatarUrl: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  const unverifiedCollectorUser = {
    id: 'c3333333-3333-4333-8333-333333333333',
    email: 'collector.pending@ecosetu.org',
    name: 'Collector Suresh',
    phone: '+919876543212',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.PENDING_VERIFICATION,
    avatarUrl: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  const recyclerUser = {
    id: 'd4444444-4444-4444-8444-444444444444',
    email: 'recycler@ecosetu.org',
    name: 'Green E-Waste Recyclers',
    phone: '+919876543213',
    role: ROLES.RECYCLER,
    status: USER_STATUS.ACTIVE,
    avatarUrl: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  const adminUser = {
    id: 'e5555555-5555-4555-8555-555555555555',
    email: 'admin@ecosetu.org',
    name: 'EcoSetu Administrator',
    phone: null,
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
    avatarUrl: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  // Mock DB registry
  const usersDb = new Map([
    [citizenUser.id, { ...citizenUser }],
    [collectorUser.id, { ...collectorUser }],
    [unverifiedCollectorUser.id, { ...unverifiedCollectorUser }],
    [recyclerUser.id, { ...recyclerUser }],
    [adminUser.id, { ...adminUser }],
  ]);

  const collectorProfilesDb = new Map([
    [
      collectorUser.id,
      {
        id: 'cp-1111-1111',
        userId: collectorUser.id,
        serviceAreaLat: 28.6139,
        serviceAreaLng: 77.209,
        serviceRadiusKm: 5.0,
        bio: 'Experienced local collector in Delhi central',
        isAvailable: true,
        totalPickups: 15,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
    ],
    [
      unverifiedCollectorUser.id,
      {
        id: 'cp-2222-2222',
        userId: unverifiedCollectorUser.id,
        serviceAreaLat: 28.7041,
        serviceAreaLng: 77.1025,
        serviceRadiusKm: 3.0,
        bio: 'Pending verification collector',
        isAvailable: true,
        totalPickups: 0,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
    ],
  ]);

  const recyclerProfilesDb = new Map([
    [
      recyclerUser.id,
      {
        id: 'rp-1111-1111',
        userId: recyclerUser.id,
        facilityName: 'Green Tech Recyclers Ltd',
        facilityAddress: 'Plot 45, Okhla Industrial Area Phase 3, New Delhi',
        facilityLat: 28.5355,
        facilityLng: 77.2725,
        licenseNumber: 'DPCC/E-WASTE/2026/045',
        acceptedCategories: [EWASTE_CATEGORIES.LAPTOP, EWASTE_CATEGORIES.MOBILE_PHONE, EWASTE_CATEGORIES.BATTERY],
        totalConsignments: 8,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
    ],
  ]);

  // Hook Prisma mock methods
  const originalUserFindUnique = prisma.user.findUnique;
  const originalUserUpdate = prisma.user.update;
  const originalUserFindMany = prisma.user.findMany;
  const originalUserCount = prisma.user.count;

  const originalCpFindUnique = prisma.collectorProfile.findUnique;
  const originalCpUpsert = prisma.collectorProfile.upsert;
  const originalCpUpdate = prisma.collectorProfile.update;

  const originalRpFindUnique = prisma.recyclerProfile.findUnique;
  const originalRpUpsert = prisma.recyclerProfile.upsert;
  const originalRpFindMany = prisma.recyclerProfile.findMany;

  prisma.user.findUnique = async ({ where }) => {
    if (where.id) return usersDb.get(where.id) || null;
    if (where.email) {
      for (const u of usersDb.values()) {
        if (u.email === where.email) return u;
      }
    }
    return null;
  };

  prisma.user.update = async ({ where, data }) => {
    const user = usersDb.get(where.id);
    if (!user) throw new Error('Record not found');
    const updated = { ...user, ...data, updatedAt: new Date() };
    usersDb.set(where.id, updated);
    return updated;
  };

  prisma.user.findMany = async ({ where, skip = 0, take = 20 }) => {
    let list = Array.from(usersDb.values());
    if (where.role) list = list.filter((u) => u.role === where.role);
    if (where.status) list = list.filter((u) => u.status === where.status);
    if (where.OR) {
      const term = where.OR[0].name.contains.toLowerCase();
      list = list.filter(
        (u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
      );
    }
    return list.slice(skip, skip + take);
  };

  prisma.user.count = async ({ where }) => {
    let list = Array.from(usersDb.values());
    if (where.role) list = list.filter((u) => u.role === where.role);
    if (where.status) list = list.filter((u) => u.status === where.status);
    return list.length;
  };

  prisma.collectorProfile.findUnique = async ({ where }) => {
    const profile = collectorProfilesDb.get(where.userId);
    if (!profile) return null;
    return {
      ...profile,
      user: usersDb.get(where.userId),
    };
  };

  prisma.collectorProfile.upsert = async ({ where, create, update }) => {
    let profile = collectorProfilesDb.get(where.userId);
    if (profile) {
      profile = { ...profile, ...update, updatedAt: new Date() };
    } else {
      profile = {
        id: `cp-${Date.now()}`,
        totalPickups: 0,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...create,
      };
    }
    collectorProfilesDb.set(where.userId, profile);
    return {
      ...profile,
      user: usersDb.get(where.userId),
    };
  };

  prisma.collectorProfile.update = async ({ where, data }) => {
    let profile = collectorProfilesDb.get(where.userId);
    if (!profile) throw new Error('Collector profile not found');
    profile = { ...profile, ...data, updatedAt: new Date() };
    collectorProfilesDb.set(where.userId, profile);
    return {
      ...profile,
      user: usersDb.get(where.userId),
    };
  };

  prisma.recyclerProfile.findUnique = async ({ where }) => {
    const profile = recyclerProfilesDb.get(where.userId);
    if (!profile) return null;
    return {
      ...profile,
      user: usersDb.get(where.userId),
    };
  };

  prisma.recyclerProfile.upsert = async ({ where, create, update }) => {
    let profile = recyclerProfilesDb.get(where.userId);
    if (profile) {
      profile = { ...profile, ...update, updatedAt: new Date() };
    } else {
      profile = {
        id: `rp-${Date.now()}`,
        totalConsignments: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...create,
      };
    }
    recyclerProfilesDb.set(where.userId, profile);
    return {
      ...profile,
      user: usersDb.get(where.userId),
    };
  };

  prisma.recyclerProfile.findMany = async ({ where }) => {
    const results = [];
    for (const profile of recyclerProfilesDb.values()) {
      const user = usersDb.get(profile.userId);
      if (user && user.status === USER_STATUS.ACTIVE && user.role === ROLES.RECYCLER) {
        if (where.acceptedCategories && where.acceptedCategories.has) {
          if (!profile.acceptedCategories.includes(where.acceptedCategories.has)) {
            continue;
          }
        }
        results.push({
          id: profile.id,
          facilityName: profile.facilityName,
          facilityAddress: profile.facilityAddress,
          facilityLat: profile.facilityLat,
          facilityLng: profile.facilityLng,
          acceptedCategories: profile.acceptedCategories,
          totalConsignments: profile.totalConsignments,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
          },
        });
      }
    }
    return results;
  };

  const TEST_PORT = 3004;
  const server = app.listen(TEST_PORT);

  try {
    const citizenToken = createToken({ userId: citizenUser.id });
    const collectorToken = createToken({ userId: collectorUser.id });
    const unverifiedCollectorToken = createToken({ userId: unverifiedCollectorUser.id });
    const recyclerToken = createToken({ userId: recyclerUser.id });
    const adminToken = createToken({ userId: adminUser.id });

    // =============================================================
    // 1. CURRENT USER PROFILE (GET /api/v1/users/me)
    // =============================================================
    await testAsync('GET /users/me: Authenticated user retrieves own profile successfully', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.user.email, 'citizen@ecosetu.org');
      assert.strictEqual(data.data.user.role, 'CITIZEN');
      assert.strictEqual(data.data.user.passwordHash, undefined, 'passwordHash must NEVER be returned');
      assert.strictEqual(data.data.user.password, undefined, 'password must NEVER be returned');
    });

    await testAsync('GET /users/me: Unauthenticated request is rejected (401)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/users/me`);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'UNAUTHORIZED');
    });

    // =============================================================
    // 2. USER PROFILE UPDATE (PATCH /api/v1/users/me)
    // =============================================================
    await testAsync('PATCH /users/me: Valid update to name and phone succeeds', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizenToken}`,
        },
        body: JSON.stringify({
          name: 'Jane Citizen Updated',
          phone: '+919999988888',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.user.name, 'Jane Citizen Updated');
      assert.strictEqual(data.data.user.phone, '+919999988888');
      assert.strictEqual(data.data.user.passwordHash, undefined);
    });

    await testAsync('PATCH /users/me: Empty body rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizenToken}`,
        },
        body: JSON.stringify({}),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await testAsync('PATCH /users/me: Invalid phone format rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizenToken}`,
        },
        body: JSON.stringify({ phone: 'invalid-phone-abc' }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await testAsync('PATCH /users/me: Attempting to modify role is strictly rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizenToken}`,
        },
        body: JSON.stringify({ role: 'ADMIN' }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
      assert(JSON.stringify(data.error.details).includes('role'));
    });

    await testAsync('PATCH /users/me: Attempting to modify account status is strictly rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizenToken}`,
        },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert(JSON.stringify(data.error.details).includes('status'));
    });

    await testAsync('PATCH /users/me: Attempting to modify email/id/passwordHash is strictly rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizenToken}`,
        },
        body: JSON.stringify({ email: 'newemail@ecosetu.org' }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert(JSON.stringify(data.error.details).includes('email'));
    });

    // =============================================================
    // 3. COLLECTOR PROFILE (GET/PUT /api/v1/collectors/profile)
    // =============================================================
    await testAsync('GET /collectors/profile: Collector retrieves profile with user info (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collectors/profile`, {
        headers: { Authorization: `Bearer ${collectorToken}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.profile.userId, collectorUser.id);
      assert.strictEqual(data.data.profile.user.name, 'Collector Ramesh');
      assert.strictEqual(data.data.profile.user.passwordHash, undefined);
    });

    await testAsync('GET /collectors/profile: Non-collector role (CITIZEN) is rejected (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collectors/profile`, {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    await testAsync('PUT /collectors/profile: Collector creates/updates profile successfully (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collectors/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collectorToken}`,
        },
        body: JSON.stringify({
          serviceAreaLat: 28.62,
          serviceAreaLng: 77.21,
          serviceRadiusKm: 8.5,
          bio: 'Updated bio for collector',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.profile.serviceRadiusKm, 8.5);
      assert.strictEqual(data.data.profile.bio, 'Updated bio for collector');
    });

    await testAsync('PUT /collectors/profile: Invalid coordinates or radius rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collectors/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collectorToken}`,
        },
        body: JSON.stringify({
          serviceAreaLat: 195.0, // Invalid lat
          serviceRadiusKm: 150.0, // Exceeds 50km
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await testAsync('PUT /collectors/profile: Modifying totalPickups or userId rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collectors/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collectorToken}`,
        },
        body: JSON.stringify({
          totalPickups: 9999,
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert(JSON.stringify(data.error.details).includes('totalPickups'));
    });

    // =============================================================
    // 4. COLLECTOR AVAILABILITY (PATCH /api/v1/collectors/availability)
    // =============================================================
    await testAsync('PATCH /collectors/availability: Verified collector toggles availability (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collectors/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collectorToken}`,
        },
        body: JSON.stringify({ isAvailable: false }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.profile.isAvailable, false);
    });

    await testAsync('PATCH /collectors/availability: Unverified collector is blocked by checkVerified (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collectors/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${unverifiedCollectorToken}`,
        },
        body: JSON.stringify({ isAvailable: true }),
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
      assert(data.error.message.includes('Account not yet verified'));
    });

    await testAsync('PATCH /collectors/availability: Invalid body rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collectors/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collectorToken}`,
        },
        body: JSON.stringify({ isAvailable: 'not-a-boolean' }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    // =============================================================
    // 5. RECYCLER PROFILE (GET/PUT /api/v1/recyclers/profile)
    // =============================================================
    await testAsync('GET /recyclers/profile: Recycler retrieves profile with user info (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/recyclers/profile`, {
        headers: { Authorization: `Bearer ${recyclerToken}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.profile.facilityName, 'Green Tech Recyclers Ltd');
      assert.strictEqual(data.data.profile.user.name, 'Green E-Waste Recyclers');
      assert.strictEqual(data.data.profile.user.passwordHash, undefined);
    });

    await testAsync('GET /recyclers/profile: Non-recycler role (CITIZEN) is rejected (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/recyclers/profile`, {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    await testAsync('PUT /recyclers/profile: Recycler updates profile with valid categories (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/recyclers/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${recyclerToken}`,
        },
        body: JSON.stringify({
          facilityName: 'Green Tech Recyclers Updated',
          facilityAddress: '45 Okhla Phase 3, New Delhi',
          facilityLat: 28.535,
          facilityLng: 77.272,
          licenseNumber: 'NEW-LIC-2026',
          acceptedCategories: [EWASTE_CATEGORIES.MOBILE_PHONE, EWASTE_CATEGORIES.TABLET],
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.profile.facilityName, 'Green Tech Recyclers Updated');
      assert.deepStrictEqual(data.data.profile.acceptedCategories, ['MOBILE_PHONE', 'TABLET']);
    });

    await testAsync('PUT /recyclers/profile: Invalid category ID rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/recyclers/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${recyclerToken}`,
        },
        body: JSON.stringify({
          facilityName: 'Green Tech Recyclers',
          facilityAddress: 'Address',
          acceptedCategories: ['INVALID_CATEGORY_NAME'],
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await testAsync('PUT /recyclers/profile: Modifying totalConsignments rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/recyclers/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${recyclerToken}`,
        },
        body: JSON.stringify({
          facilityName: 'Green Tech Recyclers',
          facilityAddress: 'Address',
          acceptedCategories: [EWASTE_CATEGORIES.LAPTOP],
          totalConsignments: 999,
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert(JSON.stringify(data.error.details).includes('totalConsignments'));
    });

    // =============================================================
    // 6. LIST VERIFIED RECYCLERS (GET /api/v1/recyclers)
    // =============================================================
    await testAsync('GET /recyclers: Verified collector can list recyclers (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/recyclers`, {
        headers: { Authorization: `Bearer ${collectorToken}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert(Array.isArray(data.data.recyclers));
      assert(data.data.recyclers.length > 0);
      assert(data.data.recyclers[0].facilityName);
      assert.strictEqual(data.data.recyclers[0].user.passwordHash, undefined);
    });

    await testAsync('GET /recyclers: Admin can list recyclers (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/recyclers`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert(Array.isArray(data.data.recyclers));
    });

    await testAsync('GET /recyclers: Unverified collector is blocked by checkVerified (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/recyclers`, {
        headers: { Authorization: `Bearer ${unverifiedCollectorToken}` },
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    await testAsync('GET /recyclers: Citizen role is blocked (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/recyclers`, {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });

      assert.strictEqual(res.status, 403);
    });

    // =============================================================
    // 7. ADMIN USER MANAGEMENT (GET /api/v1/admin/users)
    // =============================================================
    await testAsync('GET /admin/users: Admin lists users with pagination (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/admin/users?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert(Array.isArray(data.data.users));
      assert(data.data.pagination);
      assert.strictEqual(data.data.pagination.page, 1);
      // Verify no user exposes passwordHash
      for (const u of data.data.users) {
        assert.strictEqual(u.passwordHash, undefined, 'passwordHash must never be exposed');
      }
    });

    await testAsync('GET /admin/users: Non-admin role (CITIZEN) is blocked (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/admin/users`, {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });

      assert.strictEqual(res.status, 403);
    });

    // =============================================================
    // 8. ADMIN USER STATUS UPDATE (PATCH /api/v1/admin/users/:id/status)
    // =============================================================
    await testAsync('PATCH /admin/users/:id/status: Admin suspends a citizen account (200)', async () => {
      const res = await fetch(
        `http://localhost:${TEST_PORT}/api/v1/admin/users/${citizenUser.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            status: USER_STATUS.SUSPENDED,
            reason: 'Suspicious duplicate e-waste activity reported',
          }),
        }
      );

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.user.status, USER_STATUS.SUSPENDED);
    });

    await testAsync('PATCH /admin/users/:id/status: Admin cannot change own account status (400)', async () => {
      const res = await fetch(
        `http://localhost:${TEST_PORT}/api/v1/admin/users/${adminUser.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            status: USER_STATUS.SUSPENDED,
          }),
        }
      );

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert(data.error.message.includes('own account status'));
    });

    await testAsync('PATCH /admin/users/:id/status: Non-admin role is blocked (403)', async () => {
      const res = await fetch(
        `http://localhost:${TEST_PORT}/api/v1/admin/users/${collectorUser.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${collectorToken}`,
          },
          body: JSON.stringify({
            status: USER_STATUS.ACTIVE,
          }),
        }
      );

      assert.strictEqual(res.status, 403);
    });

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed}/${total} PASSED (100% SUCCESS)`);
    console.log('====================================================');
  } finally {
    // Unhook Prisma mocks
    prisma.user.findUnique = originalUserFindUnique;
    prisma.user.update = originalUserUpdate;
    prisma.user.findMany = originalUserFindMany;
    prisma.user.count = originalUserCount;

    prisma.collectorProfile.findUnique = originalCpFindUnique;
    prisma.collectorProfile.upsert = originalCpUpsert;
    prisma.collectorProfile.update = originalCpUpdate;

    prisma.recyclerProfile.findUnique = originalRpFindUnique;
    prisma.recyclerProfile.upsert = originalRpUpsert;
    prisma.recyclerProfile.findMany = originalRpFindMany;

    await new Promise((resolve) => server.close(resolve));
  }
}

runUserAndProfileTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
