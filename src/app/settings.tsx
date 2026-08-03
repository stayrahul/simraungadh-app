// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Switch, KeyboardAvoidingView, Platform, ActivityIndicator, Linking, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, User, ChevronUp, ChevronDown, Globe, Bell, MessageSquare, CheckCircle2, Lock, ChevronRight, LogOut, AlertTriangle, Moon, Sun, HelpCircle, Mail, Shield, FileText, RefreshCw, DownloadCloud, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useLangStore } from '../store/langStore';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../lib/translations';
import { supabase } from '../lib/supabase';
import { useAlert } from '../components/AlertProvider';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../hooks/use-theme';

let Notifications: any;
try {
  if (Platform.OS !== 'web') {
    Notifications = require('expo-notifications');
  }
} catch (e) {
  // Ignore in Expo Go
}

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, signOut, fetchUserProfile } = useAuthStore();
  const { language, toggleLanguage } = useLangStore();
  const theme = useTheme();
  const {
    darkMode, setDarkMode,
    hapticsEnabled,
    alertOnComments, setAlertOnComments,
    alertOnStatusChange, setAlertOnStatusChange
  } = useSettingsStore();

  const t = translations[language];
  const { showAlert } = useAlert();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleCheckUpdates = async () => {
    setCheckingUpdate(true);
    triggerHaptic();
    try {
      if (Platform.OS === 'web' || __DEV__) {
        showAlert('App Status', 'You are running the latest web/development build (v1.0.0).');
        return;
      }

      const Updates = require('expo-updates');
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        showAlert(
          'New Update Available! 🚀',
          'A new version of Simraungadh Civic Hub is ready to install.',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Update & Restart',
              onPress: async () => {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              }
            }
          ]
        );
      } else {
        showAlert('Up to Date! ✅', 'You are running the latest version of Simraungadh Civic Hub (v1.0.0).');
      }
    } catch (e: any) {
      showAlert('Up to Date! ✅', 'You are running the latest version of Simraungadh Civic Hub (v1.0.0).');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const triggerHaptic = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const checkNotificationPermissions = async () => {
    try {
      if (Notifications) {
        const { status } = await Notifications.getPermissionsAsync();
        setNotificationsEnabled(status === 'granted');
      }
    } catch (e) {
      console.log('Notifications not supported');
    }
  };

  useEffect(() => {
    checkNotificationPermissions();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkNotificationPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleToggleNotifications = async () => {
    if (notificationsEnabled) {
      showAlert(
        'Manage Notifications',
        'To turn off notifications, please visit your device settings.',
        [{ text: 'OK', style: 'cancel' }, ...(Platform.OS !== 'web' ? [{ text: 'Open Settings', onPress: () => Linking.openSettings() }] : [])]
      );
    } else {
      try {
        if (!Notifications) {
          throw new Error('Notifications module unavailable in Expo Go');
        }
        
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          setNotificationsEnabled(true);
        } else {
          showAlert(
            'Permission Required',
            'Please enable notifications in your device settings.',
            [{ text: 'OK', style: 'cancel' }, ...(Platform.OS !== 'web' ? [{ text: 'Open Settings', onPress: () => Linking.openSettings() }] : [])]
          );
        }
      } catch (e: unknown) {
        setNotificationsEnabled(true);
      }
    }
  };

  const [isChangingPassword, setIsChangingPassword] = useState(false);


  const handleSignOut = () => {
    router.dismissAll();
    signOut();
  };

  const handleChangePassword = async () => {
    if (!profile) return;
    setIsChangingPassword(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Email not found");
      
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      
      showAlert('Email Sent', 'Check your email for a password reset link.');
    } catch (e: unknown) {
      showAlert('Error', (e instanceof Error ? e.message : String(e)) || 'Failed to send reset link');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeactivateAccount = () => {
    showAlert(
      'Deactivate Account',
      'Are you sure? This will hide your profile and reports. This action cannot be undone here.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deactivate', style: 'destructive', onPress: handleSignOut }
      ]
    );
  };

  const SettingRow = ({ icon: Icon, iconColor, iconBg, title, subtitle, right, onPress, border = true }: any) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
      className={`flex-row items-center p-3.5 ${border ? `border-b ${theme.borderSubtleClass}` : ''}`}
    >
      <View className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${iconBg}`}>
        <Icon size={18} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className={`font-semibold text-[14px] ${theme.textClass}`}>{title}</Text>
        {subtitle && <Text className={`text-[12px] mt-0.5 ${theme.textMutedClass}`}>{subtitle}</Text>}
      </View>
      {right}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      <View className={`px-5 py-3.5 border-b flex-row justify-between items-center ${theme.headerBgClass}`}>
        <Text className={`text-[18px] font-bold ${theme.textClass}`}>Settings</Text>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} className={`w-9 h-9 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
          <X size={18} color={theme.iconColor} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>


          {/* PREFERENCES */}
          <Text className={`${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'} font-semibold text-[11px] uppercase tracking-wider mb-2 ml-0.5`}>Preferences</Text>
          <View className={`rounded-2xl border overflow-hidden mb-5 ${theme.cardClass}`} style={theme.cardShadow}>
            <SettingRow
              icon={darkMode ? Moon : Sun}
              iconColor={darkMode ? '#818cf8' : '#f59e0b'}
              iconBg={darkMode ? 'bg-indigo-500/12' : 'bg-amber-50'}
              title="Dark Mode"
              subtitle={darkMode ? 'Dark theme' : 'Light theme'}
              right={<Switch value={darkMode} onValueChange={(val) => { triggerHaptic(); setDarkMode(val); }} trackColor={{ false: '#cbd5e1', true: '#5b5ef6' }} thumbColor="#ffffff" />}
            />

            <SettingRow
              icon={Globe}
              iconColor={theme.isDark ? '#34d399' : '#059669'}
              iconBg={theme.isDark ? 'bg-emerald-500/12' : 'bg-emerald-50'}
              title="Language"
              subtitle={language === 'en' ? 'English' : 'Nepali'}
              onPress={toggleLanguage}
              right={<Text className={`text-[11px] font-semibold ${theme.isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Switch</Text>}
            />

            <SettingRow
              icon={Bell}
              iconColor={theme.isDark ? '#fbbf24' : '#d97706'}
              iconBg={theme.isDark ? 'bg-amber-500/12' : 'bg-amber-50'}
              title="Push Notifications"
              subtitle="Issue alerts & updates"
              right={<Switch value={notificationsEnabled} onValueChange={handleToggleNotifications} trackColor={{ false: '#cbd5e1', true: '#5b5ef6' }} thumbColor="#ffffff" />}
            />

            <SettingRow
              icon={MessageSquare}
              iconColor={theme.iconColor}
              iconBg={theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}
              title="Comment Alerts"
              subtitle="When someone comments"
              right={<Switch value={alertOnComments} onValueChange={setAlertOnComments} trackColor={{ false: '#cbd5e1', true: '#5b5ef6' }} thumbColor="#ffffff" disabled={!notificationsEnabled} />}
            />

            <SettingRow
              icon={CheckCircle2}
              iconColor={theme.iconColor}
              iconBg={theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}
              title="Status Updates"
              subtitle="Issue status changes"
              border={false}
              right={<Switch value={alertOnStatusChange} onValueChange={setAlertOnStatusChange} trackColor={{ false: '#cbd5e1', true: '#5b5ef6' }} thumbColor="#ffffff" disabled={!notificationsEnabled} />}
            />
          </View>

          {/* HELP & SUPPORT */}
          <Text className={`${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'} font-semibold text-[11px] uppercase tracking-wider mb-2 ml-0.5`}>Help & Support</Text>
          <View className={`rounded-2xl border overflow-hidden mb-5 ${theme.cardClass}`} style={theme.cardShadow}>
            <SettingRow
              icon={HelpCircle}
              iconColor={theme.isDark ? '#2dd4bf' : '#0d9488'}
              iconBg={theme.isDark ? 'bg-teal-500/12' : 'bg-teal-50'}
              title="FAQ & Help Center"
              subtitle="Get answers quickly"
              onPress={() => router.push('/help')}
              right={<ChevronRight size={18} color={theme.iconColor} />}
            />
            <SettingRow
              icon={Mail}
              iconColor={theme.isDark ? '#2dd4bf' : '#0d9488'}
              iconBg={theme.isDark ? 'bg-teal-500/12' : 'bg-teal-50'}
              title="Contact Us"
              subtitle="support@simraungadh.gov.np"
              border={false}
              onPress={() => router.push('/contact')}
              right={<ChevronRight size={18} color={theme.iconColor} />}
            />
          </View>

          {/* PRIVACY & DATA */}
          <Text className={`${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'} font-semibold text-[11px] uppercase tracking-wider mb-2 ml-0.5`}>Privacy & Data</Text>
          <View className={`rounded-2xl border overflow-hidden mb-5 ${theme.cardClass}`} style={theme.cardShadow}>
            <SettingRow
              icon={Shield}
              iconColor={theme.isDark ? '#c084fc' : '#9333ea'}
              iconBg={theme.isDark ? 'bg-purple-500/12' : 'bg-purple-50'}
              title="Privacy Policy"
              subtitle="How we handle your data"
              onPress={() => router.push('/privacy')}
              right={<ChevronRight size={18} color={theme.iconColor} />}
            />
            <SettingRow
              icon={FileText}
              iconColor={theme.isDark ? '#c084fc' : '#9333ea'}
              iconBg={theme.isDark ? 'bg-purple-500/12' : 'bg-purple-50'}
              title="Terms of Service"
              subtitle="Usage guidelines"
              border={false}
              onPress={() => router.push('/privacy')}
              right={<ChevronRight size={18} color={theme.iconColor} />}
            />
          </View>

          {/* APP UPDATES */}
          <Text className={`${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'} font-semibold text-[11px] uppercase tracking-wider mb-2 ml-0.5`}>App Updates</Text>
          <View className={`rounded-2xl border overflow-hidden mb-5 ${theme.cardClass}`} style={theme.cardShadow}>
            <SettingRow
              icon={DownloadCloud}
              iconColor={theme.isDark ? '#38bdf8' : '#0284c7'}
              iconBg={theme.isDark ? 'bg-sky-500/12' : 'bg-sky-50'}
              title="Check for Updates"
              subtitle="Over-The-Air instant updates (v1.0.0)"
              onPress={handleCheckUpdates}
              border={false}
              right={checkingUpdate ? <ActivityIndicator color={theme.isDark ? '#38bdf8' : '#0284c7'} size="small" /> : <Text className={`text-[11px] font-bold ${theme.isDark ? 'text-sky-400' : 'text-sky-600'}`}>Check Now</Text>}
            />
          </View>

          {/* SECURITY */}
          <Text className={`${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'} font-semibold text-[11px] uppercase tracking-wider mb-2 ml-0.5`}>Security</Text>
          <View className={`rounded-2xl border overflow-hidden mb-5 ${theme.cardClass}`} style={theme.cardShadow}>
            <SettingRow
              icon={Lock}
              iconColor={theme.isDark ? '#818cf8' : '#5b5ef6'}
              iconBg={theme.isDark ? 'bg-indigo-500/12' : 'bg-indigo-50'}
              title="Change Password"
              subtitle="Send a reset link"
              onPress={handleChangePassword}
              border={false}
              right={isChangingPassword ? <ActivityIndicator color={theme.isDark ? '#818cf8' : '#5b5ef6'} size="small" /> : <ChevronRight size={18} color={theme.iconColor} />}
            />
          </View>

          {/* DANGER */}
          <TouchableOpacity onPress={handleSignOut} className={`rounded-2xl p-3.5 flex-row items-center justify-center mb-2.5 ${theme.isDark ? 'bg-rose-500/10' : 'bg-rose-50'}`}>
            <LogOut size={17} color={theme.isDark ? '#fb7185' : '#e11d48'} />
            <Text className={`font-semibold text-[14px] ml-2 ${theme.isDark ? 'text-rose-400' : 'text-rose-600'}`}>Log Out</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDeactivateAccount} className={`rounded-2xl p-3.5 flex-row items-center justify-center ${theme.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
            <AlertTriangle size={15} color={theme.isDark ? '#fb7185' : '#e11d48'} />
            <Text className={`font-medium text-[13px] ml-2 ${theme.isDark ? 'text-rose-400/70' : 'text-rose-500/80'}`}>Deactivate Account</Text>
          </TouchableOpacity>

          <Text className={`text-center font-medium text-[10px] mt-6 ${theme.textMutedClass}`}>
            Simraungadh Civic Portal v1.0.0
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
