/**
 * inspect-sih-remaining-records.js
 * READ-ONLY inspection of the remaining demo database records.
 * 
 * NO MUTATIONS. NO DELETES. NO CREATES.
 * Only SELECT queries.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const prisma = require('../src/config/database');

async function inspectRecords() {
  console.log('\n========================================================');
  console.log('  ECOSETU — SIH REMAINING RECORDS INSPECTION (READ-ONLY)');
  console.log('========================================================\n');

  try {
    // 1. Collection Requests
    console.log('--- Collection Requests ---');
    const requests = await prisma.collectionRequest.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        citizen: {
          select: { id: true, email: true, name: true, role: true, status: true },
        },
        ewasteItems: {
          select: { id: true, category: true, condition: true },
        },
        pickup: {
          select: { id: true, status: true, createdAt: true },
        },
        pickupOffers: {
          select: { id: true, status: true, createdAt: true },
        },
      },
    });

    console.log(`Total Collection Requests: ${requests.length}\n`);
    for (const req of requests) {
      console.log(`  ID         : ${req.id}`);
      console.log(`  Status     : ${req.status}`);
      console.log(`  Created At : ${req.createdAt.toISOString()}`);
      console.log(`  Citizen    : ${req.citizen?.email || 'N/A'} (role=${req.citizen?.role}, status=${req.citizen?.status})`);
      const pickupArr = req.pickup ? [req.pickup] : [];
      console.log(`  Pickup     : ${pickupArr.length} -> ${pickupArr.map(p => p.id + '[' + p.status + ']').join(', ') || 'none'}`);
      console.log(`  Offers     : ${req.pickupOffers.length} -> ${req.pickupOffers.map(o => o.id + '[' + o.status + ']').join(', ') || 'none'}`);
      console.log(`  EWaste Items: ${req.ewasteItems.length} -> ${req.ewasteItems.map(e => e.category + '[' + e.condition + ']').join(', ') || 'none'}`);
      console.log('');
    }

    // 2. Pickups
    console.log('--- Pickups ---');
    const pickups = await prisma.pickup.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        collectionRequest: {
          select: { id: true, status: true, createdAt: true },
        },
        collector: {
          select: {
            userId: true,
            serviceArea: true,
            city: true,
            user: { select: { email: true, name: true, role: true } },
          },
        },
      },
    });

    console.log(`Total Pickups: ${pickups.length}\n`);
    for (const p of pickups) {
      console.log(`  ID              : ${p.id}`);
      console.log(`  Status          : ${p.status}`);
      console.log(`  Created At      : ${p.createdAt.toISOString()}`);
      console.log(`  Completed At    : ${p.completedAt ? p.completedAt.toISOString() : 'N/A'}`);
      console.log(`  Request ID      : ${p.collectionRequestId}`);
      console.log(`  Request Status  : ${p.collectionRequest?.status}`);
      console.log(`  Collector User  : ${p.collector?.user?.email || 'N/A'} (name=${p.collector?.user?.name}, role=${p.collector?.user?.role})`);
      console.log('');
    }

    // 3. Pickup Offers
    console.log('--- Pickup Offers ---');
    const pickupOffers = await prisma.pickupOffer.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        collectionRequest: {
          select: { id: true, status: true },
        },
        collector: {
          select: {
            userId: true,
            user: { select: { email: true, name: true, role: true } },
          },
        },
      },
    });

    console.log(`Total Pickup Offers: ${pickupOffers.length}\n`);
    for (const o of pickupOffers) {
      console.log(`  ID              : ${o.id}`);
      console.log(`  Status          : ${o.status}`);
      console.log(`  Created At      : ${o.createdAt.toISOString()}`);
      console.log(`  Offered Price   : ${o.offeredPrice}`);
      console.log(`  Request ID      : ${o.collectionRequestId}`);
      console.log(`  Request Status  : ${o.collectionRequest?.status}`);
      console.log(`  Collector       : ${o.collector?.user?.email || 'N/A'} (role=${o.collector?.user?.role})`);
      console.log('');
    }

    // 4. Cross-reference: are they all related?
    console.log('--- Cross-Reference ---');
    if (requests.length > 0 && pickups.length > 0) {
      const reqIds = new Set(requests.map(r => r.id));
      for (const p of pickups) {
        console.log(`  Pickup [${p.id}]`);
        console.log(`    -> CollectionRequest [${p.collectionRequestId}]: ${reqIds.has(p.collectionRequestId) ? 'LINKED to remaining request' : 'references different request ID'}`);
      }
    }
    if (requests.length > 0 && pickupOffers.length > 0) {
      const reqIds = new Set(requests.map(r => r.id));
      for (const o of pickupOffers) {
        console.log(`  PickupOffer [${o.id}]`);
        console.log(`    -> CollectionRequest [${o.collectionRequestId}]: ${reqIds.has(o.collectionRequestId) ? 'LINKED to remaining request' : 'references different request ID'}`);
      }
    }

    // 5. Age analysis
    console.log('\n--- Age Analysis ---');
    const now = new Date();
    for (const req of requests) {
      const ageHours = (now - req.createdAt) / (1000 * 60 * 60);
      const ageDays = ageHours / 24;
      console.log(`  CollectionRequest [${req.id}]:`);
      console.log(`    Created: ${req.createdAt.toISOString()}`);
      console.log(`    Age: ${ageHours.toFixed(1)} hours / ${ageDays.toFixed(1)} days`);
      console.log(`    Classification: ${ageDays > 1 ? 'PRE-EXISTING (>1 day old)' : ageHours > 1 ? 'RECENT (1-24h)' : 'VERY RECENT (<1h - likely test artifact)'}`);
    }
    for (const p of pickups) {
      const ageHours = (now - p.createdAt) / (1000 * 60 * 60);
      const ageDays = ageHours / 24;
      console.log(`  Pickup [${p.id}]:`);
      console.log(`    Created: ${p.createdAt.toISOString()}`);
      console.log(`    Age: ${ageHours.toFixed(1)} hours / ${ageDays.toFixed(1)} days`);
      console.log(`    Classification: ${ageDays > 1 ? 'PRE-EXISTING (>1 day old)' : ageHours > 1 ? 'RECENT (1-24h)' : 'VERY RECENT (<1h - likely test artifact)'}`);
    }
    for (const o of pickupOffers) {
      const ageHours = (now - o.createdAt) / (1000 * 60 * 60);
      const ageDays = ageHours / 24;
      console.log(`  PickupOffer [${o.id}]:`);
      console.log(`    Created: ${o.createdAt.toISOString()}`);
      console.log(`    Age: ${ageHours.toFixed(1)} hours / ${ageDays.toFixed(1)} days`);
      console.log(`    Classification: ${ageDays > 1 ? 'PRE-EXISTING (>1 day old)' : ageHours > 1 ? 'RECENT (1-24h)' : 'VERY RECENT (<1h - likely test artifact)'}`);
    }

    console.log('\n========================================================');
    console.log('  INSPECTION COMPLETE — NO MUTATIONS PERFORMED');
    console.log('========================================================\n');

  } catch (err) {
    console.error('Inspection error:', err.message);
    console.error(err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

inspectRecords();
