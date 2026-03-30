'use client';

import { Download } from 'lucide-react';
import type { TransactionRecord } from '@/lib/transaction-types';

export default function ExportButton({ transactions }: { transactions: TransactionRecord[] }) {
  const exportToCSV = () => {
    const headers = ['ID,Fecha,Descripcion,Monto,Tipo'];
    const rows = transactions.map((tx) => {
      const date = new Date(tx.date).toLocaleDateString('es-CL');
      const desc = `"${(tx.description || '').replace(/"/g, '""')}"`;
      const type = tx.type === 'INCOME' ? 'Ingreso' : 'Gasto';
      return `${tx.id},${date},${desc},${tx.amount},${type}`;
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'historial_completo_gastos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={exportToCSV}
      className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 hover:bg-primary/20 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors border border-primary/30 text-primary active:scale-95 shadow-[0_0_15px_rgba(170,255,220,0.15)]"
    >
      <Download className="h-[18px] w-[18px]" />
      Excel CSV
    </button>
  );
}
