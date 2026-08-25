'use client';

import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '../lib/supabase/client';

export type UserRole = 'admin' | 'funcionario';

export type User = {
  id: string;
  name: string;
  role: UserRole;
  jobTitle?: string;
  department?: string;
  status?: 'ativo' | 'inativo';
  needsPasswordChange?: boolean;
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const supabase = createClient();

  // Helper to fetch profile and update state
  const fetchProfileAndSetUser = async (session: any, isMounted: boolean = true) => {
    if (!session?.user) {
      if (isMounted) {
        setUser(null);
        setIsLoading(false);
      }
      return;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, role, job_title, department, status, needs_password_change')
      .eq('id', session.user.id)
      .single();
      
    if (error && isMounted) {
      console.error("Erro ao buscar perfil:", error);
    }

    if (isMounted) {
      setUser({
        id: session.user.id,
        name: profile?.full_name || session.user.email || 'Usuário',
        role: profile?.role || (session.user.email?.includes('wallace') ? 'admin' : 'funcionario'),
        jobTitle: profile?.job_title,
        department: profile?.department,
        status: profile?.status || 'ativo',
        needsPasswordChange: profile?.needs_password_change ?? true,
      });
      setIsLoading(false);
    }
  };

  // Re-check session on route changes (e.g. after server action login redirects to /dashboard)
  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfileAndSetUser(session, isMounted);
    });
    return () => { isMounted = false; };
  }, [pathname, supabase]);

  useEffect(() => {
    let isMounted = true;
    let initialLoadDone = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      initialLoadDone = true;
      fetchProfileAndSetUser(session, isMounted);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'INITIAL_SESSION' && initialLoadDone) return;
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
        return;
      }

      setTimeout(() => {
        if (isMounted) {
          // We shouldn't set isLoading(true) here because it unmounts the entire app.
          // Supabase triggers events like 'SIGNED_IN' or 'TOKEN_REFRESHED' when switching tabs.
          // Fetching silently in the background prevents the page from "reloading".
          fetchProfileAndSetUser(session, isMounted);
        }
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const login = (nextUser: User) => setUser(nextUser);
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Carregando...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
