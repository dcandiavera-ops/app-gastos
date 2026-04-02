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
      className="supabase-btn flex flex-col items-end px-3 py-1 bg-surface-variant hover:bg-surface-variant/80 border-outline"
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">Sesion</span>
      <span className="max-w-[120px] truncate text-xs font-semibold text-on-surface">{email}</span>
    </button>
  );
}
