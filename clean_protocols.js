require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanProtocols() {
  const { error: errLogs } = await supabase.from('protocol_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errLogs) console.error('Erro ao limpar protocol_logs:', errLogs.message);
  else console.log('protocol_logs limpo com sucesso.');
}

cleanProtocols();
