import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

const CONGRESS_API_KEY = Deno.env.get('CONGRESS_API_KEY') ?? '';
const CONGRESS_API_BASE = 'https://api.congress.gov/v3';

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabase = getServiceClient();

    const { data: fedJurisdictions } = await supabase
      .from('jurisdictions')
      .select('id')
      .eq('level', 'federal');

    if (!fedJurisdictions?.length) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No federal jurisdictions found; skipping.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jurisdictionId = fedJurisdictions[0].id;
    const congress = 118;
    const billTypes = ['hr', 's', 'hjres', 'sjres'];
    let totalInserted = 0;

    for (const billType of billTypes) {
      const url = `${CONGRESS_API_BASE}/bill/${congress}/${billType}?limit=20&api_key=${CONGRESS_API_KEY}`;

      let res: Response;
      try {
        res = await fetch(url);
      } catch {
        console.error(`Failed to fetch ${billType} bills`);
        continue;
      }

      if (!res.ok) {
        console.error(`Congress API returned ${res.status} for ${billType}`);
        continue;
      }

      const data = await res.json();
      const bills = data.bills ?? [];

      for (const bill of bills) {
        const billNumber = `${billType.toUpperCase()} ${bill.number}`;
        const externalId = `congress:${billType}:${bill.number}`;

        const { data: existing } = await supabase
          .from('bills')
          .select('id')
          .eq('external_id', externalId)
          .maybeSingle();

        if (existing) continue;

        const statusMap: Record<string, string> = {
          'Introduced': 'introduced',
          'Referred to Committee': 'in_committee',
          'Passed House': 'passed_one_chamber',
          'Passed Senate': 'passed_one_chamber',
          'Signed by President': 'signed',
          'Became Law': 'enacted',
        };

        const mappedStatus = statusMap[bill.latestAction?.text ?? ''] ?? 'introduced';

        const { error } = await supabase.from('bills').insert({
          jurisdiction_id: jurisdictionId,
          external_id: externalId,
          bill_number: billNumber,
          title: bill.title ?? `${billNumber}`,
          description: bill.latestAction?.text ?? null,
          status: mappedStatus,
          status_date: bill.latestAction?.actionDate ?? null,
          introduced_date: bill.introducedDate ?? null,
          source_url: bill.url ?? null,
          external: {
            congress: congress,
            billType: billType,
            billNumber: bill.number,
            originChamber: bill.originChamber ?? null,
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
