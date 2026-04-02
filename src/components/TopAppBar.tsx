import { Menu, Plus } from 'lucide-react';
import Link from 'next/link';

export default function TopAppBar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-transparent flex justify-between items-center px-4 py-4 backdrop-blur-sm">
      <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white active:bg-white/10 transition-colors">
        <Menu className="w-5 h-5" />
      </button>
      
      <h1 className="text-xl font-bold text-white tracking-tight absolute left-1/2 -translate-x-1/2">
        Hoy
      </h1>

      <Link href="/entry" className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-black active:scale-95 transition-transform shadow-[0_0_15px_rgba(253,224,71,0.4)]">
        <Plus className="w-6 h-6 stroke-[3]" />
      </Link>
    </nav>
  );
}
