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
    <nav className="fixed bottom-4 left-4 right-4 rounded-[3rem] z-50 bg-surface/80 backdrop-blur-lg flex justify-around items-center h-20 px-4 shadow-[0px_24px_48px_rgba(0,0,0,0.4)] border border-outline-variant/15">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        const Icon = item.icon;
        
        return (
          <Link 
            key={item.path} 
            href={item.path} 
            className={`flex flex-col items-center justify-center transition-all duration-300 ease-out ${
              isActive 
                ? 'text-primary drop-shadow-[0_0_8px_rgba(170,255,220,0.5)] scale-110' 
                : 'text-on-surface/50 hover:text-primary/80'
            }`}
          >
            <Icon className="mb-1 h-5 w-5" />
            <span className="font-label font-medium text-[10px] uppercase tracking-widest mt-1">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
