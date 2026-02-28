'use client';

import { useEffect, useState, useCallback } from 'react';
import { Nav } from '@/components/Nav';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { Notification } from '@poli/types';

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <Nav />
      <NotificationsList />
    </RequireAuth>
  );
}

function NotificationsList() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (notifId: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', notifId);
    setNotifications((prev) => prev.map((n) => n.id === notifId ? { ...n, read: true } : n));
  };

  if (loading) return <div className="loading">Loading notifications...</div>;

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <h2 style={{ marginBottom: 16 }}>Notifications</h2>
      {notifications.length === 0 ? (
        <div className="empty-state">
          <h3>No notifications</h3>
          <p>You&apos;ll see alerts here when bills you follow change status.</p>
        </div>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            className="card"
            style={{ opacity: n.read ? 0.6 : 1, cursor: 'pointer' }}
            onClick={() => !n.read && markRead(n.id)}
          >
            <div className="flex justify-between items-center">
              <p style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</p>
              {!n.read && <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--primary)' }} />}
            </div>
            <p style={{ fontSize: 14, marginTop: 4 }}>{n.body}</p>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {new Date(n.created_at).toLocaleString()}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
