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
    <main className="pt-24 px-4 max-w-md mx-auto pb-32 space-y-6">
      <div className="flex justify-between items-center mt-2 px-2">
        <h1 className="text-3xl fintech-hero-number tracking-tight">Historial</h1>
        <div className="flex items-center gap-3">
          <ExportButton transactions={transactions as TransactionRecord[]} />
          <button className="fintech-circle-btn !w-10 !h-10">
            <ListFilter className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {Object.keys(groupedTransactions).length > 0 ? Object.entries(groupedTransactions).map(([date, txs]) => (
          <div key={date}>
            <div className="flex items-center gap-4 mb-3 px-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">{date}</h2>
            </div>
            <TransactionsEditorList
              categories={categories}
              transactions={txs}
            />
          </div>
        )) : (
          <div className="fintech-card p-10 mt-10 text-center opacity-60">
            <Inbox className="mx-auto mb-4 h-12 w-12 text-on-surface-variant" />
            <h3 className="text-xl font-bold mb-2 font-serif text-on-surface">Sin movimientos</h3>
            <p className="text-on-surface-variant text-sm max-w-xs mx-auto">Tus transacciones registradas apareceran aqui para control financiero personal.</p>
          </div>
        )}
      </div>
    </main>
  );
}
