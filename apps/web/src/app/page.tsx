'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { Bill, BillCategory, UserBookmark } from '@poli/types';

type BillWithCats = Bill & { bill_categories: BillCategory[] };

export default function HomePage() {
  return (
    <RequireAuth>
      <Nav />
      <BillFeed />
    </RequireAuth>
  );
}

function BillFeed() {
  const { address, profile } = useAuth();
  const [bills, setBills] = useState<BillWithCats[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  const loadBills = useCallback(async () => {
    if (!address) return;
    setLoading(true);

    const { data: jurisdictions } = await supabase
      .from('jurisdictions')
      .select('id')
      .or(`level.eq.federal,and(level.eq.state,state_code.eq.${address.state_code})`);

    const ids = (jurisdictions ?? []).map((j) => j.id);
    if (ids.length === 0) {
      setBills([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('bills')
      .select('*, bill_categories(*)')
      .in('jurisdiction_id', ids)
      .order('updated_at', { ascending: false })
      .limit(30);

    setBills((data ?? []) as BillWithCats[]);
    setLoading(false);
  }, [address, supabase]);

  const loadBookmarks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('user_bookmarks').select('bill_id').eq('user_id', user.id);
    setBookmarks(new Set((data ?? []).map((b: { bill_id: string }) => b.bill_id)));
  }, [supabase]);

  useEffect(() => {
    loadBills();
    loadBookmarks();
  }, [loadBills, loadBookmarks]);

  const toggleBookmark = async (billId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (bookmarks.has(billId)) {
      await supabase.from('user_bookmarks').delete().eq('user_id', user.id).eq('bill_id', billId);
      setBookmarks((prev) => { const s = new Set(prev); s.delete(billId); return s; });
    } else {
      await supabase.from('user_bookmarks').insert({ user_id: user.id, bill_id: billId });
      setBookmarks((prev) => new Set(prev).add(billId));
    }
  };

  const watchedCats = new Set(profile?.watched_categories ?? []);

  const shouldShowEye = (bill: BillWithCats) => {
    if (bookmarks.has(bill.id)) return true;
    const billCats = bill.bill_categories.map((c) => c.category);
    if (billCats.some((c) => watchedCats.has(c)) && bill.status !== 'dead' && bill.status !== 'enacted') return true;
    return false;
  };

  if (loading) return <div className="loading">Loading bills...</div>;

  if (bills.length === 0) {
    return (
      <div className="container">
        <div className="empty-state">
          <h2>No bills found</h2>
          <p>Bills for your area will appear here once data is ingested.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2 style={{ marginBottom: 16 }}>Bills in Your Area</h2>
      {bills.map((bill) => (
        <Link key={bill.id} href={`/bills/${bill.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card" style={{ position: 'relative' }}>
            <div className="flex justify-between items-center">
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{bill.bill_number}</span>
              <div className="flex items-center gap-2">
                {shouldShowEye(bill) && <span title="Watching">👁</span>}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => { e.preventDefault(); toggleBookmark(bill.id); }}
                  style={{ fontSize: 18 }}
                >
                  {bookmarks.has(bill.id) ? '★' : '☆'}
                </button>
              </div>
            </div>
            <h3 style={{ fontSize: 16, marginTop: 4, marginBottom: 6 }}>{bill.title}</h3>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              <span className="chip">{bill.status.replace(/_/g, ' ')}</span>
              {bill.bill_categories.slice(0, 3).map((c) => (
                <span key={c.id} className="chip">{c.category}</span>
              ))}
            </div>
            {bill.expected_vote_date && (
              <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 6 }}>
                Expected vote: {new Date(bill.expected_vote_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
