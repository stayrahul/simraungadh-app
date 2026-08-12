// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Navigation, Droplets, Zap, Trash2, Info, Camera, Check, Lock, Shield, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/imageStorage';
import { useAuthStore } from '../store/authStore';
import { useLangStore } from '../store/langStore';
import { translations } from '../lib/translations';
import { LinearGradient } from 'expo-linear-gradient';
import { useAlert } from '../components/AlertProvider';
import { useTheme } from '../hooks/use-theme';
import { createNotification } from '../lib/notifications';

const CATEGORIES = [
  { id: 'Roads', icon: Navigation, colors: ['#5b5ef6', '#4845e4'] as const },
  { id: 'Water', icon: Droplets, colors: ['#3b82f6', '#4f46e5'] as const },
  { id: 'Electricity', icon: Zap, colors: ['#f59e0b', '#d97706'] as const },
  { id: 'Trash', icon: Trash2, colors: ['#22c55e', '#16a34a'] as const },
  { id: 'General', icon: Info, colors: ['#8b5cf6', '#7c3aed'] as const },
];

export default function ReportScreen() {
  const [description, setDescription] = useState('');
  const [ward, setWard] = useState('1');
  const [category, setCategory] = useState('General');
  const [postType, setPostType] = useState<'normal' | 'report'>('normal');
  const [images, setImages] = useState<{ uri: string, base64: string }[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('low');
  const [landmark, setLandmark] = useState('');
  const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [loading, setLoading] = useState(false);

  const [isSuccess, setIsSuccess] = useState(false);

  const router = useRouter();
  const { profile } = useAuthStore();
  const { language } = useLangStore();
  const t = translations[language];
  const { showAlert } = useAlert();
  const theme = useTheme();

  const pickImage = async () => {
    if (images.length >= 5) {
      showAlert('Limit Reached', 'You can only attach up to 5 photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 1,
      base64: false,
    });

    if (!result.canceled && result.assets) {
      setLoading(true);
      try {
        const compressedImages = await Promise.all(
          result.assets.map(async (asset) => {
            const manipResult = await ImageManipulator.manipulateAsync(
              asset.uri,
              [{ resize: { width: 1600 } }],
              { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );
            return { uri: manipResult.uri, base64: manipResult.base64 as string };
          })
        );
        setImages(prev => [...prev, ...compressedImages].slice(0, 5));
      } catch (e: unknown) {
        showAlert('Error', 'Failed to process images. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleGetLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Denied', 'Allow location access to attach GPS coordinates.');
        setIsGettingLocation(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      showAlert('Success', 'GPS location securely attached!');
    } catch (error) {
      showAlert('Error', 'Could not get location. Try again.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      showAlert('Hold on!', 'Please tell us what the issue is.');
      return;
    }

    let wardNum = 1;
    if (postType === 'report') {
      if (!ward.trim() || !landmark.trim()) {
        showAlert('Hold on!', 'Please provide the ward number and specific landmark location.');
        return;
      }
      wardNum = parseInt(ward);
      if (isNaN(wardNum) || wardNum < 1 || wardNum > 11) {
        showAlert('Hold on!', 'Please enter a valid Ward number (1-11).');
        return;
      }
    }

    if (!profile) {
      showAlert('Wait!', 'You need to be logged in to report an issue.');
      return;
    }

    setLoading(true);

    try {
      const publicImageUrls: string[] = [];

      if (images.length > 0) {
        await Promise.all(images.map(async (img) => {
          const url = await uploadImage(img.base64, 'civic_images', profile.id);
          publicImageUrls.push(url);
        }));
      }

      const generatedTitle = `${category} Report - Ward ${wardNum}`;

      const payload = {
        title: postType === 'report' ? generatedTitle : (description.trim().substring(0, 40) || 'Community Post'),
        description: postType === 'report' ? `📍 Location: ${landmark.trim()}\n\n${description.trim()}` : description.trim(),
        ward_number: postType === 'report' ? wardNum : 1,
        category: postType === 'report' ? category : 'General',
        urgency: postType === 'report' ? urgency : undefined,
        author_id: profile.id,
        status: 'pending',
        post_type: postType,
        image_urls: publicImageUrls,
        image_url: publicImageUrls[0] || null,
        is_anonymous: isAnonymous,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
      };

      let { error } = await supabase.from('issues').insert([payload]);

      if (error && error.code === '42703') {
        const { image_urls, urgency, post_type, ...fallbackPayload } = payload;
        const { error: fallbackError } = await supabase.from('issues').insert([fallbackPayload]);
        error = fallbackError;
      }

      if (error) throw error;

      // Notify followers of new report
      try {
        const { data: followers } = await supabase
          .from('user_follows')
          .select('follower_id')
          .eq('following_id', profile.id);

        if (followers && followers.length > 0) {
          const authorName = isAnonymous ? 'A citizen' : (profile.full_name || 'A citizen');
          const reportTitle = payload.title || description.trim().substring(0, 40);

          await Promise.all(
            followers.map(f =>
              createNotification({
                userId: f.follower_id,
                title: `👥 New Post from ${authorName}`,
                body: reportTitle,
                type: 'new_follow',
              })
            )
          );
        }
      } catch (followerErr) {
        console.warn('Follower notification error:', followerErr);
      }

      setIsSuccess(true);
      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      }, 2500);
    } catch (e: unknown) {
      const errorObj = e && typeof e === 'object' ? (e as any) : {};
      const errorMessage = e instanceof Error 
        ? e.message 
        : (errorObj.message ? String(errorObj.message) : JSON.stringify(e));
      showAlert('Error', errorMessage || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = postType === 'report' 
    ? description.trim().length > 0 && ward.trim().length > 0 && landmark.trim().length > 0
    : description.trim().length > 0;

  if (isSuccess) {
      return (
        <SafeAreaView edges={['top']} className={`flex-1 items-center justify-center ${theme.bgClass}`}>
          <View className={`items-center justify-center p-8 rounded-[40px] w-4/5 ${theme.glassCardClass}`}>
            <View className="w-20 h-20 rounded-full bg-emerald-500/20 items-center justify-center mb-6">
              <View className="w-14 h-14 rounded-full bg-emerald-500 items-center justify-center shadow-lg shadow-emerald-500/30">
                <Check size={32} color="#ffffff" />
              </View>
            </View>
            <Text className={`text-xl font-extrabold text-center mb-2 ${theme.textClass}`}>
              {postType === 'report' ? 'Report Submitted' : 'Post Created'}
            </Text>
            <Text className={`text-center text-[13px] font-medium leading-relaxed ${theme.textMutedClass}`}>
              {postType === 'report' 
                ? 'Your civic report has been sent to the officials for review.' 
                : 'Your post is now visible to the community.'}
            </Text>
          </View>
        </SafeAreaView>
      );
  }

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      <View className="px-5 py-3 flex-row items-center justify-between z-10">
        <TouchableOpacity onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }} className={`w-12 h-12 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/[0.08]' : 'bg-slate-100'}`}>
          <X size={22} color={theme.iconColor} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isFormValid || loading}
          className={`px-6 py-3.5 rounded-[20px] ${
            !isFormValid || loading 
              ? (theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-200') 
              : (theme.isDark ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-indigo-600 shadow-md shadow-indigo-600/30')
          }`}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.isDark ? '#818cf8' : '#fff'} />
          ) : (
            <Text className={`font-black text-[13px] uppercase tracking-widest ${
              !isFormValid || loading 
                ? theme.textMutedClass 
                : (theme.isDark ? 'text-indigo-400' : 'text-white')
            }`}>{t.post}</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Post Type Selector */}
          <View className={`flex-row items-center mb-7 p-2 rounded-full ${theme.isDark ? 'bg-white/[0.04]' : 'bg-slate-100/50'}`}>
            <TouchableOpacity 
              onPress={() => setPostType('normal')}
              className={`flex-1 items-center justify-center py-3.5 rounded-full ${postType === 'normal' ? (theme.isDark ? 'bg-[#2c2c2e]' : 'bg-white shadow-sm') : 'bg-transparent'}`}
            >
              <Text className={`font-black text-[12px] tracking-widest uppercase ${postType === 'normal' ? theme.textClass : theme.textMutedClass}`}>Normal Post</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setPostType('report')}
              className={`flex-1 items-center justify-center py-3.5 rounded-full ${postType === 'report' ? 'bg-indigo-500 shadow-sm shadow-indigo-500/20' : 'bg-transparent'}`}
            >
              <Text className={`font-black text-[12px] tracking-widest uppercase ${postType === 'report' ? 'text-white' : theme.textMutedClass}`}>Official Report</Text>
            </TouchableOpacity>
          </View>

          {postType === 'report' && (
            <>
              <Text className={`${theme.isDark ? 'text-primary-400' : 'text-primary'} font-semibold text-[11px] uppercase tracking-wider mb-2.5 ml-0.5`}>{t.category}</Text>
              
              {/* GPS LOCATION BUTTON */}
              <TouchableOpacity 
                onPress={handleGetLocation} 
                disabled={isGettingLocation}
                className={`flex-row items-center justify-center p-3.5 rounded-[24px] mb-6 ${location ? 'bg-green-500/15' : (theme.isDark ? 'bg-indigo-500/15' : 'bg-indigo-50')} border ${location ? 'border-green-500/30' : 'border-transparent'}`}
              >
                {isGettingLocation ? (
                  <ActivityIndicator size="small" color={theme.isDark ? '#818cf8' : '#4f46e5'} />
                ) : (
                  <>
                    <MapPin size={18} color={location ? '#22c55e' : (theme.isDark ? '#818cf8' : '#4f46e5')} />
                    <Text className={`ml-2 font-bold text-[14px] ${location ? 'text-green-600 dark:text-green-400' : (theme.isDark ? 'text-indigo-300' : 'text-indigo-700')}`}>
                      {location ? 'GPS Location Attached' : 'Attach Current GPS Location'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
                <View className="flex-row gap-2">
                  {CATEGORIES.map((cat) => {
                    const isActive = category === cat.id;
                    const IconComp = cat.icon;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setCategory(cat.id)}
                        className={`items-center justify-center w-[84px] h-[84px] rounded-[32px] mr-3 ${
                          isActive 
                            ? (theme.isDark ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-white shadow-sm border border-indigo-100')
                            : (theme.isDark ? 'bg-white/[0.04]' : 'bg-slate-100/60')
                        }`}
                      >
                        <IconComp size={28} color={isActive ? (theme.isDark ? '#818cf8' : '#4f46e5') : theme.iconColor} />
                        <Text className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${
                          isActive 
                            ? (theme.isDark ? 'text-indigo-300' : 'text-indigo-600')
                            : theme.textMutedClass
                        }`}>
                          {t[cat.id.toLowerCase() as keyof typeof t] || cat.id}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <View className={`rounded-[32px] p-4 mb-5 ${theme.glassCardClass}`}>
                <Text className={`${theme.isDark ? 'text-primary-400' : 'text-primary'} font-semibold text-[11px] uppercase tracking-wider mb-3 ml-0.5`}>Specific Location / Landmark</Text>
                <View className={`p-4 rounded-[24px] mb-5 flex-row items-center ${theme.isDark ? 'bg-white/5' : 'bg-slate-100/50'}`}>
                  <MapPin size={16} color={theme.textMuted} className="mr-2" />
                  <TextInput
                    className={`flex-1 text-[14px] font-medium ${theme.textClass}`}
                    placeholder="e.g. Near the Central Park gate"
                    placeholderTextColor={theme.inputPlaceholder}
                    value={landmark}
                    onChangeText={setLandmark}
                  />
                </View>

                <Text className={`${theme.isDark ? 'text-primary-400' : 'text-primary'} font-semibold text-[11px] uppercase tracking-wider mb-3 ml-0.5`}>Ward Number</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1 mb-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'].map((w) => {
                    const isSelected = ward === w;
                    return (
                      <TouchableOpacity
                        key={w}
                        onPress={() => setWard(w)}
                        activeOpacity={0.7}
                        className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                          isSelected
                            ? (theme.isDark ? 'bg-indigo-500' : 'bg-indigo-600 shadow-md')
                            : (theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100')
                        }`}
                      >
                        <Text className={`text-[15px] font-extrabold ${isSelected ? 'text-white' : theme.textClass}`}>
                          {w}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </>
          )}

          <View className={`mb-6 p-6 rounded-[32px] ${theme.glassCardClass}`}>
            <TextInput
              className={`text-[16px] leading-[26px] min-h-[160px] font-medium ${theme.textClass}`}
              placeholder={postType === 'report' ? "Describe the civic issue in detail..." : "What's happening in your neighborhood?"}
              placeholderTextColor={theme.inputPlaceholder}
              multiline
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {postType === 'report' && (
            <>
              <Text className={`${theme.isDark ? 'text-primary-400' : 'text-primary'} font-semibold text-[11px] uppercase tracking-wider mb-2.5 ml-0.5`}>Priority</Text>
              <View className={`flex-row mb-6 p-2 rounded-full ${theme.isDark ? 'bg-white/[0.04]' : 'bg-slate-100/50'}`}>
                <TouchableOpacity onPress={() => setUrgency('low')} className={`flex-1 py-3.5 rounded-full items-center ${urgency === 'low' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/20' : ''}`}>
                  <Text className={`font-black tracking-widest text-[12px] uppercase ${urgency === 'low' ? 'text-white' : theme.textMutedClass}`}>Low</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setUrgency('medium')} className={`flex-1 py-3.5 rounded-full items-center ${urgency === 'medium' ? 'bg-amber-500 shadow-sm shadow-amber-500/20' : ''}`}>
                  <Text className={`font-black tracking-widest text-[12px] uppercase ${urgency === 'medium' ? 'text-white' : theme.textMutedClass}`}>Medium</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setUrgency('high')} className={`flex-1 py-3.5 rounded-full items-center ${urgency === 'high' ? 'bg-rose-500 shadow-sm shadow-rose-500/20' : ''}`}>
                  <Text className={`font-black tracking-widest text-[12px] uppercase ${urgency === 'high' ? 'text-white' : theme.textMutedClass}`}>High</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <Text className={`${theme.isDark ? 'text-primary-400' : 'text-primary'} font-semibold text-[11px] uppercase tracking-wider mb-2.5 ml-0.5`}>{t.photos}</Text>
          <View className="flex-row flex-wrap gap-2.5 mb-5">
            {images.map((img, idx) => (
              <View key={idx} className={`relative w-28 h-28 rounded-[32px] overflow-hidden border ${theme.borderSubtleClass}`}>
                <Image source={{ uri: img.uri }} className="w-full h-full" />
                <TouchableOpacity
                  onPress={() => removeImage(idx)}
                  className="absolute top-2 right-2 bg-black/60 w-7 h-7 rounded-full items-center justify-center backdrop-blur-md"
                >
                  <X size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity
                onPress={pickImage}
                className={`w-28 h-28 rounded-[32px] border-2 border-dashed items-center justify-center ${theme.isDark ? 'border-white/[0.15] bg-white/[0.02]' : 'border-slate-300 bg-slate-50'}`}
              >
                <Camera size={26} color={theme.isDark ? '#818cf8' : '#94a3b8'} className="mb-2" />
                <Text className={`text-[10px] font-bold uppercase tracking-wider ${theme.textMutedClass}`}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className={`rounded-[32px] p-4 flex-row items-center justify-between ${theme.glassCardClass}`}>
            <View className="flex-row items-center flex-1 mr-4">
              <View className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                <Shield size={16} color={theme.isDark ? '#818cf8' : '#5b5ef6'} />
              </View>
              <View className="flex-1">
                <Text className={`font-semibold text-[13px] ${theme.textClass}`}>Report Anonymously</Text>
                <Text className={`text-[11px] mt-0.5 ${theme.textMutedClass}`}>Hide your name and avatar</Text>
              </View>
            </View>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: '#cbd5e1', true: '#5b5ef6' }}
              thumbColor="#ffffff"
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
