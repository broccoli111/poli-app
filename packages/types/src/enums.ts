export type JurisdictionLevel = 'federal' | 'state' | 'municipal';
export type BillStatus =
  | 'introduced'
  | 'in_committee'
  | 'passed_committee'
  | 'floor_vote_scheduled'
  | 'passed_one_chamber'
  | 'passed_both_chambers'
  | 'sent_to_executive'
  | 'signed'
  | 'vetoed'
  | 'enacted'
  | 'dead';
export type SentimentVote = 'support' | 'oppose' | 'neutral';
export type NotificationChannel = 'push' | 'email';
export type Chamber = 'senate' | 'house' | 'unicameral';
export type Party = 'democrat' | 'republican' | 'independent' | 'libertarian' | 'green' | 'other';
