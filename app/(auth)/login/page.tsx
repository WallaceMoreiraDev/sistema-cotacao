'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

type LoginRole = 'admin' | 'funcionario';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<LoginRole>('funcionario');
  const [error, setError] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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

    login({
      name: role === 'admin' ? 'Admin' : 'Tiago',
      role,
    });
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.95),_rgba(2,6,23,0.98))] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[32px] border border-slate-200/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
        <section className="hidden flex-1 flex-col justify-between bg-white p-10 lg:flex">
          <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-sm rounded-[24px] border border-slate-200 bg-slate-50 p-8 shadow-sm">
              <div className="h-2.5 w-20 rounded-full bg-[#F7C00C]" />
              <h1 className="mt-6 text-3xl font-semibold text-slate-900">
                Gestão de protocolos
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Ambiente interno para organização, revisão e acompanhamento dos processos comerciais.
              </p>
            </div>
          </div>
        </section>

        <section className="flex-1 p-8 sm:p-10 lg:p-12">
          <div className="mx-auto flex h-full max-w-md flex-col justify-center">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
                Acesso ao painel
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">Entrar no sistema</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Acesse o ambiente de protocolos com e-mail e senha para continuar o fluxo de trabalho.
              </p>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRole('funcionario')}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  role === 'funcionario'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <p className="text-xs uppercase tracking-[0.3em] opacity-70">Funcionário</p>
                <p className="mt-1 font-semibold">Tiago</p>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  role === 'admin'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <p className="text-xs uppercase tracking-[0.3em] opacity-70">Administrador</p>
                <p className="mt-1 font-semibold">Admin</p>
              </button>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="seu@email.com"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="flex items-center justify-between text-sm text-slate-500">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                  Manter conectado
                </label>
                <a href="#" className="font-medium text-slate-700 hover:text-slate-950">
                  Esqueci a senha
                </a>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800"
              >
                Entrar no painel
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">Acesso de demonstração</p>
              <p className="mt-1">
                Utilize qualquer e-mail válido e uma senha com pelo menos 6 caracteres para continuar.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
