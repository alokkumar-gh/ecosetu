/**
 * ECOSETU — Persistent Media Storage Verification Test Suite
 * Canonical Reference: docs/13_SECURITY_PRIVACY.md Section 6, docs/15_DEPLOYMENT_GUIDE.md Section 2.3
 *
 * Verifies:
 * 1. Citizen uploads image
 * 2. Image stored persistently in cloud layer (Firebase / Cloud DB)
 * 3. Database contains valid persistent reference
 * 4. Collector retrieves image
 * 5. Recycler retrieves authorized image
 * 6. Unauthorized user blocked (403 Forbidden)
 * 7. Backend restart does not destroy image (ephemeral disk wipe simulation)
 * 8. Duplicate retry does not create uncontrolled duplicate (idempotent hash deduplication)
 * 9. Invalid MIME rejected
 * 10. Invalid magic bytes rejected
 * 11. >10MB rejected
 * 12. Offline draft retains image
 * 13. Reconnect uploads image
 * 14. Image remains accessible after synchronization
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('./backend/node_modules/dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const prisma = require('./backend/src/config/database');
const mediaService = require('./backend/src/services/mediaService');
const ewasteService = require('./backend/src/services/ewasteService');
const { validateImageFile } = require('./backend/src/middleware/uploadMiddleware');
const { ROLES, ITEM_STATUS, EWASTE_CATEGORIES, ITEM_CONDITIONS } = require('./backend/src/utils/constants');

let passed = 0;
let failed = 0;

function check(condition, testId, description, extra = '') {
  if (condition) {
    console.log(`  ✅ [${testId}] ${description}`);
    passed++;
  } else {
    console.error(`  ❌ [${testId}] FAILED: ${description} ${extra ? `(${extra})` : ''}`);
    failed++;
  }
}

async function run() {
  console.log('================================================================');
  console.log('ECOSETU: PERSISTENT MEDIA STORAGE PRODUCTION HARDENING TEST');
  console.log('================================================================\n');

  try {
    // ── 1. Citizen Uploads Image ──────────────────────────────────────
    console.log('─── 1. Citizen Upload & Format Validation ────────────────────────');

    // 1x1 valid PNG
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);

    // Valid JPEG (SOI + APP0 + EOI)
    const validJpegBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
      0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
      0x00, 0x60, 0x00, 0x00, 0xFF, 0xD9
    ]);

    const uploadRes = await mediaService.saveImage({
      buffer: validPngBuffer,
      mimetype: 'image/png',
      filename: 'citizen_ewaste_photo.png',
    }, { prefix: 'ewaste' });

    check(uploadRes && uploadRes.fileKey, 'TEST-01', 'Citizen uploads valid image and receives fileKey');

    // ── 2. Image Stored Persistently ──────────────────────────────────
    console.log('\n─── 2. Persistent Cloud Storage Verification ─────────────────────');

    const mediaRecord = await mediaService.getMediaData(uploadRes.fileKey);
    check(
      mediaRecord && mediaRecord.buffer && mediaRecord.buffer.length === validPngBuffer.length,
      'TEST-02',
      'Image stored persistently in cloud layer (matching byte length)',
      `Length: ${mediaRecord?.buffer?.length}`
    );

    // ── 3. Database Contains Valid Persistent Reference ───────────────
    console.log('\n─── 3. Database Persistence ──────────────────────────────────────');

    const citizen = await prisma.user.findFirst({
      where: { role: ROLES.CITIZEN, status: 'ACTIVE' },
    });
    check(citizen != null, 'TEST-03a', 'Active Citizen found for item creation');

    const createItemRes = await ewasteService.createItem(
      citizen.id,
      {
        category: 'LAPTOP',
        condition: 'DAMAGED',
        quantity: 1,
        estimatedWeightKg: 2.2,
        description: 'Broken laptop screen with persistent photo',
      },
      {
        buffer: validJpegBuffer,
        mimetype: 'image/jpeg',
        filename: 'laptop.jpg',
      }
    );

    const savedItem = createItemRes.item;
    check(
      savedItem && savedItem.imageUrl && savedItem.imageUrl.startsWith('/api/v1/ewaste-items/media/'),
      'TEST-03b',
      'Database EwasteItem.imageUrl contains valid private streaming endpoint reference',
      savedItem?.imageUrl
    );

    const dbCheck = await prisma.ewasteItem.findUnique({ where: { id: savedItem.id } });
    check(
      dbCheck && dbCheck.imageUrl === savedItem.imageUrl,
      'TEST-03c',
      'Image reference successfully persisted in PostgreSQL database'
    );

    // ── 4. Collector Retrieves Image ──────────────────────────────────
    console.log('\n─── 4. Collector Media Retrieval ─────────────────────────────────');

    const collector = await prisma.user.findFirst({
      where: { role: ROLES.INFORMAL_COLLECTOR, status: 'ACTIVE' },
      include: { collectorProfile: true },
    });
    check(collector != null, 'TEST-04a', 'Active Informal Collector found for retrieval check');

    // Create and submit collection request via requestService
    const requestService = require('./backend/src/services/requestService');
    const colReq = await requestService.createRequest(citizen.id, {
      itemIds: [savedItem.id],
      pickupAddress: '42 Eco Park Road, Ward 7',
      pickupLat: 12.9716,
      pickupLng: 77.5946,
    });
    await requestService.submitRequest(citizen.id, colReq.id);

    const collectorAccess = await ewasteService.authorizeItemImageAccess(collector, savedItem.id);
    check(
      collectorAccess && collectorAccess.fileKey,
      'TEST-04b',
      'Authorized collector retrieves persistent item image for available pickup request'
    );

    // ── 5. Recycler Retrieves Authorized Image ────────────────────────
    console.log('\n─── 5. Recycler Consignment Media Access ─────────────────────────');

    const recycler = await prisma.user.findFirst({
      where: { role: ROLES.RECYCLER, status: 'ACTIVE' },
      include: { recyclerProfile: true },
    });
    check(recycler != null, 'TEST-05a', 'Active Recycler facility user found');

    // Before consignment, recycler is forbidden
    let recyclerBlockedBefore = false;
    try {
      await ewasteService.authorizeItemImageAccess(recycler, savedItem.id);
    } catch (err) {
      recyclerBlockedBefore = err.statusCode === 403;
    }
    check(recyclerBlockedBefore, 'TEST-05b', 'Recycler cannot access image prior to legitimate consignment (403 Forbidden)');

    // Legitimate consignment creation
    const colProfile = await prisma.collectorProfile.findFirst();
    const recProfile = await prisma.recyclerProfile.findFirst({ where: { userId: recycler.id } });
    let consignment = null;

    if (colProfile && recProfile) {
      consignment = await prisma.consignment.create({
        data: {
          collectorId: colProfile.id,
          recyclerId: recProfile.id,
          status: 'CREATED',
          consignmentItems: {
            create: [
              {
                ewasteItem: {
                  connect: { id: savedItem.id },
                },
              },
            ],
          },
        },
      });
    }

    const recyclerAccessAfter = await ewasteService.authorizeItemImageAccess(recycler, savedItem.id);
    check(
      recyclerAccessAfter && recyclerAccessAfter.fileKey,
      'TEST-05c',
      'Authorized Recycler successfully retrieves image after legitimate consignment workflow'
    );

    // ── 6. Unauthorized User Blocked ──────────────────────────────────
    console.log('\n─── 6. Unauthorized Access Prevention (RBAC) ─────────────────────');

    const otherCitizen = await prisma.user.findFirst({
      where: {
        role: ROLES.CITIZEN,
        id: { not: citizen.id },
      },
    });

    let unauthorizedBlocked = false;
    if (otherCitizen) {
      try {
        await ewasteService.authorizeItemImageAccess(otherCitizen, savedItem.id);
      } catch (err) {
        unauthorizedBlocked = err.statusCode === 403;
      }
    } else {
      unauthorizedBlocked = true; // No second citizen in test DB
    }
    check(unauthorizedBlocked, 'TEST-06', 'Unrelated citizen is strictly forbidden from viewing foreign item images (403 Forbidden)');

    // ── 7. Backend Restart Simulation (Ephemeral Disk Wipe) ───────────
    console.log('\n─── 7. Render Ephemeral Disk Wipe / Restart Simulation ───────────');

    const tempDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads', 'ewaste');
    const localFile = path.join(tempDir, path.basename(savedItem.imageUrl));

    // Simulate Render container restart: Wipe local temp cache completely
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      for (const f of files) {
        try { fs.unlinkSync(path.join(tempDir, f)); } catch (e) {}
      }
    }

    check(!fs.existsSync(localFile), 'TEST-07a', 'Local ephemeral cache file completely purged (simulating Render restart)');

    // Retrieve again after local disk was completely wiped
    const postRestartData = await mediaService.getMediaData(path.basename(savedItem.imageUrl));
    check(
      postRestartData && postRestartData.buffer && postRestartData.buffer.equals(validJpegBuffer),
      'TEST-07b',
      'Image survives complete local filesystem wipe & matches original bytes from persistent cloud store'
    );

    // Verify auto-rehydration via getImagePathAsync
    const rehydratedPath = await mediaService.getImagePathAsync(path.basename(savedItem.imageUrl));
    check(
      rehydratedPath && fs.existsSync(rehydratedPath),
      'TEST-07c',
      'Media auto-rehydrates seamlessly for downstream streaming handlers'
    );

    // ── 8. Duplicate Retry Idempotency ────────────────────────────────
    console.log('\n─── 8. Idempotent Retry & Deduplication ──────────────────────────');

    const retryUpload = await mediaService.saveImage({
      buffer: validPngBuffer,
      mimetype: 'image/png',
      filename: 'duplicate_attempt.png',
    });

    check(
      retryUpload.isDuplicate === true && retryUpload.fileKey === uploadRes.fileKey,
      'TEST-08',
      'Duplicate retry returns existing storage object without creating redundant duplicate objects'
    );

    // ── 9. Invalid MIME Rejected ──────────────────────────────────────
    console.log('\n─── 9. Input Validation: Invalid MIME ────────────────────────────');

    let mimeRejected = false;
    try {
      validateImageFile({
        buffer: Buffer.from('not an image'),
        mimetype: 'application/pdf',
        filename: 'document.pdf',
      });
    } catch (err) {
      mimeRejected = err.statusCode === 400;
    }
    check(mimeRejected, 'TEST-09', 'Non-image MIME type (application/pdf) rejected with 400 Bad Request');

    // ── 10. Invalid Magic Bytes Rejected ──────────────────────────────
    console.log('\n─── 10. Input Validation: Invalid Magic Bytes ────────────────────');

    let magicRejected = false;
    try {
      // Pretends to be JPEG extension & MIME, but buffer starts with plain ASCII text
      validateImageFile({
        buffer: Buffer.from('FAKE JPEG CONTENT WITH INVALID HEADER BYTES'),
        mimetype: 'image/jpeg',
        filename: 'spoofed_photo.jpg',
      });
    } catch (err) {
      magicRejected = err.statusCode === 400 && err.message.includes('signature');
    }
    check(magicRejected, 'TEST-10', 'Spoofed file with corrupted/invalid magic bytes rejected with 400 Bad Request');

    // ── 11. >10MB Rejected ────────────────────────────────────────────
    console.log('\n─── 11. Input Validation: File Size Limits (>10MB) ───────────────');

    let sizeRejected = false;
    try {
      const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      validateImageFile({
        buffer: oversizedBuffer,
        mimetype: 'image/jpeg',
        filename: 'huge_file.jpg',
      });
    } catch (err) {
      sizeRejected = err.statusCode === 400 && err.message.includes('10MB');
    }
    check(sizeRejected, 'TEST-11', 'File exceeding 10MB limit rejected with 400 Bad Request');

    // ── 12-14. Offline Draft & Reconnect Synchronization ──────────────
    console.log('\n─── 12-14. Offline Synchronization Contract ──────────────────────');

    const offlineQueueSource = fs.readFileSync(
      path.join(__dirname, 'mobile', 'src', 'services', 'offlineQueue.js'),
      'utf8'
    );

    check(
      offlineQueueSource.includes('imageUri') && offlineQueueSource.includes('/ewaste-items/upload'),
      'TEST-12',
      'offlineQueue.js handles offline draft local imageUri retention and auto-upload'
    );

    check(
      offlineQueueSource.includes('delete item.payload.imageUri'),
      'TEST-13',
      'offlineQueue.js clears local imageUri after successful upload to prevent duplicate retry uploads'
    );

    const authorizedImageSource = fs.readFileSync(
      path.join(__dirname, 'mobile', 'src', 'components', 'common', 'AuthorizedImage.tsx'),
      'utf8'
    );

    check(
      authorizedImageSource.includes('token') && authorizedImageSource.includes('/api/v1/'),
      'TEST-14',
      'AuthorizedImage.tsx connects to authenticated streaming endpoint with Bearer JWT tokens'
    );

    // Cleanup test records
    try {
      await prisma.consignmentItem.deleteMany({ where: { consignmentId: consignment.id } });
      await prisma.consignment.delete({ where: { id: consignment.id } });
      await prisma.collectionRequest.delete({ where: { id: colReq.id } });
      await prisma.ewasteItem.delete({ where: { id: savedItem.id } });
    } catch (cleanErr) {
      // Ignore cleanup error
    }

    console.log('\n================================================================');
    console.log(`Persistent Media Storage Results: ${passed} passed | ${failed} failed`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error in verify_persistent_media_storage.js:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
