import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import type { Bill, BillCategory, AiSummary, BillTextVersion, BillSentimentAggregate } from '@poli/types';
import type { SentimentVote } from '@poli/types';

type BillFull = Bill & {
  bill_categories: BillCategory[];
  ai_summaries: AiSummary[];
  bill_text_versions: BillTextVersion[];
};

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, address } = useAuth();

  const [bill, setBill] = useState<BillFull | null>(null);
  const [billText, setBillText] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<SentimentVote | null>(null);
  const [aggregate, setAggregate] = useState<BillSentimentAggregate | null>(null);
  const [tab, setTab] = useState<'summary' | 'text'>('summary');
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('bills')
      .select('*, bill_categories(*), ai_summaries(*), bill_text_versions(*)')
      .eq('id', id)
      .single();
    setBill(data as BillFull | null);

    if (data?.bill_text_versions?.[0]?.storage_path) {
      const { data: url } = await supabase.storage
        .from('bill-text')
        .createSignedUrl(data.bill_text_versions[0].storage_path, 3600);
      if (url?.signedUrl) {
        try {
          const res = await fetch(url.signedUrl);
          setBillText(await res.text());
        } catch { setBillText(null); }
      }
    }

    if (user) {
      const { data: s } = await supabase
        .from('user_bill_sentiment').select('vote')
        .eq('user_id', user.id).eq('bill_id', id).maybeSingle();
      setUserVote(s?.vote as SentimentVote ?? null);
    }

    if (address) {
      const { data: j } = await supabase
        .from('jurisdictions').select('id')
        .or(`level.eq.federal,and(level.eq.state,state_code.eq.${address.state_code})`).limit(1);
      if (j?.[0]) {
        const { data: agg } = await supabase
          .from('bill_sentiment_aggregate').select('*')
          .eq('bill_id', id).eq('jurisdiction_id', j[0].id).maybeSingle();
        setAggregate(agg);
      }
    }
    setLoading(false);
  }, [id, user, address]);

  useEffect(() => { load(); }, [load]);

  const vote = async (v: SentimentVote) => {
    if (!user || !address) return;
    setVoting(true);
    const { data: j } = await supabase
      .from('jurisdictions').select('id')
      .or(`level.eq.federal,and(level.eq.state,state_code.eq.${address.state_code})`).limit(1);
    if (!j?.[0]) { setVoting(false); return; }

    const { data: existing } = await supabase
      .from('user_bill_sentiment').select('id')
      .eq('user_id', user.id).eq('bill_id', id).maybeSingle();

    if (existing) {
      await supabase.from('user_bill_sentiment')
        .update({ vote: v, voted_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('user_bill_sentiment').insert({ user_id: user.id, bill_id: id, vote: v });
    }
    setUserVote(v);
    setVoting(false);
    load();
  };

  const contactRep = () => {
    if (!bill) return;
    const subject = encodeURIComponent(`Regarding: ${bill.bill_number} - ${bill.title}`);
    const body = encodeURIComponent(
      `Dear Representative,\n\nI am writing about ${bill.bill_number}: "${bill.title}".\n\n[Your message]\n\nSincerely,\nA concerned citizen`
    );
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  if (!bill) return <View style={styles.center}><Text>Bill not found</Text></View>;

  const summary = bill.ai_summaries[0];
  const total = aggregate?.total_votes ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.billNum}>{bill.bill_number}</Text>
            {bill.expected_vote_date && (
              <Text style={styles.voteDate}>Vote: {new Date(bill.expected_vote_date).toLocaleDateString()}</Text>
            )}
          </View>
          <Text style={styles.billTitle}>{bill.title}</Text>
          <View style={[styles.chipRow, { marginTop: 8 }]}>
            <View style={styles.chip}><Text style={styles.chipText}>{bill.status.replace(/_/g, ' ')}</Text></View>
            {bill.bill_categories.map((c) => (
              <View key={c.id} style={styles.chip}><Text style={styles.chipText}>{c.category}</Text></View>
            ))}
          </View>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tabBtn, tab === 'summary' && styles.tabActive]} onPress={() => setTab('summary')}>
            <Text style={[styles.tabText, tab === 'summary' && styles.tabTextActive]}>AI Summary</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, tab === 'text' && styles.tabActive]} onPress={() => setTab('text')}>
            <Text style={[styles.tabText, tab === 'text' && styles.tabTextActive]}>Original Text</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {tab === 'summary' ? (
            summary ? (
              <>
                <Text style={{ fontSize: 14, lineHeight: 22 }}>{summary.summary_text}</Text>
                {summary.themes.length > 0 && (
                  <View style={[styles.chipRow, { marginTop: 12 }]}>
                    {summary.themes.map((t) => (
                      <View key={t} style={styles.chip}><Text style={styles.chipText}>{t}</Text></View>
                    ))}
                  </View>
                )}
              </>
            ) : <Text style={styles.muted}>Summary not yet available.</Text>
          ) : billText ? (
            <Text style={{ fontSize: 13, lineHeight: 20 }}>{billText}</Text>
          ) : (
            <Text style={styles.muted}>Bill text not yet available.</Text>
          )}
        </View>

        {aggregate && total > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Community Sentiment</Text>
            <View style={styles.sentimentBar}>
              {aggregate.support_count > 0 && <View style={[styles.seg, { width: `${(aggregate.support_count/total)*100}%`, backgroundColor: '#16A34A' }]} />}
              {aggregate.neutral_count > 0 && <View style={[styles.seg, { width: `${(aggregate.neutral_count/total)*100}%`, backgroundColor: '#9CA3AF' }]} />}
              {aggregate.oppose_count > 0 && <View style={[styles.seg, { width: `${(aggregate.oppose_count/total)*100}%`, backgroundColor: '#DC2626' }]} />}
            </View>
            <Text style={styles.muted}>{total} votes</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.sticky}>
        <Text style={styles.cardTitle}>Your Vote {userVote && <Text style={styles.chipText}> ({userVote})</Text>}</Text>
        <View style={styles.voteRow}>
          <TouchableOpacity style={[styles.voteBtn, userVote === 'support' && { backgroundColor: '#16A34A' }]} onPress={() => vote('support')} disabled={voting}>
            <Text style={[styles.voteBtnText, userVote === 'support' && { color: '#fff' }]}>Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.voteBtn, userVote === 'neutral' && { backgroundColor: '#2563EB' }]} onPress={() => vote('neutral')} disabled={voting}>
            <Text style={[styles.voteBtnText, userVote === 'neutral' && { color: '#fff' }]}>Neutral</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.voteBtn, userVote === 'oppose' && { backgroundColor: '#DC2626' }]} onPress={() => vote('oppose')} disabled={voting}>
            <Text style={[styles.voteBtnText, userVote === 'oppose' && { color: '#fff' }]}>Oppose</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.voteBtn} onPress={contactRep}>
            <Text style={styles.voteBtnText}>Contact Rep</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1, backgroundColor: '#F9FAFB' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billNum: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  billTitle: { fontSize: 18, fontWeight: '600', marginTop: 4 },
  voteDate: { fontSize: 12, color: '#D97706', fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: { backgroundColor: '#DBEAFE', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 12 },
  chipText: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
  muted: { fontSize: 14, color: '#9CA3AF' },
  tabBar: { flexDirection: 'row', marginBottom: 12, borderBottomWidth: 2, borderColor: '#E5E7EB' },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 20, marginBottom: -2, borderBottomWidth: 2, borderColor: 'transparent' },
  tabActive: { borderColor: '#2563EB' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#9CA3AF' },
  tabTextActive: { color: '#2563EB' },
  sentimentBar: { flexDirection: 'row', height: 20, borderRadius: 10, overflow: 'hidden', backgroundColor: '#E5E7EB' },
  seg: { height: '100%' },
  sticky: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E5E7EB', padding: 16,
  },
  voteRow: { flexDirection: 'row', gap: 8 },
  voteBtn: { flex: 1, borderWidth: 1, borderColor: '#2563EB', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  voteBtnText: { color: '#2563EB', fontSize: 13, fontWeight: '600' },
});
