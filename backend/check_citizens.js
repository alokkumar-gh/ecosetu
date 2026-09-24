const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const citizens = await prisma.user.findMany({
    where: { role: 'CITIZEN' },
    select: { id: true, name: true, phone: true, email: true },
  });
  console.log('CITIZEN USERS:', citizens);

  const bills = await prisma.transactionBill.findMany({
    select: { id: true, billNumber: true, buyerUserId: true, finalAmount: true },
  });
  console.log('ALL BILLS:', bills);
}

check().finally(() => prisma.$disconnect());
