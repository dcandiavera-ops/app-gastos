'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ManualEntry() {
  const router = useRouter();
  const [amount, setAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [isSaving, setIsSaving] = useState(false);

  const handleNumpadClick = (value: string) => {
    if (value === 'backspace') {
      setAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }

    if (value === '.') {
      if (!amount.includes('.')) {
        setAmount((prev) => prev + '.');
      }
      return;
    }

    setAmount((prev) => (prev === '0' ? value : prev + value));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description: description || (type === 'EXPENSE' ? 'Gasto manual' : 'Ingreso manual'),
          type,
          date: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        router.push('/history');
        router.refresh();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const numpad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'];

  return (
    <main className="pt-24 px-6 max-w-lg mx-auto pb-32">
      <section className="mb-10 text-center">
        <label className="block text-on-surface/60 font-medium text-sm tracking-widest uppercase mb-2">Monto</label>
        <div className="flex items-baseline justify-center gap-2 overflow-hidden px-4">
          <span className="text-3xl font-bold text-primary">$</span>
          <span className="text-7xl font-extrabold tracking-tighter text-on-surface truncate">{amount}</span>
          <span className="text-2xl font-bold text-on-surface/50">CLP</span>
        </div>
      </section>

      <div className="space-y-6 mb-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-primary/60 text-xl">storefront</span>
          </div>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full bg-surface-container-highest border-none rounded-full py-5 pl-14 pr-6 text-on-surface placeholder:text-on-surface/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-lg font-medium"
            placeholder="Descripcion o comercio"
            type="text"
          />
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setType('EXPENSE')}
              className={`flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full text-sm transition-all ${type === 'EXPENSE' ? 'bg-primary text-surface font-bold active-glow' : 'bg-surface-container-high text-on-surface/60 font-medium ghost-border'}`}
            >
              <span className="material-symbols-outlined text-lg">payments</span>
              Gasto
            </button>
            <button
              onClick={() => setType('INCOME')}
              className={`flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full text-sm transition-all ${type === 'INCOME' ? 'bg-primary text-surface font-bold active-glow' : 'bg-surface-container-high text-on-surface/60 font-medium ghost-border'}`}
            >
              <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
              Ingreso
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-10">
        {numpad.map((buttonValue) => (
          <button
            key={buttonValue}
            onClick={() => handleNumpadClick(buttonValue)}
            className={`glass-key ghost-border text-2xl font-bold py-6 rounded-2xl active:scale-95 transition-all ${buttonValue === 'backspace' ? 'text-primary hover:bg-primary/10' : 'text-on-surface hover:bg-primary/10'}`}
          >
            {buttonValue === 'backspace' ? <span className="material-symbols-outlined">backspace</span> : buttonValue}
          </button>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving || parseFloat(amount) === 0}
        className="w-full bg-primary text-surface font-extrabold text-lg py-5 rounded-full shadow-[0_12px_24px_rgba(170,255,220,0.2)] active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-3"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          {isSaving ? 'hourglass_empty' : 'save'}
        </span>
        {isSaving ? 'Guardando...' : 'Guardar registro'}
      </button>
    </main>
  );
}
