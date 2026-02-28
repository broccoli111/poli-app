import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const NOTIFICATION_FROM_EMAIL = Deno.env.get('NOTIFICATION_FROM_EMAIL') ?? 'noreply@poli-app.com';
const FEATURE_PUSH = Deno.env.get('FEATURE_PUSH_NOTIFICATIONS') !== 'false';
const FEATURE_EMAIL = Deno.env.get('FEATURE_EMAIL_NOTIFICATIONS') !== 'false';

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabase = getServiceClient();

    const { data: changedBills } = await supabase
      .from('bills')
      .select('id, title, status, previous_status, jurisdiction_id')
      .not('previous_status', 'is', null)
      .neq('status', 'previous_status' as unknown as string);

    if (!changedBills?.length) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No status changes detected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let notified = 0;

    for (const bill of changedBills) {
      const { data: bookmarkUsers } = await supabase
        .from('user_bookmarks')
        .select('user_id')
        .eq('bill_id', bill.id);

      const { data: categoryTags } = await supabase
        .from('bill_categories')
        .select('category')
        .eq('bill_id', bill.id);

      const categories = (categoryTags ?? []).map((c) => c.category);

      let watchUsers: { id: string }[] = [];
      if (categories.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .overlaps('watched_categories', categories);
        watchUsers = data ?? [];
      }

      const userIds = new Set<string>();
      for (const b of bookmarkUsers ?? []) userIds.add(b.user_id);
      for (const w of watchUsers) userIds.add(w.id);

      for (const userId of userIds) {
        const { data: prefs } = await supabase
          .from('user_notification_prefs')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!prefs?.bill_status_change) continue;

        const title = `Bill Status Update`;
        const body = `"${bill.title}" status changed from ${bill.previous_status} to ${bill.status}`;

        const { data: notif } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title,
            body,
            data: { bill_id: bill.id, new_status: bill.status },
          })
          .select('id')
          .single();

        if (!notif) continue;

        if (FEATURE_PUSH && prefs.push_enabled) {
          await sendPush(supabase, userId, notif.id, title, body, { bill_id: bill.id });
        }

        if (FEATURE_EMAIL && prefs.email_enabled && RESEND_API_KEY) {
          await sendEmail(supabase, userId, notif.id, title, body);
        }

        notified++;
      }

      await supabase
        .from('bills')
        .update({ previous_status: bill.status })
        .eq('id', bill.id);
    }

    return new Response(
      JSON.stringify({ ok: true, notified }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendPush(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  notifId: string,
  title: string,
  body: string,
  data: Record<string, unknown>
) {
  const { data: tokens } = await supabase
    .from('user_push_tokens')
    .select('token')
    .eq('user_id', userId);

  if (!tokens?.length) return;

  for (const { token } of tokens) {
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to: token,
          title,
          body,
          data,
        }),
      });

      const status = res.ok ? 'sent' : 'failed';
      const error = res.ok ? null : await res.text();

      await supabase.from('notification_deliveries').insert({
        notification_id: notifId,
        channel: 'push',
        status,
        sent_at: new Date().toISOString(),
        error,
      });
    } catch (e) {
      await supabase.from('notification_deliveries').insert({
        notification_id: notifId,
        channel: 'push',
        status: 'failed',
        error: String(e),
      });
    }
  }
}

async function sendEmail(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  notifId: string,
  title: string,
  body: string
) {
  const { data: user } = await supabase.auth.admin.getUserById(userId);
  const email = user?.user?.email;
  if (!email) return;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: NOTIFICATION_FROM_EMAIL,
        to: email,
        subject: title,
        text: body,
      }),
    });

    const status = res.ok ? 'sent' : 'failed';
    const error = res.ok ? null : await res.text();

    await supabase.from('notification_deliveries').insert({
      notification_id: notifId,
      channel: 'email',
      status,
      sent_at: new Date().toISOString(),
      error,
    });
  } catch (e) {
    await supabase.from('notification_deliveries').insert({
      notification_id: notifId,
      channel: 'email',
      status: 'failed',
      error: String(e),
    });
  }
}
