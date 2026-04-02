import AuthButton from '@/components/AuthButton';
import { getOptionalAuthUser } from '@/lib/auth';

export default async function TopAppBar() {
  const user = await getOptionalAuthUser();

  return (
    <nav className="fixed top-0 w-full z-50 bg-transparent flex justify-between items-center px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center border-2 border-outline-variant shadow-md">
           {/* Profile Picture Placeholder */}
          <span className="text-on-surface font-bold text-sm">{user?.email ? user.email.charAt(0).toUpperCase() : 'U'}</span>
        </div>
      </div>
      <AuthButton email={user?.email} />
    </nav>
  );
}
