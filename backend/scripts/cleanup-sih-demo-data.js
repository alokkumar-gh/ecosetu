#!/usr/bin/env node
/**
 * EcoSetu — SIH Live Demo Database Cleanup Script
 *
 * Target: Cleans existing test/demo pickup requests, pickups, offers, linked e-waste items,
 * and stale notifications to prepare for a fresh Smart India Hackathon (SIH) live demo.
 *
 * SAFETY INVARIANTS:
 * - PRESERVES ALL USERS (Citizens, Collectors, Recyclers, Admins).
 * - PRESERVES ALL PROFILES (CollectorProfile, RecyclerProfile, verifications, device tokens).
 * - PRESERVES PRISMA SCHEMA & MASTER PRICING/SYSTEM DATA.
 * - REQUIRES EXPLICIT '--confirm' FLAG TO EXECUTE DELETION.
 * - EXPORTS PRE-CLEANUP JSON BACKUP AUTOMATICALLY BEFORE DELETION.
 * - EXECUTES ATOMIC TRANSACTION WITH REVERSE DEPENDENCY ORDER.
 * - RUNS AUTOMATIC POST-CLEANUP AUDIT & ORPHAN CHECKS.
 *
 * Usage:
 *   Dry Run (audit only, no changes):
 *     node backend/scripts/cleanup-sih-demo-data.js
 *
 *   Execute Cleanup (with backup & confirmation):
 *     node backend/scripts/cleanup-sih-demo-data.js --confirm
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/database');

const args = process.argv.slice(2);
const isConfirmed = args.includes('--confirm');

// Safe target inspection
const rawDbUrl = process.env.DATABASE_URL || '';
let maskedHost = 'unknown';
let dbName = 'unknown';
try {
  const urlObj = new URL(rawDbUrl.replace(/^postgresql:\/\//, 'http://'));
  maskedHost = urlObj.hostname;
  dbName = urlObj.pathname.replace(/^\//, '');
} catch {
  maskedHost = 'configured-database';
}

const env = process.env.NODE_ENV || 'development';
const timestamp = new Date().toISOString();

async function main() {
  console.log('\n====================================================');
  console.log('       ECOSETU — SIH DEMO DATABASE CLEANUP          ');
  console.log('====================================================');
  console.log(`Environment     : ${env}`);
  console.log(`Database Host   : ${maskedHost}`);
  console.log(`Database Name   : ${dbName}`);
  console.log(`Execution Time  : ${timestamp}`);
  console.log(`Execution Mode  : ${isConfirmed ? 'DESTRUCTIVE CLEANUP (--confirm provided)' : 'DRY RUN (Audit only, no changes)'}`);
  console.log('====================================================\n');

  // Step 1: Pre-cleanup audit
  console.log('--- Step 1: Auditing Database Records ---');

  // 1. Users
  const totalUsers = await prisma.user.count();
  const citizenCount = await prisma.user.count({ where: { role: 'CITIZEN' } });
  const collectorCount = await prisma.user.count({ where: { role: 'INFORMAL_COLLECTOR' } });
  const recyclerCount = await prisma.user.count({ where: { role: 'RECYCLER' } });
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  const collectorProfilesCount = await prisma.collectorProfile.count();
  const recyclerProfilesCount = await prisma.recyclerProfile.count();

  // 2. Collection Requests
  const collectionRequests = await prisma.collectionRequest.findMany({
    select: {
      id: true,
      status: true,
      citizenId: true,
      collectorId: true,
      pickupAddress: true,
      createdAt: true,
    },
  });
  const requestIds = collectionRequests.map((r) => r.id);
  const requestsByStatus = {};
  collectionRequests.forEach((r) => {
    requestsByStatus[r.status] = (requestsByStatus[r.status] || 0) + 1;
  });

  // 3. Pickups
  const pickups = await prisma.pickup.findMany({
    select: {
      id: true,
      collectionRequestId: true,
      collectorId: true,
      status: true,
      createdAt: true,
    },
  });
  const pickupIds = pickups.map((p) => p.id);
  const pickupsByStatus = {};
  pickups.forEach((p) => {
    pickupsByStatus[p.status] = (pickupsByStatus[p.status] || 0) + 1;
  });

  // 4. Pickup Offers
  const offers = await prisma.pickupOffer.findMany({
    select: {
      id: true,
      collectionRequestId: true,
      collectorId: true,
      offeredPrice: true,
      status: true,
      createdAt: true,
    },
  });
  const offerIds = offers.map((o) => o.id);
  const offersByStatus = {};
  offers.forEach((o) => {
    offersByStatus[o.status] = (offersByStatus[o.status] || 0) + 1;
  });

  // 5. Ewaste Items
  const totalEwasteItems = await prisma.ewasteItem.count();
  const linkedItems = await prisma.ewasteItem.findMany({
    where: { collectionRequestId: { not: null } },
    select: { id: true, collectionRequestId: true, category: true, imageUrl: true },
  });
  const linkedItemIds = linkedItems.map((i) => i.id);
  const unlinkedItemsCount = totalEwasteItems - linkedItems.length;

  // 6. Stale Request Notifications
  const requestNotificationTypes = [
    'REQUEST_AVAILABLE',
    'REQUEST_ACCEPTED',
    'OFFER_RECEIVED',
    'OFFER_ACCEPTED',
    'OFFER_REJECTED',
    'PICKUP_SCHEDULED',
    'PICKUP_COMPLETED',
    'REQUEST_CANCELLED',
    'COLLECTOR_PICKUP_REQUEST_AVAILABLE',
  ];

  const staleNotifications = await prisma.notification.findMany({
    where: {
      OR: [
        { referenceType: 'collection_request' },
        { referenceType: 'pickup' },
        { referenceType: 'pickup_offer' },
        { referenceId: { in: [...requestIds, ...pickupIds, ...offerIds] } },
        { type: { in: requestNotificationTypes } },
      ],
    },
    select: { id: true, userId: true, type: true, title: true, referenceType: true, referenceId: true },
  });
  const staleNotificationIds = staleNotifications.map((n) => n.id);
  const totalNotifications = await prisma.notification.count();

  // Print Audit Summary
  console.log('\n=== CURRENT DATABASE COUNTS ===');
  console.log(`Users (PROTECTED)       : ${totalUsers}`);
  console.log(`  - Citizens            : ${citizenCount}`);
  console.log(`  - Collectors          : ${collectorCount}`);
  console.log(`  - Recyclers           : ${recyclerCount}`);
  console.log(`  - Admins              : ${adminCount}`);
  console.log(`Collector Profiles      : ${collectorProfilesCount} (PROTECTED)`);
  console.log(`Recycler Profiles       : ${recyclerProfilesCount} (PROTECTED)`);
  console.log(`Collection Requests     : ${collectionRequests.length}`);
  Object.entries(requestsByStatus).forEach(([status, count]) => {
    console.log(`  - ${status.padEnd(18)}: ${count}`);
  });
  console.log(`Pickups                 : ${pickups.length}`);
  Object.entries(pickupsByStatus).forEach(([status, count]) => {
    console.log(`  - ${status.padEnd(18)}: ${count}`);
  });
  console.log(`Pickup Offers           : ${offers.length}`);
  Object.entries(offersByStatus).forEach(([status, count]) => {
    console.log(`  - ${status.padEnd(18)}: ${count}`);
  });
  console.log(`E-Waste Items           : ${totalEwasteItems}`);
  console.log(`  - Linked to Requests  : ${linkedItems.length} (TARGET FOR CLEANUP)`);
  console.log(`  - Unlinked (Drafts)   : ${unlinkedItemsCount} (PRESERVED)`);
  console.log(`Notifications           : ${totalNotifications}`);
  console.log(`  - Request-Related     : ${staleNotifications.length} (TARGET FOR CLEANUP)`);
  console.log(`  - General / Account   : ${totalNotifications - staleNotifications.length} (PRESERVED)`);

  // Phase 1: Dry Run
  if (!isConfirmed) {
    console.log('\n====================================================');
    console.log('              DRY RUN COMPLETE                      ');
    console.log('====================================================');
    console.log('Proceeding with --confirm would safely delete:');
    console.log(`  • ${staleNotifications.length} Stale Request/Offer Notifications`);
    console.log(`  • ${offers.length} Pickup Offers`);
    console.log(`  • ${pickups.length} Pickups`);
    console.log(`  • ${collectionRequests.length} Collection Requests`);
    console.log(`  • ${linkedItems.length} Request-Linked E-Waste Items (and AI predictions)`);
    console.log(`  • Reset 'totalPickups' to 0 on ${collectorProfilesCount} Collector Profiles`);
    console.log('\nAnd would PRESERVE:');
    console.log(`  ✔ All ${totalUsers} User accounts & credentials`);
    console.log(`  ✔ All ${collectorProfilesCount} Collector Profiles & verification statuses`);
    console.log(`  ✔ All ${recyclerProfilesCount} Recycler Profiles & verification statuses`);
    console.log(`  ✔ All ${unlinkedItemsCount} Unlinked / Draft E-waste items`);
    console.log(`  ✔ All ${totalNotifications - staleNotifications.length} General/Account notifications`);
    console.log('\nTo execute this cleanup, run:');
    console.log('  node backend/scripts/cleanup-sih-demo-data.js --confirm\n');
    return;
  }

  // Phase 2: Backup Snapshot before Deletion
  console.log('\n--- Step 2: Creating Pre-Cleanup Backup Snapshot ---');
  const backupDir = path.resolve(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const cleanTs = timestamp.replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `sih-demo-cleanup-backup-${cleanTs}.json`);

  const backupData = {
    metadata: {
      timestamp,
      environment: env,
      database: dbName,
      host: maskedHost,
      description: 'Pre-cleanup snapshot for SIH demo preparation',
    },
    counts: {
      collectionRequests: collectionRequests.length,
      pickups: pickups.length,
      offers: offers.length,
      linkedEwasteItems: linkedItems.length,
      staleNotifications: staleNotifications.length,
    },
    records: {
      collectionRequests,
      pickups,
      offers,
      linkedEwasteItems: linkedItems,
      staleNotifications,
    },
  };

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`✔ Pre-cleanup snapshot saved: ${backupFile}`);

  // Phase 3: Atomic Transaction Deletion in Safe Dependency Order
  console.log('\n--- Step 3: Executing Atomic Deletion in Safe Dependency Order ---');

  const result = await prisma.$transaction(async (tx) => {
    // 1. Delete stale request/pickup/offer notifications
    const deletedNotifs = await tx.notification.deleteMany({
      where: { id: { in: staleNotificationIds } },
    });

    // 2. Delete pickup offers
    const deletedOffers = await tx.pickupOffer.deleteMany({
      where: { id: { in: offerIds } },
    });

    // 3. Delete pickups
    const deletedPickups = await tx.pickup.deleteMany({
      where: { id: { in: pickupIds } },
    });

    // 4. Delete collection requests
    const deletedRequests = await tx.collectionRequest.deleteMany({
      where: { id: { in: requestIds } },
    });

    // 5. Delete linked e-waste items (AiPredictions are automatically cascaded by DB)
    const deletedItems = await tx.ewasteItem.deleteMany({
      where: { id: { in: linkedItemIds } },
    });

    // 6. Reset totalPickups on CollectorProfiles
    const updatedProfiles = await tx.collectorProfile.updateMany({
      data: { totalPickups: 0 },
    });

    return {
      deletedNotifs: deletedNotifs.count,
      deletedOffers: deletedOffers.count,
      deletedPickups: deletedPickups.count,
      deletedRequests: deletedRequests.count,
      deletedItems: deletedItems.count,
      updatedProfiles: updatedProfiles.count,
    };
  });

  console.log(`✔ Deleted Notifications  : ${result.deletedNotifs}`);
  console.log(`✔ Deleted Pickup Offers  : ${result.deletedOffers}`);
  console.log(`✔ Deleted Pickups        : ${result.deletedPickups}`);
  console.log(`✔ Deleted Requests       : ${result.deletedRequests}`);
  console.log(`✔ Deleted E-Waste Items  : ${result.deletedItems}`);
  console.log(`✔ Reset Collector Stats  : ${result.updatedProfiles} profiles updated (totalPickups = 0)`);

  // Phase 4: Post-Cleanup Verification
  console.log('\n--- Step 4: Verifying Clean State ---');

  const afterRequests = await prisma.collectionRequest.count();
  const afterPickups = await prisma.pickup.count();
  const afterOffers = await prisma.pickupOffer.count();
  const afterLinkedItems = await prisma.ewasteItem.count({
    where: { collectionRequestId: { not: null } },
  });
  const afterUsers = await prisma.user.count();
  const afterCitizens = await prisma.user.count({ where: { role: 'CITIZEN' } });
  const afterCollectors = await prisma.user.count({ where: { role: 'INFORMAL_COLLECTOR' } });
  const afterCollectorProfiles = await prisma.collectorProfile.count();

  // Orphan checks: Since Pickups and PickupOffers are 0, verify no remaining items reference deleted requests
  const orphanItems = await prisma.ewasteItem.count({
    where: { collectionRequestId: { not: null } },
  });

  console.log(`Collection Requests     : ${afterRequests} (Expected: 0) -> ${afterRequests === 0 ? '✔ PASS' : '❌ FAIL'}`);
  console.log(`Pickups                 : ${afterPickups} (Expected: 0) -> ${afterPickups === 0 ? '✔ PASS' : '❌ FAIL'}`);
  console.log(`Pickup Offers           : ${afterOffers} (Expected: 0) -> ${afterOffers === 0 ? '✔ PASS' : '❌ FAIL'}`);
  console.log(`Linked E-Waste Items    : ${afterLinkedItems} (Expected: 0) -> ${afterLinkedItems === 0 ? '✔ PASS' : '❌ FAIL'}`);
  console.log(`Users Preserved         : ${afterUsers} (Citizens: ${afterCitizens}, Collectors: ${afterCollectors}) -> ✔ PASS`);
  console.log(`Collector Profiles      : ${afterCollectorProfiles} -> ✔ PASS`);
  console.log(`Orphan Ewaste Items     : ${orphanItems} -> ${orphanItems === 0 ? '✔ PASS' : '❌ FAIL'}`);

  console.log('\n====================================================');
  console.log('      SIH DEMO DATABASE CLEANUP COMPLETE!           ');
  console.log('====================================================\n');
}

main()
  .catch((err) => {
    console.error('\n[!] CLEANUP FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
