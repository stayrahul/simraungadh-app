// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Send, Star, ImagePlus, X, MessageSquare } from 'lucide-react-native';
import { useTheme } from '../hooks/use-theme';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useAlert } from '../components/AlertProvider';

const CATEGORIES = ['General', 'Bug Report', 'Feature Request', 'Other'];

export default function FeedbackScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useAuthStore();
  const { showAlert } = useAlert();

  const [category, setCategory] = useState('General');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [image, setImage] = useState<{ uri: string, base64: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      showAlert('Error', 'Please enter your feedback message.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      let screenshot_url = null;
      if (image) {
        const filePath = `feedback/${profile?.id || 'anon'}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('civic_images')
          .upload(filePath, decode(image.base64), { contentType: 'image/jpeg' });
        
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('civic_images').getPublicUrl(filePath);
        screenshot_url = data.publicUrl;
      }

      const { error } = await supabase.from('feedback').insert({
        user_id: profile?.id,
        category,
        message: message.trim(),
        rating,
        screenshot_url,
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert('Thank You', 'Your feedback has been submitted successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      console.error(e);
      showAlert('Error', e.message || 'Failed to submit feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      <View className="px-5 py-3 flex-row justify-between items-center z-10 border-b border-slate-100 dark:border-white/5">
        <TouchableOpacity onPress={() => router.back()} className={`w-10 h-10 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
          <ChevronLeft size={24} color={theme.iconColor} />
        </TouchableOpacity>
        <Text className={`font-black text-[16px] tracking-wide ${theme.textClass}`}>App Feedback</Text>
        <View className="w-10 h-10" />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          
          <View className={`p-5 rounded-[24px] mb-6 flex-row items-center ${theme.isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
            <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${theme.isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
              <MessageSquare size={24} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
            </View>
            <View className="flex-1">
              <Text className={`text-[15px] font-bold ${theme.isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>Help Us Improve</Text>
              <Text className={`text-[13px] mt-1 ${theme.isDark ? 'text-indigo-300/70' : 'text-indigo-600/70'}`}>Your feedback goes directly to our development team.</Text>
            </View>
          </View>

          {/* Rating */}
          <Text className={`font-bold text-[13px] uppercase tracking-wider mb-3 ml-1 ${theme.textMutedClass}`}>How is your experience?</Text>
          <View className={`flex-row justify-between mb-8 p-4 rounded-[24px] ${theme.cardClass}`} style={theme.cardShadow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => { Haptics.selectionAsync(); setRating(star); }} className="p-2">
                <Star size={32} color={star <= rating ? '#f59e0b' : (theme.isDark ? '#333' : '#e2e8f0')} fill={star <= rating ? '#f59e0b' : 'none'} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Category */}
          <Text className={`font-bold text-[13px] uppercase tracking-wider mb-3 ml-1 ${theme.textMutedClass}`}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6" contentContainerStyle={{ gap: 8 }}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => { Haptics.selectionAsync(); setCategory(cat); }}
                className={`px-4 py-2.5 rounded-[20px] border ${category === cat ? theme.pillActiveClass : theme.pillInactiveClass}`}
              >
                <Text className={`font-bold text-[13px] ${category === cat ? 'text-white' : theme.textSecondaryClass}`}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Message */}
          <Text className={`font-bold text-[13px] uppercase tracking-wider mb-3 ml-1 ${theme.textMutedClass}`}>Message</Text>
          <View className={`rounded-[24px] p-1 mb-6 border ${theme.inputClass}`}>
            <TextInput
              multiline
              textAlignVertical="top"
              className={`h-32 px-4 py-4 text-[15px] ${theme.textClass}`}
              placeholder="Tell us what you think..."
              placeholderTextColor={theme.inputPlaceholder}
              value={message}
              onChangeText={setMessage}
            />
          </View>

          {/* Screenshot */}
          <Text className={`font-bold text-[13px] uppercase tracking-wider mb-3 ml-1 ${theme.textMutedClass}`}>Screenshot (Optional)</Text>
          {image ? (
            <View className="relative mb-8">
              <Image source={{ uri: image.uri }} className="w-full h-48 rounded-[24px]" contentFit="cover" />
              <TouchableOpacity
                onPress={() => setImage(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 items-center justify-center backdrop-blur-md"
              >
                <X size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={pickImage}
              className={`h-24 rounded-[24px] border-2 border-dashed items-center justify-center mb-8 ${theme.isDark ? 'border-slate-700 bg-white/5' : 'border-slate-300 bg-slate-50'}`}
            >
              <ImagePlus size={24} color={theme.textMuted} />
              <Text className={`font-bold text-[13px] mt-2 ${theme.textMutedClass}`}>Attach a screenshot</Text>
            </TouchableOpacity>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`flex-row items-center justify-center py-4 rounded-[24px] ${theme.isDark ? 'bg-indigo-500' : 'bg-indigo-600'} ${isSubmitting ? 'opacity-70' : ''}`}
            style={theme.glowShadow(theme.isDark ? '#6366f1' : '#4f46e5')}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text className="text-white font-black text-[15px] tracking-wide mr-2">Submit Feedback</Text>
                <Send size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
