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

export function extractBrandFromName(name) {
  if (!name) return null;
  const upper = name.toUpperCase();

  if (upper.match(/- ?A$/) || upper.match(/\bAGEL\b/)) return 'Agel';
  if (upper.match(/- ?PK$/) || upper.match(/\bPARKER\b/)) return 'Parker';
  if (upper.match(/- ?L$/)) return 'L';
  if (upper.match(/- ?HBY$/) || upper.match(/\bHBY\b/)) return 'HBY';
  if (upper.match(/- ?S$/)) return 'S';
  
  if (upper.match(/\bNOK\b/)) return 'NOK';
  if (upper.match(/\bAPC\b/)) return 'APC';
  if (upper.match(/\bSABO\b/) || upper.match(/\bSABÓ\b/)) return 'Sabó';
  if (upper.match(/\bCORTECO\b/)) return 'Corteco';

  return null;
}

async function run() {
  console.log('Fetching all products...');
  let allProds = [];
  let page = 0;
  while(true) {
    const res = await fetch(`${supabaseUrl}/rest/v1/stock_products?select=*&limit=1000&offset=${page*1000}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const prods = await res.json();
    if (prods.length === 0) break;
    allProds = allProds.concat(prods);
    page++;
  }
  console.log(`Found ${allProds.length} products.`);

  const upsertBatch = [];
  for (const prod of allProds) {
    const brand = extractBrandFromName(prod.name);
    
    // Only update if it's different
    if (prod.brand !== brand && brand !== null) {
        upsertBatch.push({
            ...prod,
            brand: brand,
            updated_at: new Date().toISOString()
        });
    }
  }

  console.log(`Found ${upsertBatch.length} products to patch for brands.`);

  const chunkSize = 500;
  for (let i = 0; i < upsertBatch.length; i += chunkSize) {
    const chunk = upsertBatch.slice(i, i + chunkSize);
    const upRes = await fetch(`${supabaseUrl}/rest/v1/stock_products?on_conflict=id`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(chunk)
    });
    if (!upRes.ok) {
      console.error('Error chunk', i, await upRes.text());
    } else {
      console.log(`Updated chunk ${i} to ${i + chunk.length}`);
    }
  }
  console.log('Done patching brands!');
}
run();
