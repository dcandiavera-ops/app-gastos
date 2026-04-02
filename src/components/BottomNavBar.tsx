'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CirclePlus, History, House, ScanLine, Wallet } from 'lucide-react';

type NavItem = {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
};

export default function BottomNavBar() {
  const pathname = usePathname();

  if (pathname.startsWith('/auth')) {
    return null;
  }
  
  const navItems: NavItem[] = [
    { name: 'Inicio', path: '/', icon: House },
    { name: 'Historial', path: '/history', icon: History },
    { name: 'Escanear', path: '/scan', icon: ScanLine },
    { name: 'Presupuesto', path: '/budget', icon: Wallet },
    { name: 'Ingreso', path: '/entry', icon: CirclePlus },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 px-4 flex justify-center">
      <nav className="bg-[#1C1C1E]/90 backdrop-blur-xl rounded-full flex justify-around items-center h-[72px] px-2 shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/5 w-full max-w-sm">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.path} 
              href={item.path} 
              className={`flex items-center justify-center transition-all duration-300 ease-out h-[56px] ${
                isActive 
                  ? 'bg-white/10 rounded-full px-5 text-primary' 
                  : 'text-on-surface-variant hover:text-white px-3'
              }`}
            >
              <div className="flex flex-col items-center gap-1 mt-1">
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {isActive && (
                  <span className="font-sans font-bold text-[10px] tracking-wide text-primary">
                    {item.name}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
