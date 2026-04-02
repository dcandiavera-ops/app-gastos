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
          <div className="flex items-center gap-2 bg-surface-variant/30 p-2 rounded-lg border border-outline/50">
            <div className="relative flex items-center">
              <span className="absolute left-3 text-sm font-semibold text-on-surface-variant">$</span>
              <input
                value={draftValue}
                onChange={(event) => setDraftValue(event.target.value)}
                className="supabase-input pl-7 w-32 text-left text-sm font-semibold h-9"
                inputMode="numeric"
                placeholder="1000000"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="supabase-btn supabase-btn-primary h-9 w-9 p-0"
                type="button"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="supabase-btn h-9 w-9 p-0"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <p className="text-sm font-medium text-on-surface-variant">
              de ${formatClp(budgetValue)} presupuestado este mes
            </p>
            <button
              onClick={() => setIsEditing(true)}
              className="supabase-btn text-xs gap-1.5 py-1.5 px-3"
              type="button"
            >
              <Pencil className="h-3 w-3" />
              Editar presupuesto
            </button>
          </div>
        )}
      </div>

      {error ? <p className="text-center text-sm text-error">{error}</p> : null}
    </div>
  );
}
