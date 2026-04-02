import AuthButton from '@/components/AuthButton';
import { getOptionalAuthUser } from '@/lib/auth';

export default async function TopAppBar() {
  const user = await getOptionalAuthUser();

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-sm border-b border-outline flex justify-between items-center px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center border border-outline">
          <span className="text-on-surface font-bold text-sm">D</span>
        </div>
        <span className="text-sm font-semibold tracking-tight text-on-surface">Gastos <span className="text-primary font-medium">Personales</span></span>
      </div>
      <AuthButton email={user?.email} />
    </nav>
  );
}
