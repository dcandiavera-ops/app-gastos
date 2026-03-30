import ExportButton from '@/components/ExportButton';
import { CirclePlus, Inbox, ListFilter, ReceiptText } from 'lucide-react';
import { requireAuthUser } from '@/lib/auth';
import { formatClp } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import type { TransactionRecord } from '@/lib/transaction-types';

export const dynamic = 'force-dynamic';

export default async function History() {
  const user = await requireAuthUser();
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
    },
    orderBy: { date: 'desc' },
  });

  const groupedTransactions = transactions.reduce((groups, tx) => {
    const dateStr = new Date(tx.date).toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const capitalizedDateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    if (!groups[capitalizedDateStr]) {
      groups[capitalizedDateStr] = [];
    }
    groups[capitalizedDateStr].push(tx as TransactionRecord);
    return groups;
  }, {} as Record<string, TransactionRecord[]>);

  return (
    <main className="pt-24 px-6 max-w-2xl mx-auto pb-32 space-y-8">
      <div className="flex justify-between items-center mt-2">
        <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface">Historial</h1>
        <div className="flex items-center gap-3">
          <ExportButton transactions={transactions as TransactionRecord[]} />
          <button className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-surface-bright transition-colors text-on-surface/60 border border-outline-variant/20 shadow-sm active:scale-95">
            <ListFilter className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="space-y-10">
        {Object.keys(groupedTransactions).length > 0 ? Object.entries(groupedTransactions).map(([date, txs]) => (
          <div key={date}>
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-primary/80">{date}</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-outline-variant/30 to-transparent"></div>
            </div>
            <div className="space-y-3">
              {txs.map((tx) => (
                <div key={tx.id} className="glass-card p-5 rounded-[1.5rem] flex items-center justify-between group hover:bg-surface-bright/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-colors ${tx.type === 'INCOME' ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(170,255,220,0.1)]' : 'bg-surface-container-highest text-on-surface/60 group-hover:bg-primary/10'}`}>
                      {tx.type === 'INCOME' ? <CirclePlus className="h-7 w-7" /> : <ReceiptText className="h-7 w-7" />}
                    </div>
                    <div>
                      <p className="font-bold text-lg text-on-surface group-hover:text-primary transition-colors">{tx.description || 'Movimiento'}</p>
                      <p className="text-xs text-on-surface/50 font-medium font-mono uppercase">REF: {tx.id.substring(0, 8)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-extrabold text-2xl tracking-tight ${tx.type === 'INCOME' ? 'text-primary drop-shadow-[0_0_10px_rgba(170,255,220,0.3)]' : 'text-on-surface'}`}>
                      {tx.type === 'EXPENSE' ? '-' : '+'}${formatClp(tx.amount)}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface/40 font-bold mt-1">CLP</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )) : (
          <div className="glass-panel p-10 rounded-3xl text-center border border-outline-variant/10 shadow-lg mt-10 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 wealth-orb"></div>
            <Inbox className="relative z-10 mx-auto mb-6 h-16 w-16 text-primary/40" />
            <h3 className="text-2xl font-bold mb-3 relative z-10">Sin movimientos</h3>
            <p className="text-on-surface/60 text-sm max-w-xs mx-auto leading-relaxed relative z-10">Tus transacciones registradas apareceran aqui para control financiero personal.</p>
          </div>
        )}
      </div>
    </main>
  );
}
