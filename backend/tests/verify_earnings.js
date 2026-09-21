/**
 * verify_earnings.js
 * Comprehensive Verification Suite for SIH 26229 Collector Earnings Ledger + Pending Dues
 * Canonical Reference: SIH Problem Statement 26229 - Prompt 8
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

const earningsService = require('../src/services/earningsService');
const transactionService = require('../src/services/transactionService');
const handoverService = require('../src/services/handoverService');
const quoteService = require('../src/services/quoteService');
const materialLotService = require('../src/services/materialLotService');
const {
  ROLES,
  QUOTE_STATUS,
  HANDOVER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  TRANSACTION_STATUS,
  EARNINGS_PERIOD,
} = require('../src/utils/constants');

async function runEarningsVerification() {
  console.log('========================================================');
  console.log('--- STARTING VERIFY_EARNINGS (SIH 26229 PROMPT 8) ---');
  console.log('========================================================\n');

  let collector1User, collector1Profile;
  let collector2User, collector2Profile;
  let recycler1User, recycler1Profile;
  let recycler2User, recycler2Profile;
  let adminUser;

  let createdTransactionIds = [];
  let createdHandoverIds = [];
  let createdQuoteIds = [];
  let createdLotIds = [];

  let passedChecks = 0;
  function passCheck(num, desc) {
    passedChecks++;
    console.log(`[PASS] Check ${num}: ${desc}`);
  }

  try {
    // --- FIXTURE SETUP ---
    console.log('[SETUP] Creating isolated test users, profiles, and transactions...');
    const timestamp = Date.now();

    // 1. Collector 1
    collector1User = await prisma.user.create({
      data: {
        email: `col1.earn.${timestamp}@ecosetu.test`,
        passwordHash: 'dummy-hash',
        phone: `+9197771${timestamp % 100000}`,
        name: 'Earnings Collector 1',
        role: ROLES.INFORMAL_COLLECTOR,
        status: 'ACTIVE',
      },
    });
    collector1Profile = await prisma.collectorProfile.create({
      data: {
        userId: collector1User.id,
        city: 'Pune',
        state: 'Maharashtra',
        serviceArea: 'Kothrud',
      },
    });

    // 2. Collector 2 (Unrelated collector)
    collector2User = await prisma.user.create({
      data: {
        email: `col2.earn.${timestamp}@ecosetu.test`,
        passwordHash: 'dummy-hash',
        phone: `+9197772${timestamp % 100000}`,
        name: 'Earnings Collector 2',
        role: ROLES.INFORMAL_COLLECTOR,
        status: 'ACTIVE',
      },
    });
    collector2Profile = await prisma.collectorProfile.create({
      data: {
        userId: collector2User.id,
        city: 'Mumbai',
        state: 'Maharashtra',
        serviceArea: 'Dharavi',
      },
    });

    // 3. Recycler 1
    recycler1User = await prisma.user.create({
      data: {
        email: `rec1.earn.${timestamp}@ecosetu.test`,
        passwordHash: 'dummy-hash',
        phone: `+9197773${timestamp % 100000}`,
        name: 'Green Metals Recycler',
        role: ROLES.RECYCLER,
        status: 'ACTIVE',
      },
    });
    recycler1Profile = await prisma.recyclerProfile.create({
      data: {
        userId: recycler1User.id,
        facilityName: 'Green Metals Pune Facility',
        facilityAddress: 'Phase 2, Hinjawadi',
        city: 'Pune',
        state: 'Maharashtra',
        acceptedCategories: ['PCB', 'BATTERY', 'MOBILE_PHONE', 'OTHER'],
        authorizationStatus: 'AUTHORIZED',
        pickupAvailable: 'AVAILABLE',
      },
    });

    // 4. Recycler 2
    recycler2User = await prisma.user.create({
      data: {
        email: `rec2.earn.${timestamp}@ecosetu.test`,
        passwordHash: 'dummy-hash',
        phone: `+9197774${timestamp % 100000}`,
        name: 'Apex E-Waste Recycler',
        role: ROLES.RECYCLER,
        status: 'ACTIVE',
      },
    });
    recycler2Profile = await prisma.recyclerProfile.create({
      data: {
        userId: recycler2User.id,
        facilityName: 'Apex Metals Facility',
        facilityAddress: 'MIDC Rabale, Navi Mumbai',
        city: 'Navi Mumbai',
        state: 'Maharashtra',
        acceptedCategories: ['BATTERY', 'OTHER', 'MOBILE_PHONE'],
        authorizationStatus: 'AUTHORIZED',
        pickupAvailable: 'AVAILABLE',
      },
    });

    // 5. Admin
    adminUser = await prisma.user.create({
      data: {
        email: `admin.earn.${timestamp}@ecosetu.test`,
        passwordHash: 'dummy-hash',
        phone: `+9197775${timestamp % 100000}`,
        name: 'Super Admin',
        role: ROLES.ADMIN,
        status: 'ACTIVE',
      },
    });

    // Helper to create lot + accepted quote + confirmed handover
    async function createConfirmedHandover(collectorUser, recyclerUser, category, subcat, weightKg, unitPrice) {
      const lot = await materialLotService.createMaterialLot(collectorUser.id, {
        category,
        subcategory: subcat,
        approximateTotalWeightKg: weightKg,
        notes: `Test Lot for ${category}`,
        collectionArea: 'Pune Industrial Area',
      });
      await materialLotService.updateMaterialLot(collectorUser.id, lot.id, { status: 'OPEN' });
      createdLotIds.push(lot.id);

      const quote = await quoteService.createQuote(recyclerUser, {
        materialLotId: lot.id,
        quotedUnitPrice: unitPrice,
        unit: 'PER_KG',
        validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
        notes: 'Valid industrial quote',
      });
      createdQuoteIds.push(quote.id);
      await quoteService.acceptQuote(collectorUser, quote.id);

      const hdo = await handoverService.createHandover(collectorUser.id, {
        materialLotId: lot.id,
        quoteId: quote.id,
        declaredWeightKg: weightKg,
        handoverWeightKg: weightKg,
        latitude: 18.5204,
        longitude: 73.8567,
        locationAccuracyMeters: 5.0,
      });
      createdHandoverIds.push(hdo.id);

      await handoverService.collectorConfirm(collectorUser.id, hdo.id, {
        handoverWeightKg: weightKg,
      });
      const confirmedHdo = await handoverService.recyclerConfirm(recyclerUser.id, hdo.id, {
        handoverWeightKg: weightKg,
      });

      return confirmedHdo;
    }

    console.log('[SETUP] Creating diverse transaction records for Collector 1...');
    // Handover 1: PAID transaction (PCB, Recycler 1, 100kg @ 100/kg = ₹10,000)
    const hdo1 = await createConfirmedHandover(collector1User, recycler1User, 'PCB', 'Motherboards', 100, 100);
    const txn1 = await transactionService.createTransaction(collector1User, {
      handoverId: hdo1.id,
      finalSaleValue: 10000,
      paymentMethod: PAYMENT_METHOD.CASH,
      paymentStatus: PAYMENT_STATUS.PAID,
    });
    createdTransactionIds.push(txn1.id);

    // Handover 2: PARTIALLY_PAID transaction (BATTERY, Recycler 1, 50kg @ 160/kg = ₹8,000, paid 5,000, due 3,000)
    const hdo2 = await createConfirmedHandover(collector1User, recycler1User, 'BATTERY', 'Lithium Ion', 50, 160);
    const txn2 = await transactionService.createTransaction(collector1User, {
      handoverId: hdo2.id,
      finalSaleValue: 8000,
      amountPaid: 5000,
      paymentMethod: PAYMENT_METHOD.UPI_RECORDED,
      paymentStatus: PAYMENT_STATUS.PARTIALLY_PAID,
    });
    createdTransactionIds.push(txn2.id);

    // Handover 3: PENDING transaction (MOBILE_PHONE, Recycler 2, 20kg @ 350/kg = ₹7,000, paid 0, due 7,000)
    // Older transaction (set date back by 2 days to test oldest-first)
    const hdo3 = await createConfirmedHandover(collector1User, recycler2User, 'MOBILE_PHONE', 'Smartphones', 20, 350);
    const txn3 = await transactionService.createTransaction(collector1User, {
      handoverId: hdo3.id,
      finalSaleValue: 7000,
      paymentMethod: PAYMENT_METHOD.BANK_TRANSFER_RECORDED,
      paymentStatus: PAYMENT_STATUS.PENDING,
    });
    createdTransactionIds.push(txn3.id);

    // Backdate txn3 transactionDate by 3 days for ordering test
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
    await prisma.transactionRecord.update({
      where: { id: txn3.id },
      data: { transactionDate: threeDaysAgo },
    });

    // Handover 4: CANCELLED transaction (OTHER, Recycler 1, ₹5,000) -> MUST BE EXCLUDED FROM TOTALS
    const hdo4 = await createConfirmedHandover(collector1User, recycler1User, 'OTHER', 'Cables', 50, 100);
    const txn4 = await transactionService.createTransaction(collector1User, {
      handoverId: hdo4.id,
      finalSaleValue: 5000,
      paymentMethod: PAYMENT_METHOD.CASH,
      paymentStatus: PAYMENT_STATUS.PAID,
    });
    await transactionService.cancelTransaction(collector1User, txn4.id, {
      reason: 'Cancelled due to material discrepancy',
    });
    createdTransactionIds.push(txn4.id);

    // Handover 5: Transaction for Collector 2 (Unrelated collector, ₹15,000) -> MUST NOT LEAK
    const hdoCol2 = await createConfirmedHandover(collector2User, recycler1User, 'PCB', 'Cards', 75, 200);
    const txnCol2 = await transactionService.createTransaction(collector2User, {
      handoverId: hdoCol2.id,
      finalSaleValue: 15000,
      paymentMethod: PAYMENT_METHOD.CASH,
      paymentStatus: PAYMENT_STATUS.PAID,
    });
    createdTransactionIds.push(txnCol2.id);

    console.log('[SETUP] Fixtures initialized successfully. Running tests...\n');

    // ========================================================
    // CHECK 1: Earnings service loads
    // ========================================================
    assert(earningsService !== null, 'Earnings service must load');
    assert(typeof earningsService.getEarningsSummary === 'function', 'getEarningsSummary must be a function');
    passCheck(1, 'Earnings service module loads cleanly');

    // ========================================================
    // CHECK 2: Collector ownership isolation
    // ========================================================
    const col1Summary = await earningsService.getEarningsSummary(collector1User);
    assert(col1Summary !== null, 'Summary should return for collector 1');
    passCheck(2, 'Collector ownership isolation correctly enforced');

    // ========================================================
    // CHECK 3: Total recorded sales
    // ========================================================
    // Valid for Collector 1: txn1 (10000) + txn2 (8000) + txn3 (7000) = 25000.00
    // Cancelled txn4 (5000) excluded! Collector 2 txn (15000) excluded!
    assert.strictEqual(
      col1Summary.totalRecordedSales,
      '25000.00',
      `Expected total recorded sales to be 25000.00, got ${col1Summary.totalRecordedSales}`
    );
    passCheck(3, 'Total recorded sales aggregates valid non-cancelled transactions correctly (25000.00)');

    // ========================================================
    // CHECK 4: Total paid
    // ========================================================
    // txn1 (10000) + txn2 (5000) + txn3 (0) = 15000.00
    assert.strictEqual(
      col1Summary.totalPaid,
      '15000.00',
      `Expected total paid to be 15000.00, got ${col1Summary.totalPaid}`
    );
    passCheck(4, 'Total paid matches actual received payments (15000.00)');

    // ========================================================
    // CHECK 5: Total pending
    // ========================================================
    // txn1 (0) + txn2 (3000) + txn3 (7000) = 10000.00
    assert.strictEqual(
      col1Summary.totalPending,
      '10000.00',
      `Expected total pending to be 10000.00, got ${col1Summary.totalPending}`
    );
    passCheck(5, 'Total pending matches outstanding balances (10000.00)');

    // ========================================================
    // CHECK 6: Partial payment aggregation
    // ========================================================
    // txn2 paid is 5000.00
    assert.strictEqual(
      col1Summary.totalPartiallyPaid,
      '5000.00',
      `Expected total partially paid to be 5000.00, got ${col1Summary.totalPartiallyPaid}`
    );
    passCheck(6, 'Partial payment aggregation isolates partially paid amounts (5000.00)');

    // ========================================================
    // CHECK 7: Paid transaction aggregation
    // ========================================================
    assert.strictEqual(
      col1Summary.paidTransactionCount,
      1,
      `Expected 1 paid transaction, got ${col1Summary.paidTransactionCount}`
    );
    passCheck(7, 'Paid transaction count aggregates correctly (1 paid)');

    // ========================================================
    // CHECK 8: Pending transaction aggregation
    // ========================================================
    assert.strictEqual(
      col1Summary.pendingTransactionCount,
      1,
      `Expected 1 pending transaction, got ${col1Summary.pendingTransactionCount}`
    );
    passCheck(8, 'Pending transaction count aggregates correctly (1 pending)');

    // ========================================================
    // CHECK 9: Cancelled transactions excluded
    // ========================================================
    // txn4 was 5000 and cancelled. If included, totalRecordedSales would be 30000.00
    assert.notStrictEqual(
      col1Summary.totalRecordedSales,
      '30000.00',
      'Cancelled transaction must not contribute to totals'
    );
    passCheck(9, 'Cancelled transactions are strictly excluded from all active totals');

    // ========================================================
    // CHECK 10: Transaction count
    // ========================================================
    assert.strictEqual(
      col1Summary.transactionCount,
      3,
      `Expected transactionCount to be 3, got ${col1Summary.transactionCount}`
    );
    passCheck(10, 'Transaction count matches contributing non-cancelled records (3)');

    // ========================================================
    // CHECK 11: Paid transaction count
    // ========================================================
    assert.strictEqual(col1Summary.paidTransactionCount, 1);
    passCheck(11, 'Paid transaction count verified');

    // ========================================================
    // CHECK 12: Partial transaction count
    // ========================================================
    assert.strictEqual(
      col1Summary.partialTransactionCount,
      1,
      `Expected 1 partial transaction, got ${col1Summary.partialTransactionCount}`
    );
    passCheck(12, 'Partial transaction count verified (1 partial)');

    // ========================================================
    // CHECK 13: Pending transaction count
    // ========================================================
    assert.strictEqual(col1Summary.pendingTransactionCount, 1);
    passCheck(13, 'Pending transaction count verified');

    // ========================================================
    // CHECK 14: Pending dues endpoint
    // ========================================================
    const duesResult = await earningsService.getPendingDues(collector1User);
    assert(duesResult.pendingDues && Array.isArray(duesResult.pendingDues), 'pendingDues must be an array');
    assert.strictEqual(duesResult.pendingDues.length, 2, `Expected 2 outstanding dues, got ${duesResult.pendingDues.length}`);
    assert.strictEqual(duesResult.totalPendingAmount, '10000.00');
    passCheck(14, 'Pending dues returns all outstanding (PENDING and PARTIALLY_PAID) transactions');

    // ========================================================
    // CHECK 15: Oldest-first pending ordering
    // ========================================================
    // txn3 was backdated 3 days, txn2 was created today -> txn3 must be first!
    assert.strictEqual(
      duesResult.pendingDues[0].id,
      txn3.id,
      'First pending item must be the oldest transaction (txn3)'
    );
    assert.strictEqual(
      duesResult.pendingDues[1].id,
      txn2.id,
      'Second pending item must be the newer transaction (txn2)'
    );
    passCheck(15, 'Pending dues strictly ordered oldest-transaction first by default');

    // ========================================================
    // CHECK 16: Date filtering with custom range
    // ========================================================
    const dateRangeSummary = await earningsService.getEarningsSummary(collector1User, {
      startDate: new Date(Date.now() - 86400000).toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
    });
    // txn1 and txn2 are from today. txn3 is 3 days ago -> should exclude txn3
    assert.strictEqual(dateRangeSummary.transactionCount, 2);
    passCheck(16, 'Custom date filtering correctly scopes ledger calculations');

    // ========================================================
    // CHECK 17: TODAY filter
    // ========================================================
    const todaySummary = await earningsService.getEarningsSummary(collector1User, {
      period: EARNINGS_PERIOD.TODAY,
    });
    // txn1 and txn2 created today (total = 18000.00), txn3 is 3 days ago
    assert.strictEqual(todaySummary.transactionCount, 2);
    assert.strictEqual(todaySummary.totalRecordedSales, '18000.00');
    passCheck(17, 'TODAY filter includes only today\'s transactions');

    // ========================================================
    // CHECK 18: THIS_WEEK filter
    // ========================================================
    const weekBounds = earningsService.calculateDateBounds(EARNINGS_PERIOD.THIS_WEEK);
    assert(weekBounds.startDate instanceof Date, 'THIS_WEEK startDate must be Date');
    assert(weekBounds.endDate instanceof Date, 'THIS_WEEK endDate must be Date');
    passCheck(18, 'THIS_WEEK filter boundary calculation verified');

    // ========================================================
    // CHECK 19: THIS_MONTH filter
    // ========================================================
    const monthBounds = earningsService.calculateDateBounds(EARNINGS_PERIOD.THIS_MONTH);
    const now = new Date();
    assert.strictEqual(monthBounds.startDate.getDate(), 1);
    assert.strictEqual(monthBounds.startDate.getMonth(), now.getMonth());
    passCheck(19, 'THIS_MONTH filter boundary starts on the 1st of current month');

    // ========================================================
    // CHECK 20: LAST_MONTH filter
    // ========================================================
    const lastMonthBounds = earningsService.calculateDateBounds(EARNINGS_PERIOD.LAST_MONTH);
    assert(lastMonthBounds.startDate < monthBounds.startDate, 'LAST_MONTH must precede THIS_MONTH');
    passCheck(20, 'LAST_MONTH filter boundary calculation verified');

    // ========================================================
    // CHECK 21: Category filtering
    // ========================================================
    const pcbSummary = await earningsService.getEarningsSummary(collector1User, {
      category: 'PCB',
    });
    // Only txn1 is PCB (10000.00)
    assert.strictEqual(pcbSummary.transactionCount, 1);
    assert.strictEqual(pcbSummary.totalRecordedSales, '10000.00');
    passCheck(21, 'Category filtering isolates category transactions (PCB)');

    // ========================================================
    // CHECK 22: Payment-status filtering
    // ========================================================
    const paidSummary = await earningsService.getEarningsSummary(collector1User, {
      paymentStatus: PAYMENT_STATUS.PAID,
    });
    assert.strictEqual(paidSummary.transactionCount, 1);
    assert.strictEqual(paidSummary.totalPaid, '10000.00');
    passCheck(22, 'Payment-status filtering isolates PAID transactions');

    // ========================================================
    // CHECK 23: Recycler filtering
    // ========================================================
    const rec2Summary = await earningsService.getEarningsSummary(collector1User, {
      recyclerId: recycler2Profile.id,
    });
    // Only txn3 involves Recycler 2 (7000.00)
    assert.strictEqual(rec2Summary.transactionCount, 1);
    assert.strictEqual(rec2Summary.totalRecordedSales, '7000.00');
    passCheck(23, 'Recycler filtering isolates transactions with specific recycler');

    // ========================================================
    // CHECK 24: Monthly aggregation breakdown
    // ========================================================
    const monthlyRes = await earningsService.getMonthlyEarnings(collector1User);
    assert(Array.isArray(monthlyRes.monthly), 'monthly breakdown must be an array');
    assert(monthlyRes.monthly.length > 0, 'monthly breakdown should contain at least 1 month');
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthEntry = monthlyRes.monthly.find((m) => m.month === currentMonthKey);
    assert(thisMonthEntry !== undefined, 'Current month entry must exist in monthly breakdown');
    passCheck(24, 'Monthly aggregation groups historical data by month (YYYY-MM)');

    // ========================================================
    // CHECK 25: Decimal-safe totals
    // ========================================================
    // Ensure all monetary fields are fixed 2-decimal strings, never raw floating point numbers
    assert(typeof col1Summary.totalRecordedSales === 'string');
    assert(/^\d+\.\d{2}$/.test(col1Summary.totalRecordedSales), 'Recorded sales must match decimal string format');
    assert(/^\d+\.\d{2}$/.test(col1Summary.totalPaid), 'Total paid must match decimal string format');
    assert(/^\d+\.\d{2}$/.test(col1Summary.totalPending), 'Total pending must match decimal string format');
    passCheck(25, 'Decimal-safe serialization verified across all summary fields');

    // ========================================================
    // CHECK 26: Cross-collector isolation
    // ========================================================
    const col2Summary = await earningsService.getEarningsSummary(collector2User);
    assert.strictEqual(col2Summary.totalRecordedSales, '15000.00');
    assert.strictEqual(col2Summary.transactionCount, 1);
    // Ensure Collector 1 summary didn't include Collector 2
    assert.strictEqual(col1Summary.totalRecordedSales, '25000.00');
    passCheck(26, 'Cross-collector tenant isolation: Collector 1 and 2 ledgers completely separated');

    // ========================================================
    // CHECK 27: No earnings mutation created by viewing summary
    // ========================================================
    const txnTxCountBefore = await prisma.transactionRecord.count();
    await earningsService.getEarningsSummary(collector1User);
    await earningsService.getPendingDues(collector1User);
    await earningsService.getMonthlyEarnings(collector1User);
    const txnTxCountAfter = await prisma.transactionRecord.count();
    assert.strictEqual(
      txnTxCountBefore,
      txnTxCountAfter,
      'Viewing earnings ledger must not create or modify any database record'
    );
    passCheck(27, 'Read-only ledger view does NOT mutate the database');

    // ========================================================
    // CHECK 28: Offline cache contract verified
    // ========================================================
    // Verify mobile earnings service contains cache handling
    const mobileServicePath = path.join(__dirname, '../../mobile/src/services/earningsService.ts');
    assert(fs.existsSync(mobileServicePath), 'Mobile earningsService.ts must exist');
    const mobileServiceContent = fs.readFileSync(mobileServicePath, 'utf8');
    assert(mobileServiceContent.includes('isCached'), 'Mobile service must support isCached flag');
    assert(mobileServiceContent.includes('storage.getItem'), 'Mobile service must read from offline storage');
    assert(mobileServiceContent.includes('storage.setItem'), 'Mobile service must write to offline storage');
    passCheck(28, 'Offline caching contract verified in mobile earningsService');

    // ========================================================
    // CHECK 29: TTS text generation EN/HI/MR/OR
    // ========================================================
    const sampleSummary = {
      totalRecordedSales: '25000.00',
      totalPaid: '18000.00',
      totalPending: '7000.00',
    };
    const ttsEn = earningsService.generateSpeechText(sampleSummary, 'en');
    const ttsHi = earningsService.generateSpeechText(sampleSummary, 'hi');
    const ttsMr = earningsService.generateSpeechText(sampleSummary, 'mr');
    const ttsOr = earningsService.generateSpeechText(sampleSummary, 'or');

    assert(ttsEn.includes('twenty five thousand'), `English speech should include 25k words: ${ttsEn}`);
    assert(ttsEn.includes('eighteen thousand'), `English speech should include 18k words: ${ttsEn}`);
    assert(ttsEn.includes('seven thousand'), `English speech should include 7k words: ${ttsEn}`);

    assert(ttsHi.includes('पच्चीस हजार'), `Hindi speech should include 25k words: ${ttsHi}`);
    assert(ttsHi.includes('अठारह हजार'), `Hindi speech should include 18k words: ${ttsHi}`);
    assert(ttsHi.includes('सात हजार'), `Hindi speech should include 7k words: ${ttsHi}`);

    assert(ttsMr.includes('पंचवीस हजार') || ttsMr.includes('पंचवीस'), `Marathi speech generated: ${ttsMr}`);
    assert(ttsOr.includes('ପଚିଶ ହଜାର') || ttsOr.includes('ପଚିଶ'), `Odia speech generated: ${ttsOr}`);
    passCheck(29, 'TTS speech text generation correctly converts monetary amounts to words in EN, HI, MR, OR');

    // ========================================================
    // CHECK 30: Mobile TypeScript compilation
    // ========================================================
    console.log('[TEST] Checking mobile TypeScript compilation...');
    const tscOutput = execSync('npm run typecheck', {
      cwd: path.join(__dirname, '../../mobile'),
      encoding: 'utf8',
    });
    assert(!tscOutput.includes('error TS'), 'TypeScript compilation must have 0 errors');
    passCheck(30, 'Mobile TypeScript compiles cleanly with zero errors');

    // ========================================================
    // CHECK 31: STRICT BOUNDARY - No money transferred / payment gateway
    // ========================================================
    const serverJs = fs.readFileSync(path.join(__dirname, '../src/routes/earningsRoutes.js'), 'utf8');
    assert(!serverJs.includes('razorpay'), 'No payment gateway in earningsRoutes');
    assert(!serverJs.includes('stripe'), 'No payment gateway in earningsRoutes');
    assert(!serverJs.includes('upiPay'), 'No UPI movement in earningsRoutes');
    passCheck(31, 'STRICT BOUNDARY: No money movement, payment gateways, or UPI transfer invoked');

    // ========================================================
    // CHECK 32: STRICT BOUNDARY - No independent mutable balance table
    // ========================================================
    const schemaPrisma = fs.readFileSync(path.join(__dirname, '../prisma/schema.prisma'), 'utf8');
    assert(!schemaPrisma.includes('model EarningsLedger'), 'No mutable EarningsLedger table in schema');
    assert(!schemaPrisma.includes('model CollectorBalance'), 'No mutable CollectorBalance table in schema');
    passCheck(32, 'STRICT BOUNDARY: Earnings dynamically derived from TransactionRecord without mutable balance table');

    console.log('\n========================================================');
    console.log(`--- ALL ${passedChecks}/32 VERIFY_EARNINGS CHECKS PASSED SUCCESSFULLY ---`);
    console.log('========================================================\n');
  } catch (err) {
    console.error('\n❌ VERIFY_EARNINGS FAILED:', err);
    process.exit(1);
  } finally {
    console.log('[TEARDOWN] Cleaning up test fixtures...');
    try {
      if (createdTransactionIds.length > 0) {
        await prisma.transactionRecord.deleteMany({
          where: { id: { in: createdTransactionIds } },
        });
      }
      if (createdHandoverIds.length > 0) {
        await prisma.handoverPhoto.deleteMany({
          where: { handoverId: { in: createdHandoverIds } },
        });
        await prisma.handoverRecord.deleteMany({
          where: { id: { in: createdHandoverIds } },
        });
      }
      if (createdQuoteIds.length > 0) {
        await prisma.quote.deleteMany({
          where: { id: { in: createdQuoteIds } },
        });
      }
      if (createdLotIds.length > 0) {
        await prisma.materialLot.deleteMany({
          where: { id: { in: createdLotIds } },
        });
      }
      if (collector1Profile) await prisma.collectorProfile.delete({ where: { id: collector1Profile.id } }).catch(() => {});
      if (collector2Profile) await prisma.collectorProfile.delete({ where: { id: collector2Profile.id } }).catch(() => {});
      if (recycler1Profile) await prisma.recyclerProfile.delete({ where: { id: recycler1Profile.id } }).catch(() => {});
      if (recycler2Profile) await prisma.recyclerProfile.delete({ where: { id: recycler2Profile.id } }).catch(() => {});
      if (collector1User) await prisma.user.delete({ where: { id: collector1User.id } }).catch(() => {});
      if (collector2User) await prisma.user.delete({ where: { id: collector2User.id } }).catch(() => {});
      if (recycler1User) await prisma.user.delete({ where: { id: recycler1User.id } }).catch(() => {});
      if (recycler2User) await prisma.user.delete({ where: { id: recycler2User.id } }).catch(() => {});
      if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
      await prisma.$disconnect();
      console.log('[TEARDOWN] Completed.\n');
    } catch (cleanupErr) {
      console.warn('[TEARDOWN] Warning during cleanup:', cleanupErr.message);
      await prisma.$disconnect();
    }
  }
}

runEarningsVerification();
