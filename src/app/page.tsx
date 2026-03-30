import Link from 'next/link';
import { requireAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatClp, startOfCurrentMonth } from '@/lib/money';
import type { TransactionRecord } from '@/lib/transaction-types';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const user = await requireAuthUser();
  const monthStart = startOfCurrentMonth();
  const [recentTransactions, monthlyExpenseAggregate, monthlyIncomeAggregate] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { date: 'desc' },
      take: 5,
    }),
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
  ]);

  const actualSpent = monthlyExpenseAggregate._sum.amount ?? 0;
  const actualIncome = monthlyIncomeAggregate._sum.amount ?? 0;
  const budget = 1000000;
  const rawPercentage = (actualSpent / budget) * 100;
  const percentage = Math.min(rawPercentage, 100);
  const remaining = budget - actualSpent;

  let alertMessage = '';
  let alertColor = '';
  let alertIcon = '';
  let progressBarColor = '';

  if (actualSpent > budget) {
    alertMessage = `Atencion: superaste tu presupuesto mensual por $${formatClp(actualSpent - budget)} CLP.`;
    alertColor = 'text-error';
    alertIcon = 'warning';
    progressBarColor = 'bg-error shadow-[0_0_25px_rgba(255,180,171,0.6)]';
  } else if (rawPercentage >= 80) {
    alertMessage = `Cuidado: estas cerca del limite. Te quedan $${formatClp(remaining)} CLP disponibles.`;
    alertColor = 'text-yellow-400';
    alertIcon = 'error_outline';
    progressBarColor = 'bg-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.6)]';
  } else {
    alertMessage = `Buen trabajo: estas dentro del presupuesto. Te quedan $${formatClp(remaining)} CLP disponibles.`;
    alertColor = 'text-primary';
    alertIcon = 'check_circle';
    progressBarColor = 'bg-primary shadow-[0_0_25px_rgba(170,255,220,0.6)]';
  }

  return (
    <main className="pt-28 pb-32 px-6 max-w-7xl mx-auto space-y-8">
      <section className="relative glass-card p-10 rounded-[2.5rem] overflow-hidden border border-outline-variant/30 shadow-2xl flex flex-col items-center justify-center text-center">
        <div className="absolute -top-32 -right-32 w-96 h-96 wealth-orb opacity-50"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 wealth-orb opacity-30"></div>

        <div className="relative z-10 space-y-6 w-full">
          <p className="font-extrabold text-on-surface/60 tracking-[0.3em] uppercase text-[10px] inline-flex items-center gap-2 bg-surface-container-highest/50 px-5 py-2 rounded-full border border-outline-variant/20 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(170,255,220,1)]"></span>
            Presupuesto mensual
          </p>

          <div className="flex flex-col items-center justify-center gap-1">
            <h2 className="text-xl font-bold text-on-surface/70 tracking-widest uppercase text-[10px]">Total gastado</h2>
            <div className="flex items-start justify-center">
              <span className="text-4xl font-extrabold text-primary/80 mt-2">$</span>
              <h1 className={`text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b drop-shadow-sm ${actualSpent > budget ? 'from-white to-error/80' : 'from-white to-primary/60'}`}>
                {formatClp(actualSpent)}
              </h1>
            </div>
            <p className="text-sm font-bold text-on-surface/50 mt-3 bg-surface-container-highest/30 px-4 py-1 rounded-full border border-outline-variant/10">
              de ${formatClp(budget)} presupuestado este mes
            </p>
          </div>

          <div className="w-full max-w-md mx-auto h-5 bg-[#060e20]/80 backdrop-blur-2xl rounded-full border border-outline-variant/30 p-1 relative overflow-hidden shadow-inner mt-6">
            <div
              className={`h-full rounded-full relative overflow-hidden transition-all duration-1000 ease-out flex items-center justify-end px-2 ${progressBarColor}`}
              style={{ width: `${percentage}%` }}
            >
              <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-[300%] animate-[scan_3s_linear_infinite]"></div>
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <div className={`inline-flex items-center gap-4 px-6 py-4 rounded-2xl bg-surface-container-highest/60 border border-outline-variant/20 backdrop-blur-lg shadow-xl ${alertColor}`}>
              <span className="material-symbols-outlined text-3xl animate-bounce" style={{ fontVariationSettings: "'FILL' 1" }}>{alertIcon}</span>
              <p className="font-black text-sm md:text-base tracking-wide text-left">{alertMessage}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 pt-4">
            <div className="rounded-2xl bg-surface-container-highest/50 border border-outline-variant/20 px-5 py-4 text-left">
              <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold">Ingresos del mes</p>
              <p className="text-2xl font-black mt-2 text-primary">+${formatClp(actualIncome)}</p>
            </div>
            <div className="rounded-2xl bg-surface-container-highest/50 border border-outline-variant/20 px-5 py-4 text-left">
              <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold">Disponible</p>
              <p className="text-2xl font-black mt-2">{remaining >= 0 ? '$' : '-$'}{formatClp(Math.abs(remaining))}</p>
            </div>
            <div className="rounded-2xl bg-surface-container-highest/50 border border-outline-variant/20 px-5 py-4 text-left">
              <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold">Movimientos</p>
              <p className="text-2xl font-black mt-2">{recentTransactions.length}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-outline-variant/20 shadow-xl">
        <div className="flex justify-between items-center mb-8 px-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <span className="material-symbols-outlined text-[24px]">list_alt</span>
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight text-on-surface">Desglose de movimientos</h3>
              <p className="text-[10px] uppercase font-bold text-on-surface/40 tracking-[0.2em] mt-1">Actividad reciente</p>
            </div>
          </div>
          <Link
            href="/history"
            className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] bg-primary/10 px-5 py-3 rounded-full hover:bg-primary/20 transition-colors border border-primary/20 active:scale-95 shadow-[0_0_15px_rgba(170,255,220,0.1)]"
          >
            Ver historial
          </Link>
        </div>

        <div className="space-y-3">
          {recentTransactions.length > 0 ? recentTransactions.map((tx: TransactionRecord) => (
            <div key={tx.id} className="flex items-center justify-between p-5 rounded-2xl hover:bg-surface-bright/50 border border-transparent hover:border-outline-variant/30 transition-all group backdrop-blur-md">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-inner ${tx.type === 'INCOME' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-surface-container-highest/80 text-on-surface/60 border border-outline-variant/30 group-hover:bg-primary/10 group-hover:border-primary/30 group-hover:text-primary/90'}`}>
                  <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {tx.type === 'INCOME' ? 'add_circle' : 'receipt_long'}
                  </span>
                </div>
                <div>
                  <p className="font-extrabold text-[17px] text-on-surface tracking-tight group-hover:text-primary transition-colors">{tx.description || 'Movimiento'}</p>
                  <p className="text-[11px] text-on-surface/40 font-mono uppercase tracking-widest mt-1">
                    {new Date(tx.date).toLocaleDateString('es-CL')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-black text-xl tracking-tighter ${tx.type === 'INCOME' ? 'text-primary drop-shadow-[0_0_12px_rgba(170,255,220,0.4)]' : 'text-on-surface'}`}>
                  {tx.type === 'EXPENSE' ? '-' : '+'}${formatClp(tx.amount)}
                </p>
                <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-on-surface/30 mt-1">CLP</p>
              </div>
            </div>
          )) : (
            <div className="py-14 flex flex-col items-center justify-center opacity-60 bg-surface-container-highest/30 rounded-3xl border border-dashed border-outline-variant/30">
              <span className="material-symbols-outlined text-[64px] mb-4 text-on-surface/30">inbox</span>
              <p className="text-sm font-bold tracking-widest uppercase text-on-surface/50">Aun no hay gastos registrados.</p>
              <p className="text-xs text-on-surface/40 mt-2 max-w-sm text-center">Tus registros manuales o boletas procesadas por OCR apareceran aqui.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
