const prisma = require('./src/config/database');
const materialLotService = require('./src/services/materialLotService');
const quoteService = require('./src/services/quoteService');
const handoverService = require('./src/services/handoverService');
const transactionService = require('./src/services/transactionService');
const billService = require('./src/services/billService');

async function seedBill() {
  const citizen = await prisma.user.findFirst({
    where: { email: 'citizen@ecosetu.org' },
  });
  const collector = await prisma.user.findFirst({
    where: { email: 'collector@ecosetu.org' },
  });

  if (!citizen || !collector) {
    console.error('Missing citizen or collector');
    return;
  }

  // 1. Create Lot
  const lot = await materialLotService.createMaterialLot(
    collector.id,
    {
      category: 'MOBILE_PHONE',
      subcategory: 'Apple iPhone 11 128GB',
      condition: 'TESTED_WORKING',
      sourceType: 'HOUSEHOLD',
      listingPurpose: 'REUSE',
      askingPrice: 14000,
      priceUnit: 'TOTAL',
      approximateTotalWeightKg: 0.35,
      description: 'Used iPhone 11 in mint condition, 87% battery health with original charger.',
      status: 'OPEN',
    },
    'OFFICIAL_SEED'
  );

  // 2. Create Offer
  const offer = await quoteService.createQuote(
    citizen,
    {
      materialLotId: lot.id,
      quotedUnitPrice: 13500,
      unit: 'TOTAL',
      quotedQuantity: 1,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Can pickup this evening with cash.',
    }
  );

  // 3. Accept Offer
  const accepted = await quoteService.acceptQuote(collector, offer.id);

  // 4. Create Handover
  const handover = await handoverService.createHandover(
    collector,
    {
      materialLotId: lot.id,
      quoteId: accepted.id,
      declaredWeightKg: 0.35,
      finalUnitPrice: 13500,
      unit: 'TOTAL',
      notes: 'Handed over clean smartphone with original charger.',
    }
  );

  // 5. Confirm Handover (both sides)
  await handoverService.collectorConfirm(collector, handover.id, { handoverWeightKg: 0.35 });
  await handoverService.recyclerConfirm(citizen, handover.id, { notes: 'Device checked and verified on-site.' });

  // 6. Create Transaction
  const transaction = await transactionService.createTransaction(
    collector,
    {
      handoverId: handover.id,
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
      notes: 'Direct cash settlement.',
    }
  );

  // 7. Generate Bill
  const bill = await billService.generateBill(transaction.id);

  console.log(`✅ Seeded complete deal and bill: ${bill.billNumber} (Amount: ₹${bill.finalAmount}) for citizen ${citizen.name}`);
}

seedBill()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
