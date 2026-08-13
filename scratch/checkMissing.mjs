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
  const res = await fetch(`${supabaseUrl}/rest/v1/stock_products?select=id,category,name&name=ilike.%25Anel%20Guia%25`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  console.log('Total Anel Guia in name:', data.length);
  
  const miscategorized = data.filter(d => !d.category || !d.category.toLowerCase().includes('anel guia'));
  console.log('Miscategorized:', miscategorized.length);
  if (miscategorized.length > 0) {
      console.log('Sample:', miscategorized.slice(0, 5));
  }
}
run();
