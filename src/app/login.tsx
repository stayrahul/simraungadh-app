// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield, User, Mail, Lock, Eye, EyeOff, Phone, Calendar, MapPin } from 'lucide-react-native';
import { useAlert } from '../components/AlertProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/use-theme';
import { useAuthStore } from '../store/authStore';
import { useLangStore } from '../store/langStore';
import { translations } from '../lib/translations';
import { GoogleIcon } from '../components/GoogleIcon';
import { signInWithGoogle } from '../lib/googleAuth';

type LoginRole = 'citizen' | 'official';
type GenderType = 'Male' | 'Female';

export default function LoginScreen() {
  const [selectedRole, setSelectedRole] = useState<LoginRole>('citizen');
  const [isLogin, setIsLogin] = useState(true);
  const theme = useTheme();
  const { user, profile, isProfileIncomplete, initialized, fetchUserProfile } = useAuthStore();
  const { language } = useLangStore();
  const t = translations[language] || translations.en;

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();

  // Auto redirect authenticated users
  React.useEffect(() => {
    if (initialized && user) {
      const isIncomplete = !profile || profile.home_ward == null || !profile.phone_number;
      if (isIncomplete) {
        router.replace('/complete-profile');
      } else {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      }
    }
  }, [user, profile, isProfileIncomplete, initialized]);

  // Signup fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState<GenderType>('Male');
  const [age, setAge] = useState('');
  const [ward, setWard] = useState('');
  const [tole, setTole] = useState('');

  // Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile) {
          const meta = user.user_metadata || {};
          const fullName = meta.full_name || meta.name || user.email?.split('@')[0] || '';
          const avatarUrl = meta.avatar_url || meta.picture || null;

          const { data: created } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              full_name: fullName,
              avatar_url: avatarUrl,
              role: 'citizen',
              home_ward: null,
              phone_number: user.phone || null,
            })
            .select()
            .single();

          profile = created;
        }

        await fetchUserProfile();

        const isIncomplete = !profile || profile.home_ward == null || !profile.phone_number;

        if (isIncomplete) {
          router.replace('/complete-profile');
        } else {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }
      }
    } catch (e: any) {
      console.error('Google login error:', e);
      const isNotEnabled = String(e?.message || e?.msg || JSON.stringify(e)).toLowerCase().includes('not enabled');
      
      if (isNotEnabled) {
        showAlert(
          'Google Auth Not Enabled in Supabase',
          'To enable real Google Sign-In, please go to your Supabase Dashboard -> Authentication -> Providers -> Google and toggle "Enable Google Provider" with your Client ID.\n\nWould you like to test the Google Login & Ward Details page now?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Test Google Sign-In Flow',
              onPress: () => handleDevGoogleLogin(),
            },
          ]
        );
      } else {
        showAlert(
          'Google Sign-In',
          (e?.message || 'Failed to sign in with Google.') + '\n\nWould you like to test the Google Sign-In & Ward Setup flow?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Test Google Sign-In Flow',
              onPress: () => handleDevGoogleLogin(),
            },
          ]
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDevGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const devGmail = `citizen.${Date.now().toString().slice(-4)}@gmail.com`;
      const devPassword = 'Password123!';

      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: devGmail,
        password: devPassword,
        options: {
          data: {
            full_name: 'Gmail User',
            provider: 'google',
          },
        },
      });

      let currentUser = signUpData?.user;

      if (signUpErr || !currentUser) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: devGmail,
          password: devPassword,
        });
        if (signInErr) throw signInErr;
        currentUser = signInData?.user;
      }

      if (currentUser) {
        await fetchUserProfile();
        router.replace('/complete-profile');
      }
    } catch (err: any) {
      showAlert('Error', err?.message || 'Failed to complete demo Google sign-in.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('Required', 'Please enter your email and password.');
      return;
    }

    if (!isLogin && selectedRole === 'citizen') {
      if (!fullName.trim()) {
        showAlert('Required', 'Please enter your full name.');
        return;
      }
      if (!phoneNumber.trim()) {
        showAlert('Required', 'Please enter your phone number.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          if (selectedRole === 'official' && profile && profile.role === 'citizen') {
            await supabase.auth.signOut();
            showAlert('Access Denied', 'This account is a Citizen account. Please switch to the Citizen login tab.');
            return;
          }

          await fetchUserProfile();

          const isIncomplete = !profile || profile.home_ward == null || !profile.phone_number;
          if (isIncomplete) {
            router.replace('/complete-profile');
          } else {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone_number: phoneNumber.trim(),
              gender,
              age: age ? parseInt(age, 10) : null,
              home_ward: ward ? parseInt(ward, 10) : null,
              tole: tole.trim() || null,
              role: selectedRole,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName.trim(),
            phone_number: phoneNumber.trim(),
            gender,
            age: age ? parseInt(age, 10) : null,
            home_ward: ward ? parseInt(ward, 10) : null,
            tole: tole.trim() || null,
            role: selectedRole,
          });

          await fetchUserProfile();

          const isIncomplete = !ward || !phoneNumber.trim();
          if (isIncomplete) {
            router.replace('/complete-profile');
          } else {
            showAlert('Success', 'Account created successfully!');
            router.replace('/(tabs)');
          }
        }
      }
    } catch (err: any) {
      showAlert('Error', err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoOfficial = async () => {
    setEmail('official@simraungadh.gov.np');
    setPassword('Official123!');
  };

  return (
    <View className={`flex-1 ${theme.bgClass}`}>
      {/* Background decoration */}
      <View className="absolute inset-0 overflow-hidden">
        <View className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-600/8" />
        <View className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-indigo-900/10" />
      </View>

      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        style={{ top: Math.max(insets.top, 20) }}
        className={`absolute left-5 z-20 w-10 h-10 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
      >
        <ChevronLeft size={22} color={theme.iconColor} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 55 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header */}
          <View className="items-center mb-6 mt-4">
            <View className={`w-14 h-14 rounded-2xl items-center justify-center mb-2.5 ${theme.isDark ? 'bg-indigo-500/15' : 'bg-indigo-600'}`}>
              <Shield size={28} color={theme.isDark ? '#818cf8' : '#ffffff'} />
            </View>
            <Text className={`text-2xl font-black tracking-tight ${theme.textClass}`}>Simraungadh</Text>
            <Text className={`text-[11px] font-semibold tracking-wider uppercase mt-0.5 ${theme.textMutedClass}`}>
              {isLogin ? t.welcomeBack : t.createCitizenAccount}
            </Text>
          </View>

          {/* Form Container Card */}
          <View className={`rounded-3xl p-5 border ${theme.cardClass}`} style={theme.cardShadow}>

            {/* Role Switcher */}
            <View className={`flex-row p-1 rounded-2xl mb-5 ${theme.isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
              <TouchableOpacity
                className={`flex-1 py-2.5 rounded-xl items-center ${selectedRole === 'citizen' ? (theme.isDark ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-indigo-600') : ''}`}
                onPress={() => setSelectedRole('citizen')}
              >
                <Text className={`font-bold text-[13px] ${selectedRole === 'citizen' ? (theme.isDark ? 'text-indigo-300' : 'text-white') : theme.textSecondaryClass}`}>{t.citizen}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-2.5 rounded-xl items-center ${selectedRole === 'official' ? (theme.isDark ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-indigo-600') : ''}`}
                onPress={() => {
                  setSelectedRole('official');
                  setIsLogin(true);
                }}
              >
                <Text className={`font-bold text-[13px] ${selectedRole === 'official' ? (theme.isDark ? 'text-indigo-300' : 'text-white') : theme.textSecondaryClass}`}>{t.official}</Text>
              </TouchableOpacity>
            </View>

            {/* Google Sign-In Option for Citizens */}
            {selectedRole === 'citizen' && (
              <View className="mb-4">
                <TouchableOpacity
                  onPress={handleGoogleLogin}
                  disabled={loading || googleLoading}
                  activeOpacity={0.8}
                  className={`w-full h-12 px-4 rounded-2xl flex-row items-center justify-center border ${
                    theme.isDark
                      ? 'bg-white/[0.08] border-white/15 active:bg-white/12'
                      : 'bg-white border-slate-200 active:bg-slate-50'
                  }`}
                  style={{
                    elevation: 2,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                  }}
                >
                  {googleLoading ? (
                    <ActivityIndicator color={theme.isDark ? '#818cf8' : '#4f46e5'} />
                  ) : (
                    <>
                      <GoogleIcon size={20} />
                      <Text className={`font-bold text-[14px] ml-3 ${theme.textClass}`}>
                        {t.continueWithGoogle || 'Continue with Google'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <View className="flex-row items-center my-4">
                  <View className={`flex-1 h-px ${theme.isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                  <Text className={`mx-3 text-[11px] font-bold uppercase tracking-widest ${theme.textMutedClass}`}>
                    {t.orDivider || 'OR'}
                  </Text>
                  <View className={`flex-1 h-px ${theme.isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                </View>
              </View>
            )}

            {/* Registration Specific Fields */}
            {!isLogin && selectedRole === 'citizen' && (
              <View className="gap-3.5 mb-5">
                <Text className={`text-[11px] font-bold uppercase tracking-wider ${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {t.personalDetails}
                </Text>

                {/* Full Name */}
                <View>
                  <Text className={`font-semibold text-[12px] mb-1.5 ml-0.5 ${theme.textSecondaryClass}`}>{t.fullName}</Text>
                  <View className={`flex-row items-center rounded-2xl px-3.5 h-12 border ${theme.inputClass}`}>
                    <User size={17} color={theme.iconColor} />
                    <TextInput
                      className={`flex-1 ml-2.5 font-medium text-[14px] ${theme.textClass}`}
                      placeholder="e.g. Rahul Kushwaha"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Phone Number */}
                <View>
                  <Text className={`font-semibold text-[12px] mb-1.5 ml-0.5 ${theme.textSecondaryClass}`}>{t.phoneNumber}</Text>
                  <View className={`flex-row items-center rounded-2xl px-3.5 h-12 border ${theme.inputClass}`}>
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

                {/* Gender Pills (Male / Female) */}
                <View>
                  <Text className={`font-semibold text-[12px] mb-1.5 ml-0.5 ${theme.textSecondaryClass}`}>{t.gender}</Text>
                  <View className="flex-row gap-2.5">
                    {(['Male', 'Female'] as GenderType[]).map(g => (
                      <TouchableOpacity
                        key={g}
                        onPress={() => setGender(g)}
                        className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${gender === g
                            ? (theme.isDark ? 'bg-indigo-500/20 border-indigo-500/40' : 'bg-indigo-50 border-indigo-600')
                            : (theme.isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200')
                          }`}
                      >
                        <Text className={`text-[13px] font-bold ${gender === g
                            ? (theme.isDark ? 'text-indigo-300' : 'text-indigo-600')
                            : theme.textSecondaryClass
                          }`}>
                          {g === 'Male' ? t.male : t.female}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Age & Ward Split 2 Columns */}
                <View className="flex-row gap-3">
                  {/* Age */}
                  <View className="flex-1">
                    <Text className={`font-semibold text-[12px] mb-1.5 ml-0.5 ${theme.textSecondaryClass}`}>{t.age}</Text>
                    <View className={`flex-row items-center rounded-2xl px-3.5 h-12 border ${theme.inputClass}`}>
                      <Calendar size={17} color={theme.iconColor} />
                      <TextInput
                        className={`flex-1 ml-2 font-medium text-[14px] ${theme.textClass}`}
                        placeholder="e.g. 24"
                        placeholderTextColor={theme.inputPlaceholder}
                        value={age}
                        onChangeText={setAge}
                        keyboardType="number-pad"
                        maxLength={3}
                      />
                    </View>
                  </View>

                  {/* Ward */}
                  <View className="flex-1">
                    <Text className={`font-semibold text-[12px] mb-1.5 ml-0.5 ${theme.textSecondaryClass}`}>{t.homeWard}</Text>
                    <View className={`flex-row items-center rounded-2xl px-3.5 h-12 border ${theme.inputClass}`}>
                      <MapPin size={17} color={theme.iconColor} />
                      <TextInput
                        className={`flex-1 ml-2 font-medium text-[14px] ${theme.textClass}`}
                        placeholder="e.g. 1"
                        placeholderTextColor={theme.inputPlaceholder}
                        value={ward}
                        onChangeText={setWard}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>
                  </View>
                </View>

                <View className={`h-px my-1 ${theme.isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

                <Text className={`text-[11px] font-bold uppercase tracking-wider ${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {t.accountCredentials}
                </Text>
              </View>
            )}

            {/* Email & Password */}
            <View className="gap-3.5 mb-5">
              {/* Email */}
              <View>
                <Text className={`font-semibold text-[12px] mb-1.5 ml-0.5 ${theme.textSecondaryClass}`}>{t.emailAddress}</Text>
                <View className={`flex-row items-center rounded-2xl px-3.5 h-12 border ${theme.inputClass}`}>
                  <Mail size={17} color={theme.iconColor} />
                  <TextInput
                    className={`flex-1 ml-2.5 font-medium text-[14px] ${theme.textClass}`}
                    placeholder={selectedRole === 'official' ? "official@simraungadh.gov.np" : "citizen@example.com"}
                    placeholderTextColor={theme.inputPlaceholder}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password */}
              <View>
                <Text className={`font-semibold text-[12px] mb-1.5 ml-0.5 ${theme.textSecondaryClass}`}>{t.password}</Text>
                <View className={`flex-row items-center rounded-2xl px-3.5 h-12 border ${theme.inputClass}`}>
                  <Lock size={17} color={theme.iconColor} />
                  <TextInput
                    className={`flex-1 ml-2.5 font-medium text-[14px] ${theme.textClass}`}
                    placeholder="••••••••"
                    placeholderTextColor={theme.inputPlaceholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
                    {showPassword ? <EyeOff size={17} color={theme.iconColor} /> : <Eye size={17} color={theme.iconColor} />}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleAuth}
              disabled={loading || !email.trim() || !password.trim()}
              className={`h-12 rounded-2xl items-center justify-center ${(!email.trim() || !password.trim())
                  ? (theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-200')
                  : (theme.isDark ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-indigo-600')
                }`}
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color={theme.isDark ? '#818cf8' : '#fff'} />
              ) : (
                <Text className={`font-bold text-[14px] ${(!email.trim() || !password.trim())
                    ? theme.textMutedClass
                    : (theme.isDark ? 'text-indigo-300' : 'text-white')
                  }`}>
                  {isLogin ? t.signIn : t.createAccount}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Toggle Sign In / Sign Up */}
          {selectedRole === 'citizen' && (
            <View className="flex-row items-center justify-center mt-5">
              <Text className={`font-medium text-[13px] ${theme.textSecondaryClass}`}>
                {isLogin ? t.dontHaveAccount : t.alreadyHaveAccount}
              </Text>
              <TouchableOpacity onPress={() => setIsLogin(!isLogin)} className="ml-1.5 py-1">
                <Text className={`font-bold text-[13px] ${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {isLogin ? t.signUp : t.signIn}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedRole === 'official' && isLogin && (
            <TouchableOpacity 
              onPress={handleDemoOfficial}
              disabled={loading}
              className={`mt-4 py-3 rounded-xl border border-dashed items-center ${theme.isDark ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-indigo-300 bg-indigo-50'}`}
            >
              <Text className={`font-semibold text-[13px] ${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                Quick Login as Demo Official
              </Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
