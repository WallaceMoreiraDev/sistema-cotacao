'use client';

import { useState, type FormEvent } from 'react';
import { login } from '../../lib/actions/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Informe um e-mail válido para continuar.');
      return;
    }

    if (password.trim().length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsPending(true);

    const formData = new FormData();
    formData.append('email', normalizedEmail);
    formData.append('password', password.trim()); // Trim the password as well!

    try {
      const result = await login(formData);

      // If we got here and there's a result with an error, show it.
      // If it's successful, the server action will redirect and this code might not run.
      if (result?.error) {
        setError(result.error);
        setIsPending(false);
      }
    } catch (err) {
      // In Next.js, redirect() throws a special error. We shouldn't catch it and treat it as a UI error.
      // However, to be safe, if it's a generic error we display it.
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        setError('Ocorreu um erro inesperado ao tentar entrar.');
        setIsPending(false);
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Main Login Card */}
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-8 shadow-[0_25px_60px_rgba(15,23,42,0.3)] sm:p-10">
          <div className="mb-8 text-center">
            <img
              src="/images/logo_fm.png"
              alt="Força Máxima Vedações"
              className="mx-auto h-20 w-auto object-contain mix-blend-multiply mb-4"
            />
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400 block">
              Sistema Interno
            </span>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Acesso ao Painel
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Entre com suas credenciais para gerenciar protocolos e cotações.
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                E-mail corporativo
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu.email@empresa.com"
                disabled={isPending}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/10 disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                disabled={isPending}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/10 disabled:opacity-50"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="flex items-center text-xs text-slate-500 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                <span>Lembrar meu acesso</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-70 flex justify-center items-center"
            >
              {isPending ? 'Entrando...' : 'Entrar no sistema'}
            </button>
          </form>

          {/* Professional Corporate Security Footer */}
          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
            <p className="flex items-center justify-center gap-1.5 font-medium text-slate-500">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Acesso Corporativo Restrito
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Para suporte ou solicitação de novos acessos, contate a TI interna.
            </p>
          </div>
        </div>

        {/* Footer Credit */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Força Máxima Vedações &copy; {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}

