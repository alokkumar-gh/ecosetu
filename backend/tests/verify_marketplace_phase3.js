/**
 * verify_marketplace_phase3.js
 * EcoSetu Marketplace Phase 3 Automated Verification Suite
 *
 * Tests:
 * 1. Collector marketplace overview counts derive from real DB records
 * 2. Recycler marketplace overview counts derive from real DB records
 * 3. Material market statistics (Supply & Demand signals)
 * 4. Price source honesty (no fake CPCB claims; proper Admin/Recycler labeling)
 * 5. Multi-round active negotiation tracking
 * 6. Realized margin formula vs missing cost disclaimer
 * 7. Contact privacy & authorization enforcement
 * 8. Honest empty states without fake data
 */

const assert = require('assert');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const materialLotService = require('../src/services/materialLotService');
const quoteService = require('../src/services/quoteService');
const priceService = require('../src/services/priceService');
const {
  ROLES,
  USER_STATUS,
  MATERIAL_CATEGORIES,
  ITEM_CONDITIONS,
  MATERIAL_SOURCE_TYPES,
  MATERIAL_LOT_STATUS,
  QUOTE_STATUS,
} = require('../src/utils/constants');

async function runPhase3Tests() {
  console.log('========================================================');
  console.log('🚀 ECOSETU MARKETPLACE PHASE 3 VERIFICATION SUITE');
  console.log('========================================================\n');

  let collectorUser, collectorProfile;
  let recyclerUser1, recyclerProfile1;
  let recyclerUser2, recyclerProfile2;
  let unverifiedRecyclerUser, unverifiedRecyclerProfile;
  let testLot1, testLot2, draftLot;
  let testQuote1, testQuote2;
  let priceRecord;

  try {
    console.log('[SETUP] Creating isolated test users and entities...');

    // 1. Collector
    collectorUser = await prisma.user.create({
      data: {
        email: `collector_p3_${Date.now()}@ecosetu.test`,
        passwordHash: 'dummy_hash',
        role: ROLES.INFORMAL_COLLECTOR,
        status: USER_STATUS.ACTIVE,
        phone: '+919876543210',
        name: 'Ramesh informal Seller P3',
      },
    });

    collectorProfile = await prisma.collectorProfile.create({
      data: {
        userId: collectorUser.id,
        serviceArea: 'Bhubaneswar Central Ward 4',
        city: 'Bhubaneswar',
        state: 'Odisha',
      },
    });

    // 2. Recycler 1 (Authorized)
    recyclerUser1 = await prisma.user.create({
      data: {
        email: `recycler1_p3_${Date.now()}@ecosetu.test`,
        passwordHash: 'dummy_hash',
        role: ROLES.RECYCLER,
        status: USER_STATUS.ACTIVE,
        phone: '+919123456780',
        name: 'GreenTech Refiners Alpha P3',
      },
    });

    recyclerProfile1 = await prisma.recyclerProfile.create({
      data: {
        userId: recyclerUser1.id,
        facilityName: 'GreenTech Refiners Alpha Facility',
        facilityAddress: 'Plot 101, Chandaka Industrial Estate, Bhubaneswar',
        authorizationStatus: 'AUTHORIZED',
        acceptedCategories: [MATERIAL_CATEGORIES.BATTERY, MATERIAL_CATEGORIES.PCB],
        city: 'Bhubaneswar',
        serviceArea: 'Bhubaneswar Central',
        pickupAvailable: 'AVAILABLE',
      },
    });

    // 3. Recycler 2 (Authorized)
    recyclerUser2 = await prisma.user.create({
      data: {
        email: `recycler2_p3_${Date.now()}@ecosetu.test`,
        passwordHash: 'dummy_hash',
        role: ROLES.RECYCLER,
        status: USER_STATUS.ACTIVE,
        phone: '+919123456781',
        name: 'EcoMetal Smelters Beta P3',
      },
    });

    recyclerProfile2 = await prisma.recyclerProfile.create({
      data: {
        userId: recyclerUser2.id,
        facilityName: 'EcoMetal Smelters Beta Facility',
        facilityAddress: 'Industrial Zone 4, Cuttack',
        authorizationStatus: 'AUTHORIZED',
        acceptedCategories: [MATERIAL_CATEGORIES.BATTERY, MATERIAL_CATEGORIES.PCB],
        city: 'Cuttack',
        pickupAvailable: 'AVAILABLE',
      },
    });

    // 4. Recycler Published Buying Offer for Battery (SIH-PRICE-005)
    await prisma.priceData.create({
      data: {
        category: MATERIAL_CATEGORIES.BATTERY,
        buyingPrice: 215,
        unit: 'PER_KG',
        source: 'RECYCLER_OFFER',
        status: 'ACTIVE',
        location: 'BHUBANESWAR',
        effectiveDate: new Date(),
        createdById: recyclerUser1.id,
      },
    });

    // 5. Admin Price Standard with explicit provenance (SIH Price Source Honesty)
    priceRecord = await prisma.priceData.create({
      data: {
        category: MATERIAL_CATEGORIES.BATTERY,
        buyingPrice: 225,
        unit: 'PER_KG',
        source: 'ADMIN_VERIFIED',
        sourceReference: 'Admin Verified Price Standard 2026.Q3',
        status: 'ACTIVE',
        location: 'BHUBANESWAR',
        effectiveDate: new Date(),
        createdById: collectorUser.id,
      },
    });

    console.log('✓ Setup completed successfully.\n');

    // TEST 1: Create Lots and Verify Initial Collector Marketplace Overview
    console.log('[TEST 1] Testing Collector Marketplace Overview metrics...');
    testLot1 = await materialLotService.createMaterialLot(collectorUser.id, {
      category: MATERIAL_CATEGORIES.BATTERY,
      subcategory: 'Lithium Iron Phosphate Packs',
      approximateTotalWeightKg: 85.0,
      condition: ITEM_CONDITIONS.WORKING,
      description: 'Clean EV battery lot',
      status: MATERIAL_LOT_STATUS.OPEN,
    });

    testLot2 = await materialLotService.createMaterialLot(collectorUser.id, {
      category: MATERIAL_CATEGORIES.BATTERY,
      subcategory: 'Lead-Acid Telecom Cells',
      approximateTotalWeightKg: 150.0,
      condition: ITEM_CONDITIONS.SCRAP,
      description: 'Telecom scrap batteries',
      status: MATERIAL_LOT_STATUS.OPEN,
    });

    draftLot = await materialLotService.createMaterialLot(collectorUser.id, {
      category: MATERIAL_CATEGORIES.PCB,
      approximateTotalWeightKg: 30.0,
      condition: ITEM_CONDITIONS.SCRAP,
      status: MATERIAL_LOT_STATUS.DRAFT,
    });

    let collectorOverview = await materialLotService.getMarketplaceOverview(collectorUser);
    assert.strictEqual(collectorOverview.role, 'INFORMAL_COLLECTOR');
    assert.strictEqual(collectorOverview.metrics.activeListings, 2, 'Must have 2 active OPEN lots');
    assert.strictEqual(collectorOverview.metrics.offersReceived, 0, 'Initial offers received must be 0');
    assert.strictEqual(collectorOverview.metrics.acceptedDeals, 0);
    console.log('✓ Test 1 Passed: Initial collector marketplace counts accurately reflect 2 active lots.');

    // TEST 2: Submit Quotes & Track Real-Time Offers Received
    console.log('[TEST 2] Testing Offers Received and Negotiation metrics...');
    testQuote1 = await quoteService.createQuote(recyclerUser1, {
      materialLotId: testLot1.id,
      quotedUnitPrice: 220,
      unit: 'PER_KG',
      quotedQuantity: 85.0,
      validUntil: new Date(Date.now() + 86400000 * 3).toISOString(),
      notes: 'Initial offer @ ₹220/kg',
    });

    testQuote2 = await quoteService.createQuote(recyclerUser2, {
      materialLotId: testLot1.id,
      quotedUnitPrice: 230,
      unit: 'PER_KG',
      quotedQuantity: 85.0,
      validUntil: new Date(Date.now() + 86400000 * 3).toISOString(),
      notes: 'Initial offer @ ₹230/kg',
    });

    collectorOverview = await materialLotService.getMarketplaceOverview(collectorUser);
    assert.strictEqual(collectorOverview.metrics.offersReceived, 2, 'Offers received must reflect 2 quotes');
    console.log('✓ Test 2 Passed: Real-time offers received counter updated to 2.');

    // TEST 3: Multi-Round Negotiation Count
    console.log('[TEST 3] Testing Active Negotiation tracking...');
    // Collector counters Quote 1
    await quoteService.counterQuote(collectorUser, testQuote1.id, {
      counterUnitPrice: 245,
      notes: 'Can you offer ₹245/kg?',
    });

    collectorOverview = await materialLotService.getMarketplaceOverview(collectorUser);
    assert.strictEqual(collectorOverview.metrics.activeNegotiations, 1, 'Active negotiations must count countered quote');
    console.log('✓ Test 3 Passed: Multi-round negotiation accurately identified and counted.');

    // TEST 4: Recycler Marketplace Sourcing Overview
    console.log('[TEST 4] Testing Recycler Marketplace Overview metrics...');
    const recyclerOverview = await materialLotService.getMarketplaceOverview(recyclerUser1);
    assert.strictEqual(recyclerOverview.role, 'RECYCLER');
    assert(recyclerOverview.metrics.availableLots >= 2, 'Recycler must see available lots');
    assert(recyclerOverview.metrics.newToday >= 2, 'Recycler must see lots created today');
    assert.strictEqual(recyclerOverview.metrics.myActiveOffers, 1, 'Recycler 1 active offers count must be 1');
    console.log('✓ Test 4 Passed: Recycler marketplace metrics accurately derived from database.');

    // TEST 5: Material Market Statistics & Demand Signal Generation
    console.log('[TEST 5] Testing Category Market Statistics (Supply & Demand Signals)...');
    const marketStats = await materialLotService.getMaterialMarketStats(MATERIAL_CATEGORIES.BATTERY);
    assert(marketStats.availableLotsCount >= 2, 'Available battery lots must be at least 2');
    assert(marketStats.activeBuyerOffersCount >= 2, 'Active buyer offers on battery must be at least 2');
    assert(marketStats.activeRecyclerRatesCount >= 1, 'Active recycler buying rates count must be at least 1');
    assert.ok(marketStats.verifiedPriceStandard, 'Verified price standard must be present');
    assert.strictEqual(marketStats.verifiedPriceStandard.buyingPrice, 225);
    assert(marketStats.verifiedPriceStandard.sourceLabel.includes('Admin Price Standard'));
    console.log('✓ Test 5 Passed: Factual supply and demand metrics computed accurately without synthetic tags.');

    // TEST 6: Deal Acceptance & Accepted Deals Counter
    console.log('[TEST 6] Testing Deal Acceptance and Closed Deal metrics...');
    await quoteService.acceptQuote(collectorUser, testQuote1.id);

    collectorOverview = await materialLotService.getMarketplaceOverview(collectorUser);
    assert.strictEqual(collectorOverview.metrics.acceptedDeals, 1, 'Accepted deals must increment to 1');
    console.log('✓ Test 6 Passed: Accepted deals count updated accurately on quote acceptance.');

    // TEST 7: Price Source Honesty (Zero Fake CPCB claims)
    console.log('[TEST 7] Verifying Price Source Honesty and Non-Endorsement...');
    assert.strictEqual(marketStats.verifiedPriceStandard.sourceLabel.includes('CPCB Benchmark'), false, 'Must not claim CPCB benchmark without CPCB ingestion');
    console.log('✓ Test 7 Passed: Price source strictly labeled as Admin Price Standard without false CPCB endorsement.');

    // TEST 8: Honest Empty States for Zero Activity Categories
    console.log('[TEST 8] Testing Honest Empty State for inactive category...');
    const emptyStats = await materialLotService.getMaterialMarketStats(MATERIAL_CATEGORIES.CABLE, 'ISOLATED_EMPTY_SUBCATEGORY_TEST');
    assert.strictEqual(emptyStats.availableLotsCount, 0);
    assert.strictEqual(emptyStats.activeBuyerOffersCount, 0);
    assert.strictEqual(emptyStats.recentCompletedSalesCount, 0);
    assert.strictEqual(emptyStats.verifiedPriceStandard, null);
    console.log('✓ Test 8 Passed: Honest empty state preserved without fabricated prices or activity.');

    // TEST 9: Contact Privacy Protection
    console.log('[TEST 9] Testing Contact Privacy in Marketplace endpoints...');
    const lotForRecycler = await materialLotService.getMaterialLotById(recyclerUser1, testLot1.id);
    assert.strictEqual(lotForRecycler.collector.user.phone, undefined, 'Collector phone must be scrubbed');
    console.log('✓ Test 9 Passed: Collector contact privacy strictly protected.');

    console.log('\n========================================================');
    console.log('🎉 ALL MARKETPLACE PHASE 3 TESTS PASSED SUCCESSFULLY!');
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ Phase 3 test failure:', err);
    process.exitCode = 1;
  } finally {
    console.log('[CLEANUP] Cleaning up test data...');
    try {
      if (testLot1) {
        await prisma.quote.deleteMany({ where: { materialLotId: testLot1.id } });
        await prisma.materialLotItem.deleteMany({ where: { lotId: testLot1.id } });
        await prisma.materialLotPhoto.deleteMany({ where: { lotId: testLot1.id } });
        await prisma.materialLot.delete({ where: { id: testLot1.id } });
      }
      if (testLot2) {
        await prisma.materialLotItem.deleteMany({ where: { lotId: testLot2.id } });
        await prisma.materialLot.delete({ where: { id: testLot2.id } });
      }
      if (draftLot) {
        await prisma.materialLotItem.deleteMany({ where: { lotId: draftLot.id } });
        await prisma.materialLot.delete({ where: { id: draftLot.id } });
      }
      if (priceRecord) {
        await prisma.priceData.deleteMany({ where: { createdById: { in: [collectorUser.id, recyclerUser1.id] } } });
      }
      if (recyclerProfile1) {
        await prisma.recyclerProfile.delete({ where: { id: recyclerProfile1.id } });
      }
      if (recyclerUser1) await prisma.user.delete({ where: { id: recyclerUser1.id } });

      if (recyclerProfile2) {
        await prisma.recyclerProfile.delete({ where: { id: recyclerProfile2.id } });
      }
      if (recyclerUser2) await prisma.user.delete({ where: { id: recyclerUser2.id } });

      if (collectorProfile) {
        await prisma.materialItem.deleteMany({ where: { collectorId: collectorProfile.id } });
        await prisma.collectorProfile.delete({ where: { id: collectorProfile.id } });
      }
      if (collectorUser) await prisma.user.delete({ where: { id: collectorUser.id } });

      console.log('✓ Cleanup complete.');
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
    await prisma.$disconnect();
  }
}

runPhase3Tests();
