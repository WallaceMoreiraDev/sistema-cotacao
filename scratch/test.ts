import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function run() {
  const { data, error } = await supabase.from('protocol_items').insert({
    protocol_id: 1039,
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Item',
    quantity: 1,
    unit_price: 10,
    cost_price: 5,
    type: 'estoque',
    status: 'pendente'
  }).select();
  console.log('Result:', data, 'Error:', JSON.stringify(error));
}

run();
