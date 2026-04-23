import { TrendingDown, TrendingUp, Wallet, CreditCard, AlertTriangle, Info, Lightbulb, BarChart3, PieChart } from 'lucide-react';
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

  const [expensesByMethod, incomesByMethod, allExpenses, allIncomes, categories] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['paymentMethod'],
      _sum: { amount: true },
      where: { userId: user.id, type: 'EXPENSE', date: { gte: monthStart } },
    }),
    prisma.transaction.groupBy({
      by: ['paymentMethod'],
      _sum: { amount: true },
      where: { userId: user.id, type: 'INCOME', date: { gte: monthStart } },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, type: 'EXPENSE', date: { gte: monthStart } },
      include: { category: true },
      orderBy: { date: 'desc' },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, type: 'INCOME', date: { gte: monthStart } },
      include: { category: true },
      orderBy: { amount: 'desc' },
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ]);

  // Totals
  const spentCredit = expensesByMethod.find(a => a.paymentMethod === 'CREDIT')?._sum.amount ?? 0;
  const spentDebit = expensesByMethod.filter(a => a.paymentMethod !== 'CREDIT').reduce((s, a) => s + (a._sum.amount ?? 0), 0);
  const totalExpense = spentCredit + spentDebit;
  const totalIncome = allIncomes.reduce((s, tx) => s + tx.amount, 0);
  const creditBudget = dbUser.creditBudget || 170000;
  const creditUsedPct = creditBudget > 0 ? Math.round((spentCredit / creditBudget) * 100) : 0;
  const creditExcess = Math.max(0, spentCredit - creditBudget);
  const creditPctOfTotal = totalExpense > 0 ? ((spentCredit / totalExpense) * 100).toFixed(1) : '0';
  const debitPctOfTotal = totalExpense > 0 ? ((spentDebit / totalExpense) * 100).toFixed(1) : '0';

  // Category summaries with credit/debit split
  const catMap = new Map<string, { name: string; color: string; credit: number; debit: number; total: number }>();
  for (const tx of allExpenses) {
    const n = tx.category?.name || 'Sin categoría';
    const c = tx.category?.color || '#888';
    const e = catMap.get(n) || { name: n, color: c, credit: 0, debit: 0, total: 0 };
    if (tx.paymentMethod === 'CREDIT') e.credit += tx.amount; else e.debit += tx.amount;
    e.total = e.credit + e.debit;
    catMap.set(n, e);
  }
  const categorySummaries = Array.from(catMap.values()).sort((a, b) => b.total - a.total);
  const topCat = categorySummaries[0];

  // Top category purchases
  const topCatPurchases = topCat
    ? allExpenses.filter(tx => (tx.category?.name || 'Sin categoría') === topCat.name).sort((a, b) => b.amount - a.amount).slice(0, 20)
    : [];

  // Daily spending (full cycle)
  const now = new Date();
  const dailyMap = new Map<string, number>();
  for (const tx of allExpenses) {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dailyMap.set(key, (dailyMap.get(key) || 0) + tx.amount);
  }
  const dailySpending: { label: string; amount: number; fullLabel: string }[] = [];
  const cursor = new Date(monthStart);
  while (cursor <= now) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    dailySpending.push({
      label: `${cursor.getDate()} ${cursor.toLocaleDateString('es-CL', { month: 'short' })}`,
      fullLabel: key,
      amount: dailyMap.get(key) || 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  const maxDaily = Math.max(...dailySpending.map(d => d.amount), 1);

  // Month label
  const monthLabel = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(getMonthLabelDate());
  const daysRemaining = getDaysRemainingInCycle();
  const topCatPctOfTotal = topCat && totalExpense > 0 ? ((topCat.total / totalExpense) * 100).toFixed(1) : '0';

  // Donut chart segments
  let donutOffset = 0;
  const donutSegments = categorySummaries.map(cat => {
    const pct = totalExpense > 0 ? (cat.total / totalExpense) * 100 : 0;
    const seg = { ...cat, pct, offset: donutOffset };
    donutOffset += pct;
    return seg;
  });

  // Insights
  const insights: { icon: string; color: string; text: string }[] = [];
  if (creditExcess > 0) insights.push({ icon: '⚠️', color: 'text-red-400', text: `El crédito superó el presupuesto en $${formatClp(creditExcess)}` });
  if (topCat) insights.push({ icon: '🍽️', color: 'text-blue-400', text: `${topCat.name} concentra el ${topCatPctOfTotal}% del gasto total` });
  insights.push({ icon: '💳', color: 'text-amber-400', text: `Crédito representa el ${creditPctOfTotal}% del gasto del ciclo` });
  if (topCat && topCat.debit > 0 && topCat.credit > 0) {
    insights.push({ icon: '📊', color: 'text-emerald-400', text: `Si reduces ${topCat.name.toLowerCase()} fuera de casa y compras pequeñas frecuentes, podrías mejorar el control mensual` });
  } else {
    insights.push({ icon: '💡', color: 'text-emerald-400', text: `Quedan ${daysRemaining} días. Mantén el control de gastos pequeños frecuentes.` });
  }

  return (
    <main className="pt-[100px] pb-32 px-4 max-w-sm mx-auto space-y-5 flex flex-col">

      {/* Header */}
      <div className="px-1">
        <h1 className="text-2xl font-bold text-white tracking-tight">Contabilidad Daniel</h1>
        <p className="text-[11px] font-semibold text-on-surface-variant mt-1 uppercase tracking-widest">Mes de {monthLabel}</p>
      </div>

      {/* Credit Budget Editor */}
      <CreditBudgetEditor initialBudget={creditBudget} />

      {/* ——— KPI Row ——— */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Gasto total del ciclo', value: totalExpense, color: 'text-white', icon: <BarChart3 className="w-3.5 h-3.5 text-white" />, bg: 'bg-white/15' },
          { label: 'Gasto total crédito', value: spentCredit, color: 'text-amber-400', icon: <CreditCard className="w-3.5 h-3.5 text-amber-400" />, bg: 'bg-amber-500/15' },
          { label: 'Gasto débito / cash', value: spentDebit, color: 'text-emerald-400', icon: <Wallet className="w-3.5 h-3.5 text-emerald-400" />, bg: 'bg-emerald-500/15' },
          { label: 'Ingresos', value: totalIncome, color: 'text-blue-400', icon: <TrendingUp className="w-3.5 h-3.5 text-blue-400" />, bg: 'bg-blue-500/15' },
        ].map((kpi, i) => (
          <div key={i} className="rounded-[1.5rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-full ${kpi.bg} flex items-center justify-center`}>{kpi.icon}</div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{kpi.label}</span>
            </div>
            <p className={`text-xl font-bold ${kpi.color}`}>${formatClp(kpi.value)}</p>
          </div>
        ))}
      </div>

      {/* ——— Credit Budget Gauge ——— */}
      <section className="rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-5">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">Presupuesto crédito</h3>
        <div className="flex items-center gap-5">
          {/* SVG Gauge */}
          <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={creditUsedPct > 100 ? '#ef4444' : creditUsedPct > 80 ? '#f59e0b' : '#10b981'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${Math.min(creditUsedPct, 150) * 2.64} 264`}
                style={{ filter: `drop-shadow(0 0 6px ${creditUsedPct > 100 ? 'rgba(239,68,68,0.5)' : 'rgba(16,185,129,0.4)'})` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-lg font-extrabold ${creditUsedPct > 100 ? 'text-red-400' : 'text-white'}`}>{creditUsedPct}%</span>
              <span className="text-[8px] font-bold text-on-surface-variant">usado</span>
            </div>
          </div>
          {/* Details */}
          <div className="flex-1 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-on-surface-variant">Presupuesto</span><span className="font-bold text-white">${formatClp(creditBudget)}</span></div>
            <div className="flex justify-between"><span className="text-on-surface-variant">Gasto real</span><span className="font-bold text-white">${formatClp(spentCredit)}</span></div>
            {creditExcess > 0 && (
              <div className="flex justify-between"><span className="text-red-400 font-semibold">Exceso</span><span className="font-bold text-red-400">${formatClp(creditExcess)}</span></div>
            )}
            <div className="mt-2 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <span className={`text-[10px] font-bold ${creditExcess > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {creditExcess > 0 ? `${((creditExcess / creditBudget) * 100).toFixed(1)}% sobre lo presupuestado` : `${(100 - creditUsedPct)}% disponible`}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ——— Category Donut Chart ——— */}
      <section className="rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-5">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">Distribución del gasto por categoría</h3>
        <div className="flex items-start gap-4">
          {/* SVG Donut */}
          <div className="relative w-32 h-32 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {donutSegments.map((seg, i) => (
                <circle key={i} cx="50" cy="50" r="38" fill="none" stroke={seg.color} strokeWidth="14"
                  strokeDasharray={`${seg.pct * 2.39} 239`} strokeDashoffset={`${-seg.offset * 2.39}`} />
              ))}
            </svg>
          </div>
          {/* Legend */}
          <div className="flex-1 space-y-1.5 max-h-32 overflow-y-auto">
            {categorySummaries.map((cat, i) => {
              const pct = totalExpense > 0 ? ((cat.total / totalExpense) * 100).toFixed(1) : '0';
              return (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-on-surface-variant truncate flex-1">{cat.name}</span>
                  <span className="font-bold text-white shrink-0">${formatClp(cat.total)}</span>
                  <span className="text-on-surface-variant shrink-0">({pct}%)</span>
                </div>
              );
            })}
            <div className="pt-1 border-t border-white/[0.06] flex justify-between text-xs font-bold">
              <span className="text-on-surface-variant">Total</span>
              <span className="text-white">${formatClp(totalExpense)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ——— % por método + Ingresos ——— */}
      <div className="grid grid-cols-2 gap-3">
        {/* Payment method % */}
        <div className="rounded-[1.5rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-4 space-y-3">
          <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">% del gasto</h3>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-amber-400 font-bold">Crédito</span>
                <span className="text-white font-extrabold text-base">{creditPctOfTotal}%</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-emerald-400 font-bold">Débito</span>
                <span className="text-white font-extrabold text-base">{debitPctOfTotal}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ingresos detail */}
        <div className="rounded-[1.5rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-4 space-y-2">
          <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Ingresos</h3>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {allIncomes.map((tx, i) => (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <span className="text-on-surface-variant truncate flex-1 mr-1">• {tx.description || 'Ingreso'}</span>
                <span className="font-bold text-emerald-400 shrink-0">${formatClp(tx.amount)}</span>
              </div>
            ))}
          </div>
          <div className="pt-1 border-t border-white/[0.06] flex justify-between text-xs">
            <span className="text-on-surface-variant font-semibold">Total</span>
            <span className="font-bold text-emerald-400">${formatClp(totalIncome)}</span>
          </div>
        </div>
      </div>

      {/* ——— Top Category Detail ——— */}
      {topCat && topCatPurchases.length > 0 && (
        <section className="rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Detalle de compras de {topCat.name.toLowerCase()}</h3>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {topCatPctOfTotal}% del gasto
            </span>
          </div>
          <div className="flex items-center gap-4 mb-3 text-[10px] text-on-surface-variant">
            <span>Total {topCat.name.toLowerCase()} = <span className="text-white font-bold">${formatClp(topCat.total)}</span></span>
            <span>{topCatPurchases.length} compras</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {topCatPurchases.map((tx, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] py-0.5">
                <span className="text-on-surface-variant w-4 text-right shrink-0">{i + 1}</span>
                <span className="text-white truncate flex-1">{tx.description || 'Compra'}</span>
                <span className="font-bold text-white shrink-0">${formatClp(tx.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ——— Comparativo por método de pago ——— */}
      <section className="rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-5 space-y-3">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Comparativo por método de pago</h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-400 font-semibold">Crédito</span>
              <span className="text-white font-bold">${formatClp(spentCredit)} ({creditPctOfTotal}%)</span>
            </div>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-amber-400" style={{ width: `${creditPctOfTotal}%` }} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold">Débito / cash</span>
              <span className="text-white font-bold">${formatClp(spentDebit)} ({debitPctOfTotal}%)</span>
            </div>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${debitPctOfTotal}%` }} />
            </div>
          </div>
        </div>
        {/* Top category split */}
        {topCat && topCat.credit > 0 && topCat.debit > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">En la categoría {topCat.name.toLowerCase()}</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-amber-400">Crédito</span>
                <span className="font-bold text-white">${formatClp(topCat.credit)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-400">Débito</span>
                <span className="font-bold text-white">${formatClp(topCat.debit)}</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ——— Daily Spending Evolution ——— */}
      <section className="rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-5">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">Evolución del gasto diario</h3>
        <div className="overflow-x-auto -mx-2 px-2">
          <div className="flex items-end gap-1 min-w-max" style={{ height: '140px' }}>
            {dailySpending.map((day, idx) => {
              const heightPct = maxDaily > 0 ? Math.max(3, (day.amount / maxDaily) * 100) : 3;
              const isToday = idx === dailySpending.length - 1;
              return (
                <div key={idx} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ width: '36px' }}>
                  {day.amount > 0 && (
                    <span className="text-[7px] font-bold text-on-surface-variant whitespace-nowrap">${formatClp(day.amount)}</span>
                  )}
                  <div
                    className={`w-5 rounded-md transition-all ${isToday ? 'bg-primary shadow-[0_0_8px_rgba(253,224,71,0.4)]' : 'bg-white/10'}`}
                    style={{ height: `${heightPct}%`, minHeight: '3px' }}
                  />
                  <span className={`text-[7px] font-semibold whitespace-nowrap ${isToday ? 'text-primary' : 'text-on-surface-variant'}`}>{day.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ——— Smart Insights ——— */}
      <section className="rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-5 space-y-3">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Insights</h3>
        <div className="grid grid-cols-2 gap-2">
          {insights.map((ins, i) => (
            <div key={i} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 flex items-start gap-2">
              <span className="text-base shrink-0">{ins.icon}</span>
              <p className={`text-[10px] font-medium leading-relaxed ${ins.color}`}>{ins.text}</p>
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}
