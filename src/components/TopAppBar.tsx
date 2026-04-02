import AuthButton from '@/components/AuthButton';
import { getOptionalAuthUser } from '@/lib/auth';

export default async function TopAppBar() {
  const user = await getOptionalAuthUser();

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl flex justify-between items-center px-6 py-4 shadow-[0px_24px_48px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center overflow-hidden border border-outline-variant/20 shadow-inner">
          <span className="text-white font-black text-xl">D</span>
        </div>
        <span className="text-xl font-extrabold font-sans tracking-tight text-on-surface">Gastos <span className="text-primary font-bold font-sans">Personales</span></span>
      </div>
      <AuthButton email={user?.email} />
    </nav>
  );
}
