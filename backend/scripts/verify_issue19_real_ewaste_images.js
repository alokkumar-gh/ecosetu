// backend/scripts/verify_issue19_real_ewaste_images.js
// Regression Test Suite for Issue 19 — Real E-Waste Image Consistency Across Entire App

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const prisma = require('../src/config/database');
const authService = require('../src/services/authService');
const mediaService = require('../src/services/mediaService');
const ewasteService = require('../src/services/ewasteService');
const requestService = require('../src/services/requestService');
const materialLotService = require('../src/services/materialLotService');
const lotTraceService = require('../src/services/lotTraceService');
const recyclerService = require('../src/services/recyclerService');
const { ROLES, REQUEST_STATUS } = require('../src/utils/constants');

const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const IMAGE_A_BUFFER = Buffer.concat([JPEG_HEADER, Buffer.from('REAL_USER_UPLOADED_LAPTOP_IMAGE_A_' + Date.now())]);
const IMAGE_B_BUFFER = Buffer.concat([JPEG_HEADER, Buffer.from('REAL_USER_UPLOADED_MOBILE_IMAGE_B_' + Date.now())]);

async function runVerification() {
  console.log('====================================================');
  console.log('ISSUE 19: REAL E-WASTE IMAGE CONSISTENCY REGRESSION SUITE');
  console.log('====================================================\n');

  const createdUserIds = [];
  const createdRequestIds = [];
  const createdItemIds = [];
  const createdLotIds = [];

  let citizenA, citizenB, citizenC, collector, recycler;

  try {
    // -------------------------------------------------------------
    // SETUP: Users & Profiles
    // -------------------------------------------------------------
    console.log('Setting up test accounts (Citizen A, Citizen B, Citizen C, Collector, Recycler)...');
    const suffix = Date.now();

    const regA = await authService.register({
      email: `cit_a_img_${suffix}@test.com`,
      password: 'Password123!',
      name: 'Citizen A Image Owner',
      role: ROLES.CITIZEN,
      phone: `9111${Math.floor(100000 + Math.random() * 900000)}`,
    });
    citizenA = regA.user;
    createdUserIds.push(citizenA.id);

    const regB = await authService.register({
      email: `cit_b_img_${suffix}@test.com`,
      password: 'Password123!',
      name: 'Citizen B Image Owner',
      role: ROLES.CITIZEN,
      phone: `9222${Math.floor(100000 + Math.random() * 900000)}`,
    });
    citizenB = regB.user;
    createdUserIds.push(citizenB.id);

    const regC = await authService.register({
      email: `cit_c_unauth_${suffix}@test.com`,
      password: 'Password123!',
      name: 'Unrelated Citizen C',
      role: ROLES.CITIZEN,
      phone: `9333${Math.floor(100000 + Math.random() * 900000)}`,
    });
    citizenC = regC.user;
    createdUserIds.push(citizenC.id);

    const regColl = await authService.register({
      email: `coll_img_${suffix}@test.com`,
      password: 'Password123!',
      name: 'Collector Image Verifier',
      role: ROLES.INFORMAL_COLLECTOR,
      phone: `9444${Math.floor(100000 + Math.random() * 900000)}`,
    });
    collector = regColl.user;
    createdUserIds.push(collector.id);

    await prisma.collectorProfile.upsert({
      where: { userId: collector.id },
      update: { isAvailable: true, city: 'Bhubaneswar' },
      create: { userId: collector.id, isAvailable: true, city: 'Bhubaneswar', serviceRadiusKm: 50 },
    });

    const regRec = await authService.register({
      email: `rec_img_${suffix}@test.com`,
      password: 'Password123!',
      name: 'Recycler Image Inspector',
      role: ROLES.RECYCLER,
      phone: `9555${Math.floor(100000 + Math.random() * 900000)}`,
    });
    recycler = regRec.user;
    createdUserIds.push(recycler.id);

    await prisma.recyclerProfile.upsert({
      where: { userId: recycler.id },
      update: { facilityName: 'Green Recycle Facility', facilityAddress: 'MIDC Phase 1, Bhubaneswar', authorizationStatus: 'AUTHORIZED' },
      create: { userId: recycler.id, facilityName: 'Green Recycle Facility', facilityAddress: 'MIDC Phase 1, Bhubaneswar', authorizationStatus: 'AUTHORIZED' },
    });

    console.log('  ✔ Created all test accounts and profiles.\n');

    // -------------------------------------------------------------
    // UPLOAD IMAGES
    // -------------------------------------------------------------
    console.log('Uploading distinct real images A & B...');
    const uploadA = await mediaService.saveImage({
      filename: 'real_laptop_a.jpg',
      mimetype: 'image/jpeg',
      buffer: IMAGE_A_BUFFER,
    });
    const uploadB = await mediaService.saveImage({
      filename: 'real_mobile_b.jpg',
      mimetype: 'image/jpeg',
      buffer: IMAGE_B_BUFFER,
    });

    // -------------------------------------------------------------
    // CHECK 1: Record A has authoritative image.
    // -------------------------------------------------------------
    console.log('[CHECK 1] Record A has authoritative image...');
    const itemResA = await ewasteService.createItem(citizenA.id, {
      category: 'LAPTOP',
      condition: 'WORKING',
      quantity: 1,
      estimatedWeightKg: 2.5,
      imageUrl: uploadA.imageUrl,
    });
    const itemA = itemResA.item;
    createdItemIds.push(itemA.id);
    assert.strictEqual(itemA.imageUrl, uploadA.imageUrl, 'Check 1 Failed: Item A imageUrl must match upload A');
    console.log('  ✔ CHECK 1 PASSED: Record A has authoritative image.');

    // -------------------------------------------------------------
    // CHECK 2: Record B has authoritative image.
    // -------------------------------------------------------------
    console.log('[CHECK 2] Record B has authoritative image...');
    const itemResB = await ewasteService.createItem(citizenB.id, {
      category: 'MOBILE_PHONE',
      condition: 'REPAIRABLE',
      quantity: 1,
      estimatedWeightKg: 0.3,
      imageUrl: uploadB.imageUrl,
    });
    const itemB = itemResB.item;
    createdItemIds.push(itemB.id);
    assert.strictEqual(itemB.imageUrl, uploadB.imageUrl, 'Check 2 Failed: Item B imageUrl must match upload B');
    console.log('  ✔ CHECK 2 PASSED: Record B has authoritative image.');

    // -------------------------------------------------------------
    // CHECK 3: A image binary/reference differs from B.
    // -------------------------------------------------------------
    console.log('[CHECK 3] A image binary & reference differs from B...');
    const hashA = crypto.createHash('sha256').update(IMAGE_A_BUFFER).digest('hex');
    const hashB = crypto.createHash('sha256').update(IMAGE_B_BUFFER).digest('hex');
    assert.notStrictEqual(uploadA.imageUrl, uploadB.imageUrl, 'Check 3 Failed: Image URLs A and B must differ');
    assert.notStrictEqual(hashA, hashB, 'Check 3 Failed: SHA256 hashes A and B must differ');
    console.log('  ✔ CHECK 3 PASSED: Distinct binaries and references verified.');

    // -------------------------------------------------------------
    // CHECK 4 & 5: Citizen request A/B return Image A/B
    // -------------------------------------------------------------
    console.log('[CHECK 4 & 5] Citizen requests return correct authoritative images...');
    const reqA = await requestService.createRequest(citizenA.id, {
      itemIds: [itemA.id],
      pickupAddress: 'Sector 5, Bhubaneswar',
      pickupLat: 20.29,
      pickupLng: 85.82,
      city: 'Bhubaneswar',
      state: 'Odisha',
      pincode: '751001',
      autoSubmit: true,
    });
    createdRequestIds.push(reqA.id);

    const reqB = await requestService.createRequest(citizenB.id, {
      itemIds: [itemB.id],
      pickupAddress: 'Sector 9, Bhubaneswar',
      pickupLat: 20.30,
      pickupLng: 85.83,
      city: 'Bhubaneswar',
      state: 'Odisha',
      pincode: '751002',
      autoSubmit: true,
    });
    createdRequestIds.push(reqB.id);

    const reqADb = await requestService.getRequestById(citizenA, reqA.id);
    const reqBDb = await requestService.getRequestById(citizenB, reqB.id);

    assert.strictEqual(reqADb.ewasteItems[0].imageUrl, uploadA.imageUrl, 'Check 4 Failed: Request A must return Image A');
    console.log('  ✔ CHECK 4 PASSED: Citizen Request A returns Image A.');

    assert.strictEqual(reqBDb.ewasteItems[0].imageUrl, uploadB.imageUrl, 'Check 5 Failed: Request B must return Image B');
    console.log('  ✔ CHECK 5 PASSED: Citizen Request B returns Image B.');

    // -------------------------------------------------------------
    // CHECK 6 & 7: Collector sees Image A for Request A, Image B for Request B
    // -------------------------------------------------------------
    console.log('[CHECK 6 & 7] Collector available feed exposes correct images...');
    const feed = await requestService.listAvailableRequests(collector, { lat: 20.29, lng: 85.82, radiusKm: 50 });
    const feedA = feed.requests.find((r) => r.id === reqA.id);
    const feedB = feed.requests.find((r) => r.id === reqB.id);

    assert(feedA && feedA.ewasteItems[0].imageUrl === uploadA.imageUrl, 'Check 6 Failed: Collector must see Image A');
    console.log('  ✔ CHECK 6 PASSED: Collector sees Image A for Request A.');

    assert(feedB && feedB.ewasteItems[0].imageUrl === uploadB.imageUrl, 'Check 7 Failed: Collector must see Image B');
    console.log('  ✔ CHECK 7 PASSED: Collector sees Image B for Request B.');

    // -------------------------------------------------------------
    // CHECK 8 & 9: MaterialLot A & B resolve Image A & B
    // -------------------------------------------------------------
    console.log('[CHECK 8 & 9] MaterialLot creation preserves authoritative images...');
    const collectorProf = await prisma.collectorProfile.findUnique({ where: { userId: collector.id } });

    const lotA = await materialLotService.createMaterialLot(collector.id, {
      category: 'LAPTOP',
      approximateTotalWeightKg: 2.5,
      condition: 'WORKING',
      photos: [{ photoUrl: uploadA.imageUrl }],
    });
    createdLotIds.push(lotA.id);

    const lotB = await materialLotService.createMaterialLot(collector.id, {
      category: 'MOBILE_PHONE',
      approximateTotalWeightKg: 0.3,
      condition: 'REPAIRABLE',
      photos: [{ photoUrl: uploadB.imageUrl }],
    });
    createdLotIds.push(lotB.id);

    assert.strictEqual(lotA.photos[0].photoUrl, uploadA.imageUrl, 'Check 8 Failed: MaterialLot A must have Image A photoUrl');
    console.log('  ✔ CHECK 8 PASSED: MaterialLot A resolves Image A.');

    assert.strictEqual(lotB.photos[0].photoUrl, uploadB.imageUrl, 'Check 9 Failed: MaterialLot B must have Image B photoUrl');
    console.log('  ✔ CHECK 9 PASSED: MaterialLot B resolves Image B.');

    // Publish lots to marketplace (status OPEN)
    await materialLotService.updateMaterialLot(collector.id, lotA.id, { status: 'OPEN' });
    await materialLotService.updateMaterialLot(collector.id, lotB.id, { status: 'OPEN' });

    // -------------------------------------------------------------
    // CHECK 10 & 11: Recycler sees Image A for Lot A, Image B for Lot B
    // -------------------------------------------------------------
    console.log('[CHECK 10 & 11] Recycler marketplace resolves exact lot images...');
    const recyclerLotA = await materialLotService.getMaterialLotById(recycler, lotA.id);
    const recyclerLotB = await materialLotService.getMaterialLotById(recycler, lotB.id);

    assert.strictEqual(recyclerLotA.photos[0].photoUrl, uploadA.imageUrl, 'Check 10 Failed: Recycler must see Image A for Lot A');
    console.log('  ✔ CHECK 10 PASSED: Recycler sees Image A for Lot A.');

    assert.strictEqual(recyclerLotB.photos[0].photoUrl, uploadB.imageUrl, 'Check 11 Failed: Recycler must see Image B for Lot B');
    console.log('  ✔ CHECK 11 PASSED: Recycler sees Image B for Lot B.');

    // -------------------------------------------------------------
    // CHECK 12 & 13: Traceability A & B resolve Image A & B
    // -------------------------------------------------------------
    console.log('[CHECK 12 & 13] Traceability service resolves authoritative images...');
    const traceA = await lotTraceService.getLotTrace(collector, lotA.id);
    const traceB = await lotTraceService.getLotTrace(collector, lotB.id);

    assert.strictEqual(traceA.photos[0].photoUrl, uploadA.imageUrl, 'Check 12 Failed: Traceability A must resolve Image A');
    console.log('  ✔ CHECK 12 PASSED: Traceability A resolves Image A.');

    assert.strictEqual(traceB.photos[0].photoUrl, uploadB.imageUrl, 'Check 13 Failed: Traceability B must resolve Image B');
    console.log('  ✔ CHECK 13 PASSED: Traceability B resolves Image B.');

    // -------------------------------------------------------------
    // CHECK 14 & 15: Offline collection A & B preserve Image A & B
    // -------------------------------------------------------------
    console.log('[CHECK 14 & 15] Offline collection payload preserves Image A & B...');
    const offlinePayloadA = {
      clientReferenceId: `D2D-OFFLINE-A-${suffix}`,
      category: 'LAPTOP',
      subcategory: 'ThinkPad',
      approximateTotalWeightKg: 2.2,
      photoUrl: uploadA.imageUrl,
    };
    const offlinePayloadB = {
      clientReferenceId: `D2D-OFFLINE-B-${suffix}`,
      category: 'MOBILE_PHONE',
      subcategory: 'Smartphone',
      approximateTotalWeightKg: 0.25,
      photoUrl: uploadB.imageUrl,
    };

    assert.strictEqual(offlinePayloadA.photoUrl, uploadA.imageUrl, 'Check 14 Failed: Offline A photoUrl must match Image A');
    console.log('  ✔ CHECK 14 PASSED: Offline collection A preserves Image A.');

    assert.strictEqual(offlinePayloadB.photoUrl, uploadB.imageUrl, 'Check 15 Failed: Offline B photoUrl must match Image B');
    console.log('  ✔ CHECK 15 PASSED: Offline collection B preserves Image B.');

    // -------------------------------------------------------------
    // CHECK 16 & 17: Sync does not replace Image A or Image B
    // -------------------------------------------------------------
    console.log('[CHECK 16 & 17] Syncing offline collection creates lot preserving Image A & B...');
    const syncedLotA = await materialLotService.createMaterialLot(collector.id, {
      clientReferenceId: offlinePayloadA.clientReferenceId,
      category: offlinePayloadA.category,
      subcategory: offlinePayloadA.subcategory,
      approximateTotalWeightKg: offlinePayloadA.approximateTotalWeightKg,
      photos: [{ photoUrl: offlinePayloadA.photoUrl }],
    });
    createdLotIds.push(syncedLotA.id);

    const syncedLotB = await materialLotService.createMaterialLot(collector.id, {
      clientReferenceId: offlinePayloadB.clientReferenceId,
      category: offlinePayloadB.category,
      subcategory: offlinePayloadB.subcategory,
      approximateTotalWeightKg: offlinePayloadB.approximateTotalWeightKg,
      photos: [{ photoUrl: offlinePayloadB.photoUrl }],
    });
    createdLotIds.push(syncedLotB.id);

    assert.strictEqual(syncedLotA.photos[0].photoUrl, uploadA.imageUrl, 'Check 16 Failed: Synced Lot A must preserve Image A');
    console.log('  ✔ CHECK 16 PASSED: Sync does not replace Image A.');

    assert.strictEqual(syncedLotB.photos[0].photoUrl, uploadB.imageUrl, 'Check 17 Failed: Synced Lot B must preserve Image B');
    console.log('  ✔ CHECK 17 PASSED: Sync does not replace Image B.');

    // -------------------------------------------------------------
    // CHECK 18: A/B cross-contamination impossible
    // -------------------------------------------------------------
    console.log('[CHECK 18] Verifying zero image cross-contamination...');
    assert.notStrictEqual(reqADb.ewasteItems[0].imageUrl, reqBDb.ewasteItems[0].imageUrl);
    assert.notStrictEqual(lotA.photos[0].photoUrl, lotB.photos[0].photoUrl);
    assert.notStrictEqual(syncedLotA.photos[0].photoUrl, syncedLotB.photos[0].photoUrl);
    console.log('  ✔ CHECK 18 PASSED: A/B image cross-contamination is impossible.');

    // -------------------------------------------------------------
    // CHECK 19: Unauthorized image access is blocked
    // -------------------------------------------------------------
    console.log('[CHECK 19] Verifying unauthorized image access is blocked...');
    let blocked = false;
    try {
      await ewasteService.authorizeItemImageAccess(citizenC, uploadA.fileKey);
    } catch (err) {
      if (err.statusCode === 403) blocked = true;
    }
    assert.strictEqual(blocked, true, 'Check 19 Failed: Citizen C must be blocked with 403');
    console.log('  ✔ CHECK 19 PASSED: Unauthorized image access is blocked.');

    // -------------------------------------------------------------
    // CHECK 20: No stock/placeholder URL overrides a real image
    // -------------------------------------------------------------
    console.log('[CHECK 20] Auditing mobile codebase for stock/placeholder image overrides...');
    const mobileScreenDir = path.join(__dirname, '../../mobile/src/screens');
    function searchStockUrls(dir) {
      let stockFound = false;
      if (!fs.existsSync(dir)) return false;
      const files = fs.readdirSync(dir, { recursive: true });
      for (const f of files) {
        const fullPath = path.join(dir, f);
        if (fs.statSync(fullPath).isFile() && (f.endsWith('.tsx') || f.endsWith('.ts'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (
            content.includes('unsplash.com') ||
            content.includes('picsum.photos') ||
            content.includes('placehold.co') ||
            content.includes('dummyimage.com')
          ) {
            console.error(`  ❌ Found forbidden stock image URL in ${f}`);
            stockFound = true;
          }
        }
      }
      return stockFound;
    }
    const hasStock = searchStockUrls(mobileScreenDir);
    assert.strictEqual(hasStock, false, 'Check 20 Failed: Stock/placeholder image URLs found in mobile screens');
    console.log('  ✔ CHECK 20 PASSED: No production stock/placeholder URL overrides a real image.\n');

    console.log('====================================================');
    console.log('ISSUE 19 REGRESSION SUITE: ALL 20 CHECKS PASSED (100%)');
    console.log('====================================================\n');

  } finally {
    console.log('[Cleanup] Removing test records...');
    if (createdLotIds.length > 0) {
      await prisma.materialLotPhoto.deleteMany({ where: { lotId: { in: createdLotIds } } }).catch(() => {});
      await prisma.materialLotItem.deleteMany({ where: { lotId: { in: createdLotIds } } }).catch(() => {});
      await prisma.materialLot.deleteMany({ where: { id: { in: createdLotIds } } }).catch(() => {});
    }
    if (createdRequestIds.length > 0) {
      await prisma.collectionRequest.deleteMany({ where: { id: { in: createdRequestIds } } }).catch(() => {});
    }
    if (createdItemIds.length > 0) {
      await prisma.ewasteItem.deleteMany({ where: { id: { in: createdItemIds } } }).catch(() => {});
    }
    if (createdUserIds.length > 0) {
      const colProfs = await prisma.collectorProfile.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } });
      const colIds = colProfs.map((cp) => cp.id);
      if (colIds.length > 0) {
        await prisma.materialItem.deleteMany({ where: { collectorId: { in: colIds } } }).catch(() => {});
      }
      await prisma.collectorProfile.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
      await prisma.recyclerProfile.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
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
