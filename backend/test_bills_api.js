const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authService = require('./src/services/authService');

async function testBills() {
  const user = await prisma.user.findUnique({
    where: { id: 'd0849f85-8427-4714-914e-1db1c59e1ee0' },
  });

  const token = authService.generateAccessToken(user);

  try {
    const res = await fetch('http://127.0.0.1:3001/api/v1/bills', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('GET /api/v1/bills status:', res.status);
    const body = await res.json();
    console.log('GET /api/v1/bills data:', JSON.stringify(body, null, 2));
  } catch (err) {
    console.error('Error fetching bills:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testBills();
