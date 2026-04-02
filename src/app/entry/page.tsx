'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Delete, HandCoins, LoaderCircle, Save, Store, Wallet } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  color: string;
};

export default function ManualEntry() {
  const router = useRouter();
  const [amount, setAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CREDIT'>('CASH');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (type === 'INCOME') {
      setPaymentMethod('CASH');
    }
  }, [type]);

  useEffect(() => {
    let ignore = false;

    const loadCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as Category[];
        if (ignore) {
          return;
        }

        setCategories(payload);

        const fallbackCategory = payload.find((category) => category.name.toLowerCase() === 'imprevistos');
        if (fallbackCategory) {
          setSelectedCategoryId((currentValue) => currentValue ?? fallbackCategory.id);
        }
      } catch (loadError) {
        console.error(loadError);
      }
    };

    loadCategories();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (type === 'INCOME') {
      setSelectedCategoryId(null);
      return;
    }

    if (selectedCategoryId) {
      return;
    }

    const fallbackCategory = categories.find((category) => category.name.toLowerCase() === 'imprevistos');
    if (fallbackCategory) {
      setSelectedCategoryId(fallbackCategory.id);
    }
  }, [categories, selectedCategoryId, type]);

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
    setError('');

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description: description || (type === 'EXPENSE' ? 'Gasto manual' : 'Ingreso manual'),
          type,
          paymentMethod,
          date: new Date().toISOString(),
          categoryId: type === 'EXPENSE' ? selectedCategoryId : null,
        }),
      });

      if (response.ok) {
        router.push('/history');
        router.refresh();
        return;
      }

      const payload = await response.json();
      setError(payload.error || 'No se pudo guardar el movimiento.');
    } catch (error) {
      console.error(error);
      setError('No se pudo guardar el movimiento.');
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
            <Store className="h-5 w-5 text-primary/60" />
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
              <HandCoins className="h-[18px] w-[18px]" />
              Gasto
            </button>
            <button
              onClick={() => setType('INCOME')}
              className={`flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full text-sm transition-all ${type === 'INCOME' ? 'bg-primary text-surface font-bold active-glow' : 'bg-surface-container-high text-on-surface/60 font-medium ghost-border'}`}
            >
              <Wallet className="h-[18px] w-[18px]" />
              Ingreso
            </button>
          </div>

          {type === 'EXPENSE' && (
            <div className="space-y-3 pt-2">
              <p className="text-[10px] text-center uppercase tracking-[0.2em] text-on-surface/40 font-bold">
                ¿Con qué pagaste?
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setPaymentMethod('CASH')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm transition-all ${paymentMethod === 'CASH' ? 'bg-white/10 text-primary border border-primary/30 font-bold' : 'bg-surface-container-high text-on-surface/50 border border-transparent font-medium'}`}
                  type="button"
                >
                  <Wallet className="h-4 w-4" />
                  Débito
                </button>
                <button
                  onClick={() => setPaymentMethod('CREDIT')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm transition-all ${paymentMethod === 'CREDIT' ? 'bg-white/10 text-primary border border-primary/30 font-bold' : 'bg-surface-container-high text-on-surface/50 border border-transparent font-medium'}`}
                  type="button"
                >
                  <HandCoins className="h-4 w-4" />
                  Crédito
                </button>
              </div>
            </div>
          )}

          {type === 'EXPENSE' ? (
            <div className="space-y-3">
              <p className="text-[10px] text-center uppercase tracking-[0.2em] text-on-surface/40 font-bold">
                Categoria del gasto
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {categories.map((category) => {
                  const isSelected = selectedCategoryId === category.id;

                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-primary/40 bg-primary/15 text-primary'
                          : 'border-outline-variant/20 bg-surface-container-high text-on-surface/70'
                      }`}
                      type="button"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-white/10"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-10">
        {numpad.map((buttonValue) => (
          <button
            key={buttonValue}
            onClick={() => handleNumpadClick(buttonValue)}
            className={`glass-key ghost-border text-2xl font-bold py-6 rounded-2xl active:scale-95 transition-all ${buttonValue === 'backspace' ? 'text-primary hover:bg-primary/10' : 'text-on-surface hover:bg-primary/10'}`}
          >
            {buttonValue === 'backspace' ? <Delete className="mx-auto h-6 w-6" /> : buttonValue}
          </button>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving || parseFloat(amount) === 0}
        className="w-full bg-primary text-surface font-extrabold text-lg py-5 rounded-full shadow-[0_12px_24px_rgba(170,255,220,0.2)] active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-3"
      >
        {isSaving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        {isSaving ? 'Guardando...' : 'Guardar registro'}
      </button>

      {error ? <p className="mt-4 text-center text-sm text-error">{error}</p> : null}
    </main>
  );
}
