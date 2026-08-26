'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Global Top Bar */}
      <header className="bg-black border-b border-neutral-900 sticky top-0 z-50 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 h-20 flex items-center justify-between lg:px-8">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image 
              src="/images/logo_fm.png" 
              alt="Sistema Vedações" 
              width={160} 
              height={44} 
              className="h-12 w-auto object-contain"
              priority
            />
          </div>

          {/* User Profile */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 hover:bg-neutral-900 p-1.5 rounded-xl transition-all border border-transparent hover:border-neutral-800"
            >
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-bold text-white leading-none">{user.name}</span>
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1">{user.role}</span>
              </div>
              <div className="h-9 w-9 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-200 border border-neutral-700 shadow-sm">
                {getInitials(user.name)}
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top-right">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 sm:hidden">
                  <p className="text-sm font-bold text-slate-700 truncate">{user.name}</p>
                  <p className="text-[10px] font-medium text-slate-500 uppercase mt-0.5">{user.role}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sair do Sistema
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto max-w-7xl px-4 py-6 lg:px-8 w-full">
        {children}
      </main>
    </div>
  );
}
