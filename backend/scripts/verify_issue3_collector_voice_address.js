/**
 * EcoSetu Regression & Verification Test: Issue #3
 * Collector Voice Assistant — Actual Pickup Address
 * 
 * Verifies 8 Mandatory Checks:
 * CHECK 1: Authorized collector receives actual pickup address.
 * CHECK 2: Voice/context response contains actual address.
 * CHECK 3: TTS input (cleanTextForTTS) contains actual address.
 * CHECK 4: Unauthorized collector cannot access exact address.
 * CHECK 5: Citizen A address is not returned for Citizen B.
 * CHECK 6: Citizen B address is not returned for Citizen A.
 * CHECK 7: No hardcoded production address is being used.
 * CHECK 8: Missing address fields do not produce "undefined", "null", or malformed speech.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const orchestrator = require('../src/services/ecoSaathi/EcoSaathiOrchestrator');
const contextBuilder = require('../src/services/ecoSaathi/contextBuilder');
const readTools = require('../src/services/ecoSaathi/tools/readTools');
function cleanTextForTTS(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let cleaned = rawText.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, '');
  cleaned = cleaned.replace(/^[\s]*\d+[\.\)]\s+/gm, '');
  cleaned = cleaned.replace(/\n\s*\n/g, '. ').replace(/\n/g, ' ').replace(/\s+/g, ' ').replace(/\.\s*\./g, '.').trim();
  return cleaned;
}

async function runRegression() {
  console.log('====================================================');
  console.log('ECOSETU ISSUE 3: COLLECTOR VOICE ADDRESS VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function recordResult(checkNum, description, isSuccess, details = '') {
    if (isSuccess) {
      passed++;
      console.log(`✓ CHECK ${checkNum} PASS: ${description} ${details}`);
    } else {
      failed++;
      console.error(`✗ CHECK ${checkNum} FAIL: ${description} ${details}`);
    }
  }

  try {
    // 1. Setup Test Fixtures: Two Citizens, Two Collectors
    console.log('[Setup] Setting up test data for Citizens and Collectors...\n');

    // Citizen A: Ramesh Sharma
    let citizenA = await prisma.user.findFirst({ where: { email: 'v3_ramesh.test@ecosetu.in' } });
    if (!citizenA) {
      citizenA = await prisma.user.create({
        data: {
          name: 'Ramesh Sharma',
          email: 'v3_ramesh.test@ecosetu.in',
          phone: '+919988776611',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
          role: 'CITIZEN',
          status: 'ACTIVE',
        }
      });
    }

    // Citizen B: Sunita Patel
    let citizenB = await prisma.user.findFirst({ where: { email: 'v3_sunita.test@ecosetu.in' } });
    if (!citizenB) {
      citizenB = await prisma.user.create({
        data: {
          name: 'Sunita Patel',
          email: 'v3_sunita.test@ecosetu.in',
          phone: '+919988776622',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
          role: 'CITIZEN',
          status: 'ACTIVE',
        }
      });
    }

    // Collector 1 (Assigned to Citizen A): Vijay Kumar
    let collector1 = await prisma.user.findFirst({ where: { email: 'v3_vijay.test@ecosetu.in' } });
    if (!collector1) {
      collector1 = await prisma.user.create({
        data: {
          name: 'Vijay Kumar Kabadiwala',
          email: 'v3_vijay.test@ecosetu.in',
          phone: '+919988776633',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
          role: 'INFORMAL_COLLECTOR',
          status: 'ACTIVE',
          collectorProfile: {
            create: {
              serviceAreaLat: '20.2961',
              serviceAreaLng: '85.8245',
              serviceRadiusKm: 15.0,
              isAvailable: true,
              city: 'Bhubaneswar',
            }
          }
        },
        include: { collectorProfile: true }
      });
    } else {
      collector1 = await prisma.user.findUnique({
        where: { id: collector1.id },
        include: { collectorProfile: true }
      });
    }

    // Collector 2 (Assigned to Citizen B / Unauthorized for A): Rajesh Senapati
    let collector2 = await prisma.user.findFirst({ where: { email: 'v3_rajesh.test@ecosetu.in' } });
    if (!collector2) {
      collector2 = await prisma.user.create({
        data: {
          name: 'Rajesh Senapati Kabadiwala',
          email: 'v3_rajesh.test@ecosetu.in',
          phone: '+919988776644',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
          role: 'INFORMAL_COLLECTOR',
          status: 'ACTIVE',
          collectorProfile: {
            create: {
              serviceAreaLat: '20.3000',
              serviceAreaLng: '85.8300',
              serviceRadiusKm: 15.0,
              isAvailable: true,
              city: 'Bhubaneswar',
            }
          }
        },
        include: { collectorProfile: true }
      });
    } else {
      collector2 = await prisma.user.findUnique({
        where: { id: collector2.id },
        include: { collectorProfile: true }
      });
    }

    // Items
    const itemA = await prisma.ewasteItem.create({
      data: {
        citizenId: citizenA.id,
        category: 'LAPTOP',
        estimatedWeightKg: 2.5,
        condition: 'WORKING',
        status: 'SUBMITTED',
      }
    });

    const itemB = await prisma.ewasteItem.create({
      data: {
        citizenId: citizenB.id,
        category: 'MOBILE_PHONE',
        estimatedWeightKg: 0.2,
        condition: 'WORKING',
        status: 'SUBMITTED',
      }
    });

    // Address A for Citizen A: 12 Main Road, Patia, Bhubaneswar, Odisha, PIN 751024
    const requestA = await prisma.collectionRequest.create({
      data: {
        citizenId: citizenA.id,
        collectorId: collector1.collectorProfile.id,
        status: 'ACCEPTED',
        pickupAddress: '12 Main Road, Patia, Bhubaneswar, Odisha, 751024',
        houseNumber: '12',
        street: 'Main Road',
        landmark: 'Patia Market',
        city: 'Bhubaneswar',
        district: 'Khurda',
        state: 'Odisha',
        pincode: '751024',
        pickupLat: '20.3533',
        pickupLng: '85.8266',
        ewasteItems: { connect: [{ id: itemA.id }] }
      },
      include: { ewasteItems: true, citizen: true }
    });

    // Address B for Citizen B: 45 Market Road, Saheed Nagar, Bhubaneswar, Odisha, PIN 751007
    const requestB = await prisma.collectionRequest.create({
      data: {
        citizenId: citizenB.id,
        collectorId: collector2.collectorProfile.id,
        status: 'ACCEPTED',
        pickupAddress: '45 Market Road, Saheed Nagar, Bhubaneswar, Odisha, 751007',
        houseNumber: '45',
        street: 'Market Road',
        landmark: 'Saheed Nagar Station',
        city: 'Bhubaneswar',
        district: 'Khurda',
        state: 'Odisha',
        pincode: '751007',
        pickupLat: '20.2890',
        pickupLng: '85.8435',
        ewasteItems: { connect: [{ id: itemB.id }] }
      },
      include: { ewasteItems: true, citizen: true }
    });

    const expectedAddressA = '12, Main Road, Near Patia Market, Bhubaneswar, Khurda, Odisha, PIN 751024';
    const expectedAddressB = '45, Market Road, Near Saheed Nagar Station, Bhubaneswar, Khurda, Odisha, PIN 751007';

    // ----------------------------------------------------
    // CHECK 1: Authorized collector receives actual pickup address
    // ----------------------------------------------------
    const detailsA = await readTools.getPickupRequestDetails(collector1, { requestId: requestA.id });
    const hasFullAddr1 = detailsA.pickupAddress && detailsA.pickupAddress.includes('12') && detailsA.pickupAddress.includes('Main Road') && detailsA.pickupAddress.includes('Patia');
    recordResult(1, 'Authorized collector receives actual pickup address', Boolean(hasFullAddr1), `Got: "${detailsA.pickupAddress}"`);

    // ----------------------------------------------------
    // CHECK 2: Voice/context response contains actual address
    // ----------------------------------------------------
    const voiceResA = await orchestrator.processQuery(collector1, {
      message: 'Where is the pickup location?',
      language: 'en',
      clientContext: { requestId: requestA.id }
    });
    const responseHasAddrA = voiceResA.message && voiceResA.message.includes('12') && voiceResA.message.includes('Main Road') && voiceResA.message.includes('Patia');
    recordResult(2, 'Voice/context response contains actual address', Boolean(responseHasAddrA), `Response: "${voiceResA.message}"`);

    // ----------------------------------------------------
    // CHECK 3: TTS input contains actual address
    // ----------------------------------------------------
    const ttsCleanA = cleanTextForTTS(voiceResA.message);
    const ttsHasAddrA = ttsCleanA && ttsCleanA.includes('12') && ttsCleanA.includes('Main Road') && ttsCleanA.includes('751024');
    recordResult(3, 'TTS input contains actual address', Boolean(ttsHasAddrA), `TTS clean: "${ttsCleanA}"`);

    // ----------------------------------------------------
    // CHECK 4: Unauthorized collector cannot access exact address
    // ----------------------------------------------------
    let unauthPassed = false;
    try {
      // Collector 2 queries Request A (assigned to Collector 1, status ACCEPTED)
      await readTools.getPickupRequestDetails(collector2, { requestId: requestA.id });
    } catch (err) {
      unauthPassed = err.statusCode === 403 || err.message.includes('Access denied');
    }
    recordResult(4, 'Unauthorized collector cannot access exact address', unauthPassed, 'Access denied correctly thrown on backend');

    // ----------------------------------------------------
    // CHECK 5: Citizen A address is not returned for Citizen B
    // ----------------------------------------------------
    const voiceResB = await orchestrator.processQuery(collector2, {
      message: 'What is the pickup address?',
      language: 'en',
      clientContext: { requestId: requestB.id }
    });
    const check5NoCross = !voiceResB.message.includes('Main Road') && !voiceResB.message.includes('751024') && voiceResB.message.includes('Saheed Nagar');
    recordResult(5, 'Citizen A address is not returned for Citizen B', Boolean(check5NoCross), `Response B: "${voiceResB.message}"`);

    // ----------------------------------------------------
    // CHECK 6: Citizen B address is not returned for Citizen A
    // ----------------------------------------------------
    const check6NoCross = !voiceResA.message.includes('Saheed Nagar') && !voiceResA.message.includes('751007');
    recordResult(6, 'Citizen B address is not returned for Citizen A', Boolean(check6NoCross), `Response A: "${voiceResA.message}"`);

    // ----------------------------------------------------
    // CHECK 7: No hardcoded production address is being used
    // ----------------------------------------------------
    const promptObj = await contextBuilder.build(collector1, { requestId: requestA.id });
    const promptText = contextBuilder.toSystemPrompt(promptObj);
    const check7NoHardcode = promptText.includes('12, Main Road') && !promptText.includes('Dummy Street 99');
    recordResult(7, 'No hardcoded production address is being used', Boolean(check7NoHardcode), 'System prompt dynamically generated from DB data');

    // ----------------------------------------------------
    // CHECK 8: Missing address fields do not produce "undefined", "null", or malformed speech
    // ----------------------------------------------------
    // Create request with missing optional fields
    const requestSparse = await prisma.collectionRequest.create({
      data: {
        citizenId: citizenA.id,
        collectorId: collector1.collectorProfile.id,
        status: 'ACCEPTED',
        pickupAddress: 'Plot 77, Janpath, Bhubaneswar',
        city: 'Bhubaneswar',
        state: 'Odisha',
        pickupLat: '20.2900',
        pickupLng: '85.8400',
        ewasteItems: { connect: [{ id: itemA.id }] }
      }
    });
    const detailsSparse = await readTools.getPickupRequestDetails(collector1, { requestId: requestSparse.id });
    const hasNoUndefined = !detailsSparse.pickupAddress.includes('undefined') && !detailsSparse.pickupAddress.includes('null');
    recordResult(8, 'Missing address fields do not produce "undefined" or "null"', Boolean(hasNoUndefined), `Sparse Addr: "${detailsSparse.pickupAddress}"`);

    console.log('\n====================================================');
    console.log(`REGRESSION SUMMARY: ${passed} PASSED, ${failed} FAILED (${passed + failed}/8 CHECKS)`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('REGRESSION EXECUTION ERROR:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRegression();
