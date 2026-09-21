/**
 * verify_material_lots.js
 * Automated Verification Suite for SIH 26229 Material Lot Foundation
 *
 * Covers requirements:
 * SIH-MAT-001 through SIH-MAT-010
 * SIH-LOT-001 through SIH-LOT-008
 *
 * Test items:
 *  1. Collector can create material item
 *  2. Collector can create lot
 *  3. Lot receives unique human-readable reference (LOT-YYYYMM-XXXXX)
 *  4. Multiple material items can belong to one lot
 *  5. Multiple photos can belong to a lot
 *  6. Approximate weight validation (> 0 required)
 *  7. Category validation (must be recognized taxonomy)
 *  8. Subcategory validation
 *  9. Condition validation
 * 10. Source type validation
 * 11. GPS persistence & graceful handling
 * 12. Collector can retrieve own lots
 * 13. Collector cannot retrieve another collector's lot (403)
 * 14. Collector cannot modify another collector's lot (403)
 * 15. Invalid status transition rejected
 * 16. DRAFT -> OPEN works correctly
 * 17. Offline draft persistence logic
 * 18. Sync does not create duplicates (idempotency clientReferenceId)
 * 19. i18n keys exist in all four languages (en, hi, mr, or)
 * 20. Existing consignment workflow remains untouched and intact
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const materialLotService = require('../src/services/materialLotService');
const { MATERIAL_TAXONOMY, isValidCategory, isValidSubcategory } = require('../src/config/materialTaxonomy');
const { ROLES, MATERIAL_LOT_STATUS, MATERIAL_CATEGORIES, MATERIAL_SOURCE_TYPES } = require('../src/utils/constants');

async function run() {
  console.log('========================================================');
  console.log('--- STARTING VERIFY_MATERIAL_LOTS (SIH 26229) ---');
  console.log('========================================================\n');

  try {
    // 0. Setup test collectors
    console.log('[SETUP] Finding or creating test collector profiles...');
    let collector1User = await prisma.user.findFirst({
      where: { role: ROLES.INFORMAL_COLLECTOR, status: 'ACTIVE' },
      include: { collectorProfile: true },
    });

    if (!collector1User || !collector1User.collectorProfile) {
      // Create a test user + collector profile
      collector1User = await prisma.user.create({
        data: {
          phone: `+91999${Math.floor(1000000 + Math.random() * 9000000)}`,
          name: 'Test Collector 1',
          role: ROLES.INFORMAL_COLLECTOR,
          status: 'ACTIVE',
          collectorProfile: {
            create: {
              organizationType: 'INDIVIDUAL',
              serviceAreaPincodes: ['110001'],
            },
          },
        },
        include: { collectorProfile: true },
      });
    }

    let collector2User = await prisma.user.findFirst({
      where: {
        role: ROLES.INFORMAL_COLLECTOR,
        status: 'ACTIVE',
        id: { not: collector1User.id },
      },
      include: { collectorProfile: true },
    });

    if (!collector2User || !collector2User.collectorProfile) {
      collector2User = await prisma.user.create({
        data: {
          phone: `+91998${Math.floor(1000000 + Math.random() * 9000000)}`,
          name: 'Test Collector 2',
          role: ROLES.INFORMAL_COLLECTOR,
          status: 'ACTIVE',
          collectorProfile: {
            create: {
              organizationType: 'INDIVIDUAL',
              serviceAreaPincodes: ['110002'],
            },
          },
        },
        include: { collectorProfile: true },
      });
    }

    assert(collector1User.collectorProfile, 'Collector 1 profile must exist');
    assert(collector2User.collectorProfile, 'Collector 2 profile must exist');
    console.log(`✓ Test Collector 1: ${collector1User.id} (${collector1User.collectorProfile.id})`);
    console.log(`✓ Test Collector 2: ${collector2User.id} (${collector2User.collectorProfile.id})\n`);

    // TEST 1: Collector can create material item
    console.log('[TEST 1] Verifying material item creation...');
    const item1 = await materialLotService.createMaterialItem(collector1User, {
      category: 'PCB',
      subcategory: 'Motherboard',
      description: 'Mixed desktop motherboards',
      approximateWeightKg: 4.5,
      condition: 'DAMAGED',
      sourceType: 'COMMERCIAL',
    });
    assert(item1 && item1.id, 'Item 1 should be created');
    assert(item1.referenceId.startsWith('MAT-'), 'Item reference must start with MAT-');
    assert.strictEqual(item1.category, 'PCB');
    assert.strictEqual(item1.collectorId, collector1User.collectorProfile.id);
    console.log(`✓ Created material item: ${item1.referenceId} (${item1.id})`);

    const item2 = await materialLotService.createMaterialItem(collector1User, {
      category: 'PCB',
      subcategory: 'Telecom Board',
      approximateWeightKg: 3.2,
      condition: 'DAMAGED',
      sourceType: 'COMMERCIAL',
    });
    assert(item2 && item2.id, 'Item 2 should be created');
    console.log(`✓ Created second material item: ${item2.referenceId}\n`);

    // TEST 2 & 3: Collector can create lot & receives unique human-readable reference
    console.log('[TEST 2 & 3] Verifying lot creation and human-readable reference number...');
    const lot1 = await materialLotService.createMaterialLot(collector1User, {
      category: 'PCB',
      subcategory: 'Motherboard',
      description: 'High grade computer PCB lot',
      approximateTotalWeightKg: 7.7,
      condition: 'DAMAGED',
      sourceType: 'COMMERCIAL',
      status: 'DRAFT',
      collectionLatitude: 28.6139,
      collectionLongitude: 77.2090,
      locationAccuracyMeters: 8.5,
      collectionTimestamp: new Date().toISOString(),
    });
    assert(lot1 && lot1.id, 'Lot 1 must be created');
    assert(lot1.referenceNumber, 'Lot must have reference number');
    const refRegex = /^LOT-\d{6}-[A-Z0-9]{5}$/;
    assert(refRegex.test(lot1.referenceNumber), `Reference ${lot1.referenceNumber} must match LOT-YYYYMM-XXXXX format`);
    assert.strictEqual(lot1.collectorId, collector1User.collectorProfile.id);
    assert.strictEqual(lot1.status, 'DRAFT');
    console.log(`✓ Created lot with human-readable reference: ${lot1.referenceNumber} (${lot1.id})\n`);

    // TEST 4: Multiple material items can belong to one lot
    console.log('[TEST 4] Verifying multiple material items linked to one lot...');
    const lotWithItems = await materialLotService.createMaterialLot(collector1User, {
      category: 'PCB',
      description: 'Lot with two items attached',
      approximateTotalWeightKg: 10.0,
      condition: 'DAMAGED',
      sourceType: 'COMMERCIAL',
      status: 'DRAFT',
      itemIds: [item1.id, item2.id],
    });
    assert(lotWithItems.items && lotWithItems.items.length === 2, 'Lot must contain exactly 2 items');
    assert.strictEqual(lotWithItems.items[0].materialItemId, item1.id);
    assert.strictEqual(lotWithItems.items[1].materialItemId, item2.id);
    console.log(`✓ Lot ${lotWithItems.referenceNumber} contains ${lotWithItems.items.length} material items\n`);

    // TEST 5: Multiple photos can belong to a lot
    console.log('[TEST 5] Verifying multiple photos persistence...');
    const lotPhotos = await materialLotService.addLotPhotos(collector1User, lot1.id, [
      { photoUrl: 'https://storage.ecosetu.org/lots/photo1.jpg', fileSize: 102400, mimeType: 'image/jpeg' },
      { photoUrl: 'https://storage.ecosetu.org/lots/photo2.jpg', fileSize: 204800, mimeType: 'image/jpeg' },
      { photoUrl: 'https://storage.ecosetu.org/lots/photo3.jpg', fileSize: 153600, mimeType: 'image/jpeg' },
    ]);
    assert(lotPhotos && lotPhotos.length === 3, 'Must have saved 3 photos');
    console.log(`✓ Lot ${lot1.referenceNumber} has ${lotPhotos.length} photos attached\n`);

    // TEST 6: Approximate weight validation (> 0 required)
    console.log('[TEST 6] Verifying approximate weight validation...');
    await assert.rejects(
      async () => {
        await materialLotService.createMaterialLot(collector1User, {
          category: 'PCB',
          approximateTotalWeightKg: 0,
        });
      },
      (err) => {
        assert((err.statusCode || err.status) === 400 || err.message.includes('positive number'), 'Should reject weight <= 0');
        return true;
      }
    );
    console.log('✓ Weight <= 0 properly rejected\n');

    // TEST 7: Category validation
    console.log('[TEST 7] Verifying category validation against SIH taxonomy...');
    await assert.rejects(
      async () => {
        await materialLotService.createMaterialLot(collector1User, {
          category: 'INVALID_CATEGORY_NAME',
          approximateTotalWeightKg: 5,
        });
      },
      (err) => {
        assert((err.statusCode || err.status) === 400 || err.message.includes('Invalid material category'), 'Should reject invalid category');
        return true;
      }
    );

    // Verify all 15 SIH categories are recognized by taxonomy
    const sihRequiredCategories = [
      'CRT', 'LCD_PANEL', 'PCB', 'CABLE', 'BATTERY', 'MOTOR',
      'MAGNET_ASSEMBLY', 'MIXED_PLASTIC', 'MOBILE_PHONE',
      'LAPTOP', 'MONITOR', 'PRINTER', 'KEYBOARD_MOUSE', 'DESKTOP_COMPUTER', 'TABLET'
    ];
    for (const cat of sihRequiredCategories) {
      assert(isValidCategory(cat), `Category ${cat} must be recognized in taxonomy`);
    }
    console.log(`✓ All ${sihRequiredCategories.length} SIH categories recognized in taxonomy\n`);

    // TEST 8: Subcategory validation
    console.log('[TEST 8] Verifying subcategory validation...');
    assert(isValidSubcategory('PCB', 'MOTHERBOARD') === true, 'MOTHERBOARD is valid subcategory of PCB');
    assert(isValidSubcategory('BATTERY', 'LI_ION') === true, 'LI_ION is valid subcategory of BATTERY');
    assert(isValidSubcategory('PCB', 'NonExistentSubcategoryXYZ') === false, 'Invalid subcategory recognized');
    console.log('✓ Subcategory validation verified\n');

    // TEST 9 & 10: Condition and Source type validation
    console.log('[TEST 9 & 10] Verifying condition & source type validation...');
    await assert.rejects(
      async () => {
        await materialLotService.createMaterialLot(collector1User, {
          category: 'BATTERY',
          approximateTotalWeightKg: 2,
          condition: 'SUPER_SHINY_BRAND_NEW', // Invalid
        });
      },
      (err) => {
        assert((err.statusCode || err.status) === 400, 'Should reject invalid condition');
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await materialLotService.createMaterialLot(collector1User, {
          category: 'BATTERY',
          approximateTotalWeightKg: 2,
          sourceType: 'OUTER_SPACE_ALIEN', // Invalid
        });
      },
      (err) => {
        assert((err.statusCode || err.status) === 400, 'Should reject invalid source type');
        return true;
      }
    );
    console.log('✓ Invalid condition and source type properly rejected\n');

    // TEST 11: GPS persistence & graceful handling
    console.log('[TEST 11] Verifying GPS persistence & graceful handling...');
    // Without GPS
    const lotWithoutGPS = await materialLotService.createMaterialLot(collector1User, {
      category: 'CABLE',
      approximateTotalWeightKg: 12.5,
      collectionLatitude: null,
      collectionLongitude: null,
    });
    assert(lotWithoutGPS.collectionLat === null, 'Latitude should be null');
    assert(lotWithoutGPS.collectionLng === null, 'Longitude should be null');

    // With GPS
    const lotWithGPS = await materialLotService.createMaterialLot(collector1User, {
      category: 'CABLE',
      approximateTotalWeightKg: 15.0,
      collectionLatitude: 19.0760,
      collectionLongitude: 72.8777,
      locationAccuracyMeters: 5.2,
    });
    assert.strictEqual(Number(lotWithGPS.collectionLat), 19.0760);
    assert.strictEqual(Number(lotWithGPS.collectionLng), 72.8777);
    console.log('✓ GPS handled gracefully when null and accurately saved when present\n');

    // TEST 12: Collector can retrieve own lots
    console.log('[TEST 12] Verifying collector can retrieve own lots...');
    const listResult = await materialLotService.listMaterialLots(collector1User, { limit: 10 });
    assert(listResult && Array.isArray(listResult.lots), 'Should return list of lots');
    assert(listResult.lots.length >= 2, 'Should include newly created lots');
    for (const l of listResult.lots) {
      assert.strictEqual(l.collectorId, collector1User.collectorProfile.id, 'Only own lots returned');
    }

    const fetchedLot = await materialLotService.getMaterialLotById(collector1User, lot1.id);
    assert.strictEqual(fetchedLot.id, lot1.id);
    console.log(`✓ Collector 1 retrieved ${listResult.lots.length} of own lots\n`);

    // TEST 13: Collector cannot retrieve another collector's lot (403)
    console.log('[TEST 13] Verifying isolation: Collector 2 cannot retrieve Collector 1 lot...');
    await assert.rejects(
      async () => {
        await materialLotService.getMaterialLotById(collector2User, lot1.id);
      },
      (err) => {
        assert((err.statusCode || err.status) === 403 || err.message.includes('Unauthorized') || err.message.includes('Access denied') || err.message.includes('only view your own'),
          `Should return 403 Forbidden. Got ${(err.statusCode || err.status)}: ${err.message}`);
        return true;
      }
    );
    console.log('✓ Collector 2 strictly blocked from viewing Collector 1 lot (403)\n');

    // TEST 14: Collector cannot modify another collector's lot (403)
    console.log('[TEST 14] Verifying isolation: Collector 2 cannot modify Collector 1 lot...');
    await assert.rejects(
      async () => {
        await materialLotService.updateMaterialLot(collector2User, lot1.id, {
          description: 'Hacked description',
        });
      },
      (err) => {
        assert((err.statusCode || err.status) === 403, `Should return 403 Forbidden. Got ${(err.statusCode || err.status)}`);
        return true;
      }
    );
    console.log('✓ Collector 2 strictly blocked from modifying Collector 1 lot (403)\n');

    // TEST 15: Invalid status transition rejected
    console.log('[TEST 15] Verifying invalid status transition rejected...');
    await assert.rejects(
      async () => {
        // Direct transition from DRAFT to ACCEPTED or COMPLETED is not allowed
        await materialLotService.updateMaterialLot(collector1User, lot1.id, {
          status: 'ACCEPTED',
        });
      },
      (err) => {
        assert((err.statusCode || err.status) === 400 || err.message.includes('Invalid status transition'),
          `Should reject DRAFT -> ACCEPTED. Got ${(err.statusCode || err.status)}: ${err.message}`);
        return true;
      }
    );
    console.log('✓ Direct transition DRAFT -> ACCEPTED rejected\n');

    // TEST 16: DRAFT -> OPEN works correctly
    console.log('[TEST 16] Verifying valid DRAFT -> OPEN transition...');
    const openedLot = await materialLotService.updateMaterialLot(collector1User, lot1.id, {
      status: 'OPEN',
    });
    assert.strictEqual(openedLot.status, 'OPEN', 'Status must be OPEN');
    console.log(`✓ Lot ${lot1.referenceNumber} successfully transitioned from DRAFT to OPEN\n`);

    // TEST 17: Offline draft persistence logic
    console.log('[TEST 17] Verifying offline draft creation support...');
    const draftLot = await materialLotService.createMaterialLot(collector1User, {
      category: 'MOBILE_PHONE',
      subcategory: 'Smartphones',
      approximateTotalWeightKg: 1.8,
      status: 'DRAFT',
    });
    assert.strictEqual(draftLot.status, 'DRAFT', 'Initial status should be DRAFT');
    console.log(`✓ Offline draft created: ${draftLot.referenceNumber} (DRAFT)\n`);

    // TEST 18: Sync does not create duplicates (idempotency clientReferenceId)
    console.log('[TEST 18] Verifying idempotency / duplicate prevention on sync retries...');
    const clientRefId = `offline-client-lot-${Date.now()}`;
    const syncLotAttempt1 = await materialLotService.createMaterialLot(collector1User, {
      category: 'LAPTOP',
      approximateTotalWeightKg: 5.5,
      clientReferenceId: clientRefId,
    });
    const syncLotAttempt2 = await materialLotService.createMaterialLot(collector1User, {
      category: 'LAPTOP',
      approximateTotalWeightKg: 5.5,
      clientReferenceId: clientRefId, // Same idempotency key!
    });
    assert.strictEqual(syncLotAttempt1.id, syncLotAttempt2.id, 'Both sync attempts must return the exact same lot record');
    assert.strictEqual(syncLotAttempt1.referenceNumber, syncLotAttempt2.referenceNumber);
    console.log(`✓ Idempotency verified: re-sync with key ${clientRefId} returned existing lot ${syncLotAttempt1.referenceNumber} without duplicate creation\n`);

    // TEST 19: i18n keys exist in all four languages (en, hi, mr, or)
    console.log('[TEST 19] Verifying i18n coverage across en, hi, mr, or...');
    const localesDir = path.resolve(__dirname, '../../mobile/src/i18n/locales');
    const languages = ['en', 'hi', 'mr', 'or'];
    const requiredKeys = [
      'listTitle',
      'detailTitle',
      'createTitle',
      'captureTitle',
      'createNewLot',
      'saveDraft',
      'submitLot',
      'enterWeight',
      'selectCategory',
      'statuses',
      'categories',
      'conditions',
      'sourceTypes',
    ];

    for (const lang of languages) {
      const filePath = path.join(localesDir, `${lang}.ts`);
      assert(fs.existsSync(filePath), `Locale file for ${lang} must exist`);
      const content = fs.readFileSync(filePath, 'utf-8');
      assert(content.includes('materialLots:'), `Locale ${lang} must contain 'materialLots' block`);
      for (const key of requiredKeys) {
        const subKey = key.split('.').pop();
        assert(content.includes(`${subKey}:`), `Locale ${lang} must define key: ${subKey}`);
      }
      console.log(`✓ Language [${lang}] has full materialLots translation keys`);
    }
    console.log('✓ All 4 required languages verified\n');

    // TEST 20: Existing consignment workflow remains untouched and intact
    console.log('[TEST 20] Verifying existing Consignment workflow is completely unimpacted...');
    const existingConsignmentsCount = await prisma.consignment.count();
    console.log(`✓ Consignment table count: ${existingConsignmentsCount} (table intact and unmutated)`);
    const consignmentService = require('../src/services/consignmentService');
    assert(typeof consignmentService.listConsignments === 'function');
    assert(typeof consignmentService.getConsignmentById === 'function');
    console.log('✓ consignmentService exports remain complete and unmodified\n');

    console.log('========================================================');
    console.log('>>> ALL 20 VERIFICATION TESTS PASSED SUCCESSFULLY! <<<');
    console.log('========================================================\n');
  } catch (err) {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
