/**
 * Smoke test script for Poli app.
 * Uses Supabase service role key to test basic API operations.
 *
 * Usage: npx tsx tools/smoke.ts
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY for read-only)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('=== Poli App Smoke Test ===\n');
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  FAIL: ${name} - ${err}`);
      failed++;
    }
  }

  await test('Fetch jurisdictions', async () => {
    const { data, error } = await supabase.from('jurisdictions').select('*').limit(5);
    if (error) throw error;
    console.log(`    Found ${data?.length ?? 0} jurisdictions`);
  });

  await test('Fetch bills', async () => {
    const { data, error } = await supabase.from('bills').select('*').limit(5);
    if (error) throw error;
    console.log(`    Found ${data?.length ?? 0} bills`);
  });

  await test('Fetch politicians', async () => {
    const { data, error } = await supabase.from('politicians').select('*').limit(5);
    if (error) throw error;
    console.log(`    Found ${data?.length ?? 0} politicians`);
  });

  await test('Fetch ai_summaries', async () => {
    const { data, error } = await supabase.from('ai_summaries').select('*').limit(5);
    if (error) throw error;
    console.log(`    Found ${data?.length ?? 0} AI summaries`);
  });

  await test('Fetch bill_sentiment_aggregate', async () => {
    const { data, error } = await supabase.from('bill_sentiment_aggregate').select('*').limit(5);
    if (error) throw error;
    console.log(`    Found ${data?.length ?? 0} aggregates`);
  });

  await test('Check Storage bucket bill-text', async () => {
    const { data, error } = await supabase.storage.from('bill-text').list('', { limit: 1 });
    if (error) throw error;
    console.log(`    Bucket accessible, ${data?.length ?? 0} files at root`);
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main();
