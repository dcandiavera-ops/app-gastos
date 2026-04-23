import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function startOfCurrentMonth() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  if (now.getDate() >= 25) {
    return new Date(currentYear, currentMonth, 25);
  } else {
    return new Date(currentYear, currentMonth - 1, 25);
  }
}

async function testPageLogic(userId) {
  const monthStart = await startOfCurrentMonth();
  console.log('Month Start:', monthStart);

  try {
    const [recentTransactionsResult, expenseAggregates, incomeAggregates, categoryExpenses] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: userId },
        orderBy: { date: 'desc' },
        take: 10,
        include: { category: true },
      }),
      prisma.transaction.groupBy({
        by: ['paymentMethod'],
        _sum: { amount: true },
        where: {
          userId: userId,
          type: 'EXPENSE',
          date: { gte: monthStart },
        },
      }),
      prisma.transaction.groupBy({
        by: ['paymentMethod'],
        _sum: { amount: true },
        where: {
          userId: userId,
          type: 'INCOME',
          date: { gte: monthStart },
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId: userId,
          type: 'EXPENSE',
          date: { gte: monthStart },
        },
        include: { category: true },
      }),
    ]);

    console.log('--- Success ---');
    console.log('Recent count:', recentTransactionsResult.length);
    console.log('Expense aggregates:', expenseAggregates);
    console.log('Income aggregates:', incomeAggregates);
    console.log('Category expenses count:', categoryExpenses.length);

  } catch (err) {
    console.error('--- Failure ---');
    console.error(err);
  }
}

testPageLogic('df668b20-941e-4313-a0b4-e8ca7469bbe3')
  .finally(() => prisma.$disconnect());
