import ExportButton from '@/components/ExportButton';
import { Inbox, ListFilter } from 'lucide-react';
import TransactionsEditorList from '@/components/TransactionsEditorList';
import { requireAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { TransactionRecord } from '@/lib/transaction-types';

export const dynamic = 'force-dynamic';

export default async function History() {
  const user = await requireAuthUser();
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
    },
    include: {
      category: true,
    },
    orderBy: { date: 'desc' },
  });
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
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
              <TransactionsEditorList
                categories={categories}
                transactions={txs}
              />
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
