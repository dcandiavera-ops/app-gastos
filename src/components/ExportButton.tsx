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
      className="supabase-btn text-xs gap-2 py-1.5 px-3 rounded-md"
    >
      <Download className="h-[14px] w-[14px]" />
      Excel CSV
    </button>
  );
}
