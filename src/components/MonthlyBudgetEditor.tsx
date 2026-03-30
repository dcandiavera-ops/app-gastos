'use client';

import { useState, useTransition } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { formatClp } from '@/lib/money';

type MonthlyBudgetEditorProps = {
  initialValue: number;
};

export default function MonthlyBudgetEditor({ initialValue }: MonthlyBudgetEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(String(Math.round(initialValue)));
  const [budgetValue, setBudgetValue] = useState(initialValue);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleCancel = () => {
    setDraftValue(String(Math.round(budgetValue)));
    setError('');
    setIsEditing(false);
  };

  const handleSave = () => {
    const parsedBudget = Number(draftValue.replace(/[^\d.]/g, ''));

    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      setError('Ingresa un presupuesto valido mayor a cero.');
      return;
    }

    setError('');

    startTransition(async () => {
      const response = await fetch('/api/user-budget', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ monthlyBudget: parsedBudget }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || 'No se pudo actualizar el presupuesto.');
        return;
      }

      setBudgetValue(payload.monthlyBudget);
      setDraftValue(String(Math.round(payload.monthlyBudget)));
      setIsEditing(false);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {isEditing ? (
          <>
            <div className="flex items-center rounded-full border border-primary/30 bg-surface-container-highest/60 px-4 py-3 shadow-inner">
              <span className="mr-2 text-lg font-black text-primary">$</span>
              <input
                value={draftValue}
                onChange={(event) => setDraftValue(event.target.value)}
                className="w-36 bg-transparent text-center text-lg font-black outline-none"
                inputMode="numeric"
                placeholder="1000000"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary transition-colors hover:bg-primary/25 disabled:opacity-60"
                type="button"
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container-highest/60 text-on-surface/70 transition-colors hover:bg-surface-bright disabled:opacity-60"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-on-surface/50 bg-surface-container-highest/30 px-4 py-1 rounded-full border border-outline-variant/10">
              de ${formatClp(budgetValue)} presupuestado este mes
            </p>
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary transition-colors hover:bg-primary/20"
              type="button"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar presupuesto
            </button>
          </>
        )}
      </div>

      {error ? <p className="text-center text-sm text-error">{error}</p> : null}
    </div>
  );
}
