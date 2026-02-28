import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const c = createClient(url, key);

async function main() {
  console.log('Verifying migration on:', url, '\n');

  const { count: jCount } = await c.from('jurisdictions').select('*', { count: 'exact', head: true });
  console.log('jurisdictions:', jCount, 'rows');

  const { data: sample } = await c.from('jurisdictions').select('level, name, state_code').limit(5);
  console.log('Sample:', JSON.stringify(sample, null, 2));

  const tables = [
    'profiles', 'addresses', 'bills', 'bill_text_versions', 'bill_categories',
    'ai_summaries', 'politicians', 'bill_vote_member', 'user_bill_sentiment',
    'bill_sentiment_aggregate', 'honesty_scores', 'honesty_evidence',
    'politician_funding', 'user_bookmarks', 'survey_responses',
    'district_population', 'notifications', 'user_notification_prefs',
    'user_push_tokens', 'notification_deliveries',
  ];

  console.log('\nTable check:');
  let allOk = true;
  for (const t of tables) {
    const { error } = await c.from(t).select('*', { count: 'exact', head: true });
    const status = error ? `ERROR: ${error.message}` : 'OK';
    if (error) allOk = false;
    console.log(`  ${t}: ${status}`);
  }

  console.log(allOk ? '\nAll tables exist and are accessible.' : '\nSome tables have issues.');
}

main();
