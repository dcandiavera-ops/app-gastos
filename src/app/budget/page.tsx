import { ChartPie } from 'lucide-react';
import TransactionsEditorList from '@/components/TransactionsEditorList';
import { formatClp, startOfCurrentMonth } from '@/lib/money';
import { requireAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function Budget() {
  const user = await requireAuthUser();
  const monthStart = startOfCurrentMonth();
  const [expenses, income, categories, monthlyTransactions] = await Promise.all([
    prisma.transaction.aggregate({
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
    prisma.category.findMany({
      include: {
        transactions: {
          where: {
            userId: user.id,
            type: 'EXPENSE',
            date: { gte: monthStart },
          },
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: monthStart },
      },
      include: {
        category: true,
      },
      orderBy: { date: 'desc' },
    }),
  ]);

  const totalExpense = expenses._sum.amount ?? 0;
  const totalIncome = income._sum.amount ?? 0;
  const net = totalIncome - totalExpense;
  const monthLabel = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(new Date());
  const categorySummaries = categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color,
      spent: category.transactions.reduce((sum, tx) => sum + tx.amount, 0),
      count: category.transactions.length,
    }))
    .filter((category) => category.spent > 0);

  return (
    <main className="pt-24 px-6 max-w-2xl mx-auto pb-32 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface">Resumen mensual</h1>
          <p className="text-xs font-bold text-on-surface/50 mt-2 uppercase tracking-[0.2em]">Mes en curso: {monthLabel}</p>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-extrabold drop-shadow-[0_0_10px_rgba(170,255,220,0.4)] ${net >= 0 ? 'text-primary' : 'text-error'}`}>
            {net >= 0 ? '+' : '-'}${formatClp(Math.abs(net))}
          </p>
          <p className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest mt-1">Balance neto</p>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-[2rem] border border-outline-variant/20 shadow-lg relative overflow-hidden mb-8">
        <div className="absolute -top-10 -right-10 w-48 h-48 wealth-orb opacity-40"></div>
        <h2 className="text-xl font-bold mb-8 relative z-10 text-on-surface flex items-center gap-3">
          <ChartPie className="h-8 w-8 text-primary" />
          Estado real de tus gastos
        </h2>

        <div className="grid sm:grid-cols-3 gap-4 relative z-10">
          <div className="rounded-2xl bg-surface-container-highest/60 border border-outline-variant/20 px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold">Ingresos</p>
            <p className="text-2xl font-black mt-2 text-primary">+${formatClp(totalIncome)}</p>
          </div>
          <div className="rounded-2xl bg-surface-container-highest/60 border border-outline-variant/20 px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold">Gastos</p>
            <p className="text-2xl font-black mt-2">${formatClp(totalExpense)}</p>
          </div>
          <div className="rounded-2xl bg-surface-container-highest/60 border border-outline-variant/20 px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold">Categorias activas</p>
            <p className="text-2xl font-black mt-2">{categorySummaries.length}</p>
          </div>
        </div>
      </div>

      <section className="glass-card p-6 rounded-[2rem] border border-outline-variant/20 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Gasto por categoria</h2>
          <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold">Solo categorias con movimientos</span>
        </div>

        {categorySummaries.length > 0 ? (
          <div className="space-y-3">
            {categorySummaries.map((category) => (
              <div key={category.id} className="rounded-2xl bg-surface-container-highest/50 border border-outline-variant/20 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: category.color }}></div>
                  <div>
                    <p className="font-bold">{category.name}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold">{category.count} movimientos</p>
                  </div>
                </div>
                <p className="text-xl font-black">${formatClp(category.spent)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-container-highest/40 border border-dashed border-outline-variant/30 px-5 py-10 text-center">
            <p className="font-bold">Todavia no hay categorias con gastos asignados.</p>
            <p className="text-sm text-on-surface/50 mt-2">Puedes usar la app sin categorias. Si luego quieres, agregamos clasificacion automatica.</p>
          </div>
        )}
      </section>

      <section className="glass-card p-6 rounded-[2rem] border border-outline-variant/20 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Editar movimientos del mes</h2>
          <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold">Monto, fecha, tipo y categoria</span>
        </div>
        <TransactionsEditorList
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
            color: category.color,
          }))}
          transactions={monthlyTransactions}
          emptyMessage="No hay movimientos este mes."
        />
      </section>
    </main>
  );
}
