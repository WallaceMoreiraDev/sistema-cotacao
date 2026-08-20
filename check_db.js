require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const res = await supabase.from('protocol_items').select('*').limit(1);
  if (res.error) console.error(res.error);
  if (res.data && res.data.length > 0) {
    console.log("Columns:", Object.keys(res.data[0]));
  } else {
    console.log("No data, but query succeeded");
  }
}
run();
