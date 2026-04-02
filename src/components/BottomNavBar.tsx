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
    <nav className="fixed bottom-4 left-4 right-4 rounded-2xl z-50 bg-surface/95 flex justify-around items-center h-[72px] px-2 shadow-lg border border-outline">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        const Icon = item.icon;
        
        return (
          <Link 
            key={item.path} 
            href={item.path} 
            className={`flex flex-col items-center justify-center transition-all duration-200 ease-out p-2 rounded-xl ${
              isActive 
                ? 'text-primary' 
                : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
            }`}
          >
            <Icon className="mb-1 h-[22px] w-[22px]" />
            <span className="font-label font-medium text-[10px] uppercase tracking-wider mt-1">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
