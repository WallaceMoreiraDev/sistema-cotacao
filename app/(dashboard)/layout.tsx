'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.needsPasswordChange && pathname !== '/setup-senha') {
      router.replace('/setup-senha');
    }
  }, [router, user, pathname, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#F7C00C]"></div>
          <p className="text-sm font-bold text-slate-500 animate-pulse">Carregando painel...</p>
        </div>
      </div>
    );
  }

  // Prevent rendering if there's no user or if they need to change password (avoid flash of dashboard content)
  if (!user || (user.needsPasswordChange && pathname !== '/setup-senha')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</div>
    </div>
  );
}
