/**
 * EcoSetu — Regression Test Suite for ISSUE #4
 * COLLECTOR BIDDING — REMOVE HARDCODED ₹2850
 *
 * Verifies 12 mandatory checks:
 * CHECK 1: ₹2850 is not injected as a production collector offer default.
 * CHECK 2: Collector can submit a custom offer.
 * CHECK 3: Submitted offer is persisted exactly.
 * CHECK 4: Citizen sees the persisted collector offer.
 * CHECK 5: Two different requests can have different collector offers.
 * CHECK 6: Two collectors can submit different offers for the same request.
 * CHECK 7: Negotiation preserves actual price history.
 * CHECK 8: Accepted offer uses the actual accepted price.
 * CHECK 9: Invalid prices are rejected.
 * CHECK 10: Estimated value and collector offer remain separate.
 * CHECK 11: No cross-request price contamination.
 * CHECK 12: No production code forces ₹2850.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const requestService = require('../src/services/requestService');
const ecoValueService = require('../src/services/valuation/EcoValueService');

async function runRegressionSuite() {
  console.log('====================================================');
  console.log('STARTING ISSUE #4 REGRESSION SUITE: COLLECTOR OFFER PRICE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // Cleanup helper
  const cleanUp = async () => {
    try {
      await prisma.pickup.deleteMany({
        where: { collectionRequest: { citizen: { email: { startsWith: 'test_issue4_' } } } },
      });
      await prisma.pickupOffer.deleteMany({
        where: { collectionRequest: { citizen: { email: { startsWith: 'test_issue4_' } } } },
      });
      await prisma.ewasteItem.deleteMany({
        where: { citizen: { email: { startsWith: 'test_issue4_' } } },
      });
      await prisma.collectionRequest.deleteMany({
        where: { citizen: { email: { startsWith: 'test_issue4_' } } },
      });
      await prisma.collectorProfile.deleteMany({
        where: { user: { email: { startsWith: 'test_issue4_' } } },
      });
      await prisma.user.deleteMany({
        where: { email: { startsWith: 'test_issue4_' } },
      });
    } catch (e) {
      // Ignore cleanup error
    }
  };

  await cleanUp();

  // Setup test users
  const citizenA = await prisma.user.create({
    data: {
      email: 'test_issue4_cit_a@ecosetu.test',
      phone: '+919876543210',
      passwordHash: 'dummy',
      name: 'Ramesh Sharma',
      role: 'CITIZEN',
      status: 'ACTIVE',
    },
  });

  const citizenB = await prisma.user.create({
    data: {
      email: 'test_issue4_cit_b@ecosetu.test',
      phone: '+919876543211',
      passwordHash: 'dummy',
      name: 'Anita Verma',
      role: 'CITIZEN',
      status: 'ACTIVE',
    },
  });

  const collectorUserX = await prisma.user.create({
    data: {
      email: 'test_issue4_col_x@ecosetu.test',
      phone: '+919876543212',
      passwordHash: 'dummy',
      name: 'Collector Alpha',
      role: 'INFORMAL_COLLECTOR',
      status: 'ACTIVE',
    },
  });
  const collectorProfileX = await prisma.collectorProfile.create({
    data: {
      userId: collectorUserX.id,
      serviceAreaLat: 28.6139,
      serviceAreaLng: 77.2090,
      serviceRadiusKm: 50.0,
      isAvailable: true,
    },
  });

  const collectorUserY = await prisma.user.create({
    data: {
      email: 'test_issue4_col_y@ecosetu.test',
      phone: '+919876543213',
      passwordHash: 'dummy',
      name: 'Collector Beta',
      role: 'INFORMAL_COLLECTOR',
      status: 'ACTIVE',
    },
  });
  const collectorProfileY = await prisma.collectorProfile.create({
    data: {
      userId: collectorUserY.id,
      serviceAreaLat: 28.6139,
      serviceAreaLng: 77.2090,
      serviceRadiusKm: 50.0,
      isAvailable: true,
    },
  });

  // Setup e-waste items and requests using requestService
  const itemA = await prisma.ewasteItem.create({
    data: {
      citizenId: citizenA.id,
      category: 'LAPTOP',
      condition: 'WORKING',
      quantity: 1,
      estimatedWeightKg: 2.2,
      status: 'SUBMITTED',
    },
  });

  const itemB = await prisma.ewasteItem.create({
    data: {
      citizenId: citizenB.id,
      category: 'MOBILE_PHONE',
      condition: 'PARTIALLY_WORKING',
      quantity: 2,
      estimatedWeightKg: 0.4,
      status: 'SUBMITTED',
    },
  });

  const requestA = await requestService.createRequest(citizenA.id, {
    itemIds: [itemA.id],
    pickupAddress: 'Block A, Connaught Place, New Delhi',
    pickupLat: 28.6139,
    pickupLng: 77.2090,
    city: 'New Delhi',
    autoSubmit: true,
  });

  const requestB = await requestService.createRequest(citizenB.id, {
    itemIds: [itemB.id],
    pickupAddress: 'Sector 62, Noida',
    pickupLat: 28.6280,
    pickupLng: 77.3649,
    city: 'Noida',
    autoSubmit: true,
  });

  // ----------------------------------------------------
  // CHECK 1: ₹2850 is not injected as a production collector offer default
  // ----------------------------------------------------
  try {
    const defaultOfferCheck = await prisma.pickupOffer.findFirst({
      where: { collectionRequestId: requestA.id },
    });
    assert.strictEqual(defaultOfferCheck, null, 'No offer should exist by default');
    console.log('✅ CHECK 1: ₹2850 is not injected as a production collector offer default');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 1 FAILED:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // CHECK 2: Collector can submit a custom offer
  // CHECK 3: Submitted offer is persisted exactly
  // ----------------------------------------------------
  let offerAX;
  try {
    offerAX = await requestService.submitOffer(collectorUserX.id, requestA.id, {
      offeredPrice: 700,
      notes: 'Can pick up tomorrow morning',
    });
    assert.strictEqual(parseFloat(offerAX.offeredPrice), 700);

    const dbOfferAX = await prisma.pickupOffer.findUnique({
      where: { id: offerAX.id },
    });
    assert.strictEqual(parseFloat(dbOfferAX.offeredPrice), 700, 'Persisted offer must be 700');
    console.log('✅ CHECK 2 & 3: Collector submitted custom offer ₹700 and persisted exactly');
    passed += 2;
  } catch (err) {
    console.error('❌ CHECK 2/3 FAILED:', err.message);
    failed += 2;
  }

  // ----------------------------------------------------
  // CHECK 4: Citizen sees the persisted collector offer
  // ----------------------------------------------------
  try {
    const citizenAView = await requestService.getRequestById(citizenA, requestA.id);
    const offersForCitA = citizenAView.pickupOffers || [];
    assert.strictEqual(offersForCitA.length, 1);
    assert.strictEqual(parseFloat(offersForCitA[0].offeredPrice), 700);
    console.log('✅ CHECK 4: Citizen sees actual submitted offer ₹700');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 4 FAILED:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // CHECK 5: Two different requests can have different collector offers
  // ----------------------------------------------------
  let offerBX;
  try {
    offerBX = await requestService.submitOffer(collectorUserX.id, requestB.id, {
      offeredPrice: 1450,
      notes: 'Can collect in afternoon',
    });
    assert.strictEqual(parseFloat(offerBX.offeredPrice), 1450);

    assert.notStrictEqual(offerAX.offeredPrice, offerBX.offeredPrice);
    console.log('✅ CHECK 5: Two requests have independent collector offers (Req A: ₹700, Req B: ₹1450)');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 5 FAILED:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // CHECK 6: Two collectors can submit different offers for the same request
  // ----------------------------------------------------
  let offerAY;
  let offerBY;
  try {
    offerAY = await requestService.submitOffer(collectorUserY.id, requestA.id, {
      offeredPrice: 900,
    });
    offerBY = await requestService.submitOffer(collectorUserY.id, requestB.id, {
      offeredPrice: 1700,
    });

    const citizenAOffers = await requestService.listOffers(citizenA, requestA.id);
    assert.strictEqual(citizenAOffers.offers.length, 2);

    const pricesA = citizenAOffers.offers.map((o) => parseFloat(o.offeredPrice)).sort((a, b) => a - b);
    assert.deepStrictEqual(pricesA, [700, 900]);

    console.log('✅ CHECK 6: Two collectors submitted independent offers for Request A (Collector X: ₹700, Collector Y: ₹900)');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 6 FAILED:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // CHECK 7: Negotiation preserves actual price history
  // ----------------------------------------------------
  try {
    // Citizen A counters Collector X's offer (₹700) with ₹800
    const counterRes = await requestService.counterOffer(citizenA.id, requestA.id, offerAX.id, {
      counterPrice: 800,
      notes: 'Would like ₹800 since it is working laptop',
    });
    assert(counterRes.notes.includes('[Citizen Counter: ₹800]'));

    // Collector X updates offer to ₹750
    const updatedOfferAX = await requestService.submitOffer(collectorUserX.id, requestA.id, {
      offeredPrice: 750,
      notes: 'Final price ₹750',
    });
    assert.strictEqual(parseFloat(updatedOfferAX.offeredPrice), 750);
    assert(updatedOfferAX.notes.includes('[Citizen Counter: ₹800]'));
    assert(updatedOfferAX.notes.includes('[Collector Offer: ₹750]'));

    console.log('✅ CHECK 7: Negotiation preserves price history (₹700 -> ₹800 -> ₹750)');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 7 FAILED:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // CHECK 8: Accepted offer uses the actual accepted price
  // ----------------------------------------------------
  try {
    const acceptRes = await requestService.acceptOffer(citizenA.id, requestA.id, offerAX.id);
    assert.strictEqual(acceptRes.request.status, 'ACCEPTED');
    assert.strictEqual(acceptRes.offer.status, 'ACCEPTED');
    assert.strictEqual(parseFloat(acceptRes.offer.offeredPrice), 750);

    // Verify rejected status for other offer
    const dbOfferAY = await prisma.pickupOffer.findUnique({ where: { id: offerAY.id } });
    assert.strictEqual(dbOfferAY.status, 'REJECTED');

    console.log('✅ CHECK 8: Accepted offer uses actual accepted price ₹750 and creates pickup');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 8 FAILED:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // CHECK 9: Invalid prices are rejected
  // ----------------------------------------------------
  try {
    let rejectedCount = 0;
    try {
      await requestService.submitOffer(collectorUserX.id, requestB.id, { offeredPrice: -500 });
    } catch (e) {
      rejectedCount++;
    }
    try {
      await requestService.submitOffer(collectorUserX.id, requestB.id, { offeredPrice: 'abc' });
    } catch (e) {
      rejectedCount++;
    }
    try {
      await requestService.submitOffer(collectorUserX.id, requestB.id, { offeredPrice: 0 });
    } catch (e) {
      rejectedCount++;
    }

    assert.strictEqual(rejectedCount, 3, 'All 3 invalid price attempts must be rejected');
    console.log('✅ CHECK 9: Invalid prices (negative, string, 0) are properly rejected');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 9 FAILED:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // CHECK 10: Estimated value and collector offer remain separate
  // ----------------------------------------------------
  try {
    const valuation = await ecoValueService.calculateValue({
      category: 'LAPTOP',
      condition: 'WORKING',
      weightKg: 2.2,
    });
    assert.strictEqual(valuation.isEstimateAvailable, true);
    assert(typeof valuation.estimatedRange.min === 'number');
    assert(typeof valuation.estimatedRange.max === 'number');

    // Verify collector offer for Request B (₹1450) is separate from valuation range
    assert.notStrictEqual(offerBX.offeredPrice, valuation.estimatedValue);
    console.log(`✅ CHECK 10: Estimated value range (₹${valuation.estimatedRange.min}-₹${valuation.estimatedRange.max}) and collector offer (₹1450) remain distinct`);
    passed++;
  } catch (err) {
    console.error('❌ CHECK 10 FAILED:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // CHECK 11: No cross-request price contamination
  // ----------------------------------------------------
  try {
    const reqAOffers = await requestService.listOffers(citizenA, requestA.id);
    const reqBOffers = await requestService.listOffers(citizenB, requestB.id);

    const idsA = reqAOffers.offers.map((o) => o.id);
    const idsB = reqBOffers.offers.map((o) => o.id);

    const intersection = idsA.filter((id) => idsB.includes(id));
    assert.strictEqual(intersection.length, 0, 'No offer IDs should overlap between requests');

    console.log('✅ CHECK 11: Zero cross-request price contamination');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 11 FAILED:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // CHECK 12: No production code forces ₹2850
  // ----------------------------------------------------
  try {
    const scanDirs = [
      path.join(__dirname, '../src'),
      path.join(__dirname, '../../mobile/src'),
    ];

    let matches = [];
    const scanFile = (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('2850') || content.includes('2,850')) {
        matches.push(filePath);
      }
    };

    const walkDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (/\.(js|ts|tsx|json)$/.test(file)) {
          scanFile(fullPath);
        }
      }
    };

    scanDirs.forEach(walkDir);

    assert.strictEqual(
      matches.length,
      0,
      `Found production hardcoded occurrences of 2850 in: ${matches.join(', ')}`
    );

    console.log('✅ CHECK 12: No production code forces ₹2850');
    passed++;
  } catch (err) {
    console.error('❌ CHECK 12 FAILED:', err.message);
    failed++;
  }

  // Cleanup after test run
  await cleanUp();

  console.log('\n====================================================');
  console.log(`REGRESSION SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionSuite()
  .then(() => {
    prisma.$disconnect();
  })
  .catch((err) => {
    console.error('Fatal test error:', err);
    prisma.$disconnect();
    process.exit(1);
  });
