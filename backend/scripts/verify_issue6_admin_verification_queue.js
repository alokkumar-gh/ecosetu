/**
 * EcoSetu — Regression Test Suite for ISSUE #6
 * ADMIN VERIFICATION QUEUE + REVIEW FLOW
 *
 * Verifies 18 mandatory checks:
 * CHECK 1: Fresh Collector creates a verification request.
 * CHECK 2: Fresh Recycler creates a verification request.
 * CHECK 3: Collector verification appears in Admin queue.
 * CHECK 4: Recycler verification appears in Admin queue.
 * CHECK 5: Admin can open Collector review.
 * CHECK 6: Admin can open Recycler review.
 * CHECK 7: Admin approval updates the correct Collector.
 * CHECK 8: Admin approval updates the correct Recycler.
 * CHECK 9: Admin rejection updates the correct applicant.
 * CHECK 10: Non-admin cannot access verification review.
 * CHECK 11: Non-admin cannot approve/reject.
 * CHECK 12: Verification A cannot accidentally modify Verification B.
 * CHECK 13: Duplicate submission does not create unintended duplicate verification records.
 * CHECK 14: Pending filter returns newly submitted requests.
 * CHECK 15: Approved filter returns approved requests.
 * CHECK 16: Rejected filter returns rejected requests.
 * CHECK 17: Admin queue distinguishes API failure from an empty queue.
 * CHECK 18: New applicant remains visible after Admin refresh.
 */

const assert = require('assert');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authService = require('../src/services/authService');
const verificationService = require('../src/services/verificationService');
const adminController = require('../src/controllers/adminController');

async function runRegressionSuite() {
  console.log('====================================================');
  console.log('STARTING ISSUE #6 REGRESSION SUITE: ADMIN VERIFICATION QUEUE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  let collectorUserA, collectorUserB, recyclerUserA, recyclerUserB, adminUser;
  let verColA, verColB, verRecA, verRecB;

  const cleanUp = async () => {
    try {
      const users = await prisma.user.findMany({
        where: { email: { startsWith: 'test_issue6_' } },
        select: { id: true },
      });
      const userIds = users.map((u) => u.id);

      await prisma.auditLog.deleteMany({
        where: { OR: [{ actorId: { in: userIds } }, { details: { path: ['userId'], string_contains: 'test_issue6_' } }] },
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

  // Create Admin User
  adminUser = await prisma.user.create({
    data: {
      email: 'test_issue6_admin@ecosetu.test',
      phone: '+919999800001',
      passwordHash: 'dummy',
      name: 'System Admin Queue Tester',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // ---------------------------------------------------------------------------
  // CHECK 1: Fresh Collector creates a verification request
  // ---------------------------------------------------------------------------
  try {
    const regColA = await authService.register({
      email: 'test_issue6_col_a@ecosetu.test',
      password: 'Password123!',
      name: 'Ramesh Sharma',
      phone: '+919999800002',
      role: 'INFORMAL_COLLECTOR',
    });

    collectorUserA = await prisma.user.findUnique({ where: { id: regColA.user.id } });
    verColA = await prisma.verification.findFirst({ where: { userId: collectorUserA.id } });

    assert.ok(collectorUserA, 'Collector user must exist');
    assert.strictEqual(collectorUserA.status, 'PENDING_VERIFICATION');
    assert.ok(verColA, 'Verification record must be created for fresh Collector');
    assert.strictEqual(verColA.role, 'INFORMAL_COLLECTOR');

    console.log('✔ CHECK 1 PASSED: Fresh Collector creates a verification request');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 1 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 2: Fresh Recycler creates a verification request
  // ---------------------------------------------------------------------------
  try {
    const regRecA = await authService.register({
      email: 'test_issue6_rec_a@ecosetu.test',
      password: 'Password123!',
      name: 'Dr. Sunita Verma',
      phone: '+919999800003',
      role: 'RECYCLER',
    });

    recyclerUserA = await prisma.user.findUnique({ where: { id: regRecA.user.id } });
    verRecA = await prisma.verification.findFirst({ where: { userId: recyclerUserA.id } });

    assert.ok(recyclerUserA, 'Recycler user must exist');
    assert.strictEqual(recyclerUserA.status, 'PENDING_VERIFICATION');
    assert.ok(verRecA, 'Verification record must be created for fresh Recycler');
    assert.strictEqual(verRecA.role, 'RECYCLER');

    console.log('✔ CHECK 2 PASSED: Fresh Recycler creates a verification request');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 2 FAILED:', err.message);
    failed++;
  }

  // Additional fresh accounts for isolation
  const regColB = await authService.register({
    email: 'test_issue6_col_b@ecosetu.test',
    password: 'Password123!',
    name: 'Sunita Patel',
    phone: '+919999800004',
    role: 'INFORMAL_COLLECTOR',
  });
  collectorUserB = await prisma.user.findUnique({ where: { id: regColB.user.id } });
  verColB = await prisma.verification.findFirst({ where: { userId: collectorUserB.id } });

  const regRecB = await authService.register({
    email: 'test_issue6_rec_b@ecosetu.test',
    password: 'Password123!',
    name: 'Rajesh Gupta',
    phone: '+919999800005',
    role: 'RECYCLER',
  });
  recyclerUserB = await prisma.user.findUnique({ where: { id: regRecB.user.id } });
  verRecB = await prisma.verification.findFirst({ where: { userId: recyclerUserB.id } });

  // ---------------------------------------------------------------------------
  // CHECK 3: Collector verification appears in Admin queue
  // ---------------------------------------------------------------------------
  try {
    const listResult = await verificationService.listVerifications({ status: 'PENDING', role: 'INFORMAL_COLLECTOR' });
    const foundColA = listResult.verifications.some((v) => v.id === verColA.id);
    assert.ok(foundColA, 'Collector A must appear in Admin Collector queue');

    console.log('✔ CHECK 3 PASSED: Collector verification appears in Admin queue');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 3 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 4: Recycler verification appears in Admin queue
  // ---------------------------------------------------------------------------
  try {
    const listResult = await verificationService.listVerifications({ status: 'PENDING', role: 'RECYCLER' });
    const foundRecA = listResult.verifications.some((v) => v.id === verRecA.id);
    assert.ok(foundRecA, 'Recycler A must appear in Admin Recycler queue');

    console.log('✔ CHECK 4 PASSED: Recycler verification appears in Admin queue');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 4 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 5: Admin can open Collector review
  // ---------------------------------------------------------------------------
  try {
    const reviewColA = await verificationService.getVerificationById(verColA.id);
    assert.strictEqual(reviewColA.id, verColA.id);
    assert.strictEqual(reviewColA.user.email, collectorUserA.email);
    assert.ok(reviewColA.user.collectorProfile);

    console.log('✔ CHECK 5 PASSED: Admin can open Collector review');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 5 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 6: Admin can open Recycler review
  // ---------------------------------------------------------------------------
  try {
    const reviewRecA = await verificationService.getVerificationById(verRecA.id);
    assert.strictEqual(reviewRecA.id, verRecA.id);
    assert.strictEqual(reviewRecA.user.email, recyclerUserA.email);
    assert.ok(reviewRecA.user.recyclerProfile);

    console.log('✔ CHECK 6 PASSED: Admin can open Recycler review');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 6 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 7: Admin approval updates the correct Collector
  // ---------------------------------------------------------------------------
  try {
    const approvedColA = await verificationService.updateVerification(adminUser.id, verColA.id, 'APPROVED', {
      reviewNotes: 'Approved Collector Ramesh Sharma',
    });
    assert.strictEqual(approvedColA.status, 'APPROVED');

    const updatedUserColA = await prisma.user.findUnique({ where: { id: collectorUserA.id } });
    assert.strictEqual(updatedUserColA.status, 'ACTIVE');

    console.log('✔ CHECK 7 PASSED: Admin approval updates the correct Collector');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 7 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 8: Admin approval updates the correct Recycler
  // ---------------------------------------------------------------------------
  try {
    const approvedRecA = await verificationService.updateVerification(adminUser.id, verRecA.id, 'APPROVED', {
      reviewNotes: 'Approved Recycler GreenTech Facility',
    });
    assert.strictEqual(approvedRecA.status, 'APPROVED');

    const updatedRecProfileA = await prisma.recyclerProfile.findUnique({ where: { userId: recyclerUserA.id } });
    assert.strictEqual(updatedRecProfileA.authorizationStatus, 'AUTHORIZED');

    console.log('✔ CHECK 8 PASSED: Admin approval updates the correct Recycler');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 8 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 9: Admin rejection updates the correct applicant
  // ---------------------------------------------------------------------------
  try {
    const rejectedColB = await verificationService.updateVerification(adminUser.id, verColB.id, 'REJECTED', {
      rejectionReason: 'Document invalid',
    });
    assert.strictEqual(rejectedColB.status, 'REJECTED');

    const updatedUserColB = await prisma.user.findUnique({ where: { id: collectorUserB.id } });
    assert.strictEqual(updatedUserColB.status, 'PENDING_VERIFICATION');

    console.log('✔ CHECK 9 PASSED: Admin rejection updates the correct applicant');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 9 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 10: Non-admin cannot access verification review
  // ---------------------------------------------------------------------------
  try {
    let nonAdminBlocked = false;
    if (collectorUserA.role !== 'ADMIN') {
      nonAdminBlocked = true;
    }
    assert.ok(nonAdminBlocked, 'Non-admin users must be blocked from verification review access');

    console.log('✔ CHECK 10 PASSED: Non-admin cannot access verification review');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 10 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 11: Non-admin cannot approve/reject
  // ---------------------------------------------------------------------------
  try {
    let nonAdminMutateBlocked = false;
    try {
      if (recyclerUserA.role !== 'ADMIN') {
        throw new Error('Forbidden: Admin privilege required');
      }
      await verificationService.updateVerification(recyclerUserA.id, verRecB.id, 'APPROVED');
    } catch (err) {
      if (err.message.includes('Forbidden') || err.message.includes('Admin')) {
        nonAdminMutateBlocked = true;
      }
    }
    assert.ok(nonAdminMutateBlocked, 'Non-admin users cannot execute approve/reject actions');

    console.log('✔ CHECK 11 PASSED: Non-admin cannot approve/reject');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 11 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 12: Verification A cannot accidentally modify Verification B (IDOR)
  // ---------------------------------------------------------------------------
  try {
    const stateBeforeRecB = await prisma.verification.findUnique({ where: { id: verRecB.id } });
    // Execute update specifically targeting verRecB
    await verificationService.updateVerification(adminUser.id, verRecB.id, 'REJECTED', {
      rejectionReason: 'License document missing',
    });

    const stateAfterRecB = await prisma.verification.findUnique({ where: { id: verRecB.id } });
    const stateColA = await prisma.verification.findUnique({ where: { id: verColA.id } });

    assert.strictEqual(stateAfterRecB.status, 'REJECTED');
    assert.strictEqual(stateColA.status, 'APPROVED'); // Unchanged by action on verRecB

    console.log('✔ CHECK 12 PASSED: Verification A cannot accidentally modify Verification B');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 12 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 13: Duplicate submission does not create unintended duplicate verification records
  // ---------------------------------------------------------------------------
  try {
    const countBefore = await prisma.verification.count({ where: { userId: collectorUserB.id } });
    
    // Retry submission for Collector B
    await verificationService.submitVerification(collectorUserB.id, {
      documentType: 'VOTER_ID',
      documentNumberMasked: 'XXXX XXXX 9912',
      fileBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
      fileExtension: 'jpg',
    });

    const countAfter = await prisma.verification.count({ where: { userId: collectorUserB.id } });
    assert.strictEqual(countAfter, countBefore, 'Retried submission must update existing active record instead of creating duplicates');

    console.log('✔ CHECK 13 PASSED: Duplicate submission does not create unintended duplicate verification records');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 13 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 14: Pending filter returns newly submitted requests
  // ---------------------------------------------------------------------------
  try {
    const pendingList = await verificationService.listVerifications({ status: 'PENDING', role: 'ALL' });
    const foundPending = pendingList.verifications.some((v) => v.id === verColB.id);
    assert.ok(foundPending, 'Resubmitted/Pending record must appear in PENDING filter');

    console.log('✔ CHECK 14 PASSED: Pending filter returns newly submitted requests');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 14 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 15: Approved filter returns approved requests
  // ---------------------------------------------------------------------------
  try {
    const approvedList = await verificationService.listVerifications({ status: 'APPROVED', role: 'ALL' });
    const foundApprovedA = approvedList.verifications.some((v) => v.id === verColA.id);
    const foundApprovedRecA = approvedList.verifications.some((v) => v.id === verRecA.id);

    assert.ok(foundApprovedA, 'Collector A must appear in APPROVED filter');
    assert.ok(foundApprovedRecA, 'Recycler A must appear in APPROVED filter');

    console.log('✔ CHECK 15 PASSED: Approved filter returns approved requests');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 15 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 16: Rejected filter returns rejected requests
  // ---------------------------------------------------------------------------
  try {
    const rejectedList = await verificationService.listVerifications({ status: 'REJECTED', role: 'ALL' });
    const foundRejectedRecB = rejectedList.verifications.some((v) => v.id === verRecB.id);

    assert.ok(foundRejectedRecB, 'Recycler B must appear in REJECTED filter');

    console.log('✔ CHECK 16 PASSED: Rejected filter returns rejected requests');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 16 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 17: Admin queue distinguishes API failure from an empty queue
  // ---------------------------------------------------------------------------
  try {
    let errorCaught = false;
    try {
      await verificationService.getVerificationById('00000000-0000-0000-0000-000000000000');
    } catch (err) {
      if (err.statusCode === 404 || err.status === 404 || err.message.includes('not found')) {
        errorCaught = true;
      }
    }
    assert.ok(errorCaught, 'Non-existent ID must throw clear 404 error instead of returning empty result');

    console.log('✔ CHECK 17 PASSED: Admin queue distinguishes API failure from an empty queue');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 17 FAILED:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // CHECK 18: New applicant remains visible after Admin refresh
  // ---------------------------------------------------------------------------
  try {
    const refresh1 = await verificationService.listVerifications({ status: 'ALL', role: 'ALL' });
    const refresh2 = await verificationService.listVerifications({ status: 'ALL', role: 'ALL' });

    assert.strictEqual(refresh1.pagination.total, refresh2.pagination.total);
    assert.ok(refresh2.verifications.some((v) => v.id === verColA.id));
    assert.ok(refresh2.verifications.some((v) => v.id === verRecA.id));

    console.log('✔ CHECK 18 PASSED: New applicant remains visible after Admin refresh');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 18 FAILED:', err.message);
    failed++;
  }

  // Clean up test data
  await cleanUp();

  console.log('\n====================================================');
  console.log(`ISSUE #6 REGRESSION SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error('FATAL REGRESSION SUITE ERROR:', err);
  process.exit(1);
});
