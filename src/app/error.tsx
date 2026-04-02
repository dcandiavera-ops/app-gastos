'use client';

import { useEffect } from 'react';
import { RefreshCcw, AlertCircle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global app error:', error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <section className="supabase-card w-full max-w-lg p-8 text-center space-y-5">
        <div className="mx-auto w-20 h-20 bg-error/10 border border-error/20 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-error" />
        </div>
        <h2 className="text-3xl font-black tracking-tight text-on-surface">Algo salió mal</h2>
        <p className="text-on-surface/60 font-medium px-4">
          Ocurrió un error inesperado al cargar esta parte de la aplicación.
        </p>
        <button
          onClick={reset}
          className="supabase-btn supabase-btn-primary mx-auto"
          type="button"
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          Reintentar
        </button>
        {error.digest ? (
          <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface/35">Error {error.digest}</p>
        ) : null}
      </section>
    </main>
  );
}
