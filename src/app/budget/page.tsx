import { TrendingDown, TrendingUp, Wallet, Target, CalendarDays, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import CreditBudgetEditor from '@/components/CreditBudgetEditor';
import { formatClp, startOfCurrentMonth, getMonthLabelDate, getDaysRemainingInCycle } from '@/lib/money';
import { getCategoryIcon } from '@/lib/category-icons';
import { requireAuthUser, ensureDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function Budget() {
  const user = await requireAuthUser();
  const dbUser = await ensureDbUser(user);
  const monthStart = startOfCurrentMonth();

  const [expenses, income, categories, monthlyTransactions] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId: user.id, type: 'EXPENSE', date: { gte: monthStart } },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId: user.id, type: 'INCOME', date: { gte: monthStart } },
    }),
    prisma.category.findMany({
      include: {
        transactions: {
          where: { userId: user.id, type: 'EXPENSE', date: { gte: monthStart } },
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: monthStart } },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 20,
    }),
  ]);

  const totalExpense = expenses._sum.amount ?? 0;
  const totalIncome = income._sum.amount ?? 0;
  const monthlyBudget = dbUser.monthlyBudget;
  const remaining = monthlyBudget - totalExpense;
  const daysRemaining = getDaysRemainingInCycle();
  const dailyAllowance = daysRemaining > 0 ? Math.max(0, remaining) / daysRemaining : 0;
  const budgetUsedPercent = monthlyBudget > 0 ? Math.min(100, Math.round((totalExpense / monthlyBudget) * 100)) : 0;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  const monthLabel = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(getMonthLabelDate());

  const categorySummaries = categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color,
      spent: category.transactions.reduce((sum, tx) => sum + tx.amount, 0),
      count: category.transactions.length,
    }))
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  const topCategory = categorySummaries[0];

  // Daily spending trend (last 7 days)
  const today = new Date();
  const dailySpending: { label: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const dayTotal = monthlyTransactions
      .filter((tx) => tx.type === 'EXPENSE' && new Date(tx.date) >= dayStart && new Date(tx.date) < dayEnd)
      .reduce((sum, tx) => sum + tx.amount, 0);
    dailySpending.push({
      label: d.toLocaleDateString('es-CL', { weekday: 'short' }).replace(/^\w/, (c) => c.toUpperCase()),
      amount: dayTotal,
    });
  }
  const maxDailySpend = Math.max(...dailySpending.map((d) => d.amount), 1);

  return (
    <main className="pt-[100px] pb-32 px-4 max-w-sm mx-auto space-y-5 flex flex-col">
      
      {/* Header */}
      <div className="px-1">
        <h1 className="text-2xl font-bold text-white tracking-tight">Análisis</h1>
        <p className="text-[11px] font-semibold text-on-surface-variant mt-1 uppercase tracking-widest">{monthLabel}</p>
      </div>

      {/* Credit Budget Editor */}
      <CreditBudgetEditor initialBudget={dbUser.creditBudget || 170000} />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.5rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Ingresos</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">+${formatClp(totalIncome)}</p>
        </div>

        <div className="rounded-[1.5rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-red-500/15 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Gastos</span>
          </div>
          <p className="text-xl font-bold text-white">${formatClp(totalExpense)}</p>
        </div>

        <div className="rounded-[1.5rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Presupuesto</span>
          </div>
          <p className="text-xl font-bold text-primary">${formatClp(monthlyBudget)}</p>
        </div>

        <div className="rounded-[1.5rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center">
              <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Por día</span>
          </div>
          <p className="text-xl font-bold text-blue-400">${formatClp(dailyAllowance)}</p>
        </div>
      </div>

      {/* Budget Progress Bar */}
      <section className="rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-5">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Uso del presupuesto</span>
          <span className={`text-sm font-bold ${budgetUsedPercent > 90 ? 'text-red-400' : budgetUsedPercent > 70 ? 'text-primary' : 'text-emerald-400'}`}>{budgetUsedPercent}%</span>
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${budgetUsedPercent > 90 ? 'bg-red-500' : budgetUsedPercent > 70 ? 'bg-primary' : 'bg-emerald-500'}`}
            style={{ width: `${budgetUsedPercent}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] font-semibold text-on-surface-variant">${formatClp(totalExpense)} gastado</span>
          <span className="text-[10px] font-semibold text-on-surface-variant">${formatClp(monthlyBudget)} total</span>
        </div>

        {/* Smart insight */}
        <div className="mt-4 bg-white/[0.04] border border-white/[0.06] rounded-2xl p-3">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {budgetUsedPercent > 100 ? (
              <><span className="text-red-400 font-bold">⚠️ Sobrepasaste</span> tu presupuesto por ${formatClp(Math.abs(remaining))}. Considera reducir gastos los próximos {daysRemaining} días.</>
            ) : budgetUsedPercent > 80 ? (
              <><span className="text-primary font-bold">⚡ Cuidado:</span> Has usado el {budgetUsedPercent}% del presupuesto y quedan {daysRemaining} días. Intenta gastar máximo <span className="text-white font-bold">${formatClp(dailyAllowance)}/día</span>.</>
            ) : savingsRate > 30 ? (
              <><span className="text-emerald-400 font-bold">🎯 Excelente:</span> Tu tasa de ahorro es {savingsRate}%. Vas bien encaminado con <span className="text-white font-bold">${formatClp(dailyAllowance)}/día</span> disponible.</>
            ) : (
              <><span className="text-blue-400 font-bold">💡 Tip:</span> Tienes <span className="text-white font-bold">${formatClp(dailyAllowance)}</span> por día para los próximos {daysRemaining} días. Mantén el ritmo.</>
            )}
          </p>
        </div>
      </section>

      {/* Daily Spending Chart (Last 7 Days) */}
      <section className="rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-5">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">Gasto diario — últimos 7 días</h3>
        <div className="flex items-end justify-between gap-2 h-28">
          {dailySpending.map((day, idx) => {
            const heightPct = maxDailySpend > 0 ? Math.max(4, (day.amount / maxDailySpend) * 100) : 4;
            const isToday = idx === dailySpending.length - 1;
            return (
              <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
                {day.amount > 0 && (
                  <span className="text-[9px] font-bold text-on-surface-variant">${formatClp(day.amount)}</span>
                )}
                <div
                  className={`w-full rounded-xl transition-all duration-500 ${isToday ? 'bg-primary shadow-[0_0_12px_rgba(253,224,71,0.4)]' : 'bg-white/10'}`}
                  style={{ height: `${heightPct}%`, minHeight: '4px' }}
                ></div>
                <span className={`text-[10px] font-semibold ${isToday ? 'text-primary' : 'text-on-surface-variant'}`}>{day.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Category Breakdown */}
      <section className="rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Gasto por categoría</h3>
          {topCategory && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Top: {topCategory.name}</span>
          )}
        </div>

        {categorySummaries.length > 0 ? (
          <div className="space-y-2">
            {categorySummaries.map((cat) => {
              const CatIcon = getCategoryIcon(cat.name);
              const pct = totalExpense > 0 ? Math.round((cat.spent / totalExpense) * 100) : 0;
              return (
                <div key={cat.id} className="habit-pill p-3 pl-4 flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex shrink-0 items-center justify-center"
                    style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                  >
                    <CatIcon className="w-[18px] h-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-bold text-sm text-white truncate">{cat.name}</p>
                      <p className="text-sm font-bold text-white shrink-0 ml-2">${formatClp(cat.spent)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-on-surface-variant shrink-0">{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Wallet className="mx-auto mb-2 h-8 w-8 text-on-surface-variant" />
            <p className="text-xs font-semibold text-on-surface-variant">Sin gastos categorizados este periodo</p>
          </div>
        )}
      </section>

      {/* Performance Summary */}
      <section className="rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-5">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">Rendimiento</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className={`text-2xl font-extrabold ${savingsRate >= 20 ? 'text-emerald-400' : savingsRate >= 0 ? 'text-primary' : 'text-red-400'}`}>{savingsRate}%</p>
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mt-1">Ahorro</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white">{daysRemaining}</p>
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mt-1">Días rest.</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white">{categorySummaries.length}</p>
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mt-1">Categorías</p>
          </div>
        </div>
      </section>

      {/* Recent transactions */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1">Últimos movimientos</h3>
        <div className="rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-4 space-y-2">
          {monthlyTransactions.length > 0 ? monthlyTransactions.slice(0, 8).map((tx) => {
            const TxIcon = tx.category ? getCategoryIcon(tx.category.name) : (tx.type === 'INCOME' ? ArrowDownLeft : ArrowUpRight);
            const txColor = tx.category?.color || (tx.type === 'INCOME' ? '#34d399' : '#ffffff');
            return (
              <div key={tx.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                  <div
                    className="w-8 h-8 rounded-full flex shrink-0 items-center justify-center"
                    style={{ backgroundColor: `${txColor}15`, color: txColor }}
                  >
                    <TxIcon className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-[13px] text-white truncate">{tx.description || 'Movimiento'}</p>
                    <p className="text-[10px] text-on-surface-variant font-medium truncate">
                      {new Date(tx.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                      {tx.category && ` · ${tx.category.name}`}
                    </p>
                  </div>
                </div>
                <p className={`font-bold text-[13px] shrink-0 ml-2 ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-white'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}${formatClp(tx.amount)}
                </p>
              </div>
            );
          }) : (
            <div className="py-6 text-center">
              <p className="text-xs font-semibold text-on-surface-variant">Sin movimientos este periodo</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
