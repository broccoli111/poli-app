import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import * as AppleAuthentication from 'expo-apple-authentication';

type Mode = 'signin' | 'signup' | 'magic';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        Alert.alert('Check your email', 'We sent you a magic link!');
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert('Success', 'Check your email to confirm.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/');
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'poli://auth-callback' },
    });
    if (error) Alert.alert('Error', error.message);
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') return;
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });

      if (credential.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        if (error) throw error;
        router.replace('/');
      }
    } catch (err: unknown) {
      if ((err as { code?: string })?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Error', err instanceof Error ? err.message : 'Apple sign in failed');
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>Poli</Text>

      <View style={styles.tabs}>
        {(['signin', 'signup', 'magic'] as Mode[]).map((m) => (
          <TouchableOpacity key={m} style={[styles.tab, mode === m && styles.tabActive]} onPress={() => setMode(m)}>
            <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
              {m === 'signin' ? 'Sign In' : m === 'signup' ? 'Sign Up' : 'Magic Link'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {mode !== 'magic' && (
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      )}

      <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.btnPrimaryText}>
          {loading ? 'Loading...' : mode === 'signup' ? 'Create Account' : mode === 'magic' ? 'Send Magic Link' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.divider}>Or continue with</Text>

      <View style={styles.oauthRow}>
        <TouchableOpacity style={styles.btnOutline} onPress={handleGoogleOAuth}>
          <Text style={styles.btnOutlineText}>Google</Text>
        </TouchableOpacity>
        {Platform.OS === 'ios' && (
          <TouchableOpacity style={styles.btnOutline} onPress={handleAppleSignIn}>
            <Text style={styles.btnOutlineText}>Apple</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 24, paddingTop: 80, alignItems: 'center' },
  brand: { fontSize: 32, fontWeight: '700', color: '#2563EB', marginBottom: 32 },
  tabs: { flexDirection: 'row', marginBottom: 24, backgroundColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden' },
  tab: { paddingVertical: 10, paddingHorizontal: 16 },
  tabActive: { backgroundColor: '#2563EB' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#fff' },
  input: {
    width: '100%', maxWidth: 360, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    padding: 12, fontSize: 16, backgroundColor: '#fff', marginBottom: 12,
  },
  btnPrimary: {
    width: '100%', maxWidth: 360, backgroundColor: '#2563EB', borderRadius: 8,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  divider: { color: '#9CA3AF', fontSize: 14, marginVertical: 20 },
  oauthRow: { flexDirection: 'row', gap: 12 },
  btnOutline: {
    borderWidth: 1, borderColor: '#2563EB', borderRadius: 8,
    paddingVertical: 12, paddingHorizontal: 24,
  },
  btnOutlineText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
});
