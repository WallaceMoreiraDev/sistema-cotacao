const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length > 0) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '').replace('\r', '');
});

const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabaseAdmin = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  console.log("All emails:", usersData.users.map(u => u.email));
  const aline = usersData.users.find(u => u.email === 'aline.avelino1204@gmail.com');
  
  if (!aline) {
    console.log("Aline not found");
    return;
  }
  
  console.log("Updating password for ID:", aline.id);
  const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(aline.id, {
    password: 'testPassword123'
  });
  
  if (updateError) {
    console.error("Update error:", updateError);
    return;
  }
  
  console.log("Password updated successfully");
  
  // Now try to log in
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: 'aline.avelino1204@gmail.com',
      password: 'testPassword123'
    })
  });

  const loginData = await res.json();
  console.log("LOGIN STATUS:", res.status);
  console.log("LOGIN DATA:", loginData);
}

run();
