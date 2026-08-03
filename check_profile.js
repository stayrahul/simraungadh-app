const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kwxjrlzmctonmdgdqdoi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3eGpybHptY3Rvbm1kZ2RxZG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNjkzMTMsImV4cCI6MjA5OTk0NTMxM30.qMX1reIrfNMqwaGo-SyCAMj8nq5V09tI4QIjmXWpZnk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', '3985cec0-df81-4b60-ba29-1730af5490f9');
  console.log('Profile Data:', data);
  console.log('Error:', error);
}

check();
