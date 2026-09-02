import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('system_settings').select('value').eq('key', 'bling_access_token').single();
  const token = String(data?.value).replace(/^"(.*)"$/, '$1');

  const testUrls = [
    'https://api.bling.com.br/Api/v3/produtos/precos',
    'https://api.bling.com.br/Api/v3/listas-precos',
    'https://api.bling.com.br/Api/v3/tabelas-precos',
    'https://api.bling.com.br/Api/v3/produtos?campos=precos',
  ];

  for (const url of testUrls) {
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    console.log(`URL: ${url} -> Status: ${res.status}`);
  }
}
run();
