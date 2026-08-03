// @ts-nocheck
import '../../global.css';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Platform } from 'react-native';
import { AlertProvider } from '../components/AlertProvider';
import { useNotifications } from '../hooks/useNotifications';

import { useTheme } from '../hooks/use-theme';
let Notifications: any;
try {
  if (Platform.OS !== 'web') {
    Notifications = require('expo-notifications');
  }
} catch (e) {
  console.log('Push notifications not available in Expo Go');
}

// Configure how notifications are handled when the app is in the foreground
try {
  if (Notifications) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (e) {
  console.log('Push notifications not supported in this environment');
}

export default function Layout() {
  const { setSession } = useAuthStore();
  const router = useRouter();
  const theme = useTheme();
  
  // Initialize notifications logic (requests permissions & saves token)
  useNotifications();

  // Auto check and fetch Over-The-Air updates on app startup
  useEffect(() => {
    async function checkOTAUpdates() {
      try {
        if (!__DEV__ && Platform.OS !== 'web') {
          const Updates = require('expo-updates');
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }
        }
      } catch (e) {
        console.log('OTA update check info:', e);
      }
    }
    checkOTAUpdates();
  }, []);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      if (url.includes('access_token') || url.includes('code=') || url.includes('#') || url.includes('?')) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSession(session);
        }
      }
    };

    let linkSub: any;
    try {
      const Linking = require('expo-linking');
      Linking.getInitialURL().then(handleUrl);
      linkSub = Linking.addEventListener('url', (e: any) => handleUrl(e.url));
    } catch (err) {
      console.log('Linking listener error:', err);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    let notificationSubscription: any;
    try {
      if (Notifications) {
        notificationSubscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
          const data = response.notification.request.content.data;
          router.push('/notifications');
        });
      }
    } catch (e) {
      console.log('Notification listener error:', e);
    }

    return () => {
      if (linkSub) linkSub.remove();
      subscription.unsubscribe();
      if (notificationSubscription) notificationSubscription.remove();
    };
  }, []);

  return (
    <AlertProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          contentStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' },
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="complete-profile" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="report" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="publish-notice" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="issue/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={theme.statusBar} />
    </AlertProvider>
  );
}
