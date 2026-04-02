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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0E1522]/95 backdrop-blur-md flex justify-around items-center h-20 px-2 border-t border-outline/30 pb-safe">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        const Icon = item.icon;
        
        return (
          <Link 
            key={item.path} 
            href={item.path} 
            className={`flex flex-col items-center justify-center transition-all duration-200 ease-out w-16 h-14 rounded-2xl ${
              isActive 
                ? 'bg-outline-variant/30 text-white' 
                : 'text-on-surface-variant hover:text-white'
            }`}
          >
            <Icon className="mb-1 h-6 w-6" />
            <span className="font-sans font-medium text-[10px] tracking-wide mt-0.5">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
