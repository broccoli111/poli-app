# Poli - Civic Engagement App

A cross-platform civic engagement app for tracking bills, voting on policy, and engaging with elected representatives.

## Architecture

```
poli-app/
├── apps/
│   ├── mobile/          # Expo React Native (iOS/Android)
│   └── web/             # Next.js (web)
├── packages/
│   ├── types/           # Shared Zod schemas + TypeScript types
│   ├── lib/             # Supabase client, API helpers, scoring
│   └── ui/              # Shared React Native components
├── supabase/
│   ├── migrations/      # SQL migrations
│   ├── functions/       # Edge Functions (Deno)
│   └── cron/            # Cron scheduling SQL
└── tools/
    └── smoke.ts         # API smoke test script
```

## Quick Start

### Prerequisites

- Node.js >= 18
- pnpm (`npm i -g pnpm`)
- Supabase CLI (`npm i -g supabase`)
- A Supabase project (create at supabase.com)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` at the workspace root and in each app:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

Fill in your Supabase project URL, anon key, and service role key.

### 3. Apply Supabase Migrations

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or manually:

```bash
supabase migration up --linked
```

### 4. Deploy Edge Functions

```bash
supabase functions deploy ingest_federal_bills
supabase functions deploy ingest_state_bills
supabase functions deploy ingest_bill_text
supabase functions deploy generate_ai_summaries
supabase functions deploy tag_policy
supabase functions deploy extract_politician_themes
supabase functions deploy recompute_honesty_scores
supabase functions deploy detect_status_changes_and_notify
supabase functions deploy fetch_fec_funding
```

Set required secrets:

```bash
supabase secrets set CONGRESS_API_KEY=your-key
supabase secrets set OPENSTATES_API_KEY=your-key
supabase secrets set LLM_API_BASE=https://api.openai.com/v1
supabase secrets set LLM_API_KEY=your-key
supabase secrets set LLM_MODEL=gpt-4o-mini
supabase secrets set FEC_API_KEY=your-key
supabase secrets set EXPO_ACCESS_TOKEN=your-token
supabase secrets set RESEND_API_KEY=your-key
supabase secrets set NOTIFICATION_FROM_EMAIL=noreply@yourapp.com
```

### 5. Set Up Cron Jobs

Edit `supabase/cron/nightly.sql`, replacing `PROJECT_REF` with your project ref, then run:

```bash
psql YOUR_DATABASE_URL -f supabase/cron/nightly.sql
```

### 6. Start Development

**Web:**
```bash
pnpm dev:web
```

**Mobile:**
```bash
pnpm dev:mobile
```

## Key Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm dev:web` | Start Next.js dev server |
| `pnpm dev:mobile` | Start Expo dev server |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run unit tests |
| `pnpm smoke` | Run API smoke tests (needs env vars) |
| `pnpm build:web` | Build Next.js for production |

## Features (Phase 1)

### Authentication
- Email/password signup and signin
- Magic link signin
- OAuth: Google (web + mobile), Apple (mobile)
- Profile + notification prefs auto-created on first login

### Address Onboarding
- Required before app use
- Stores address with state, city, and district placeholders
- Drives bill/representative relevance filtering

### Policy Survey
- 10 questions: agree/neutral/disagree
- Computes political spectrum score (0-100)
- Generates party alignment radar (5 parties)
- Results stored on profile

### Bill Feed
- Filtered by user jurisdiction (state + federal)
- Bookmark bills (star icon)
- Eye indicator for watched categories or bookmarked bills
- Category chips from AI tagging

### Bill Detail
- Header with expected vote date
- Policy category chips
- Tabs: AI Summary / Original Text
- Sticky sentiment voting (support/oppose/neutral)
- Contact representative email template
- Community sentiment bar with participation rate

### Politician Profiles
- Basic info: name, party, chamber, contact
- Honesty score (0-100) with top 3 evidence items
- Campaign funding (federal via FEC): total raised/spent, top donors
- "Funding data not available" for non-federal politicians
- Voting history list

### Notifications
- Push token registration (Expo)
- Email + push toggles per user
- Bill status change detection
- In-app notification list with read state

### Report Issue
- mailto: button with context
- Controlled by `REPORT_TO_EMAIL` env var

## Data Pipeline

Runs nightly via pg_cron (see `supabase/cron/nightly.sql`):

1. **1:00 AM** - Ingest federal bills (Congress.gov API)
2. **1:15 AM** - Ingest state bills (OpenStates API)
3. **1:30 AM** - Ingest bill text (stored in Supabase Storage)
4. **2:00 AM** - Generate AI summaries (grade 5 reading level)
5. **2:30 AM** - Tag policy categories
6. **3:00 AM** - Extract politician themes
7. **3:15 AM** - Recompute honesty scores
8. **3:30 AM** - Detect status changes and send notifications

## Database Schema

See `supabase/migrations/0001_phase1.sql` for the full schema including:

- `jurisdictions` - Federal, state, municipal levels
- `profiles` - User profiles with spectrum score
- `addresses` - User addresses for jurisdiction mapping
- `bills` - Legislation with status tracking
- `bill_categories` - AI-tagged policy categories
- `bill_text_versions` - Bill text stored in Supabase Storage
- `ai_summaries` - Grade 5 summaries with themes
- `politicians` - Elected officials
- `honesty_scores` / `honesty_evidence` - Computed integrity scores
- `politician_funding` - FEC campaign finance data
- `user_bill_sentiment` - Individual votes
- `bill_sentiment_aggregate` - District-level aggregates
- `notifications` - In-app notifications
- `user_notification_prefs` - Push/email toggles
- `user_push_tokens` - Expo push tokens
- `user_bookmarks` - Saved bills
- `survey_responses` - Survey answers + computed scores

All tables have Row Level Security (RLS) enabled.

## Tech Stack

- **Frontend:** React Native (Expo) + Next.js
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Language:** TypeScript (strict mode)
- **Package Manager:** pnpm workspaces
- **Testing:** Vitest
- **AI:** OpenAI-compatible API for summaries + tagging
