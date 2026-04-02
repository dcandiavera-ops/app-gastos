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
    <section className="supabase-card w-full max-w-sm p-8 mx-auto mt-12 mb-auto">
      <div className="space-y-1 mb-6 text-center">
        <p className="text-[10px] uppercase tracking-wider text-primary font-bold">Gastos Personales</p>
        <h1 className="text-2xl font-bold tracking-tight">{mode === 'login' ? 'Bienvenido' : 'Crear cuenta'}</h1>
      </div>

      <div className="flex bg-surface-variant/50 p-1 rounded-md mb-6">
        <button
          onClick={() => {
            setMode('login');
            setError('');
            setMessage('');
          }}
          className={`flex-1 rounded px-3 py-1.5 text-xs font-semibold transition-colors ${mode === 'login' ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          type="button"
        >
          Iniciar sesión
        </button>
        <button
          onClick={() => {
            setMode('signup');
            setError('');
            setMessage('');
          }}
          className={`flex-1 rounded px-3 py-1.5 text-xs font-semibold transition-colors ${mode === 'signup' ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          type="button"
        >
          Registrarse
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === 'signup' ? (
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Nombre</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="supabase-input w-full"
              type="text"
            />
          </div>
        ) : null}

        <div>
           <label className="block text-xs font-medium text-on-surface-variant mb-1">Correo Electrónico</label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="supabase-input w-full"
            type="email"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Contraseña</label>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="supabase-input w-full"
            type="password"
            minLength={6}
            required
          />
        </div>

        {message ? (
          <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
            {error}
          </div>
        ) : null}

        <button
          className="supabase-btn supabase-btn-primary w-full py-2.5 mt-2"
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
    <section className="supabase-card w-full max-w-sm p-8 mx-auto mt-12 mb-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 rounded bg-surface-variant mx-auto"></div>
        <div className="h-8 w-48 rounded bg-surface-variant mx-auto"></div>
        <div className="h-10 w-full rounded-md bg-surface-variant mt-6"></div>
        <div className="h-10 w-full rounded-md bg-surface-variant mt-4"></div>
        <div className="h-10 w-full rounded-md bg-surface-variant"></div>
        <div className="h-10 w-full rounded-md bg-surface-variant mt-6"></div>
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
