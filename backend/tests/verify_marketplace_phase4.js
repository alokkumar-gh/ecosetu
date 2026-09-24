/**
 * verify_marketplace_phase4.js
 * EcoSetu Marketplace Phase 4 Automated Verification Suite
 *
 * Verification Scope:
 * 1. Post-deal settlement lifecycle: ACCEPTED -> HANDOVER -> FINAL WEIGHT -> PRICE RECONCILIATION -> PAYMENT -> SETTLEMENT -> EARNINGS -> TRACEABILITY
 * 2. Immutable agreed quote rate preservation
 * 3. Exact server-authoritative price reconciliation (Final Weight × Agreed Rate)
 * 4. Quantity variance & adjustment calculation (Final Value vs Quoted Total)
 * 5. Payment method recording & statutory non-money-movement disclaimer
 * 6. Duplicate settlement prevention (idempotency)
 * 7. Collector earnings ledger consumption of real settlement records
 * 8. Recycler purchase history consumption with contact privacy
 * 9. Journey B end-to-end traceability chain verification
 * 10. Honest empty states for zero transaction history
 * 11. Strict tenancy and role-based authorization guards
 */

const assert = require('assert');
const prisma = require('../src/config/database');
const materialLotService = require('../src/services/materialLotService');
const quoteService = require('../src/services/quoteService');
const handoverService = require('../src/services/handoverService');
const transactionService = require('../src/services/transactionService');
const earningsService = require('../src/services/earningsService');
const lotTraceService = require('../src/services/lotTraceService');
const {
  ROLES,
  USER_STATUS,
  MATERIAL_CATEGORIES,
  ITEM_CONDITIONS,
  MATERIAL_LOT_STATUS,
  QUOTE_STATUS,
  HANDOVER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  TRANSACTION_STATUS,
  EARNINGS_PERIOD,
} = require('../src/utils/constants');

async function runPhase4Tests() {
  console.log('\n========================================================');
  console.log('🚀 ECOSETU MARKETPLACE PHASE 4 VERIFICATION SUITE');
  console.log('   (Post-Deal Settlement Lifecycle & Commercial Integrity)');
  console.log('========================================================\n');

  let collectorUser, collectorProfile;
  let recyclerUser1, recyclerProfile1;
  let recyclerUser2, recyclerProfile2;
  let outsiderCollectorUser, outsiderCollectorProfile;
  let testLot, testQuote, testHandover, testTransaction;

  try {
    console.log('[SETUP] Creating isolated test users and entities...');

    // 1. Collector User & Profile
    collectorUser = await prisma.user.create({
      data: {
        email: `collector_p4_${Date.now()}@ecosetu.test`,
        passwordHash: 'dummy_hash',
        role: ROLES.INFORMAL_COLLECTOR,
        status: USER_STATUS.ACTIVE,
        phone: '+919876543290',
        name: 'Ramesh Patel P4',
      },
    });

    collectorProfile = await prisma.collectorProfile.create({
      data: {
        userId: collectorUser.id,
        city: 'Bhubaneswar',
        state: 'Odisha',
        serviceArea: 'Bhubaneswar East',
        isAvailable: true,
      },
    });

    // 2. Outsider Collector (for tenancy tests)
    outsiderCollectorUser = await prisma.user.create({
      data: {
        email: `outsider_p4_${Date.now()}@ecosetu.test`,
        passwordHash: 'dummy_hash',
        role: ROLES.INFORMAL_COLLECTOR,
        status: USER_STATUS.ACTIVE,
        phone: '+919876543299',
        name: 'Suresh Kumar P4',
      },
    });

    outsiderCollectorProfile = await prisma.collectorProfile.create({
      data: {
        userId: outsiderCollectorUser.id,
        city: 'Cuttack',
        state: 'Odisha',
        serviceArea: 'Cuttack North',
        isAvailable: true,
      },
    });

    // 3. Authorized Recycler 1 (Counterparty Buyer)
    recyclerUser1 = await prisma.user.create({
      data: {
        email: `recycler1_p4_${Date.now()}@ecosetu.test`,
        passwordHash: 'dummy_hash',
        role: ROLES.RECYCLER,
        status: USER_STATUS.ACTIVE,
        phone: '+919123456790',
        name: 'GreenTech Refiners Alpha P4',
      },
    });

    recyclerProfile1 = await prisma.recyclerProfile.create({
      data: {
        userId: recyclerUser1.id,
        facilityName: 'GreenTech Refiners Alpha Facility',
        facilityAddress: 'Industrial Area Phase 2, Bhubaneswar',
        authorizationStatus: 'AUTHORIZED',
        acceptedCategories: [MATERIAL_CATEGORIES.BATTERY, MATERIAL_CATEGORIES.PCB],
        city: 'Bhubaneswar',
        pickupAvailable: 'AVAILABLE',
      },
    });

    // 4. Authorized Recycler 2 (Non-party Recycler)
    recyclerUser2 = await prisma.user.create({
      data: {
        email: `recycler2_p4_${Date.now()}@ecosetu.test`,
        passwordHash: 'dummy_hash',
        role: ROLES.RECYCLER,
        status: USER_STATUS.ACTIVE,
        phone: '+919123456791',
        name: 'Apex Metals Beta P4',
      },
    });

    recyclerProfile2 = await prisma.recyclerProfile.create({
      data: {
        userId: recyclerUser2.id,
        facilityName: 'Apex Metals Beta Facility',
        facilityAddress: 'Sector 5, Bhubaneswar',
        authorizationStatus: 'AUTHORIZED',
        acceptedCategories: [MATERIAL_CATEGORIES.BATTERY],
        city: 'Bhubaneswar',
        pickupAvailable: 'AVAILABLE',
      },
    });

    console.log('✓ Setup completed successfully.\n');

    // =========================================================================
    // TEST 1: Deal Creation, Quoting & Acceptance
    // =========================================================================
    console.log('[TEST 1] Testing Material Lot creation, quoting, and deal acceptance...');
    testLot = await materialLotService.createMaterialLot(collectorUser.id, {
      category: MATERIAL_CATEGORIES.BATTERY,
      subcategory: 'Lithium Iron Phosphate EV Battery Lot',
      approximateTotalWeightKg: 85.0,
      condition: ITEM_CONDITIONS.WORKING,
      description: 'Clean tested EV cells',
      status: MATERIAL_LOT_STATUS.OPEN,
    });

    testQuote = await quoteService.createQuote(recyclerUser1, {
      materialLotId: testLot.id,
      quotedUnitPrice: 210.0,
      unit: 'PER_KG',
      notes: 'Commercial agreed offer for battery lot',
    });

    assert.strictEqual(Number(testQuote.quotedUnitPrice), 210.0, 'Agreed unit price must match input');
    assert.strictEqual(Number(testQuote.quotedTotal), 17850.0, 'Quoted total must be 85kg * 210 = 17850');

    // Collector accepts the quote (locks deal terms)
    const acceptedQuote = await quoteService.acceptQuote(collectorUser, testQuote.id);
    assert.strictEqual(acceptedQuote.status, QUOTE_STATUS.ACCEPTED, 'Quote must be in ACCEPTED status');
    console.log('✓ Test 1 Passed: Commercial deal locked with immutable agreed rate ₹210.00/kg.');

    // =========================================================================
    // TEST 2: Handover Initiation & State Validation
    // =========================================================================
    console.log('[TEST 2] Testing Handover initiation for accepted deal...');
    testHandover = await handoverService.createHandover(collectorUser, {
      materialLotId: testLot.id,
      quoteId: testQuote.id,
      declaredWeightKg: 85.0,
    });

    assert.strictEqual(testHandover.status, HANDOVER_STATUS.PENDING_COLLECTOR);
    assert.strictEqual(Number(testHandover.declaredWeightKg), 85.0);

    // Verify unaccepted quote cannot initiate handover
    const unacceptedLot = await materialLotService.createMaterialLot(collectorUser.id, {
      category: MATERIAL_CATEGORIES.BATTERY,
      approximateTotalWeightKg: 10.0,
      status: MATERIAL_LOT_STATUS.OPEN,
    });
    const unacceptedQuote = await quoteService.createQuote(recyclerUser1, {
      materialLotId: unacceptedLot.id,
      quotedUnitPrice: 200.0,
    });
    await assert.rejects(
      async () => {
        await handoverService.createHandover(collectorUser, {
          materialLotId: unacceptedLot.id,
          quoteId: unacceptedQuote.id,
        });
      },
      (err) => err.statusCode === 400 && err.message.includes('ACCEPTED'),
      'Unaccepted quote must not initiate handover'
    );
    console.log('✓ Test 2 Passed: Handover requires strictly ACCEPTED quote.');

    // =========================================================================
    // TEST 3: Final Verified Weight Capture & Multi-Party Confirmation
    // =========================================================================
    console.log('[TEST 3] Testing Final Verified Weight capture and multi-party confirmation...');
    // Collector records and confirms final verified weight: 80.5 kg (vs 85.0 kg estimated)
    const collectorConfirmed = await handoverService.collectorConfirm(collectorUser, testHandover.id, {
      handoverWeightKg: 80.5,
      notes: 'Final digital scale verified weight',
    });
    assert.strictEqual(Number(collectorConfirmed.handoverWeightKg), 80.5);

    // Recycler confirms final weight receipt
    const fullyConfirmedHandover = await handoverService.recyclerConfirm(recyclerUser1, testHandover.id, {
      handoverWeightKg: 80.5,
      notes: 'Verified and received at facility gate',
    });
    assert.strictEqual(fullyConfirmedHandover.status, HANDOVER_STATUS.CONFIRMED);
    assert.strictEqual(Number(fullyConfirmedHandover.handoverWeightKg), 80.5);
    console.log('✓ Test 3 Passed: Final verified weight of 80.5 kg captured and confirmed by both parties.');

    // =========================================================================
    // TEST 4: Server-Authoritative Price Reconciliation & Adjustment Calculation
    // =========================================================================
    console.log('[TEST 4] Testing Price Reconciliation and Adjustment calculation...');
    // Agreed Rate = ₹210.00/kg
    // Final Verified Weight = 80.5 kg
    // Expected Final Payable = 80.5 * 210 = ₹16,905.00
    // Estimated Quoted Total = 85.0 * 210 = ₹17,850.00
    // Expected Adjustment = 16905 - 17850 = -₹945.00
    testTransaction = await transactionService.createTransaction(collectorUser, {
      handoverId: testHandover.id,
      finalUnitPrice: 210.0,
      finalSaleValue: 16905.0,
      paymentMethod: PAYMENT_METHOD.CASH,
      paymentStatus: PAYMENT_STATUS.PAID,
      notes: 'Full cash settlement upon weight verification',
    });

    assert.strictEqual(testTransaction.referenceNumber.startsWith('TXN-'), true);
    assert.strictEqual(Number(testTransaction.finalSaleValue), 16905.0);
    assert.strictEqual(Number(testTransaction.quotedUnitPrice), 210.0);
    assert.strictEqual(Number(testTransaction.quantity), 80.5);
    assert.strictEqual(testTransaction.differenceFromQuote, -945.0, 'Adjustment must be -₹945.00');
    assert.strictEqual(testTransaction.isPriceAdjusted, true, 'isPriceAdjusted must be true');
    assert.strictEqual(testTransaction.disclaimer.includes('ECOSETU does not transfer money'), true);
    console.log('✓ Test 4 Passed: Server price reconciliation verified (80.5 kg × ₹210.00/kg = ₹16,905.00, Δ -₹945.00).');

    // =========================================================================
    // TEST 5: Atomic Lifecycle Completion
    // =========================================================================
    console.log('[TEST 5] Verifying MaterialLot status transitioned to COMPLETED...');
    const refreshedLot = await materialLotService.getMaterialLotById(collectorUser, testLot.id);
    assert.strictEqual(refreshedLot.status, MATERIAL_LOT_STATUS.COMPLETED, 'Lot must transition to COMPLETED');
    console.log('✓ Test 5 Passed: Lot lifecycle cleanly transitioned to COMPLETED.');

    // =========================================================================
    // TEST 6: Duplicate Settlement Prevention (Idempotency)
    // =========================================================================
    console.log('[TEST 6] Testing duplicate settlement prevention...');
    await assert.rejects(
      async () => {
        await transactionService.createTransaction(collectorUser, {
          handoverId: testHandover.id,
          finalSaleValue: 16905.0,
          paymentMethod: PAYMENT_METHOD.CASH,
        });
      },
      (err) => err.statusCode === 409,
      'Duplicate transaction creation on settled handover must throw 409 Conflict'
    );
    console.log('✓ Test 6 Passed: Duplicate settlement attempt safely rejected.');

    // =========================================================================
    // TEST 7: Collector Earnings Ledger Integration
    // =========================================================================
    console.log('[TEST 7] Verifying Collector Earnings Ledger integration...');
    const earningsSummary = await earningsService.getEarningsSummary(collectorUser, {
      period: EARNINGS_PERIOD.ALL_TIME,
    });

    assert.strictEqual(Number(earningsSummary.totalRecordedSales), 16905.0, 'Total recorded sales must equal ₹16,905.00');
    assert.strictEqual(Number(earningsSummary.totalPaid), 16905.0, 'Total paid must equal ₹16,905.00');
    assert.strictEqual(earningsSummary.paidTransactionCount, 1, 'Paid transaction count must be 1');

    const earningsTx = await earningsService.getEarningsTransactions(collectorUser);
    assert.strictEqual(earningsTx.total, 1);
    assert.strictEqual(earningsTx.transactions[0].referenceNumber, testTransaction.referenceNumber);
    assert.strictEqual(Number(earningsTx.transactions[0].finalSaleValue), 16905.0);
    console.log('✓ Test 7 Passed: Collector earnings ledger accurately reflects settled commercial transaction.');

    // =========================================================================
    // TEST 8: Recycler Purchase History & Contact Privacy
    // =========================================================================
    console.log('[TEST 8] Verifying Recycler Purchase History & Contact Privacy...');
    const recyclerTransactions = await transactionService.getTransactions(recyclerUser1);
    assert.strictEqual(recyclerTransactions.total, 1);
    assert.strictEqual(recyclerTransactions.transactions[0].referenceNumber, testTransaction.referenceNumber);

    // Verify contact privacy: collector phone must be scrubbed for recycler
    assert.strictEqual(
      recyclerTransactions.transactions[0].collector.user.phone,
      undefined,
      'Collector phone must not be exposed in recycler transaction view'
    );
    console.log('✓ Test 8 Passed: Recycler purchase history reflects transaction with strict contact privacy.');

    // =========================================================================
    // TEST 9: Journey B Traceability Chain Integration
    // =========================================================================
    console.log('[TEST 9] Verifying Journey B Traceability Chain integrity...');
    const trace = await lotTraceService.getLotTrace(collectorUser, testLot.id);
    assert.strictEqual(trace.lot.id, testLot.id);
    assert.strictEqual(trace.quotes.length, 1);
    assert.strictEqual(trace.quotes[0].status, QUOTE_STATUS.ACCEPTED);
    assert.strictEqual(trace.handover.status, HANDOVER_STATUS.CONFIRMED);
    assert.strictEqual(trace.transaction.referenceNumber, testTransaction.referenceNumber);
    assert.strictEqual(Number(trace.transaction.finalSaleValue), 16905.0);
    assert.strictEqual(trace.payment.status, PAYMENT_STATUS.PAID);
    console.log('✓ Test 9 Passed: Journey B traceability links full lifecycle from Lot -> Quote -> Handover -> Final Weight -> Payment -> Settlement.');

    // =========================================================================
    // TEST 10: Security & Tenancy Isolation
    // =========================================================================
    console.log('[TEST 10] Testing Tenancy Isolation and unauthorized access guards...');
    // Outside collector cannot view this transaction
    await assert.rejects(
      async () => {
        await transactionService.getTransactionById(outsiderCollectorUser, testTransaction.id);
      },
      (err) => err.statusCode === 403,
      'Outside collector must be blocked (403 Forbidden)'
    );

    // Unrelated recycler cannot view this transaction
    await assert.rejects(
      async () => {
        await transactionService.getTransactionById(recyclerUser2, testTransaction.id);
      },
      (err) => err.statusCode === 403,
      'Unrelated recycler must be blocked (403 Forbidden)'
    );
    console.log('✓ Test 10 Passed: Multi-tenant authorization guards strictly enforced.');

    // =========================================================================
    // TEST 11: Honest Empty States for Zero Activity Accounts
    // =========================================================================
    console.log('[TEST 11] Testing Honest Empty States for new user without transactions...');
    const emptyEarnings = await earningsService.getEarningsSummary(outsiderCollectorUser, {
      period: EARNINGS_PERIOD.ALL_TIME,
    });
    assert.strictEqual(Number(emptyEarnings.totalRecordedSales), 0);
    assert.strictEqual(emptyEarnings.transactionCount, 0);

    const emptyTx = await earningsService.getEarningsTransactions(outsiderCollectorUser);
    assert.strictEqual(emptyTx.total, 0);
    assert.strictEqual(emptyTx.transactions.length, 0);
    console.log('✓ Test 11 Passed: Honest empty state preserved without fabricated earnings.');

    console.log('\n========================================================');
    console.log('🎉 ALL MARKETPLACE PHASE 4 TESTS PASSED SUCCESSFULLY!');
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ Phase 4 test failure:', err);
    process.exitCode = 1;
  } finally {
    console.log('[CLEANUP] Cleaning up test data...');
    try {
      if (testTransaction) {
        await prisma.transactionRecord.deleteMany({ where: { id: testTransaction.id } });
      }
      if (testHandover) {
        await prisma.handoverPhoto.deleteMany({ where: { handoverId: testHandover.id } });
        await prisma.handoverRecord.deleteMany({ where: { id: testHandover.id } });
      }
      if (testQuote) {
        await prisma.quote.deleteMany({ where: { id: testQuote.id } });
      }
      if (testLot) {
        await prisma.materialLotPhoto.deleteMany({ where: { lotId: testLot.id } });
        await prisma.materialLotItem.deleteMany({ where: { lotId: testLot.id } });
        await prisma.materialLot.deleteMany({ where: { id: testLot.id } });
      }
      if (collectorProfile) {
        await prisma.materialLotPhoto.deleteMany({ where: { lot: { collectorId: collectorProfile.id } } });
        await prisma.materialLotItem.deleteMany({ where: { lot: { collectorId: collectorProfile.id } } });
        await prisma.quote.deleteMany({ where: { materialLot: { collectorId: collectorProfile.id } } });
        await prisma.handoverRecord.deleteMany({ where: { collectorId: collectorProfile.id } });
        await prisma.materialLot.deleteMany({ where: { collectorId: collectorProfile.id } });
        await prisma.materialItem.deleteMany({ where: { collectorId: collectorProfile.id } });
        await prisma.collectorProfile.deleteMany({ where: { userId: collectorUser.id } });
      }
      if (outsiderCollectorProfile) {
        await prisma.materialLotPhoto.deleteMany({ where: { lot: { collectorId: outsiderCollectorProfile.id } } });
        await prisma.materialLotItem.deleteMany({ where: { lot: { collectorId: outsiderCollectorProfile.id } } });
        await prisma.materialLot.deleteMany({ where: { collectorId: outsiderCollectorProfile.id } });
        await prisma.materialItem.deleteMany({ where: { collectorId: outsiderCollectorProfile.id } });
        await prisma.collectorProfile.deleteMany({ where: { userId: outsiderCollectorUser.id } });
      }
      if (recyclerProfile1) {
        await prisma.recyclerProfile.deleteMany({ where: { userId: recyclerUser1.id } });
      }
      if (recyclerProfile2) {
        await prisma.recyclerProfile.deleteMany({ where: { userId: recyclerUser2.id } });
      }
      if (collectorUser) {
        await prisma.user.deleteMany({ where: { id: collectorUser.id } });
      }
      if (outsiderCollectorUser) {
        await prisma.user.deleteMany({ where: { id: outsiderCollectorUser.id } });
      }
      if (recyclerUser1) {
        await prisma.user.deleteMany({ where: { id: recyclerUser1.id } });
      }
      if (recyclerUser2) {
        await prisma.user.deleteMany({ where: { id: recyclerUser2.id } });
      }
      console.log('✓ Cleanup complete.');
    } catch (cleanupErr) {
      console.warn('⚠️ Cleanup warning:', cleanupErr.message);
    }
  }
}

if (require.main === module) {
  runPhase4Tests().then(() => {
    process.exit(process.exitCode || 0);
  });
}

module.exports = { runPhase4Tests };
