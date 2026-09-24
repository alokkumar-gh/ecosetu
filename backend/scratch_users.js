const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, phone: true, role: true, name: true },
  });
  console.log('USERS IN DB:', users);

  // Ensure known test credentials for citizen
  const passwordHash = await bcrypt.hash('Password123!', 10);
  
  let citizen = await prisma.user.findFirst({ where: { role: 'CITIZEN' } });
  if (citizen) {
    await prisma.user.update({
      where: { id: citizen.id },
      data: { passwordHash, status: 'ACTIVE' }
    });
    console.log(`Updated citizen password for ${citizen.email} to: Password123!`);
  } else {
    citizen = await prisma.user.create({
      data: {
        email: 'priya.sharma@example.com',
        phone: '+919876500001',
        name: 'Priya Sharma',
        role: 'CITIZEN',
        passwordHash,
        isVerified: true,
        status: 'ACTIVE'
      }
    });
    console.log(`Created citizen: ${citizen.email}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
