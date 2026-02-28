import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

const CONGRESS_API_KEY = Deno.env.get('CONGRESS_API_KEY') ?? '';

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabase = getServiceClient();

    const { data: bills } = await supabase
      .from('bills')
      .select('id, external_id, external, source_url')
      .not('external', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!bills?.length) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No bills to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;

    for (const bill of bills) {
      const { data: existingVersion } = await supabase
        .from('bill_text_versions')
        .select('id')
        .eq('bill_id', bill.id)
        .maybeSingle();

      if (existingVersion) continue;

      let textContent: string | null = null;

      const ext = bill.external as Record<string, unknown> | null;
      if (ext?.congress && ext?.billType && ext?.billNumber) {
        const textUrl = `https://api.congress.gov/v3/bill/${ext.congress}/${ext.billType}/${ext.billNumber}/text?api_key=${CONGRESS_API_KEY}`;
        try {
          const res = await fetch(textUrl);
          if (res.ok) {
            const data = await res.json();
            const versions = data.textVersions ?? [];
            if (versions.length > 0) {
              const formats = versions[0].formats ?? [];
              const txtFormat = formats.find((f: { type: string }) => f.type === 'Formatted Text');
              if (txtFormat?.url) {
                const txtRes = await fetch(txtFormat.url);
                if (txtRes.ok) textContent = await txtRes.text();
              }
            }
          }
        } catch {
          console.error(`Failed fetching text for bill ${bill.id}`);
        }
      }

      if (!textContent && bill.source_url) {
        textContent = `[Bill text available at: ${bill.source_url}]`;
      }

      if (!textContent) continue;

      const storagePath = `bills/${bill.id}/latest.txt`;
      const encoder = new TextEncoder();
      const bytes = encoder.encode(textContent);

      const { error: uploadError } = await supabase.storage
        .from('bill-text')
        .upload(storagePath, bytes, {
          contentType: 'text/plain',
          upsert: true,
        });

      if (uploadError) {
        console.error(`Upload failed for ${bill.id}: ${uploadError.message}`);
        continue;
      }

      const { error: insertError } = await supabase.from('bill_text_versions').insert({
        bill_id: bill.id,
        version_label: 'latest',
        storage_path: storagePath,
      });

      if (!insertError) processed++;
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
