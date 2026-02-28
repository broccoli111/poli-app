import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  console.log('Testing connection to:', url);

  const { count, error } = await supabase
    .from('jurisdictions')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.log('Query error:', error.message, `(code: ${error.code})`);
    console.log('This likely means the migration has not been applied yet.');
  } else {
    console.log('Connection OK. jurisdictions count:', count);
  }
}

main();
