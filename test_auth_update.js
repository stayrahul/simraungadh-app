const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(url, key);

async function test() {
  // Login as admin
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    phone: '9822228722',
    password: 'password'
  });
  
  if (authErr) return console.log('Auth error:', authErr);
  
  const adminUser = auth.user;
  
  // Try to update self badges
  const { data, error } = await supabase.from('profiles').update({ badges: ['verified', 'gold'] }).eq('id', adminUser.id).select();
  console.log('Update Error:', error);
  console.log('Updated Badges:', data?.[0]?.badges);
}
test();
