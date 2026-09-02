// @ts-nocheck
import '../../global.css';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import { Animated, View, Text, Image, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { AlertProvider } from '../components/AlertProvider';
import { useNotifications } from '../hooks/useNotifications';
import { useTheme } from '../hooks/use-theme';
import { OfflineIndicator } from '../components/OfflineIndicator';

// Keep the native splash screen visible while we set up our custom one
SplashScreen.preventAutoHideAsync();

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

  const theme = useTheme();
  
  // Splash Screen State
  const [appIsReady, setAppIsReady] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
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

  // Prepare app and hide splash screen
  useEffect(() => {
    async function prepare() {
      try {
        // Minimum delay to show the beautiful splash screen (2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        // Hide the native splash screen
        await SplashScreen.hideAsync();
        
        // Fade out our custom splash screen overlay
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    }
    prepare();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <View style={{ flex: 1 }}>
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
        <Stack.Screen name="saved" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="help" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ headerShown: false }} />
        <Stack.Screen name="contact" options={{ headerShown: false }} />
        <Stack.Screen name="feedback" options={{ headerShown: false }} />
      </Stack>
      <OfflineIndicator />
      <StatusBar style={theme.statusBar} />
      </AlertProvider>

      {/* Custom Splash Screen Overlay */}
      {!appIsReady && (
        <Animated.View style={{ 
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: theme.isDark ? '#0A0A0C' : '#FFFFFF',
          justifyContent: 'center', alignItems: 'center',
          opacity: fadeAnim,
          zIndex: 9999
        }}>
           {/* Center Logo */}
           <View style={{ width: 100, height: 100, backgroundColor: '#4F46E5', borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 }}>
             <Text style={{ color: '#FFFFFF', fontSize: 64, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif' }}>S</Text>
           </View>
           
           {/* Footer Text */}
           <View style={{ position: 'absolute', bottom: 50, alignItems: 'center' }}>
             <Text style={{ color: theme.isDark ? '#777587' : '#65676B', fontSize: 14, fontWeight: '600', letterSpacing: 1 }}>from</Text>
             <Text style={{ color: theme.isDark ? '#FFFFFF' : '#1C1E21', fontSize: 24, fontWeight: '900', marginTop: 2, letterSpacing: 1.5 }}>Simraungadh</Text>
           </View>
        </Animated.View>
      )}
    </View>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
