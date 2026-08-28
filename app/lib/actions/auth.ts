'use server';

import { createClient } from '../supabase/server';
import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';

export async function logAuthEvent(action: string, overrideUserId?: string | null) {
  try {
    const supabase = await createClient();
    
    let userId = overrideUserId;
    if (overrideUserId === undefined) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, message: 'Nenhum usuário logado.' };
      userId = user.id;
    }

    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'Desconhecido';
    const userAgent = headersList.get('user-agent') || 'Desconhecido';

    const { error } = await supabase.from('auth_logs').insert([
      {
        user_id: userId,
        action,
        ip_address: ipAddress,
        user_agent: userAgent
      }
    ]);

    if (error) {
      console.error('Erro ao registrar log de auth:', error);
      return { success: false, message: 'Erro ao registrar log.' };
    }

    return { success: true, message: 'Log registrado com sucesso.' };
  } catch (error) {
    console.error('Falha inesperada no log de auth:', error);
    return { success: false, message: 'Falha inesperada no log.' };
  }
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'E-mail e senha são obrigatórios.' };
  }

  const cookieStore = await cookies();
  const lockoutCookie = cookieStore.get('login_lockout');
  let attempts = parseInt(cookieStore.get('login_attempts')?.value || '0', 10);

  if (lockoutCookie) {
    const lockoutTime = new Date(lockoutCookie.value);
    const now = new Date();
    if (now < lockoutTime) {
      const remaining = Math.ceil((lockoutTime.getTime() - now.getTime()) / 60000);
      return { error: `Muitas tentativas. Tente novamente em ${remaining} minuto(s).` };
    } else {
      cookieStore.delete('login_lockout');
      cookieStore.delete('login_attempts');
      attempts = 0;
    }
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    attempts += 1;
    
    if (attempts >= 5) {
      const lockoutUntil = new Date(Date.now() + 5 * 60 * 1000);
      cookieStore.set('login_lockout', lockoutUntil.toISOString(), { httpOnly: true, path: '/' });
      cookieStore.delete('login_attempts');
      await logAuthEvent(`RATE_LIMIT_EXCEEDED: ${email}`, null);
      return { error: 'Tentativas esgotadas. Conta bloqueada por 5 minutos.' };
    } else {
      cookieStore.set('login_attempts', attempts.toString(), { httpOnly: true, path: '/' });
      if (attempts === 4) {
        return { error: 'E-mail ou senha incorretos. Aviso: Você tem apenas mais 1 tentativa.' };
      }
      return { error: 'E-mail ou senha incorretos.' };
    }
  }

  // Clear attempts on success
  if (attempts > 0) {
    cookieStore.delete('login_attempts');
  }

  // Record login event and check status
  if (data?.user) {
    // SECURITY CHECK: Verify if user profile is active
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', data.user.id)
      .single();

    if (profile?.status === 'inativo') {
      await supabase.auth.signOut();
      return { error: 'Conta desativada. Entre em contato com o administrador.' };
    }

    await logAuthEvent('LOGIN', data.user.id);
  }

  redirect('/dashboard');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
