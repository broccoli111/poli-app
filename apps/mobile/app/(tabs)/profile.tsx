import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { registerForPushNotifications } from '../../lib/notifications';

const ALL_CATEGORIES = [
  'Healthcare', 'Education', 'Environment', 'Defense', 'Economy',
  'Immigration', 'Technology', 'Criminal Justice', 'Infrastructure',
  'Civil Rights', 'Agriculture', 'Energy', 'Housing', 'Foreign Policy',
  'Labor', 'Taxes', 'Social Services',
];

export default function ProfileScreen() {
  const { user, profile, address, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [watchedCats, setWatchedCats] = useState<string[]>([]);
  const [prefs, setPrefs] = useState({
    push_enabled: true, email_enabled: true,
    bill_status_change: true, weekly_digest: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWatchedCats(profile?.watched_categories ?? []);
  }, [profile]);

  const loadPrefs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('user_notification_prefs').select('*').eq('user_id', user.id).maybeSingle();
    if (data) setPrefs({
      push_enabled: data.push_enabled, email_enabled: data.email_enabled,
      bill_status_change: data.bill_status_change, weekly_digest: data.weekly_digest,
    });
  }, [user]);

  useEffect(() => { loadPrefs(); }, [loadPrefs]);

  useEffect(() => {
    if (user) registerForPushNotifications(user.id);
  }, [user]);

  const toggleCat = (cat: string) => {
    setWatchedCats((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };

  const saveCats = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({ watched_categories: watchedCats }).eq('id', user.id);
    await refreshProfile();
    setSaving(false);
  };

  const updatePref = async (key: string, value: boolean) => {
    if (!user) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await supabase.from('user_notification_prefs').update(updated).eq('user_id', user.id);
  };

  const reportEmail = process.env.EXPO_PUBLIC_REPORT_TO_EMAIL ?? '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.secondary}>{user?.email}</Text>
        {address && <Text style={styles.muted}>{address.city}, {address.state_code} {address.zip}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Watched Categories</Text>
        <View style={styles.chipContainer}>
          {ALL_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, watchedCats.includes(cat) && styles.chipActive]}
              onPress={() => toggleCat(cat)}
            >
              <Text style={[styles.chipText, watchedCats.includes(cat) && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={saveCats} disabled={saving}>
          <Text style={styles.btnText}>{saving ? 'Saving...' : 'Save Categories'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        {[
          { key: 'push_enabled', label: 'Push Notifications' },
          { key: 'email_enabled', label: 'Email Notifications' },
          { key: 'bill_status_change', label: 'Bill Status Changes' },
          { key: 'weekly_digest', label: 'Weekly Digest' },
        ].map(({ key, label }) => (
          <View key={key} style={styles.prefRow}>
            <Text style={styles.prefLabel}>{label}</Text>
            <Switch
              value={prefs[key as keyof typeof prefs]}
              onValueChange={(v) => updatePref(key, v)}
              trackColor={{ true: '#2563EB' }}
            />
          </View>
        ))}
      </View>

      {reportEmail ? (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#2563EB' }]}
          onPress={() => Linking.openURL(`mailto:${reportEmail}?subject=${encodeURIComponent('Issue Report')}`)}
        >
          <Text style={[styles.btnText, { color: '#2563EB' }]}>Report Issue</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#DC2626', marginTop: 12 }]} onPress={signOut}>
        <Text style={styles.btnText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  secondary: { fontSize: 14, color: '#6B7280' },
  muted: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#DBEAFE', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 16 },
  chipActive: { backgroundColor: '#2563EB' },
  chipText: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  btn: { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  prefLabel: { fontSize: 14 },
});
