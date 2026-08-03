// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Navigation, Droplets, Zap, Trash2, Info, MapPin, Camera, Check, Lock, Shield } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
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
  { id: 'Water', icon: Droplets, colors: ['#3b82f6', '#2563eb'] as const },
  { id: 'Electricity', icon: Zap, colors: ['#f59e0b', '#d97706'] as const },
  { id: 'Trash', icon: Trash2, colors: ['#22c55e', '#16a34a'] as const },
  { id: 'General', icon: Info, colors: ['#8b5cf6', '#7c3aed'] as const },
];

export default function ReportScreen() {
  const [description, setDescription] = useState('');
  const [ward, setWard] = useState('1');
  const [category, setCategory] = useState('General');
  const [images, setImages] = useState<{ uri: string, base64: string }[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async () => {
    if (!description.trim() || !ward.trim()) {
      showAlert('Hold on!', 'Please tell us what the issue is.');
      return;
    }

    const wardNum = parseInt(ward);
    if (isNaN(wardNum) || wardNum < 1 || wardNum > 11) {
      showAlert('Hold on!', 'Please enter a valid Ward number (1-11).');
      return;
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
        title: generatedTitle,
        description: description.trim(),
        ward_number: wardNum,
        category,
        author_id: profile.id,
        status: 'pending',
        image_urls: publicImageUrls,
        image_url: publicImageUrls[0] || null,
        is_anonymous: isAnonymous,
      };

      let { error } = await supabase.from('issues').insert([payload]);

      if (error && error.code === '42703') {
        const { image_urls, ...fallbackPayload } = payload;
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
          const reportTitle = title.trim() || description.trim().substring(0, 40);

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

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: unknown) {
      showAlert('Error', (e instanceof Error ? e.message : String(e)) || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = description.trim().length > 0 && ward.trim().length > 0;

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      <View className={`px-5 py-3.5 flex-row items-center justify-between border-b ${theme.headerBgClass}`}>
        <TouchableOpacity onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }} className={`w-9 h-9 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
          <X size={18} color={theme.iconColor} />
        </TouchableOpacity>
        <Text className={`font-bold text-[16px] ${theme.textClass}`}>{t.newReport}</Text>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isFormValid || loading}
          className={`px-4 py-2 rounded-xl ${
            !isFormValid || loading 
              ? (theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-200') 
              : (theme.isDark ? 'bg-blue-500/20' : 'bg-blue-600')
          }`}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.isDark ? '#60a5fa' : '#fff'} />
          ) : (
            <Text className={`font-semibold text-[13px] ${
              !isFormValid || loading 
                ? theme.textMutedClass 
                : (theme.isDark ? 'text-blue-300' : 'text-white')
            }`}>{t.post}</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <Text className={`${theme.isDark ? 'text-blue-400' : 'text-blue-600'} font-semibold text-[11px] uppercase tracking-wider mb-2.5 ml-0.5`}>{t.category}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
            <View className="flex-row gap-2">
              {CATEGORIES.map((cat) => {
                const isActive = category === cat.id;
                const IconComp = cat.icon;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategory(cat.id)}
                    className={`flex-row items-center px-3.5 py-2.5 rounded-xl ${
                      isActive 
                        ? (theme.isDark ? 'bg-blue-500/20' : 'bg-blue-600')
                        : (theme.isDark ? 'bg-white/[0.04]' : 'bg-slate-100')
                    }`}
                  >
                    <IconComp size={16} color={isActive ? (theme.isDark ? '#60a5fa' : '#ffffff') : theme.iconColor} />
                    <Text className={`ml-2 text-[13px] font-semibold ${
                      isActive 
                        ? (theme.isDark ? 'text-blue-300' : 'text-white')
                        : theme.textSecondaryClass
                    }`}>
                      {t[cat.id.toLowerCase() as keyof typeof t] || cat.id}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View className={`rounded-2xl p-4 border mb-5 ${theme.cardClass}`} style={theme.cardShadow}>
            <View className={`mb-3 pb-3 border-b ${theme.borderSubtleClass}`}>
              <View className="flex-row items-center mb-2">
                <View className={`w-8 h-8 rounded-xl items-center justify-center mr-2.5 ${theme.isDark ? 'bg-blue-500/12' : 'bg-blue-50'}`}>
                  <MapPin size={15} color={theme.isDark ? '#60a5fa' : '#2563eb'} />
                </View>
                <Text className={`font-bold text-[13px] ${theme.textClass}`}>{t.wardNumber}</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'].map((w) => {
                  const isSelected = ward === w;
                  return (
                    <TouchableOpacity
                      key={w}
                      onPress={() => setWard(w)}
                      activeOpacity={0.7}
                      className={`px-3 py-1.5 rounded-xl mr-1.5 border ${
                        isSelected
                          ? (theme.isDark ? 'bg-blue-600 border-blue-500' : 'bg-blue-600 border-blue-600')
                          : (theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200')
                      }`}
                    >
                      <Text className={`text-[12px] font-bold ${isSelected ? 'text-white' : theme.textClass}`}>
                        Ward {w}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <TextInput
              className={`text-[14px] leading-relaxed min-h-[120px] ${theme.textClass}`}
              placeholder={t.issuePlaceholder}
              placeholderTextColor={theme.inputPlaceholder}
              multiline
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <Text className={`${theme.isDark ? 'text-blue-400' : 'text-blue-600'} font-semibold text-[11px] uppercase tracking-wider mb-2.5 ml-0.5`}>{t.photos}</Text>
          <View className="flex-row flex-wrap gap-2.5 mb-5">
            {images.map((img, idx) => (
              <View key={idx} className={`relative w-20 h-20 rounded-xl overflow-hidden border ${theme.borderClass}`}>
                <Image source={{ uri: img.uri }} className="w-full h-full" />
                <TouchableOpacity
                  onPress={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-black/60 w-5 h-5 rounded-full items-center justify-center"
                >
                  <X size={12} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity
                onPress={pickImage}
                className={`w-20 h-20 rounded-xl border border-dashed items-center justify-center ${theme.isDark ? 'border-white/[0.1]' : 'border-slate-300'}`}
              >
                <Camera size={20} color={theme.isDark ? '#818cf8' : '#5b5ef6'} />
                <Text className={`text-[9px] font-medium mt-1 ${theme.textMutedClass}`}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className={`rounded-2xl p-4 border flex-row items-center justify-between ${theme.cardClass}`} style={theme.cardShadow}>
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
