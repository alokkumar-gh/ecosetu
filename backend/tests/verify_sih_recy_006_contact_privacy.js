/**
 * verify_sih_recy_006_contact_privacy.js
 * Automated Verification Suite for SIH-RECY-006: Recycler Contact Privacy Gate
 */

const assert = require('assert');
const prisma = require('../src/config/database');
const recyclerService = require('../src/services/recyclerService');
const { ROLES, USER_STATUS } = require('../src/utils/constants');

let totalPassed = 0;
let totalFailed = 0;

function pass(name) {
  totalPassed++;
  console.log(`  ✅ [PASS] ${name}`);
}

function fail(name, err) {
  totalFailed++;
  console.error(`  ❌ [FAIL] ${name}:`, err.message || err);
}

async function run() {
  console.log('\n========================================================================');
  console.log('  ECOSETU SIH-RECY-006: RECYCLER CONTACT PRIVACY GATE VERIFICATION');
  console.log('========================================================================\n');

  // Record initial row counts for baseline verification
  const initialCounts = {
    users: await prisma.user.count(),
    collectorProfiles: await prisma.collectorProfile.count(),
    recyclerProfiles: await prisma.recyclerProfile.count(),
    materialLots: await prisma.materialLot.count(),
    quotes: await prisma.quote.count(),
  };

  // Find existing test users
  let recyclerUser = await prisma.user.findFirst({
    where: { role: ROLES.RECYCLER, status: USER_STATUS.ACTIVE },
    include: { recyclerProfile: true },
  });

  let collectorA = await prisma.user.findFirst({
    where: { role: ROLES.INFORMAL_COLLECTOR, status: USER_STATUS.ACTIVE },
    include: { collectorProfile: true },
  });

  let collectorB = await prisma.user.findFirst({
    where: {
      role: ROLES.INFORMAL_COLLECTOR,
      status: USER_STATUS.ACTIVE,
      id: { not: collectorA ? collectorA.id : undefined },
    },
    include: { collectorProfile: true },
  });

  let adminUser = await prisma.user.findFirst({
    where: { role: ROLES.ADMIN, status: USER_STATUS.ACTIVE },
  });

  let createdTempRecycler = false;
  let createdTempCollectorA = false;
  let createdTempCollectorB = false;
  let createdTempAdmin = false;
  let tempLotA = null;
  let tempLotB = null;
  let tempQuote = null;

  try {
    // Fallback user creation if not present in DB
    if (!recyclerUser || !recyclerUser.recyclerProfile) {
      createdTempRecycler = true;
      recyclerUser = await prisma.user.create({
        data: {
          email: `test_recy_privacy_${Date.now()}@ecosetu.org`,
          passwordHash: 'hash',
          name: 'GreenTech Recycling Facility',
          phone: '+919876543210',
          role: ROLES.RECYCLER,
          status: USER_STATUS.ACTIVE,
          recyclerProfile: {
            create: {
              facilityName: 'GreenTech Recycling Hub',
              facilityAddress: 'Industrial Estate, Brahmapur',
              licenseNumber: 'SPCB/2026/TEST',
              operationalPhone: '+919876543210',
              operationalEmail: 'ops@greentech.org',
            },
          },
        },
        include: { recyclerProfile: true },
      });
    }

    if (!collectorA || !collectorA.collectorProfile) {
      createdTempCollectorA = true;
      collectorA = await prisma.user.create({
        data: {
          email: `test_coll_a_${Date.now()}@ecosetu.org`,
          passwordHash: 'hash',
          name: 'Collector Rajesh',
          phone: '+919123456780',
          role: ROLES.INFORMAL_COLLECTOR,
          status: USER_STATUS.ACTIVE,
          collectorProfile: {
            create: {
              city: 'Brahmapur',
              state: 'Odisha',
            },
          },
        },
        include: { collectorProfile: true },
      });
    }

    if (!collectorB || !collectorB.collectorProfile) {
      createdTempCollectorB = true;
      collectorB = await prisma.user.create({
        data: {
          email: `test_coll_b_${Date.now()}@ecosetu.org`,
          passwordHash: 'hash',
          name: 'Collector Sunita',
          phone: '+919123456781',
          role: ROLES.INFORMAL_COLLECTOR,
          status: USER_STATUS.ACTIVE,
          collectorProfile: {
            create: {
              city: 'Brahmapur',
              state: 'Odisha',
            },
          },
        },
        include: { collectorProfile: true },
      });
    }

    if (!adminUser) {
      createdTempAdmin = true;
      adminUser = await prisma.user.create({
        data: {
          email: `test_admin_${Date.now()}@ecosetu.org`,
          passwordHash: 'hash',
          name: 'Admin Supervisor',
          role: ROLES.ADMIN,
          status: USER_STATUS.ACTIVE,
        },
      });
    }

    const recyclerProfileId = recyclerUser.recyclerProfile.id;

    // Create temporary lot A owned by Collector A
    tempLotA = await prisma.materialLot.create({
      data: {
        referenceNumber: `LOT-PRIV-A-${Date.now()}`,
        collectorId: collectorA.collectorProfile.id,
        category: 'PCB',
        status: 'OPEN',
      },
    });

    // Create temporary lot B owned by Collector B
    tempLotB = await prisma.materialLot.create({
      data: {
        referenceNumber: `LOT-PRIV-B-${Date.now()}`,
        collectorId: collectorB.collectorProfile.id,
        category: 'PCB',
        status: 'OPEN',
      },
    });

    console.log('─── TEST 1: Collector without eligible interaction ──────────────────');
    const resNoInteraction = await recyclerService.getRecyclerById(recyclerProfileId, {
      requester: { id: collectorB.id, role: ROLES.INFORMAL_COLLECTOR },
    });

    if (
      resNoInteraction.operationalPhone === null &&
      resNoInteraction.operationalEmail === null &&
      resNoInteraction.contact.phone === null &&
      resNoInteraction.contact.email === null &&
      resNoInteraction.contact.isLocked === true &&
      resNoInteraction.canAccessContact === false &&
      resNoInteraction.user.phone === undefined &&
      resNoInteraction.user.email === undefined
    ) {
      pass('TEST 1: Collector without eligible interaction receives locked/masked contact');
    } else {
      fail('TEST 1: Contact leaked to collector without interaction', new Error(JSON.stringify(resNoInteraction.contact)));
    }

    console.log('─── TEST 2: Directory endpoint leakage check ───────────────────────');
    const directoryRes = await recyclerService.listVerifiedRecyclers({}, { id: collectorA.id, role: ROLES.INFORMAL_COLLECTOR });
    const hasDirectoryLeak = directoryRes.recyclers.some(
      (r) => r.operationalPhone !== null || r.operationalEmail !== null || (r.user && (r.user.phone || r.user.email))
    );

    if (!hasDirectoryLeak) {
      pass('TEST 2: Directory endpoint strictly strips all phone/email fields for collectors');
    } else {
      fail('TEST 2: Directory endpoint leaks private contact information', new Error('Directory leak detected'));
    }

    console.log('─── TEST 3: Collector supplying another user\'s lot ───────────────────');
    let rejectedUnauthorizedLot = false;
    try {
      await recyclerService.getRecyclerById(recyclerProfileId, {
        requester: { id: collectorA.id, role: ROLES.INFORMAL_COLLECTOR },
        lotId: tempLotB.id, // Collector A attempts to use Collector B's lot
      });
    } catch (err) {
      if (err.statusCode === 403 || err.message.includes('another collector')) {
        rejectedUnauthorizedLot = true;
      }
    }

    if (rejectedUnauthorizedLot) {
      pass('TEST 3: Collector supplying another collector\'s lot is strictly rejected with 403 Forbidden');
    } else {
      fail('TEST 3: Bypassed lot ownership check', new Error('Expected 403 Forbidden'));
    }

    console.log('─── TEST 4: Unauthenticated request privacy check ──────────────────');
    const unauthRes = await recyclerService.getRecyclerById(recyclerProfileId, {
      requester: null,
    });

    if (
      unauthRes.operationalPhone === null &&
      unauthRes.operationalEmail === null &&
      unauthRes.contact.isLocked === true &&
      unauthRes.canAccessContact === false
    ) {
      pass('TEST 4: Unauthenticated request receives strictly locked contact data');
    } else {
      fail('TEST 4: Contact leaked on unauthenticated request', new Error(JSON.stringify(unauthRes.contact)));
    }

    console.log('─── TEST 5: Recycler accessing own profile ─────────────────────────');
    const ownProfileRes = await recyclerService.getRecyclerById(recyclerProfileId, {
      requester: { id: recyclerUser.id, role: ROLES.RECYCLER },
    });

    if (
      ownProfileRes.canAccessContact === true &&
      ownProfileRes.contact.isLocked === false
    ) {
      pass('TEST 5: Recycler accessing own profile preserves full contact visibility');
    } else {
      fail('TEST 5: Recycler own profile visibility failed', new Error(JSON.stringify(ownProfileRes.contact)));
    }

    console.log('─── TEST 6: Admin governance access ────────────────────────────────');
    const adminDetailRes = await recyclerService.getRecyclerById(recyclerProfileId, {
      requester: { id: adminUser.id, role: ROLES.ADMIN },
    });

    if (
      adminDetailRes.canAccessContact === true &&
      adminDetailRes.contact.isLocked === false
    ) {
      pass('TEST 6: Admin governance access preserves complete contact verification');
    } else {
      fail('TEST 6: Admin contact access failed', new Error(JSON.stringify(adminDetailRes.contact)));
    }

    console.log('─── TEST 7 & 10: Authorized business flow (Quote interaction) ──────');
    // Create an active Quote linking Lot A to Recycler
    tempQuote = await prisma.quote.create({
      data: {
        referenceNumber: `Q-PRIV-${Date.now()}`,
        materialLotId: tempLotA.id,
        recyclerId: recyclerProfileId,
        category: 'PCB',
        quotedUnitPrice: 150.00,
        quotedQuantity: 10.0,
        quotedTotal: 1500.00,
        status: 'SENT',
        validUntil: new Date(Date.now() + 86400000 * 7),
        createdById: recyclerUser.id,
      },
    });

    // Now Collector A queries recycler detail with lotId
    const resAuthorizedWithLot = await recyclerService.getRecyclerById(recyclerProfileId, {
      requester: { id: collectorA.id, role: ROLES.INFORMAL_COLLECTOR },
      lotId: tempLotA.id,
    });

    if (
      resAuthorizedWithLot.canAccessContact === true &&
      resAuthorizedWithLot.contact.isLocked === false &&
      (resAuthorizedWithLot.contact.phone || resAuthorizedWithLot.contact.email)
    ) {
      pass('TEST 7: Collector with eligible Lot interaction is legitimately granted contact access');
    } else {
      fail('TEST 7: Legitimate interaction failed to grant contact access', new Error(JSON.stringify(resAuthorizedWithLot.contact)));
    }

    // Collector A queries recycler detail without explicit lotId (general interaction check)
    const resAuthorizedGeneral = await recyclerService.getRecyclerById(recyclerProfileId, {
      requester: { id: collectorA.id, role: ROLES.INFORMAL_COLLECTOR },
    });

    if (
      resAuthorizedGeneral.canAccessContact === true &&
      resAuthorizedGeneral.contact.isLocked === false &&
      (resAuthorizedGeneral.contact.phone || resAuthorizedGeneral.contact.email)
    ) {
      pass('TEST 10: Collector with existing business relationship retains authorized contact access');
    } else {
      fail('TEST 10: General interaction authorization failed', new Error(JSON.stringify(resAuthorizedGeneral.contact)));
    }

    console.log('─── TEST 8 & 9: Static UI & Offline Privacy Checks ─────────────────');
    const path = require('path');
    const detailScreenContent = require('fs').readFileSync(path.join(__dirname, '../../mobile/src/screens/collector/CollectorRecyclerDetailScreen.tsx'), 'utf8');
    const directoryServiceContent = require('fs').readFileSync(path.join(__dirname, '../../mobile/src/services/recyclerDirectoryService.ts'), 'utf8');

    if (
      detailScreenContent.includes("contactLocked") &&
      detailScreenContent.includes("getRecyclerDetail(recyclerId, undefined, lotId)")
    ) {
      pass('TEST 8: CollectorRecyclerDetailScreen passes lotId and respects server privacy locking');
    } else {
      fail('TEST 8: Detail screen does not properly pass lotId or display locked notice', new Error('Pattern mismatch'));
    }

    if (
      directoryServiceContent.includes("lotId?: string") &&
      directoryServiceContent.includes("if (lotId) params.lotId = lotId")
    ) {
      pass('TEST 9: RecyclerDirectoryService correctly handles lotId parameter for privacy authorization');
    } else {
      fail('TEST 9: RecyclerDirectoryService missing lotId handling', new Error('Pattern mismatch'));
    }

  } finally {
    // Clean up temporary test records
    if (tempQuote) {
      await prisma.quote.delete({ where: { id: tempQuote.id } }).catch(() => {});
    }
    if (tempLotA) {
      await prisma.materialLot.delete({ where: { id: tempLotA.id } }).catch(() => {});
    }
    if (tempLotB) {
      await prisma.materialLot.delete({ where: { id: tempLotB.id } }).catch(() => {});
    }
    if (createdTempRecycler && recyclerUser) {
      await prisma.recyclerProfile.delete({ where: { id: recyclerUser.recyclerProfile.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: recyclerUser.id } }).catch(() => {});
    }
    if (createdTempCollectorA && collectorA) {
      await prisma.collectorProfile.delete({ where: { id: collectorA.collectorProfile.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: collectorA.id } }).catch(() => {});
    }
    if (createdTempCollectorB && collectorB) {
      await prisma.collectorProfile.delete({ where: { id: collectorB.collectorProfile.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: collectorB.id } }).catch(() => {});
    }
    if (createdTempAdmin && adminUser) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    }

    const finalCounts = {
      users: await prisma.user.count(),
      collectorProfiles: await prisma.collectorProfile.count(),
      recyclerProfiles: await prisma.recyclerProfile.count(),
      materialLots: await prisma.materialLot.count(),
      quotes: await prisma.quote.count(),
    };

    console.log('\n========================================================================');
    console.log('  TEST SUMMARY:');
    console.log(`  Passed: ${totalPassed}`);
    console.log(`  Failed: ${totalFailed}`);
    console.log('  Database row count diffs:', {
      users: finalCounts.users - initialCounts.users,
      materialLots: finalCounts.materialLots - initialCounts.materialLots,
      quotes: finalCounts.quotes - initialCounts.quotes,
    });
    console.log('========================================================================\n');

    if (totalFailed > 0) {
      process.exit(1);
    }
  }
}

run()
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
