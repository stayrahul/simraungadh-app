// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, AlertTriangle, Send, Camera, ImagePlus, Trash2, CheckCircle2, Megaphone } from 'lucide-react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/imageStorage';
import { useAuthStore } from '../store/authStore';
import { useAlert } from '../components/AlertProvider';
import { useTheme } from '../hooks/use-theme';
import { sendBroadcastNotification } from '../lib/notifications';

const CATEGORIES = ['General', 'Event', 'Emergency', 'Policy'];

export default function PublishNoticeModal() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [isEmergency, setIsEmergency] = useState(false);
  const [images, setImages] = useState<{ uri: string; base64: string }[]>([]);
  const [loading, setLoading] = useState(false);
  

  const { profile } = useAuthStore();
  const { showAlert } = useAlert();
  const theme = useTheme();

  const pickImage = async () => {
    if (images.length >= 5) {
      showAlert('Limit Reached', 'You can attach up to 5 photos to an official notice.');
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
        showAlert('Error', 'Failed to process selected photos.');
      } finally {
        setLoading(false);
      }
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const getErrorMessage = (err: any): string => {
    if (typeof err === 'string') return err;
    if (err?.message) return err.message;
    if (err?.details) return err.details;
    if (err?.error_description) return err.error_description;
    try {
      return JSON.stringify(err);
    } catch {
      return 'Failed to publish notice.';
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      showAlert('Error', 'Please enter both title and notice content.');
      return;
    }

    if (!profile || profile.role !== 'official') {
      showAlert('Error', 'Unauthorized. Only municipal officials can publish notices.');
      return;
    }

    setLoading(true);

    try {
      const publicImageUrls: string[] = [];

      if (images.length > 0) {
        await Promise.all(
          images.map(async (img) => {
            try {
              const url = await uploadImage(img.base64, 'notices', profile.id);
              if (url) publicImageUrls.push(url);
            } catch (imgError) {
              console.warn('Notice image upload warning:', imgError);
            }
          })
        );
      }

      const imagesEncoded = publicImageUrls.length > 0 ? JSON.stringify(publicImageUrls) : null;
      const firstImg = publicImageUrls[0] || null;

      const payload = {
        title: title.trim(),
        content: content.trim(),
        category,
        is_emergency: isEmergency,
        author_id: profile.id,
        image_urls: publicImageUrls,
        image_url: imagesEncoded || firstImg,
      };

      let { error } = await supabase.from('notices').insert(payload);

      if (error) {
        // Fallback 1: Attempt insert with image_url (which stores JSON string of all photos)
        const fallbackPayload = {
          title: payload.title,
          content: payload.content,
          category: payload.category,
          is_emergency: payload.is_emergency,
          author_id: payload.author_id,
          image_url: payload.image_url,
        };
        const { error: fallbackError } = await supabase.from('notices').insert(fallbackPayload);
        error = fallbackError;

        if (error) {
          // Fallback 2: Minimal insert
          const minimalPayload = {
            title: payload.title,
            content: payload.content,
            author_id: payload.author_id,
            image_url: payload.image_url,
          };
          const { error: minimalError } = await supabase.from('notices').insert(minimalPayload);
          error = minimalError;
        }
      }

      if (error) throw error;

      // Broadcast push notification to all citizens
      try {
        await sendBroadcastNotification({
          title: isEmergency ? `🚨 EMERGENCY: ${title.trim()}` : `📢 Official Notice: ${title.trim()}`,
          body: content.trim().substring(0, 120),
          isEmergency: isEmergency,
        });
      } catch (notifErr) {
        console.warn('Notice push broadcast warning:', notifErr);
      }

      showAlert('Official Notice Broadcast! 📢', 'Your official notice has been broadcasted successfully.', [
        { text: 'OK', onPress: () => { try { router.back(); } catch (e) { router.replace('/'); } } }
      ]);
    } catch (e: unknown) {
      const errMsg = getErrorMessage(e);
      showAlert('Error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = title.trim().length > 0 && content.trim().length > 0;

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      {/* Top Header */}
      <View className="px-5 py-3 flex-row items-center justify-between z-10">
        <TouchableOpacity 
          onPress={() => { try { router.back(); } catch (e) { router.replace('/'); } }} 
          className={`w-10 h-10 items-center justify-center rounded-full ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
        >
          <X size={20} color={theme.iconColor} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isFormValid || loading}
          className={`px-5 py-2.5 rounded-[20px] flex-row items-center ${
            !isFormValid || loading 
              ? (theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-200') 
              : (theme.isDark ? 'bg-indigo-500' : 'bg-indigo-600')
          }`}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Send size={14} color={!isFormValid ? theme.iconColor : "#fff"} className="mr-1.5" />
              <Text className={`font-black tracking-wide text-[13px] uppercase ${!isFormValid ? theme.textSecondaryClass : "text-white"}`}>Publish</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {/* Official Publisher Info Badge */}
          <View className={`rounded-[24px] p-3.5 mb-5 flex-row items-center border ${theme.isDark ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50/80 border-indigo-200'}`}>
            <View className="w-9 h-9 rounded-full bg-indigo-600 items-center justify-center mr-3">
              <CheckCircle2 size={18} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className={`font-bold text-[13px] ${theme.isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>
                Official Broadcast ({profile?.full_name || 'Official User'})
              </Text>
              <Text className={`text-[11px] ${theme.isDark ? 'text-primary-400/80' : 'text-indigo-700/80'}`}>
                {profile?.department ? `${profile.department} Department` : 'Simraungadh Municipality'}
              </Text>
            </View>
          </View>

          <Text className={`${theme.isDark ? 'text-primary-400' : 'text-primary'} font-semibold text-[11px] uppercase tracking-wider mb-2.5 ml-0.5`}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            <View className={`flex-row p-2 rounded-full ${theme.isDark ? 'bg-white/[0.04]' : 'bg-slate-100/50'}`}>
              {CATEGORIES.map(cat => {
                const isActive = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    className={`px-5 py-3.5 rounded-full items-center mr-1 ${
                      isActive 
                        ? (theme.isDark ? 'bg-indigo-500' : 'bg-indigo-600')
                        : 'bg-transparent'
                    }`}
                  >
                    <Text className={`font-black tracking-widest text-[12px] uppercase ${
                      isActive ? 'text-white' : theme.textMutedClass
                    }`}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Notice Inputs */}
          <View className={`mb-6 p-6 rounded-[32px] ${theme.glassCardClass}`}>
            <Text className={`font-bold text-[12px] mb-1.5 ${theme.textSecondaryClass}`}>Notice Title</Text>
            <TextInput
              className={`border-b border-slate-200/50 dark:border-white/10 pb-3 mb-5 font-black text-[18px] ${theme.textClass}`}
              placeholder="e.g. Ward Road Renovation"
              placeholderTextColor={theme.inputPlaceholder}
              value={title}
              onChangeText={setTitle}
            />

            <Text className={`font-bold text-[12px] mb-1.5 ${theme.textSecondaryClass}`}>Details</Text>
            <TextInput
              className={`text-[16px] leading-[26px] min-h-[160px] font-medium ${theme.textClass}`}
              placeholder="Provide complete information, schedule, instructions, or contact details for citizens..."
              placeholderTextColor={theme.inputPlaceholder}
              multiline
              textAlignVertical="top"
              value={content}
              onChangeText={setContent}
            />
          </View>

          {/* Photo Attachments Section (Official Photos Support) */}
          <View className={`rounded-[24px] p-4 border mb-5 ${theme.cardClass}`} style={theme.cardShadow}>
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Camera size={16} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
                <Text className={`font-bold text-[13px] ml-2 ${theme.textClass}`}>Attach Official Photos ({images.length}/5)</Text>
              </View>
              <Text className={`text-[11px] font-medium ${theme.textMutedClass}`}>Attach photos like citizens</Text>
            </View>

            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                <View className="flex-row gap-3">
                  {images.map((img, idx) => (
                    <View key={idx} className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700">
                      <Image source={{ uri: img.uri }} style={{ width: 84, height: 84 }} cachePolicy="memory-disk" contentFit="cover" />
                      <TouchableOpacity
                        onPress={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-rose-600 rounded-full p-1 shadow"
                        activeOpacity={0.8}
                      >
                        <Trash2 size={12} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={pickImage}
              disabled={images.length >= 5 || loading}
              className={`py-3.5 rounded-xl border-2 border-dashed flex-row items-center justify-center ${
                theme.isDark ? 'border-indigo-500/30 bg-indigo-500/[0.06]' : 'border-indigo-200 bg-indigo-50/60'
              }`}
            >
              <ImagePlus size={18} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
              <Text className={`font-bold text-[13px] ml-2 ${theme.isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                {images.length === 0 ? 'Upload Official Photos' : 'Add More Photos'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Emergency Highlight Toggle */}
          <View className={`rounded-[24px] p-4 border flex-row items-center justify-between ${
            isEmergency 
              ? (theme.isDark ? 'bg-rose-950/30 border-rose-500/40' : 'bg-rose-50 border-rose-300') 
              : theme.cardClass
          }`} style={isEmergency ? theme.glowShadow('#ef4444') : theme.cardShadow}>
            <View className="flex-row items-center flex-1 mr-4">
              <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${isEmergency ? (theme.isDark ? 'bg-rose-500/20' : 'bg-rose-100') : (theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100')}`}>
                <AlertTriangle size={20} color={isEmergency ? (theme.isDark ? '#fb7185' : '#e11d48') : theme.iconColor} />
              </View>
              <View className="flex-1">
                <Text className={`font-extrabold text-[13.5px] ${isEmergency ? (theme.isDark ? 'text-rose-200' : 'text-rose-900') : theme.textClass}`}>
                  High-Priority Emergency Notice
                </Text>
                <Text className={`text-[11px] mt-0.5 ${isEmergency ? (theme.isDark ? 'text-rose-300/80' : 'text-rose-700') : theme.textMutedClass}`}>
                  Highlights notice banner with red alert status
                </Text>
              </View>
            </View>
            <Switch
              value={isEmergency}
              onValueChange={setIsEmergency}
              trackColor={{ false: '#cbd5e1', true: '#ef4444' }}
              thumbColor="#ffffff"
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
