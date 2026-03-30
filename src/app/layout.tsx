import type { Metadata } from 'next';
import './globals.css';
import TopAppBar from '@/components/TopAppBar';
import BottomNavBar from '@/components/BottomNavBar';

export const metadata: Metadata = {
  title: 'Gastos Personales',
  description: 'Gestor personal de gastos y boletas',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased font-body bg-surface text-on-surface selection:bg-primary/30 min-h-screen">
        <TopAppBar />
        {children}
        <BottomNavBar />
      </body>
    </html>
  );
}
