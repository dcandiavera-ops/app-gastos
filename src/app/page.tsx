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
  let monthlyBudget = 0;

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

    monthlyBudget = dbUser.monthlyBudget;
    recentTransactions = recentTransactionsResult;
    actualSpent = monthlyExpenseAggregate._sum.amount ?? 0;
    remaining = dbUser.monthlyBudget - actualSpent;
  } catch (error) {
    console.error('Dashboard load error:', error);
  }

  // Generate fake calendar tape for visuals (last 7 days)
  const today = new Date();
  const calendarDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - 3 + i); 
    return {
      dayStr: d.toLocaleDateString('es-CL', { weekday: 'short' }),
      date: d.getDate(),
      isToday: i === 3,
    };
  });

  const percentage = monthlyBudget > 0 ? Math.min(100, Math.round((actualSpent / monthlyBudget) * 100)) : 0;
  const strokeDasharray = 283;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;

  return (
    <main className="pt-[100px] pb-32 px-4 max-w-sm mx-auto space-y-6 flex flex-col items-center">
      
      {/* Calendar Tape */}
      <section className="flex justify-between w-full px-2">
        {calendarDays.map((d, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase">{d.dayStr}</span>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${d.isToday ? 'bg-primary text-black' : 'bg-[#1C1C1E] text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] border border-white/5'}`}>
              {d.date}
            </div>
          </div>
        ))}
      </section>

      {/* Massive Neon Hero Circle for Budget */}
      <section className="w-full relative habit-card p-6 mt-4 pb-8 flex flex-col items-center overflow-hidden">
        {/* Glow effect matching background behind card if needed */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none"></div>
        
        <div className="flex justify-between w-full items-center mb-6 z-10">
          <div className="text-on-surface-variant font-medium text-xs px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
            <LayoutList className="w-3 h-3"/> Presupuesto
          </div>
          <span className="text-xs font-semibold text-on-surface-variant">{percentage}% restante</span>
        </div>
        
        <div className="relative flex items-center justify-center w-48 h-48 mb-4 z-10">
          <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"></circle>
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} className="text-primary transition-all duration-1000 ease-out"></circle>
          </svg>
          <div className="flex flex-col items-center">
            <h1 className="text-5xl font-bold tracking-tighter shadow-sm text-primary" style={{ textShadow: '0 0 20px rgba(253, 224, 71, 0.4)' }}>
              ${formatClp(Math.max(0, remaining))}
            </h1>
            <p className="text-sm font-medium text-on-surface-variant mt-1">disponible</p>
          </div>
        </div>
        
        <div className="flex w-full gap-4 px-4 z-10">
          <Link href="/budget" className="flex-1 neon-btn py-3">
            Analizar
          </Link>
        </div>
      </section>

      {/* Habits / Transactions List */}
      <section className="w-full space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="text-[13px] font-bold text-on-surface uppercase tracking-wide">Recientes</h3>
          <span className="text-[10px] font-bold bg-white/10 text-white px-2 py-0.5 rounded-full">{recentTransactions.length}/10</span>
        </div>

        <div className="space-y-3">
          {recentTransactions.length > 0 ? recentTransactions.map((tx: TransactionRecord) => (
            <div key={tx.id} className="habit-pill flex items-center justify-between p-2 pl-4 cursor-pointer">
              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${tx.type === 'INCOME' ? 'bg-emerald-600/20' : 'bg-white/5'}`}>
                  {tx.type === 'INCOME' ? <ArrowDownLeft className="h-4 w-4 text-emerald-400" /> : <ArrowUpRight className="h-4 w-4 text-white" />}
                </div>
                <div className="flex flex-col justify-center truncate">
                  <p className="font-bold text-[14px] leading-tight text-white truncate">{tx.description || 'Movimiento'}</p>
                  <p className="text-[11px] text-on-surface-variant font-medium mt-0.5 truncate">
                    {new Date(tx.date).toLocaleDateString('es-CL', { month: 'short', day: 'numeric'})}
                    {tx.category && `, ${tx.category.name}`}
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center ml-2 border border-white/20 rounded-full h-11 px-4 min-w-[70px] justify-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                <p className={`font-bold text-[14px] whitespace-nowrap ${tx.type === 'INCOME' ? 'text-primary' : 'text-white'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}${formatClp(tx.amount)}
                </p>
              </div>
            </div>
          )) : (
             <div className="py-6 flex flex-col items-center justify-center bg-white/5 rounded-[2rem] border border-white/10">
               <Inbox className="mb-2 h-8 w-8 text-on-surface-variant" />
               <p className="text-xs font-semibold text-on-surface-variant">Sin transacciones recientes</p>
             </div>
          )}
        </div>
      </section>
    </main>
  );
}
