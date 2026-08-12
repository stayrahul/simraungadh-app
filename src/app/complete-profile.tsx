// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Shield, User, Phone, MapPin, Calendar, Check, ArrowRight, X } from 'lucide-react-native';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { useAlert } from '../components/AlertProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/use-theme';
import { useAuthStore } from '../store/authStore';
import { useLangStore } from '../store/langStore';
import { translations } from '../lib/translations';

type GenderType = 'Male' | 'Female';

export default function CompleteProfileScreen() {
  const theme = useTheme();
  const { user, profile, fetchUserProfile } = useAuthStore();
  const { language } = useLangStore();
  const t = translations[language] || translations.en;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();

  // Initial state prefilled from Google meta or existing profile
  const meta = user?.user_metadata || {};
  const [fullName, setFullName] = useState(profile?.full_name || meta.full_name || meta.name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || meta.phone_number || '');
  const [selectedWard, setSelectedWard] = useState<number | null>(profile?.home_ward || null);
  const [customWard, setCustomWard] = useState(profile?.home_ward ? String(profile.home_ward) : '');
  const [gender, setGender] = useState<GenderType>((profile?.gender as GenderType) || 'Male');
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '');
  const [tole, setTole] = useState(profile?.tole || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.full_name && !fullName) {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const handleSelectWard = (wardNum: number) => {
    setSelectedWard(wardNum);
    setCustomWard(String(wardNum));
  };

  const handleCustomWardChange = (text: string) => {
    setCustomWard(text);
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedWard(parsed);
    } else {
      setSelectedWard(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      showAlert('Error', 'No authenticated user found.');
      return;
    }

    if (!fullName.trim()) {
      showAlert(t.requiredField, 'Please enter your full name.');
      return;
    }

    if (!phoneNumber.trim()) {
      showAlert(t.requiredField, t.enterValidPhone);
      return;
    }

    const activeWard = selectedWard || parseInt(customWard, 10);
    if (!activeWard || isNaN(activeWard) || activeWard <= 0) {
      showAlert(t.requiredField, t.selectWardRequired);
      return;
    }

    setLoading(true);
    try {
      const avatarUrl = profile?.avatar_url || meta.avatar_url || meta.picture || null;

      const profilePayload = {
        id: user.id,
        full_name: fullName.trim(),
        avatar_url: avatarUrl,
        phone_number: phoneNumber.trim(),
        home_ward: activeWard,
        gender: gender,
        age: parseInt(age, 10) || null,
        tole: tole.trim() || null,
        role: profile?.role || 'citizen',
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profilePayload);

      if (error) throw error;

      await fetchUserProfile();

      if (typeof registerForPushNotificationsAsync === 'function') {
        try {
          registerForPushNotificationsAsync(user.id);
        } catch (e) {
          console.log('Push register error:', e);
        }
      }

      showAlert('Success!', 'Your details have been saved successfully.');
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('Error saving profile:', e);
      showAlert('Save Failed', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className={`flex-1 ${theme.bgClass}`}>
      {/* Background Glow */}
      <View className="absolute inset-0 overflow-hidden">
        <View className="absolute -top-32 -left-20 w-80 h-80 rounded-full bg-emerald-500/10" />
        <View className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-indigo-600/10" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: Math.max(insets.top + 16, 40), paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Badge */}
          <View className="items-center mb-6 relative">
            <TouchableOpacity 
              onPress={() => router.canGoBack() ? router.back() : router.replace('/')} 
              className={`absolute right-0 top-0 w-10 h-10 rounded-full items-center justify-center z-10 ${theme.isDark ? 'bg-white/10' : 'bg-slate-100'}`}
            >
              <X size={20} color={theme.iconColor} />
            </TouchableOpacity>
            
            <View className={`w-16 h-16 rounded-[24px] items-center justify-center mb-3 ${theme.isDark ? 'bg-emerald-500/20' : 'bg-emerald-600'}`}>
              <Shield size={32} color={theme.isDark ? '#34d399' : '#ffffff'} />
            </View>
          </View>

          {/* Form Card */}
          <View className={`rounded-[24px] p-5 border ${theme.cardClass} gap-5`} style={theme.cardShadow}>

            {/* Ward Selector (Super Easy for Elderly Users) */}
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className={`font-bold text-[13px] ${theme.isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  1. {t.selectWard} *
                </Text>
                {selectedWard !== null && (
                  <View className="flex-row items-center bg-emerald-500/15 px-2.5 py-1 rounded-full">
                    <Check size={12} color="#10b981" />
                    <Text className="text-[11px] font-bold text-emerald-500 ml-1">
                      {t.ward} {selectedWard} {t.wardSelected}
                    </Text>
                  </View>
                )}
              </View>

              {/* 12 Ward Grid Buttons */}
              <View className="flex-row flex-wrap gap-2 mb-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((wNum) => {
                  const isSelected = selectedWard === wNum;
                  return (
                    <TouchableOpacity
                      key={wNum}
                      onPress={() => handleSelectWard(wNum)}
                      activeOpacity={0.7}
                      className={`w-[22%] py-3 rounded-[24px] items-center justify-center border ${
                        isSelected
                          ? (theme.isDark ? 'bg-emerald-500/25 border-emerald-500/60' : 'bg-emerald-600 border-emerald-700')
                          : (theme.isDark ? 'bg-white/[0.05] border-white/10' : 'bg-slate-50 border-slate-200')
                      }`}
                    >
                      <Text className={`text-xs font-semibold ${isSelected ? (theme.isDark ? 'text-emerald-300' : 'text-emerald-100') : theme.textMutedClass}`}>
                        {t.ward}
                      </Text>
                      <Text className={`text-base font-black mt-0.5 ${isSelected ? (theme.isDark ? 'text-emerald-200' : 'text-white') : theme.textClass}`}>
                        {wNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Ward Input option */}
              <View className={`flex-row items-center rounded-[24px] px-3.5 h-12 border ${theme.inputClass}`}>
                <MapPin size={17} color={theme.iconColor} />
                <TextInput
                  className={`flex-1 ml-2.5 font-medium text-[14px] ${theme.textClass}`}
                  placeholder="Or enter ward number (e.g. 3)"
                  placeholderTextColor={theme.inputPlaceholder}
                  value={customWard}
                  onChangeText={handleCustomWardChange}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>

            <View className={`h-px ${theme.isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

            {/* Step 2: Personal Details */}
            <View className="gap-3.5">
              <Text className={`font-bold text-[13px] ${theme.isDark ? 'text-primary-400' : 'text-primary'}`}>
                2. {t.personalDetails}
              </Text>

              {/* Full Name */}
              <View>
                <Text className={`font-semibold text-[12px] mb-1.5 ml-0.5 ${theme.textSecondaryClass}`}>
                  {t.fullName} *
                </Text>
                <View className={`flex-row items-center rounded-[24px] px-3.5 h-12 border ${theme.inputClass}`}>
                  <User size={17} color={theme.iconColor} />
                  <TextInput
                    className={`flex-1 ml-2.5 font-medium text-[14px] ${theme.textClass}`}
                    placeholder="e.g. Ram Bahadur Kushwaha"
                    placeholderTextColor={theme.inputPlaceholder}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Phone Number */}
              <View>
                <Text className={`font-semibold text-[12px] mb-1.5 ml-0.5 ${theme.textSecondaryClass}`}>
                  {t.phoneNumber} *
                </Text>
                <View className={`flex-row items-center rounded-[24px] px-3.5 h-12 border ${theme.inputClass}`}>
                  <Phone size={17} color={theme.iconColor} />
                  <TextInput
                    className={`flex-1 ml-2.5 font-medium text-[14px] ${theme.textClass}`}
                    placeholder="9800000000"
                    placeholderTextColor={theme.inputPlaceholder}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Gender Pills */}
              <View>
                <Text className={`font-semibold text-[12px] mb-1.5 ml-0.5 ${theme.textSecondaryClass}`}>
                  {t.gender}
                </Text>
                <View className="flex-row gap-2.5">
                  {(['Male', 'Female'] as GenderType[]).map(g => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setGender(g)}
                      className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                        gender === g
                          ? (theme.isDark ? 'bg-indigo-500/20 border-indigo-500/40' : 'bg-indigo-50 border-indigo-600')
                          : (theme.isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200')
                      }`}
                    >
                      <Text className={`text-[13px] font-bold ${
                        gender === g
                          ? (theme.isDark ? 'text-indigo-300' : 'text-primary')
                          : theme.textSecondaryClass
                      }`}>
                        {g === 'Male' ? t.male : t.female}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Age & Tole in 2 columns */}
              <View className="flex-row gap-3">
                {/* Age */}
                <View className="w-1/3">
                  <Text className={`font-semibold text-[12px] mb-1.5 ml-0.5 ${theme.textSecondaryClass}`}>
                    {t.age}
                  </Text>
                  <View className={`flex-row items-center rounded-[24px] px-3.5 h-12 border ${theme.inputClass}`}>
                    <Calendar size={17} color={theme.iconColor} />
                    <TextInput
                      className={`flex-1 ml-2 font-medium text-[14px] ${theme.textClass}`}
                      placeholder="e.g. 52"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={age}
                      onChangeText={setAge}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                  </View>
                </View>

                {/* Tole / Locality */}
                <View className="flex-1">
                  <Text className={`font-semibold text-[12px] mb-1.5 ml-0.5 ${theme.textSecondaryClass}`}>
                    {t.toleLocality}
                  </Text>
                  <View className={`flex-row items-center rounded-[24px] px-3.5 h-12 border ${theme.inputClass}`}>
                    <MapPin size={17} color={theme.iconColor} />
                    <TextInput
                      className={`flex-1 ml-2 font-medium text-[14px] ${theme.textClass}`}
                      placeholder="e.g. Kachorwa Bazaar"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={tole}
                      onChangeText={setTole}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={loading}
              className={`h-14 mt-3 rounded-[24px] flex-row items-center justify-center ${
                theme.isDark ? 'bg-emerald-600' : 'bg-emerald-600'
              }`}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text className="font-black text-base text-white mr-2">
                    {t.saveAndContinue}
                  </Text>
                  <ArrowRight size={20} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
