// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, KeyboardAvoidingView, Platform, ActivityIndicator, Linking, AppState, Share, Modal } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Globe, Bell, MessageSquare, CheckCircle2, Lock, ChevronRight, LogOut, Moon, Sun, HelpCircle, Mail, Shield, FileText, DownloadCloud, Fingerprint, Volume2, Share2, Star, ShieldAlert, Code2, Heart, Database, Smartphone, Activity, Bookmark } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useLangStore } from '../store/langStore';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../lib/translations';
import { supabase } from '../lib/supabase';
import { useAlert } from '../components/AlertProvider';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Footer from '../components/Footer';
import { useTheme } from '../hooks/use-theme';
import { UserBadges } from '../components/UserBadges';

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
  const { profile, signOut } = useAuthStore();
  const { language, toggleLanguage } = useLangStore();
  const theme = useTheme();
  const {
    darkMode, setDarkMode,
    hapticsEnabled, setHapticsEnabled,
    reducedMotion, setReducedMotion,
    inAppSounds, setInAppSounds,
    biometricUnlock, setBiometricUnlock,
    dataSaverMode, setDataSaverMode,
    alertOnComments, setAlertOnComments,
    alertOnStatusChange, setAlertOnStatusChange
  } = useSettingsStore();

  const t = translations[language];
  const { showAlert } = useAlert();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [cacheSize, setCacheSize] = useState('Checking...');

  const calculateCacheSize = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      for (const key of keys) {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          totalSize += item.length;
        }
      }
      const kb = totalSize / 1024;
      if (kb > 1024) {
        setCacheSize(`${(kb / 1024).toFixed(2)} MB`);
      } else {
        setCacheSize(`${kb.toFixed(2)} KB`);
      }
    } catch (e) {
      setCacheSize('Unknown');
    }
  };

  useEffect(() => {
    calculateCacheSize();
  }, []);

  const handleClearCache = async () => {
    triggerHaptic();
    showAlert(
      'Clear Cache',
      'Are you sure you want to clear the app cache? You may need to log in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: async () => {
          await AsyncStorage.clear();
          setCacheSize('0.00 KB');
          showAlert('Success', 'Cache cleared successfully.');
          signOut();
        }}
      ]
    );
  };

  const triggerHaptic = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdate(true);
    triggerHaptic();
    try {
      if (Platform.OS === 'web' || __DEV__) {
        setTimeout(() => {
          setCheckingUpdate(false);
          showAlert('App Up to Date', 'You are currently running the latest version (v1.0.0).');
        }, 1000);
        return;
      }
      const Updates = require('expo-updates');
      const update = await Updates.checkForUpdateAsync();
      setCheckingUpdate(false);
      if (update.isAvailable) {
        showAlert(
          'Update Available',
          'A new update is available. Would you like to download and restart now?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Update Now',
              onPress: async () => {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              }
            }
          ]
        );
      } else {
        showAlert('App Up to Date', 'You are running the latest version.');
      }
    } catch (e: any) {
      setCheckingUpdate(false);
      showAlert('App Up to Date', 'You are running the latest version of Simraungadh.');
    }
  };

  const handleChangePassword = async () => {
    if (!profile?.id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      showAlert('Notice', 'No email address linked to password reset.');
      return;
    }

    setIsChangingPassword(true);
    triggerHaptic();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: 'https://simraungadh.live/reset-password',
      });
      if (error) throw error;
      showAlert('Password Reset Email Sent', `We sent a reset link to ${user.email}. Please check your inbox.`);
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to send password reset email.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = () => {
    triggerHaptic();
    showAlert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(tabs)');
          }
        }
      ]
    );
  };

  const handleShareApp = async () => {
    try {
      triggerHaptic();
      await Share.share({
        message: 'Join Simraungadh Civic Hub! Report issues, stay updated with municipal notices, and connect with local services:\nhttps://simraungadh.live',
      });
    } catch (e) {
      console.log(e);
    }
  };

  const handleRateApp = () => {
    triggerHaptic();
    showAlert('Thank You!', 'We appreciate your support! Rating feature will open the App Store / Play Store upon official store release.');
  };

  const SettingRow = ({ icon: Icon, title, subtitle, rightElement, onPress, isDestructive, iconColor, isLast }: any) => {
    const iconBgColor = isDestructive 
      ? (theme.isDark ? 'rgba(255,69,58,0.15)' : 'rgba(255,59,48,0.08)') 
      : (iconColor ? `${iconColor}18` : (theme.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(79,70,229,0.08)'));

    return (
      <TouchableOpacity
        onPress={() => { if (onPress) { triggerHaptic(); onPress(); } }}
        activeOpacity={0.7}
        className={`flex-row items-center px-4 py-3.5 ${isLast ? '' : `border-b ${theme.isDark ? 'border-white/5' : 'border-slate-100'}`}`}
      >
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 14, backgroundColor: iconBgColor }}>
          <Icon size={18} color={isDestructive ? (theme.isDark ? '#fb7185' : '#e11d48') : iconColor || theme.iconColor} strokeWidth={2.2} />
        </View>
        <View className="flex-1 mr-2">
          <Text className={`text-[15px] font-bold ${isDestructive ? (theme.isDark ? 'text-rose-400' : 'text-rose-600') : theme.textClass}`}>{title}</Text>
          {subtitle && <Text className={`text-[12px] font-medium mt-0.5 ${theme.textSecondaryClass}`}>{subtitle}</Text>}
        </View>
        <View>
          {rightElement || <ChevronRight size={18} color={theme.isDark ? '#475569' : '#cbd5e1'} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderProfileHeader = () => {
    if (!profile) return null;
    return (
      <View className="items-center mb-8 mt-2">
        <View className="flex-col items-center">
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} className="w-[80px] h-[80px] rounded-full mr-4 bg-slate-200" transition={200} cachePolicy="memory-disk" />
          ) : (
            <View className={`w-[80px] h-[80px] rounded-full mr-4 items-center justify-center ${theme.isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
              <Text className={`text-[32px] font-black ${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View className="items-center mt-3">
            <View className="flex-row items-center mb-1.5">
              <Text className={`font-black text-[24px] tracking-tight ${theme.textClass}`}>{profile.full_name || 'Citizen'}</Text>
              <UserBadges badges={profile.badges || (profile.is_verified ? ['verified'] : [])} size={22} />
            </View>
            <View className="flex-row items-center">
              <View className={`px-3 py-1.5 rounded-full mr-2 ${theme.isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                <Text className={`text-[11px] font-black uppercase tracking-widest ${theme.textSecondaryClass}`}>
                  {profile.role === 'admin' ? 'Administrator' : profile.role === 'moderator' ? 'Moderator' : 'Citizen'}
                </Text>
              </View>
              {profile.home_ward && (
                <Text className={`text-[12px] font-medium ${theme.textMutedClass}`}>Ward {profile.home_ward}</Text>
              )}
            </View>
            {profile.created_at && (
              <Text className={`text-[11px] font-medium mt-1.5 ${theme.textMutedClass}`}>
                Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => { triggerHaptic(); router.push('/complete-profile?fromSettings=true'); }}
          className="mt-4 px-6 py-2.5 rounded-full items-center justify-center flex-row border border-indigo-500/20 bg-indigo-500/10"
        >
          <Text className={`font-bold text-[14px] ${theme.isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>Manage Profile</Text>
          <ChevronRight size={15} color={theme.isDark ? '#818cf8' : '#4f46e5'} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      <View className="px-5 pt-4 pb-2 flex-row justify-end items-center z-10">
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}>
          <X size={20} color={theme.iconColor} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {renderProfileHeader()}

          <View className={`mb-6 ${theme.glassCardClass}`} style={theme.cardShadow}>
            <SettingRow
              icon={Bookmark}
              iconColor={theme.isDark ? '#38bdf8' : '#0ea5e9'}
              title="Saved Posts"
              subtitle="View your bookmarked civic issues"
              onPress={() => router.push('/saved')}
              isLast
            />
          </View>

          {/* APP EXPERIENCE */}
          <Text className={`text-[13px] font-black tracking-widest uppercase mb-3 ml-4 opacity-50 ${theme.textClass}`}>App Experience</Text>
          <View className={`mb-8 ${theme.glassCardClass}`} style={theme.cardShadow}>
            <SettingRow
              icon={Fingerprint}
              iconColor={theme.isDark ? '#fb923c' : '#ea580c'}
              title="Biometric Unlock"
              subtitle="Require Face ID or Touch ID"
              rightElement={<Switch value={biometricUnlock} onValueChange={setBiometricUnlock} trackColor={{ true: '#6366f1', false: theme.isDark ? '#334155' : '#e2e8f0' }} />}
            />
            <SettingRow
              icon={darkMode ? Moon : Sun}
              iconColor={darkMode ? '#818cf8' : '#f59e0b'}
              title="Dark Mode"
              subtitle={darkMode ? 'Dark theme' : 'Light theme'}
              rightElement={<Switch value={darkMode} onValueChange={(val) => { triggerHaptic(); setDarkMode(val); }} trackColor={{ false: theme.isDark ? '#334155' : '#e2e8f0', true: '#6366f1' }} />}
            />
            <SettingRow
              icon={Globe}
              iconColor={theme.isDark ? '#34d399' : '#059669'}
              title="Language"
              subtitle={language === 'en' ? 'English' : 'Nepali'}
              onPress={toggleLanguage}
              rightElement={<Text className={`text-[12px] font-bold ${theme.isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Switch</Text>}
            />
            <SettingRow
              icon={Volume2}
              iconColor={theme.isDark ? '#60a5fa' : '#3b82f6'}
              title="In-App Sounds"
              rightElement={<Switch value={inAppSounds} onValueChange={setInAppSounds} trackColor={{ true: '#6366f1', false: theme.isDark ? '#334155' : '#e2e8f0' }} />}
              isLast
            />
          </View>

          {/* NOTIFICATIONS */}
          <Text className={`text-[13px] font-black tracking-widest uppercase mb-3 ml-4 opacity-50 ${theme.textClass}`}>Notifications</Text>
          <View className={`mb-8 ${theme.glassCardClass}`} style={theme.cardShadow}>
            <SettingRow
              icon={Bell}
              iconColor={theme.isDark ? '#fbbf24' : '#d97706'}
              title="Push Notifications"
              subtitle="Allow system alerts"
              rightElement={<Switch value={alertOnStatusChange} onValueChange={setAlertOnStatusChange} trackColor={{ true: '#6366f1', false: theme.isDark ? '#334155' : '#e2e8f0' }} />}
            />
            <SettingRow
              icon={MessageSquare}
              iconColor={theme.isDark ? '#60a5fa' : '#3b82f6'}
              title="New Comments"
              subtitle="When someone replies to your issues"
              rightElement={<Switch value={alertOnComments} onValueChange={setAlertOnComments} trackColor={{ true: '#6366f1', false: theme.isDark ? '#334155' : '#e2e8f0' }} />}
              isLast
            />
          </View>

          {/* COMMUNITY */}
          <Text className={`text-[13px] font-black tracking-widest uppercase mb-3 ml-4 opacity-50 ${theme.textClass}`}>Community</Text>
          <View className={`mb-8 ${theme.glassCardClass}`} style={theme.cardShadow}>
            <SettingRow
              icon={Share2}
              iconColor={theme.isDark ? '#ec4899' : '#db2777'}
              title="Share App"
              subtitle="Invite friends and neighbors"
              onPress={handleShareApp}
            />
            <SettingRow
              icon={Star}
              iconColor={theme.isDark ? '#eab308' : '#ca8a04'}
              title={t.rateApp}
              subtitle="Leave a review on App Store"
              onPress={handleRateApp}
              isLast
            />
          </View>

          {/* HELP & SUPPORT */}
          <Text className={`text-[13px] font-black tracking-widest uppercase mb-3 ml-4 opacity-50 ${theme.textClass}`}>Help & Support</Text>
          <View className={`mb-8 ${theme.glassCardClass}`} style={theme.cardShadow}>
            <SettingRow
              icon={HelpCircle}
              iconColor={theme.isDark ? '#2dd4bf' : '#0d9488'}
              title="FAQ & Help Center"
              subtitle="Get answers quickly"
              onPress={() => router.push('/help')}
            />
            <SettingRow
              icon={Mail}
              iconColor={theme.isDark ? '#2dd4bf' : '#0d9488'}
              title="Contact Us"
              subtitle="support@simraungadh.gov.np"
              onPress={() => router.push('/contact')}
            />
            <SettingRow
              icon={MessageSquare}
              iconColor={theme.isDark ? '#f472b6' : '#db2777'}
              title="App Feedback"
              subtitle="Report bugs or suggest features"
              onPress={() => router.push('/feedback')}
              isLast
            />
          </View>

          {/* PRIVACY & DATA */}
          <Text className={`text-[13px] font-black tracking-widest uppercase mb-3 ml-4 opacity-50 ${theme.textClass}`}>Privacy & Data</Text>
          <View className={`mb-8 ${theme.glassCardClass}`} style={theme.cardShadow}>
            <SettingRow
              icon={Shield}
              iconColor={theme.isDark ? '#c084fc' : '#9333ea'}
              title="Privacy Policy"
              subtitle="How we handle your data"
              onPress={() => router.push('/privacy')}
            />
            <SettingRow
              icon={FileText}
              iconColor={theme.isDark ? '#c084fc' : '#9333ea'}
              title="Terms of Service"
              subtitle="Usage guidelines"
              onPress={() => router.push('/privacy')}
              isLast
            />
          </View>

          {/* SYSTEM & SECURITY */}
          <Text className={`text-[13px] font-black tracking-widest uppercase mb-3 ml-4 opacity-50 ${theme.textClass}`}>System & Security</Text>
          <View className={`mb-10 ${theme.glassCardClass}`} style={theme.cardShadow}>
            {profile?.role === 'admin' && (
              <SettingRow
                icon={ShieldAlert}
                iconColor={theme.isDark ? '#f43f5e' : '#e11d48'}
                title="Admin Dashboard"
                subtitle="Manage user roles & access"
                onPress={() => router.push('/admin')}
              />
            )}
            <SettingRow
              icon={DownloadCloud}
              iconColor={theme.isDark ? '#38bdf8' : '#0284c7'}
              title="Check for App Updates"
              subtitle="Get latest bug fixes and features"
              onPress={handleCheckUpdates}
              rightElement={checkingUpdate ? <ActivityIndicator color={theme.isDark ? '#38bdf8' : '#0284c7'} size="small" /> : <Text className={`text-[12px] font-bold px-3.5 py-1.5 rounded-full ${theme.isDark ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-100 text-sky-600'}`}>Check</Text>}
            />
            <SettingRow
              icon={Lock}
              iconColor={theme.isDark ? '#818cf8' : '#5b5ef6'}
              title="Change Password"
              subtitle="Send a reset link to your email"
              onPress={handleChangePassword}
              rightElement={isChangingPassword ? <ActivityIndicator color={theme.isDark ? '#818cf8' : '#5b5ef6'} size="small" /> : <ChevronRight size={18} color={theme.isDark ? '#475569' : '#cbd5e1'} />}
            />
            <SettingRow
              icon={Database}
              iconColor={theme.isDark ? '#f59e0b' : '#d97706'}
              title="Clear Cache"
              subtitle={`Free up local storage (${cacheSize})`}
              onPress={handleClearCache}
              rightElement={<ChevronRight size={18} color={theme.isDark ? '#475569' : '#cbd5e1'} />}
              isLast
            />
          </View>

          {/* DANGER */}
          <TouchableOpacity onPress={handleSignOut} activeOpacity={0.8} className="mb-6 mx-1">
            <View className={`p-5 flex-row items-center justify-center ${theme.glassCardClass}`} style={theme.cardShadow}>
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.isDark ? 'bg-rose-500/20' : 'bg-rose-50'}`}>
                <LogOut size={18} color={theme.isDark ? '#fb7185' : '#e11d48'} strokeWidth={2.5} />
              </View>
              <Text className={`font-black text-[15px] tracking-wide ${theme.isDark ? 'text-rose-400' : 'text-rose-600'}`}>SIGN OUT OF ACCOUNT</Text>
            </View>
          </TouchableOpacity>

          {/* Version & Developer Mark */}
          <View className="items-center mt-2 mb-10">
            <View className={`flex-row items-center px-5 py-2.5 rounded-full border mb-4 ${theme.isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-white border-indigo-100'}`} style={theme.cardShadow}>
              <Code2 size={14} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
              <Text className={`text-[11.5px] font-semibold ml-2.5 flex-wrap text-center ${theme.textSecondaryClass}`}>
                Designed & Handled by <Text className={`font-black ${theme.isDark ? 'text-indigo-300' : 'text-primary'}`}>Rahul</Text> and idea by <Text className={`font-black ${theme.isDark ? 'text-indigo-300' : 'text-primary'}`}>Adarsh</Text>
              </Text>
              <Heart size={12} color="#f43f5e" fill="#f43f5e" style={{ marginLeft: 8 }} />
            </View>
            <Text className={`text-[12px] font-black tracking-widest uppercase mb-1 ${theme.isDark ? 'text-slate-500' : 'text-slate-400'}`}>Simraungadh Civic Hub v1.0.0</Text>
            <Text className={`text-[11px] font-medium ${theme.isDark ? 'text-slate-600' : 'text-slate-400'}`}>Made with ❤️ in Simraungadh</Text>
          </View>

          <Footer />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
