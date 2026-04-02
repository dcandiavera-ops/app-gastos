import { PrismaClient } from '@prisma/client';
import fs from 'fs';
process.env.DATABASE_URL = fs.readFileSync('.env', 'utf8').split('\n').find(l => l.startsWith('DATABASE_URL')).split('=')[1].replace(/"/g, '');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ include: { transactions: true } });
  for (const u of users) {
    console.log(`User ID: ${u.id}, Email: ${u.email}, Txs: ${u.transactions.length}, Budget: ${u.monthlyBudget}`);
  }
}
main().finally(() => prisma.$disconnect());
