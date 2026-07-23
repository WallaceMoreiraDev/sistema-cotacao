'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { createClient } from '@/app/lib/supabase/client';
import { markUserPasswordChangedAction } from '@/app/lib/actions/users';

export default function SetupSenhaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Se o usuário não tiver que trocar a senha, chuta ele pro dashboard
    if (user && !user.needsPasswordChange) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem. Tente novamente.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.updateUser({
        password: password
      });

      if (authError) throw authError;

      if (user?.id) {
        const res = await markUserPasswordChangedAction(user.id);
        if (!res.success) throw new Error(res.error);
      }

      setSuccess(true);
      
      // Espera 2 segundos e manda pro dashboard
      setTimeout(() => {
        // Precisamos dar um reload para o AuthContext puxar o needsPasswordChange como false 
        // ou o onAuthStateChange fará isso, mas o window.location.href é mais garantido de limpar os states.
        window.location.href = '/dashboard';
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao redefinir sua senha.');
      setIsSubmitting(false);
    }
  }

  if (!user || !user.needsPasswordChange) return null; // Previne piscar tela

  return (
    <div className="min-h-[calc(100vh-100px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden">
        
        <div className="p-8">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bem-vindo(a), {user.name.split(' ')[0]}!</h1>
          <p className="text-slate-500 mt-2 text-sm leading-relaxed">
            Para garantir a segurança da sua conta, por favor, defina uma nova senha particular antes de acessar o sistema.
          </p>

          {error && (
            <div className="mt-6 p-4 rounded-xl bg-rose-50 text-rose-600 text-sm font-medium border border-rose-100">
              {error}
            </div>
          )}

          {success ? (
            <div className="mt-6 p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold border border-emerald-100 flex items-center gap-3">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Senha redefinida com sucesso! Redirecionando...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nova Senha</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-400/10"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Confirme a Senha</label>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-400/10"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 focus:ring-4 focus:ring-slate-900/10 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar e Acessar Sistema'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
