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
        JSON.stringify({ ok: true, message: 'No politicians to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;

    for (const pol of politicians) {
      const { data: votes } = await supabase
        .from('bill_vote_member')
        .select('vote, policy_tags, bills(title)')
        .eq('politician_id', pol.id)
        .limit(30);

      if (!votes?.length) continue;

      const voteSummary = votes
        .map((v) => {
          const bill = v.bills as { title: string } | null;
          return `${v.vote} on "${bill?.title ?? 'Unknown'}" (tags: ${(v.policy_tags ?? []).join(', ')})`;
        })
        .join('\n');

      const response = await chatCompletion([
        {
          role: 'system',
          content:
            'Given a politician\'s voting record, extract their top 5 policy themes and positions. ' +
            'Respond as JSON: {"themes": [{"theme": "...", "position": "supports|opposes|mixed"}]}',
        },
        {
          role: 'user',
          content: `Politician: ${pol.full_name} (${pol.party ?? 'Unknown party'})\n\nVoting record:\n${voteSummary}`,
        },
      ]);

      const ext = (pol.external ?? {}) as Record<string, unknown>;
      try {
        const parsed = JSON.parse(response);
        ext.policy_themes = parsed.themes;
      } catch {
        ext.policy_themes = [];
      }

      await supabase
        .from('politicians')
        .update({ external: ext })
        .eq('id', pol.id);

      processed++;
    }

    return new Response(
      JSON.stringify({ ok: true, processed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
