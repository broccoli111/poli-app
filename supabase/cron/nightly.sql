-- Nightly ingestion & processing pipeline
--
-- PREREQUISITES:
-- 1. Enable pg_cron and pg_net extensions in your Supabase dashboard:
--    Database > Extensions > search "pg_cron" and "pg_net" > Enable
--
-- 2. Store the service role key as a database setting:
--    Run this in the SQL editor (replace with your actual key):
--
--    ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key-here';
--
-- 3. cywzijedttqyqjtiexal is set to: cywzijedttqyqjtiexal
--    If you change projects, update all URLs below.

-- Step 1: Ingest federal bills at 1:00 AM UTC
SELECT cron.schedule(
  'ingest-federal-bills',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cywzijedttqyqjtiexal.supabase.co/functions/v1/ingest_federal_bills',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Step 2: Ingest state bills at 1:15 AM UTC
SELECT cron.schedule(
  'ingest-state-bills',
  '15 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cywzijedttqyqjtiexal.supabase.co/functions/v1/ingest_state_bills',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Step 3: Ingest bill text at 1:30 AM UTC
SELECT cron.schedule(
  'ingest-bill-text',
  '30 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cywzijedttqyqjtiexal.supabase.co/functions/v1/ingest_bill_text',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Step 4: Generate AI summaries at 2:00 AM UTC
SELECT cron.schedule(
  'generate-ai-summaries',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cywzijedttqyqjtiexal.supabase.co/functions/v1/generate_ai_summaries',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Step 5: Tag policy categories at 2:30 AM UTC
SELECT cron.schedule(
  'tag-policy',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cywzijedttqyqjtiexal.supabase.co/functions/v1/tag_policy',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Step 6: Extract politician themes at 3:00 AM UTC
SELECT cron.schedule(
  'extract-politician-themes',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cywzijedttqyqjtiexal.supabase.co/functions/v1/extract_politician_themes',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Step 7: Recompute honesty scores at 3:15 AM UTC
SELECT cron.schedule(
  'recompute-honesty-scores',
  '15 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cywzijedttqyqjtiexal.supabase.co/functions/v1/recompute_honesty_scores',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Step 8: Detect status changes and notify at 3:30 AM UTC
SELECT cron.schedule(
  'detect-status-changes',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cywzijedttqyqjtiexal.supabase.co/functions/v1/detect_status_changes_and_notify',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
