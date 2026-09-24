const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const materialLotService = require('./src/services/materialLotService');
const quoteService = require('./src/services/quoteService');
const handoverService = require('./src/services/handoverService');
const transactionService = require('./src/services/transactionService');
const billService = require('./src/services/billService');

const prisma = new PrismaClient();

async function seedMarketplaceData() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Ensure Citizen user
  let defaultCitizen = await prisma.user.upsert({
    where: { email: 'citizen@ecosetu.org' },
    update: { passwordHash, status: 'ACTIVE', role: 'CITIZEN' },
    create: {
      email: 'citizen@ecosetu.org',
      phone: '+919876543211',
      name: 'Priya Sharma (Citizen)',
      role: 'CITIZEN',
      passwordHash,
      status: 'ACTIVE',
    },
  });
  console.log(`Default citizen user ready: ${defaultCitizen.email}`);

  // 2. Ensure Collector user
  let collector = await prisma.user.findFirst({
    where: { email: 'collector@ecosetu.org' },
    include: { collectorProfile: true },
  });

  if (!collector) {
    collector = await prisma.user.create({
      data: {
        email: 'collector@ecosetu.org',
        phone: '+919876543210',
        name: 'Ramesh Kumar (Collector)',
        role: 'INFORMAL_COLLECTOR',
        passwordHash,
        status: 'ACTIVE',
        collectorProfile: {
          create: {
            city: 'Bhubaneswar',
            state: 'Odisha',
            serviceArea: 'Saheed Nagar & Nayapalli',
          },
        },
      },
      include: { collectorProfile: true },
    });
  }
  console.log(`Collector user ready: ${collector.email}`);

  // 3. Find all citizen users
  const allCitizens = await prisma.user.findMany({
    where: { role: 'CITIZEN' },
  });
  console.log(`Found ${allCitizens.length} citizen users.`);

  // 4. Create dedicated completed purchases & bills for each citizen
  for (const citizen of allCitizens) {
    try {
      // Create a unique lot for this citizen's purchase
      const purchaseLot = await materialLotService.createMaterialLot(collector.id, {
        category: 'SMARTPHONE',
        subcategory: `Apple iPhone 13 128GB Midnight (${citizen.name || 'Citizen'})`,
        condition: 'TESTED_WORKING',
        sourceType: 'HOUSEHOLD',
        listingPurpose: 'REUSE',
        status: 'OPEN',
        askingPrice: 32500.0,
        priceUnit: 'TOTAL',
        approximateTotalWeightKg: 0.2,
        description: 'Verified Apple iPhone 13. Excellent battery health, authentic IMEI, fully tested cameras & sensors.',
      });

      // Citizen submits offer
      const quote = await quoteService.createQuote(citizen, {
        materialLotId: purchaseLot.id,
        quotedUnitPrice: 31000.0,
        unit: 'PER_LOT',
        quotedQuantity: 1,
        validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
        notes: 'Citizen direct purchase offer: ₹31,000.',
      });

      // Collector accepts
      const acceptedQuote = await quoteService.acceptQuote(collector, quote.id);

      // Handover
      const handover = await handoverService.createHandover(collector, {
        materialLotId: purchaseLot.id,
        quoteId: acceptedQuote.id,
        declaredWeightKg: 0.2,
        finalUnitPrice: 31000.0,
        unit: 'PER_LOT',
        notes: 'Handover complete with warranty receipt & original box.',
      });

      await handoverService.collectorConfirm(collector, handover.id, { handoverWeightKg: 0.2 });
      await handoverService.recyclerConfirm(citizen, handover.id, { notes: 'Physical device verified in good working order.' });

      // Transaction
      const transaction = await transactionService.createTransaction(collector, {
        handoverId: handover.id,
        paymentMethod: 'RAZORPAY_UPI',
        paymentStatus: 'PAID',
        providerReference: 'pay_rzp_live_' + Math.random().toString(36).substring(2, 10),
        notes: 'Instant Razorpay UPI Settlement',
      });

      // Verified Bill
      const bill = await billService.generateBill(transaction.id, {
        providerReference: transaction.providerReference,
      });

      console.log(`✅ Seeded Purchase & Bill ${bill.billNumber} (₹${bill.finalAmount}) for ${citizen.email}`);
    } catch (err) {
      console.warn(`Could not seed purchase for ${citizen.email}:`, err.message);
    }
  }

  // 5. Create Persistent OPEN Marketplace Lots for Circular Store Discovery
  const openStoreCatalog = [
    {
      category: 'SMARTPHONE',
      subcategory: 'Apple iPhone 14 Pro 256GB Space Black',
      condition: 'TESTED_WORKING',
      sourceType: 'HOUSEHOLD',
      listingPurpose: 'REUSE',
      status: 'OPEN',
      askingPrice: 58000.0,
      priceUnit: 'TOTAL',
      approximateTotalWeightKg: 0.22,
      description: 'Superb condition iPhone 14 Pro. 91% battery health, dynamic island, A16 Bionic, 48MP Pro camera. Includes original USB-C to Lightning cable.',
    },
    {
      category: 'SMARTPHONE',
      subcategory: 'Samsung Galaxy S23 5G 128GB Phantom Black',
      condition: 'TESTED_WORKING',
      sourceType: 'HOUSEHOLD',
      listingPurpose: 'REUSE',
      status: 'OPEN',
      askingPrice: 34500.0,
      priceUnit: 'TOTAL',
      approximateTotalWeightKg: 0.18,
      description: 'Clean AMOLED display with 120Hz refresh rate. Snapdragon 8 Gen 2, triple camera system, IP68 water resistant.',
    },
    {
      category: 'LAPTOP',
      subcategory: 'Lenovo ThinkPad X1 Carbon Gen 9 i7 16GB/512GB',
      condition: 'TESTED_WORKING',
      sourceType: 'HOUSEHOLD',
      listingPurpose: 'REUSE',
      status: 'OPEN',
      askingPrice: 42000.0,
      priceUnit: 'TOTAL',
      approximateTotalWeightKg: 1.15,
      description: 'Flagship ultrabook. Carbon fiber chassis, backlit keyboard, 14-inch 16:10 FHD+ display, 65W Type-C fast charger included.',
    },
    {
      category: 'LAPTOP',
      subcategory: 'Apple MacBook Air M1 8GB/256GB Space Gray',
      condition: 'TESTED_WORKING',
      sourceType: 'HOUSEHOLD',
      listingPurpose: 'REUSE',
      status: 'OPEN',
      askingPrice: 46000.0,
      priceUnit: 'TOTAL',
      approximateTotalWeightKg: 1.29,
      description: 'Apple Silicon M1 chip, battery cycle count 84, pristine Retina display with True Tone. Ideal for creators and students.',
    },
    {
      category: 'TABLET',
      subcategory: 'Apple iPad Air 4th Gen 64GB Wi-Fi Sky Blue',
      condition: 'TESTED_WORKING',
      sourceType: 'HOUSEHOLD',
      listingPurpose: 'REUSE',
      status: 'OPEN',
      askingPrice: 28500.0,
      priceUnit: 'TOTAL',
      approximateTotalWeightKg: 0.46,
      description: '10.9-inch Liquid Retina display, Touch ID in top button, A14 Bionic chip. Compatible with Apple Pencil 2.',
    },
    {
      category: 'OTHER',
      subcategory: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones',
      condition: 'TESTED_WORKING',
      sourceType: 'HOUSEHOLD',
      listingPurpose: 'REUSE',
      status: 'OPEN',
      askingPrice: 16500.0,
      priceUnit: 'TOTAL',
      approximateTotalWeightKg: 0.25,
      description: 'Flagship active noise cancellation, 30-hour battery life, Multipoint Bluetooth pairing. Includes travel case and 3.5mm aux lead.',
    },
    {
      category: 'BATTERY',
      subcategory: 'Anker 737 Power Bank (PowerCore 24K) 140W',
      condition: 'TESTED_WORKING',
      sourceType: 'HOUSEHOLD',
      listingPurpose: 'REUSE',
      status: 'OPEN',
      askingPrice: 6200.0,
      priceUnit: 'TOTAL',
      approximateTotalWeightKg: 0.63,
      description: 'Ultra-powerful two-way charging with digital smart display. Supports 140W fast-charging for laptops and phones.',
    },
    {
      category: 'CABLE',
      subcategory: 'Belkin Thunderbolt 4 Docking Station & Cable Kit',
      condition: 'TESTED_WORKING',
      sourceType: 'HOUSEHOLD',
      listingPurpose: 'REUSE',
      status: 'OPEN',
      askingPrice: 8500.0,
      priceUnit: 'TOTAL',
      approximateTotalWeightKg: 0.85,
      description: '40Gbps high-speed data transfer dock with 90W Power Delivery and dual 4K monitor support.',
    },
  ];

  for (const item of openStoreCatalog) {
    const lot = await materialLotService.createMaterialLot(collector.id, item);
    console.log(`🛍️ Created Open Store Listing: ${lot.referenceNumber} - ${lot.subcategory} (₹${lot.askingPrice})`);
  }

  console.log('\n✨ Marketplace & Purchases database successfully populated!');
}

seedMarketplaceData().catch(console.error).finally(() => prisma.$disconnect());
