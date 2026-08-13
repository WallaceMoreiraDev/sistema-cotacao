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

export function extractCategoryFromName(name) {
  if (!name) return 'Desconhecida';
  const u = name.toUpperCase();
  if (u.includes('BUCHA') || u.includes('GUIA')) return 'Anel Guia / Fita Guia';
  if (u.includes('ANEL') || u.includes('O-RING') || u.includes('ORING')) return 'Anel O-Ring';
  if (u.includes('GAXETA') || u.includes('U-CUP')) return 'Gaxeta';
  if (u.includes('RASPADOR')) return 'Raspador';
  if (u.includes('RETENTOR')) return 'Retentor';
  if (u.includes('CHEVRON')) return 'Jogo Chevron';
  if (u.includes('MOLA') || u.includes('PRATO')) return 'Mola Prato';
  if (u.includes('SELO')) return 'Selo Mecânico';
  if (u.includes('BUFFER')) return 'Anel Buffer';
  if (u.includes('ANTI-EXTRUSAO') || u.includes('ANTI EXTRUSAO') || u.includes('BACKUP') || u.includes('BACK-UP')) return 'Anel Anti-Extrusão';
  if (u.includes('GOTA')) return 'Gota';
  if (u.includes('K-DAS') || u.includes('KDAS')) return 'K-DAS';
  if (u.includes('TIRANTE')) return 'Tirante';
  return 'Desconhecida';
}

export function extractPartTypeFromName(name) {
  if (!name) return null;
  const upper = name.toUpperCase();
  if (upper.includes(' PU ') || upper.match(/\bPU\b/)) return 'PU';
  if (upper.includes(' NBR ') || upper.match(/\bNBR\b/)) return 'NBR';
  if (upper.includes(' VITON ') || upper.match(/\bVITON\b/)) return 'VITON';
  if (upper.includes(' SILICONE ') || upper.match(/\bSILICONE\b/)) return 'SILICONE';
  if (upper.includes(' TEFLON ') || upper.match(/\bTEFLON\b/) || upper.match(/\bPTFE\b/)) return 'TEFLON';
  if (upper.includes(' BA ') || upper.match(/\bBA\b/)) return 'BA';
  if (upper.includes(' METAL PATENTE ') || upper.match(/\bMETAL PATENTE\b/)) return 'Metal Patente';
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
    const category = extractCategoryFromName(prod.name);
    const partType = extractPartTypeFromName(prod.name);
    
    // Only update if it's different
    if (prod.category !== category || prod.part_type !== partType) {
        upsertBatch.push({
            ...prod,
            category: category,
            part_type: partType,
            updated_at: new Date().toISOString()
        });
    }
  }

  console.log(`Found ${upsertBatch.length} products to patch.`);

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
