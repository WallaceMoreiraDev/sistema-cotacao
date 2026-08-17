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
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Full Test Item',
    quantity: 1.5,
    unit_price: 10.2,
    cost_price: 5.1,
    type: 'estoque',
    status: 'pendente',
    oem: 'OEM-123',
    nickname: 'Test Nick',
    code: 'C-123',
    brand: 'Test Brand',
    measurements: { inner: 10 },
    supplier_id: null,
    markup_percent: 50,
    sale_price: 15.3,
    needs_approval: false,
    approval_status: 'pending'
  }).select();
  console.log('Result:', data, 'Error:', JSON.stringify(error));
}

run();
