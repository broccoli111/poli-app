import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { chatCompletion } from '../_shared/llm.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabase = getServiceClient();

    const { data: billsWithText } = await supabase
      .from('bill_text_versions')
      .select('bill_id, storage_path, bills(id, title)')
      .order('fetched_at', { ascending: false })
      .limit(20);

    if (!billsWithText?.length) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No bill texts to summarize' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let generated = 0;

    for (const entry of billsWithText) {
      const { data: existing } = await supabase
        .from('ai_summaries')
        .select('id')
        .eq('bill_id', entry.bill_id)
        .maybeSingle();

      if (existing) continue;

      const { data: fileData } = await supabase.storage
        .from('bill-text')
        .download(entry.storage_path);

      if (!fileData) continue;

      const text = await fileData.text();
      const truncated = text.slice(0, 8000);

      const billInfo = entry.bills as { id: string; title: string } | null;
      const title = billInfo?.title ?? 'Unknown bill';

      const summary = await chatCompletion([
        {
          role: 'system',
          content:
            'You are a policy analyst. Summarize the following bill text at a 5th grade reading level. ' +
            'Be clear, concise, and neutral. Also extract 3-5 policy themes as a JSON array of strings. ' +
            'Respond in JSON: {"summary": "...", "themes": ["..."]}',
        },
        {
          role: 'user',
          content: `Bill: ${title}\n\n${truncated}`,
        },
      ]);

      let parsed: { summary: string; themes: string[] };
      try {
        parsed = JSON.parse(summary);
      } catch {
        parsed = { summary: summary.slice(0, 1000), themes: [] };
      }

      const { error } = await supabase.from('ai_summaries').insert({
        bill_id: entry.bill_id,
        summary_text: parsed.summary,
        grade_level: 5,
        themes: parsed.themes,
      });

      if (!error) generated++;
    }

    return new Response(
      JSON.stringify({ ok: true, generated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
