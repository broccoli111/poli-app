import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import type { Bill, BillCategory } from '@poli/types';

type BillRow = Bill & { bill_categories: BillCategory[] };

export default function HomeScreen() {
  const { address, profile } = useAuth();
  const router = useRouter();
  const [bills, setBills] = useState<BillRow[]>([]);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadBills = useCallback(async () => {
    if (!address) return;
    const { data: jurisdictions } = await supabase
      .from('jurisdictions')
      .select('id')
      .or(`level.eq.federal,and(level.eq.state,state_code.eq.${address.state_code})`);

    const ids = (jurisdictions ?? []).map((j: { id: string }) => j.id);
    if (!ids.length) { setBills([]); setLoading(false); return; }

    const { data } = await supabase
      .from('bills')
      .select('*, bill_categories(*)')
      .in('jurisdiction_id', ids)
      .order('updated_at', { ascending: false })
      .limit(30);

    setBills((data ?? []) as BillRow[]);
    setLoading(false);
  }, [address]);

  const loadBookmarks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('user_bookmarks').select('bill_id').eq('user_id', user.id);
    setBookmarkIds(new Set((data ?? []).map((b: { bill_id: string }) => b.bill_id)));
  }, []);

  useEffect(() => { loadBills(); loadBookmarks(); }, [loadBills, loadBookmarks]);

  const toggleBookmark = async (billId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (bookmarkIds.has(billId)) {
      await supabase.from('user_bookmarks').delete().eq('user_id', user.id).eq('bill_id', billId);
      setBookmarkIds((prev) => { const s = new Set(prev); s.delete(billId); return s; });
    } else {
      await supabase.from('user_bookmarks').insert({ user_id: user.id, bill_id: billId });
      setBookmarkIds((prev) => new Set(prev).add(billId));
    }
  };

  const watchedCats = new Set(profile?.watched_categories ?? []);
  const showEye = (bill: BillRow) => {
    if (bookmarkIds.has(bill.id)) return true;
    return bill.bill_categories.some((c) => watchedCats.has(c.category)) &&
      !['dead', 'enacted'].includes(bill.status);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;

  if (!bills.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No bills found</Text>
        <Text style={styles.emptyMsg}>Bills for your area will appear once data is ingested.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={bills}
      keyExtractor={(b) => b.id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item: bill }) => (
        <TouchableOpacity style={styles.card} onPress={() => router.push(`/bill/${bill.id}`)}>
          <View style={styles.row}>
            <Text style={styles.billNumber}>{bill.bill_number}</Text>
            <View style={styles.row}>
              {showEye(bill) && <Text style={{ marginRight: 8 }}>👁</Text>}
              <TouchableOpacity onPress={() => toggleBookmark(bill.id)}>
                <Text style={{ fontSize: 20 }}>{bookmarkIds.has(bill.id) ? '★' : '☆'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.title} numberOfLines={2}>{bill.title}</Text>
          <View style={[styles.row, { flexWrap: 'wrap', gap: 4, marginTop: 6 }]}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{bill.status.replace(/_/g, ' ')}</Text>
            </View>
            {bill.bill_categories.slice(0, 2).map((c) => (
              <View key={c.id} style={styles.chip}>
                <Text style={styles.chipText}>{c.category}</Text>
              </View>
            ))}
          </View>
          {bill.expected_vote_date && (
            <Text style={styles.voteDate}>Expected vote: {new Date(bill.expected_vote_date).toLocaleDateString()}</Text>
          )}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#6B7280' },
  emptyMsg: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billNumber: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  title: { fontSize: 16, fontWeight: '500', marginTop: 4 },
  chip: { backgroundColor: '#DBEAFE', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 12 },
  chipText: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
  voteDate: { fontSize: 12, color: '#D97706', marginTop: 6 },
});
