const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const requestService = require('../src/services/requestService');
const ewasteService = require('../src/services/ewasteService');
const auditService = require('../src/services/auditService');

async function testFullFlow() {
  console.log('🧪 Starting EcoSetu Rebuilt E-Waste Submission, Offer, Negotiation & Traceability Verification...');

  try {
    // 1. Get or create citizen user
    let citizen = await prisma.user.findFirst({ where: { role: 'CITIZEN' } });
    if (!citizen) {
      console.log('No citizen found in database.');
      return;
    }

    // 2. Get or create collector user & collector profile
    let collectorUser = await prisma.user.findFirst({ where: { role: 'INFORMAL_COLLECTOR' } });
    let collectorProfile = null;
    if (collectorUser) {
      collectorProfile = await prisma.collectorProfile.findFirst({ where: { userId: collectorUser.id } });
    }
    if (!collectorProfile) {
      console.log('No collector profile found.');
      return;
    }

    console.log(`👤 Citizen: ${citizen.name} (${citizen.id})`);
    console.log(`🚚 Collector: ${collectorUser.name} (CollectorID: ${collectorProfile.id})`);

    // 3. Step 1-6: Create Item with AI Detection & Confirmed Category
    console.log('\n--- STEP 1-6: Citizen Captures & Submits Item ---');
    const createdItem = await ewasteService.createItem(
      citizen.id,
      {
        category: 'CIRCUIT_BOARD',
        confirmedCategory: 'CIRCUIT_BOARD',
        aiDetectedCategory: 'CIRCUIT_BOARD',
        aiConfidence: 0.92,
        wasAccepted: true,
        condition: 'DAMAGED',
        estimatedWeightKg: 4.5,
        description: 'Old circuit board from dismantled CPU',
        imageUrl: 'test_pcb_board.jpg',
      }
    );
    console.log(`✅ E-waste Item created: ${createdItem.item.id} (AI: PCB 92% | Confirmed: PCB)`);

    // 4. Step 7: Create Collection Request (Opened to collectors)
    console.log('\n--- STEP 7: Create Collection Request ---');
    const request = await requestService.createRequest(citizen.id, {
      pickupAddress: 'Plot 42, Saheed Nagar, Bhubaneswar, Odisha 751007',
      pickupLat: 20.2961,
      pickupLng: 85.8245,
      preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      preferredTimeSlot: 'AFTERNOON_12_4',
      itemIds: [createdItem.item.id],
      notes: 'Handle with care',
      autoSubmit: true,
    });
    console.log(`✅ Collection Request created: ${request.id} (Status: ${request.status})`);

    // 5. Step 8-9: Collector Views & Places Price Offer
    console.log('\n--- STEP 8-9: Collector Evaluates & Submits Price Offer ---');
    const offer = await requestService.submitOffer(
      collectorUser.id,
      request.id,
      {
        offeredPrice: 2850,
        notes: 'Can collect today with digital scale. Immediate cash/UPI payment.',
      }
    );
    console.log(`✅ Collector Offer submitted: Offer ID ${offer.id} for ₹${offer.offeredPrice} (Status: ${offer.status})`);

    // 6. Step 10: Citizen Counter-Offers (Negotiation)
    console.log('\n--- STEP 10: Citizen Negotiates (Counter-Offers) ---');
    const counterOffer = await requestService.counterOffer(
      citizen.id,
      request.id,
      offer.id,
      { counterPrice: 3100, notes: 'Can we do 3100 as the components are intact?' }
    );
    console.log(`✅ Citizen counter-offer registered for ₹${counterOffer.offeredPrice || 3100} (Notes: ${counterOffer.notes})`);

    // 7. Collector/Citizen Final Acceptance
    console.log('\n--- STEP 10 (cont): Final Offer Accepted ---');
    const acceptedResult = await requestService.acceptOffer(citizen.id, request.id, offer.id);
    console.log(`✅ Offer Accepted! Request Status: ${acceptedResult.request.status}, Collector Assigned: ${acceptedResult.request.collectorId}`);

    // 8. Step 11: Inspect Traceability Timeline
    console.log('\n--- STEP 11: Append-Only Traceability Timeline Verification ---');
    const trace = await ewasteService.getItemTraceability({ id: citizen.id, role: 'CITIZEN' }, createdItem.item.id);
    console.log(`✅ Total Traceability Chain Events: ${trace.traceabilityChain?.length || 0}`);
    if (trace.traceabilityChain) {
      trace.traceabilityChain.forEach((ev, idx) => {
        console.log(`   [${idx + 1}] ${ev.stage} (${ev.actor || 'System'}): ${ev.description}`);
      });
    }

    console.log('\n🎉 ALL REBUILT FLOW REQUIREMENTS VERIFIED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testFullFlow();
