import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
  console.log('Testing signup...');
  const { data, error } = await supabase.auth.signUp({
    email: 'test_user_debug@example.com',
    password: 'password123',
  });

  if (error) {
    console.error('Signup Error:', error);
  } else {
    console.log('Signup Success!', data);
  }
}

testSignup();
