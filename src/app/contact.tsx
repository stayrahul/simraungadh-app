// @ts-nocheck
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Phone, MapPin, Globe, Code, ExternalLink, MessageCircle, Camera } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/use-theme';

export default function ContactScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      {/* Header */}
      <View className={`px-5 py-3.5 border-b flex-row justify-between items-center ${theme.headerBgClass}`}>
        <TouchableOpacity onPress={() => router.back()} className={`w-9 h-9 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
          <ArrowLeft size={18} color={theme.iconColor} />
        </TouchableOpacity>
        <Text className={`text-[18px] font-bold ${theme.textClass}`}>Contact Us</Text>
        <View className="w-9 h-9" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        {/* Intro */}
        <View className={`rounded-2xl p-5 mb-6 border ${theme.cardClass}`} style={theme.cardShadow}>
          <View className={`w-12 h-12 rounded-full items-center justify-center mb-4 ${theme.isDark ? 'bg-teal-500/12' : 'bg-teal-50'}`}>
            <Mail size={24} color={theme.isDark ? '#2dd4bf' : '#0d9488'} />
          </View>
          <Text className={`text-[20px] font-bold mb-2 ${theme.textClass}`}>Get in Touch</Text>
          <Text className={`text-[14px] leading-relaxed ${theme.textSecondaryClass}`}>
            Whether you have a question about the app, need assistance tracking an issue, or want to provide feedback, our team is here to listen. Choose the most convenient way to reach out below.
          </Text>
        </View>

        {/* Official Contact Info */}
        <Text className={`${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'} font-semibold text-[11px] uppercase tracking-wider mb-3 ml-1`}>Municipality Office</Text>

        <View className={`rounded-2xl border overflow-hidden mb-6 ${theme.cardClass}`} style={theme.cardShadow}>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Linking.openURL('mailto:support@simraungadh.gov.np')}
            className={`p-4 border-b flex-row items-center justify-between ${theme.borderSubtleClass}`}
          >
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                <Mail size={18} color={theme.isDark ? '#818cf8' : '#6366f1'} />
              </View>
              <View>
                <Text className={`font-bold text-[15px] ${theme.textClass}`}>Email Support</Text>
                <Text className={`text-[13px] ${theme.textSecondaryClass} mt-0.5`}>support@simraungadh.gov.np</Text>
              </View>
            </View>
            <ExternalLink size={16} color={theme.iconColor} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Linking.openURL('tel:+9779800000000')}
            className={`p-4 border-b flex-row items-center justify-between ${theme.borderSubtleClass}`}
          >
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <Phone size={18} color={theme.isDark ? '#34d399' : '#059669'} />
              </View>
              <View>
                <Text className={`font-bold text-[15px] ${theme.textClass}`}>Phone Support</Text>
                <Text className={`text-[13px] ${theme.textSecondaryClass} mt-0.5`}>+977 980 000 0000</Text>
              </View>
            </View>
            <ExternalLink size={16} color={theme.iconColor} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://simraungadh.gov.np')}
            className={`p-4 border-b flex-row items-center justify-between ${theme.borderSubtleClass}`}
          >
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                <Globe size={18} color={theme.isDark ? '#60a5fa' : '#3b82f6'} />
              </View>
              <View>
                <Text className={`font-bold text-[15px] ${theme.textClass}`}>Official Website</Text>
                <Text className={`text-[13px] ${theme.textSecondaryClass} mt-0.5`}>simraungadh.gov.np</Text>
              </View>
            </View>
            <ExternalLink size={16} color={theme.iconColor} />
          </TouchableOpacity>

          <View className="p-4 flex-row items-center">
            <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.isDark ? 'bg-rose-500/10' : 'bg-rose-50'}`}>
              <MapPin size={18} color={theme.isDark ? '#fb7185' : '#e11d48'} />
            </View>
            <View className="flex-1">
              <Text className={`font-bold text-[15px] ${theme.textClass}`}>Address</Text>
              <Text className={`text-[13px] ${theme.textSecondaryClass} mt-0.5`}>Simraungadh Municipality Office, Bara, Madhesh Province, Nepal</Text>
            </View>
          </View>

        </View>



        {/* Developer Contact */}
        <Text className={`${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'} font-semibold text-[11px] uppercase tracking-wider mb-3 ml-1`}>Developer Contact</Text>

        <View className={`rounded-2xl border overflow-hidden mb-6 ${theme.cardClass}`} style={theme.cardShadow}>
          
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => Linking.openURL('tel:+9779822228722')}
            className={`p-4 border-b flex-row items-center justify-between ${theme.borderSubtleClass}`}
          >
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <Phone size={18} color={theme.isDark ? '#34d399' : '#059669'} />
              </View>
              <View>
                <Text className={`font-bold text-[15px] ${theme.textClass}`}>Direct Phone</Text>
                <Text className={`text-[13px] ${theme.textSecondaryClass} mt-0.5`}>+977 982-2228722</Text>
              </View>
            </View>
            <ExternalLink size={16} color={theme.iconColor} />
          </TouchableOpacity>

          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://rahul.rest')}
            className={`p-4 border-b flex-row items-center justify-between ${theme.borderSubtleClass}`}
          >
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                <Globe size={18} color={theme.isDark ? '#818cf8' : '#6366f1'} />
              </View>
              <View>
                <Text className={`font-bold text-[15px] ${theme.textClass}`}>Developer Portfolio</Text>
                <Text className={`text-[13px] ${theme.textSecondaryClass} mt-0.5`}>rahul.rest</Text>
              </View>
            </View>
            <ExternalLink size={16} color={theme.iconColor} />
          </TouchableOpacity>

          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://facebook.com/stayrahul')}
            className={`p-4 border-b flex-row items-center justify-between ${theme.borderSubtleClass}`}
          >
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.isDark ? 'bg-blue-600/20' : 'bg-blue-50'}`}>
                <MessageCircle size={18} color={theme.isDark ? '#3b82f6' : '#1d4ed8'} />
              </View>
              <View>
                <Text className={`font-bold text-[15px] ${theme.textClass}`}>Facebook</Text>
                <Text className={`text-[13px] ${theme.textSecondaryClass} mt-0.5`}>@stayrahul</Text>
              </View>
            </View>
            <ExternalLink size={16} color={theme.iconColor} />
          </TouchableOpacity>

          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://instagram.com/stayrahul')}
            className={`p-4 flex-row items-center justify-between`}
          >
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.isDark ? 'bg-pink-500/20' : 'bg-pink-50'}`}>
                <Camera size={18} color={theme.isDark ? '#ec4899' : '#db2777'} />
              </View>
              <View>
                <Text className={`font-bold text-[15px] ${theme.textClass}`}>Instagram</Text>
                <Text className={`text-[13px] ${theme.textSecondaryClass} mt-0.5`}>@stayrahul</Text>
              </View>
            </View>
            <ExternalLink size={16} color={theme.iconColor} />
          </TouchableOpacity>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
