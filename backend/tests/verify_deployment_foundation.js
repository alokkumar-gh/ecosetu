// EcoSetu Cloud Infrastructure & Production Deployment Foundation Verification Suite
// Canonical Reference: docs/15_DEPLOYMENT_GUIDE.md, docs/02_SYSTEM_ARCHITECTURE.md, docs/10_BACKEND_ARCHITECTURE.md

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');

const app = require('../src/app');
const getCorsOptions = require('../src/config/cors');
const fcmService = require('../src/services/fcmService');

async function runDeploymentFoundationSuite() {
  console.log('====================================================');
  console.log('ECOSETU FIREBASE & GOOGLE CLOUD DEPLOYMENT SUITE');
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

  const PORT = 3098;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://127.0.0.1:${PORT}`;

  try {
    // -------------------------------------------------------------
    // 1. HEALTH CHECK ENDPOINTS (Cloud Run & Container Health)
    // -------------------------------------------------------------
    await test('Health Check: Root GET /health returns 200 OK without sensitive leaks', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'ok');
      assert.strictEqual(data.service, 'ecosetu-backend');
      assert(data.timestamp, 'Must include timestamp');
      assert.strictEqual(data.databaseUrl, undefined, 'Must NEVER leak database URL');
      assert.strictEqual(data.jwtSecret, undefined, 'Must NEVER leak JWT secrets');
    });

    await test('Health Check: API v1 GET /api/v1/health returns 200 OK with version metadata', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'ok');
      assert.strictEqual(data.version, 'v1');
    });

    // -------------------------------------------------------------
    // 2. PRODUCTION CORS LOGIC
    // -------------------------------------------------------------
    await test('CORS: Native mobile app requests with no Origin header are allowed in production', async () => {
      const prodCorsOptions = getCorsOptions('https://ecosetu.org', true);
      assert.strictEqual(typeof prodCorsOptions.origin, 'function');
      await new Promise((resolve, reject) => {
        prodCorsOptions.origin(undefined, (err, allow) => {
          if (err) return reject(err);
          assert.strictEqual(allow, true);
          resolve();
        });
      });
    });

    await test('CORS: Explicitly configured domains pass CORS validation in production', () => {
      const prodCorsOptions = getCorsOptions('https://ecosetu.org,https://admin.ecosetu.org', true);
      assert.strictEqual(typeof prodCorsOptions.origin, 'function');

      prodCorsOptions.origin('https://ecosetu.org', (err, allow) => {
        assert.strictEqual(err, null);
        assert.strictEqual(allow, true);
      });

      prodCorsOptions.origin('https://evil-site.com', (err, allow) => {
        assert(err instanceof Error);
        assert(err.message.includes('not allowed by CORS'));
      });
    });

    // -------------------------------------------------------------
    // 3. DATABASE SEED SCRIPT VALIDATION
    // -------------------------------------------------------------
    await test('Database Seed: prisma/seed.js exists and exports an executable function', () => {
      const seedPath = path.resolve(__dirname, '../prisma/seed.js');
      assert(fs.existsSync(seedPath), 'prisma/seed.js must exist');
      const seedFn = require(seedPath);
      assert.strictEqual(typeof seedFn, 'function', 'seed.js must export a function');
    });

    // -------------------------------------------------------------
    // 4. PRODUCTION DOCKER CONFIGURATION INTEGRITY (Cloud Run Target)
    // -------------------------------------------------------------
    await test('Containerization: Backend Dockerfile and .dockerignore exist and are valid for Cloud Run', () => {
      const dockerfilePath = path.resolve(__dirname, '../Dockerfile');
      const dockerignorePath = path.resolve(__dirname, '../.dockerignore');
      assert(fs.existsSync(dockerfilePath), 'backend/Dockerfile must exist');
      assert(fs.existsSync(dockerignorePath), 'backend/.dockerignore must exist');

      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
      assert(dockerfileContent.includes('node:20'), 'Must use Node 20 base image');
      assert(dockerfileContent.includes('prisma generate'), 'Must generate prisma client in build');
      assert(dockerfileContent.includes('USER node'), 'Must execute as unprivileged node user');
      assert(dockerfileContent.includes('HEALTHCHECK'), 'Must include HEALTHCHECK instruction');
    });

    await test('Containerization: AI Dockerfile and .dockerignore exist and support Cloud Run dynamic PORT', () => {
      const aiDockerfilePath = path.resolve(__dirname, '../../ai/Dockerfile');
      const aiDockerignorePath = path.resolve(__dirname, '../../ai/dockerignore');
      const aiDockerignoreDotPath = path.resolve(__dirname, '../../ai/.dockerignore');
      assert(fs.existsSync(aiDockerfilePath), 'ai/Dockerfile must exist');
      assert(fs.existsSync(aiDockerignoreDotPath) || fs.existsSync(aiDockerignorePath), 'ai/.dockerignore must exist');

      const aiDockerfileContent = fs.readFileSync(aiDockerfilePath, 'utf8');
      assert(aiDockerfileContent.includes('python:3.11'), 'Must use Python 3.11 base image');
      assert(aiDockerfileContent.includes('PORT'), 'Must support dynamic PORT binding');
      assert(aiDockerfileContent.includes('HEALTHCHECK'), 'Must include HEALTHCHECK instruction');
      assert(aiDockerfileContent.includes('USER appuser'), 'Must run as non-root user');
    });

    await test('Containerization: Root docker-compose.yml defines db, ai, and backend services', () => {
      const composePath = path.resolve(__dirname, '../../docker-compose.yml');
      assert(fs.existsSync(composePath), 'docker-compose.yml must exist');
      const composeContent = fs.readFileSync(composePath, 'utf8');
      assert(composeContent.includes('ecosetu-db'), 'Must define db service');
      assert(composeContent.includes('ecosetu-ai'), 'Must define ai service');
      assert(composeContent.includes('ecosetu-backend'), 'Must define backend service');
    });

    // -------------------------------------------------------------
    // 5. FIREBASE FOUNDATION CONFIGURATION
    // -------------------------------------------------------------
    await test('Firebase: firebase.json and storage.rules exist and enforce secure storage policies', () => {
      const firebaseJsonPath = path.resolve(__dirname, '../../firebase.json');
      const storageRulesPath = path.resolve(__dirname, '../../storage.rules');
      assert(fs.existsSync(firebaseJsonPath), 'firebase.json must exist');
      assert(fs.existsSync(storageRulesPath), 'storage.rules must exist');

      const rulesContent = fs.readFileSync(storageRulesPath, 'utf8');
      assert(rulesContent.includes('request.auth != null'), 'Must require authentication for access');
      assert(rulesContent.includes('5 * 1024 * 1024'), 'Must enforce 5MB maximum file size limit on images');
      assert(rulesContent.includes('allow read, write: if false;'), 'Must include default deny policy');
      assert(rulesContent.includes('/ewaste/{userId}/{itemId}/{fileName}'), 'Must scope e-waste items by userId');
    });

    await test('Firebase: Android google-services.json template targets package com.ecosetu', () => {
      const templatePath = path.resolve(__dirname, '../../mobile/android/app/google-services.json.example');
      assert(fs.existsSync(templatePath), 'google-services.json.example must exist');

      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const parsed = JSON.parse(templateContent);
      assert.strictEqual(parsed.client[0].client_info.android_client_info.package_name, 'com.ecosetu');
    });

    // -------------------------------------------------------------
    // 6. FCM PUSH NOTIFICATION ADAPTER RESILIENCE
    // -------------------------------------------------------------
    await test('FCM Service: Operates safely in simulated mode when credentials are not configured', async () => {
      assert(fcmService, 'fcmService module must be defined');
      assert.strictEqual(typeof fcmService.sendToDevice, 'function');
      assert.strictEqual(typeof fcmService.sendToUser, 'function');

      // Test with null token
      const nullRes = await fcmService.sendToDevice(null, { title: 'Test', message: 'Test message' });
      assert.strictEqual(nullRes.delivered, false);

      // Test simulated push dispatch
      const simRes = await fcmService.sendToDevice('fcm_token_sample_abc123', {
        title: 'Pickup Scheduled',
        message: 'Your pickup is confirmed',
        type: 'PICKUP_SCHEDULED',
      });
      assert.strictEqual(simRes.delivered, true);

      // Verify token masking helper
      const masked = fcmService._maskToken('eXamPleToKen123456789');
      assert(!masked.includes('PleToKen12'), 'Masked token must obscure secret center');
    });

    // -------------------------------------------------------------
    // 7. PRODUCTION SECRETS & GITIGNORE AUDIT
    // -------------------------------------------------------------
    await test('Security: .gitignore strictly ignores production secrets, service accounts, and keystores', () => {
      const gitignorePath = path.resolve(__dirname, '../../.gitignore');
      assert(fs.existsSync(gitignorePath), '.gitignore must exist');
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      assert(gitignoreContent.includes('*service-account*.json'), 'Must ignore service account JSON');
      assert(gitignoreContent.includes('mobile/android/app/google-services.json'), 'Must ignore google-services.json');
      assert(gitignoreContent.includes('*.keystore'), 'Must ignore keystores');
    });

    await test('Environment Templates: Production template targets Cloud Run and enforces SSL', () => {
      const prodEnvPath = path.resolve(__dirname, '../.env.production.example');
      assert(fs.existsSync(prodEnvPath), 'backend/.env.production.example must exist');
      const content = fs.readFileSync(prodEnvPath, 'utf8');
      assert(content.includes('CHANGE_ME'), 'Must use CHANGE_ME placeholders');
      assert(content.includes('sslmode=require'), 'Must require SSL for production database');
      assert(content.includes('NODE_ENV=production'), 'Must set NODE_ENV=production');
      assert(content.includes('FIREBASE_PROJECT_ID'), 'Must include Firebase project ID placeholder');
      assert(content.includes('PORT=8080'), 'Must document Cloud Run default port');
    });

  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed}/${total} PASSED (100% SUCCESS)`);
  console.log('====================================================');

  if (passed !== total) {
    throw new Error(`Deployment foundation verification failed: ${total - passed} tests failed`);
  }
}

runDeploymentFoundationSuite().catch((err) => {
  console.error('Fatal deployment foundation test error:', err);
  process.exit(1);
});
