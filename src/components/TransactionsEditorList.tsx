'use client';

import { useMemo, useState } from 'react';
import { CirclePlus, Pencil, ReceiptText, Save, X } from 'lucide-react';
import type { TransactionRecord } from '@/lib/transaction-types';
import { formatClp } from '@/lib/money';

type CategoryOption = {
  id: string;
  name: string;
  color: string;
};

type TransactionsEditorListProps = {
  transactions: TransactionRecord[];
  categories: CategoryOption[];
  emptyMessage?: string;
};

type EditableTransaction = {
  id: string;
  amount: string;
  date: string;
  description: string;
  type: 'EXPENSE' | 'INCOME';
  categoryId: string | null;
};

function toInputDate(value: Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDraft(transaction: TransactionRecord): EditableTransaction {
  return {
    id: transaction.id,
    amount: String(Math.round(transaction.amount)),
    date: toInputDate(transaction.date),
    description: transaction.description,
    type: transaction.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
    categoryId: transaction.categoryId ?? null,
  };
}

export default function TransactionsEditorList({
  transactions,
  categories,
  emptyMessage = 'No hay movimientos para editar.',
}: TransactionsEditorListProps) {
  const [items, setItems] = useState(transactions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditableTransaction | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const sortedCategories = useMemo(
    () => categories.slice().sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [categories],
  );

  const startEdit = (transaction: TransactionRecord) => {
    setDraft(buildDraft(transaction));
    setEditingId(transaction.id);
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
    setError('');
  };

  const saveEdit = async () => {
    if (!draft) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/transactions/${draft.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Number(draft.amount),
          date: draft.date,
          description: draft.description,
          type: draft.type,
          categoryId: draft.type === 'EXPENSE' ? draft.categoryId : null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || 'No se pudo actualizar el movimiento.');
        return;
      }

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === draft.id
            ? {
                ...payload,
                date: new Date(payload.date),
                createdAt: new Date(payload.createdAt),
                updatedAt: new Date(payload.updatedAt),
              }
            : item,
        ),
      );
      cancelEdit();
    } catch (updateError) {
      console.error(updateError);
      setError('No se pudo actualizar el movimiento.');
    } finally {
      setIsSaving(false);
    }
  };

  if (items.length === 0) {
    return <p className="text-sm text-on-surface/50">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((tx) => {
        const isEditing = editingId === tx.id && draft;

        return (
          <div
            key={tx.id}
            className="glass-card rounded-[1.5rem] border border-outline-variant/20 p-5 transition-all"
          >
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={draft.amount}
                    onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
                    className="rounded-2xl border border-outline-variant/20 bg-surface-container-highest/60 px-4 py-3 outline-none"
                    inputMode="decimal"
                    placeholder="Monto"
                  />
                  <input
                    value={draft.date}
                    onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                    className="rounded-2xl border border-outline-variant/20 bg-surface-container-highest/60 px-4 py-3 outline-none"
                    type="date"
                  />
                </div>
                <input
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-highest/60 px-4 py-3 outline-none"
                  placeholder="Descripcion"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setDraft({ ...draft, type: 'EXPENSE' })}
                    className={`rounded-full px-4 py-2 text-sm font-bold ${draft.type === 'EXPENSE' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest/60 text-on-surface/70'}`}
                    type="button"
                  >
                    Gasto
                  </button>
                  <button
                    onClick={() => setDraft({ ...draft, type: 'INCOME', categoryId: null })}
                    className={`rounded-full px-4 py-2 text-sm font-bold ${draft.type === 'INCOME' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest/60 text-on-surface/70'}`}
                    type="button"
                  >
                    Ingreso
                  </button>
                </div>
                {draft.type === 'EXPENSE' ? (
                  <div className="flex flex-wrap gap-2">
                    {sortedCategories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setDraft({ ...draft, categoryId: category.id })}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold ${
                          draft.categoryId === category.id
                            ? 'border-primary/40 bg-primary/15 text-primary'
                            : 'border-outline-variant/20 bg-surface-container-highest/60 text-on-surface/70'
                        }`}
                        type="button"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-white/10"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                {error ? <p className="text-sm text-error">{error}</p> : null}
                <div className="flex gap-3">
                  <button
                    onClick={cancelEdit}
                    className="flex-1 rounded-full border border-outline-variant/20 bg-surface-container-highest/60 px-4 py-3 text-sm font-bold"
                    disabled={isSaving}
                    type="button"
                  >
                    <span className="inline-flex items-center gap-2">
                      <X className="h-4 w-4" />
                      Cancelar
                    </span>
                  </button>
                  <button
                    onClick={saveEdit}
                    className="flex-1 rounded-full bg-primary px-4 py-3 text-sm font-bold text-on-primary"
                    disabled={isSaving}
                    type="button"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Guardando...' : 'Guardar cambios'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-[1.2rem] ${tx.type === 'INCOME' ? 'bg-primary/20 text-primary' : 'bg-surface-container-highest text-on-surface/60'}`}>
                    {tx.type === 'INCOME' ? <CirclePlus className="h-7 w-7" /> : <ReceiptText className="h-7 w-7" />}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{tx.description || 'Movimiento'}</p>
                    <p className="text-xs text-on-surface/50">
                      {new Date(tx.date).toLocaleDateString('es-CL')}
                      {tx.category ? ` • ${tx.category.name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-xl font-extrabold ${tx.type === 'INCOME' ? 'text-primary' : 'text-on-surface'}`}>
                      {tx.type === 'EXPENSE' ? '-' : '+'}${formatClp(tx.amount)}
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(tx)}
                    className="rounded-full border border-outline-variant/20 bg-surface-container-highest/60 p-3 text-on-surface/70"
                    type="button"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
