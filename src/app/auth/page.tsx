'use client';

import { FormEvent, Suspense, startTransition, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Mode = 'login' | 'signup';

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState(searchParams.get('message') ?? '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setMessage('');

    const supabase = createClient();

    if (mode === 'login') {
      startTransition(async () => {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          setIsSubmitting(false);
          return;
        }

        router.push(nextPath);
        router.refresh();
        setIsSubmitting(false);
      });

      return;
    }

    startTransition(async () => {
      const redirectTo =
        typeof window === 'undefined'
          ? undefined
          : `${window.location.origin}/auth/confirm`;

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
          },
          emailRedirectTo: redirectTo,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsSubmitting(false);
        return;
      }

      setMessage('Revisa tu correo para confirmar la cuenta y luego inicia sesion.');
      setMode('login');
      setPassword('');
      setIsSubmitting(false);
    });
  };

  return (
    <section className="glass-card w-full max-w-md rounded-[2rem] border border-outline-variant/20 p-8 shadow-2xl">
      <div className="space-y-3 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">Gastos Personales</p>
        <h1 className="text-4xl font-black tracking-tight">{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</h1>
        <p className="text-sm text-on-surface/60">
          {mode === 'login'
            ? 'Ingresa para usar tu panel privado de gastos.'
            : 'Crea tu acceso personal para dejar la app publicada y privada.'}
        </p>
      </div>

      <div className="mt-8 flex rounded-full bg-surface-container-highest/60 p-1">
        <button
          onClick={() => {
            setMode('login');
            setError('');
            setMessage('');
          }}
          className={`flex-1 rounded-full px-4 py-3 text-sm font-bold transition-colors ${mode === 'login' ? 'bg-primary text-on-primary' : 'text-on-surface/60'}`}
          type="button"
        >
          Iniciar sesion
        </button>
        <button
          onClick={() => {
            setMode('signup');
            setError('');
            setMessage('');
          }}
          className={`flex-1 rounded-full px-4 py-3 text-sm font-bold transition-colors ${mode === 'signup' ? 'bg-primary text-on-primary' : 'text-on-surface/60'}`}
          type="button"
        >
          Registrarse
        </button>
      </div>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        {mode === 'signup' ? (
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-highest/60 px-5 py-4 outline-none transition-colors focus:border-primary/40"
            placeholder="Nombre"
            type="text"
          />
        ) : null}

        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-highest/60 px-5 py-4 outline-none transition-colors focus:border-primary/40"
          placeholder="Correo"
          type="email"
          required
        />

        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-highest/60 px-5 py-4 outline-none transition-colors focus:border-primary/40"
          placeholder="Contrasena"
          type="password"
          minLength={6}
          required
        />

        {message ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        ) : null}

        <button
          className="w-full rounded-full bg-primary px-5 py-4 text-base font-black text-on-primary transition-transform active:scale-95 disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? 'Procesando...'
            : mode === 'login'
              ? 'Entrar a mi panel'
              : 'Crear cuenta'}
        </button>
      </form>
    </section>
  );
}

function AuthFormFallback() {
  return (
    <section className="glass-card w-full max-w-md rounded-[2rem] border border-outline-variant/20 p-8 shadow-2xl">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 rounded bg-surface-container-highest/70"></div>
        <div className="h-10 w-48 rounded bg-surface-container-highest/70"></div>
        <div className="h-12 w-full rounded-full bg-surface-container-highest/70"></div>
        <div className="h-14 w-full rounded-2xl bg-surface-container-highest/70"></div>
        <div className="h-14 w-full rounded-2xl bg-surface-container-highest/70"></div>
        <div className="h-14 w-full rounded-full bg-surface-container-highest/70"></div>
      </div>
    </section>
  );
}

export default function AuthPage() {
  return (
    <main className="min-h-screen px-6 py-10 flex items-center justify-center">
      <Suspense fallback={<AuthFormFallback />}>
        <AuthForm />
      </Suspense>
    </main>
  );
}
