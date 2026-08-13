import fs from 'fs';
import path from 'path';

// Load .env.local
const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
const env = envContent.split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1].trim()] = match[2].trim().replace(/['"]/g, '');
  return acc;
}, {});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

export function extractMeasurementsFromName(name) {
  if (!name) return null;
  const normalized = name.replace(/,/g, '.');
  const regex = /\b(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+(?:\.\d+)?)(?:\s*[xX*]\s*(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))?)?\b/;
  const match = normalized.match(regex);
  if (!match) return null;
  
  const result = {};
  const di = parseFloat(match[1]);
  if (!isNaN(di)) result.innerDiameter = di;
  const de = parseFloat(match[2]);
  if (!isNaN(de)) result.outerDiameter = de;
  const alt1 = parseFloat(match[3]);
  if (!isNaN(alt1)) {
    result.height1 = alt1;
    result.thickness = alt1;
  }
  const alt2 = parseFloat(match[4]);
  if (!isNaN(alt2)) {
    result.height2 = alt2;
  }
  return result;
}

export function extractPartTypeFromName(name) {
  if (!name) return null;
  const u = name.toUpperCase();
  if (u.includes('ANEL') || u.includes('O-RING') || u.includes('ORING')) return 'Anel O-Ring';
  if (u.includes('GAXETA')) return 'Gaxeta';
  if (u.includes('RASPADOR')) return 'Raspador';
  if (u.includes('RETENTOR')) return 'Retentor';
  if (u.includes('GAXETA') || u.includes('U-CUP')) return 'Gaxeta';
  if (u.includes('BUCHA') || u.includes('GUIA')) return 'Anel Guia / Fita Guia';
  if (u.includes('CHEVRON')) return 'Jogo Chevron';
  if (u.includes('MOLA') || u.includes('PRATO')) return 'Mola Prato';
  if (u.includes('SELO')) return 'Selo Mecânico';
  if (u.includes('BUFFER')) return 'Anel Buffer';
  if (u.includes('ANTI-EXTRUSAO') || u.includes('ANTI EXTRUSAO') || u.includes('BACKUP') || u.includes('BACK-UP')) return 'Anel Anti-Extrusão';
  if (u.includes('GOTA')) return 'Gota';
  if (u.includes('K-DAS') || u.includes('KDAS')) return 'K-DAS';
  if (u.includes('TIRANTE')) return 'Tirante';
  return null;
}

async function run() {
  console.log('Fetching all products...');
  // We need to paginate because limit is 1000
  let allProds = [];
  let page = 0;
  while(true) {
    const res = await fetch(`${supabaseUrl}/rest/v1/stock_products?select=id,name,sku,code,cost_price,category,bling_id&limit=1000&offset=${page*1000}`, {
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
    const measurements = extractMeasurementsFromName(prod.name);
    const partType = extractPartTypeFromName(prod.name);
    
    // Pass ALL required fields so UPSERT doesn't complain about nulls
    upsertBatch.push({
      ...prod, // includes id, name, sku, code, cost_price, category, bling_id
      measurements: measurements || {},
      part_type: partType || null,
      updated_at: new Date().toISOString()
    });
  }

  // Update in chunks
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
  
  console.log('Done!');
}

run();
