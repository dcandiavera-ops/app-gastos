import Image from 'next/image';
import AuthButton from '@/components/AuthButton';
import { getOptionalAuthUser } from '@/lib/auth';

export default async function TopAppBar() {
  const user = await getOptionalAuthUser();

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl flex justify-between items-center px-6 py-4 shadow-[0px_24px_48px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant/20">
          <Image
            className="w-full h-full object-cover"
            alt="User avatar"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAu2jyS7pJH--m5XWKUuttbKCvIOHPFbkKHzmLYvBXWtQgbi1kGHVbduUavn2AjEdV20bsDNTwE8XANPCLhC8_-YnF_tPj1uQtRbYEaCDyzkHk7sr5suSwn-GW9bUkcV9Es2O8-T7ZksGhsra8hxRM8sF2IFr1SvZRliiuI8XNxakqiXjt4AP1f_l0wUxweFDQhxFbOABpXwUHQQVjiK4p5Bl8UWLtIe9V5AKuxvj7ypH4s3hD9WVIkd5x2j9zQken1zXwvhrIjOaCg"
            width={40}
            height={40}
          />
        </div>
        <span className="text-xl font-extrabold tracking-tight text-on-surface">Gastos <span className="text-primary font-bold">Personales</span></span>
      </div>
      <AuthButton email={user?.email} />
    </nav>
  );
}
