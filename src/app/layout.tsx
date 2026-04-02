import type { Metadata } from 'next';
import './globals.css';
import TopAppBar from '@/components/TopAppBar';
import BottomNavBar from '@/components/BottomNavBar';

export const dynamic = 'force-dynamic';

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased font-sans bg-background text-on-surface selection:bg-primary/30 min-h-screen">
        <TopAppBar />
        {children}
        <BottomNavBar />
      </body>
    </html>
  );
}
