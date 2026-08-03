// @ts-nocheck
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Shield, Lock, Eye, Database } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/use-theme';

export default function PrivacyScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      {/* Header */}
      <View className={`px-5 py-3.5 border-b flex-row justify-between items-center ${theme.headerBgClass}`}>
        <TouchableOpacity onPress={() => router.back()} className={`w-9 h-9 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
          <ArrowLeft size={18} color={theme.iconColor} />
        </TouchableOpacity>
        <Text className={`text-[18px] font-bold ${theme.textClass}`}>Privacy & Data</Text>
        <View className="w-9 h-9" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        
        {/* Intro */}
        <View className={`rounded-2xl p-5 mb-6 border ${theme.cardClass}`} style={theme.cardShadow}>
          <View className={`w-12 h-12 rounded-full items-center justify-center mb-4 ${theme.isDark ? 'bg-purple-500/12' : 'bg-purple-50'}`}>
            <Shield size={24} color={theme.isDark ? '#c084fc' : '#9333ea'} />
          </View>
          <Text className={`text-[20px] font-bold mb-2 ${theme.textClass}`}>Your Data is Protected</Text>
          <Text className={`text-[14px] leading-relaxed ${theme.textSecondaryClass}`}>
            At Simraungadh Municipality, we are deeply committed to maintaining your trust by protecting your personal information. This Privacy Policy details how we collect, use, and safeguard the data you share with us through the Civic Portal.
          </Text>
        </View>

        <Text className={`${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'} font-semibold text-[11px] uppercase tracking-wider mb-3 ml-1`}>Key Privacy Principles</Text>
        
        <View className={`rounded-2xl border overflow-hidden mb-6 ${theme.cardClass}`} style={theme.cardShadow}>
          
          {/* Section 1 */}
          <View className={`p-4 border-b ${theme.borderSubtleClass}`}>
            <View className="flex-row items-center mb-2">
              <Database size={16} color={theme.isDark ? '#60a5fa' : '#3b82f6'} className="mr-2" />
              <Text className={`font-bold text-[15px] ${theme.textClass}`}>1. Data Collection</Text>
            </View>
            <Text className={`text-[13px] leading-relaxed ${theme.textSecondaryClass}`}>
              We only collect data that is strictly necessary for providing our civic services. This includes your name, contact information (such as phone number and email), your home ward, and the content of the issues or reports you submit, including associated images and location data.
            </Text>
          </View>

          {/* Section 2 */}
          <View className={`p-4 border-b ${theme.borderSubtleClass}`}>
            <View className="flex-row items-center mb-2">
              <Eye size={16} color={theme.isDark ? '#34d399' : '#059669'} className="mr-2" />
              <Text className={`font-bold text-[15px] ${theme.textClass}`}>2. How We Use Your Data</Text>
            </View>
            <Text className={`text-[13px] leading-relaxed ${theme.textSecondaryClass}`}>
              Your information is exclusively used to facilitate municipal services. We use it to verify the authenticity of reports, assign the correct departmental authorities to your issues, and to communicate updates directly back to you regarding the status of your submissions.
            </Text>
          </View>

          {/* Section 3 */}
          <View className="p-4">
            <View className="flex-row items-center mb-2">
              <Lock size={16} color={theme.isDark ? '#fb7185' : '#e11d48'} className="mr-2" />
              <Text className={`font-bold text-[15px] ${theme.textClass}`}>3. Data Security & Sharing</Text>
            </View>
            <Text className={`text-[13px] leading-relaxed ${theme.textSecondaryClass}`}>
              We implement industry-standard encryption and secure cloud storage protocols to protect your account. Your personal data is never sold or shared with third-party marketing agencies. Access to your data is strictly limited to authorized government officials and municipal staff handling your reports.
            </Text>
          </View>
        </View>

        <Text className={`text-center font-medium text-[11px] mt-2 ${theme.textMutedClass}`}>
          Last Updated: {new Date().toLocaleDateString()}
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}
