// EcoSetu Prisma Database Seed Script
// Canonical Reference: docs/04_DATABASE_SCHEMA.md Section 6, docs/19_SIH_DEMO_FLOW.md, docs/15_DEPLOYMENT_GUIDE.md

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  console.log('--- EcoSetu Database Seeding Started ---');

  const defaultPassword = process.env.DEMO_USER_PASSWORD || 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. Seed ADMIN
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      passwordHash,
      name: 'EcoSetu Administrator',
      phone: '+919876543200',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log(`✔ Seeded Admin: ${admin.email}`);

  // 2. Seed CITIZEN 1
  const citizen1 = await prisma.user.upsert({
    where: { email: 'citizen@demo.com' },
    update: {},
    create: {
      email: 'citizen@demo.com',
      passwordHash,
      name: 'Priya Sharma',
      phone: '+919876543210',
      role: 'CITIZEN',
      status: 'ACTIVE',
    },
  });
  console.log(`✔ Seeded Citizen: ${citizen1.email}`);

  // 3. Seed CITIZEN 2
  const citizen2 = await prisma.user.upsert({
    where: { email: 'citizen2@demo.com' },
    update: {},
    create: {
      email: 'citizen2@demo.com',
      passwordHash,
      name: 'Rahul Verma',
      phone: '+919876543211',
      role: 'CITIZEN',
      status: 'ACTIVE',
    },
  });
  console.log(`✔ Seeded Citizen: ${citizen2.email}`);

  // 4. Seed Verified INFORMAL_COLLECTOR
  const collector = await prisma.user.upsert({
    where: { email: 'collector@demo.com' },
    update: {},
    create: {
      email: 'collector@demo.com',
      passwordHash,
      name: 'Ramesh Kumar',
      phone: '+919876543212',
      role: 'INFORMAL_COLLECTOR',
      status: 'ACTIVE',
      collectorProfile: {
        create: {
          vehicleType: 'THREE_WHEELER',
          vehicleNumber: 'DL 1R A 1234',
          serviceAreaLat: 28.6139,
          serviceAreaLng: 77.2090,
          serviceRadiusKm: 10.0,
          isAvailable: true,
          idProofType: 'AADHAAR',
          idProofNumber: 'XXXX-XXXX-1234',
        },
      },
    },
  });
  console.log(`✔ Seeded Verified Collector: ${collector.email}`);

  // 5. Seed Pending Verification INFORMAL_COLLECTOR
  const newCollector = await prisma.user.upsert({
    where: { email: 'newcollector@demo.com' },
    update: {},
    create: {
      email: 'newcollector@demo.com',
      passwordHash,
      name: 'Suresh Yadav',
      phone: '+919876543213',
      role: 'INFORMAL_COLLECTOR',
      status: 'PENDING_VERIFICATION',
      collectorProfile: {
        create: {
          vehicleType: 'TWO_WHEELER',
          vehicleNumber: 'DL 2S B 5678',
          serviceAreaLat: 28.6200,
          serviceAreaLng: 77.2100,
          serviceRadiusKm: 5.0,
          isAvailable: false,
          idProofType: 'AADHAAR',
          idProofNumber: 'XXXX-XXXX-5678',
        },
      },
    },
  });
  console.log(`✔ Seeded Pending Collector: ${newCollector.email}`);

  // 6. Seed Verified RECYCLER
  const recycler = await prisma.user.upsert({
    where: { email: 'recycler@demo.com' },
    update: {},
    create: {
      email: 'recycler@demo.com',
      passwordHash,
      name: 'GreenTech Recyclers Ltd',
      phone: '+919876543214',
      role: 'RECYCLER',
      status: 'ACTIVE',
      recyclerProfile: {
        create: {
          facilityName: 'GreenTech E-Waste Processing Plant',
          facilityAddress: 'Plot 42, Okhla Industrial Area Phase III, New Delhi',
          facilityLat: 28.5355,
          facilityLng: 77.2715,
          operatingHours: '09:00 - 18:00',
          capacityKgPerDay: 5000.0,
          acceptedCategories: [
            'MOBILE_PHONE',
            'LAPTOP',
            'DESKTOP',
            'TABLET',
            'BATTERY',
            'CIRCUIT_BOARD',
            'CABLE_CHARGER',
          ],
        },
      },
    },
  });
  console.log(`✔ Seeded Verified Recycler: ${recycler.email}`);

  // 7. Seed Sample E-Waste Items for Citizen 1
  const existingItemsCount = await prisma.ewasteItem.count({
    where: { citizenId: citizen1.id },
  });

  if (existingItemsCount === 0) {
    const item1 = await prisma.ewasteItem.create({
      data: {
        citizenId: citizen1.id,
        category: 'MOBILE_PHONE',
        condition: 'NOT_WORKING',
        brand: 'Samsung',
        model: 'Galaxy S10',
        weightKg: 0.18,
        status: 'SUBMITTED',
      },
    });

    const item2 = await prisma.ewasteItem.create({
      data: {
        citizenId: citizen1.id,
        category: 'LAPTOP',
        condition: 'DAMAGED',
        brand: 'Dell',
        model: 'Inspiron 15',
        weightKg: 2.2,
        status: 'SUBMITTED',
      },
    });

    const item3 = await prisma.ewasteItem.create({
      data: {
        citizenId: citizen1.id,
        category: 'BATTERY',
        condition: 'NOT_WORKING',
        brand: 'Generic',
        weightKg: 0.5,
        status: 'SUBMITTED',
      },
    });

    // Create an active collection request
    const request = await prisma.collectionRequest.create({
      data: {
        citizenId: citizen1.id,
        status: 'SUBMITTED',
        pickupAddress: 'B-12, Connaught Place, New Delhi',
        pickupLat: 28.6315,
        pickupLng: 77.2167,
        preferredDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        notes: 'Please call before arrival',
      },
    });

    await prisma.ewasteItem.updateMany({
      where: { id: { in: [item1.id, item2.id, item3.id] } },
      data: { collectionRequestId: request.id },
    });

    console.log(`✔ Seeded Sample Items and Collection Request: ${request.id}`);
  }

  console.log('--- EcoSetu Database Seeding Completed Successfully ---');
}

module.exports = seed;

if (require.main === module) {
  seed()
    .catch((err) => {
      console.error('Fatal seeding error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
