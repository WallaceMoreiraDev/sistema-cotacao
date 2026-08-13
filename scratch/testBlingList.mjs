import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
const env = envContent.split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1].trim()] = match[2].trim().replace(/['"]/g, '');
  return acc;
}, {});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

async function run() {
  const sysRes = await fetch(`${supabaseUrl}/rest/v1/system_settings`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  
  const sysData = await sysRes.json();
  const tokenRow = sysData.find(r => r.key === 'bling_access_token');
  let token = tokenRow.value;
  if (token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }

  const res = await fetch('https://www.bling.com.br/Api/v3/produtos?limite=1', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

run();
