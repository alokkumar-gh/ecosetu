/**
 * verify_issue15_recycler_traceability_lot_id.js
 * Verification script for Issue #15: Recycler Traceability — Lot ID Missing & Full Chain Resolution
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const lotTraceService = require('../src/services/lotTraceService');
const { ROLES } = require('../src/utils/constants');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('=== STARTING ISSUE 15 VERIFICATION ===\n');
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedCount++;
    }
  }

  const timestamp = Date.now();

  try {
    // Setup Collector A & Recycler A
    const userCollectorA = await prisma.user.create({
      data: {
        email: `collector_a_issue15_${timestamp}@ecosetu.test`,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuuu',
        name: 'Collector Alpha',
        phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        role: ROLES.INFORMAL_COLLECTOR,
        status: 'ACTIVE',
        collectorProfile: {
          create: {
            serviceArea: 'West Zone',
            city: 'Mumbai',
            state: 'Maharashtra',
            isAvailable: true,
          },
        },
      },
      include: { collectorProfile: true },
    });

    const userRecyclerA = await prisma.user.create({
      data: {
        email: `recycler_a_issue15_${timestamp}@ecosetu.test`,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuuu',
        name: 'Recycler Alpha Facility',
        phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        role: ROLES.RECYCLER,
        status: 'ACTIVE',
        recyclerProfile: {
          create: {
            facilityName: 'Alpha Recyclers Private Limited',
            facilityAddress: 'MIDC Phase 1, Rabale',
            city: 'Navi Mumbai',
            state: 'Maharashtra',
            authorizationStatus: 'AUTHORIZED',
            authorizationNumber: `CPCB-A-${timestamp}`,
          },
        },
      },
      include: { recyclerProfile: true },
    });

    // Setup Collector B & Recycler B
    const userCollectorB = await prisma.user.create({
      data: {
        email: `collector_b_issue15_${timestamp}@ecosetu.test`,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuuu',
        name: 'Collector Beta',
        phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        role: ROLES.INFORMAL_COLLECTOR,
        status: 'ACTIVE',
        collectorProfile: {
          create: {
            serviceArea: 'East Zone',
            city: 'Pune',
            state: 'Maharashtra',
            isAvailable: true,
          },
        },
      },
      include: { collectorProfile: true },
    });

    const userRecyclerB = await prisma.user.create({
      data: {
        email: `recycler_b_issue15_${timestamp}@ecosetu.test`,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuuu',
        name: 'Recycler Beta Facility',
        phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        role: ROLES.RECYCLER,
        status: 'ACTIVE',
        recyclerProfile: {
          create: {
            facilityName: 'Beta E-Waste Recyclers',
            facilityAddress: 'Pimpri Industrial Area',
            city: 'Pune',
            state: 'Maharashtra',
            authorizationStatus: 'AUTHORIZED',
            authorizationNumber: `CPCB-B-${timestamp}`,
          },
        },
      },
      include: { recyclerProfile: true },
    });

    // Create Lot A (Collector A)
    const lotA = await prisma.materialLot.create({
      data: {
        referenceNumber: `LOT-A-${timestamp}`,
        collectorId: userCollectorA.collectorProfile.id,
        category: 'BATTERY',
        subcategory: 'Lithium Ion',
        approximateTotalWeightKg: 120.50,
        status: 'ACCEPTED',
        condition: 'NOT_WORKING',
        sourceType: 'HOUSEHOLD',
        photos: {
          create: [
            {
              photoUrl: `https://storage.ecosetu.in/photos/lot_a_${timestamp}.jpg`,
            },
          ],
        },
      },
    });

    // Create Lot B (Collector B)
    const lotB = await prisma.materialLot.create({
      data: {
        referenceNumber: `LOT-B-${timestamp}`,
        collectorId: userCollectorB.collectorProfile.id,
        category: 'PCB',
        subcategory: 'Motherboards',
        approximateTotalWeightKg: 85.00,
        status: 'ACCEPTED',
        condition: 'DAMAGED',
        sourceType: 'COMMERCIAL',
        photos: {
          create: [
            {
              photoUrl: `https://storage.ecosetu.in/photos/lot_b_${timestamp}.jpg`,
            },
          ],
        },
      },
    });

    // CHECK 1: Lot A exists
    assert(Boolean(lotA && lotA.id), 'CHECK 1: Lot A exists.');

    // CHECK 2: Lot B exists
    assert(Boolean(lotB && lotB.id), 'CHECK 2: Lot B exists.');

    // Quote A (Recycler A -> Lot A)
    const quoteA = await prisma.quote.create({
      data: {
        referenceNumber: `QTE-A-${timestamp}`,
        materialLotId: lotA.id,
        recyclerId: userRecyclerA.recyclerProfile.id,
        createdById: userRecyclerA.id,
        category: 'BATTERY',
        quotedUnitPrice: 45.00,
        quotedQuantity: 120.50,
        quotedTotal: 5422.50,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });

    // Quote B (Recycler B -> Lot B)
    const quoteB = await prisma.quote.create({
      data: {
        referenceNumber: `QTE-B-${timestamp}`,
        materialLotId: lotB.id,
        recyclerId: userRecyclerB.recyclerProfile.id,
        createdById: userRecyclerB.id,
        category: 'PCB',
        quotedUnitPrice: 180.00,
        quotedQuantity: 85.00,
        quotedTotal: 15300.00,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });

    // Handover A (Lot A)
    const handoverA = await prisma.handoverRecord.create({
      data: {
        referenceNumber: `HDO-A-${timestamp}`,
        materialLotId: lotA.id,
        quoteId: quoteA.id,
        collectorId: userCollectorA.collectorProfile.id,
        recyclerId: userRecyclerA.recyclerProfile.id,
        createdById: userCollectorA.id,
        status: 'CONFIRMED',
        declaredWeightKg: 120.50,
        handoverWeightKg: 120.00,
        finalConfirmedAt: new Date(),
      },
    });

    // Handover B (Lot B)
    const handoverB = await prisma.handoverRecord.create({
      data: {
        referenceNumber: `HDO-B-${timestamp}`,
        materialLotId: lotB.id,
        quoteId: quoteB.id,
        collectorId: userCollectorB.collectorProfile.id,
        recyclerId: userRecyclerB.recyclerProfile.id,
        createdById: userCollectorB.id,
        status: 'CONFIRMED',
        declaredWeightKg: 85.00,
        handoverWeightKg: 85.00,
        finalConfirmedAt: new Date(),
      },
    });

    // Pickup Batch A
    const batchA = await prisma.pickupBatch.create({
      data: {
        referenceNumber: `BTC-A-${timestamp}`,
        recyclerId: userRecyclerA.recyclerProfile.id,
        collectorId: userCollectorA.collectorProfile.id,
        createdById: userRecyclerA.id,
        status: 'COMPLETED',
        lots: {
          create: [
            {
              materialLotId: lotA.id,
              addedById: userRecyclerA.id,
            },
          ],
        },
      },
    });

    // Pickup Batch B
    const batchB = await prisma.pickupBatch.create({
      data: {
        referenceNumber: `BTC-B-${timestamp}`,
        recyclerId: userRecyclerB.recyclerProfile.id,
        collectorId: userCollectorB.collectorProfile.id,
        createdById: userRecyclerB.id,
        status: 'COMPLETED',
        lots: {
          create: [
            {
              materialLotId: lotB.id,
              addedById: userRecyclerB.id,
            },
          ],
        },
      },
    });

    // CHECK 3: Recycler A can resolve Lot A traceability
    let traceA = null;
    try {
      traceA = await lotTraceService.getLotTrace(userRecyclerA, lotA.id);
    } catch (e) {
      console.error('Error fetching trace A:', e.message);
    }
    assert(Boolean(traceA), 'CHECK 3: Recycler A can resolve Lot A traceability.');

    // CHECK 4: Recycler B can resolve Lot B traceability
    let traceB = null;
    try {
      traceB = await lotTraceService.getLotTrace(userRecyclerB, lotB.id);
    } catch (e) {
      console.error('Error fetching trace B:', e.message);
    }
    assert(Boolean(traceB), 'CHECK 4: Recycler B can resolve Lot B traceability.');

    // CHECK 5: Lot A ID is present
    assert(Boolean(traceA && traceA.lot && traceA.lot.id === lotA.id), 'CHECK 5: Lot A ID is present.');

    // CHECK 6: Lot B ID is present
    assert(Boolean(traceB && traceB.lot && traceB.lot.id === lotB.id), 'CHECK 6: Lot B ID is present.');

    // CHECK 7: No "Lot ID missing" for valid records
    assert(Boolean(traceA.lot.id && traceB.lot.id), 'CHECK 7: No "Lot ID missing" for valid records.');

    // CHECK 8: Accepted Quote A resolves to Lot A
    assert(Boolean(traceA.acceptedQuote && traceA.acceptedQuote.id === quoteA.id), 'CHECK 8: Accepted Quote A resolves to Lot A.');

    // CHECK 9: Accepted Quote B resolves to Lot B
    assert(Boolean(traceB.acceptedQuote && traceB.acceptedQuote.id === quoteB.id), 'CHECK 9: Accepted Quote B resolves to Lot B.');

    // CHECK 10: Handover A resolves to Lot A
    assert(Boolean(traceA.handover && traceA.handover.id === handoverA.id), 'CHECK 10: Handover A resolves to Lot A.');

    // CHECK 11: Handover B resolves to Lot B
    assert(Boolean(traceB.handover && traceB.handover.id === handoverB.id), 'CHECK 11: Handover B resolves to Lot B.');

    // CHECK 12: Pickup Batch A resolves to Lot A
    assert(Boolean(traceA.batch && traceA.batch.id === batchA.id), 'CHECK 12: Pickup Batch A resolves to Lot A.');

    // CHECK 13: Pickup Batch B resolves to Lot B
    assert(Boolean(traceB.batch && traceB.batch.id === batchB.id), 'CHECK 13: Pickup Batch B resolves to Lot B.');

    // CHECK 14: Traceability events resolve to correct lot
    const lotATimelineRefs = traceA.timeline.some((e) => e.description.includes(lotA.referenceNumber));
    const lotBTimelineRefs = traceB.timeline.some((e) => e.description.includes(lotB.referenceNumber));
    assert(Boolean(lotATimelineRefs && lotBTimelineRefs), 'CHECK 14: Traceability events resolve to correct lot.');

    // CHECK 15: Lot A/B cross-contamination is blocked
    const traceAContainsLotB = JSON.stringify(traceA).includes(lotB.referenceNumber);
    const traceBContainsLotA = JSON.stringify(traceB).includes(lotA.referenceNumber);
    assert(!traceAContainsLotB && !traceBContainsLotA, 'CHECK 15: Lot A/B cross-contamination is blocked.');

    // CHECK 16: Recycler A cannot access unauthorized Recycler B traceability
    let unauthorizedAccess = false;
    try {
      await lotTraceService.getLotTrace(userRecyclerA, lotB.id);
      unauthorizedAccess = true;
    } catch (e) {
      unauthorizedAccess = false;
    }
    assert(!unauthorizedAccess, 'CHECK 16: Recycler A cannot access unauthorized Recycler B traceability.');

    // CHECK 17: IDOR manipulation is blocked
    let idorSuccess = false;
    try {
      await lotTraceService.getLotTrace(userRecyclerB, lotA.id);
      idorSuccess = true;
    } catch (e) {
      idorSuccess = false;
    }
    assert(!idorSuccess, 'CHECK 17: IDOR manipulation is blocked.');

    // CHECK 18: No fabricated downstream lifecycle events are created
    assert(traceA.recycling.status === 'NOT_RECORDED' && traceB.recycling.status === 'NOT_RECORDED', 'CHECK 18: No fabricated downstream lifecycle events are created.');

    // CHECK 19: Actual material image remains associated with correct lot
    const lotAPhoto = traceA.photos?.[0]?.photoUrl;
    const lotBPhoto = traceB.photos?.[0]?.photoUrl;
    assert(
      lotAPhoto === `https://storage.ecosetu.in/photos/lot_a_${timestamp}.jpg` &&
      lotBPhoto === `https://storage.ecosetu.in/photos/lot_b_${timestamp}.jpg`,
      'CHECK 19: Actual material image remains associated with correct lot.'
    );

    // CHECK 20: No hardcoded production lot IDs exist
    const mobileScreenContent = fs.readFileSync(path.resolve(__dirname, '../../mobile/src/screens/collector/CollectorLotTraceScreen.tsx'), 'utf8');
    const hasHardcodedId = mobileScreenContent.includes('LOT-001') || mobileScreenContent.includes('LOT-123');
    assert(!hasHardcodedId, 'CHECK 20: No hardcoded production lot IDs exist.');

    console.log(`\n========================================`);
    console.log(`ISSUE 15 VERIFICATION RESULTS: ${passedCount}/20 PASSED`);
    console.log(`========================================\n`);

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unhandled error during test execution:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
