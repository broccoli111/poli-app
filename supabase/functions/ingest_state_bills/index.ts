import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

const OPENSTATES_API_KEY = Deno.env.get('OPENSTATES_API_KEY') ?? '';
const OPENSTATES_BASE = 'https://v3.openstates.org';

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabase = getServiceClient();

    const { data: stateJurisdictions } = await supabase
      .from('jurisdictions')
      .select('id, state_code')
      .eq('level', 'state');

    if (!stateJurisdictions?.length) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No state jurisdictions found; skipping.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalInserted = 0;

    for (const jurisdiction of stateJurisdictions) {
      if (!jurisdiction.state_code) continue;

      const stateAbbr = jurisdiction.state_code.toLowerCase();
      const url = `${OPENSTATES_BASE}/bills?jurisdiction=${stateAbbr}&per_page=20&apikey=${OPENSTATES_API_KEY}`;

      let res: Response;
      try {
        res = await fetch(url);
      } catch {
        console.error(`Failed to fetch bills for ${stateAbbr}`);
        continue;
      }

      if (!res.ok) {
        console.error(`OpenStates returned ${res.status} for ${stateAbbr}`);
        continue;
      }

      const data = await res.json();
      const bills = data.results ?? [];

      for (const bill of bills) {
        const externalId = `openstates:${bill.id}`;

        const { data: existing } = await supabase
          .from('bills')
          .select('id')
          .eq('external_id', externalId)
          .maybeSingle();

        if (existing) continue;

        const lastAction = bill.latest_action?.description ?? '';
        let status = 'introduced';
        if (/committee/i.test(lastAction)) status = 'in_committee';
        if (/passed/i.test(lastAction)) status = 'passed_one_chamber';
        if (/signed/i.test(lastAction)) status = 'signed';
        if (/enacted|chaptered/i.test(lastAction)) status = 'enacted';

        const links = (bill.sources ?? []).map((s: { url: string }) => s.url);

        const { error } = await supabase.from('bills').insert({
          jurisdiction_id: jurisdiction.id,
          external_id: externalId,
          bill_number: bill.identifier ?? bill.id,
          title: bill.title ?? bill.identifier,
          description: bill.latest_action?.description ?? null,
          status,
          status_date: bill.latest_action?.date ?? null,
          introduced_date: bill.first_action_date ?? null,
          source_url: links[0] ?? null,
          external: {
            openstates_id: bill.id,
            links,
            session: bill.session ?? null,
          },
        });

        if (!error) totalInserted++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, inserted: totalInserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
