'use client';

import { startTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type AuthButtonProps = {
  email?: string;
};

export default function AuthButton({ email }: AuthButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleSignOut = () => {
    setIsPending(true);

    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/auth');
      router.refresh();
      setIsPending(false);
    });
  };

  if (!email) {
    return null;
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isPending}
      className="rounded-full border border-outline-variant/20 bg-surface-container-highest/60 px-4 py-2 text-right transition-colors hover:bg-surface-bright disabled:opacity-60"
    >
      <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface/40">Sesion</span>
      <span className="block max-w-44 truncate text-sm font-semibold text-on-surface">{email}</span>
    </button>
  );
}
