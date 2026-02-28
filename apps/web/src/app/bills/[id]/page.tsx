'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { RequireAuth } from '@/components/RequireAuth';
import { ReportButton } from '@/components/ReportButton';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { Bill, BillCategory, AiSummary, BillTextVersion, BillSentimentAggregate } from '@poli/types';
import type { SentimentVote } from '@poli/types';

type BillDetail = Bill & {
  bill_categories: BillCategory[];
  ai_summaries: AiSummary[];
  bill_text_versions: BillTextVersion[];
};

export default function BillDetailPage() {
  return (
    <RequireAuth>
      <Nav />
      <BillDetailContent />
    </RequireAuth>
  );
}

function BillDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { user, address, profile } = useAuth();
  const supabase = getSupabaseBrowserClient();

  const [bill, setBill] = useState<BillDetail | null>(null);
  const [billText, setBillText] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<SentimentVote | null>(null);
  const [aggregate, setAggregate] = useState<BillSentimentAggregate | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'text'>('summary');
  const [loading, setLoading] = useState(true);
  const [voteLoading, setVoteLoading] = useState(false);

  const loadBill = useCallback(async () => {
    const { data } = await supabase
      .from('bills')
      .select('*, bill_categories(*), ai_summaries(*), bill_text_versions(*)')
      .eq('id', id)
      .single();
    setBill(data as BillDetail | null);

    if (data?.bill_text_versions?.[0]?.storage_path) {
      const { data: signedUrl } = await supabase.storage
        .from('bill-text')
        .createSignedUrl(data.bill_text_versions[0].storage_path, 3600);
      if (signedUrl?.signedUrl) {
        try {
          const res = await fetch(signedUrl.signedUrl);
          setBillText(await res.text());
        } catch {
          setBillText(null);
        }
      }
    }

    if (user) {
      const { data: sentiment } = await supabase
        .from('user_bill_sentiment')
        .select('vote')
        .eq('user_id', user.id)
        .eq('bill_id', id)
        .maybeSingle();
      setUserVote(sentiment?.vote as SentimentVote ?? null);
    }

    if (address) {
      const { data: jurisdictions } = await supabase
        .from('jurisdictions')
        .select('id')
        .or(`level.eq.federal,and(level.eq.state,state_code.eq.${address.state_code})`)
        .limit(1);

      if (jurisdictions?.[0]) {
        const { data: agg } = await supabase
          .from('bill_sentiment_aggregate')
          .select('*')
          .eq('bill_id', id)
          .eq('jurisdiction_id', jurisdictions[0].id)
          .maybeSingle();
        setAggregate(agg);
      }
    }

    setLoading(false);
  }, [id, supabase, user, address]);

  useEffect(() => { loadBill(); }, [loadBill]);

  const submitVote = async (vote: SentimentVote) => {
    if (!user || !address) return;
    setVoteLoading(true);

    const { data: jurisdictions } = await supabase
      .from('jurisdictions')
      .select('id')
      .or(`level.eq.federal,and(level.eq.state,state_code.eq.${address.state_code})`)
      .limit(1);

    const jurisdictionId = jurisdictions?.[0]?.id;
    if (!jurisdictionId) { setVoteLoading(false); return; }

    const { data: existing } = await supabase
      .from('user_bill_sentiment')
      .select('id')
      .eq('user_id', user.id)
      .eq('bill_id', id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_bill_sentiment')
        .update({ vote, voted_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('user_bill_sentiment')
        .insert({ user_id: user.id, bill_id: id, vote });
    }

    setUserVote(vote);
    setVoteLoading(false);
    loadBill();
  };

  const openContactRep = () => {
    if (!bill) return;
    const subject = encodeURIComponent(`Regarding: ${bill.bill_number} - ${bill.title}`);
    const body = encodeURIComponent(
      `Dear Representative,\n\nI am writing to you regarding ${bill.bill_number}: "${bill.title}".\n\n` +
      `As your constituent, I would like to express my ${userVote ?? 'opinion'} regarding this legislation.\n\n` +
      `[Please add your personal message here]\n\nSincerely,\nA concerned citizen`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  if (loading) return <div className="loading">Loading bill details...</div>;
  if (!bill) return <div className="container"><div className="empty-state"><h2>Bill not found</h2></div></div>;

  const summary = bill.ai_summaries[0];
  const total = aggregate?.total_votes ?? 0;

  return (
    <div className="container">
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{bill.bill_number}</span>
          {bill.expected_vote_date && (
            <span style={{ fontSize: 13, color: 'var(--warning)', fontWeight: 600 }}>
              Vote: {new Date(bill.expected_vote_date).toLocaleDateString()}
            </span>
          )}
        </div>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>{bill.title}</h1>
        <div className="flex gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
          <span className="chip">{bill.status.replace(/_/g, ' ')}</span>
          {bill.bill_categories.map((c) => (
            <span key={c.id} className="chip">{c.category}</span>
          ))}
        </div>
        {bill.description && <p className="text-secondary" style={{ fontSize: 14 }}>{bill.description}</p>}
      </div>

      <div className="tab-bar">
        <div className={`tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
          AI Summary
        </div>
        <div className={`tab ${activeTab === 'text' ? 'active' : ''}`} onClick={() => setActiveTab('text')}>
          Original Text
        </div>
      </div>

      <div className="card">
        {activeTab === 'summary' ? (
          summary ? (
            <>
              <p>{summary.summary_text}</p>
              {summary.themes.length > 0 && (
                <div className="mt-4">
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Themes:</p>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    {summary.themes.map((t) => (
                      <span key={t} className="chip">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="muted">Summary not yet available. Summaries are generated nightly.</p>
          )
        ) : billText ? (
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, maxHeight: 500, overflow: 'auto' }}>{billText}</pre>
        ) : (
          <p className="muted">
            Bill text not yet available.
            {bill.source_url && (
              <> View at <a href={bill.source_url} target="_blank" rel="noopener noreferrer">source</a>.</>
            )}
          </p>
        )}
      </div>

      {aggregate && total > 0 && (
        <div className="card">
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Community Sentiment</p>
          <div className="sentiment-bar">
            <div className="sentiment-segment" style={{ width: `${(aggregate.support_count / total) * 100}%`, background: 'var(--success)' }} />
            <div className="sentiment-segment" style={{ width: `${(aggregate.neutral_count / total) * 100}%`, background: 'var(--text-muted)' }} />
            <div className="sentiment-segment" style={{ width: `${(aggregate.oppose_count / total) * 100}%`, background: 'var(--danger)' }} />
          </div>
          <div className="flex justify-between mt-2" style={{ fontSize: 12 }}>
            <span style={{ color: 'var(--success)' }}>Support {Math.round((aggregate.support_count / total) * 100)}%</span>
            <span className="muted">Neutral {Math.round((aggregate.neutral_count / total) * 100)}%</span>
            <span style={{ color: 'var(--danger)' }}>Oppose {Math.round((aggregate.oppose_count / total) * 100)}%</span>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{total} votes</p>
        </div>
      )}

      <div className="sticky-bottom">
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          Your Vote {userVote && <span className="chip">{userVote}</span>}
        </p>
        <div className="flex gap-2">
          <button
            className={`btn btn-sm ${userVote === 'support' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => submitVote('support')}
            disabled={voteLoading}
          >
            Support
          </button>
          <button
            className={`btn btn-sm ${userVote === 'neutral' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => submitVote('neutral')}
            disabled={voteLoading}
          >
            Neutral
          </button>
          <button
            className={`btn btn-sm ${userVote === 'oppose' ? 'btn-danger' : 'btn-outline'}`}
            onClick={() => submitVote('oppose')}
            disabled={voteLoading}
          >
            Oppose
          </button>
          <button className="btn btn-ghost btn-sm" onClick={openContactRep}>
            Contact Rep
          </button>
        </div>
        <div className="mt-2">
          <ReportButton context={`Bill ${bill.bill_number}`} />
        </div>
      </div>
    </div>
  );
}
