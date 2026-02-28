import type { SupabaseClient } from '@supabase/supabase-js';
import type { Bill, BillCategory, AiSummary, BillTextVersion, UserBookmark } from '@poli/types';

export async function fetchBillsForUser(
  supabase: SupabaseClient,
  opts: { state_code: string; jurisdictionIds: string[]; watchedCategories: string[]; limit?: number; offset?: number }
) {
  let query = supabase
    .from('bills')
    .select('*, bill_categories(*)')
    .in('jurisdiction_id', opts.jurisdictionIds)
    .order('updated_at', { ascending: false })
    .range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 20) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data as (Bill & { bill_categories: BillCategory[] })[];
}

export async function fetchBillDetail(supabase: SupabaseClient, billId: string) {
  const { data, error } = await supabase
    .from('bills')
    .select('*, bill_categories(*), ai_summaries(*), bill_text_versions(*)')
    .eq('id', billId)
    .single();
  if (error) throw error;
  return data as Bill & {
    bill_categories: BillCategory[];
    ai_summaries: AiSummary[];
    bill_text_versions: BillTextVersion[];
  };
}

export async function fetchUserBookmarks(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('user_bookmarks')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data as UserBookmark[];
}

export async function toggleBookmark(
  supabase: SupabaseClient,
  userId: string,
  billId: string,
  isBookmarked: boolean
) {
  if (isBookmarked) {
    const { error } = await supabase
      .from('user_bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('bill_id', billId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('user_bookmarks')
      .insert({ user_id: userId, bill_id: billId });
    if (error) throw error;
  }
}

export async function getBillTextSignedUrl(
  supabase: SupabaseClient,
  storagePath: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('bill-text')
    .createSignedUrl(storagePath, 3600);
  if (error) return null;
  return data.signedUrl;
}
