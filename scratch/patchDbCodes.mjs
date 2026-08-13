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

export function extractCodesFromName(name) {
  if (!name) return {};
  const result = {};
  let cleanName = name.replace(/\s*-\s*[A-Z]+$/, '');
  cleanName = cleanName.replace(/\b\d+(?:\.\d+)?\s*[xX*]\s*\d+(?:\.\d+)?(?:\s*[xX*]\s*\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?)?\b/g, '');
  
  const ignoreWords = ['GAXETA', 'RASPADOR', 'RETENTOR', 'ANEL', 'O-RING', 'ORING', 'BUCHA', 'GUIA', 'CHEVRON', 'MOLA', 'PRATO', 'SELO', 'BUFFER', 'ANTI-EXTRUSAO', 'GOTA', 'K-DAS', 'TIRANTE', 'PU', 'NBR', 'VITON', 'SILICONE', 'TEFLON', 'PTFE', 'BA', 'METAL', 'PATENTE', 'SH', 'IMP', 'UIP2', 'DP', 'MDU', 'VME'];
  
  const tokens = cleanName.split(/[\s+\/]+/).filter(Boolean);
  
  const possibleCodes = tokens.filter(t => {
    const isIgnore = ignoreWords.includes(t.toUpperCase());
    const isMeasurement = /^\d+(\.\d+)?$/.test(t) && parseFloat(t) < 1000;
    const isTooShort = t.length < 3;
    return !isIgnore && !isMeasurement && !isTooShort;
  });

  if (possibleCodes.length > 0) {
    if (possibleCodes.length === 1) {
      result.oem_code = possibleCodes[0];
    } else if (possibleCodes.length === 2) {
      result.oem_code = possibleCodes[0];
      result.parker_code = possibleCodes[1];
    } else {
      result.oem_code = possibleCodes[0] + ' / ' + possibleCodes[1];
      result.parker_code = possibleCodes[2];
    }
  }

  return result;
}

async function run() {
  console.log('Fetching all products...');
  let allProds = [];
  let page = 0;
  while(true) {
    const res = await fetch(`${supabaseUrl}/rest/v1/stock_products?select=id,name,sku,code,cost_price,category,bling_id,measurements,part_type&limit=1000&offset=${page*1000}`, {
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
    const codes = extractCodesFromName(prod.name);
    
    if (codes.oem_code || codes.parker_code) {
        upsertBatch.push({
        ...prod,
        oem_code: codes.oem_code || null,
        parker_code: codes.parker_code || null,
        updated_at: new Date().toISOString()
        });
    }
  }

  console.log(`Found ${upsertBatch.length} products with codes to patch.`);

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
