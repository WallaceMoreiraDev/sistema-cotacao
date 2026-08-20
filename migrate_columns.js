const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(l => {
  const idx = l.indexOf('=');
  if (idx > 0) {
    env[l.substring(0, idx).trim()] = l.substring(idx + 1).trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
  const sqls = [
    "ALTER TABLE protocol_items ADD COLUMN IF NOT EXISTS supplier_costs JSONB DEFAULT NULL",
    "ALTER TABLE protocol_items ADD COLUMN IF NOT EXISTS oem_code TEXT DEFAULT NULL",
    "ALTER TABLE protocol_items ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL",
    "ALTER TABLE protocol_items ADD COLUMN IF NOT EXISTS product_id TEXT DEFAULT NULL",
  ];

  for (const sql of sqls) {
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
      console.log('RPC failed for:', sql, '- Error:', error.message);
      console.log('You may need to run this SQL manually in the Supabase dashboard.');
    } else {
      console.log('OK:', sql);
    }
  }
}

migrate();
