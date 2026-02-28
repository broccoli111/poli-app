import type { SupabaseClient } from '@supabase/supabase-js';
import type { SentimentVote, UserBillSentiment, BillSentimentAggregate } from '@poli/types';

export async function getUserSentiment(
  supabase: SupabaseClient,
  userId: string,
  billId: string
): Promise<UserBillSentiment | null> {
  const { data, error } = await supabase
    .from('user_bill_sentiment')
    .select('*')
    .eq('user_id', userId)
    .eq('bill_id', billId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function submitSentiment(
  supabase: SupabaseClient,
  userId: string,
  billId: string,
  vote: SentimentVote,
  jurisdictionId: string
) {
  const { data: existing } = await supabase
    .from('user_bill_sentiment')
    .select('id, vote')
    .eq('user_id', userId)
    .eq('bill_id', billId)
    .maybeSingle();

  const oldVote = existing?.vote as SentimentVote | undefined;

  if (existing) {
    const { error } = await supabase
      .from('user_bill_sentiment')
      .update({ vote, voted_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('user_bill_sentiment')
      .insert({ user_id: userId, bill_id: billId, vote });
    if (error) throw error;
  }

  await updateAggregate(supabase, billId, jurisdictionId, vote, oldVote);
}

async function updateAggregate(
  supabase: SupabaseClient,
  billId: string,
  jurisdictionId: string,
  newVote: SentimentVote,
  oldVote?: SentimentVote
) {
  const { data: agg } = await supabase
    .from('bill_sentiment_aggregate')
    .select('*')
    .eq('bill_id', billId)
    .eq('jurisdiction_id', jurisdictionId)
    .maybeSingle();

  const current: BillSentimentAggregate = agg ?? {
    id: '',
    bill_id: billId,
    jurisdiction_id: jurisdictionId,
    support_count: 0,
    oppose_count: 0,
    neutral_count: 0,
    total_votes: 0,
    updated_at: new Date().toISOString(),
  };

  if (oldVote) {
    if (oldVote === 'support') current.support_count = Math.max(0, current.support_count - 1);
    if (oldVote === 'oppose') current.oppose_count = Math.max(0, current.oppose_count - 1);
    if (oldVote === 'neutral') current.neutral_count = Math.max(0, current.neutral_count - 1);
    current.total_votes = Math.max(0, current.total_votes - 1);
  }

  if (newVote === 'support') current.support_count++;
  if (newVote === 'oppose') current.oppose_count++;
  if (newVote === 'neutral') current.neutral_count++;
  current.total_votes++;

  if (agg) {
    const { error } = await supabase
      .from('bill_sentiment_aggregate')
      .update({
        support_count: current.support_count,
        oppose_count: current.oppose_count,
        neutral_count: current.neutral_count,
        total_votes: current.total_votes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agg.id);
    if (error) console.error('Failed to update aggregate:', error.message);
  } else {
    const { error } = await supabase.from('bill_sentiment_aggregate').insert({
      bill_id: billId,
      jurisdiction_id: jurisdictionId,
      support_count: current.support_count,
      oppose_count: current.oppose_count,
      neutral_count: current.neutral_count,
      total_votes: current.total_votes,
    });
    if (error) console.error('Failed to insert aggregate:', error.message);
  }
}

export async function fetchAggregate(
  supabase: SupabaseClient,
  billId: string,
  jurisdictionId: string
): Promise<BillSentimentAggregate | null> {
  const { data, error } = await supabase
    .from('bill_sentiment_aggregate')
    .select('*')
    .eq('bill_id', billId)
    .eq('jurisdiction_id', jurisdictionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
