import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { chatCompletion } from '../_shared/llm.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabase = getServiceClient();

    const { data: politicians } = await supabase
      .from('politicians')
      .select('id, full_name, party, external')
      .limit(20);

    if (!politicians?.length) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No politicians to score' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let computed = 0;

    for (const pol of politicians) {
      const { data: votes } = await supabase
        .from('bill_vote_member')
        .select('vote, policy_tags, bills(title, status)')
        .eq('politician_id', pol.id)
        .limit(50);

      if (!votes?.length || votes.length < 3) continue;

      const voteSummary = votes
        .map((v) => {
          const bill = v.bills as { title: string; status: string } | null;
          return `Vote: ${v.vote} on "${bill?.title ?? '?'}" (status: ${bill?.status ?? '?'})`;
        })
        .join('\n');

      const response = await chatCompletion([
        {
          role: 'system',
          content:
            'You are a political analyst. Based on voting records, compute an honesty/consistency score from 0-100 ' +
            'and provide 3 evidence items. Consider: consistency with stated positions, flip-flops, ' +
            'alignment with party platform. Respond as JSON: ' +
            '{"score": 75, "evidence": [{"type": "consistent_vote|flip_flop|party_alignment", "description": "..."}]}',
        },
        {
          role: 'user',
          content: `Politician: ${pol.full_name} (${pol.party ?? 'Unknown'})\n\n${voteSummary}`,
        },
      ]);

      let parsed: { score: number; evidence: { type: string; description: string }[] };
      try {
        parsed = JSON.parse(response);
      } catch {
        continue;
      }

      const { data: scoreRow, error: scoreErr } = await supabase
        .from('honesty_scores')
        .insert({
          politician_id: pol.id,
          score: Math.max(0, Math.min(100, parsed.score)),
        })
        .select('id')
        .single();

      if (scoreErr || !scoreRow) continue;

      for (const ev of parsed.evidence.slice(0, 3)) {
        await supabase.from('honesty_evidence').insert({
          honesty_score_id: scoreRow.id,
          evidence_type: ev.type,
          description: ev.description,
        });
      }

      computed++;
    }

    return new Response(
      JSON.stringify({ ok: true, computed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
