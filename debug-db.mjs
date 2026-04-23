import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Transactions Check ---');
  const counts = await prisma.transaction.count();
  console.log('Total transactions:', counts);
  
  const lastFive = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  console.log('Last 5 transactions:', JSON.stringify(lastFive, null, 2));
  
  const incomeAggs = await prisma.transaction.groupBy({
    by: ['paymentMethod'],
    _sum: { amount: true },
    where: { type: 'INCOME' }
  });
  console.log('Income Aggregates:', JSON.stringify(incomeAggs, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
