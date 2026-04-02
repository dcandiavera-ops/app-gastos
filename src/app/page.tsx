import Link from 'next/link';
import { LayoutList, Inbox, ArrowUpRight, ArrowDownLeft, Wallet, HandCoins } from 'lucide-react';
import { ensureDbUser, getOptionalAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatClp, startOfCurrentMonth, getDaysRemainingInCycle } from '@/lib/money';
import { getCategoryIcon } from '@/lib/category-icons';
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
    
    const [recentTransactionsResult, expenseAggregates, incomeAggregate] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
        take: 10,
        include: { category: true },
      }),
      prisma.transaction.groupBy({
        by: ['paymentMethod'],
        _sum: { amount: true },
        where: {
          userId: user.id,
          type: 'EXPENSE',
          date: { gte: monthStart },
        },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          userId: user.id,
          type: 'INCOME',
          date: { gte: monthStart },
        },
      }),
    ]);

    const spentOnCredit = expenseAggregates.find(a => a.paymentMethod === 'CREDIT')?._sum.amount ?? 0;
    const spentOnDebit = expenseAggregates
      .filter(a => a.paymentMethod !== 'CREDIT')
      .reduce((acc, a) => acc + (a._sum.amount ?? 0), 0);
    const totalIncome = incomeAggregate._sum.amount ?? 0;

    const creditBudget = dbUser.creditBudget || 170000;
    const creditRemaining = Math.max(0, creditBudget - spentOnCredit);
    const debitBalance = totalIncome - spentOnDebit;

    monthlyBudget = creditBudget + totalIncome;
    recentTransactions = recentTransactionsResult;
    actualSpent = spentOnCredit + spentOnDebit;
    remaining = creditRemaining + debitBalance;

    // We'll pass these extra values to the UI if needed
    (Dashboard as any).extraData = { creditRemaining, debitBalance, creditBudget, totalIncome };
  } catch (error) {
    console.error('Dashboard load error:', error);
  }

  // Generate calendar tape for visuals (last 7 days)
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

  // Days remaining in the 25-to-25 budget cycle
  const daysRemaining = getDaysRemainingInCycle();

  const percentage = monthlyBudget > 0 ? Math.min(100, 100 - Math.round((actualSpent / monthlyBudget) * 100)) : 100;
  const strokeDasharray = 283;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * Math.max(0, percentage)) / 100;

  return (
    <main className="pt-[100px] pb-32 px-4 max-w-sm mx-auto space-y-6 flex flex-col items-center">
      
      {/* Calendar Tape — glass container */}
      <section className="flex justify-between w-full px-3 py-4 rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-md">
        {calendarDays.map((d, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase">{d.dayStr}</span>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${d.isToday ? 'bg-primary text-black' : 'bg-[#1C1C1E] text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] border border-white/5'}`}>
              {d.date}
            </div>
          </div>
        ))}
      </section>

      {/* ——— Hero Circle for Budget (Glass Card) ——— */}
      <section className="w-full relative p-6 pt-5 pb-8 flex flex-col items-center overflow-hidden rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-[60px] -mr-12 -mt-12 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] -ml-8 -mb-8 pointer-events-none"></div>
        
        <div className="flex justify-between w-full items-center mb-4 z-10">
          <div className="text-on-surface-variant font-medium text-xs px-3 py-1.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
            <LayoutList className="w-3 h-3"/> Presupuesto
          </div>
          <span className="text-xs font-semibold text-primary">{percentage}% restante</span>
        </div>
        
        {/* Enlarged ring — responsive text */}
        <div className="relative flex items-center justify-center w-60 h-60 my-2 z-10">
          <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6"></circle>
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} className="text-primary transition-all duration-1000 ease-out" style={{ filter: 'drop-shadow(0 0 6px rgba(253,224,71,0.5))' }}></circle>
          </svg>
          <div className="flex flex-col items-center px-2 w-full">
            <h1 className="font-extrabold tracking-tight text-white leading-none text-center w-full" style={{ fontSize: 'clamp(1.5rem, 8vw, 2.5rem)', textShadow: '0 0 30px rgba(255,255,255,0.15)' }}>
              ${formatClp(Math.max(0, remaining))}
            </h1>
            <p className="text-sm font-medium text-on-surface-variant mt-2">disponible</p>
          </div>
        </div>

        {/* Days remaining pill */}
        <div className="flex items-center gap-2 mb-4 z-10">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></div>
          <span className="text-xs font-semibold text-on-surface-variant">
            Quedan <span className="text-white font-bold">{daysRemaining} días</span> con este dinero
          </span>
        </div>

        {/* Stats row: Split Credit and Debit balance */}
        <div className="flex w-full gap-3 mb-5 z-10">
          <div className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3 px-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1 flex items-center justify-center gap-1.5">
              <HandCoins className="h-2.5 w-2.5" /> Crédito
            </p>
            <p className="text-base font-bold text-white">${formatClp((Dashboard as any).extraData?.creditRemaining ?? 0)}</p>
          </div>
          <div className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3 px-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1 flex items-center justify-center gap-1.5">
              <Wallet className="h-2.5 w-2.5" /> Débito
            </p>
            <p className="text-base font-bold text-primary">${formatClp((Dashboard as any).extraData?.debitBalance ?? 0)}</p>
          </div>
        </div>
        
        <div className="flex w-full gap-4 px-2 z-10">
          <Link href="/budget" className="flex-1 neon-btn py-3 text-sm font-bold">
            Analizar
          </Link>
        </div>
      </section>

      {/* ——— Transactions List (Glass Card) ——— */}
      <section className="w-full space-y-4">
        <div className="flex items-center gap-3 px-1">
          <h3 className="text-[13px] font-bold text-on-surface uppercase tracking-wide">Recientes</h3>
          <span className="text-[10px] font-bold bg-white/10 text-white px-2 py-0.5 rounded-full">{recentTransactions.length}/10</span>
        </div>

        <div className="space-y-3 p-4 rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl">
          {recentTransactions.length > 0 ? recentTransactions.map((tx: TransactionRecord) => {
            const CategoryIcon = tx.category ? getCategoryIcon(tx.category.name) : (tx.type === 'INCOME' ? ArrowDownLeft : ArrowUpRight);
            const catColor = tx.category?.color || (tx.type === 'INCOME' ? '#34d399' : '#ffffff');
            return (
            <div key={tx.id} className="habit-pill flex items-center justify-between p-2.5 pl-3 cursor-pointer">
              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                <div
                  className="w-10 h-10 rounded-full flex shrink-0 items-center justify-center"
                  style={{ backgroundColor: `${catColor}15`, color: catColor }}
                >
                  <CategoryIcon className="h-[18px] w-[18px]" />
                </div>
                <div className="flex flex-col justify-center truncate">
                  <p className="font-bold text-[14px] leading-tight text-white truncate">{tx.description || 'Movimiento'}</p>
                  <p className="text-[11px] text-on-surface-variant font-medium mt-0.5 truncate">
                    {new Date(tx.date).toLocaleDateString('es-CL', { month: 'short', day: 'numeric'})}
                    {tx.category && ` · ${tx.category.name}`}
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center ml-2 border border-white/15 rounded-full h-11 px-4 min-w-[70px] justify-center bg-white/[0.03]">
                <p className={`font-bold text-[14px] whitespace-nowrap ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-white'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}${formatClp(tx.amount)}
                </p>
              </div>
            </div>
            );
          }) : (
             <div className="py-8 flex flex-col items-center justify-center">
               <Inbox className="mb-2 h-8 w-8 text-on-surface-variant" />
               <p className="text-xs font-semibold text-on-surface-variant">Sin transacciones recientes</p>
             </div>
          )}
        </div>
      </section>
    </main>
  );
}
