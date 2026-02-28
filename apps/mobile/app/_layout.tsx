import { Stack } from 'expo-router';
import { AuthProvider } from '../lib/auth-context';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
        <Stack.Screen name="onboarding" options={{ presentation: 'modal', gestureEnabled: false }} />
        <Stack.Screen name="bill/[id]" options={{ headerShown: true, title: 'Bill Detail' }} />
        <Stack.Screen name="politician/[id]" options={{ headerShown: true, title: 'Politician' }} />
      </Stack>
    </AuthProvider>
  );
}
