// @ts-nocheck
import { useEffect, useState, useRef } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { registerForPushNotificationsAsync } from '../lib/notifications';

let Notifications: any;
try {
  if (Platform.OS !== 'web') {
    Notifications = require('expo-notifications');
  }
} catch (e) {
  // Ignore
}

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const { profile, fetchUserProfile } = useAuthStore();
  const isRegisteredRef = useRef(false);

  useEffect(() => {
    if (!profile?.id || isRegisteredRef.current) return;

    const initPush = async () => {
      try {
        const token = await registerForPushNotificationsAsync(profile.id);
        if (token) {
          setExpoPushToken(token);
          await fetchUserProfile();
        }
        isRegisteredRef.current = true;
      } catch (e) {
        console.log('Error initializing push notifications:', e);
      }
    };

    initPush();
  }, [profile?.id]);

  // Realtime Supabase listener for incoming notifications
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`user-notifications:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        async (payload) => {
          if (payload.new && Notifications) {
            try {
              const notif = payload.new;
              const title = notif.title?.startsWith('Simraungadh')
                ? notif.title
                : `Simraungadh Hub • ${notif.title}`;

              await Notifications.scheduleNotificationAsync({
                content: {
                  title,
                  body: notif.body,
                  data: {
                    referenceId: notif.reference_id,
                    type: notif.type,
                  },
                  sound: 'default',
                },
                trigger: null, // immediate
              });
            } catch (e) {
              console.log('Error scheduling local notification:', e);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return { expoPushToken };
}
