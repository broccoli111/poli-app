import type { SupabaseClient } from '@supabase/supabase-js';
import type { Notification, UserNotificationPref } from '@poli/types';

export async function fetchNotifications(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as Notification[];
}

export async function markNotificationRead(supabase: SupabaseClient, notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) throw error;
}

export async function getNotificationPrefs(
  supabase: SupabaseClient,
  userId: string
): Promise<UserNotificationPref | null> {
  const { data } = await supabase
    .from('user_notification_prefs')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export async function updateNotificationPrefs(
  supabase: SupabaseClient,
  userId: string,
  prefs: Partial<Pick<UserNotificationPref, 'push_enabled' | 'email_enabled' | 'bill_status_change' | 'weekly_digest'>>
) {
  const { error } = await supabase
    .from('user_notification_prefs')
    .update(prefs)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function registerPushToken(
  supabase: SupabaseClient,
  userId: string,
  token: string,
  platform: string
) {
  const { data: existing } = await supabase
    .from('user_push_tokens')
    .select('id')
    .eq('user_id', userId)
    .eq('token', token)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase
      .from('user_push_tokens')
      .insert({ user_id: userId, token, platform });
    if (error) throw error;
  }
}
