import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getBlingToken() {
  const { data } = await supabase.from('system_settings').select('bling_access_token').single();
  return data?.bling_access_token;
}

async function run() {
  console.log('1. Fetching 3 products from Supabase...');
  const { data: prods } = await supabase.from('stock_products').select('id, name, bling_id, quantity').not('bling_id', 'is', null).limit(3);
  console.log(prods);

  if (!prods || prods.length === 0) {
    console.log('No products with bling_id found.');
    return;
  }

  const ids = prods.map(p => p.bling_id.toString());
  console.log(`2. Querying Bling for IDs: ${ids.join(', ')}`);

  const token = await getBlingToken();
  if (!token) {
    console.log('No Bling token found in system_settings.');
    return;
  }

  const urlParams = new URLSearchParams();
  ids.forEach(id => urlParams.append('idsProdutos[]', id));

  const res = await fetch(`https://www.bling.com.br/Api/v3/estoques/saldos?${urlParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const text = await res.text();
  console.log(`3. Bling Response Status: ${res.status}`);
  console.log('Bling Raw Data:');
  try {
    const json = JSON.parse(text);
    console.log(JSON.stringify(json, null, 2));
  } catch(e) {
    console.log(text);
  }
}

run();
