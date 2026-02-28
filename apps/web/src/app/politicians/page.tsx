'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { Politician } from '@poli/types';

export default function PoliticiansPage() {
  return (
    <RequireAuth>
      <Nav />
      <PoliticiansList />
    </RequireAuth>
  );
}

function PoliticiansList() {
  const { address } = useAuth();
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  const load = useCallback(async () => {
    if (!address) return;
    const { data: jurisdictions } = await supabase
      .from('jurisdictions')
      .select('id')
      .or(`level.eq.federal,and(level.eq.state,state_code.eq.${address.state_code})`);

    const ids = (jurisdictions ?? []).map((j) => j.id);
    if (ids.length === 0) { setPoliticians([]); setLoading(false); return; }

    const { data } = await supabase
      .from('politicians')
      .select('*')
      .in('jurisdiction_id', ids)
      .order('full_name');

    setPoliticians((data ?? []) as Politician[]);
    setLoading(false);
  }, [address, supabase]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="loading">Loading representatives...</div>;

  if (politicians.length === 0) {
    return (
      <div className="container">
        <div className="empty-state">
          <h2>No representatives found</h2>
          <p>Representative data will appear here once ingested.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2 style={{ marginBottom: 16 }}>Your Representatives</h2>
      {politicians.map((p) => (
        <Link key={p.id} href={`/politicians/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card flex items-center gap-3">
            {p.photo_url ? (
              <img src={p.photo_url} alt="" style={{ width: 48, height: 48, borderRadius: 24, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                {p.full_name[0]}
              </div>
            )}
            <div>
              <p style={{ fontWeight: 600 }}>{p.full_name}</p>
              <p className="muted" style={{ fontSize: 13 }}>
                {p.party ? p.party.charAt(0).toUpperCase() + p.party.slice(1) : 'Unknown'} &middot; {p.chamber ?? 'N/A'}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
