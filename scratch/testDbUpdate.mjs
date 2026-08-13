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
  const payload = {
    id: 'prod_1786402703062_964',
    measurements: { innerDiameter: 65, outerDiameter: 80.5, height1: 6.3, thickness: 6.3 },
    name: 'BUFFER 65X80.5X6.3 PU+POM - HBY'
  };

  const res = await fetch(`${supabaseUrl}/rest/v1/stock_products?id=eq.prod_1786402703062_964`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    console.error('Error:', await res.text());
  } else {
    console.log('Update successful!');
  }
}

run();
