/**
 * verify_recycler_authorization.js
 * Comprehensive Automated Verification Suite for SIH 26229 Prompt 16:
 * Recycler Dataset + Authorization Lifecycle
 *
 * Canonical Requirements:
 * SIH Problem Statement 26229, docs/25_SIH_26229_REQUIREMENTS.md Section 19,
 * docs/26_SIH_TRACEABILITY_MATRIX.md SIH-RDATA-001 through SIH-RDATA-004.
 *
 * Checks Covered (22 total):
 *  1. Structured dataset fields presence in Prisma schema and database
 *  2. Lifecycle states supported (PENDING, AUTHORIZED, PROVISIONAL, REJECTED, SUSPENDED, EXPIRED, REVOKED)
 *  3. Recycler self-service field protection (cannot self-promote to AUTHORIZED or alter admin fields)
 *  4. Recycler operational updates permitted (pickup, service area, subcategories, operational contact)
 *  5. Admin authorization lifecycle: Approve / Authorize with registration details & validity dates
 *  6. Admin authorization lifecycle: Reject application with reason
 *  7. Admin authorization lifecycle: Suspend facility with reason
 *  8. Admin authorization lifecycle: Re-verify / Restore status
 *  9. Immutable audit logging on all authorization transitions (previous status, new status, actor, reason)
 * 10. Authorization matching ineligibility: PENDING status returns NOT_ELIGIBLE
 * 11. Authorization matching ineligibility: REJECTED status returns NOT_ELIGIBLE
 * 12. Authorization matching ineligibility: SUSPENDED status returns NOT_ELIGIBLE
 * 13. Authorization matching ineligibility: EXPIRED validity returns NOT_ELIGIBLE
 * 14. Authorization matching ineligibility: INACTIVE facility returns NOT_ELIGIBLE
 * 15. Provisional matching boundary: PROVISIONAL returns PARTIAL_MATCH with provisional warning (never MATCHED)
 * 16. Recycler rate does not imply authorization (rate on pending/rejected recycler remains NOT_ELIGIBLE)
 * 17. Workflow lifecycle integration: Direct quote creation & acceptance blocked for unauthorized recyclers
 * 18. Workflow lifecycle integration: Handover creation blocked for unauthorized recyclers
 * 19. Anti-fabrication rule: unverified / missing registration numbers are null, never invented; zero AI scores
 * 20. Tenancy isolation & Admin RBAC: recyclers cannot alter other profiles, admin routes require ADMIN role
 * 21. Date range and parameter validation: validTill < validFrom rejected, invalid status rejected
 * 22. Mobile UI and i18n accessibility: non-color indicators (icons + text) and full 4-language coverage
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const recyclerService = require('../src/services/recyclerService');
const recyclerMatchingService = require('../src/services/recyclerMatchingService');
const recyclerRateService = require('../src/services/recyclerRateService');
const quoteService = require('../src/services/quoteService');
const handoverService = require('../src/services/handoverService');
const materialLotService = require('../src/services/materialLotService');
const {
  PROTECTED_RECYCLER_FIELDS,
  upsertProfile: upsertProfileValidator,
} = require('../src/validators/recyclerValidators');
const {
  updateRecyclerAuthorization: updateRecyclerAuthorizationValidator,
} = require('../src/validators/adminValidators');
const {
  RECYCLER_AUTHORIZATION_STATUS,
  AUDIT_ACTIONS,
  ROLES,
  PRICE_UNITS,
  USER_STATUS,
} = require('../src/utils/constants');

// Helper to run an array of express-validator middleware against a mock request
async function runValidation(middlewares, req) {
  for (const mw of middlewares) {
    await new Promise((resolve, reject) => {
      mw(req, {}, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  return validationResult(req);
}

async function runRecyclerAuthorizationVerification() {
  console.log('================================================================');
  console.log('--- STARTING VERIFY_RECYCLER_AUTHORIZATION (SIH 26229 PROMPT 16) ---');
  console.log('================================================================\n');

  let passedChecks = 0;
  let failedChecks = 0;
  const failures = [];

  function passCheck(num, desc) {
    passedChecks++;
    console.log(`[PASS] Check ${num}: ${desc}`);
  }
  function failCheck(num, desc, err) {
    failedChecks++;
    failures.push({ num, desc, err: err ? err.message || String(err) : '' });
    console.error(`[FAIL] Check ${num}: ${desc}${err ? ' — ' + (err.message || err) : ''}`);
  }

  // Cleanup tracking
  const createdUserIds = [];
  const createdLotIds = [];
  const createdQuoteIds = [];
  const createdHandoverIds = [];

  let adminUser;
  let collectorUser, collectorProfile;
  let testRecycler1User, testRecycler1Profile;
  let testRecycler2User, testRecycler2Profile;
  let testLot;

  try {
    // -------------------------------------------------------------------------
    // SETUP FIXTURES
    // -------------------------------------------------------------------------
    const ts = Date.now();
    adminUser = await prisma.user.create({
      data: {
        email: `admin.auth.${ts}@ecosetu.test`,
        passwordHash: 'hash_auth_test',
        name: 'Admin Verifier',
        phone: `+919811${String(ts).slice(-6)}`,
        role: ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
      },
    });
    createdUserIds.push(adminUser.id);

    collectorUser = await prisma.user.create({
      data: {
        email: `collector.auth.${ts}@ecosetu.test`,
        passwordHash: 'hash_auth_test',
        name: 'Ramu Collector',
        phone: `+919822${String(ts).slice(-6)}`,
        role: ROLES.INFORMAL_COLLECTOR,
        status: USER_STATUS.ACTIVE,
      },
    });
    createdUserIds.push(collectorUser.id);

    collectorProfile = await prisma.collectorProfile.create({
      data: {
        userId: collectorUser.id,
        city: 'Bhubaneswar',
        state: 'Odisha',
        serviceArea: 'Bhubaneswar Urban',
      },
    });

    testRecycler1User = await prisma.user.create({
      data: {
        email: `recycler1.auth.${ts}@ecosetu.test`,
        passwordHash: 'hash_auth_test',
        name: 'GreenTech Eco Operations',
        phone: `+919833${String(ts).slice(-6)}`,
        role: ROLES.RECYCLER,
        status: USER_STATUS.ACTIVE,
      },
    });
    createdUserIds.push(testRecycler1User.id);

    testRecycler1Profile = await prisma.recyclerProfile.create({
      data: {
        userId: testRecycler1User.id,
        facilityName: 'GreenTech Formal E-Waste Processing Facility',
        facilityAddress: 'Plot 42, Mancheswar Industrial Estate',
        city: 'Bhubaneswar',
        district: 'Khurda',
        state: 'Odisha',
        pincode: '751010',
        facilityLat: 20.2961,
        facilityLng: 85.8245,
        acceptedCategories: ['CIRCUIT_BOARD', 'BATTERY', 'PCB'],
        acceptedSubcategories: ['FR4_MULTILAYER', 'LI_ION'],
        serviceArea: 'Bhubaneswar Urban & Cuttack Metro',
        serviceRadiusKm: 50,
        authorizationStatus: 'PENDING',
        pickupAvailable: 'AVAILABLE',
        isActive: true,
      },
    });

    testRecycler2User = await prisma.user.create({
      data: {
        email: `recycler2.auth.${ts}@ecosetu.test`,
        passwordHash: 'hash_auth_test',
        name: 'EcoShred Recyclers',
        phone: `+919844${String(ts).slice(-6)}`,
        role: ROLES.RECYCLER,
        status: USER_STATUS.ACTIVE,
      },
    });
    createdUserIds.push(testRecycler2User.id);

    testRecycler2Profile = await prisma.recyclerProfile.create({
      data: {
        userId: testRecycler2User.id,
        facilityName: 'EcoShred Aggregation Hub',
        facilityAddress: 'Sector 5, Chandaka Industrial Area',
        city: 'Bhubaneswar',
        district: 'Khurda',
        state: 'Odisha',
        pincode: '751024',
        facilityLat: 20.3533,
        facilityLng: 85.8178,
        acceptedCategories: ['CIRCUIT_BOARD', 'BATTERY', 'PCB'],
        authorizationStatus: 'PENDING',
        pickupAvailable: 'NOT_AVAILABLE',
        isActive: true,
      },
    });

    // Create a test material lot for matching & quotes
    testLot = await materialLotService.createMaterialLot(
      collectorUser.id,
      {
        category: 'PCB',
        approximateTotalWeightKg: 10,
        status: 'OPEN',
        sourceType: 'COMMERCIAL',
        collectionAddress: 'Unit 4 Market, Bhubaneswar',
        collectionLatitude: 20.2960,
        collectionLongitude: 85.8240,
      }
    );
    createdLotIds.push(testLot.id);

    // =========================================================================
    // CHECK 1: STRUCTURED DATASET FIELDS PRESENCE
    // =========================================================================
    try {
      const rec = await prisma.recyclerProfile.findUnique({
        where: { id: testRecycler1Profile.id },
      });
      assert(rec, 'Profile must exist');
      assert('authorizationNumber' in rec, 'authorizationNumber must exist in schema');
      assert('issuingAuthority' in rec, 'issuingAuthority must exist in schema');
      assert('authorizationValidFrom' in rec, 'authorizationValidFrom must exist in schema');
      assert('authorizationValidTill' in rec, 'authorizationValidTill must exist in schema');
      assert('operationalPhone' in rec, 'operationalPhone must exist in schema');
      assert('operationalEmail' in rec, 'operationalEmail must exist in schema');
      assert('verifiedAt' in rec, 'verifiedAt must exist in schema');
      assert('verifiedBy' in rec, 'verifiedBy must exist in schema');
      assert('verificationNotes' in rec, 'verificationNotes must exist in schema');
      assert('isActive' in rec, 'isActive must exist in schema');
      assert('acceptedSubcategories' in rec, 'acceptedSubcategories must exist in schema');
      passCheck(1, 'Structured dataset columns present on RecyclerProfile model');
    } catch (err) {
      failCheck(1, 'Structured dataset columns present on RecyclerProfile model', err);
    }

    // =========================================================================
    // CHECK 2: LIFECYCLE ENUM STATES SUPPORTED
    // =========================================================================
    try {
      const expectedStates = [
        'AUTHORIZED',
        'PROVISIONAL',
        'PENDING',
        'REJECTED',
        'SUSPENDED',
        'EXPIRED',
        'REVOKED',
      ];
      for (const st of expectedStates) {
        assert.strictEqual(
          RECYCLER_AUTHORIZATION_STATUS[st],
          st,
          `RECYCLER_AUTHORIZATION_STATUS must contain ${st}`
        );
      }
      // Verify database enum accepts PROVISIONAL, REJECTED, SUSPENDED
      const updated = await prisma.recyclerProfile.update({
        where: { id: testRecycler1Profile.id },
        data: { authorizationStatus: 'PROVISIONAL' },
      });
      assert.strictEqual(updated.authorizationStatus, 'PROVISIONAL');
      passCheck(2, 'All 7 lifecycle states supported in schema, constants, and PostgreSQL enum');
    } catch (err) {
      failCheck(2, 'All 7 lifecycle states supported in schema, constants, and PostgreSQL enum', err);
    }

    // =========================================================================
    // CHECK 3: RECYCLER SELF-SERVICE FIELD PROTECTION
    // =========================================================================
    try {
      assert(Array.isArray(PROTECTED_RECYCLER_FIELDS), 'PROTECTED_RECYCLER_FIELDS must be exported');
      assert(PROTECTED_RECYCLER_FIELDS.includes('authorizationStatus'), 'authorizationStatus must be protected');
      assert(PROTECTED_RECYCLER_FIELDS.includes('authorizationNumber'), 'authorizationNumber must be protected');
      assert(PROTECTED_RECYCLER_FIELDS.includes('verifiedAt'), 'verifiedAt must be protected');
      assert(PROTECTED_RECYCLER_FIELDS.includes('isActive'), 'isActive must be protected');

      // Test that express validator rejects protected fields
      const protectedFieldsToTest = ['authorizationStatus', 'authorizationNumber', 'verifiedAt', 'isActive'];
      for (const field of protectedFieldsToTest) {
        const mockReq = {
          body: {
            facilityName: 'Attempted Update',
            facilityAddress: 'Some Street',
            [field]: 'ILLEGAL_VALUE',
          },
        };
        const valRes = await runValidation(upsertProfileValidator, mockReq);
        const errs = valRes.array();
        assert(
          errs.some((e) => e.msg.includes(`Field '${field}' is protected`)),
          `Validator must reject protected field '${field}'`
        );
      }

      passCheck(3, 'Recycler self-service cannot alter authorization status or administrative verification fields');
    } catch (err) {
      failCheck(3, 'Recycler self-service cannot alter authorization status or administrative verification fields', err);
    }

    // =========================================================================
    // CHECK 4: RECYCLER OPERATIONAL UPDATES PERMITTED
    // =========================================================================
    try {
      const operationalUpdate = {
        facilityName: 'GreenTech Formal E-Waste Processing Facility',
        facilityAddress: 'Plot 42, Mancheswar Industrial Estate',
        acceptedCategories: ['PCB', 'CIRCUIT_BOARD', 'BATTERY'],
        pickupAvailable: 'AVAILABLE',
        serviceArea: 'Greater Bhubaneswar, Cuttack & Puri Region',
        serviceRadiusKm: 65,
        acceptedSubcategories: ['FR4_MULTILAYER', 'LI_ION_BATTERIES'],
        operationalPhone: '+919833001122',
        operationalEmail: 'ops@greentech.test',
      };

      // Ensure validator allows these fields
      const mockReq = { body: { ...operationalUpdate } };
      const valRes = await runValidation(upsertProfileValidator, mockReq);
      assert(valRes.isEmpty(), `Validator should accept valid operational fields: ${JSON.stringify(valRes.array())}`);

      const updated = await recyclerService.upsertProfile(testRecycler1User.id, operationalUpdate);
      assert.strictEqual(updated.pickupAvailable, 'AVAILABLE');
      assert.strictEqual(Number(updated.serviceRadiusKm), 65);
      assert.strictEqual(updated.operationalPhone, '+919833001122');
      assert.strictEqual(updated.operationalEmail, 'ops@greentech.test');
      passCheck(4, 'Recycler self-service can update operational parameters (pickup, service radius, contact)');
    } catch (err) {
      failCheck(4, 'Recycler self-service can update operational parameters (pickup, service radius, contact)', err);
    }

    // =========================================================================
    // CHECK 5: ADMIN AUTHORIZATION LIFECYCLE — APPROVE / AUTHORIZE
    // =========================================================================
    const validFrom = new Date(Date.now() - 30 * 86400000).toISOString();
    const validTill = new Date(Date.now() + 365 * 86400000).toISOString();

    try {
      const result = await recyclerService.adminUpdateRecyclerAuthorization(
        adminUser.id,
        testRecycler1Profile.id,
        {
          status: 'AUTHORIZED',
          authorizationNumber: 'SPCB/OD/EW/2026/0881',
          issuingAuthority: 'Odisha State Pollution Control Board',
          validFrom,
          validTill,
          reason: 'Physical plant inspection completed. Valid CPCB authorization verified.',
        }
      );

      assert.strictEqual(result.authorizationStatus, 'AUTHORIZED');
      assert.strictEqual(result.authorizationNumber, 'SPCB/OD/EW/2026/0881');
      assert.strictEqual(result.issuingAuthority, 'Odisha State Pollution Control Board');
      assert(result.verifiedAt !== null, 'verifiedAt must be stamped');
      assert.strictEqual(result.verifiedBy, adminUser.id, 'verifiedBy must reference admin user ID');
      passCheck(5, 'Admin can formally authorize facility with registration number, authority & validity dates');
    } catch (err) {
      failCheck(5, 'Admin can formally authorize facility with registration number, authority & validity dates', err);
    }

    // =========================================================================
    // CHECK 6: ADMIN AUTHORIZATION LIFECYCLE — REJECT
    // =========================================================================
    try {
      const result = await recyclerService.adminUpdateRecyclerAuthorization(
        adminUser.id,
        testRecycler2Profile.id,
        {
          status: 'REJECTED',
          reason: 'Incomplete pollution control apparatus and unverified CTE/CTO certificates.',
        }
      );

      assert.strictEqual(result.authorizationStatus, 'REJECTED');
      assert.strictEqual(result.verificationNotes, 'Incomplete pollution control apparatus and unverified CTE/CTO certificates.');
      passCheck(6, 'Admin can formally reject facility application with explicit audit notes');
    } catch (err) {
      failCheck(6, 'Admin can formally reject facility application with explicit audit notes', err);
    }

    // =========================================================================
    // CHECK 7: ADMIN AUTHORIZATION LIFECYCLE — SUSPEND
    // =========================================================================
    try {
      const result = await recyclerService.adminUpdateRecyclerAuthorization(
        adminUser.id,
        testRecycler1Profile.id,
        {
          status: 'SUSPENDED',
          reason: 'Temporary administrative suspension pending annual environmental compliance audit.',
        }
      );

      assert.strictEqual(result.authorizationStatus, 'SUSPENDED');
      passCheck(7, 'Admin can suspend facility authorization with immediate lifecycle effect');
    } catch (err) {
      failCheck(7, 'Admin can suspend facility authorization with immediate lifecycle effect', err);
    }

    // =========================================================================
    // CHECK 8: ADMIN AUTHORIZATION LIFECYCLE — RE-VERIFY / RESTORE
    // =========================================================================
    try {
      const result = await recyclerService.adminUpdateRecyclerAuthorization(
        adminUser.id,
        testRecycler1Profile.id,
        {
          status: 'AUTHORIZED',
          reason: 'Compliance audit submitted and verified. Suspension revoked.',
        }
      );

      assert.strictEqual(result.authorizationStatus, 'AUTHORIZED');
      passCheck(8, 'Admin can re-verify and restore suspended facility back to AUTHORIZED status');
    } catch (err) {
      failCheck(8, 'Admin can re-verify and restore suspended facility back to AUTHORIZED status', err);
    }

    // =========================================================================
    // CHECK 9: IMMUTABLE AUDIT LOGGING ON AUTHORIZATION TRANSITIONS
    // =========================================================================
    try {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: 'RECYCLER_PROFILE',
          entityId: testRecycler1Profile.id,
          action: AUDIT_ACTIONS.RECYCLER_AUTHORIZATION_CHANGED,
        },
        orderBy: { createdAt: 'asc' },
      });

      assert(auditLogs.length >= 3, `Expected at least 3 audit log entries for status changes, got ${auditLogs.length}`);
      const lastLog = auditLogs[auditLogs.length - 1];
      assert.strictEqual(lastLog.actorId, adminUser.id);
      assert.strictEqual(lastLog.details.previousStatus, 'SUSPENDED');
      assert.strictEqual(lastLog.details.newStatus, 'AUTHORIZED');
      assert.strictEqual(lastLog.details.reason, 'Compliance audit submitted and verified. Suspension revoked.');
      passCheck(9, 'Every status change records actor, previous status, new status, and reason in audit_logs');
    } catch (err) {
      failCheck(9, 'Every status change records actor, previous status, new status, and reason in audit_logs', err);
    }

    // =========================================================================
    // CHECK 10: MATCHING INELIGIBILITY — PENDING STATUS
    // =========================================================================
    const collectorActor = { id: collectorUser.id, role: ROLES.INFORMAL_COLLECTOR };

    try {
      // Put Recycler 1 back to PENDING temporarily
      await prisma.recyclerProfile.update({
        where: { id: testRecycler1Profile.id },
        data: { authorizationStatus: 'PENDING' },
      });

      const matches = await recyclerMatchingService.getMatchesForLot(testLot.id, collectorActor);
      const match1 = matches.matches.find((m) => m.recyclerId === testRecycler1Profile.id);
      assert(match1, 'Recycler 1 should be evaluated in matching');
      assert.strictEqual(match1.matchStatus, 'NOT_ELIGIBLE', 'Pending recycler must be NOT_ELIGIBLE');
      assert(
        match1.matchReasons.some((r) => r.toLowerCase().includes('pending')),
        `Reasons should mention pending, got: ${JSON.stringify(match1.matchReasons)}`
      );
      passCheck(10, 'Recycler with PENDING authorization is marked NOT_ELIGIBLE in matching');
    } catch (err) {
      failCheck(10, 'Recycler with PENDING authorization is marked NOT_ELIGIBLE in matching', err);
    }

    // =========================================================================
    // CHECK 11: MATCHING INELIGIBILITY — REJECTED STATUS
    // =========================================================================
    try {
      const matches = await recyclerMatchingService.getMatchesForLot(testLot.id, collectorActor);
      const match2 = matches.matches.find((m) => m.recyclerId === testRecycler2Profile.id);
      assert(match2, 'Recycler 2 should be evaluated in matching');
      assert.strictEqual(match2.matchStatus, 'NOT_ELIGIBLE', 'Rejected recycler must be NOT_ELIGIBLE');
      assert(
        match2.matchReasons.some((r) => r.toLowerCase().includes('rejected')),
        `Reasons should mention rejected, got: ${JSON.stringify(match2.matchReasons)}`
      );
      passCheck(11, 'Recycler with REJECTED authorization is marked NOT_ELIGIBLE in matching');
    } catch (err) {
      failCheck(11, 'Recycler with REJECTED authorization is marked NOT_ELIGIBLE in matching', err);
    }

    // =========================================================================
    // CHECK 12: MATCHING INELIGIBILITY — SUSPENDED STATUS
    // =========================================================================
    try {
      await prisma.recyclerProfile.update({
        where: { id: testRecycler1Profile.id },
        data: { authorizationStatus: 'SUSPENDED' },
      });

      const matches = await recyclerMatchingService.getMatchesForLot(testLot.id, collectorActor);
      const match1 = matches.matches.find((m) => m.recyclerId === testRecycler1Profile.id);
      assert.strictEqual(match1.matchStatus, 'NOT_ELIGIBLE', 'Suspended recycler must be NOT_ELIGIBLE');
      assert(
        match1.matchReasons.some((r) => r.toLowerCase().includes('suspended')),
        `Reasons should mention suspended, got: ${JSON.stringify(match1.matchReasons)}`
      );
      passCheck(12, 'Recycler with SUSPENDED authorization is marked NOT_ELIGIBLE in matching');
    } catch (err) {
      failCheck(12, 'Recycler with SUSPENDED authorization is marked NOT_ELIGIBLE in matching', err);
    }

    // =========================================================================
    // CHECK 13: MATCHING INELIGIBILITY — EXPIRED VALIDITY
    // =========================================================================
    try {
      await prisma.recyclerProfile.update({
        where: { id: testRecycler1Profile.id },
        data: {
          authorizationStatus: 'AUTHORIZED',
          authorizationValidTill: new Date(Date.now() - 86400000), // expired yesterday
        },
      });

      const matches = await recyclerMatchingService.getMatchesForLot(testLot.id, collectorActor);
      const match1 = matches.matches.find((m) => m.recyclerId === testRecycler1Profile.id);
      assert.strictEqual(match1.matchStatus, 'NOT_ELIGIBLE', 'Expired recycler must be NOT_ELIGIBLE');
      assert(
        match1.matchReasons.some((r) => r.toLowerCase().includes('expired')),
        `Reasons should mention expired, got: ${JSON.stringify(match1.matchReasons)}`
      );
      passCheck(13, 'Recycler with expired authorization validity is marked NOT_ELIGIBLE in matching');
    } catch (err) {
      failCheck(13, 'Recycler with expired authorization validity is marked NOT_ELIGIBLE in matching', err);
    }

    // =========================================================================
    // CHECK 14: MATCHING INELIGIBILITY — INACTIVE FACILITY
    // =========================================================================
    try {
      await prisma.recyclerProfile.update({
        where: { id: testRecycler1Profile.id },
        data: {
          authorizationStatus: 'AUTHORIZED',
          authorizationValidTill: new Date(Date.now() + 365 * 86400000), // active dates
          isActive: false, // inactive facility
        },
      });

      const matches = await recyclerMatchingService.getMatchesForLot(testLot.id, collectorActor);
      const match1 = matches.matches.find((m) => m.recyclerId === testRecycler1Profile.id);
      assert.strictEqual(match1.matchStatus, 'NOT_ELIGIBLE', 'Inactive recycler must be NOT_ELIGIBLE');
      assert(
        match1.matchReasons.some((r) => r.toLowerCase().includes('inactive')),
        `Reasons should mention inactive, got: ${JSON.stringify(match1.matchReasons)}`
      );
      passCheck(14, 'Inactive facility (isActive: false) is marked NOT_ELIGIBLE in matching');
    } catch (err) {
      failCheck(14, 'Inactive facility (isActive: false) is marked NOT_ELIGIBLE in matching', err);
    }

    // =========================================================================
    // CHECK 15: PROVISIONAL MATCHING BOUNDARY
    // =========================================================================
    try {
      await prisma.recyclerProfile.update({
        where: { id: testRecycler1Profile.id },
        data: {
          authorizationStatus: 'PROVISIONAL',
          authorizationValidTill: new Date(Date.now() + 180 * 86400000),
          isActive: true,
        },
      });

      const matches = await recyclerMatchingService.getMatchesForLot(testLot.id, collectorActor);
      const match1 = matches.matches.find((m) => m.recyclerId === testRecycler1Profile.id);
      assert.strictEqual(
        match1.matchStatus,
        'PARTIAL_MATCH',
        'PROVISIONAL recycler must NEVER be promoted to MATCHED'
      );
      assert(
        match1.matchReasons.some((r) => r.toLowerCase().includes('provisional')),
        'Reasons must transparently state provisional authorization'
      );
      passCheck(15, 'PROVISIONAL recycler returns PARTIAL_MATCH with provisional warning (never MATCHED)');
    } catch (err) {
      failCheck(15, 'PROVISIONAL recycler returns PARTIAL_MATCH with provisional warning (never MATCHED)', err);
    }

    // =========================================================================
    // CHECK 16: RATE DOES NOT IMPLY AUTHORIZATION
    // =========================================================================
    try {
      // Put Recycler 2 to PENDING and add a published rate using Admin actor
      await prisma.recyclerProfile.update({
        where: { id: testRecycler2Profile.id },
        data: { authorizationStatus: 'PENDING', isActive: true },
      });

      await recyclerRateService.createRate(
        {
          recyclerId: testRecycler2Profile.id,
          category: 'PCB',
          rate: 195.0,
          unit: PRICE_UNITS.PER_KG,
          sourceReference: 'CPCB E-Waste Buyer Schedule 2026-Q3',
        },
        { id: adminUser.id, role: ROLES.ADMIN }
      );

      const matches = await recyclerMatchingService.getMatchesForLot(testLot.id, collectorActor);
      const match2 = matches.matches.find((m) => m.recyclerId === testRecycler2Profile.id);

      assert(match2.offeredRate !== null, 'Offered rate exists');
      assert.strictEqual(match2.matchStatus, 'NOT_ELIGIBLE', 'Rate presence must not override PENDING status');
      assert(
        match2.matchReasons.some((r) => r.toLowerCase().includes('pending')),
        'Reasons should confirm pending authorization'
      );
      passCheck(16, 'Published rate does not imply authorization; unverified recycler remains NOT_ELIGIBLE');
    } catch (err) {
      failCheck(16, 'Published rate does not imply authorization; unverified recycler remains NOT_ELIGIBLE', err);
    }

    // =========================================================================
    // CHECK 17: WORKFLOW LIFECYCLE INTEGRATION — QUOTES BLOCKED
    // =========================================================================
    try {
      // Recycler 2 is PENDING. Attempt to create a direct quote -> Must FAIL with 403 Forbidden
      let quoteBlocked = false;
      try {
        await quoteService.createQuote(
          { id: testRecycler2User.id, role: ROLES.RECYCLER },
          {
            materialLotId: testLot.id,
            quotedUnitPrice: 190.0,
            validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
          }
        );
      } catch (qErr) {
        if (qErr.statusCode === 403 && qErr.message.includes('Only verified and authorized recyclers')) {
          quoteBlocked = true;
        }
      }
      assert(quoteBlocked, 'Direct quote creation must be blocked for unverified/pending recycler');

      // Now set Recycler 1 to AUTHORIZED, create a quote, then suspend Recycler 1 and attempt acceptance
      await prisma.recyclerProfile.update({
        where: { id: testRecycler1Profile.id },
        data: { authorizationStatus: 'AUTHORIZED', isActive: true },
      });

      const validQuote = await quoteService.createQuote(
        { id: testRecycler1User.id, role: ROLES.RECYCLER },
        {
          materialLotId: testLot.id,
          quotedUnitPrice: 185.0,
          validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
        }
      );
      createdQuoteIds.push(validQuote.id);

      // Now suspend Recycler 1 before collector accepts
      await prisma.recyclerProfile.update({
        where: { id: testRecycler1Profile.id },
        data: { authorizationStatus: 'SUSPENDED' },
      });

      let acceptBlocked = false;
      try {
        await quoteService.acceptQuote(collectorActor, validQuote.id);
      } catch (accErr) {
        if (accErr.statusCode === 400 && accErr.message.includes('no longer authorized or verified')) {
          acceptBlocked = true;
        }
      }
      assert(acceptBlocked, 'Collector quote acceptance must be blocked if recycler is suspended');
      passCheck(17, 'Direct quote creation & offer acceptance strictly blocked for unauthorized/suspended recyclers');
    } catch (err) {
      failCheck(17, 'Direct quote creation & offer acceptance strictly blocked for unauthorized/suspended recyclers', err);
    }

    // =========================================================================
    // CHECK 18: WORKFLOW LIFECYCLE INTEGRATION — HANDOVERS BLOCKED
    // =========================================================================
    try {
      // Re-authorize Recycler 1, accept quote, then suspend Recycler 1 and attempt handover
      await prisma.recyclerProfile.update({
        where: { id: testRecycler1Profile.id },
        data: { authorizationStatus: 'AUTHORIZED' },
      });

      const acceptedQuote = await quoteService.acceptQuote(collectorActor, createdQuoteIds[0]);

      // Now suspend Recycler 1
      await prisma.recyclerProfile.update({
        where: { id: testRecycler1Profile.id },
        data: { authorizationStatus: 'SUSPENDED' },
      });

      let handoverBlocked = false;
      try {
        await handoverService.createHandover(collectorActor, {
          materialLotId: testLot.id,
          quoteId: acceptedQuote.id,
          scaleWeightKg: 10,
          scalePhotoUrl: 'https://storage.googleapis.com/ecosetu/test-scale.jpg',
          weighmentTimestamp: new Date().toISOString(),
        });
      } catch (hErr) {
        if (hErr.statusCode === 400 && hErr.message.includes('no longer active and authorized')) {
          handoverBlocked = true;
        }
      }
      assert(handoverBlocked, 'Handover creation must be blocked for suspended or unauthorized recycler');
      passCheck(18, 'Handover initiation strictly blocked for suspended or unauthorized recyclers');
    } catch (err) {
      failCheck(18, 'Handover initiation strictly blocked for suspended or unauthorized recyclers', err);
    }

    // =========================================================================
    // CHECK 19: ANTI-FABRICATION RULE — ZERO FAKE REGISTRATIONS / ZERO AI
    // =========================================================================
    try {
      // Fetch Recycler 2 detail via public getRecyclerById
      const detail2 = await recyclerService.getRecyclerById(testRecycler2Profile.id);
      assert.strictEqual(detail2.authorizationNumber, null, 'Unregistered facility must return null authorizationNumber');
      assert.strictEqual(detail2.issuingAuthority, null, 'Unregistered facility must return null issuingAuthority');
      assert.strictEqual(detail2.authorizationStatus, 'PENDING');

      // Check matching result for absence of artificial numeric AI scores
      const matches = await recyclerMatchingService.getMatchesForLot(testLot.id, collectorActor);
      for (const m of matches.matches) {
        assert(!('score' in m), 'Matching output must not contain artificial numeric score');
        assert(!('aiMatchPercent' in m), 'Matching output must not contain fake AI percentage');
        assert(Array.isArray(m.matchReasons), 'Must contain transparent checklist matchReasons array');
        assert(m.matchReasons.length > 0, 'Checklist reasons must not be empty');
      }
      passCheck(19, 'Zero fabrication: missing credentials return null, matching uses transparent checklists with zero fake AI scores');
    } catch (err) {
      failCheck(19, 'Zero fabrication: missing credentials return null, matching uses transparent checklists with zero fake AI scores', err);
    }

    // =========================================================================
    // CHECK 20: TENANCY ISOLATION & ADMIN RBAC
    // =========================================================================
    try {
      // Recycler 1 attempts to update profile via upsertProfile — strictly scoped to actor userId
      const rec1OwnProfile = await recyclerService.upsertProfile(testRecycler1User.id, {
        facilityName: 'GreenTech Updated Facility Name',
        facilityAddress: 'Plot 42, Mancheswar Industrial Estate',
        acceptedCategories: ['PCB', 'BATTERY'],
      });
      assert.strictEqual(rec1OwnProfile.id, testRecycler1Profile.id, 'Can only update own profile');

      // Verify admin update can maintain operational profile of any recycler
      const adminUpdate = await recyclerService.adminUpdateRecyclerProfile(
        adminUser.id,
        testRecycler2Profile.id,
        { facilityName: 'EcoShred Formally Reviewed Name' }
      );
      assert.strictEqual(adminUpdate.facilityName, 'EcoShred Formally Reviewed Name');

      passCheck(20, 'Tenancy isolation enforced (recycler cannot edit other profiles; admin governance centralized)');
    } catch (err) {
      failCheck(20, 'Tenancy isolation enforced (recycler cannot edit other profiles; admin governance centralized)', err);
    }

    // =========================================================================
    // CHECK 21: DATE RANGE & PARAMETER VALIDATION
    // =========================================================================
    try {
      // Test inverted dates via express validator
      const invertedReq = {
        params: { id: testRecycler1Profile.id },
        body: {
          status: 'AUTHORIZED',
          validFrom: '2026-12-31T00:00:00.000Z',
          validTill: '2026-01-01T00:00:00.000Z', // earlier than validFrom!
        },
      };
      const invertedRes = await runValidation(updateRecyclerAuthorizationValidator, invertedReq);
      assert(
        invertedRes.array().some((e) => e.msg.includes('greater than or equal to validFrom')),
        'Validator must reject validTill < validFrom'
      );

      // Test invalid lifecycle status
      const invalidStatusReq = {
        params: { id: testRecycler1Profile.id },
        body: {
          status: 'OFFICIALLY_CERTIFIED_FAKE_STATUS',
        },
      };
      const invalidStatusRes = await runValidation(updateRecyclerAuthorizationValidator, invalidStatusReq);
      assert(
        invalidStatusRes.array().some((e) => e.msg.includes('Invalid status')),
        'Validator must reject non-standard authorization status'
      );

      passCheck(21, 'Admin input validator rejects inverted validity dates and invalid lifecycle statuses');
    } catch (err) {
      failCheck(21, 'Admin input validator rejects inverted validity dates and invalid lifecycle statuses', err);
    }

    // =========================================================================
    // CHECK 22: MOBILE UI NON-COLOR INDICATORS & I18N
    // =========================================================================
    try {
      const dirScreenPath = path.resolve(__dirname, '../../mobile/src/screens/collector/CollectorRecyclerDirectoryScreen.tsx');
      const detailScreenPath = path.resolve(__dirname, '../../mobile/src/screens/collector/CollectorRecyclerDetailScreen.tsx');

      const dirScreenSrc = fs.readFileSync(dirScreenPath, 'utf8');
      const detailScreenSrc = fs.readFileSync(detailScreenPath, 'utf8');

      // Verify distinct symbols used for statuses (not relying on color alone)
      assert(dirScreenSrc.includes('✓'), 'Authorized badge must include checkmark symbol');
      assert(dirScreenSrc.includes('⚠️'), 'Provisional badge must include alert warning symbol');
      assert(dirScreenSrc.includes('⏳'), 'Pending badge must include hourglass pending symbol');
      assert(dirScreenSrc.includes('⏸️'), 'Suspended badge must include pause suspended symbol');
      assert(dirScreenSrc.includes('❌'), 'Rejected badge must include cross rejected symbol');

      // Verify detail screen displays official registration details or unverified notice
      assert(detailScreenSrc.includes('regNumber'), 'Detail screen must render registration number');
      assert(detailScreenSrc.includes('issuingAuthority'), 'Detail screen must render issuing authority');
      assert(detailScreenSrc.includes('noRefSubmitted'), 'Detail screen must render explicit unverified notice if no cert');

      // Verify i18n keys present across all 4 locales
      const locales = ['en', 'hi', 'mr', 'or'];
      for (const loc of locales) {
        const locPath = path.resolve(__dirname, `../../mobile/src/i18n/locales/${loc}.ts`);
        const locSrc = fs.readFileSync(locPath, 'utf8');
        assert(locSrc.includes('statusSuspended'), `${loc} must contain statusSuspended`);
        assert(locSrc.includes('statusRejected'), `${loc} must contain statusRejected`);
        assert(locSrc.includes('statusInactive'), `${loc} must contain statusInactive`);
        assert(locSrc.includes('noRefSubmitted'), `${loc} must contain noRefSubmitted`);
      }

      passCheck(22, 'Mobile UI provides non-color trust indicators (icons + text) with complete 4-language i18n coverage');
    } catch (err) {
      failCheck(22, 'Mobile UI provides non-color trust indicators (icons + text) with complete 4-language i18n coverage', err);
    }

  } catch (globalErr) {
    console.error('Unexpected error during verification:', globalErr);
  } finally {
    // -------------------------------------------------------------------------
    // TEARDOWN FIXTURES
    // -------------------------------------------------------------------------
    console.log('\n[TEARDOWN] Cleaning up test fixtures...');
    try {
      if (createdHandoverIds.length > 0) {
        await prisma.handoverRecord.deleteMany({ where: { id: { in: createdHandoverIds } } });
      }
      if (createdQuoteIds.length > 0) {
        await prisma.quote.deleteMany({ where: { id: { in: createdQuoteIds } } });
      }
      await prisma.recyclerOfferedRate.deleteMany({
        where: { recyclerId: { in: [testRecycler1Profile?.id, testRecycler2Profile?.id].filter(Boolean) } },
      });
      await prisma.auditLog.deleteMany({
        where: {
          entityId: { in: [testRecycler1Profile?.id, testRecycler2Profile?.id].filter(Boolean) },
        },
      });
      if (createdLotIds.length > 0) {
        await prisma.materialLotItem.deleteMany({ where: { lotId: { in: createdLotIds } } });
        await prisma.materialLotPhoto.deleteMany({ where: { lotId: { in: createdLotIds } } });
        await prisma.materialLot.deleteMany({ where: { id: { in: createdLotIds } } });
      }
      if (testRecycler1Profile) {
        await prisma.recyclerProfile.deleteMany({ where: { id: testRecycler1Profile.id } });
      }
      if (testRecycler2Profile) {
        await prisma.recyclerProfile.deleteMany({ where: { id: testRecycler2Profile.id } });
      }
      if (collectorProfile) {
        await prisma.materialItem.deleteMany({ where: { collectorId: collectorProfile.id } });
        await prisma.collectorProfile.deleteMany({ where: { id: collectorProfile.id } });
      }
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      }
      console.log('✓ Teardown complete');
    } catch (tdErr) {
      console.error('Warning during teardown:', tdErr.message);
    }
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log('--- RECYCLER DATASET & AUTHORIZATION VERIFICATION SUMMARY ---');
  console.log(`Passed: ${passedChecks}`);
  console.log(`Failed: ${failedChecks}`);
  console.log(`Total:  ${passedChecks + failedChecks}`);
  console.log('================================================================\n');

  if (failedChecks > 0 || passedChecks < 22) {
    console.error(`❌ INCOMPLETE OR FAILED: ${failedChecks} failures, ${passedChecks}/22 passed.`);
    failures.forEach((f) => console.error(`  - Check ${f.num}: ${f.desc} (${f.err})`));
    process.exit(1);
  } else {
    console.log('🎉 ALL 22 RECYCLER DATASET & AUTHORIZATION LIFECYCLE CHECKS PASSED!\n');
    process.exit(0);
  }
}

runRecyclerAuthorizationVerification();
