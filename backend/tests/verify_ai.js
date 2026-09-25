// EcoSetu AI E-Waste Detection & Feedback Test Suite
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 11, docs/11_AI_EWASTE_DETECTION.md, docs/13_SECURITY_PRIVACY.md, docs/24_ERROR_EDGE_CASES.md

const assert = require('assert');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/database');
const environment = require('../src/config/environment');
const {
  ROLES,
  USER_STATUS,
  EWASTE_CATEGORIES,
  ITEM_CONDITIONS,
  ITEM_STATUS,
} = require('../src/utils/constants');

async function runAiModuleTests() {
  console.log('====================================================');
  console.log('ECOSETU AI DETECTION & FEEDBACK TEST SUITE');
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
    }
  }

  function createToken(payload) {
    return jwt.sign(payload, environment.jwtAccessSecret, { expiresIn: '15m' });
  }

  // Test identities
  const citizen1 = {
    id: 'a1111111-1111-4111-8111-111111111111',
    email: 'citizen1@ecosetu.org',
    name: 'Citizen Alice',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
  };

  const citizen2 = {
    id: 'a2222222-2222-4222-8222-222222222222',
    email: 'citizen2@ecosetu.org',
    name: 'Citizen Bob',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
  };

  const collector = {
    id: 'b1111111-1111-4111-8111-111111111111',
    email: 'collector@ecosetu.org',
    name: 'Collector Dave',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.ACTIVE,
  };

  const recycler = {
    id: 'c1111111-1111-4111-8111-111111111111',
    email: 'recycler@ecosetu.org',
    name: 'Recycler EcoTech',
    role: ROLES.RECYCLER,
    status: USER_STATUS.ACTIVE,
  };

  const admin = {
    id: 'd1111111-1111-4111-8111-111111111111',
    email: 'admin@ecosetu.org',
    name: 'Admin System',
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
  };

  const usersDb = new Map([
    [citizen1.id, citizen1],
    [citizen2.id, citizen2],
    [collector.id, collector],
    [recycler.id, recycler],
    [admin.id, admin],
  ]);

  const itemsDb = new Map();
  const predictionsDb = new Map();

  // Prisma Mocks
  const origUserFindUnique = prisma.user.findUnique;
  const origItemFindUnique = prisma.ewasteItem.findUnique;
  const origPredictionFindUnique = prisma.aiPrediction.findUnique;
  const origPredictionCreate = prisma.aiPrediction.create;
  const origPredictionUpdate = prisma.aiPrediction.update;

  prisma.user.findUnique = async ({ where }) => usersDb.get(where.id) || null;
  prisma.ewasteItem.findUnique = async ({ where }) => itemsDb.get(where.id) || null;

  prisma.aiPrediction.findUnique = async ({ where, include }) => {
    const pred = predictionsDb.get(where.id);
    if (!pred) return null;
    if (include && include.ewasteItem) {
      return {
        ...pred,
        ewasteItem: itemsDb.get(pred.ewasteItemId) || null,
      };
    }
    return pred;
  };

  prisma.aiPrediction.create = async ({ data }) => {
    const id = data.id || randomUUID();
    const newPred = {
      id,
      ...data,
      createdAt: new Date(),
    };
    predictionsDb.set(id, newPred);
    return newPred;
  };

  prisma.aiPrediction.update = async ({ where, data }) => {
    const pred = predictionsDb.get(where.id);
    if (!pred) throw new Error('Prediction not found');
    Object.assign(pred, data);
    return pred;
  };

  // Setup test server
  const TEST_PORT = 3105;
  const server = app.listen(TEST_PORT);

  // Helper to construct multipart payload
  function createMultipartPayload(boundary, filename, mimeType, fileBuffer) {
    const head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    );
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
    return Buffer.concat([head, fileBuffer, tail]);
  }

  try {
    const citizen1Token = createToken({ userId: citizen1.id });
    const citizen2Token = createToken({ userId: citizen2.id });
    const collectorToken = createToken({ userId: collector.id });
    const recyclerToken = createToken({ userId: recycler.id });
    const adminToken = createToken({ userId: admin.id });

    // Seed test item and prediction
    const testItemId = randomUUID();
    const item1 = {
      id: testItemId,
      citizenId: citizen1.id,
      category: EWASTE_CATEGORIES.LAPTOP,
      description: 'Test Laptop',
      quantity: 1,
      condition: ITEM_CONDITIONS.WORKING,
      estimatedWeightKg: 2.1,
      status: ITEM_STATUS.SUBMITTED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    itemsDb.set(testItemId, item1);

    const testPredictionId = randomUUID();
    const prediction1 = {
      id: testPredictionId,
      ewasteItemId: testItemId,
      imageUrl: 'https://example.com/uploads/laptop.jpg',
      predictedCategory: EWASTE_CATEGORIES.LAPTOP,
      confidence: 0.92,
      allPredictions: [
        { category: EWASTE_CATEGORIES.LAPTOP, confidence: 0.92 },
        { category: EWASTE_CATEGORIES.TABLET, confidence: 0.05 },
      ],
      modelVersion: 'v1.0',
      wasAccepted: null,
      userCorrectedCategory: null,
      inferenceTimeMs: 180,
      createdAt: new Date(),
    };
    predictionsDb.set(testPredictionId, prediction1);

    // Valid sample buffers
    const validJpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
    const validPngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const invalidTextBytes = Buffer.from('This is not an image');

    // ==========================================
    // 1. POST /api/v1/ai/predict - Authentication & RBAC
    // ==========================================
    await testAsync('POST /api/v1/ai/predict: Unauthenticated request rejected (401)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/predict`, {
        method: 'POST',
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'UNAUTHORIZED');
    });

    await testAsync('POST /api/v1/ai/predict: Recycler role rejected (403)', async () => {
      const boundary = '----TestBoundary123';
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

    await testAsync('POST /api/v1/ai/predict: Admin role rejected per role matrix (403)', async () => {
      const boundary = '----TestBoundary123';
      const body = createMultipartPayload(boundary, 'sample.jpg', 'image/jpeg', validJpegBytes);
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/predict`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    // ==========================================
    // 2. POST /api/v1/ai/predict - Image Validation & Security
    // ==========================================
    await testAsync('POST /api/v1/ai/predict: Missing image rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/predict`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${citizen1Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    await testAsync('POST /api/v1/ai/predict: Unsupported file extension rejected (400)', async () => {
      const boundary = '----TestBoundary123';
      const body = createMultipartPayload(boundary, 'test.txt', 'text/plain', invalidTextBytes);
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/predict`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${citizen1Token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    await testAsync('POST /api/v1/ai/predict: Spoofed MIME type with bad magic bytes rejected (400)', async () => {
      const boundary = '----TestBoundary123';
      const body = createMultipartPayload(boundary, 'malicious.jpg', 'image/jpeg', invalidTextBytes);
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/predict`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${citizen1Token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.error.message.includes('signature') || data.error.message.includes('format'));
    });

    // ==========================================
    // 3. POST /api/v1/ai/predict - Service Unavailable Fallback (503)
    // ==========================================
    await testAsync('POST /api/v1/ai/predict: When AI microservice is offline/missing model, returns 503 fallback', async () => {
      const boundary = '----TestBoundary123';
      const body = createMultipartPayload(boundary, 'laptop.jpg', 'image/jpeg', validJpegBytes);
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/predict`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${citizen1Token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });
      // AI microservice is not running in background or model is missing -> returns 503
      assert.strictEqual(res.status, 503);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'SERVICE_UNAVAILABLE');
      assert.ok(data.error.message.includes('unavailable'));
    });

    // ==========================================
    // 4. POST /api/v1/ai/predict - Successful Mocked Inference & Detection Contract
    // ==========================================
    await testAsync('POST /api/v1/ai/predict: Citizen receives complete detection contract (200)', async () => {
      const originalFetch = global.fetch;
      global.fetch = async (url, options) => {
        if (typeof url === 'string' && (url.startsWith(environment.aiServiceUrl) || url.includes(':8000/predict'))) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              has_detection: true,
              category: EWASTE_CATEGORIES.MOBILE_PHONE,
              confidence: 0.9482,
              confidence_level: 'HIGH',
              review_required: false,
              review_reason: null,
              bbox: { x_min: 0.1, y_min: 0.2, x_max: 0.7, y_max: 0.8 },
              detections: [
                {
                  class_id: 1,
                  category: EWASTE_CATEGORIES.MOBILE_PHONE,
                  confidence: 0.9482,
                  bbox: { x_min: 0.1, y_min: 0.2, x_max: 0.7, y_max: 0.8 },
                },
              ],
              predictions: [{ category: EWASTE_CATEGORIES.MOBILE_PHONE, confidence: 0.9482 }],
              model_version: 'material-detection-v0.2.0',
              inference_time_ms: 120,
            }),
          };
        }
        return originalFetch(url, options);
      };

      try {
        const boundary = '----TestBoundary123';
        const body = createMultipartPayload(boundary, 'phone.png', 'image/png', validPngBytes);
        const res = await originalFetch(`http://localhost:${TEST_PORT}/api/v1/ai/predict`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${citizen1Token}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body,
        });

        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert.ok(data.data.prediction);
        assert.strictEqual(data.data.prediction.has_detection, true);
        assert.strictEqual(data.data.prediction.category, EWASTE_CATEGORIES.MOBILE_PHONE);
        assert.strictEqual(data.data.prediction.confidence, 0.9482);
        assert.strictEqual(data.data.prediction.confidence_level, 'HIGH');
        assert.strictEqual(data.data.prediction.review_required, false);
        assert.strictEqual(data.data.prediction.review_reason, null);
        assert.deepStrictEqual(data.data.prediction.bbox, { x_min: 0.1, y_min: 0.2, x_max: 0.7, y_max: 0.8 });
        assert.strictEqual(data.data.prediction.detections.length, 1);
        assert.strictEqual(data.data.prediction.modelVersion, 'material-detection-v0.2.0');
        assert.strictEqual(data.data.prediction.inferenceTimeMs, 120);
      } finally {
        global.fetch = originalFetch;
      }
    });

    await testAsync('POST /api/v1/ai/predict: Collector role allowed and receives prediction (200)', async () => {
      const originalFetch = global.fetch;
      global.fetch = async (url, options) => {
        if (typeof url === 'string' && (url.startsWith(environment.aiServiceUrl) || url.includes(':8000/predict'))) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              has_detection: true,
              category: EWASTE_CATEGORIES.KEYBOARD_MOUSE,
              confidence: 0.88,
              confidence_level: 'HIGH',
              review_required: false,
              review_reason: null,
              bbox: { x_min: 0.2, y_min: 0.3, x_max: 0.8, y_max: 0.9 },
              detections: [
                {
                  class_id: 0,
                  category: EWASTE_CATEGORIES.KEYBOARD_MOUSE,
                  confidence: 0.88,
                  bbox: { x_min: 0.2, y_min: 0.3, x_max: 0.8, y_max: 0.9 },
                },
              ],
              predictions: [{ category: EWASTE_CATEGORIES.KEYBOARD_MOUSE, confidence: 0.88 }],
              model_version: 'material-detection-v0.2.0',
              inference_time_ms: 110,
            }),
          };
        }
        return originalFetch(url, options);
      };

      try {
        const boundary = '----TestBoundary123';
        const body = createMultipartPayload(boundary, 'keyboard.png', 'image/png', validPngBytes);
        const res = await originalFetch(`http://localhost:${TEST_PORT}/api/v1/ai/predict`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${collectorToken}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body,
        });

        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert.strictEqual(data.data.prediction.category, EWASTE_CATEGORIES.KEYBOARD_MOUSE);
        assert.strictEqual(data.data.prediction.has_detection, true);
      } finally {
        global.fetch = originalFetch;
      }
    });

    await testAsync('POST /api/v1/ai/predict: No-detection response handled safely', async () => {
      const originalFetch = global.fetch;
      global.fetch = async (url, options) => {
        if (typeof url === 'string' && (url.startsWith(environment.aiServiceUrl) || url.includes(':8000/predict'))) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              has_detection: false,
              category: EWASTE_CATEGORIES.OTHER,
              confidence: 0.0,
              confidence_level: 'LOW',
              review_required: true,
              review_reason: 'No objects detected: manual verification required',
              bbox: null,
              detections: [],
              predictions: [],
              model_version: 'material-detection-v0.2.0',
              inference_time_ms: 95,
            }),
          };
        }
        return originalFetch(url, options);
      };

      try {
        const boundary = '----TestBoundary123';
        const body = createMultipartPayload(boundary, 'empty.png', 'image/png', validPngBytes);
        const res = await originalFetch(`http://localhost:${TEST_PORT}/api/v1/ai/predict`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${citizen1Token}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body,
        });

        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert.strictEqual(data.data.prediction.has_detection, false);
        assert.strictEqual(data.data.prediction.category, EWASTE_CATEGORIES.OTHER);
        assert.strictEqual(data.data.prediction.confidence, 0.0);
        assert.strictEqual(data.data.prediction.confidence_level, 'LOW');
        assert.strictEqual(data.data.prediction.review_required, true);
        assert.strictEqual(data.data.prediction.detections.length, 0);
      } finally {
        global.fetch = originalFetch;
      }
    });

    // ==========================================
    // 5. POST /api/v1/ai/feedback - Validation & Authorization
    // ==========================================
    await testAsync('POST /api/v1/ai/feedback: Unauthenticated rejected (401)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictionId: testPredictionId, wasAccepted: true }),
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'UNAUTHORIZED');
    });

    await testAsync('POST /api/v1/ai/feedback: Collector role rejected (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${collectorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ predictionId: testPredictionId, wasAccepted: true }),
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    await testAsync('POST /api/v1/ai/feedback: Missing predictionId rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${citizen1Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wasAccepted: true }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await testAsync('POST /api/v1/ai/feedback: Invalid predictionId UUID rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${citizen1Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ predictionId: 'not-a-uuid', wasAccepted: true }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await testAsync('POST /api/v1/ai/feedback: Missing wasAccepted rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${citizen1Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ predictionId: testPredictionId }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await testAsync('POST /api/v1/ai/feedback: wasAccepted=false without correctedCategory rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${citizen1Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ predictionId: testPredictionId, wasAccepted: false }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await testAsync('POST /api/v1/ai/feedback: wasAccepted=false with invalid correctedCategory rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${citizen1Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          predictionId: testPredictionId,
          wasAccepted: false,
          correctedCategory: 'TOASTER_OVEN',
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await testAsync('POST /api/v1/ai/feedback: Non-existent prediction returns 404', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${citizen1Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ predictionId: randomUUID(), wasAccepted: true }),
      });
      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'NOT_FOUND');
    });

    await testAsync("POST /api/v1/ai/feedback: Citizen cannot submit feedback on another citizen's item (403)", async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${citizen2Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ predictionId: testPredictionId, wasAccepted: true }),
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    await testAsync('POST /api/v1/ai/feedback: Valid acceptance feedback recorded successfully (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${citizen1Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ predictionId: testPredictionId, wasAccepted: true }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.message, 'Feedback recorded successfully');

      const saved = predictionsDb.get(testPredictionId);
      assert.strictEqual(saved.wasAccepted, true);
      assert.strictEqual(saved.userCorrectedCategory, null);
    });

    await testAsync('POST /api/v1/ai/feedback: Valid correction feedback recorded successfully (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ai/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${citizen1Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          predictionId: testPredictionId,
          wasAccepted: false,
          correctedCategory: EWASTE_CATEGORIES.TABLET,
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);

      const saved = predictionsDb.get(testPredictionId);
      assert.strictEqual(saved.wasAccepted, false);
      assert.strictEqual(saved.userCorrectedCategory, EWASTE_CATEGORIES.TABLET);
    });

  } finally {
    // Restore prisma functions and close server
    prisma.user.findUnique = origUserFindUnique;
    prisma.ewasteItem.findUnique = origItemFindUnique;
    prisma.aiPrediction.findUnique = origPredictionFindUnique;
    prisma.aiPrediction.create = origPredictionCreate;
    prisma.aiPrediction.update = origPredictionUpdate;

    server.close();
  }

  console.log(`\nAI Test Results: ${passed}/${total} passed`);
  if (passed !== total) {
    process.exit(1);
  }
}

if (require.main === module) {
  runAiModuleTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}

module.exports = runAiModuleTests;
