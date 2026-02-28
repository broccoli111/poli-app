import type { SupabaseClient } from '@supabase/supabase-js';
import type { Politician, HonestyScore, HonestyEvidence, PoliticianFunding, BillVoteMember } from '@poli/types';

export async function fetchPolitician(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from('politicians').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Politician;
}

export async function fetchPoliticianHonesty(supabase: SupabaseClient, politicianId: string) {
  const { data: score } = await supabase
    .from('honesty_scores')
    .select('*')
    .eq('politician_id', politicianId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!score) return { score: null, evidence: [] };

  const { data: evidence } = await supabase
    .from('honesty_evidence')
    .select('*')
    .eq('honesty_score_id', score.id)
    .order('created_at', { ascending: false })
    .limit(3);

  return {
    score: score as HonestyScore,
    evidence: (evidence ?? []) as HonestyEvidence[],
  };
}

export async function fetchPoliticianFunding(
  supabase: SupabaseClient,
  politicianId: string
): Promise<PoliticianFunding | null> {
  const { data } = await supabase
    .from('politician_funding')
    .select('*')
    .eq('politician_id', politicianId)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as PoliticianFunding | null;
}

export async function fetchVotingHistory(
  supabase: SupabaseClient,
  politicianId: string,
  limit = 20
) {
  const { data, error } = await supabase
    .from('bill_vote_member')
    .select('*, bills(*)')
    .eq('politician_id', politicianId)
    .order('voted_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as (BillVoteMember & { bills: any })[];
}
