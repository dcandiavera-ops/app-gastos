import Link from 'next/link';
import { Plus, Replace, LayoutList, MoreHorizontal, Inbox, ArrowUpRight, ArrowDownLeft, ChevronRight } from 'lucide-react';
import { ensureDbUser, getOptionalAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatClp, startOfCurrentMonth } from '@/lib/money';
import type { TransactionRecord } from '@/lib/transaction-types';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const user = await getOptionalAuthUser();
  if (!user) {
    redirect('/auth');
  }

  let recentTransactions: TransactionRecord[] = [];
  let actualSpent = 0;
  let remaining = 0;

  try {
    const dbUser = await ensureDbUser(user);
    const monthStart = startOfCurrentMonth();
    const [recentTransactionsResult, monthlyExpenseAggregate] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId: user.id,
        },
        orderBy: { date: 'desc' },
        take: 10,
        include: { category: true },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          userId: user.id,
          type: 'EXPENSE',
          date: { gte: monthStart },
        },
      }),
    ]);

    recentTransactions = recentTransactionsResult;
    actualSpent = monthlyExpenseAggregate._sum.amount ?? 0;
    remaining = dbUser.monthlyBudget - actualSpent;
  } catch (error) {
    console.error('Dashboard load error:', error);
  }

  return (
    <main className="pt-16 pb-32 px-4 max-w-md mx-auto space-y-8 flex flex-col items-center">
      
      {/* Revolut Style Hero */}
      <section className="w-full flex flex-col items-center mt-6 space-y-2">
        <div className="flex items-center gap-2 text-on-surface-variant font-medium text-xs mb-1">
          <span className="text-base leading-none">🇨🇱</span>
          <span>Principal · CLP</span>
        </div>
        
        <h1 className="text-6xl fintech-hero-number drop-shadow-sm flex items-start gap-1">
          <span className="text-3xl mt-2 font-sans opacity-80">$</span>
          {formatClp(Math.max(0, remaining))}
        </h1>
        <p className="text-sm font-medium text-on-surface-variant">Disponible</p>

        <button className="mt-4 px-5 py-2 rounded-full bg-surface-variant hover:bg-outline-variant transition-colors text-sm font-medium text-on-surface border border-outline">
          Gastado: ${formatClp(actualSpent)}
        </button>
      </section>

      {/* Action Buttons Row */}
      <section className="flex items-start justify-center gap-4 w-full mt-2">
        <Link href="/entry" className="flex flex-col items-center gap-2 group">
          <div className="fintech-circle-btn">
            <Plus className="h-6 w-6" />
          </div>
          <span className="text-[11px] font-semibold text-on-surface-variant group-active:text-on-surface transition-colors">Añadir</span>
        </Link>
        <Link href="/history" className="flex flex-col items-center gap-2 group">
          <div className="fintech-circle-btn">
            <Replace className="h-6 w-6" />
          </div>
          <span className="text-[11px] font-semibold text-on-surface-variant group-active:text-on-surface transition-colors">Ver todo</span>
        </Link>
        <Link href="/budget" className="flex flex-col items-center gap-2 group">
          <div className="fintech-circle-btn">
            <LayoutList className="h-6 w-6" />
          </div>
          <span className="text-[11px] font-semibold text-on-surface-variant group-active:text-on-surface transition-colors">Análisis</span>
        </Link>
        <Link href="/scan" className="flex flex-col items-center gap-2 group">
          <div className="fintech-circle-btn">
            <MoreHorizontal className="h-6 w-6" />
          </div>
          <span className="text-[11px] font-semibold text-on-surface-variant group-active:text-on-surface transition-colors">Escanear</span>
        </Link>
      </section>

      {/* Transactions List Card Container */}
      <section className="fintech-card w-full p-4 mt-6">
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-sm font-semibold text-on-surface">Actividad del mes</h3>
        </div>

        <div className="divide-y divide-outline/50">
          {recentTransactions.length > 0 ? recentTransactions.map((tx: TransactionRecord) => (
            <div key={tx.id} className="flex items-center justify-between py-4 group cursor-pointer active:bg-surface-hover transition-colors rounded-lg px-2 -mx-2">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${tx.type === 'INCOME' ? 'bg-emerald-600' : 'bg-indigo-500'}`}>
                  {tx.type === 'INCOME' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-semibold text-[15px] leading-tight text-on-surface">{tx.description || 'Movimiento'}</p>
                  <p className="text-[12px] text-on-surface-variant font-medium mt-0.5">
                    {new Date(tx.date).toLocaleDateString('es-CL', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                    {tx.category && ` · ${tx.category.name}`}
                  </p>
                </div>
              </div>
              <div className="text-right flex items-center gap-2">
                <p className={`font-medium text-[15px] ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-on-surface'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}${formatClp(tx.amount)}
                </p>
                <ChevronRight className="h-4 w-4 text-outline-variant opacity-0" />
              </div>
            </div>
          )) : (
            <div className="py-10 flex flex-col items-center justify-center opacity-60">
              <Inbox className="mb-3 h-10 w-10 text-on-surface-variant" />
              <p className="text-sm font-medium text-on-surface-variant">Sin transacciones recientes.</p>
            </div>
          )}
        </div>
        
        {recentTransactions.length > 0 && (
           <Link href="/history" className="block text-center pt-4 pb-2 mt-2 text-[13px] font-semibold text-primary hover:text-white transition-colors border-t border-outline/50">
             Ver todo
           </Link>
        )}
      </section>
    </main>
  );
}
