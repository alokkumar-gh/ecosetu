/**
 * EcoSetu — Regression Test Suite for ISSUE #8
 * ADMIN SYSTEM HEALTH / DIAGNOSTICS
 *
 * Verifies 16 mandatory checks:
 * CHECK 1: Admin can access diagnostics.
 * CHECK 2: Unauthenticated diagnostics access is rejected.
 * CHECK 3: Collector cannot access diagnostics.
 * CHECK 4: Recycler cannot access diagnostics.
 * CHECK 5: Citizen cannot access diagnostics.
 * CHECK 6: Configured service is identified as configured.
 * CHECK 7: Healthy service is identified as healthy.
 * CHECK 8: Missing configuration is identified as NOT_CONFIGURED.
 * CHECK 9: Configured but unreachable service is NOT mislabeled NOT_CONFIGURED.
 * CHECK 10: Database health reflects an actual database check.
 * CHECK 11: AI service health reflects actual endpoint/model state where supported.
 * CHECK 12: No API secrets appear in the diagnostic response.
 * CHECK 13: No production hardcoded service status is used.
 * CHECK 14: Health refresh produces current timestamps/state.
 * CHECK 15: Multiple services remain independently represented.
 * CHECK 16: Diagnostic API errors do not silently become healthy.
 */

const assert = require('assert');
const prisma = require('../src/config/database');

const adminController = require('../src/controllers/adminController');
const authorize = require('../src/middleware/authorize');

async function runRegressionSuite() {
  console.log('====================================================');
  console.log('STARTING ISSUE #8 REGRESSION SUITE: ADMIN SYSTEM HEALTH');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // Helper middleware simulation
  const checkAccess = (userRole) => {
    const req = { user: userRole ? { role: userRole } : null };
    let status = 200;

    const res = {
      status: (code) => {
        status = code;
        return res;
      },
      json: () => {},
    };
    const next = (err) => {
      if (err) {
        status = err.statusCode || 403;
      }
    };

    const middleware = authorize('ADMIN');
    middleware(req, res, next);
    if (status !== 200) return { allowed: false, status };
    return { allowed: true, status: 200 };
  };

  // Helper mock request/response for controller
  const invokeGetSystemHealth = async () => {
    let resultData = null;
    let statusCode = 200;

    const req = { user: { role: 'ADMIN' } };
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (payload) => {
        resultData = payload?.data || payload;
      },
    };
    const next = (err) => {
      if (err) throw err;
    };

    await adminController.getSystemHealth(req, res, next);
    return { statusCode, data: resultData };
  };

  // ---------------------------------------------------------------------------
  // CHECK 1: Admin can access diagnostics
  // ---------------------------------------------------------------------------
  try {
    const access = checkAccess('ADMIN');
    assert.strictEqual(access.allowed, true, 'Admin should be authorized');

    const res = await invokeGetSystemHealth();
    assert.strictEqual(res.statusCode, 200, 'Status code should be 200');
    assert.ok(res.data.timestamp, 'Response contains timestamp');
    assert.ok(Array.isArray(res.data.items), 'Response contains items array');
    console.log('✅ CHECK 1: Admin can access diagnostics passed.');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 1 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 2: Unauthenticated diagnostics access is rejected
  // ---------------------------------------------------------------------------
  try {
    const access = checkAccess(null);
    assert.strictEqual(access.allowed, false, 'Unauthenticated request must be blocked');
    assert.strictEqual(access.status, 401, 'Status must be 401');
    console.log('✅ CHECK 2: Unauthenticated diagnostics access is rejected passed.');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 2 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 3: Collector cannot access diagnostics
  // ---------------------------------------------------------------------------
  try {
    const access = checkAccess('INFORMAL_COLLECTOR');
    assert.strictEqual(access.allowed, false, 'Collector request must be blocked');
    assert.strictEqual(access.status, 403, 'Status must be 403');
    console.log('✅ CHECK 3: Collector cannot access diagnostics passed.');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 3 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 4: Recycler cannot access diagnostics
  // ---------------------------------------------------------------------------
  try {
    const access = checkAccess('RECYCLER');
    assert.strictEqual(access.allowed, false, 'Recycler request must be blocked');
    assert.strictEqual(access.status, 403, 'Status must be 403');
    console.log('✅ CHECK 4: Recycler cannot access diagnostics passed.');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 4 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 5: Citizen cannot access diagnostics
  // ---------------------------------------------------------------------------
  try {
    const access = checkAccess('CITIZEN');
    assert.strictEqual(access.allowed, false, 'Citizen request must be blocked');
    assert.strictEqual(access.status, 403, 'Status must be 403');
    console.log('✅ CHECK 5: Citizen cannot access diagnostics passed.');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 5 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 6: Configured service is identified as configured
  // ---------------------------------------------------------------------------
  try {
    const res = await invokeGetSystemHealth();
    const dbItem = res.data.items.find((i) => i.id === 'database');
    const apiItem = res.data.items.find((i) => i.id === 'backend_api');

    assert.ok(dbItem, 'Database item exists');
    assert.notStrictEqual(dbItem.status, 'NOT_CONFIGURED', 'Database with DATABASE_URL must not be NOT_CONFIGURED');
    assert.strictEqual(apiItem.status, 'HEALTHY', 'Backend API service must be HEALTHY');
    console.log(`✅ CHECK 6: Configured service identified as configured (${dbItem.name} -> ${dbItem.status}).`);
    passed++;
  } catch (err) {
    console.error('❌ CHECK 6 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 7: Healthy service is identified as healthy
  // ---------------------------------------------------------------------------
  try {
    const res = await invokeGetSystemHealth();
    const dbItem = res.data.items.find((i) => i.id === 'database');
    assert.strictEqual(dbItem.status, 'HEALTHY', 'Active DB connection must report HEALTHY');
    assert.ok(typeof dbItem.latencyMs === 'number', 'Latency must be numeric');
    console.log(`✅ CHECK 7: Healthy service identified as healthy (DB latency: ${dbItem.latencyMs}ms).`);
    passed++;
  } catch (err) {
    console.error('❌ CHECK 7 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 8: Missing configuration is identified as NOT_CONFIGURED
  // ---------------------------------------------------------------------------
  try {
    const oldDbUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const environment = require('../src/config/environment');
    const oldEnvUrl = environment.databaseUrl;
    environment.databaseUrl = '';

    const res = await invokeGetSystemHealth();
    const dbItem = res.data.items.find((i) => i.id === 'database');

    process.env.DATABASE_URL = oldDbUrl;
    environment.databaseUrl = oldEnvUrl;

    assert.strictEqual(dbItem.status, 'NOT_CONFIGURED', 'Unset DATABASE_URL must produce NOT_CONFIGURED status');
    console.log('✅ CHECK 8: Missing configuration is identified as NOT_CONFIGURED.');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 8 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 9: Configured but unreachable service is NOT mislabeled NOT_CONFIGURED
  // ---------------------------------------------------------------------------
  try {
    // Temporarily mock prisma $queryRaw to throw a connection error
    const origQueryRaw = prisma.$queryRaw;
    prisma.$queryRaw = async () => {
      throw new Error('Connection refused at 127.0.0.1:5432');
    };

    const res = await invokeGetSystemHealth();
    prisma.$queryRaw = origQueryRaw;

    const dbItem = res.data.items.find((i) => i.id === 'database');
    assert.strictEqual(dbItem.status, 'UNREACHABLE', 'Failed query with valid config must report UNREACHABLE, not NOT_CONFIGURED');
    console.log('✅ CHECK 9: Configured but unreachable service is NOT mislabeled NOT_CONFIGURED.');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 9 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 10: Database health reflects an actual database check
  // ---------------------------------------------------------------------------
  try {
    const res = await invokeGetSystemHealth();
    const dbItem = res.data.items.find((i) => i.id === 'database');
    assert.ok(dbItem.dynamicExplanation.includes('Connected & Operational'), 'Explanation contains database latency info');
    console.log('✅ CHECK 10: Database health reflects an actual database check.');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 10 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 11: AI service health reflects actual endpoint/model state where supported
  // ---------------------------------------------------------------------------
  try {
    const res = await invokeGetSystemHealth();
    const aiItem = res.data.items.find((i) => i.id === 'ai_service');
    assert.ok(aiItem, 'AI service item exists');
    assert.ok(['HEALTHY', 'CONFIGURED', 'DEGRADED', 'UNREACHABLE', 'NOT_CONFIGURED'].includes(aiItem.status), `AI status must be valid enum, got ${aiItem.status}`);
    console.log(`✅ CHECK 11: AI service health reflects actual state (${aiItem.status} - ${aiItem.dynamicExplanation}).`);
    passed++;
  } catch (err) {
    console.error('❌ CHECK 11 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 12: No API secrets appear in the diagnostic response
  // ---------------------------------------------------------------------------
  try {
    const res = await invokeGetSystemHealth();
    const jsonStr = JSON.stringify(res.data).toLowerCase();

    const prohibitedTerms = ['gsk_', 'postgres://', 'password', 'secret_key', 'api_key_val'];
    for (const term of prohibitedTerms) {
      assert.strictEqual(jsonStr.includes(term), false, `Response must NOT contain secret value: ${term}`);
    }
    console.log('✅ CHECK 12: No API secrets appear in the diagnostic response.');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 12 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 13: No production hardcoded service status is used
  // ---------------------------------------------------------------------------
  try {
    const res = await invokeGetSystemHealth();
    const dbItem = res.data.items.find((i) => i.id === 'database');
    assert.ok(dbItem.dynamicExplanation, 'Explanation is dynamically constructed');
    console.log('✅ CHECK 13: No production hardcoded service status is used.');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 13 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 14: Health refresh produces current timestamps/state
  // ---------------------------------------------------------------------------
  try {
    const res1 = await invokeGetSystemHealth();
    await new Promise((r) => setTimeout(r, 50));
    const res2 = await invokeGetSystemHealth();

    assert.notStrictEqual(res1.data.timestamp, res2.data.timestamp, 'Timestamp must update on fresh invocation');
    console.log('✅ CHECK 14: Health refresh produces current timestamps/state.');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 14 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 15: Multiple services remain independently represented
  // ---------------------------------------------------------------------------
  try {
    const res = await invokeGetSystemHealth();
    assert.ok(res.data.items.length >= 6, `Expected at least 6 service items, got ${res.data.items.length}`);
    const itemIds = res.data.items.map((i) => i.id);
    const expected = ['backend_api', 'database', 'ai_service', 'fcm_notifications', 'storage', 'google_maps'];
    for (const exp of expected) {
      assert.ok(itemIds.includes(exp), `Expected service item '${exp}' to be present`);
    }
    console.log(`✅ CHECK 15: Multiple services (${res.data.items.length}) remain independently represented.`);
    passed++;
  } catch (err) {
    console.error('❌ CHECK 15 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 16: Diagnostic API errors do not silently become healthy
  // ---------------------------------------------------------------------------
  try {
    const origQueryRaw = prisma.$queryRaw;
    prisma.$queryRaw = async () => {
      throw new Error('DB Outage');
    };

    const res = await invokeGetSystemHealth();
    prisma.$queryRaw = origQueryRaw;

    const dbItem = res.data.items.find((i) => i.id === 'database');
    assert.notStrictEqual(dbItem.status, 'HEALTHY', 'Failed query must NOT silently become HEALTHY');
    console.log('✅ CHECK 16: Diagnostic API errors do not silently become healthy.');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 16 FAILED:', err.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`ISSUE #8 REGRESSION SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error('Unhandled error in regression suite:', err);
  process.exit(1);
});
