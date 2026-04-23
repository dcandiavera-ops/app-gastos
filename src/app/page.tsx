import Link from 'next/link';
import { LayoutList, Inbox, ArrowUpRight, ArrowDownLeft, Wallet, HandCoins, CreditCard, TrendingDown, TrendingUp, PiggyBank } from 'lucide-react';
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
  let spentOnCredit = 0;
  let spentOnDebit = 0;
  let totalIncome = 0;
  let debitIncome = 0;
  let creditIncome = 0;
  let creditBudget = 170000;
  let creditRemaining = 0;
  let debitBalance = 0;
  let remaining = 0;
  let monthlyBudget = 0;
  let actualSpent = 0;
  let categorySummaries: { name: string; color: string; creditSpent: number; debitSpent: number; total: number }[] = [];

  try {
    const dbUser = await ensureDbUser(user);
    const monthStart = startOfCurrentMonth();

    // Use separate fetches or handle errors within Promise.all to prevent total failure
    const results = await Promise.allSettled([
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
      prisma.transaction.groupBy({
        by: ['paymentMethod'],
        _sum: { amount: true },
        where: {
          userId: user.id,
          type: 'INCOME',
          date: { gte: monthStart },
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId: user.id,
          type: 'EXPENSE',
          date: { gte: monthStart },
        },
        include: { category: true },
      }),
    ]);

    const recentTransactionsResult = results[0].status === 'fulfilled' ? results[0].value : [];
    const expenseAggregates = results[1].status === 'fulfilled' ? results[1].value : [];
    const incomeAggregates = results[2].status === 'fulfilled' ? results[2].value : [];
    const categoryExpenses = (results[3].status === 'fulfilled' ? results[3].value : []) as any[];

    if (results.some(r => r.status === 'rejected')) {
      console.error('Some dashboard queries failed:', results.filter(r => r.status === 'rejected'));
    }

    spentOnCredit = expenseAggregates.find(a => a.paymentMethod === 'CREDIT')?._sum.amount ?? 0;
    spentOnDebit = expenseAggregates
      .filter(a => a.paymentMethod !== 'CREDIT')
      .reduce((acc, a) => acc + (a._sum.amount ?? 0), 0);

    // Split income by payment method
    debitIncome = incomeAggregates
      .filter(a => a.paymentMethod !== 'CREDIT')
      .reduce((acc, a) => acc + (a._sum.amount ?? 0), 0);
    creditIncome = incomeAggregates.find(a => a.paymentMethod === 'CREDIT')?._sum.amount ?? 0;
    totalIncome = debitIncome + creditIncome;

    creditBudget = dbUser.creditBudget || 170000;
    creditRemaining = Math.max(0, creditBudget + creditIncome - spentOnCredit);
    debitBalance = debitIncome - spentOnDebit;

    monthlyBudget = creditBudget + totalIncome;
    recentTransactions = recentTransactionsResult as TransactionRecord[];
    actualSpent = spentOnCredit + spentOnDebit;
    remaining = creditRemaining + debitBalance;

    // Build category summaries with credit/debit breakdown
    const catMap = new Map<string, { name: string; color: string; creditSpent: number; debitSpent: number }>();
    for (const tx of categoryExpenses) {
      const catName = tx.category?.name || 'Sin categoría';
      const catColor = tx.category?.color || '#888888';
      const entry = catMap.get(catName) || { name: catName, color: catColor, creditSpent: 0, debitSpent: 0 };
      if (tx.paymentMethod === 'CREDIT') {
        entry.creditSpent += tx.amount;
      } else {
        entry.debitSpent += tx.amount;
      }
      catMap.set(catName, entry);
    }
    categorySummaries = Array.from(catMap.values())
      .map(c => ({ ...c, total: c.creditSpent + c.debitSpent }))
      .sort((a, b) => b.total - a.total);
  } catch (error) {
    console.error('Critical Dashboard load error:', error);
  }

  // Calendar tape (last 7 days)
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

  const daysRemaining = getDaysRemainingInCycle();
  const percentage = monthlyBudget > 0 ? Math.min(100, 100 - Math.round((actualSpent / monthlyBudget) * 100)) : 100;
  const strokeDasharray = 283;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * Math.max(0, percentage)) / 100;
  const totalCreditAvailable = creditBudget + creditIncome;
  const creditUsedPct = totalCreditAvailable > 0 ? Math.min(100, Math.round((spentOnCredit / totalCreditAvailable) * 100)) : 0;

  return (
    <main className="pt-[100px] pb-32 px-4 max-w-sm mx-auto space-y-5 flex flex-col items-center">

      {/* Calendar Tape */}
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

      {/* ——— Hero Circle ——— */}
      <section className="w-full relative p-6 pt-5 pb-6 flex flex-col items-center overflow-hidden rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-[60px] -mr-12 -mt-12 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] -ml-8 -mb-8 pointer-events-none"></div>

        <div className="flex justify-between w-full items-center mb-4 z-10">
          <div className="text-on-surface-variant font-medium text-xs px-3 py-1.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
            <LayoutList className="w-3 h-3"/> Balance Total
          </div>
          <span className="text-xs font-semibold text-primary">{percentage}% restante</span>
        </div>

        {/* Ring */}
        <div className="relative flex items-center justify-center w-60 h-60 my-2 z-10">
          <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6"></circle>
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} className="text-primary transition-all duration-1000 ease-out" style={{ filter: 'drop-shadow(0 0 6px rgba(253,224,71,0.5))' }}></circle>
          </svg>
          <div className="flex flex-col items-center px-2 w-full">
            <h1 className="font-extrabold tracking-tight text-white leading-none text-center w-full" style={{ fontSize: 'clamp(1.5rem, 8vw, 2.5rem)', textShadow: '0 0 30px rgba(255,255,255,0.15)' }}>
              ${formatClp(Math.max(0, remaining))}
            </h1>
            <p className="text-sm font-medium text-on-surface-variant mt-2">disponible total</p>
          </div>
        </div>

        {/* Days remaining */}
        <div className="flex items-center gap-2 mb-4 z-10">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></div>
          <span className="text-xs font-semibold text-on-surface-variant">
            Quedan <span className="text-white font-bold">{daysRemaining} días</span> en este ciclo
          </span>
        </div>

        <div className="flex w-full gap-4 px-2 z-10">
          <Link href="/budget" className="flex-1 neon-btn py-3 text-sm font-bold">
            Analizar
          </Link>
        </div>
      </section>

      {/* ——— Tarjeta de Crédito Card ——— */}
      <section className="w-full rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Tarjeta de Crédito</p>
              <p className="text-[10px] font-semibold text-on-surface-variant">Cupo: ${formatClp(creditBudget)}{creditIncome > 0 ? ` + $${formatClp(creditIncome)} ingresado` : ''}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-white">${formatClp(creditRemaining)}</p>
            <p className="text-[10px] font-semibold text-on-surface-variant">disponible</p>
          </div>
        </div>
        {/* Credit usage bar */}
        <div className="space-y-1.5">
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${creditUsedPct > 90 ? 'bg-red-500' : creditUsedPct > 70 ? 'bg-amber-400' : 'bg-emerald-500'}`}
              style={{ width: `${creditUsedPct}%` }}
            ></div>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] font-semibold text-on-surface-variant">Gastado ${formatClp(spentOnCredit)}</span>
            <span className="text-[10px] font-semibold text-on-surface-variant">{creditUsedPct}% usado</span>
          </div>
        </div>
      </section>

      {/* ——— Débito / Efectivo Card ——— */}
      <section className="w-full rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Débito / Efectivo</p>
              <p className="text-[10px] font-semibold text-on-surface-variant">Ingresos: ${formatClp(debitIncome)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${debitBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${formatClp(debitBalance)}</p>
            <p className="text-[10px] font-semibold text-on-surface-variant">saldo</p>
          </div>
        </div>
        {/* Debit breakdown */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl py-2 px-3 text-center">
            <p className="text-[9px] uppercase font-bold tracking-wider text-on-surface-variant mb-0.5 flex items-center justify-center gap-1">
              <TrendingUp className="w-2.5 h-2.5 text-emerald-400" /> Entradas
            </p>
            <p className="text-sm font-bold text-emerald-400">+${formatClp(debitIncome)}</p>
          </div>
          <div className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl py-2 px-3 text-center">
            <p className="text-[9px] uppercase font-bold tracking-wider text-on-surface-variant mb-0.5 flex items-center justify-center gap-1">
              <TrendingDown className="w-2.5 h-2.5 text-red-400" /> Salidas
            </p>
            <p className="text-sm font-bold text-white">${formatClp(spentOnDebit)}</p>
          </div>
        </div>
      </section>

      {/* ——— Resumen por Categoría con desglose Crédito/Débito ——— */}
      {categorySummaries.length > 0 && (
        <section className="w-full rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Gasto por categoría</h3>
          <div className="space-y-2">
            {categorySummaries.map((cat) => {
              const CatIcon = getCategoryIcon(cat.name);
              const pct = actualSpent > 0 ? Math.round((cat.total / actualSpent) * 100) : 0;
              return (
                <div key={cat.name} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex shrink-0 items-center justify-center"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      <CatIcon className="w-[18px] h-[18px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-sm text-white truncate">{cat.name}</p>
                        <p className="text-sm font-bold text-white shrink-0 ml-2">${formatClp(cat.total)}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-on-surface-variant shrink-0">{pct}%</span>
                      </div>
                    </div>
                  </div>
                  {/* Credit/Debit breakdown per category */}
                  <div className="flex gap-2 ml-12">
                    {cat.creditSpent > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        Crédito ${formatClp(cat.creditSpent)}
                      </span>
                    )}
                    {cat.debitSpent > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        Débito ${formatClp(cat.debitSpent)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ——— Resumen General ——— */}
      <section className="w-full rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-5">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Resumen del ciclo</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center py-1.5">
            <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-2">
              <CreditCard className="w-3 h-3 text-amber-400" /> Cupo Crédito
            </span>
            <span className="text-sm font-bold text-white">${formatClp(creditBudget)}</span>
          </div>
          {creditIncome > 0 && (
            <div className="flex justify-between items-center py-1.5">
              <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-amber-400" /> Ingreso a Crédito
              </span>
              <span className="text-sm font-bold text-amber-400">+${formatClp(creditIncome)}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-1.5">
            <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-2">
              <TrendingDown className="w-3 h-3 text-red-400" /> Gastado Crédito
            </span>
            <span className="text-sm font-bold text-white">-${formatClp(spentOnCredit)}</span>
          </div>
          <div className="h-px bg-white/[0.06]"></div>
          <div className="flex justify-between items-center py-1.5">
            <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-2">
              <PiggyBank className="w-3 h-3 text-emerald-400" /> Ingresos Débito
            </span>
            <span className="text-sm font-bold text-emerald-400">+${formatClp(debitIncome)}</span>
          </div>
          <div className="flex justify-between items-center py-1.5">
            <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-2">
              <TrendingDown className="w-3 h-3 text-red-400" /> Gastado Débito
            </span>
            <span className="text-sm font-bold text-white">-${formatClp(spentOnDebit)}</span>
          </div>
          <div className="h-px bg-white/[0.06]"></div>
          <div className="flex justify-between items-center py-1.5">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
              <Wallet className="w-3 h-3" /> Saldo Débito
            </span>
            <span className={`text-sm font-bold ${debitBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${formatClp(debitBalance)}</span>
          </div>
          <div className="flex justify-between items-center py-1.5">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-2">
              <CreditCard className="w-3 h-3" /> Saldo Crédito
            </span>
            <span className="text-sm font-bold text-amber-400">${formatClp(creditRemaining)}</span>
          </div>
          <div className="h-px bg-white/[0.06]"></div>
          <div className="flex justify-between items-center py-1.5">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Wallet className="w-3 h-3 text-primary" /> Total Disponible
            </span>
            <span className="text-base font-extrabold text-primary">${formatClp(Math.max(0, remaining))}</span>
          </div>
        </div>
      </section>

      {/* ——— Transactions List ——— */}
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
                    <span className={`ml-1.5 px-1 py-0.5 rounded text-[9px] uppercase font-bold ${tx.paymentMethod === 'CREDIT' ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                        {tx.paymentMethod === 'CREDIT' ? 'crédito' : 'débito'}
                      </span>
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
