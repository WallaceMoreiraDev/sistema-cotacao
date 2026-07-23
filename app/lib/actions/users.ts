'use server';

import { createClient } from '@supabase/supabase-js';
import type { Profile } from '../types/database';

// Helper for Service Role client (bypasses RLS, used only in server actions)
function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase URL or Service Role Key missing from environment.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a new user in auth.users and public.profiles.
 * Requires admin privileges.
 */
export async function createUserAction(userData: {
  email: string;
  passwordInicial: string;
  fullName: string;
  role: 'admin' | 'funcionario';
  jobTitle: string;
  department: string;
}) {
  try {
    const supabaseAdmin = getAdminSupabase();

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.passwordInicial,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: userData.fullName,
        role: userData.role,
        job_title: userData.jobTitle,
        department: userData.department,
      },
    });

    if (authError) throw authError;

    // The trigger 'handle_new_user' should automatically create the profile.
    // However, if we want to be safe, we can manually upsert the profile here using service role.
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      full_name: userData.fullName,
      role: userData.role,
      job_title: userData.jobTitle,
      department: userData.department,
      status: 'ativo',
      needs_password_change: true,
    });

    if (profileError) throw profileError;

    return { success: true, userId: authData.user.id };
  } catch (err: any) {
    console.error('Error in createUserAction:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all user profiles for the admin dashboard
 */
export async function getUsersAction() {
  try {
    const supabaseAdmin = getAdminSupabase();
    
    // We need both profiles and emails from auth.users, but querying auth.users directly is restricted.
    // The admin SDK allows listing users.
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) throw authError;
    
    // Get all profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (profileError) throw profileError;

    // Merge them
    const combinedData = (profiles || []).map(profile => {
      const authUser = authUsers.users.find(u => u.id === profile.id);
      return {
        ...profile,
        email: authUser?.email || 'N/A',
      };
    });

    return { success: true, data: combinedData };
  } catch (err: any) {
    console.error('Error in getUsersAction:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Update an existing user's profile
 */
export async function updateUserProfileAction(
  id: string, 
  updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
) {
  try {
    const supabaseAdmin = getAdminSupabase();

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error('Error in updateUserProfileAction:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Resets a user's password (called by Admin)
 * Sets needs_password_change to true automatically.
 */
export async function adminResetUserPasswordAction(userId: string, tempPassword: string) {
  try {
    const supabaseAdmin = getAdminSupabase();

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });

    if (authError) throw authError;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ needs_password_change: true })
      .eq('id', userId);

    if (profileError) throw profileError;

    return { success: true };
  } catch (err: any) {
    console.error('Error in adminResetUserPasswordAction:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Marks a user's password as changed, removing the lock
 */
export async function markUserPasswordChangedAction(userId: string) {
  try {
    const supabaseAdmin = getAdminSupabase();

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ needs_password_change: false })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error in markUserPasswordChangedAction:', err);
    return { success: false, error: err.message };
  }
}

/**
 * DEBUG ONLY: Fetch a specific user's raw auth data
 */
export async function debugUserAuthAction(email: string) {
  try {
    const supabaseAdmin = getAdminSupabase();
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;
    
    const user = users.find(u => u.email === email);
    if (!user) return { success: false, error: 'User not found in auth.users' };
    
    console.log("DEBUG USER AUTH:", JSON.stringify(user, null, 2));
    
    return { success: true, user: {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
      banned_until: user.banned_until,
      identities: user.identities?.length
    }};
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
