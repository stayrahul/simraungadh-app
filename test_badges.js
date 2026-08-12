const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log(data[0].badges);
  console.log('isArray?', Array.isArray(data[0].badges));
}
test();
