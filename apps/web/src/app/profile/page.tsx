'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const ALL_CATEGORIES = [
  'Healthcare', 'Education', 'Environment', 'Defense', 'Economy',
  'Immigration', 'Technology', 'Criminal Justice', 'Infrastructure',
  'Civil Rights', 'Agriculture', 'Energy', 'Housing', 'Foreign Policy',
  'Labor', 'Taxes', 'Social Services',
];

export default function ProfilePage() {
  return (
    <RequireAuth>
      <Nav />
      <ProfileContent />
    </RequireAuth>
  );
}

function ProfileContent() {
  const { user, profile, address, refreshProfile } = useAuth();
  const supabase = getSupabaseBrowserClient();

  const [watchedCategories, setWatchedCategories] = useState<string[]>([]);
  const [bookmarkedBills, setBookmarkedBills] = useState<{ id: string; bill_id: string; bills: { title: string; bill_number: string } }[]>([]);
  const [notifPrefs, setNotifPrefs] = useState({ push_enabled: true, email_enabled: true, bill_status_change: true, weekly_digest: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWatchedCategories(profile?.watched_categories ?? []);
  }, [profile]);

  const loadBookmarks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_bookmarks')
      .select('id, bill_id, bills(title, bill_number)')
      .eq('user_id', user.id);
    setBookmarkedBills((data as typeof bookmarkedBills) ?? []);
  }, [user, supabase]);

  const loadNotifPrefs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_notification_prefs')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setNotifPrefs({
        push_enabled: data.push_enabled,
        email_enabled: data.email_enabled,
        bill_status_change: data.bill_status_change,
        weekly_digest: data.weekly_digest,
      });
    }
  }, [user, supabase]);

  useEffect(() => {
    loadBookmarks();
    loadNotifPrefs();
  }, [loadBookmarks, loadNotifPrefs]);

  const toggleCategory = (cat: string) => {
    setWatchedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const saveCategories = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({ watched_categories: watchedCategories }).eq('id', user.id);
    await refreshProfile();
    setSaving(false);
  };

  const updateNotifPref = async (key: string, value: boolean) => {
    if (!user) return;
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    await supabase.from('user_notification_prefs').update(updated).eq('user_id', user.id);
  };

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <h2 style={{ marginBottom: 16 }}>Profile & Settings</h2>

      <div className="card">
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Account</p>
        <p className="text-secondary" style={{ fontSize: 14 }}>{user?.email}</p>
        {address && (
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {address.city}, {address.state_code} {address.zip}
          </p>
        )}
        {profile?.spectrum_score !== null && profile?.spectrum_score !== undefined && (
          <div className="mt-2">
            <Link href="/survey" className="btn btn-ghost btn-sm">Retake Survey</Link>
          </div>
        )}
      </div>

      <div className="card">
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Watched Categories</p>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`chip`}
              style={{
                cursor: 'pointer',
                background: watchedCategories.includes(cat) ? 'var(--primary)' : 'var(--primary-light)',
                color: watchedCategories.includes(cat) ? 'white' : 'var(--primary)',
              }}
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm mt-4" onClick={saveCategories} disabled={saving}>
          {saving ? 'Saving...' : 'Save Categories'}
        </button>
      </div>

      <div className="card">
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Notification Preferences</p>
        {[
          { key: 'push_enabled', label: 'Push Notifications' },
          { key: 'email_enabled', label: 'Email Notifications' },
          { key: 'bill_status_change', label: 'Bill Status Changes' },
          { key: 'weekly_digest', label: 'Weekly Digest' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 mb-2" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={notifPrefs[key as keyof typeof notifPrefs]}
              onChange={(e) => updateNotifPref(key, e.target.checked)}
            />
            <span style={{ fontSize: 14 }}>{label}</span>
          </label>
        ))}
      </div>

      <div className="card">
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Bookmarked Bills</p>
        {bookmarkedBills.length === 0 ? (
          <p className="muted" style={{ fontSize: 14 }}>No bookmarks yet.</p>
        ) : (
          bookmarkedBills.map((b) => (
            <Link key={b.id} href={`/bills/${b.bill_id}`} style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
              {b.bills?.bill_number}: {b.bills?.title}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
