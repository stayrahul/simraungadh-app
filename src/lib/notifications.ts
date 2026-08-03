// @ts-nocheck
import { Platform } from 'react-native';
import { supabase } from './supabase';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

let Notifications: any;
try {
  if (Platform.OS !== 'web') {
    Notifications = require('expo-notifications');
  }
} catch (e) {
  console.log('expo-notifications module not loaded');
}

// Foreground handler setup
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
  // Ignore
}

/**
 * Register device for Push Notifications & save push_token in profiles table
 */
export async function registerForPushNotificationsAsync(userId?: string) {
  try {
    if (!userId) return null;

    let token = null;

    if (Platform.OS === 'android' && Notifications) {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Simraungadh Announcements',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
      });

      await Notifications.setNotificationChannelAsync('emergency', {
        name: 'Simraungadh Emergency Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#ef4444',
      });
    }

    if (Device.isDevice && Notifications) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token: permission not granted');
        return null;
      }

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId ?? 'simraungadh-hub';

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        token = tokenData?.data;
      } catch (err) {
        console.log('getExpoPushTokenAsync error:', err);
      }
    }

    if (token && userId) {
      await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);
      console.log('Successfully saved push_token for user:', userId, token);
    }

    return token;
  } catch (e) {
    console.error('Error in push notification registration:', e);
    return null;
  }
}

/**
 * Helper to send HTTP Push Notification via Expo Push Service
 */
export async function sendExpoPushNotification({
  pushTokens,
  title,
  body,
  data = {},
  isEmergency = false,
}: {
  pushTokens: string | string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  isEmergency?: boolean;
}) {
  try {
    const tokens = Array.isArray(pushTokens) ? pushTokens : [pushTokens];
    const validTokens = tokens.filter(t => t && typeof t === 'string' && t.startsWith('ExponentPushToken'));

    if (validTokens.length === 0) return;

    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title: title.startsWith('Simraungadh') ? title : `Simraungadh Hub • ${title}`,
      body: body,
      data: data,
      channelId: isEmergency ? 'emergency' : 'default',
      priority: isEmergency ? 'high' : 'normal',
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.error('Failed to send Expo Push Notification:', e);
  }
}

/**
 * Create an in-app & push notification for a single user
 */
export async function createNotification({
  userId,
  title,
  body,
  type,
  referenceId,
  isEmergency = false,
}: {
  userId: string;
  title: string;
  body: string;
  type: 'status_update' | 'new_comment' | 'new_like' | 'new_follow' | 'broadcast';
  referenceId?: string | null;
  isEmergency?: boolean;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    // Do not notify oneself
    if (currentUserId && currentUserId === userId) {
      return;
    }

    const formattedTitle = title.startsWith('Simraungadh') ? title : `Simraungadh Hub • ${title}`;

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .maybeSingle();

    await supabase.from('notifications').insert({
      user_id: userId,
      title: formattedTitle,
      body,
      type,
      reference_id: referenceId || null,
      is_read: false,
    });

    if (targetProfile?.push_token) {
      await sendExpoPushNotification({
        pushTokens: targetProfile.push_token,
        title: formattedTitle,
        body,
        data: { referenceId, type },
        isEmergency,
      });
    }
  } catch (e) {
    console.error('Failed to create notification:', e);
  }
}

/**
 * Send a broadcast notification to ALL citizens/officials
 */
export async function sendBroadcastNotification({
  title,
  body,
  referenceId,
  isEmergency = false,
}: {
  title: string;
  body: string;
  referenceId?: string | null;
  isEmergency?: boolean;
}) {
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, push_token');

    if (!profiles || profiles.length === 0) return;

    const formattedTitle = isEmergency 
      ? `🚨 SIMRAUNGADH EMERGENCY • ${title}`
      : `📢 SIMRAUNGADH NOTICE • ${title}`;

    const notificationRows = profiles.map(p => ({
      user_id: p.id,
      title: formattedTitle,
      body,
      type: 'broadcast',
      reference_id: referenceId || null,
      is_read: false,
    }));

    await supabase.from('notifications').insert(notificationRows);

    const validTokens = profiles
      .map(p => p.push_token)
      .filter(t => t && typeof t === 'string' && t.startsWith('ExponentPushToken'));

    if (validTokens.length > 0) {
      await sendExpoPushNotification({
        pushTokens: validTokens,
        title: formattedTitle,
        body,
        data: { referenceId, type: 'broadcast' },
        isEmergency,
      });
    }
  } catch (e) {
    console.error('Failed to send broadcast notification:', e);
  }
}
