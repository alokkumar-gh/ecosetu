/**
 * verify_issue11_daily_buying_rates.js
 *
 * Automated Regression & Verification Script for Issue #11: Recycler Daily Buying Rates
 * Checks all 15 mandatory requirements specified in ECOSETU Issue #11.
 */

const prisma = require('../src/config/database');
const recyclerRateService = require('../src/services/recyclerRateService');
const { ROLES, RECYCLER_RATE_STATUS, RECYCLER_AUTHORIZATION_STATUS, USER_STATUS } = require('../src/utils/constants');
const fs = require('fs');
const path = require('path');

async function runVerification() {
  console.log('========================================');
  console.log('VERIFYING ISSUE 11: RECYCLER DAILY BUYING RATES');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  function record(checkNum, description, success, details = '') {
    if (success) {
      passed++;
      console.log(`[PASS] CHECK ${checkNum}: ${description} ${details}`);
    } else {
      failed++;
      console.error(`[FAIL] CHECK ${checkNum}: ${description} ${details}`);
    }
  }

  let recyclerUserA, recyclerProfileA;
  let recyclerUserB, recyclerProfileB;
  let adminUser, citizenUser;
  let rateA, rateB, historicalRate;

  try {
    const timestamp = Date.now();

    // Setup Test Recycler A
    recyclerUserA = await prisma.user.create({
      data: {
        email: `recycler_11a_${timestamp}@ecosetu.test`,
        phone: `+9198111${String(timestamp).slice(-5)}`,
        name: 'EcoRecycle Solutions',
        role: ROLES.RECYCLER,
        status: USER_STATUS.ACTIVE,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
        recyclerProfile: {
          create: {
            facilityName: 'EcoRecycle Facility A',
            facilityAddress: 'Industrial Area Phase 1',
            city: 'Delhi',
            district: 'New Delhi',
            state: 'Delhi',
            pincode: '110020',
            authorizationStatus: RECYCLER_AUTHORIZATION_STATUS.AUTHORIZED,
          },
        },
      },
      include: { recyclerProfile: true },
    });
    recyclerProfileA = recyclerUserA.recyclerProfile;

    // Setup Test Recycler B
    recyclerUserB = await prisma.user.create({
      data: {
        email: `recycler_11b_${timestamp}@ecosetu.test`,
        phone: `+9198222${String(timestamp).slice(-5)}`,
        name: 'Green Metal Processing',
        role: ROLES.RECYCLER,
        status: USER_STATUS.ACTIVE,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
        recyclerProfile: {
          create: {
            facilityName: 'Green Metal Facility B',
            facilityAddress: 'GIDC Industrial Estate',
            city: 'Ahmedabad',
            district: 'Ahmedabad',
            state: 'Gujarat',
            pincode: '380015',
            authorizationStatus: RECYCLER_AUTHORIZATION_STATUS.AUTHORIZED,
          },
        },
      },
      include: { recyclerProfile: true },
    });
    recyclerProfileB = recyclerUserB.recyclerProfile;

    // Setup Admin User
    adminUser = await prisma.user.create({
      data: {
        email: `admin_11_${timestamp}@ecosetu.test`,
        phone: `+9198999${String(timestamp).slice(-5)}`,
        name: 'Admin Supervisor',
        role: ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
      },
    });

    // Setup Citizen User
    citizenUser = await prisma.user.create({
      data: {
        email: `citizen_11_${timestamp}@ecosetu.test`,
        phone: `+9198777${String(timestamp).slice(-5)}`,
        name: 'Citizen User',
        role: ROLES.CITIZEN,
        status: USER_STATUS.ACTIVE,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
      },
    });

    // ----------------------------------------------------
    // CHECK 1: Current daily rates can be read
    // ----------------------------------------------------
    rateA = await recyclerRateService.createRate(
      {
        category: 'MOBILE_PHONE',
        rate: 150.0,
        sourceReference: 'Market Tariff 2026',
      },
      recyclerUserA
    );

    const listRes = await recyclerRateService.listRates({ recyclerId: recyclerProfileA.id });
    record(1, 'Current daily rates can be read', listRes.rates.length >= 1 && listRes.rates[0].id === rateA.id);

    // ----------------------------------------------------
    // CHECK 2: Historical rate records remain intact
    // ----------------------------------------------------
    historicalRate = await prisma.recyclerOfferedRate.create({
      data: {
        recyclerId: recyclerProfileA.id,
        category: 'BATTERY',
        rate: 45.0,
        sourceReference: 'Archived Rate 2025',
        status: RECYCLER_RATE_STATUS.INACTIVE,
        effectiveDate: new Date('2025-01-01'),
      },
    });
    await recyclerRateService.deleteRate(rateA.id, recyclerUserA);
    const softDeleted = await prisma.recyclerOfferedRate.findUnique({ where: { id: rateA.id } });
    record(
      2,
      'Historical rate records remain intact (soft deactivation)',
      softDeleted && softDeleted.status === RECYCLER_RATE_STATUS.INACTIVE
    );

    // Re-activate rateA for remaining tests
    await prisma.recyclerOfferedRate.update({
      where: { id: rateA.id },
      data: { status: RECYCLER_RATE_STATUS.ACTIVE },
    });

    // ----------------------------------------------------
    // CHECK 3: Correct date association
    // ----------------------------------------------------
    const specificDate = new Date('2026-09-27T00:00:00.000Z');
    const datedRate = await recyclerRateService.createRate(
      {
        category: 'DESKTOP_COMPUTER',
        rate: 120.0,
        sourceReference: 'Scheduled Price',
        effectiveDate: specificDate,
      },
      recyclerUserA
    );
    record(
      3,
      'Correct date association preserved',
      new Date(datedRate.effectiveDate).toISOString().startsWith('2026-09-27')
    );

    // ----------------------------------------------------
    // CHECK 4: Category isolation
    // ----------------------------------------------------
    const laptopRate = await recyclerRateService.createRate(
      {
        category: 'LAPTOP',
        rate: 350.0,
        sourceReference: 'IT Hardware Buying Rate',
      },
      recyclerUserA
    );
    record(
      4,
      'Category isolation maintained between MOBILE_PHONE and LAPTOP',
      laptopRate.category === 'LAPTOP' && rateA.category === 'MOBILE_PHONE' && laptopRate.rate !== rateA.rate
    );

    // ----------------------------------------------------
    // CHECK 5: Recycler A unauthorized modification blocked if not rate owner
    // ----------------------------------------------------
    rateB = await recyclerRateService.createRate(
      {
        category: 'MONITOR',
        rate: 90.0,
        sourceReference: 'Recycler B Offered Rate',
      },
      recyclerUserB
    );

    let recABlocked = false;
    try {
      await recyclerRateService.updateRate(rateB.id, { rate: 999.0 }, recyclerUserA);
    } catch (err) {
      if (err.statusCode === 403) recABlocked = true;
    }
    record(5, 'Recycler A unauthorized modification blocked for Recycler B rate', recABlocked);

    // ----------------------------------------------------
    // CHECK 6: Recycler B unauthorized modification blocked
    // ----------------------------------------------------
    let recBBlocked = false;
    try {
      await recyclerRateService.updateRate(rateA.id, { rate: 999.0 }, recyclerUserB);
    } catch (err) {
      if (err.statusCode === 403) recBBlocked = true;
    }
    record(6, 'Recycler B unauthorized modification blocked for Recycler A rate', recBBlocked);

    // ----------------------------------------------------
    // CHECK 7: Authorized role can modify rate
    // ----------------------------------------------------
    const updatedRateA = await recyclerRateService.updateRate(rateA.id, { rate: 175.0 }, recyclerUserA);
    record(7, 'Authorized rate owner (Recycler A) can modify own rate', Number(updatedRateA.rate) === 175.0);

    // ----------------------------------------------------
    // CHECK 8: IDOR modification blocked
    // ----------------------------------------------------
    let idorBlocked = false;
    try {
      await recyclerRateService.deleteRate(rateB.id, recyclerUserA);
    } catch (err) {
      if (err.statusCode === 403) idorBlocked = true;
    }
    record(8, 'IDOR deletion/mutation blocked across recycler boundaries', idorBlocked);

    // ----------------------------------------------------
    // CHECK 9: Unauthenticated / non-recycler modification blocked
    // ----------------------------------------------------
    let unauthBlocked = false;
    try {
      await recyclerRateService.updateRate(rateA.id, { rate: 500.0 }, citizenUser);
    } catch (err) {
      if (err.statusCode === 403) unauthBlocked = true;
    }
    record(9, 'Unauthenticated / Citizen modification blocked', unauthBlocked);

    // ----------------------------------------------------
    // CHECK 10: No hardcoded production rate overrides
    // ----------------------------------------------------
    const ratesScreenCode = fs.readFileSync(
      path.join(__dirname, '../../mobile/src/screens/recycler/RecyclerRatesScreen.tsx'),
      'utf8'
    );
    const noHardcode = !ratesScreenCode.includes('HARDCODED_RATES') && !ratesScreenCode.includes('defaultRatePerKg: 100');
    record(10, 'No hardcoded production rate overrides in RecyclerRatesScreen', noHardcode);

    // ----------------------------------------------------
    // CHECK 11: Current rate update does not corrupt historical rate
    // ----------------------------------------------------
    const currentRateA = await recyclerRateService.getRateById(rateA.id);
    const checkHistorical = await prisma.recyclerOfferedRate.findUnique({ where: { id: historicalRate.id } });
    record(
      11,
      'Current rate update does not corrupt historical rate',
      Number(currentRateA.rate) === 175.0 && Number(checkHistorical.rate) === 45.0
    );

    // ----------------------------------------------------
    // CHECK 12: One category update does not change another
    // ----------------------------------------------------
    const checkLaptop = await recyclerRateService.getRateById(laptopRate.id);
    record(
      12,
      'One category update (MOBILE_PHONE) did not alter another (LAPTOP)',
      Number(checkLaptop.rate) === 350.0 && Number(currentRateA.rate) === 175.0
    );

    // ----------------------------------------------------
    // CHECK 13: Marketplace/quote behavior remains correct
    // ----------------------------------------------------
    const publicRates = await recyclerRateService.getPublicRates({ category: 'MOBILE_PHONE' });
    record(
      13,
      'Marketplace public buying rate retrieval returns active verified rates',
      Array.isArray(publicRates) && publicRates.some(r => r.id === rateA.id)
    );

    // ----------------------------------------------------
    // CHECK 14: UI reflects backend-authoritative rate
    // ----------------------------------------------------
    const fetchAuthRates = await recyclerRateService.listRates({ recyclerId: recyclerProfileA.id, category: 'MOBILE_PHONE' });
    record(
      14,
      'UI-backing service returns authoritative backend rate',
      Number(fetchAuthRates.rates[0].rate) === 175.0
    );

    // ----------------------------------------------------
    // CHECK 15: No duplicate daily rate records created by normal update flow
    // ----------------------------------------------------
    await recyclerRateService.updateRate(rateA.id, { rate: 180.0 }, recyclerUserA);
    const countActiveMobile = await prisma.recyclerOfferedRate.count({
      where: {
        recyclerId: recyclerProfileA.id,
        category: 'MOBILE_PHONE',
        status: RECYCLER_RATE_STATUS.ACTIVE,
      },
    });
    record(15, 'No duplicate daily rate records created by normal update flow', countActiveMobile === 1);

  } catch (err) {
    console.error('Execution error during Issue 11 verification:', err);
    record(0, `Unexpected test crash: ${err.message}`, false);
  } finally {
    // Cleanup test data
    if (recyclerUserA) {
      await prisma.recyclerOfferedRate.deleteMany({ where: { recyclerId: recyclerProfileA.id } });
      await prisma.recyclerProfile.deleteMany({ where: { userId: recyclerUserA.id } });
      await prisma.user.delete({ where: { id: recyclerUserA.id } }).catch(() => {});
    }
    if (recyclerUserB) {
      await prisma.recyclerOfferedRate.deleteMany({ where: { recyclerId: recyclerProfileB.id } });
      await prisma.recyclerProfile.deleteMany({ where: { userId: recyclerUserB.id } });
      await prisma.user.delete({ where: { id: recyclerUserB.id } }).catch(() => {});
    }
    if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    if (citizenUser) await prisma.user.delete({ where: { id: citizenUser.id } }).catch(() => {});

    await prisma.$disconnect();
  }

  console.log('\n----------------------------------------');
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('----------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification();
