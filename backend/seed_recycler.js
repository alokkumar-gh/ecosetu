const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);
  let recycler = await prisma.user.findFirst({ where: { email: 'recycler@ecosetu.org' } });
  if (recycler) {
    await prisma.user.update({
      where: { id: recycler.id },
      data: { passwordHash, status: 'ACTIVE', role: 'RECYCLER' }
    });
  } else {
    recycler = await prisma.user.create({
      data: {
        email: 'recycler@ecosetu.org',
        phone: '+919876500003',
        name: 'GreenTech Eco Recyclers',
        role: 'RECYCLER',
        passwordHash,
        status: 'ACTIVE'
      }
    });
  }
  let profile = await prisma.recyclerProfile.findFirst({ where: { userId: recycler.id } });
  if (!profile) {
    profile = await prisma.recyclerProfile.create({
      data: {
        userId: recycler.id,
        facilityName: 'GreenTech Processing Plant Alpha',
        facilityAddress: 'Plot 42, Eco Industrial Zone, Navi Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        licenseNumber: 'CPCB/EW/2024/MUM/8821',
        authorizationNumber: 'AUTH-CPCB-2024-8821',
        authorizationStatus: 'AUTHORIZED',
        isActive: true,
        verifiedAt: new Date(),
        acceptedCategories: ['MOBILE', 'LAPTOP', 'PCB', 'BATTERY', 'APPLIANCE', 'CABLE']
      }
    });
  }
  console.log('Recycler user & profile ready:', recycler.email, profile.facilityName);
}

main().catch(console.error).finally(() => prisma.$disconnect());
