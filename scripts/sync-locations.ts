import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getBlingCredentials() {
  const { data } = await supabase.from('system_settings').select('key, value').in('key', ['bling_access_token', 'bling_refresh_token', 'bling_client_id', 'bling_client_secret']);
  if (!data) return null;
  const settings = data.reduce((acc: any, curr) => {
    try {
      acc[curr.key] = JSON.parse(curr.value);
    } catch {
      acc[curr.key] = curr.value;
    }
    return acc;
  }, {});
  return settings;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function refreshBlingToken(credentials: any) {
  console.log('Renovando token do Bling...');
  const base64Auth = Buffer.from(`${credentials.bling_client_id}:${credentials.bling_client_secret}`).toString('base64');
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', credentials.bling_refresh_token);

  const response = await fetch(`https://www.bling.com.br/Api/v3/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${base64Auth}`,
      'Accept': '1.0'
    },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error('Falha ao renovar token');
  }

  const data: any = await response.json();
  
  await supabase.from('system_settings').update({ value: data.access_token }).eq('key', 'bling_access_token');
  await supabase.from('system_settings').update({ value: data.refresh_token }).eq('key', 'bling_refresh_token');
  
  console.log('Token renovado com sucesso.');
  return data.access_token;
}

async function main() {
  console.log('Iniciando sincronização de localizações...');
  
  // Buscar todos os produtos do estoque usando paginação
  let stockProducts: any[] = [];
  let from = 0;
  let size = 1000;
  while (true) {
    const { data, error } = await supabase.from('stock_products').select('id, bling_id, measurements, brand').not('bling_id', 'is', null).range(from, from + size - 1);
    if (error || !data) {
      console.error('Erro ao buscar produtos:', error);
      return;
    }
    stockProducts.push(...data);
    if (data.length < size) break;
    from += size;
  }
  
  console.log(`Encontrados ${stockProducts.length} produtos. Consultando o Bling 1 por 1...`);
  
  let credentials = await getBlingCredentials();
  let token = credentials?.bling_access_token;
  if (!token) {
    console.error('Credenciais do Bling não encontradas!');
    return;
  }
  
  let count = 0;
  let updatedCount = 0;
  
  for (const product of stockProducts) {
    count++;
    
    // Check if we need a token refresh (simplistic approach: just refetch token every 500 requests if it changes in DB by another cron)
    if (count % 500 === 0) {
      credentials = await getBlingCredentials();
      token = credentials?.bling_access_token;
    }

    try {
      const response = await fetch(`https://www.bling.com.br/Api/v3/produtos/${product.bling_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (response.status === 429) {
        console.log(`[${count}/${stockProducts.length}] Rate limit atingido. Aguardando 2 segundos...`);
        await delay(2000);
        count--; // retry this item
        continue;
      }
      
      if (response.status === 401) {
          console.log(`[${count}/${stockProducts.length}] Token expirado. Renovando agora...`);
          try {
            token = await refreshBlingToken(credentials);
            count--; // retry this item
            await delay(1000);
            continue;
          } catch (e) {
            console.error('Erro fatal ao renovar token. Abortando.', e);
            break;
          }
      }

      if (!response.ok) {
        console.log(`[${count}/${stockProducts.length}] Erro ${response.status} ao buscar produto ${product.bling_id}`);
        await delay(350);
        continue;
      }

      const json: any = await response.json();
      const localizacao = json.data?.estoque?.localizacao;
      const marca = json.data?.marca;

      let needsUpdate = false;
      const updates: any = {};

      if (localizacao) {
        const measurements = product.measurements || {};
        if (measurements.location !== localizacao) {
          measurements.location = localizacao;
          updates.measurements = measurements;
          needsUpdate = true;
        }
      }

      if (marca && product.brand !== marca) {
        updates.brand = marca;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await supabase.from('stock_products').update(updates).eq('id', product.id);
        updatedCount++;
        console.log(`[${count}/${stockProducts.length}] Atualizado: ${product.bling_id} -> Loc: ${localizacao || '-'} | Marca: ${marca || '-'}`);
      } else {
        console.log(`[${count}/${stockProducts.length}] Ignorado (Sem mudanças necessárias): ${product.bling_id}`);
      }

    } catch (err: any) {
      console.log(`[${count}/${stockProducts.length}] Exceção ao processar ${product.bling_id}: ${err.message}`);
    }

    // Rate limit: Bling is 3 requests per second. 
    // Delay 350ms ensures ~2.8 requests per second.
    await delay(350);
  }

  console.log(`Concluído! ${updatedCount} produtos tiveram suas localizações atualizadas.`);
}

main().catch(console.error);
