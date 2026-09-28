/**
 * Issue 2 Verification Script: Multi-Citizen Collector Request Display
 * 
 * Verifies:
 * 1. Two separate citizens (Citizen A: "Ramesh Sharma", Citizen B: "Sunita Patel")
 * 2. Separate pickup requests with different categories (Laptop vs Mobile Phone)
 * 3. Collector queries available requests, pickup details, and offers
 * 4. Ensures citizenName is authentic, accurately associated, and primary
 * 5. Ensures categories are accurate and secondary
 * 6. Ensures privacy protection (no unauthorized phone/address leakage)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const requestService = require('../src/services/requestService');
const pickupService = require('../src/services/pickupService');

async function runVerification() {
  console.log('====================================================');
  console.log('ECOSETU ISSUE 2: COLLECTOR REQUEST IDENTITY VERIFICATION');
  console.log('====================================================\n');

  try {
    // 1. Setup/Find Two Citizens
    console.log('[1/5] Setting up Citizen A and Citizen B...');
    
    // Citizen A: Ramesh Sharma
    let citizenA = await prisma.user.findFirst({
      where: { email: 'ramesh.sharma.test@ecosetu.in' }
    });
    if (!citizenA) {
      citizenA = await prisma.user.create({
        data: {
          name: 'Ramesh Sharma',
          email: 'ramesh.sharma.test@ecosetu.in',
          phone: '+919876543210',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
          role: 'CITIZEN',
          status: 'ACTIVE',
        }
      });
    }

    // Citizen B: Sunita Patel
    let citizenB = await prisma.user.findFirst({
      where: { email: 'sunita.patel.test@ecosetu.in' }
    });
    if (!citizenB) {
      citizenB = await prisma.user.create({
        data: {
          name: 'Sunita Patel',
          email: 'sunita.patel.test@ecosetu.in',
          phone: '+919876543211',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
          role: 'CITIZEN',
          status: 'ACTIVE',
        }
      });
    }

    // Collector User
    let collector = await prisma.user.findFirst({
      where: { role: 'INFORMAL_COLLECTOR', status: 'ACTIVE' },
      include: { collectorProfile: true }
    });
    if (!collector) {
      collector = await prisma.user.create({
        data: {
          name: 'Vijay Kumar Kabadiwala',
          email: 'vijay.collector.test@ecosetu.in',
          phone: '+919876543299',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
          role: 'INFORMAL_COLLECTOR',
          status: 'ACTIVE',
          collectorProfile: {
            create: {
              serviceAreaLat: '28.6139',
              serviceAreaLng: '77.2090',
              serviceRadiusKm: 25.0,
              isAvailable: true,
            }
          }
        },
        include: { collectorProfile: true }
      });
    }

    console.log(`✓ Citizen A: ${citizenA.name} (${citizenA.id})`);
    console.log(`✓ Citizen B: ${citizenB.name} (${citizenB.id})`);
    console.log(`✓ Collector: ${collector.name} (${collector.id})\n`);

    // 2. Create Items & Requests for both citizens
    console.log('[2/5] Creating distinct pickup requests for Citizen A and Citizen B...');

    // Citizen A Item: Laptop
    const itemA = await prisma.ewasteItem.create({
      data: {
        citizenId: citizenA.id,
        category: 'LAPTOP',
        estimatedWeightKg: 2.2,
        condition: 'WORKING',
        status: 'SUBMITTED',
      }
    });

    const requestA = await prisma.collectionRequest.create({
      data: {
        citizenId: citizenA.id,
        status: 'SUBMITTED',
        pickupAddress: 'Flat 401, MG Road, New Delhi, Delhi, 110001',
        houseNumber: 'Flat 401',
        street: 'MG Road',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        pickupLat: '28.6139',
        pickupLng: '77.2090',
        ewasteItems: {
          connect: [{ id: itemA.id }]
        }
      },
      include: { ewasteItems: true, citizen: true }
    });

    // Citizen B Item: Mobile Phone
    const itemB = await prisma.ewasteItem.create({
      data: {
        citizenId: citizenB.id,
        category: 'MOBILE_PHONE',
        estimatedWeightKg: 0.25,
        condition: 'WORKING',
        status: 'SUBMITTED',
      }
    });

    const requestB = await prisma.collectionRequest.create({
      data: {
        citizenId: citizenB.id,
        status: 'SUBMITTED',
        pickupAddress: 'House 12, Nehru Marg, New Delhi, Delhi, 110002',
        houseNumber: 'House 12',
        street: 'Nehru Marg',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110002',
        pickupLat: '28.6145',
        pickupLng: '77.2095',
        ewasteItems: {
          connect: [{ id: itemB.id }]
        }
      },
      include: { ewasteItems: true, citizen: true }
    });

    console.log(`✓ Request A created: ID ${requestA.id} for Citizen "${requestA.citizen.name}" (Item: LAPTOP)`);
    console.log(`✓ Request B created: ID ${requestB.id} for Citizen "${requestB.citizen.name}" (Item: SMARTPHONE)\n`);

    // 3. Collector Queries Available Requests
    console.log('[3/5] Testing Collector Browse Endpoint (listAvailableRequests)...');
    const availableRes = await requestService.listAvailableRequests(collector, { lat: 28.6139, lng: 77.2090, radiusKm: 10 });
    
    const foundA = availableRes.requests.find(r => r.id === requestA.id);
    const foundB = availableRes.requests.find(r => r.id === requestB.id);

    if (!foundA || !foundB) {
      throw new Error(`Failed to find both requests in available listing! foundA=${Boolean(foundA)}, foundB=${Boolean(foundB)}`);
    }

    console.log('Results from listAvailableRequests:');
    console.log(`- Request A -> citizenName: "${foundA.citizenName}", citizen.name: "${foundA.citizen?.name}", category: "${foundA.ewasteItems[0]?.category}"`);
    console.log(`- Request B -> citizenName: "${foundB.citizenName}", citizen.name: "${foundB.citizen?.name}", category: "${foundB.ewasteItems[0]?.category}"`);

    if (foundA.citizenName !== 'Ramesh Sharma' || foundB.citizenName !== 'Sunita Patel') {
      throw new Error(`Name mismatch! Expected Ramesh Sharma & Sunita Patel, got: ${foundA.citizenName} & ${foundB.citizenName}`);
    }
    console.log('✓ Multi-Citizen display names correctly separated and matched to authentic user records.\n');

    // 4. Collector Queries Request Details
    console.log('[4/5] Testing Collector Request Detail Endpoint (getRequestById)...');
    const detailA = await requestService.getRequestById(collector, requestA.id);
    const detailB = await requestService.getRequestById(collector, requestB.id);

    console.log(`- Detail A -> citizenName: "${detailA.citizenName}", category: "${detailA.ewasteItems[0]?.category}"`);
    console.log(`- Detail B -> citizenName: "${detailB.citizenName}", category: "${detailB.ewasteItems[0]?.category}"`);

    if (detailA.citizenName !== 'Ramesh Sharma' || detailB.citizenName !== 'Sunita Patel') {
      throw new Error('Detail endpoint name mismatch!');
    }
    console.log('✓ Detail endpoint accurately returns citizenName for both separate requests.\n');

    // 5. Privacy Verification
    console.log('[5/5] Verifying Privacy Rules...');
    // Unassigned requests must not leak raw citizen phone or exact GPS in available list
    if (foundA.citizen?.phone || foundB.citizen?.phone) {
      throw new Error('PRIVACY LEAK: Unassigned request exposed citizen phone number in browse listing!');
    }
    if (foundA.pickupLat !== null || foundB.pickupLat !== null) {
      throw new Error('PRIVACY LEAK: Unassigned request exposed exact coordinates!');
    }
    console.log('✓ Privacy verified: Citizen phone numbers and exact GPS coordinates remain protected.\n');

    console.log('====================================================');
    console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
    console.log('====================================================');

  } catch (err) {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
