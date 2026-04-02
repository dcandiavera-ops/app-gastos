import { ChartPie } from 'lucide-react';
import TransactionsEditorList from '@/components/TransactionsEditorList';
import { formatClp, startOfCurrentMonth, getMonthLabelDate } from '@/lib/money';
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
  const monthLabel = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(getMonthLabelDate());
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
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Resumen mensual</h1>
          <p className="text-[10px] font-semibold text-on-surface-variant mt-1 uppercase tracking-wider">Mes en curso: {monthLabel}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${net >= 0 ? 'text-primary' : 'text-error'}`}>
            {net >= 0 ? '+' : '-'}${formatClp(Math.abs(net))}
          </p>
          <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mt-1">Balance neto</p>
        </div>
      </div>

      <div className="supabase-card p-6 mb-8">
        <h2 className="text-lg font-bold mb-6 text-on-surface flex items-center gap-2">
          <ChartPie className="h-5 w-5 text-primary" />
          Resumen General
        </h2>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-md bg-surface-variant/40 border border-outline px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant font-medium">Ingresos</p>
            <p className="text-xl font-bold mt-1 text-primary">+${formatClp(totalIncome)}</p>
          </div>
          <div className="rounded-md bg-surface-variant/40 border border-outline px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant font-medium">Gastos</p>
            <p className="text-xl font-bold mt-1">${formatClp(totalExpense)}</p>
          </div>
          <div className="rounded-md bg-surface-variant/40 border border-outline px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant font-medium">Categorias</p>
            <p className="text-xl font-bold mt-1">{categorySummaries.length}</p>
          </div>
        </div>
      </div>

      <section className="supabase-card p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Gasto por categoria</h2>
          <span className="text-xs uppercase tracking-wider text-on-surface-variant font-medium">Solo categorias activas</span>
        </div>

        {categorySummaries.length > 0 ? (
          <div className="space-y-2">
            {categorySummaries.map((category) => (
              <div key={category.id} className="rounded-md bg-surface-variant/30 border border-outline px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: category.color }}></div>
                  <div>
                    <p className="font-semibold text-sm">{category.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium mt-0.5">{category.count} movimientos</p>
                  </div>
                </div>
                <p className="text-base font-bold">${formatClp(category.spent)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-outline px-5 py-8 text-center">
            <p className="font-medium text-sm">No hay categorias con gastos asignados.</p>
          </div>
        )}
      </section>

      <section className="supabase-card p-6 space-y-4 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Movimientos del mes</h2>
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
