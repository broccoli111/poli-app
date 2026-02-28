'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { RequireAuth } from '@/components/RequireAuth';
import { ReportButton } from '@/components/ReportButton';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { Politician, HonestyScore, HonestyEvidence, PoliticianFunding } from '@poli/types';

export default function PoliticianDetailPage() {
  return (
    <RequireAuth>
      <Nav />
      <PoliticianDetail />
    </RequireAuth>
  );
}

function PoliticianDetail() {
  const { id } = useParams<{ id: string }>();
  const supabase = getSupabaseBrowserClient();

  const [politician, setPolitician] = useState<Politician | null>(null);
  const [honesty, setHonesty] = useState<{ score: HonestyScore | null; evidence: HonestyEvidence[] }>({ score: null, evidence: [] });
  const [funding, setFunding] = useState<PoliticianFunding | null>(null);
  const [fundingAvailable, setFundingAvailable] = useState(true);
  const [votes, setVotes] = useState<{ vote: string; bills: { title: string; bill_number: string } | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: pol } = await supabase.from('politicians').select('*').eq('id', id).single();
    setPolitician(pol as Politician | null);

    if (!pol) { setLoading(false); return; }

    const { data: score } = await supabase
      .from('honesty_scores')
      .select('*')
      .eq('politician_id', id)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (score) {
      const { data: evidence } = await supabase
        .from('honesty_evidence')
        .select('*')
        .eq('honesty_score_id', score.id)
        .order('created_at', { ascending: false })
        .limit(3);
      setHonesty({ score, evidence: evidence ?? [] });
    }

    const { data: fund } = await supabase
      .from('politician_funding')
      .select('*')
      .eq('politician_id', id)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fund) {
      setFunding(fund as PoliticianFunding);
    } else {
      const { data: juris } = await supabase
        .from('jurisdictions')
        .select('level')
        .eq('id', pol.jurisdiction_id!)
        .maybeSingle();
      setFundingAvailable(juris?.level === 'federal');
    }

    const { data: voteData } = await supabase
      .from('bill_vote_member')
      .select('vote, bills(title, bill_number)')
      .eq('politician_id', id)
      .order('voted_at', { ascending: false })
      .limit(20);

    setVotes((voteData ?? []) as typeof votes);
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="loading">Loading politician profile...</div>;
  if (!politician) return <div className="container"><div className="empty-state"><h2>Politician not found</h2></div></div>;

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          {politician.photo_url ? (
            <img src={politician.photo_url} alt="" style={{ width: 72, height: 72, borderRadius: 36, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 36, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700 }}>
              {politician.full_name[0]}
            </div>
          )}
          <div>
            <h1 style={{ fontSize: 22 }}>{politician.full_name}</h1>
            <p className="text-secondary">
              {politician.party ? politician.party.charAt(0).toUpperCase() + politician.party.slice(1) : 'Unknown party'} &middot; {politician.chamber ?? 'N/A'}
            </p>
          </div>
        </div>
        {politician.bio && <p style={{ fontSize: 14, marginBottom: 8 }}>{politician.bio}</p>}
        <div className="flex gap-3" style={{ fontSize: 13 }}>
          {politician.website && <a href={politician.website} target="_blank" rel="noopener noreferrer">Website</a>}
          {politician.phone && <span>Phone: {politician.phone}</span>}
          {politician.email && <a href={`mailto:${politician.email}`}>Email</a>}
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Honesty Score</h3>
        {honesty.score ? (
          <>
            <div className="flex items-center gap-3 mb-2">
              <div style={{
                width: 64, height: 64, borderRadius: 32,
                background: honesty.score.score >= 70 ? 'var(--success)' : honesty.score.score >= 40 ? 'var(--warning)' : 'var(--danger)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 22, fontWeight: 700,
              }}>
                {Math.round(honesty.score.score)}
              </div>
              <span className="text-secondary" style={{ fontSize: 14 }}>out of 100</span>
            </div>
            {honesty.evidence.map((e) => (
              <div key={e.id} style={{ marginBottom: 8, padding: 8, background: 'var(--bg)', borderRadius: 8 }}>
                <span className="chip" style={{ fontSize: 11 }}>{e.evidence_type.replace(/_/g, ' ')}</span>
                <p style={{ fontSize: 13, marginTop: 4 }}>{e.description}</p>
                {e.source_url && (
                  <a href={e.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>Source</a>
                )}
              </div>
            ))}
          </>
        ) : (
          <p className="muted" style={{ fontSize: 14 }}>Honesty score not yet available.</p>
        )}
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Campaign Funding</h3>
        {funding ? (
          <>
            <div className="flex justify-between mb-2">
              <div>
                <p className="muted" style={{ fontSize: 12 }}>Total Raised</p>
                <p style={{ fontSize: 18, fontWeight: 600 }}>${(funding.total_raised ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="muted" style={{ fontSize: 12 }}>Total Spent</p>
                <p style={{ fontSize: 18, fontWeight: 600 }}>${(funding.total_spent ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="muted" style={{ fontSize: 12 }}>Cycle</p>
                <p style={{ fontSize: 18, fontWeight: 600 }}>{funding.cycle}</p>
              </div>
            </div>
            {(funding.top_donors as { name: string; amount: number }[] | null)?.length ? (
              <div className="mt-2">
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Top Donors</p>
                {(funding.top_donors as { name: string; amount: number }[]).map((d, i) => (
                  <p key={i} style={{ fontSize: 13 }}>{d.name}: ${d.amount?.toLocaleString()}</p>
                ))}
              </div>
            ) : null}
          </>
        ) : fundingAvailable ? (
          <p className="muted" style={{ fontSize: 14 }}>Funding data not yet available. Data is fetched from FEC for federal politicians.</p>
        ) : (
          <p className="muted" style={{ fontSize: 14 }}>Funding data not available for non-federal politicians.</p>
        )}
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Voting History</h3>
        {votes.length === 0 ? (
          <p className="muted" style={{ fontSize: 14 }}>No voting records available yet.</p>
        ) : (
          votes.map((v, i) => (
            <div key={i} style={{ marginBottom: 8, fontSize: 14 }}>
              <span className="chip" style={{ fontSize: 11 }}>{v.vote}</span>
              {v.bills?.bill_number}: {v.bills?.title}
            </div>
          ))
        )}
      </div>

      <ReportButton context={`Politician: ${politician.full_name}`} />
    </div>
  );
}
