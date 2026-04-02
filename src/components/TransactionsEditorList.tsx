'use client';

import { useMemo, useState } from 'react';
import { CirclePlus, Pencil, ReceiptText, Save, X, ArrowDownLeft, ArrowUpRight, Wallet, HandCoins, Trash2 } from 'lucide-react';
import type { TransactionRecord } from '@/lib/transaction-types';
import { formatClp } from '@/lib/money';
import { getCategoryIcon } from '@/lib/category-icons';

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
  paymentMethod: 'CASH' | 'CREDIT';
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
    paymentMethod: (transaction.paymentMethod as 'CASH' | 'CREDIT') || 'CASH',
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
          paymentMethod: draft.type === 'INCOME' ? 'CASH' : draft.paymentMethod,
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este movimiento?')) return;
    try {
      const resp = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (resp.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
      } else {
        const data = await resp.json();
        setError(data.error || 'Error al eliminar');
      }
    } catch (err) {
      console.error(err);
      setError('Error de red al eliminar');
    }
  };

  if (items.length === 0) {
    return (
      <div className="fintech-card p-8 flex flex-col items-center justify-center text-center opacity-70">
        <p className="text-sm text-on-surface-variant font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((tx) => {
        const isEditing = editingId === tx.id && draft;

        return (
          <div
            key={tx.id}
            className="habit-pill p-2 pl-4 transition-all"
          >
            {isEditing ? (
              <div className="space-y-4 p-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={draft.amount}
                    onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
                    className="supabase-input w-full bg-white/5 border-white/10"
                    inputMode="decimal"
                    placeholder="Monto"
                  />
                  <input
                    value={draft.date}
                    onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                    className="supabase-input w-full bg-white/5 border-white/10"
                    type="date"
                  />
                </div>
                <input
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  className="supabase-input w-full bg-white/5 border-white/10"
                  placeholder="Descripcion"
                />
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setDraft({ ...draft, type: 'EXPENSE' })}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${draft.type === 'EXPENSE' ? 'bg-primary text-black' : 'bg-white/5 text-on-surface-variant'}`}
                    type="button"
                  >
                    Gasto
                  </button>
                  <button
                    onClick={() => setDraft({ ...draft, type: 'INCOME', categoryId: null })}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${draft.type === 'INCOME' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-on-surface-variant'}`}
                    type="button"
                  >
                    Ingreso
                  </button>
                </div>

                {draft.type === 'EXPENSE' ? (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-bold text-on-surface-variant/70 tracking-wider">Cuenta</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDraft({ ...draft, paymentMethod: 'CASH' })}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${draft.paymentMethod === 'CASH' ? 'bg-primary/10 border-primary text-primary' : 'bg-white/5 border-white/5 text-on-surface-variant'}`}
                        type="button"
                      >
                        <Wallet className="h-3 w-3" />
                        Débito
                      </button>
                      <button
                        onClick={() => setDraft({ ...draft, paymentMethod: 'CREDIT' })}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${draft.paymentMethod === 'CREDIT' ? 'bg-primary/10 border-primary text-primary' : 'bg-white/5 border-white/5 text-on-surface-variant'}`}
                        type="button"
                      >
                        <HandCoins className="h-3 w-3" />
                        Crédito
                      </button>
                    </div>
                  </div>
                ) : null}

                {draft.type === 'EXPENSE' ? (
                  <div className="space-y-2 mt-2">
                    <p className="text-[10px] uppercase font-bold text-on-surface-variant/70 tracking-wider">Categoria</p>
                    <div className="flex flex-wrap gap-2">
                    {sortedCategories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setDraft({ ...draft, categoryId: category.id })}
                        className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1.5 font-medium transition-colors ${
                          draft.categoryId === category.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-white/10 text-on-surface-variant'
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
                </div>
              ) : null}
              {error ? <p className="text-sm text-error">{error}</p> : null}
                
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={cancelEdit}
                    className="flex-1 px-4 py-2 rounded-full border border-white/10 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
                    disabled={isSaving}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </button>
                  <button
                    onClick={saveEdit}
                    className="neon-btn flex-1 py-2"
                    disabled={isSaving}
                    type="button"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 overflow-hidden">
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                  {(() => {
                    const CatIcon = tx.category ? getCategoryIcon(tx.category.name) : (tx.type === 'INCOME' ? ArrowDownLeft : ArrowUpRight);
                    const catColor = tx.category?.color || (tx.type === 'INCOME' ? '#34d399' : '#ffffff');
                    return (
                      <div
                        className="w-10 h-10 rounded-full flex shrink-0 items-center justify-center"
                        style={{ backgroundColor: `${catColor}15`, color: catColor }}
                      >
                        <CatIcon className="h-[18px] w-[18px]" />
                      </div>
                    );
                  })()}
                  <div className="flex flex-col justify-center truncate">
                    <p className="font-bold text-[14px] leading-tight text-white truncate">{tx.description || 'Movimiento'}</p>
                    <p className="text-[11px] text-on-surface-variant font-medium mt-0.5 truncate">
                      {new Date(tx.date).toLocaleDateString('es-CL')}
                      {tx.category ? ` · ${tx.category.name}` : ''}
                      {tx.type === 'EXPENSE' && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] uppercase font-bold text-primary/70">
                          {tx.paymentMethod === 'CREDIT' ? 'Crédito' : 'Débito'}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                  <div className="flex items-center border border-white/20 rounded-full h-11 px-4 min-w-[70px] justify-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                    <p className={`font-bold text-[14px] whitespace-nowrap ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-white'}`}>
                      {tx.type === 'EXPENSE' ? '-' : '+'}${formatClp(tx.amount)}
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(tx)}
                    className="p-3 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
                    type="button"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="p-3 rounded-full hover:bg-white/10 text-red-400 hover:text-red-500 transition-colors"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
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
