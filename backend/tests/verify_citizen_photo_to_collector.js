// Verification Script for Issue 1: Citizen Uploaded Photo -> Collector Portal
// Canonical Reference: docs/13_SECURITY_PRIVACY.md, docs/05_API_SPECIFICATION.md

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../src/config/database');
const ewasteService = require('../src/services/ewasteService');
const mediaService = require('../src/services/mediaService');
const requestService = require('../src/services/requestService');
const authService = require('../src/services/authService');
const { ROLES, REQUEST_STATUS, ITEM_STATUS } = require('../src/utils/constants');

// Test valid JPEG fixtures (distinct images)
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const IMAGE_A_BUFFER = Buffer.concat([JPEG_HEADER, Buffer.from('CITIZEN_A_EWASTE_PHOTO_PAYLOAD_' + Date.now())]);
const IMAGE_B_BUFFER = Buffer.concat([JPEG_HEADER, Buffer.from('CITIZEN_B_EWASTE_PHOTO_PAYLOAD_' + Date.now())]);

async function runVerification() {
  console.log('====================================================');
  console.log('ISSUE 1: CITIZEN UPLOADED PHOTO -> COLLECTOR PORTAL');
  console.log('====================================================\n');

  let citizenA, citizenB, citizenC, collector1;
  const createdUserIds = [];
  const createdRequestIds = [];
  const createdItemIds = [];

  try {
    // -------------------------------------------------------------
    // SETUP: Create real test accounts in PostgreSQL
    // -------------------------------------------------------------
    console.log('Step 1: Setting up test accounts in Neon PostgreSQL...');
    const emailSuffix = Date.now();

    const regA = await authService.register({
      email: `citizen_a_${emailSuffix}@test.com`,
      password: 'Password123!',
      name: 'Ramesh Sharma',
      role: ROLES.CITIZEN,
      phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
    });
    citizenA = regA.user;
    createdUserIds.push(citizenA.id);

    const regB = await authService.register({
      email: `citizen_b_${emailSuffix}@test.com`,
      password: 'Password123!',
      name: 'Sunita Patel',
      role: ROLES.CITIZEN,
      phone: `98766${Math.floor(10000 + Math.random() * 90000)}`,
    });
    citizenB = regB.user;
    createdUserIds.push(citizenB.id);

    const regC = await authService.register({
      email: `citizen_c_${emailSuffix}@test.com`,
      password: 'Password123!',
      name: 'Unrelated Citizen',
      role: ROLES.CITIZEN,
      phone: `98767${Math.floor(10000 + Math.random() * 90000)}`,
    });
    citizenC = regC.user;
    createdUserIds.push(citizenC.id);

    const regColl = await authService.register({
      email: `collector_${emailSuffix}@test.com`,
      password: 'Password123!',
      name: 'Prakash Kabadiwala',
      role: ROLES.INFORMAL_COLLECTOR,
      phone: `98768${Math.floor(10000 + Math.random() * 90000)}`,
    });
    collector1 = regColl.user;
    createdUserIds.push(collector1.id);

    // Ensure CollectorProfile exists and is available
    await prisma.collectorProfile.upsert({
      where: { userId: collector1.id },
      update: { isAvailable: true, city: 'Bhubaneswar' },
      create: {
        userId: collector1.id,
        isAvailable: true,
        city: 'Bhubaneswar',
        serviceRadiusKm: 50,
      },
    });

    console.log('  ✔ Created Citizen A, Citizen B, Citizen C, and Collector accounts\n');

    // -------------------------------------------------------------
    // TEST 1: Citizen A uploads Photo A & Creates Request A
    // -------------------------------------------------------------
    console.log('Step 2: Citizen A uploads real Image A to media storage...');
    const uploadResA = await mediaService.saveImage({
      filename: 'phone_a.jpg',
      mimetype: 'image/jpeg',
      buffer: IMAGE_A_BUFFER,
    });
    assert(uploadResA.imageUrl, 'Upload must return imageUrl');
    assert(uploadResA.fileKey, 'Upload must return fileKey');
    console.log(`  ✔ Image A stored: ${uploadResA.imageUrl} (fileKey: ${uploadResA.fileKey})`);

    // Verify storage persistence
    const storedMediaA = await mediaService.getMediaData(uploadResA.fileKey);
    assert(storedMediaA && storedMediaA.buffer, 'Image A must exist in persistent storage');
    assert.strictEqual(storedMediaA.buffer.equals(IMAGE_A_BUFFER), true, 'Stored buffer A must match original upload');
    console.log('  ✔ Database & Storage persistence verified for Image A');

    // Create EwasteItem A
    console.log('Step 3: Creating EwasteItem A with uploaded Image A...');
    const itemResA = await ewasteService.createItem(citizenA.id, {
      category: 'MOBILE_PHONE',
      condition: 'WORKING',
      quantity: 1,
      estimatedWeightKg: 0.25,
      imageUrl: uploadResA.imageUrl,
    });
    const itemA = itemResA.item;
    createdItemIds.push(itemA.id);
    assert.strictEqual(itemA.imageUrl, uploadResA.imageUrl);
    console.log(`  ✔ EwasteItem A created: ${itemA.id} with imageUrl = ${itemA.imageUrl}`);

    // Create CollectionRequest A
    console.log('Step 4: Citizen A creates CollectionRequest A (status: SUBMITTED)...');
    const reqA = await requestService.createRequest(citizenA.id, {
      itemIds: [itemA.id],
      pickupAddress: 'Plot 101, Saheed Nagar, Bhubaneswar, Odisha',
      pickupLat: 20.2961,
      pickupLng: 85.8245,
      city: 'Bhubaneswar',
      state: 'Odisha',
      pincode: '751007',
      autoSubmit: true,
    });
    createdRequestIds.push(reqA.id);
    assert.strictEqual(reqA.status, REQUEST_STATUS.SUBMITTED);
    console.log(`  ✔ CollectionRequest A created: ${reqA.id}`);

    // Verify DB link
    const itemDbA = await prisma.ewasteItem.findUnique({ where: { id: itemA.id } });
    assert.strictEqual(itemDbA.collectionRequestId, reqA.id, 'Item A must be linked to Request A in DB');
    assert.strictEqual(itemDbA.citizenId, citizenA.id, 'Item A must belong to Citizen A in DB');
    console.log('  ✔ Database relationship verified: CollectionRequest -> EwasteItem -> Image\n');

    // -------------------------------------------------------------
    // TEST 2: Citizen B uploads Photo B & Creates Request B
    // -------------------------------------------------------------
    console.log('Step 5: Citizen B uploads real Image B & Creates Request B...');
    const uploadResB = await mediaService.saveImage({
      filename: 'laptop_b.jpg',
      mimetype: 'image/jpeg',
      buffer: IMAGE_B_BUFFER,
    });
    assert(uploadResB.imageUrl);

    const itemResB = await ewasteService.createItem(citizenB.id, {
      category: 'LAPTOP',
      condition: 'REPAIRABLE',
      quantity: 1,
      estimatedWeightKg: 2.1,
      imageUrl: uploadResB.imageUrl,
    });
    const itemB = itemResB.item;
    createdItemIds.push(itemB.id);

    const reqB = await requestService.createRequest(citizenB.id, {
      itemIds: [itemB.id],
      pickupAddress: 'Flat 302, Patia, Bhubaneswar, Odisha',
      pickupLat: 20.3541,
      pickupLng: 85.8175,
      city: 'Bhubaneswar',
      state: 'Odisha',
      pincode: '751024',
      autoSubmit: true,
    });
    createdRequestIds.push(reqB.id);
    console.log(`  ✔ Request B created: ${reqB.id} with Image B (${uploadResB.fileKey})\n`);

    // -------------------------------------------------------------
    // TEST 3: Collector available feed discovery
    // -------------------------------------------------------------
    console.log('Step 6: Collector queries available requests feed...');
    const collectorFeed = await requestService.listAvailableRequests(collector1, {
      lat: 20.30,
      lng: 85.82,
      radiusKm: 50,
    });
    assert(collectorFeed && Array.isArray(collectorFeed.requests));
    
    const feedReqA = collectorFeed.requests.find((r) => r.id === reqA.id);
    const feedReqB = collectorFeed.requests.find((r) => r.id === reqB.id);

    assert(feedReqA, 'Collector must see Request A in feed');
    assert(feedReqB, 'Collector must see Request B in feed');

    // Check citizen image is exposed in feed request items
    assert(feedReqA.ewasteItems && feedReqA.ewasteItems.length > 0);
    assert.strictEqual(feedReqA.ewasteItems[0].imageUrl, uploadResA.imageUrl, 'Feed Request A must expose Image A URL');
    assert.strictEqual(feedReqA.citizenName, 'Ramesh Sharma', 'Feed Request A must show citizen name');

    assert(feedReqB.ewasteItems && feedReqB.ewasteItems.length > 0);
    assert.strictEqual(feedReqB.ewasteItems[0].imageUrl, uploadResB.imageUrl, 'Feed Request B must expose Image B URL');
    assert.strictEqual(feedReqB.citizenName, 'Sunita Patel', 'Feed Request B must show citizen name');

    console.log('  ✔ Collector feed exposes correct citizen image URLs and requester names\n');

    // -------------------------------------------------------------
    // TEST 4: Authorized Image Access & Multi-Request Isolation
    // -------------------------------------------------------------
    console.log('Step 7: Collector fetches Image A via authorization endpoint...');
    const imageAccessA = await ewasteService.authorizeItemImageAccess(collector1, uploadResA.fileKey);
    assert(imageAccessA.fileKey, 'Authorization must succeed for available request');
    const mediaA = await mediaService.getMediaData(imageAccessA.fileKey);
    assert.strictEqual(mediaA.buffer.equals(IMAGE_A_BUFFER), true, 'Streamed Image A must match uploaded Image A byte-for-byte');
    console.log('  ✔ Collector successfully fetched and verified authentic Image A bytes');

    console.log('Step 8: Collector fetches Image B via authorization endpoint...');
    const imageAccessB = await ewasteService.authorizeItemImageAccess(collector1, uploadResB.fileKey);
    const mediaB = await mediaService.getMediaData(imageAccessB.fileKey);
    assert.strictEqual(mediaB.buffer.equals(IMAGE_B_BUFFER), true, 'Streamed Image B must match uploaded Image B byte-for-byte');
    assert.strictEqual(mediaA.buffer.equals(mediaB.buffer), false, 'Image A and Image B must be distinct and non-interchangeable');
    console.log('  ✔ Multi-Request verification: Request A -> Image A, Request B -> Image B with zero cross-contamination\n');

    // -------------------------------------------------------------
    // TEST 5: Image Access Security & Privacy Isolation
    // -------------------------------------------------------------
    console.log('Step 9: Verifying strict image authorization & tenancy...');
    
    // Unrelated citizen cannot access Citizen A's image
    let accessBlocked = false;
    try {
      await ewasteService.authorizeItemImageAccess(citizenC, uploadResA.fileKey);
    } catch (err) {
      if (err.statusCode === 403) {
        accessBlocked = true;
      }
    }
    assert.strictEqual(accessBlocked, true, 'Unrelated Citizen C must be forbidden (403) from accessing Citizen A image');
    console.log('  ✔ Unrelated Citizen C is strictly blocked from accessing Citizen A image (403 Forbidden)');

    // Citizen A CAN access own image
    const citizenAccess = await ewasteService.authorizeItemImageAccess(citizenA, uploadResA.fileKey);
    assert(citizenAccess.fileKey, 'Citizen A must be authorized to access own image');
    console.log('  ✔ Citizen A can access own image\n');

    console.log('====================================================');
    console.log('ISSUE 1 VERIFICATION RESULT: ALL CHECKS PASSED (100%)');
    console.log('====================================================\n');

  } finally {
    // Teardown test fixtures
    console.log('[Cleanup] Cleaning up test fixtures...');
    if (createdRequestIds.length > 0) {
      await prisma.collectionRequest.deleteMany({ where: { id: { in: createdRequestIds } } }).catch(() => {});
    }
    if (createdItemIds.length > 0) {
      await prisma.ewasteItem.deleteMany({ where: { id: { in: createdItemIds } } }).catch(() => {});
    }
    if (createdUserIds.length > 0) {
      await prisma.collectorProfile.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
    }
  }
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
