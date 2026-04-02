'use client';

import { Menu, Plus, X, Home, History, ScanLine, Wallet, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function TopAppBar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleSignOut = () => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/auth');
      router.refresh();
    });
  };

  if (pathname.startsWith('/auth')) {
    return null;
  }

  const navLinks = [
    { name: 'Inicio', path: '/', icon: Home },
    { name: 'Historial', path: '/history', icon: History },
    { name: 'Escanear', path: '/scan', icon: ScanLine },
    { name: 'Presupuesto', path: '/budget', icon: Wallet },
  ];

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-transparent flex justify-between items-center px-4 py-4 backdrop-blur-sm">
        <button
          onClick={() => setIsOpen(true)}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white active:bg-white/10 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <h1 className="text-xl font-bold text-white tracking-tight absolute left-1/2 -translate-x-1/2">
          Hoy
        </h1>

        <Link href="/entry" className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-black active:scale-95 transition-transform shadow-[0_0_15px_rgba(253,224,71,0.4)]">
          <Plus className="w-6 h-6 stroke-[3]" />
        </Link>
      </nav>

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-[70] w-72 bg-[#0A0A0F]/95 backdrop-blur-2xl border-r border-white/5 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Mi cuenta</span>
              <span className="text-xs font-bold text-white truncate max-w-[140px]">{userEmail || '...'}</span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.path;
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                href={link.path}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-semibold text-sm">{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-4 w-full px-4 py-3 rounded-2xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold text-sm">Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
