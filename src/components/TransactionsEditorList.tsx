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
            className="supabase-card p-4 transition-all"
          >
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={draft.amount}
                    onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
                    className="supabase-input w-full"
                    inputMode="decimal"
                    placeholder="Monto"
                  />
                  <input
                    value={draft.date}
                    onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                    className="supabase-input w-full"
                    type="date"
                  />
                </div>
                <input
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  className="supabase-input w-full"
                  placeholder="Descripcion"
                />
                
                <div className="flex flex-wrap gap-2">
                  {/* Tipo de movimiento */}
                  <button
                    onClick={() => setDraft({ ...draft, type: 'EXPENSE' })}
                    className={`supabase-btn text-xs px-3 py-1.5 rounded ${draft.type === 'EXPENSE' ? 'supabase-btn-primary' : ''}`}
                    type="button"
                  >
                    Gasto
                  </button>
                  <button
                    onClick={() => setDraft({ ...draft, type: 'INCOME', categoryId: null })}
                    className={`supabase-btn text-xs px-3 py-1.5 rounded ${draft.type === 'INCOME' ? 'supabase-btn-primary' : ''}`}
                    type="button"
                  >
                    Ingreso
                  </button>
                </div>

                {draft.type === 'EXPENSE' ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sortedCategories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setDraft({ ...draft, categoryId: category.id })}
                        className={`supabase-btn text-xs px-2.5 py-1.5 rounded-full border flex items-center gap-1.5 ${
                          draft.categoryId === category.id
                            ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary'
                            : ''
                        }`}
                        type="button"
                      >
                        <span
                          className="h-2 w-2 rounded-full border border-white/10"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                {error ? <p className="text-sm text-error">{error}</p> : null}
                
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={cancelEdit}
                    className="supabase-btn flex-1"
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
                    className="supabase-btn supabase-btn-primary flex-1"
                    disabled={isSaving}
                    type="button"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Guardando...' : 'Guardar'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-md ${tx.type === 'INCOME' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface-variant text-on-surface-variant border border-outline'}`}>
                    {tx.type === 'INCOME' ? <CirclePlus className="h-5 w-5" /> : <ReceiptText className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{tx.description || 'Movimiento'}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {new Date(tx.date).toLocaleDateString('es-CL')}
                      {tx.category ? ` • ${tx.category.name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-base font-bold ${tx.type === 'INCOME' ? 'text-primary' : 'text-on-surface'}`}>
                      {tx.type === 'EXPENSE' ? '-' : '+'}${formatClp(tx.amount)}
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(tx)}
                    className="supabase-btn h-8 w-8 p-0 rounded-md"
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
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
