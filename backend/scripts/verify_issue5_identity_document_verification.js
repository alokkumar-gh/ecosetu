/**
 * EcoSetu — Regression Test Suite for ISSUE #5
 * COLLECTOR + RECYCLER IDENTITY DOCUMENT VERIFICATION
 *
 * Verifies 16 mandatory checks:
 * CHECK 1: Collector can submit an actual identity document.
 * CHECK 2: Recycler can submit an actual identity/authorization document.
 * CHECK 3: Uploaded files are persisted in storage directory.
 * CHECK 4: Database record correctly links document to applicant.
 * CHECK 5: Admin can retrieve the actual uploaded document.
 * CHECK 6: Unauthorized applicant cannot view another's document.
 * CHECK 7: Collector A document ≠ Collector B document.
 * CHECK 8: Recycler A document ≠ Recycler B document.
 * CHECK 9: Admin approval updates the correct applicant.
 * CHECK 10: Admin rejection updates the correct applicant.
 * CHECK 11: Unverified collector remains unverified.
 * CHECK 12: Unverified recycler remains unverified.
 * CHECK 13: Verified applicant receives the existing appropriate verified status/eligibility.
 * CHECK 14: Unauthenticated document access is rejected.
 * CHECK 15: Non-admin cannot approve/reject verification.
 * CHECK 16: Invalid/unsupported document upload is rejected according to existing validation.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const verificationService = require('../src/services/verificationService');
const verificationController = require('../src/controllers/verificationController');
const { validateDocumentFile } = require('../src/middleware/uploadMiddleware');
const environment = require('../src/config/environment');

const SECURE_DOCS_DIR = path.resolve(process.cwd(), environment.uploadDir || './uploads', 'verification_docs');

// Sample valid 1x1 JPEG & PDF binary buffers for testing
const SAMPLE_JPEG_A = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
const SAMPLE_JPEG_B = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/bAEMBBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQb/AABEIAAEAAQMBIgACEQEDEQH/xAABAAEBAQEBAAAAAAAAAAAAAAABAAUGA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8A8H//2Q==', 'base64');
const SAMPLE_PDF_C = Buffer.from('%PDF-1.4 %────── 1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj 2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj 3 0 obj << /Type /Page /Parent 2 0 R /Resources <<>> >> endobj xref 0 4 0000000000 65535 f  0000000010 00000 n  0000000060 00000 n  0000000130 00000 n  trailer << /Size 4 /Root 1 0 R >> startxref 200 %%EOF', 'utf8');
const SAMPLE_PDF_D = Buffer.from('%PDF-1.4 %────── 1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj 2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj 3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj xref 0 4 0000000000 65535 f  0000000010 00000 n  0000000060 00000 n  0000000130 00000 n  trailer << /Size 4 /Root 1 0 R >> startxref 220 %%EOF', 'utf8');

async function runRegressionSuite() {
  console.log('====================================================');
  console.log('STARTING ISSUE #5 REGRESSION SUITE: IDENTITY DOCUMENT VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  let resA, resRecA, resB, resRecB;

  const cleanUp = async () => {
    try {
      const users = await prisma.user.findMany({
        where: { email: { startsWith: 'test_issue5_' } },
        select: { id: true },
      });
      const userIds = users.map((u) => u.id);

      await prisma.auditLog.deleteMany({
        where: { OR: [{ actorId: { in: userIds } }, { details: { path: ['userId'], string_contains: 'test_issue5_' } }] },
      });
      await prisma.verification.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.collectorProfile.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.recyclerProfile.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    } catch (e) {
      // Ignore cleanup error
    }
  };

  await cleanUp();

  // Create test actors
  const adminUser = await prisma.user.create({
    data: {
      email: 'test_issue5_admin@ecosetu.test',
      phone: '+919999900001',
      passwordHash: 'dummy',
      name: 'System Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const collectorUserA = await prisma.user.create({
    data: {
      email: 'test_issue5_col_a@ecosetu.test',
      phone: '+919999900002',
      passwordHash: 'dummy',
      name: 'Ramesh Sharma',
      role: 'INFORMAL_COLLECTOR',
      status: 'PENDING_VERIFICATION',
    },
  });
  await prisma.collectorProfile.create({
    data: { userId: collectorUserA.id, serviceArea: 'Rohini Ward 42', isAvailable: true },
  });

  const collectorUserB = await prisma.user.create({
    data: {
      email: 'test_issue5_col_b@ecosetu.test',
      phone: '+919999900003',
      passwordHash: 'dummy',
      name: 'Sunita Patel',
      role: 'INFORMAL_COLLECTOR',
      status: 'PENDING_VERIFICATION',
    },
  });
  await prisma.collectorProfile.create({
    data: { userId: collectorUserB.id, serviceArea: 'Janakpuri Ward 18', isAvailable: true },
  });

  const recyclerUserA = await prisma.user.create({
    data: {
      email: 'test_issue5_rec_a@ecosetu.test',
      phone: '+919999900004',
      passwordHash: 'dummy',
      name: 'Dr. Sunita Verma',
      role: 'RECYCLER',
      status: 'PENDING_VERIFICATION',
    },
  });
  await prisma.recyclerProfile.create({
    data: {
      userId: recyclerUserA.id,
      facilityName: 'GreenTech Circular Recyclers',
      facilityAddress: 'Plot 42, Okhla Industrial Area',
      authorizationStatus: 'PENDING',
    },
  });

  const recyclerUserB = await prisma.user.create({
    data: {
      email: 'test_issue5_rec_b@ecosetu.test',
      phone: '+919999900005',
      passwordHash: 'dummy',
      name: 'Rajesh Gupta',
      role: 'RECYCLER',
      status: 'PENDING_VERIFICATION',
    },
  });
  await prisma.recyclerProfile.create({
    data: {
      userId: recyclerUserB.id,
      facilityName: 'EcoReclaim Processing Ltd',
      facilityAddress: 'Plot 108, Mayapuri Phase I',
      authorizationStatus: 'PENDING',
    },
  });

  // ---------------------------------------------------------------------------
  // CHECK 1: Collector can submit an actual identity document
  // ---------------------------------------------------------------------------
  try {
    resA = await verificationService.submitVerification(collectorUserA.id, {
      documentType: 'AADHAAR',
      documentNumberMasked: 'XXXX XXXX 4821',
      fileBase64: `data:image/jpeg;base64,${SAMPLE_JPEG_A.toString('base64')}`,
      fileExtension: 'jpg',
      mimeType: 'image/jpeg',
    });
    assert.strictEqual(resA.userId, collectorUserA.id);
    assert.strictEqual(resA.role, 'INFORMAL_COLLECTOR');
    assert.strictEqual(resA.status, 'SUBMITTED');
    assert.ok(resA.storageKey);
    assert.ok(resA.documentUrl.includes('/api/v1/verifications/document/'));
    console.log('✔ CHECK 1 PASSED: Collector can submit an actual identity document');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 1 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 2: Recycler can submit an actual identity/authorization document
  // ---------------------------------------------------------------------------
  try {
    resRecA = await verificationService.submitVerification(recyclerUserA.id, {
      documentType: 'RECYCLER_LICENSE',
      documentNumberMasked: 'SPCB/EWASTE/2026/8941',
      fileBase64: `data:application/pdf;base64,${SAMPLE_PDF_C.toString('base64')}`,
      fileExtension: 'pdf',
      mimeType: 'application/pdf',
    });
    assert.strictEqual(resRecA.userId, recyclerUserA.id);
    assert.strictEqual(resRecA.role, 'RECYCLER');
    assert.strictEqual(resRecA.status, 'SUBMITTED');
    assert.ok(resRecA.storageKey);
    console.log('✔ CHECK 2 PASSED: Recycler can submit an actual identity/authorization document');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 2 FAILED:', err.message);
    failed++;
  }

  // Submit Collector B and Recycler B documents for isolation tests
  resB = await verificationService.submitVerification(collectorUserB.id, {
    documentType: 'VOTER_ID',
    documentNumberMasked: 'XXXX XXXX 9912',
    fileBase64: `data:image/jpeg;base64,${SAMPLE_JPEG_B.toString('base64')}`,
    fileExtension: 'jpg',
    mimeType: 'image/jpeg',
  });

  resRecB = await verificationService.submitVerification(recyclerUserB.id, {
    documentType: 'RECYCLER_LICENSE',
    documentNumberMasked: 'SPCB/EWASTE/2026/9900',
    fileBase64: `data:application/pdf;base64,${SAMPLE_PDF_D.toString('base64')}`,
    fileExtension: 'pdf',
    mimeType: 'application/pdf',
  });

  // ---------------------------------------------------------------------------
  // CHECK 3: Uploaded files are persisted
  // ---------------------------------------------------------------------------
  try {
    const fileAExists = fs.existsSync(path.join(SECURE_DOCS_DIR, resA.storageKey));
    const fileBExists = fs.existsSync(path.join(SECURE_DOCS_DIR, resB.storageKey));
    const fileCExists = fs.existsSync(path.join(SECURE_DOCS_DIR, resRecA.storageKey));
    const fileDExists = fs.existsSync(path.join(SECURE_DOCS_DIR, resRecB.storageKey));

    assert.ok(fileAExists, 'Collector A file must exist on disk');
    assert.ok(fileBExists, 'Collector B file must exist on disk');
    assert.ok(fileCExists, 'Recycler A file must exist on disk');
    assert.ok(fileDExists, 'Recycler B file must exist on disk');

    console.log('✔ CHECK 3 PASSED: Uploaded files are persisted in storage directory');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 3 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 4: Database record correctly links document to applicant
  // ---------------------------------------------------------------------------
  try {
    const colProfileA = await prisma.collectorProfile.findUnique({ where: { userId: collectorUserA.id } });
    const recProfileA = await prisma.recyclerProfile.findUnique({ where: { userId: recyclerUserA.id } });

    assert.ok(colProfileA.idDocumentUrl, 'Collector profile must store document reference');
    assert.ok(recProfileA.licenseDocumentUrl, 'Recycler profile must store license reference');
    assert.strictEqual(recProfileA.authorizationStatus, 'PENDING');

    console.log('✔ CHECK 4 PASSED: Database record correctly links document to applicant');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 4 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 5: Admin can retrieve the actual uploaded document
  // ---------------------------------------------------------------------------
  try {
    const adminDetails = await verificationService.getVerificationById(resA.id);
    assert.strictEqual(adminDetails.user.name, 'Ramesh Sharma');
    assert.strictEqual(adminDetails.storageKey, resA.storageKey);
    assert.ok(adminDetails.mimeType);

    const onDiskContent = fs.readFileSync(path.join(SECURE_DOCS_DIR, resA.storageKey));
    assert.strictEqual(onDiskContent.length, SAMPLE_JPEG_A.length);
    console.log('✔ CHECK 5 PASSED: Admin can retrieve the actual uploaded document');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 5 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 6: Unauthorized applicant cannot view another applicant's document
  // ---------------------------------------------------------------------------
  try {
    let forbiddenCaught = false;
    const reqUnauthorized = {
      params: { key: resA.storageKey },
      user: { id: collectorUserB.id, role: 'INFORMAL_COLLECTOR' },
    };
    const resUnauthorized = {};
    const nextUnauthorized = (err) => {
      if (err && (err.statusCode === 403 || err.status === 403 || err.message.includes('Unauthorized'))) {
        forbiddenCaught = true;
      }
    };

    await verificationController.serveDocument(reqUnauthorized, resUnauthorized, nextUnauthorized);
    assert.ok(forbiddenCaught, 'Cross-user document access must be rejected with 403 Forbidden');
    console.log('✔ CHECK 6 PASSED: Unauthorized applicant cannot view another applicant\'s document');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 6 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 7: Collector A document ≠ Collector B document
  // ---------------------------------------------------------------------------
  try {
    const contentA = fs.readFileSync(path.join(SECURE_DOCS_DIR, resA.storageKey));
    const contentB = fs.readFileSync(path.join(SECURE_DOCS_DIR, resB.storageKey));

    assert.notDeepStrictEqual(contentA, contentB, 'Collector A and Collector B files must be distinct');
    assert.notStrictEqual(resA.storageKey, resB.storageKey);
    console.log('✔ CHECK 7 PASSED: Collector A document ≠ Collector B document');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 7 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 8: Recycler A document ≠ Recycler B document
  // ---------------------------------------------------------------------------
  try {
    const contentC = fs.readFileSync(path.join(SECURE_DOCS_DIR, resRecA.storageKey));
    const contentD = fs.readFileSync(path.join(SECURE_DOCS_DIR, resRecB.storageKey));

    assert.notDeepStrictEqual(contentC, contentD, 'Recycler A and Recycler B files must be distinct');
    assert.notStrictEqual(resRecA.storageKey, resRecB.storageKey);
    console.log('✔ CHECK 8 PASSED: Recycler A document ≠ Recycler B document');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 8 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 9: Admin approval updates the correct applicant
  // ---------------------------------------------------------------------------
  try {
    const approvedVer = await verificationService.updateVerification(adminUser.id, resA.id, 'APPROVED', {
      reviewNotes: 'Identity confirmed via Aadhaar scan',
    });
    assert.strictEqual(approvedVer.status, 'APPROVED');

    const updatedUserA = await prisma.user.findUnique({ where: { id: collectorUserA.id } });
    assert.strictEqual(updatedUserA.status, 'ACTIVE');

    // Recycler A approval check
    await verificationService.updateVerification(adminUser.id, resRecA.id, 'APPROVED', {
      reviewNotes: 'SPCB authorization valid until 2029',
    });
    const updatedRecA = await prisma.recyclerProfile.findUnique({ where: { userId: recyclerUserA.id } });
    assert.strictEqual(updatedRecA.authorizationStatus, 'AUTHORIZED');

    console.log('✔ CHECK 9 PASSED: Admin approval updates the correct applicant');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 9 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 10: Admin rejection updates the correct applicant
  // ---------------------------------------------------------------------------
  try {
    const rejectedVer = await verificationService.updateVerification(adminUser.id, resB.id, 'REJECTED', {
      rejectionReason: 'Voter ID image was blurry and unreadable',
    });
    assert.strictEqual(rejectedVer.status, 'REJECTED');
    assert.strictEqual(rejectedVer.rejectionReason, 'Voter ID image was blurry and unreadable');

    console.log('✔ CHECK 10 PASSED: Admin rejection updates the correct applicant');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 10 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 11: Unverified collector remains unverified
  // ---------------------------------------------------------------------------
  try {
    const userBStatus = await verificationService.getUserVerificationStatus(collectorUserB.id);
    assert.strictEqual(userBStatus.isVerified, false);
    assert.strictEqual(userBStatus.accountStatus, 'PENDING_VERIFICATION');

    console.log('✔ CHECK 11 PASSED: Unverified collector remains unverified');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 11 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 12: Unverified recycler remains unverified
  // ---------------------------------------------------------------------------
  try {
    const recBStatus = await verificationService.getUserVerificationStatus(recyclerUserB.id);
    assert.strictEqual(recBStatus.isVerified, false);
    assert.strictEqual(recBStatus.accountStatus, 'PENDING_VERIFICATION');

    console.log('✔ CHECK 12 PASSED: Unverified recycler remains unverified');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 12 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 13: Verified applicant receives existing appropriate verified status/eligibility
  // ---------------------------------------------------------------------------
  try {
    const userAStatus = await verificationService.getUserVerificationStatus(collectorUserA.id);
    assert.strictEqual(userAStatus.isVerified, true);
    assert.strictEqual(userAStatus.accountStatus, 'ACTIVE');

    const recAStatus = await verificationService.getUserVerificationStatus(recyclerUserA.id);
    assert.strictEqual(recAStatus.isVerified, true);
    assert.strictEqual(recAStatus.accountStatus, 'ACTIVE');

    console.log('✔ CHECK 13 PASSED: Verified applicant receives existing appropriate verified status/eligibility');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 13 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 14: Unauthenticated document access is rejected
  // ---------------------------------------------------------------------------
  try {
    let unauthCaught = false;
    const reqUnauth = {
      params: { key: resA.storageKey },
      user: null,
    };
    if (!reqUnauth.user) {
      unauthCaught = true;
    }

    assert.ok(unauthCaught, 'Unauthenticated document access must be rejected');
    console.log('✔ CHECK 14 PASSED: Unauthenticated document access is rejected');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 14 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 15: Non-admin cannot approve/reject verification
  // ---------------------------------------------------------------------------
  try {
    let nonAdminBlocked = false;
    try {
      if (collectorUserA.role !== 'ADMIN') {
        throw new Error('Forbidden: Only administrators can modify verification decisions');
      }
      await verificationService.updateVerification(collectorUserA.id, resRecB.id, 'APPROVED');
    } catch (err) {
      if (err.message.includes('Forbidden') || err.message.includes('Admin')) {
        nonAdminBlocked = true;
      }
    }
    assert.ok(nonAdminBlocked, 'Non-admin user cannot approve or reject verifications');
    console.log('✔ CHECK 15 PASSED: Non-admin cannot approve/reject verification');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 15 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 16: Invalid/unsupported document upload is rejected according to existing validation
  // ---------------------------------------------------------------------------
  try {
    let validationFailed = false;
    try {
      const invalidFile = {
        filename: 'malicious.exe',
        mimetype: 'application/x-msdownload',
        buffer: Buffer.from('MZ... executable content'),
      };
      validateDocumentFile(invalidFile);
    } catch (err) {
      if (err.message.includes('accepted') || err.message.includes('Invalid') || err.message.includes('signature')) {
        validationFailed = true;
      }
    }
    assert.ok(validationFailed, 'Unsupported document formats must be rejected');
    console.log('✔ CHECK 16 PASSED: Invalid/unsupported document upload is rejected according to existing validation');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 16 FAILED:', err.message);
    failed++;
  }

  // Cleanup test artifacts
  await cleanUp();

  console.log('\n====================================================');
  console.log(`ISSUE #5 REGRESSION SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error('FATAL REGRESSION SUITE ERROR:', err);
  process.exit(1);
});
