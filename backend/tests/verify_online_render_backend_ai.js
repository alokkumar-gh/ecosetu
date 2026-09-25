// EcoSetu Live Backend -> Render AI Online Integration Test Suite
// Verifies: Node Backend -> Render FastAPI (https://ecosetu-ai.onrender.com) -> YOLO best.pt -> Node Response -> Mobile Schema Contract

const assert = require('assert');
const jwt = require('jsonwebtoken');
process.env.AI_SERVICE_URL = 'https://ecosetu-ai.onrender.com';
const environment = require('../src/config/environment');
environment.aiServiceUrl = 'https://ecosetu-ai.onrender.com';

const app = require('../src/app');
const prisma = require('../src/config/database');
const { ROLES, USER_STATUS } = require('../src/utils/constants');

async function runLiveBackendAiTests() {
  console.log('====================================================');
  console.log('ECOSETU BACKEND → ONLINE RENDER AI INTEGRATION TEST');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✔ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  function createToken(payload) {
    return jwt.sign(payload, environment.jwtAccessSecret, { expiresIn: '15m' });
  }

  const citizen = {
    id: 'a1111111-1111-4111-8111-111111111111',
    email: 'citizen_online_test@ecosetu.org',
    name: 'Citizen Online Tester',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
  };

  const collector = {
    id: 'b1111111-1111-4111-8111-111111111111',
    email: 'collector_online_test@ecosetu.org',
    name: 'Collector Online Tester',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.ACTIVE,
  };

  const recycler = {
    id: 'c1111111-1111-4111-8111-111111111111',
    email: 'recycler_online_test@ecosetu.org',
    name: 'Recycler Online Tester',
    role: ROLES.RECYCLER,
    status: USER_STATUS.ACTIVE,
  };

  const usersDb = new Map([
    [citizen.id, citizen],
    [collector.id, collector],
    [recycler.id, recycler],
  ]);

  // Mock Prisma user lookup
  const origUserFindUnique = prisma.user.findUnique;
  prisma.user.findUnique = async ({ where }) => usersDb.get(where.id) || null;

  const TEST_PORT = 3109;
  const server = app.listen(TEST_PORT);

  function createMultipartPayload(boundary, filename, mimeType, fileBuffer) {
    const head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    );
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
    return Buffer.concat([head, fileBuffer, tail]);
  }

  // Real valid JPEG header/bytes (300x300 pixel synthetic byte array or sample header)
  const validJpegBytes = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00,
    0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c,
    0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12, 0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x0a, 0x00, 0x0a, 0x01, 0x01,
    0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01,
    0x01, 0x00, 0x00, 0x3f, 0x00, 0x7f, 0x00, 0xff, 0xd9
  ]);

  const invalidBytes = Buffer.from('NOT_AN_IMAGE_STRING_BYTES');

  try {
    const citizenToken = createToken({ userId: citizen.id });
    const collectorToken = createToken({ userId: collector.id });
    const recyclerToken = createToken({ userId: recycler.id });

    // Test 1: Unauthenticated request rejected (401)
    await testAsync('Node Backend: Unauthenticated POST /api/v1/ai/predict is rejected with 401', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/predict`, { method: 'POST' });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'UNAUTHORIZED');
    });

    // Test 2: Unauthorized role (RECYCLER) rejected (403)
    await testAsync('Node Backend: Recycler role POST /api/v1/ai/predict is rejected with 403', async () => {
      const boundary = '----Boundary123';
      const body = createMultipartPayload(boundary, 'sample.jpg', 'image/jpeg', validJpegBytes);
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/predict`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${recyclerToken}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    // Test 3: Missing image rejected (400)
    await testAsync('Node Backend: Missing image in body is rejected with 400', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/predict`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${citizenToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // Test 4: Invalid image bytes rejected (400)
    await testAsync('Node Backend: Invalid image magic bytes rejected with 400', async () => {
      const boundary = '----Boundary123';
      const body = createMultipartPayload(boundary, 'corrupt.jpg', 'image/jpeg', invalidBytes);
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/predict`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${citizenToken}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // Test 5: Live Real Integration — CITIZEN role POST /api/v1/ai/predict -> Render AI
    await testAsync('Node Backend → Live Render AI: Citizen role receives valid prediction response (200)', async () => {
      const boundary = '----Boundary123';
      const body = createMultipartPayload(boundary, 'synthetic_test.jpg', 'image/jpeg', validJpegBytes);
      const t0 = Date.now();
      
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/predict`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${citizenToken}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });

      const roundtripMs = Date.now() - t0;
      console.log(`   Node Backend → Render AI Roundtrip Duration: ${roundtripMs} ms (${(roundtripMs / 1000).toFixed(2)}s)`);

      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}`);
      const data = await res.json();
      
      assert.strictEqual(data.success, true);
      assert.ok(data.data && data.data.prediction, 'Response must contain data.prediction object');
      
      const pred = data.data.prediction;
      assert.ok(typeof pred.has_detection === 'boolean', 'has_detection must be boolean');
      assert.ok(typeof pred.category === 'string', 'category must be string');
      assert.ok(typeof pred.confidence === 'number', 'confidence must be number');
      assert.ok(typeof pred.confidence_level === 'string', 'confidence_level must be string');
      assert.ok(typeof pred.review_required === 'boolean', 'review_required must be boolean');
      assert.ok(Array.isArray(pred.detections), 'detections must be array');
      assert.strictEqual(pred.modelVersion, 'material-detection-v0.2.0');
      
      console.log(`   Result: category=${pred.category}, confidence=${pred.confidence}, review_required=${pred.review_required}, modelVersion=${pred.modelVersion}`);
    });

    // Test 6: Live Real Integration — INFORMAL_COLLECTOR role POST /api/v1/ai/predict -> Render AI
    await testAsync('Node Backend → Live Render AI: Informal Collector role receives valid prediction response (200)', async () => {
      const boundary = '----Boundary123';
      const body = createMultipartPayload(boundary, 'collector_test.jpg', 'image/jpeg', validJpegBytes);
      const t0 = Date.now();
      
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/predict`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${collectorToken}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });

      const roundtripMs = Date.now() - t0;
      console.log(`   Node Backend → Render AI Roundtrip Duration: ${roundtripMs} ms (${(roundtripMs / 1000).toFixed(2)}s)`);

      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}`);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data && data.data.prediction);
      assert.strictEqual(data.data.prediction.modelVersion, 'material-detection-v0.2.0');
    });

  } finally {
    prisma.user.findUnique = origUserFindUnique;
    server.close();
  }

  console.log(`\n====================================================`);
  console.log(`LIVE BACKEND → RENDER AI TEST RESULTS: ${passed}/${total} PASSED`);
  console.log(`====================================================\n`);
}

if (require.main === module) {
  runLiveBackendAiTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}

module.exports = runLiveBackendAiTests;
