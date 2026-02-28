import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import type { Politician, HonestyScore, HonestyEvidence, PoliticianFunding } from '@poli/types';

export default function PoliticianDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pol, setPol] = useState<Politician | null>(null);
  const [honesty, setHonesty] = useState<{ score: HonestyScore | null; evidence: HonestyEvidence[] }>({ score: null, evidence: [] });
  const [funding, setFunding] = useState<PoliticianFunding | null>(null);
  const [fundingAvailable, setFundingAvailable] = useState(true);
  const [votes, setVotes] = useState<{ vote: string; bills: { title: string; bill_number: string } | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: p } = await supabase.from('politicians').select('*').eq('id', id).single();
    setPol(p as Politician | null);
    if (!p) { setLoading(false); return; }

    const { data: sc } = await supabase
      .from('honesty_scores').select('*')
      .eq('politician_id', id).order('computed_at', { ascending: false }).limit(1).maybeSingle();
    if (sc) {
      const { data: ev } = await supabase
        .from('honesty_evidence').select('*')
        .eq('honesty_score_id', sc.id).limit(3);
      setHonesty({ score: sc as HonestyScore, evidence: (ev ?? []) as HonestyEvidence[] });
    }

    const { data: f } = await supabase
      .from('politician_funding').select('*')
      .eq('politician_id', id).order('fetched_at', { ascending: false }).limit(1).maybeSingle();
    if (f) { setFunding(f as PoliticianFunding); }
    else if (p.jurisdiction_id) {
      const { data: j } = await supabase.from('jurisdictions').select('level').eq('id', p.jurisdiction_id).maybeSingle();
      setFundingAvailable(j?.level === 'federal');
    }

    const { data: v } = await supabase
      .from('bill_vote_member').select('vote, bills(title, bill_number)')
      .eq('politician_id', id).order('voted_at', { ascending: false }).limit(20);
    setVotes((v ?? []) as typeof votes);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  if (!pol) return <View style={styles.center}><Text>Politician not found</Text></View>;

  const reportEmail = process.env.EXPO_PUBLIC_REPORT_TO_EMAIL ?? '';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.card}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{pol.full_name[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{pol.full_name}</Text>
            <Text style={styles.secondary}>
              {pol.party ? pol.party.charAt(0).toUpperCase() + pol.party.slice(1) : 'Unknown'} &middot; {pol.chamber ?? 'N/A'}
            </Text>
          </View>
        </View>
        {pol.bio && <Text style={styles.bio}>{pol.bio}</Text>}
        <View style={styles.linkRow}>
          {pol.website && <TouchableOpacity onPress={() => Linking.openURL(pol.website!)}><Text style={styles.link}>Website</Text></TouchableOpacity>}
          {pol.email && <TouchableOpacity onPress={() => Linking.openURL(`mailto:${pol.email}`)}><Text style={styles.link}>Email</Text></TouchableOpacity>}
          {pol.phone && <Text style={styles.secondary}>Phone: {pol.phone}</Text>}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Honesty Score</Text>
        {honesty.score ? (
          <>
            <View style={styles.scoreRow}>
              <View style={[styles.scoreCircle, { backgroundColor: honesty.score.score >= 70 ? '#16A34A' : honesty.score.score >= 40 ? '#D97706' : '#DC2626' }]}>
                <Text style={styles.scoreText}>{Math.round(honesty.score.score)}</Text>
              </View>
              <Text style={styles.secondary}>out of 100</Text>
            </View>
            {honesty.evidence.map((e) => (
              <View key={e.id} style={styles.evidenceCard}>
                <View style={styles.chip}><Text style={styles.chipText}>{e.evidence_type.replace(/_/g, ' ')}</Text></View>
                <Text style={styles.evidenceDesc}>{e.description}</Text>
              </View>
            ))}
          </>
        ) : <Text style={styles.muted}>Not yet available.</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Campaign Funding</Text>
        {funding ? (
          <>
            <View style={styles.fundRow}>
              <View><Text style={styles.fundLabel}>Total Raised</Text><Text style={styles.fundVal}>${(funding.total_raised ?? 0).toLocaleString()}</Text></View>
              <View><Text style={styles.fundLabel}>Total Spent</Text><Text style={styles.fundVal}>${(funding.total_spent ?? 0).toLocaleString()}</Text></View>
              <View><Text style={styles.fundLabel}>Cycle</Text><Text style={styles.fundVal}>{funding.cycle}</Text></View>
            </View>
          </>
        ) : fundingAvailable ? (
          <Text style={styles.muted}>Funding data not yet available.</Text>
        ) : (
          <Text style={styles.muted}>Funding data not available for non-federal politicians.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Voting History</Text>
        {votes.length === 0 ? (
          <Text style={styles.muted}>No voting records available yet.</Text>
        ) : votes.map((v, i) => (
          <View key={i} style={{ marginBottom: 8 }}>
            <View style={styles.chip}><Text style={styles.chipText}>{v.vote}</Text></View>
            <Text style={{ fontSize: 14, marginTop: 2 }}>{v.bills?.bill_number}: {v.bills?.title}</Text>
          </View>
        ))}
      </View>

      {reportEmail ? (
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => Linking.openURL(`mailto:${reportEmail}?subject=${encodeURIComponent(`Issue: ${pol.full_name}`)}`)}
        >
          <Text style={styles.reportBtnText}>Report Issue</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1, backgroundColor: '#F9FAFB' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#6B7280' },
  name: { fontSize: 20, fontWeight: '700' },
  secondary: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  bio: { fontSize: 14, color: '#111827', marginBottom: 8 },
  linkRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  link: { fontSize: 14, color: '#2563EB' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  muted: { fontSize: 14, color: '#9CA3AF' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  scoreCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  scoreText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  evidenceCard: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 8, marginBottom: 8 },
  evidenceDesc: { fontSize: 13, marginTop: 4 },
  chip: { backgroundColor: '#DBEAFE', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 12, alignSelf: 'flex-start' },
  chipText: { fontSize: 11, color: '#2563EB', fontWeight: '500' },
  fundRow: { flexDirection: 'row', justifyContent: 'space-between' },
  fundLabel: { fontSize: 12, color: '#9CA3AF' },
  fundVal: { fontSize: 18, fontWeight: '600' },
  reportBtn: { borderWidth: 1, borderColor: '#2563EB', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 24 },
  reportBtnText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
});
