import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

const FEC_API_KEY = Deno.env.get('FEC_API_KEY') ?? '';
const FEC_BASE = 'https://api.open.fec.gov/v1';
const FEATURE_FEC = Deno.env.get('FEATURE_FEC_FUNDING') !== 'false';

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (!FEATURE_FEC || !FEC_API_KEY) {
    return new Response(
      JSON.stringify({ ok: false, message: 'FEC funding feature disabled or no API key' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = getServiceClient();
    const url = new URL(req.url);
    const politicianId = url.searchParams.get('politician_id');

    if (!politicianId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'politician_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: politician } = await supabase
      .from('politicians')
      .select('id, full_name, chamber, external')
      .eq('id', politicianId)
      .single();

    if (!politician) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Politician not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ext = politician.external as Record<string, unknown> | null;
    const fecCandidateId = ext?.fec_candidate_id as string | undefined;

    if (!fecCandidateId) {
      const searchUrl = `${FEC_BASE}/candidates/search/?q=${encodeURIComponent(politician.full_name)}&api_key=${FEC_API_KEY}`;
      const searchRes = await fetch(searchUrl);

      if (!searchRes.ok) {
        return new Response(
          JSON.stringify({ ok: false, error: 'FEC search failed' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const searchData = await searchRes.json();
      const candidates = searchData.results ?? [];

      if (!candidates.length) {
        return new Response(
          JSON.stringify({ ok: true, data: null, message: 'No FEC candidate match found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const candidateId = candidates[0].candidate_id;

      await supabase
        .from('politicians')
        .update({ external: { ...ext, fec_candidate_id: candidateId } })
        .eq('id', politicianId);

      return await fetchAndCacheFunding(supabase, politicianId, candidateId);
    }

    return await fetchAndCacheFunding(supabase, politicianId, fecCandidateId);
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchAndCacheFunding(
  supabase: ReturnType<typeof getServiceClient>,
  politicianId: string,
  fecCandidateId: string
) {
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const { data: cached } = await supabase
    .from('politician_funding')
    .select('*')
    .eq('politician_id', politicianId)
    .gte('fetched_at', oneDayAgo)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    return new Response(
      JSON.stringify({ ok: true, data: cached }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const totalsUrl = `${FEC_BASE}/candidate/${fecCandidateId}/totals/?api_key=${FEC_API_KEY}`;
  const totalsRes = await fetch(totalsUrl);

  let totalRaised = null;
  let totalSpent = null;
  let cycle = 'unknown';

  if (totalsRes.ok) {
    const totalsData = await totalsRes.json();
    const results = totalsData.results ?? [];
    if (results.length > 0) {
      totalRaised = results[0].receipts;
      totalSpent = results[0].disbursements;
      cycle = String(results[0].cycle ?? 'unknown');
    }
  }

  const topDonors: Record<string, unknown>[] = [];
  const topPacs: Record<string, unknown>[] = [];

  try {
    const contribUrl = `${FEC_BASE}/schedules/schedule_a/?committee_id=${fecCandidateId}&sort=-contribution_receipt_amount&per_page=5&api_key=${FEC_API_KEY}`;
    const contribRes = await fetch(contribUrl);
    if (contribRes.ok) {
      const contribData = await contribRes.json();
      for (const r of (contribData.results ?? []).slice(0, 5)) {
        topDonors.push({
          name: r.contributor_name,
          amount: r.contribution_receipt_amount,
          type: r.entity_type,
        });
      }
    }
  } catch {
    // non-critical
  }

  const { data: funding } = await supabase
    .from('politician_funding')
    .insert({
      politician_id: politicianId,
      cycle,
      total_raised: totalRaised,
      total_spent: totalSpent,
      top_donors: topDonors,
      top_pacs: topPacs,
      source: 'fec',
    })
    .select('*')
    .single();

  return new Response(
    JSON.stringify({ ok: true, data: funding }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
