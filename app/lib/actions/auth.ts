'use server';

import { createClient } from '../supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export async function logAuthEvent(action: string, overrideUserId?: string) {
  try {
    const supabase = await createClient();
    
    let userId = overrideUserId;
    if (!userId) {
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

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Login error details:", error);
    // Return the actual error message for debugging purposes
    return { error: `Erro no login: ${error.message} (Code: ${error.status})` };
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
