// @ts-nocheck
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { supabase } from './supabase';

try {
  WebBrowser.maybeCompleteAuthSession();
} catch (e) {
  console.log('WebBrowser setup error:', e);
}

export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
    if (error) throw error;
    return { data, isNative: false };
  } else {
    // Native (iOS / Android / Expo Go)
    const redirectUrl = Linking.createURL('/login');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) throw error;

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success' && result.url) {
        const params = extractParamsFromUrl(result.url);
        if (params.code) {
          const { data: sessionData, error: sessionErr } = await supabase.auth.exchangeCodeForSession(params.code);
          if (sessionErr) throw sessionErr;
          return { data: sessionData, isNative: true };
        } else if (params.access_token && params.refresh_token) {
          const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (sessionErr) throw sessionErr;
          return { data: sessionData, isNative: true };
        }
      }
    }
    return { data, isNative: true };
  }
}

function extractParamsFromUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!url) return params;

  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');

  let queryString = '';
  if (hashIndex !== -1) {
    queryString = url.substring(hashIndex + 1);
  } else if (queryIndex !== -1) {
    queryString = url.substring(queryIndex + 1);
  }

  if (queryString) {
    const pairs = queryString.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
      }
    }
  }
  return params;
}
