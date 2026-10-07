const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const BLING_API_BASE = 'https://api.bling.com.br/Api/v3';

async function run() {
  const { data } = await supabase.from('system_settings').select('*');
  const tokenObj = data.find(d => d.key === 'bling_access_token');
  const token = tokenObj ? JSON.parse(tokenObj.value) : null;
  
  if (!token) throw new Error('No token found');

  const res = await fetch(`${BLING_API_BASE}/produtos/fornecedores?idProduto[]=16690850196`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}
run();
