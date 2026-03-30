'use client';

import { useEffect } from 'react';
import { RefreshCcw, TriangleAlert } from 'lucide-react';

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
      <section className="glass-card w-full max-w-lg rounded-[2rem] border border-outline-variant/20 p-8 shadow-2xl text-center space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error/10 text-error">
          <TriangleAlert className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight">La pagina fallo al cargar</h1>
          <p className="text-sm text-on-surface/60">
            Ocurrio un error del servidor. Puedes reintentar sin cerrar la app.
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-3 rounded-full bg-primary px-6 py-3 text-sm font-black text-on-primary transition-transform active:scale-95"
          type="button"
        >
          <RefreshCcw className="h-4 w-4" />
          Reintentar
        </button>
        {error.digest ? (
          <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface/35">Error {error.digest}</p>
        ) : null}
      </section>
    </main>
  );
}
