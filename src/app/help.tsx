// @ts-nocheck
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, HelpCircle, File, MessageSquare, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/use-theme';

export default function HelpScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      {/* Header */}
      <View className="px-5 py-3 flex-row justify-between items-center z-10">
        <TouchableOpacity onPress={() => router.back()} className={`w-10 h-10 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
          <ArrowLeft size={20} color={theme.iconColor} />
        </TouchableOpacity>
        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        
        {/* Intro */}
        <View className={`rounded-[24px] p-5 mb-6 border ${theme.cardClass}`} style={theme.cardShadow}>
          <View className={`w-12 h-12 rounded-full items-center justify-center mb-4 ${theme.isDark ? 'bg-indigo-500/12' : 'bg-indigo-50'}`}>
            <HelpCircle size={24} color={theme.isDark ? '#818cf8' : '#6366f1'} />
          </View>
          <Text className={`text-[20px] font-bold mb-2 ${theme.textClass}`}>How can we help?</Text>
          <Text className={`text-[14px] leading-relaxed ${theme.textSecondaryClass}`}>
            Welcome to the Simraungadh Civic Portal Help Center. This platform is designed to bridge the gap between citizens and local government by allowing you to easily report civic issues, track progress, and stay updated on important municipality notices.
          </Text>
        </View>

        {/* FAQs */}
        <Text className={`${theme.isDark ? 'text-primary-400' : 'text-primary'} font-semibold text-[11px] uppercase tracking-wider mb-3 ml-1`}>Frequently Asked Questions</Text>
        
        <View className={`rounded-[24px] border overflow-hidden mb-6 ${theme.cardClass}`} style={theme.cardShadow}>
          
          {/* Q1 */}
          <View className={`p-4 border-b ${theme.borderSubtleClass}`}>
            <View className="flex-row items-center mb-2">
              <AlertTriangle size={16} color={theme.isDark ? '#f59e0b' : '#d97706'} className="mr-2" />
              <Text className={`font-bold text-[15px] ${theme.textClass}`}>How do I report an issue?</Text>
            </View>
            <Text className={`text-[13px] leading-relaxed ${theme.textSecondaryClass}`}>
              Navigate to the home screen and tap the floating "+" button at the bottom right. You can describe the issue, take photos, and choose the correct category (e.g. Road, Water, Electricity). Once submitted, the local authorities will be notified immediately.
            </Text>
          </View>

          {/* Q2 */}
          <View className={`p-4 border-b ${theme.borderSubtleClass}`}>
            <View className="flex-row items-center mb-2">
              <File size={16} color={theme.isDark ? '#818cf8' : '#6366f1'} className="mr-2" />
              <Text className={`font-bold text-[15px] ${theme.textClass}`}>How do I track my reports?</Text>
            </View>
            <Text className={`text-[13px] leading-relaxed ${theme.textSecondaryClass}`}>
              You can track the status of all your submitted reports directly from your Profile tab under "Activity History". Each post will have a colored badge indicating if it's Pending, In Progress, or Resolved by the municipality officials.
            </Text>
          </View>

          {/* Q3 */}
          <View className="p-4">
            <View className="flex-row items-center mb-2">
              <MessageSquare size={16} color={theme.isDark ? '#10b981' : '#059669'} className="mr-2" />
              <Text className={`font-bold text-[15px] ${theme.textClass}`}>Can I edit or delete my posts?</Text>
            </View>
            <Text className={`text-[13px] leading-relaxed ${theme.textSecondaryClass}`}>
              Yes! Tap the three-dots menu on any of your active posts in the feed, or use the quick-action Pencil/Trash icons on your profile to edit your text and images, or delete the post entirely if the issue has already been resolved independently.
            </Text>
          </View>
        </View>

        {/* Contact CTA */}
        <Text className={`${theme.isDark ? 'text-primary-400' : 'text-primary'} font-semibold text-[11px] uppercase tracking-wider mb-3 ml-1`}>Still Need Help?</Text>
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => router.push('/contact')}
          className={`flex-row items-center p-4 rounded-[24px] border ${theme.cardClass}`} 
          style={theme.cardShadow}
        >
          <View className="flex-1">
            <Text className={`font-bold text-[15px] mb-1 ${theme.textClass}`}>Contact Support</Text>
            <Text className={`text-[12px] ${theme.textSecondaryClass}`}>Reach out to our team directly.</Text>
          </View>
          <View className={`w-8 h-8 rounded-full items-center justify-center ${theme.isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
            <ChevronRight size={16} color={theme.isDark ? '#818cf8' : '#6366f1'} />
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
