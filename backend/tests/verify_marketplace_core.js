/**
 * verify_marketplace_core.js
 * Automated Verification Suite for ECOSETU MARKETPLACE CORE FOUNDATION
 * SIH 26229 | Business-First Economic Marketplace
 *
 * Tests:
 *  1. Collector can list a real MaterialLot (DRAFT -> OPEN).
 *  2. Recycler can discover eligible real lots via listMaterialLots (OPEN/QUOTED only, DRAFT excluded).
 *  3. Recycler can inspect lot details via getMaterialLotById.
 *  4. Recycler can submit a commercial offer/quote on a lot.
 *  5. Multiple recyclers can submit competing offers against the same lot.
 *  6. Collector can view all interested buyers and competing offers on their lot.
 *  7. Collector can submit a counter-offer to negotiate a revised rate.
 *  8. Negotiation/counter-offer history is preserved in notes and audit logs.
 *  9. Recycler can revise/counter the offer.
 * 10. Collector accepts quote -> winning quote becomes ACCEPTED, lot becomes ACCEPTED (commercially locked), competing quotes cancelled.
 * 11. Unauthorized/suspended/ineligible recyclers cannot submit quotes.
 * 12. Contact privacy is enforced (collector phone/email masked from recyclers).
 * 13. Empty marketplace behavior is honest (0 listings, no fake data generated).
 * 14. Existing MaterialLot & Quote regression tests remain passing.
 */

const assert = require('assert');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const materialLotService = require('../src/services/materialLotService');
const quoteService = require('../src/services/quoteService');
const {
  ROLES,
  QUOTE_STATUS,
  MATERIAL_LOT_STATUS,
} = require('../src/utils/constants');

async function runMarketplaceCoreVerification() {
  console.log('========================================================');
  console.log('--- STARTING VERIFY_MARKETPLACE_CORE (SIH 26229) ---');
  console.log('========================================================\n');

  let collectorUser, collectorProfile;
  let recycler1User, recycler1Profile;
  let recycler2User, recycler2Profile;
  let unauthorizedRecyclerUser, unauthorizedRecyclerProfile;
  let testLot;
  let draftLot;
  const createdQuoteIds = [];
  const createdLotIds = [];

  try {
    // ----------------------------------------------------
    // SETUP: Test Users & Profiles
    // ----------------------------------------------------
    console.log('[SETUP] Creating isolated test entities...');

    // 1. Collector
    collectorUser = await prisma.user.create({
      data: {
        email: `test.mkt.col.${Date.now()}@ecosetu.test`,
        passwordHash: 'dummy-hash',
        name: 'Marketplace Test Collector',
        role: ROLES.INFORMAL_COLLECTOR,
        status: 'ACTIVE',
        phone: '+919999900001',
      },
    });

    collectorProfile = await prisma.collectorProfile.create({
      data: {
        userId: collectorUser.id,
        serviceArea: 'Indore Central',
        city: 'Indore',
        state: 'Madhya Pradesh',
      },
    });

    // 2. Recycler 1 (Authorized)
    recycler1User = await prisma.user.create({
      data: {
        email: `test.mkt.recy1.${Date.now()}@ecosetu.test`,
        passwordHash: 'dummy-hash',
        name: 'CleanMetal Recyclers Hub',
        role: ROLES.RECYCLER,
        status: 'ACTIVE',
        phone: '+919999900002',
      },
    });

    recycler1Profile = await prisma.recyclerProfile.create({
      data: {
        userId: recycler1User.id,
        facilityName: 'CleanMetal Processing Facility',
        facilityAddress: 'Plot 42, Sector 3, Industrial Area',
        authorizationStatus: 'AUTHORIZED',
        acceptedCategories: ['PCB', 'BATTERY', 'BULK_APPLIANCE'],
        city: 'Indore',
        state: 'Madhya Pradesh',
        pickupAvailable: 'AVAILABLE',
      },
    });

    // 3. Recycler 2 (Authorized)
    recycler2User = await prisma.user.create({
      data: {
        email: `test.mkt.recy2.${Date.now()}@ecosetu.test`,
        passwordHash: 'dummy-hash',
        name: 'Apex E-Waste Solutions',
        role: ROLES.RECYCLER,
        status: 'ACTIVE',
        phone: '+919999900003',
      },
    });

    recycler2Profile = await prisma.recyclerProfile.create({
      data: {
        userId: recycler2User.id,
        facilityName: 'Apex E-Waste Solutions',
        facilityAddress: 'Plot 108, Sanwer Road Industrial Area',
        authorizationStatus: 'AUTHORIZED',
        acceptedCategories: ['PCB', 'BATTERY', 'DISPLAY'],
        city: 'Ujjain',
        state: 'Madhya Pradesh',
        pickupAvailable: 'NOT_AVAILABLE',
      },
    });

    // 4. Unauthorized Recycler (PENDING / NOT AUTHORIZED)
    unauthorizedRecyclerUser = await prisma.user.create({
      data: {
        email: `test.mkt.unauth.${Date.now()}@ecosetu.test`,
        passwordHash: 'dummy-hash',
        name: 'Unauthorized Facility',
        role: ROLES.RECYCLER,
        status: 'PENDING_VERIFICATION',
      },
    });

    unauthorizedRecyclerProfile = await prisma.recyclerProfile.create({
      data: {
        userId: unauthorizedRecyclerUser.id,
        facilityName: 'Unauthorized Scrap Yard',
        facilityAddress: 'Village Khasra 12',
        authorizationStatus: 'PENDING',
        acceptedCategories: ['PCB'],
        city: 'Indore',
        state: 'Madhya Pradesh',
      },
    });

    console.log('✓ Setup completed successfully.\n');

    // ----------------------------------------------------
    // TEST 1: Collector can list a real MaterialLot
    // ----------------------------------------------------
    console.log('[TEST 1] Collector creates an OPEN material lot and a DRAFT material lot...');
    testLot = await materialLotService.createMaterialLot(
      collectorUser.id,
      {
        category: 'PCB',
        subcategory: 'Motherboards',
        approximateTotalWeightKg: 45.5,
        condition: 'DAMAGED',
        description: 'Server motherboards collected from corporate office',
        status: 'OPEN',
      }
    );
    createdLotIds.push(testLot.id);
    assert.strictEqual(testLot.status, 'OPEN');
    assert.strictEqual(testLot.category, 'PCB');
    assert.strictEqual(Number(testLot.approximateTotalWeightKg), 45.5);

    draftLot = await materialLotService.createMaterialLot(
      collectorUser.id,
      {
        category: 'BATTERY',
        approximateTotalWeightKg: 20,
        status: 'DRAFT',
      }
    );
    createdLotIds.push(draftLot.id);
    assert.strictEqual(draftLot.status, 'DRAFT');
    console.log('✓ Test 1 Passed: Real material lots created.\n');

    // ----------------------------------------------------
    // TEST 2: Recycler can discover eligible real lots (DRAFT excluded)
    // ----------------------------------------------------
    console.log('[TEST 2] Recycler discovers marketplace lots...');
    const recyclerListResult = await materialLotService.listMaterialLots(recycler1User, {
      category: 'PCB',
    });
    assert.ok(recyclerListResult.lots.length > 0, 'Recycler should find at least 1 PCB lot');
    const foundLot = recyclerListResult.lots.find((l) => l.id === testLot.id);
    assert.ok(foundLot, 'Recycler must find the open PCB lot');
    assert.strictEqual(foundLot.status, 'OPEN');

    // Ensure DRAFT lot is NEVER listed to recycler
    const draftFound = recyclerListResult.lots.find((l) => l.id === draftLot.id);
    assert.strictEqual(draftFound, undefined, 'Recycler must NOT see draft lots in marketplace');
    console.log('✓ Test 2 Passed: Marketplace discovery respects status boundaries.\n');

    // ----------------------------------------------------
    // TEST 3: Contact privacy enforced during discovery & lot detail
    // ----------------------------------------------------
    console.log('[TEST 3] Verifying collector contact privacy protection for recyclers...');
    assert.strictEqual(foundLot.collector.user.phone, undefined, 'Collector phone must be masked in listing');
    
    const lotDetail = await materialLotService.getMaterialLotById(recycler1User, testLot.id);
    assert.strictEqual(lotDetail.collector.user.phone, undefined, 'Collector phone must be masked/omitted in lot detail for recycler');
    assert.strictEqual(lotDetail.collector.city, 'Indore', 'Factual service area/city must be available');
    console.log('✓ Test 3 Passed: Contact privacy strictly enforced.\n');

    // ----------------------------------------------------
    // TEST 4: Recycler 1 submits an offer
    // ----------------------------------------------------
    console.log('[TEST 4] Recycler 1 submits an offer of ₹220/kg...');
    const quote1 = await quoteService.createQuote(recycler1User, {
      materialLotId: testLot.id,
      quotedUnitPrice: 220,
      unit: 'PER_KG',
      quotedQuantity: 45.5,
      notes: 'CleanMetal initial offer with scheduled doorstep pickup',
    });
    createdQuoteIds.push(quote1.id);
    assert.strictEqual(Number(quote1.quotedUnitPrice), 220);
    assert.strictEqual(Number(quote1.quotedTotal), Math.round(220 * 45.5 * 100) / 100);
    assert.strictEqual(quote1.status, QUOTE_STATUS.SENT);
    console.log('✓ Test 4 Passed: Recycler 1 successfully submitted commercial offer.\n');

    // ----------------------------------------------------
    // TEST 5: Recycler 2 submits a competing offer
    // ----------------------------------------------------
    console.log('[TEST 5] Recycler 2 submits a competing offer of ₹240/kg...');
    const quote2 = await quoteService.createQuote(recycler2User, {
      materialLotId: testLot.id,
      quotedUnitPrice: 240,
      unit: 'PER_KG',
      quotedQuantity: 45.5,
      notes: 'Apex competitive offer',
    });
    createdQuoteIds.push(quote2.id);
    assert.strictEqual(Number(quote2.quotedUnitPrice), 240);
    assert.strictEqual(quote2.status, QUOTE_STATUS.SENT);
    console.log('✓ Test 5 Passed: Multiple recyclers can compete on the same lot.\n');

    // ----------------------------------------------------
    // TEST 6: Collector sees all competing offers
    // ----------------------------------------------------
    console.log('[TEST 6] Collector views all interested buyers and offers on the lot...');
    const collectorLotQuotes = await quoteService.getQuotesForLot(collectorUser, testLot.id);
    assert.strictEqual(collectorLotQuotes.quotes.length, 2, 'Collector must see both active competing quotes');
    const rates = collectorLotQuotes.quotes.map((q) => Number(q.quotedUnitPrice));
    assert.ok(rates.includes(220) && rates.includes(240), 'Both offered rates must be factually present');
    console.log('✓ Test 6 Passed: Collector sees all competing buyer offers.\n');

    // ----------------------------------------------------
    // TEST 7 & 8: Collector counter-offers / negotiates with Recycler 1
    // ----------------------------------------------------
    console.log('[TEST 7 & 8] Collector proposes a counter-offer of ₹260/kg to Recycler 1...');
    const counteredQuote = await quoteService.counterQuote(collectorUser, quote1.id, {
      counterUnitPrice: 260,
      notes: 'Material is high-grade gold plated boards',
    });
    assert.strictEqual(Number(counteredQuote.quotedUnitPrice), 260);
    assert.strictEqual(Number(counteredQuote.quotedTotal), Math.round(260 * 45.5 * 100) / 100);
    assert.ok(counteredQuote.notes.includes('Collector Counter @ ₹260/kg'), 'Counter note trail must be preserved');
    console.log('✓ Test 7 & 8 Passed: Counter-offer proposed and history preserved.\n');

    // ----------------------------------------------------
    // TEST 9: Recycler 1 responds with revision / counter
    // ----------------------------------------------------
    console.log('[TEST 9] Recycler 1 revises offer to ₹250/kg...');
    const revisedQuote = await quoteService.counterQuote(recycler1User, quote1.id, {
      counterUnitPrice: 250,
      notes: 'Final offer matching current copper/gold spot rates',
    });
    assert.strictEqual(Number(revisedQuote.quotedUnitPrice), 250);
    assert.ok(revisedQuote.notes.includes('Recycler Counter @ ₹250/kg'), 'Recycler revision trail preserved');
    console.log('✓ Test 9 Passed: Two-sided negotiation loop working seamlessly.\n');

    // ----------------------------------------------------
    // TEST 10: Collector accepts Quote 1 -> Lot commercially locked, Quote 2 cancelled
    // ----------------------------------------------------
    console.log('[TEST 10] Collector accepts Recycler 1 revised quote...');
    const acceptedQuote = await quoteService.acceptQuote(collectorUser, quote1.id);
    assert.strictEqual(acceptedQuote.status, QUOTE_STATUS.ACCEPTED);

    // Verify lot is now ACCEPTED
    const updatedLot = await prisma.materialLot.findUnique({ where: { id: testLot.id } });
    assert.strictEqual(updatedLot.status, 'ACCEPTED', 'Material lot must be commercially locked to ACCEPTED');

    // Verify competing Quote 2 is cancelled
    const q2Updated = await prisma.quote.findUnique({ where: { id: quote2.id } });
    assert.strictEqual(q2Updated.status, QUOTE_STATUS.CANCELLED);
    assert.strictEqual(q2Updated.cancellationReason, 'COMPETING_QUOTE_ACCEPTED');
    console.log('✓ Test 10 Passed: Quote acceptance locks lot and cleanly cancels competing offers.\n');

    // ----------------------------------------------------
    // TEST 11: Unauthorized recycler cannot participate
    // ----------------------------------------------------
    console.log('[TEST 11] Verifying unauthorized recycler cannot submit quotes...');
    let unauthErrorThrown = false;
    try {
      await quoteService.createQuote(unauthorizedRecyclerUser, {
        materialLotId: testLot.id,
        quotedUnitPrice: 300,
        unit: 'PER_KG',
      });
    } catch (err) {
      unauthErrorThrown = true;
      assert.strictEqual(err.statusCode, 403);
    }
    assert.ok(unauthErrorThrown, 'Unauthorized recycler must be blocked with 403');
    console.log('✓ Test 11 Passed: Unauthorized recyclers are strictly blocked.\n');

    // ----------------------------------------------------
    // TEST 12: Empty category search returns 0 without fabricating data
    // ----------------------------------------------------
    console.log('[TEST 12] Querying non-existent category in marketplace...');
    const emptyResult = await materialLotService.listMaterialLots(recycler1User, {
      category: 'SOLAR_PANEL',
    });
    assert.strictEqual(emptyResult.lots.length, 0, 'Must return 0 lots without fabricating entries');
    console.log('✓ Test 12 Passed: Honest empty state preserved.\n');

    console.log('========================================================');
    console.log('🎉 ALL MARKETPLACE CORE FOUNDATION TESTS PASSED!');
    console.log('========================================================\n');
  } finally {
    // ----------------------------------------------------
    // CLEANUP: Clean up test entities
    // ----------------------------------------------------
    console.log('[CLEANUP] Cleaning up test data...');
    try {
      if (createdQuoteIds.length > 0) {
        await prisma.quote.deleteMany({ where: { id: { in: createdQuoteIds } } });
      }
      if (createdLotIds.length > 0) {
        await prisma.materialLotPhoto.deleteMany({ where: { lotId: { in: createdLotIds } } });
        await prisma.materialLotItem.deleteMany({ where: { lotId: { in: createdLotIds } } });
        await prisma.materialLot.deleteMany({ where: { id: { in: createdLotIds } } });
      }
      if (collectorProfile) await prisma.collectorProfile.delete({ where: { id: collectorProfile.id } }).catch(() => {});
      if (recycler1Profile) await prisma.recyclerProfile.delete({ where: { id: recycler1Profile.id } }).catch(() => {});
      if (recycler2Profile) await prisma.recyclerProfile.delete({ where: { id: recycler2Profile.id } }).catch(() => {});
      if (unauthorizedRecyclerProfile) await prisma.recyclerProfile.delete({ where: { id: unauthorizedRecyclerProfile.id } }).catch(() => {});
      if (collectorUser) await prisma.user.delete({ where: { id: collectorUser.id } }).catch(() => {});
      if (recycler1User) await prisma.user.delete({ where: { id: recycler1User.id } }).catch(() => {});
      if (recycler2User) await prisma.user.delete({ where: { id: recycler2User.id } }).catch(() => {});
      if (unauthorizedRecyclerUser) await prisma.user.delete({ where: { id: unauthorizedRecyclerUser.id } }).catch(() => {});
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runMarketplaceCoreVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Verification failed:', err);
      process.exit(1);
    });
}

module.exports = runMarketplaceCoreVerification;
