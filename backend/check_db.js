require('dotenv').config();
const dbUrl = (process.env.DATABASE_URL || '').replace('&channel_binding=require', '');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

const bcrypt = require('bcryptjs');

async function main() {
  const col = await prisma.user.findUnique({ where: { email: 'rajeshsenapati2005@gmail.com' }, include: { collectorProfile: true } });
  console.log('Collector profile:', col?.collectorProfile ? 'Found' : 'None');
  if (col && !col.collectorProfile) {
    await prisma.collectorProfile.create({
      data: {
        userId: col.id,
        serviceArea: 'Berhampur & Brahmapur Sub-division',
        city: 'Berhampur',
        state: 'Odisha',
        pincode: '760001',
        serviceAreaLat: 19.3149,
        serviceAreaLng: 84.7941,
        serviceRadiusKm: 25.0,
        isAvailable: true,
      }
    });
    console.log('Created collector profile for Rajesh');
  }

  const rec = await prisma.user.findUnique({ where: { email: 'abhisheksingh2005@gmail.com' }, include: { recyclerProfile: true } });
  console.log('Recycler profile:', rec?.recyclerProfile ? 'Found' : 'None');
  if (rec && !rec.recyclerProfile) {
    await prisma.recyclerProfile.create({
      data: {
        userId: rec.id,
        facilityName: 'GreenEarth Recycling Hub',
        facilityAddress: 'Industrial Estate, Berhampur, Odisha',
        facilityLat: 19.3150,
        facilityLng: 84.7950,
        city: 'Berhampur',
        district: 'Ganjam',
        state: 'Odisha',
        pincode: '760001',
        licenseNumber: 'OD-REC-2026-0042',
        acceptedCategories: [
          'MOBILE_PHONE',
          'LAPTOP',
          'DESKTOP',
          'TABLET',
          'BATTERY',
          'CIRCUIT_BOARD',
          'CABLE_CHARGER',
        ],
      }
    });
    console.log('Created recycler profile for Abhishek');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
