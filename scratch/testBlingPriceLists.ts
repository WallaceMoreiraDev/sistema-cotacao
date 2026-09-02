import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getBlingToken() {
  const { data } = await supabase.from('system_settings').select('value').eq('key', 'bling_access_token').single();
  return String(data?.value).replace(/^"(.*)"$/, '$1');
}

async function run() {
  const token = await getBlingToken();
  if (!token) {
    console.log('No Bling token found in system_settings.');
    return;
  }
  console.log('Token fetched successfully.');

  const res = await fetch(`https://api.bling.com.br/Api/v3/listas-precos`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const text = await res.text();
  console.log(`Bling Response Status: ${res.status}`);
  try {
    const json = JSON.parse(text);
    console.log(JSON.stringify(json, null, 2));
  } catch(e) {
    console.log(text);
  }
}

run();
