'use client';

import { useState } from 'react';
import { CreditCard, Check, Pencil, X } from 'lucide-react';
import { formatClp } from '@/lib/money';

export default function CreditBudgetEditor({ initialBudget }: { initialBudget: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [budget, setBudget] = useState(initialBudget);
  const [inputValue, setInputValue] = useState(String(initialBudget));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const parsed = Number(inputValue);
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    setIsSaving(true);
    try {
      const resp = await fetch('/api/user-budget', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditBudget: parsed }),
      });
      if (resp.ok) {
        setBudget(parsed);
        setIsEditing(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="rounded-[1.5rem] bg-white/[0.03] border border-primary/20 backdrop-blur-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
            <CreditCard className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Cupo Tarjeta Crédito</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">$</span>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-lg font-bold text-white outline-none focus:border-primary/40 transition-colors"
            autoFocus
          />
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-black font-bold text-sm py-2.5 rounded-xl disabled:opacity-50 transition-all"
          >
            <Check className="w-4 h-4" />
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            onClick={() => { setIsEditing(false); setInputValue(String(budget)); }}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-on-surface-variant hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Cupo Tarjeta Crédito</span>
          </div>
          <p className="text-xl font-bold text-primary">${formatClp(budget)}</p>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="p-3 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-primary transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
