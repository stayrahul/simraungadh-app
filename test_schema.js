const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://kwxjrlzmctonmdgdqdoi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3eGpybHptY3Rvbm1kZ2RxZG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNjkzMTMsImV4cCI6MjA5OTk0NTMxM30.qMX1reIrfNMqwaGo-SyCAMj8nq5V09tI4QIjmXWpZnk');

async function test() {
  const { data, error } = await supabase
    .from('issue_comments')
    .select('*')
    .limit(1);
  console.log('Data:', data);
  if (error) console.error('Error:', error);
}

test();
