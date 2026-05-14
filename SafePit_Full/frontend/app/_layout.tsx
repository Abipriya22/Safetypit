// frontend/app/_layout.tsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { storage } from '../services/api';
import { LanguageProvider } from '../services/LanguageContext';
// This is the root layout of your app. It is shared across all the pages of your app.
export default function RootLayout() {
  const router   = useRouter();
  const segments = useSegments();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const loggedIn = await storage.hasToken();
      const inAuth   = segments[0] === 'login' || segments[0] === undefined || segments[0] === 'index';

      if (!loggedIn && !inAuth) {
        router.replace('/login' as any);
      }
      setChecked(true);
    })();
  }, [segments]);

  if (!checked) return null;

  return (
    <LanguageProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="worker" />
        <Stack.Screen name="checklist" />
        <Stack.Screen name="report" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="supervisor" />
        <Stack.Screen name="supervisor_profile" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="admin_profile" />
      </Stack>
    </LanguageProvider>
  );
}
