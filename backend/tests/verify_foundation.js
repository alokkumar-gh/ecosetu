// EcoSetu Backend Foundation Verification Test
const app = require('../src/app');
const prisma = require('../src/config/database');
const assert = require('assert');

const server = app.listen(3002, async () => {
  try {
    console.log('Testing Backend Foundation...');

    // 1. Test Root Health
    const res1 = await fetch('http://localhost:3002/health');
    assert.strictEqual(res1.status, 200, 'Root health should be 200');
    const data1 = await res1.json();
    assert.strictEqual(data1.status, 'ok', 'Status should be ok');
    assert.strictEqual(data1.service, 'ecosetu-backend');
    console.log('✔ Root /health passed:', data1);

    // 2. Test API v1 Health
    const res2 = await fetch('http://localhost:3002/api/v1/health');
    assert.strictEqual(res2.status, 200, 'API v1 health should be 200');
    const data2 = await res2.json();
    assert.strictEqual(data2.status, 'ok');
    assert.strictEqual(data2.version, 'v1');
    console.log('✔ API v1 /api/v1/health passed:', data2);

    // 3. Test 404 Route Not Found
    const res3 = await fetch('http://localhost:3002/api/v1/nonexistent-route');
    assert.strictEqual(res3.status, 404, 'Unknown route should be 404');
    const data3 = await res3.json();
    assert.strictEqual(data3.success, false);
    assert.strictEqual(data3.error.code, 'NOT_FOUND');
    console.log('✔ 404 notFoundHandler passed:', data3);

    // 4. Test Malformed JSON Error Handling
    const res4 = await fetch('http://localhost:3002/api/v1/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json{',
    });
    assert.strictEqual(res4.status, 400, 'Malformed JSON should be 400');
    const data4 = await res4.json();
    assert.strictEqual(data4.success, false);
    assert.strictEqual(data4.error.code, 'VALIDATION_ERROR');
    console.log('✔ Error handling for malformed JSON passed:', data4);

    // 5. Test Prisma Client Initialization
    assert(prisma !== undefined, 'Prisma client singleton must be defined');
    assert(typeof prisma.$connect === 'function', 'Prisma client should have $connect method');
    console.log('✔ Prisma client initialization verified');

    console.log('All backend foundation tests passed successfully!');
    server.close(() => {
      setTimeout(() => process.exit(0), 50);
    });
  } catch (err) {
    console.error('❌ Test failed:', err);
    server.close(() => {
      setTimeout(() => process.exit(1), 50);
    });
  }
});
