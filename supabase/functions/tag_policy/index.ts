import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { chatCompletion } from '../_shared/llm.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabase = getServiceClient();

    const { data: summaries } = await supabase
      .from('ai_summaries')
      .select('bill_id, summary_text, themes')
      .order('generated_at', { ascending: false })
      .limit(50);

    if (!summaries?.length) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No summaries to tag' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let tagged = 0;

    for (const summary of summaries) {
      const { data: existing } = await supabase
        .from('bill_categories')
        .select('id')
        .eq('bill_id', summary.bill_id)
        .limit(1);

      if (existing?.length) continue;

      const response = await chatCompletion([
        {
          role: 'system',
          content:
            'You are a policy categorizer. Given a bill summary and themes, assign 1-5 policy categories. ' +
            'Use standard categories like: Healthcare, Education, Environment, Defense, Economy, ' +
            'Immigration, Technology, Criminal Justice, Infrastructure, Civil Rights, Agriculture, ' +
            'Energy, Housing, Foreign Policy, Labor, Taxes, Social Services. ' +
            'Respond as JSON: [{"category": "...", "confidence": 0.0-1.0}]',
        },
        {
          role: 'user',
          content: `Summary: ${summary.summary_text}\nThemes: ${(summary.themes ?? []).join(', ')}`,
        },
      ]);

      let categories: { category: string; confidence: number }[];
      try {
        categories = JSON.parse(response);
      } catch {
        categories = [{ category: 'Uncategorized', confidence: 0.5 }];
      }

      for (const cat of categories) {
        await supabase.from('bill_categories').insert({
          bill_id: summary.bill_id,
          category: cat.category,
          confidence: cat.confidence,
        });
      }

      const tags = categories.map((c) => c.category);
      const { data: voteMembers } = await supabase
        .from('bill_vote_member')
        .select('id')
        .eq('bill_id', summary.bill_id);

      if (voteMembers?.length) {
        for (const vm of voteMembers) {
          await supabase
            .from('bill_vote_member')
            .update({ policy_tags: tags })
            .eq('id', vm.id);
        }
      }

      tagged++;
    }

    return new Response(
      JSON.stringify({ ok: true, tagged }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
