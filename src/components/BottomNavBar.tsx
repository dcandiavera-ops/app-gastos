'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNavBar() {
  const pathname = usePathname();

  if (pathname.startsWith('/auth')) {
    return null;
  }
  
  const navItems = [
    { name: 'Inicio', path: '/', icon: 'home' },
    { name: 'Historial', path: '/history', icon: 'history' },
    { name: 'Escanear', path: '/scan', icon: 'document_scanner' },
    { name: 'Presupuesto', path: '/budget', icon: 'account_balance_wallet' },
    { name: 'Ingreso', path: '/entry', icon: 'add_circle' },
  ];

  return (
    <nav className="fixed bottom-4 left-4 right-4 rounded-[3rem] z-50 bg-surface/80 backdrop-blur-lg flex justify-around items-center h-20 px-4 shadow-[0px_24px_48px_rgba(0,0,0,0.4)] border border-outline-variant/15">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        
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
            <span 
              className="material-symbols-outlined mb-1" 
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span className="font-label font-medium text-[10px] uppercase tracking-widest mt-1">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
