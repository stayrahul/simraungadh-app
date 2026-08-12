const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(url, key);

async function test() {
  const { data: user, error: selErr } = await supabase.from('profiles').select('*').limit(1).single();
  if (selErr) return console.log('selErr', selErr);
  
  console.log('Original badges:', user.badges);
  const { data, error } = await supabase.from('profiles').update({ badges: ['verified', 'gold'] }).eq('id', user.id).select();
  console.log('Update Error:', error);
  console.log('Updated Badges:', data?.[0]?.badges);
}
test();
