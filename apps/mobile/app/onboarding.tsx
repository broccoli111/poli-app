import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';

export default function OnboardingScreen() {
  const { user, refreshAddress } = useAuth();
  const router = useRouter();
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    if (!line1 || !city || !stateCode || !zip) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('addresses').insert({
      user_id: user.id,
      line1,
      city,
      state_code: stateCode.toUpperCase(),
      zip,
      is_primary: true,
      federal_house: 'at-large',
    });
    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }
    await refreshAddress();
    setLoading(false);
    router.replace('/');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Welcome to Poli</Text>
      <Text style={styles.subtitle}>Enter your address to see relevant bills and representatives.</Text>

      <TextInput style={styles.input} placeholder="Street Address" value={line1} onChangeText={setLine1} />
      <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="State (e.g. CA)" value={stateCode} onChangeText={setStateCode} maxLength={2} autoCapitalize="characters" />
        <TextInput style={[styles.input, { flex: 1, marginLeft: 8 }]} placeholder="ZIP" value={zip} onChangeText={setZip} keyboardType="number-pad" maxLength={10} />
      </View>

      <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Saving...' : 'Save & Continue'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 24 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    padding: 12, fontSize: 16, backgroundColor: '#fff', marginBottom: 12,
  },
  row: { flexDirection: 'row' },
  btn: {
    backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
