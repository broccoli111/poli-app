import type {
  JurisdictionLevel,
  BillStatus,
  SentimentVote,
  Chamber,
  Party,
} from './enums';

export interface Jurisdiction {
  id: string;
  level: JurisdictionLevel;
  state_code: string | null;
  district_number: string | null;
  city_name: string | null;
  fips_code: string | null;
  name: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  spectrum_score: number | null;
  alignment_radar: Record<string, number> | null;
  watched_categories: string[];
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  line1: string;
  line2: string | null;
  city: string;
  state_code: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  federal_house: string | null;
  federal_senate: string | null;
  state_upper: string | null;
  state_lower: string | null;
  city_jurisdiction_id: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface Bill {
  id: string;
  jurisdiction_id: string;
  external_id: string | null;
  bill_number: string;
  title: string;
  description: string | null;
  status: BillStatus;
  status_date: string | null;
  introduced_date: string | null;
  expected_vote_date: string | null;
  source_url: string | null;
  external: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface BillCategory {
  id: string;
  bill_id: string;
  category: string;
  confidence: number | null;
  created_at: string;
}

export interface BillTextVersion {
  id: string;
  bill_id: string;
  version_label: string;
  storage_path: string;
  fetched_at: string;
}

export interface AiSummary {
  id: string;
  bill_id: string;
  summary_text: string;
  grade_level: number;
  themes: string[];
  generated_at: string;
}

export interface UserBillSentiment {
  id: string;
  user_id: string;
  bill_id: string;
  vote: SentimentVote;
  vote_score: number | null;
  final_score: number | null;
  voted_at: string;
  confirmed_vote_at: string | null;
}

export interface BillSentimentAggregate {
  id: string;
  bill_id: string;
  jurisdiction_id: string;
  support_count: number;
  oppose_count: number;
  neutral_count: number;
  total_votes: number;
  updated_at: string;
}

export interface Politician {
  id: string;
  full_name: string;
  party: Party | null;
  chamber: Chamber | null;
  jurisdiction_id: string | null;
  photo_url: string | null;
  bio: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  external: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface HonestyScore {
  id: string;
  politician_id: string;
  score: number;
  computed_at: string;
}

export interface HonestyEvidence {
  id: string;
  honesty_score_id: string;
  evidence_type: string;
  description: string;
  source_url: string | null;
  created_at: string;
}

export interface PoliticianFunding {
  id: string;
  politician_id: string;
  cycle: string;
  total_raised: number | null;
  total_spent: number | null;
  top_donors: Record<string, unknown>[] | null;
  top_pacs: Record<string, unknown>[] | null;
  source: string;
  fetched_at: string;
}

export interface UserNotificationPref {
  id: string;
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  bill_status_change: boolean;
  weekly_digest: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPushToken {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export interface NotificationDelivery {
  id: string;
  notification_id: string;
  channel: string;
  status: string;
  sent_at: string | null;
  error: string | null;
}

export interface UserBookmark {
  id: string;
  user_id: string;
  bill_id: string;
  created_at: string;
}

export interface SurveyResponse {
  id: string;
  user_id: string;
  responses: Record<string, string>;
  spectrum_score: number;
  alignment_radar: Record<string, number> | null;
  created_at: string;
}

export interface DistrictPopulation {
  id: string;
  jurisdiction_id: string;
  population_total: number;
  updated_at: string;
}

export interface BillVoteMember {
  id: string;
  bill_id: string;
  politician_id: string;
  vote: string;
  policy_tags: string[] | null;
  voted_at: string | null;
}
