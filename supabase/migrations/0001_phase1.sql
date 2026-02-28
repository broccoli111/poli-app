-- Phase 1 Schema Migration
-- Creates all tables needed for the civic app MVP

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Jurisdictions
CREATE TABLE IF NOT EXISTS jurisdictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level TEXT NOT NULL CHECK (level IN ('federal', 'state', 'municipal')),
  state_code TEXT,
  district_number TEXT,
  city_name TEXT,
  fips_code TEXT,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jurisdictions_level ON jurisdictions(level);
CREATE INDEX idx_jurisdictions_state ON jurisdictions(state_code);

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  spectrum_score NUMERIC,
  alignment_radar JSONB,
  watched_categories TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Addresses
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state_code TEXT NOT NULL,
  zip TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC,
  federal_house TEXT,
  federal_senate TEXT,
  state_upper TEXT,
  state_lower TEXT,
  city_jurisdiction_id UUID REFERENCES jurisdictions(id),
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_addresses_user ON addresses(user_id);

-- Bills
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jurisdiction_id UUID NOT NULL REFERENCES jurisdictions(id),
  external_id TEXT,
  bill_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'introduced'
    CHECK (status IN ('introduced','in_committee','passed_committee','floor_vote_scheduled',
      'passed_one_chamber','passed_both_chambers','sent_to_executive','signed','vetoed','enacted','dead')),
  status_date TIMESTAMPTZ,
  introduced_date TIMESTAMPTZ,
  expected_vote_date TIMESTAMPTZ,
  source_url TEXT,
  external JSONB,
  previous_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bills_jurisdiction ON bills(jurisdiction_id);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_external ON bills(external_id);

-- Bill text versions
CREATE TABLE IF NOT EXISTS bill_text_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL DEFAULT 'latest',
  storage_path TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_btv_bill ON bill_text_versions(bill_id);

-- Bill categories / policy tags
CREATE TABLE IF NOT EXISTS bill_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bc_bill ON bill_categories(bill_id);
CREATE INDEX idx_bc_category ON bill_categories(category);

-- AI summaries
CREATE TABLE IF NOT EXISTS ai_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  grade_level NUMERIC NOT NULL DEFAULT 5,
  themes TEXT[] DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_bill ON ai_summaries(bill_id);

-- Politicians
CREATE TABLE IF NOT EXISTS politicians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  party TEXT,
  chamber TEXT CHECK (chamber IN ('senate','house','unicameral')),
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  photo_url TEXT,
  bio TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  external JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_politicians_jurisdiction ON politicians(jurisdiction_id);

-- Bill vote members (how politicians voted)
CREATE TABLE IF NOT EXISTS bill_vote_member (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
  vote TEXT NOT NULL,
  policy_tags TEXT[],
  voted_at TIMESTAMPTZ
);

CREATE INDEX idx_bvm_bill ON bill_vote_member(bill_id);
CREATE INDEX idx_bvm_politician ON bill_vote_member(politician_id);

-- User bill sentiment
CREATE TABLE IF NOT EXISTS user_bill_sentiment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('support','oppose','neutral')),
  vote_score NUMERIC,
  final_score NUMERIC,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_vote_at TIMESTAMPTZ,
  UNIQUE(user_id, bill_id)
);

CREATE INDEX idx_ubs_user ON user_bill_sentiment(user_id);
CREATE INDEX idx_ubs_bill ON user_bill_sentiment(bill_id);

-- Bill sentiment aggregate
CREATE TABLE IF NOT EXISTS bill_sentiment_aggregate (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  jurisdiction_id UUID NOT NULL REFERENCES jurisdictions(id),
  support_count INT NOT NULL DEFAULT 0,
  oppose_count INT NOT NULL DEFAULT 0,
  neutral_count INT NOT NULL DEFAULT 0,
  total_votes INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bill_id, jurisdiction_id)
);

-- Honesty scores
CREATE TABLE IF NOT EXISTS honesty_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hs_politician ON honesty_scores(politician_id);

-- Honesty evidence
CREATE TABLE IF NOT EXISTS honesty_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  honesty_score_id UUID NOT NULL REFERENCES honesty_scores(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL,
  description TEXT NOT NULL,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Politician funding
CREATE TABLE IF NOT EXISTS politician_funding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
  cycle TEXT NOT NULL,
  total_raised NUMERIC,
  total_spent NUMERIC,
  top_donors JSONB,
  top_pacs JSONB,
  source TEXT NOT NULL DEFAULT 'fec',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pf_politician ON politician_funding(politician_id);

-- User bookmarks
CREATE TABLE IF NOT EXISTS user_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, bill_id)
);

-- Survey responses
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  spectrum_score NUMERIC NOT NULL,
  alignment_radar JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sr_user ON survey_responses(user_id);

-- District population
CREATE TABLE IF NOT EXISTS district_population (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jurisdiction_id UUID NOT NULL REFERENCES jurisdictions(id) UNIQUE,
  population_total INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_user ON notifications(user_id);

-- Notification prefs
CREATE TABLE IF NOT EXISTS user_notification_prefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  bill_status_change BOOLEAN NOT NULL DEFAULT true,
  weekly_digest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Push tokens
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'expo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Notification deliveries
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error TEXT
);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_text_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE politicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_vote_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bill_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_sentiment_aggregate ENABLE ROW LEVEL SECURITY;
ALTER TABLE honesty_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE honesty_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE politician_funding ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE district_population ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisdictions ENABLE ROW LEVEL SECURITY;

-- Public read tables
CREATE POLICY "Public read jurisdictions" ON jurisdictions FOR SELECT USING (true);
CREATE POLICY "Public read bills" ON bills FOR SELECT USING (true);
CREATE POLICY "Public read bill_text_versions" ON bill_text_versions FOR SELECT USING (true);
CREATE POLICY "Public read bill_categories" ON bill_categories FOR SELECT USING (true);
CREATE POLICY "Public read ai_summaries" ON ai_summaries FOR SELECT USING (true);
CREATE POLICY "Public read politicians" ON politicians FOR SELECT USING (true);
CREATE POLICY "Public read bill_vote_member" ON bill_vote_member FOR SELECT USING (true);
CREATE POLICY "Public read bill_sentiment_aggregate" ON bill_sentiment_aggregate FOR SELECT USING (true);
CREATE POLICY "Public read honesty_scores" ON honesty_scores FOR SELECT USING (true);
CREATE POLICY "Public read honesty_evidence" ON honesty_evidence FOR SELECT USING (true);
CREATE POLICY "Public read politician_funding" ON politician_funding FOR SELECT USING (true);
CREATE POLICY "Public read district_population" ON district_population FOR SELECT USING (true);

-- User-owned tables
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users read own addresses" ON addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own addresses" ON addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own addresses" ON addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own addresses" ON addresses FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users read own sentiment" ON user_bill_sentiment FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sentiment" ON user_bill_sentiment FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sentiment" ON user_bill_sentiment FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users read own bookmarks" ON user_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bookmarks" ON user_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own bookmarks" ON user_bookmarks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users read own survey" ON survey_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own survey" ON survey_responses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users read own notification_prefs" ON user_notification_prefs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notification_prefs" ON user_notification_prefs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notification_prefs" ON user_notification_prefs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users read own push_tokens" ON user_push_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own push_tokens" ON user_push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own push_tokens" ON user_push_tokens FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users read own deliveries" ON notification_deliveries FOR SELECT
  USING (notification_id IN (SELECT id FROM notifications WHERE user_id = auth.uid()));

-- Service-role only write policies for ingestion tables
-- (Edge Functions use service_role key, bypassing RLS)

-- Storage bucket for bill text
INSERT INTO storage.buckets (id, name, public) VALUES ('bill-text', 'bill-text', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated read bill-text" ON storage.objects
  FOR SELECT USING (bucket_id = 'bill-text' AND auth.role() = 'authenticated');
