// @ts-nocheck
import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Map, Droplets, Zap, Trash2, Info, Camera, Check, MapPin, ShieldAlert, Navigation, Shield } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/imageStorage';
import { useAuthStore } from '../store/authStore';
import { useLangStore } from '../store/langStore';
import { translations } from '../lib/translations';
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
  const router = useRouter();
  const [postType, setPostType] = useState<'normal' | 'report'>('normal');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [landmark, setLandmark] = useState('');
  const [ward, setWard] = useState('1');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('low');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState<{ uri: string, base64: string }[]>([]);
  const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { profile } = useAuthStore();
  const { language } = useLangStore();
  const t = translations[language] || translations.en;
  const { showAlert } = useAlert();
  const theme = useTheme();
  
  const scrollViewRef = useRef<ScrollView>(null);

  const pickImage = async () => {
    if (images.length >= 4) {
      showAlert('Limit Reached', 'You can only attach up to 4 photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4 - images.length,
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
        setImages(prev => [...prev, ...compressedImages].slice(0, 4));
      } catch (e) {
        showAlert('Error', 'Failed to process images.');
      } finally {
        setLoading(false);
      }
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleGetLocation = async () => {
    if (location) {
      setLocation(null);
      return;
    }
    
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
    } catch (error) {
      showAlert('Error', 'Could not get location. Try again.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      showAlert('Hold on!', 'Please tell us what is happening.');
      return;
    }

    let wardNum = parseInt(ward) || 1;

    if (postType === 'report') {
      if (isNaN(wardNum) || wardNum < 1 || wardNum > 11) {
        showAlert('Hold on!', 'Please select a valid Ward number.');
        return;
      }
    }

    if (!profile) {
      showAlert('Wait!', 'You need to be logged in to post.');
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
      const formattedDescription = description.trim();

      const basePayload = {
        title: postType === 'report' ? generatedTitle : (description.trim().substring(0, 40) || 'Community Post'),
        description: formattedDescription,
        ward_number: postType === 'report' ? wardNum : (profile?.home_ward || 1),
        category: postType === 'report' ? category : 'General',
        author_id: profile.id,
        status: 'pending',
        image_url: publicImageUrls[0] || null,
        image_urls: publicImageUrls,
        is_anonymous: isAnonymous,
      };

      const fullPayload = {
        ...basePayload,
        post_type: postType,
      };

      let { error } = await supabase.from('issues').insert([fullPayload]);

      if (error) {
        const { error: baseError } = await supabase.from('issues').insert([basePayload]);
        error = baseError;
      }
      
      if (error) {
        const corePayload = {
          title: basePayload.title,
          description: basePayload.description,
          ward_number: basePayload.ward_number,
          category: basePayload.category,
          author_id: basePayload.author_id,
          status: basePayload.status,
          image_url: basePayload.image_url,
        };
        const { error: coreError } = await supabase.from('issues').insert([corePayload]);
        error = coreError;
      }

      if (error) throw error;

      try {
        const { data: followers } = await supabase
          .from('user_follows')
          .select('follower_id')
          .eq('following_id', profile.id);

        if (followers && followers.length > 0) {
          const authorName = isAnonymous ? 'A citizen' : (profile.full_name || 'A citizen');
          const reportTitle = basePayload.title || description.trim().substring(0, 40);

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
        console.warn(followerErr);
      }

      setIsSuccess(true);
      setTimeout(() => {
        try {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)');
        } catch (e) {
          router.replace('/(tabs)');
        }
      }, 2000);
    } catch (e: any) {
      showAlert('Post Failed', e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = postType === 'report' 
    ? description.trim().length > 0 && landmark.trim().length > 0
    : description.trim().length > 0;

  if (isSuccess) {
      return (
        <SafeAreaView edges={['top']} className={`flex-1 items-center justify-center ${theme.bgClass}`}>
          <View className={`items-center justify-center p-8 rounded-[40px] w-4/5 ${theme.glassCardClass}`}>
            <View className="w-20 h-20 rounded-full bg-emerald-500/20 items-center justify-center mb-6">
              <View className="w-14 h-14 rounded-full bg-emerald-500 items-center justify-center">
                <Check size={32} color="#ffffff" />
              </View>
            </View>
            <Text className={`text-xl font-extrabold text-center mb-2 ${theme.textClass}`}>
              {postType === 'report' ? 'Report Submitted' : 'Post Shared'}
            </Text>
            <Text className={`text-center text-[13px] font-medium leading-relaxed ${theme.textMutedClass}`}>
              {postType === 'report' 
                ? 'Your civic report has been securely sent to officials.' 
                : 'Your post is now visible to the community.'}
            </Text>
          </View>
        </SafeAreaView>
      );
  }

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      {/* HEADER */}
      <View className="px-5 py-3 flex-row items-center justify-between z-10">
        <Pressable 
          onPress={() => { try { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); } catch (e) { router.replace('/(tabs)'); } }} 
          className={`w-11 h-11 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/[0.08]' : 'bg-slate-100'}`}
        >
          <X size={20} color={theme.iconColor} />
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          disabled={!isFormValid || loading}
          className={`px-6 py-3 rounded-full flex-row items-center justify-center ${
            !isFormValid || loading 
              ? (theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-200') 
              : 'bg-indigo-600'
          }`}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.isDark ? '#818cf8' : '#fff'} />
          ) : (
            <Text className={`font-bold text-[14px] ${
              !isFormValid || loading ? theme.textMutedClass : 'text-white'
            }`}>
              {postType === 'report' ? 'Submit' : 'Post'}
            </Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, flexGrow: 1 }} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
        >
          
          {/* SEGMENTED TOGGLE */}
          <View className={`flex-row items-center mb-6 p-1.5 rounded-full ${theme.isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
            <Pressable 
              onPress={() => setPostType('normal')}
              className={`flex-1 items-center justify-center py-3 rounded-full ${postType === 'normal' ? (theme.isDark ? 'bg-[#2c2c2e]' : 'bg-white') : 'bg-transparent'}`}
            >
              <Text className={`font-bold text-[13px] ${postType === 'normal' ? theme.textClass : theme.textMutedClass}`}>Normal Post</Text>
            </Pressable>
            <Pressable 
              onPress={() => setPostType('report')}
              className={`flex-1 items-center justify-center py-3 rounded-full flex-row ${postType === 'report' ? 'bg-indigo-600' : 'bg-transparent'}`}
            >
              <ShieldAlert size={14} color={postType === 'report' ? '#ffffff' : theme.textMuted} style={{ marginRight: 6 }} />
              <Text className={`font-bold text-[13px] ${postType === 'report' ? 'text-white' : theme.textMutedClass}`}>Civic Report</Text>
            </Pressable>
          </View>

          {/* CIVIC REPORT FIELDS */}
          {postType === 'report' && (
            <View className="mb-6">
              <Text className={`font-bold text-[12px] uppercase tracking-wider mb-3 ml-1 ${theme.textMutedClass}`}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5 -mx-4 px-4">
                <View className="flex-row gap-2">
                  {CATEGORIES.map((cat) => {
                    const isActive = category === cat.id;
                    const IconComp = cat.icon;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setCategory(cat.id)}
                        className={`items-center justify-center py-3 px-4 rounded-2xl mr-2 flex-row border ${
                          isActive 
                            ? (theme.isDark ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200')
                            : (theme.isDark ? 'bg-white/[0.04] border-white/5' : 'bg-white border-slate-100')
                        }`}
                      >
                        <IconComp size={18} color={isActive ? cat.colors[0] : theme.iconColor} style={{ marginRight: 8 }} />
                        <Text className={`text-[13px] font-bold ${
                          isActive 
                            ? (theme.isDark ? 'text-indigo-300' : 'text-indigo-700')
                            : theme.textMutedClass
                        }`}>
                          {t[cat.id.toLowerCase() as keyof typeof t] || cat.id}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <Text className={`font-bold text-[12px] uppercase tracking-wider mb-3 ml-1 ${theme.textMutedClass}`}>Ward Number</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5 -mx-4 px-4">
                <View className="flex-row gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'].map((w) => {
                    const isSelected = ward === w;
                    return (
                      <Pressable
                        key={w}
                        onPress={() => setWard(w)}
                        activeOpacity={0.7}
                        className={`w-11 h-11 rounded-full items-center justify-center mr-2 border ${
                          isSelected
                            ? (theme.isDark ? 'bg-indigo-500 border-indigo-400' : 'bg-indigo-600 border-indigo-700')
                            : (theme.isDark ? 'bg-white/[0.06] border-white/5' : 'bg-white border-slate-100')
                        }`}
                      >
                        <Text className={`text-[14px] font-bold ${isSelected ? 'text-white' : theme.textClass}`}>
                          {w}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* TEXT AREA */}
          <View 
            className={`rounded-[28px] p-5 mb-5 border ${theme.isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-slate-200/70'}`}
            style={theme.cardShadow}
          >
            <TextInput
              className={`text-[17px] leading-[26px] font-normal ${theme.textClass}`}
              placeholder={postType === 'report' ? "Describe the civic issue in detail..." : "What's happening in your neighborhood?"}
              placeholderTextColor={theme.inputPlaceholder}
              multiline
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
              style={{ minHeight: 140 }}
            />
          </View>

          {/* MEDIA GRID (Up to 4 images looks best in a 2x2 grid) */}
          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-3 ml-1">
              <Text className={`font-bold text-[12px] uppercase tracking-wider ${theme.textMutedClass}`}>Photos</Text>
              {images.length < 4 && (
                <Pressable onPress={pickImage} className="flex-row items-center">
                  <Camera size={14} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
                  <Text className={`ml-1 text-[12px] font-bold ${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Add Photo</Text>
                </Pressable>
              )}
            </View>

            <View className="flex-row flex-wrap -mx-1">
              {images.map((img, idx) => (
                <View key={idx} className={`p-1 ${images.length === 1 ? 'w-full h-64' : (images.length === 2 ? 'w-1/2 h-48' : 'w-1/2 h-32')}`}>
                  <View className={`w-full h-full rounded-2xl overflow-hidden border ${theme.isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <Image source={{ uri: img.uri }} className="w-full h-full" resizeMode="cover" />
                    <Pressable
                      onPress={() => removeImage(idx)}
                      className="absolute top-2 right-2 bg-black/60 backdrop-blur-md w-7 h-7 rounded-full items-center justify-center"
                    >
                      <X size={14} color="#ffffff" />
                    </Pressable>
                  </View>
                </View>
              ))}
              
              {images.length === 0 && (
                <Pressable
                  onPress={pickImage}
                  className={`w-full h-24 rounded-2xl border-2 border-dashed items-center justify-center ${
                    theme.isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-300 bg-slate-50'
                  }`}
                >
                  <Camera size={24} color={theme.isDark ? '#818cf8' : '#94a3b8'} style={{ marginBottom: 8 }} />
                  <Text className={`text-[12px] font-bold ${theme.textMutedClass}`}>Tap to add photos</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* ANONYMOUS TOGGLE */}
          <View className={`rounded-2xl p-4 flex-row items-center justify-between border ${theme.isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100'}`}>
            <View className="flex-row items-center flex-1 mr-4">
              <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${theme.isDark ? 'bg-white/[0.08]' : 'bg-slate-100'}`}>
                <Shield size={20} color={theme.isDark ? '#818cf8' : '#5b5ef6'} />
              </View>
              <View className="flex-1">
                <Text className={`font-bold text-[14px] ${theme.textClass}`}>Post Anonymously</Text>
                <Text className={`text-[12px] mt-0.5 ${theme.textMutedClass}`}>Hide your name and avatar</Text>
              </View>
            </View>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: theme.isDark ? '#333' : '#e2e8f0', true: '#5b5ef6' }}
              thumbColor="#ffffff"
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}