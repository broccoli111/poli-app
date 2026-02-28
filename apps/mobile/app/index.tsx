import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { user, address, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!user) return <Redirect href="/auth" />;
  if (!address) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/home" />;
}
