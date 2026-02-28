import { z } from 'zod';

export const JurisdictionLevelSchema = z.enum(['federal', 'state', 'municipal']);
export const BillStatusSchema = z.enum([
  'introduced',
  'in_committee',
  'passed_committee',
  'floor_vote_scheduled',
  'passed_one_chamber',
  'passed_both_chambers',
  'sent_to_executive',
  'signed',
  'vetoed',
  'enacted',
  'dead',
]);
export const SentimentVoteSchema = z.enum(['support', 'oppose', 'neutral']);
export const ChamberSchema = z.enum(['senate', 'house', 'unicameral']);
export const PartySchema = z.enum([
  'democrat',
  'republican',
  'independent',
  'libertarian',
  'green',
  'other',
]);

export const AddressInputSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state_code: z.string().length(2),
  zip: z.string().min(5).max(10),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const BillSchema = z.object({
  id: z.string().uuid(),
  jurisdiction_id: z.string().uuid(),
  external_id: z.string().nullable(),
  bill_number: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: BillStatusSchema,
  status_date: z.string().nullable(),
  introduced_date: z.string().nullable(),
  expected_vote_date: z.string().nullable(),
  source_url: z.string().nullable(),
  external: z.record(z.unknown()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const BillCategorySchema = z.object({
  id: z.string().uuid(),
  bill_id: z.string().uuid(),
  category: z.string(),
  confidence: z.number().nullable(),
  created_at: z.string(),
});

export const AiSummarySchema = z.object({
  id: z.string().uuid(),
  bill_id: z.string().uuid(),
  summary_text: z.string(),
  grade_level: z.number(),
  themes: z.array(z.string()),
  generated_at: z.string(),
});

export const SentimentAggregateSchema = z.object({
  id: z.string().uuid(),
  bill_id: z.string().uuid(),
  jurisdiction_id: z.string().uuid(),
  support_count: z.number(),
  oppose_count: z.number(),
  neutral_count: z.number(),
  total_votes: z.number(),
  updated_at: z.string(),
});

export const PoliticianSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  party: PartySchema.nullable(),
  chamber: ChamberSchema.nullable(),
  jurisdiction_id: z.string().uuid().nullable(),
  photo_url: z.string().nullable(),
  bio: z.string().nullable(),
  website: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  external: z.record(z.unknown()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const HonestyScoreSchema = z.object({
  id: z.string().uuid(),
  politician_id: z.string().uuid(),
  score: z.number(),
  computed_at: z.string(),
});

export const HonestyEvidenceSchema = z.object({
  id: z.string().uuid(),
  honesty_score_id: z.string().uuid(),
  evidence_type: z.string(),
  description: z.string(),
  source_url: z.string().nullable(),
  created_at: z.string(),
});

export const FundingSchema = z.object({
  id: z.string().uuid(),
  politician_id: z.string().uuid(),
  cycle: z.string(),
  total_raised: z.number().nullable(),
  total_spent: z.number().nullable(),
  top_donors: z.array(z.record(z.unknown())).nullable(),
  top_pacs: z.array(z.record(z.unknown())).nullable(),
  source: z.string(),
  fetched_at: z.string(),
});

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  spectrum_score: z.number().nullable(),
  alignment_radar: z.record(z.number()).nullable(),
  watched_categories: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
});

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.unknown()).nullable(),
  read: z.boolean(),
  created_at: z.string(),
});

export type AddressInput = z.infer<typeof AddressInputSchema>;
export type BillParsed = z.infer<typeof BillSchema>;
export type ProfileParsed = z.infer<typeof ProfileSchema>;
