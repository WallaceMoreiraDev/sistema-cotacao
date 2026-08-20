import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
// using the service role key. This client bypasses Row Level Security.
// Never expose this client or its key to the browser.
export const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};
