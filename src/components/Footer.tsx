// @ts-nocheck
import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { PhoneCall, Flame, HeartPulse, Phone, Sparkles, Heart, Code2, ShieldAlert } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/use-theme';
import { useLangStore } from '../store/langStore';

export default function Footer() {
  const theme = useTheme();
  const router = useRouter();
  const { language } = useLangStore();
  const isNe = language === 'ne';

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const emergencyContacts = [
    { label: isNe ? 'प्रहरी' : 'Police', number: '100', icon: PhoneCall, color: '#2563eb' },
    { label: isNe ? 'दम्कल' : 'Fire', number: '101', icon: Flame, color: '#f59e0b' },
    { label: isNe ? 'एम्बुलेन्स' : 'Ambulance', number: '102', icon: HeartPulse, color: '#ef4444' },
    { label: isNe ? 'हेल्पलाइन' : 'Helpline', number: '053-411072', icon: Phone, color: '#10b981' },
  ];

  return (
    <View className={`mt-8 pt-8 pb-28 px-5 border-t ${theme.isDark ? 'bg-[#090d16] border-white/[0.08]' : 'bg-slate-50/95 border-slate-200/80'}`}>
      {/* Emergency Quick Action Strip */}
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <ShieldAlert size={14} color={theme.isDark ? '#f87171' : '#ef4444'} />
            <Text className={`text-[11px] font-bold uppercase tracking-wider ml-1.5 ${theme.isDark ? 'text-rose-400' : 'text-rose-600'}`}>
              {isNe ? 'आपातकालीन सम्पर्क' : 'EMERGENCY HELPLINES'}
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {emergencyContacts.map((contact, idx) => {
            const IconComp = contact.icon;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => handleCall(contact.number)}
                activeOpacity={0.7}
                className={`flex-1 min-w-[120px] flex-row items-center p-2.5 rounded-xl border ${theme.isDark ? 'bg-[#111827] border-white/[0.08]' : 'bg-white border-slate-200'}`}
              >
                <View className="w-7 h-7 rounded-lg items-center justify-center mr-2" style={{ backgroundColor: `${contact.color}15` }}>
                  <IconComp size={14} color={contact.color} />
                </View>
                <View>
                  <Text className={`text-[10px] font-medium ${theme.textMutedClass}`}>{contact.label}</Text>
                  <Text className={`text-[12px] font-bold ${theme.textClass}`}>{contact.number}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Branding & Version */}
      <View className="items-center pt-4 border-t border-dashed border-slate-200 dark:border-white/10">
        <View className="flex-row items-center mb-1.5">
          <Sparkles size={13} color={theme.isDark ? '#60a5fa' : '#2563eb'} />
          <Text className={`text-[11px] font-black tracking-widest ml-1.5 uppercase ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            {isNe ? 'सिमरौनगढ डिजिटल नागरिक पोर्टल' : 'SIMRAUNGADH CIVIC PORTAL'}
          </Text>
        </View>

        <Text className={`text-[10.5px] font-medium text-center mb-4 ${theme.textMutedClass}`}>
          {isNe
            ? 'सबै नागरिकहरूका लागि सुदृढ र सशक्त भविष्य · v1.0.0'
            : 'Empowering citizens for a transparent & digital tomorrow · v1.0.0'
          }
        </Text>

        {/* Creator & Developer Mark */}
        <View className={`flex-row items-center px-4 py-2 rounded-full border ${theme.isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50/80 border-blue-100'}`}>
          <Code2 size={13} color={theme.isDark ? '#60a5fa' : '#2563eb'} />
          <Text className={`text-[11px] font-semibold ml-2 flex-wrap text-center ${theme.textSecondaryClass}`}>
            {isNe ? 'डिजाइन र व्यवस्थापन: ' : 'Designed & Handled by '}
            <Text className={`font-black ${theme.isDark ? 'text-blue-300' : 'text-blue-600'}`}>Rahul</Text>
            {isNe ? ' र परिकल्पना: ' : ' and idea by '}
            <Text className={`font-black ${theme.isDark ? 'text-blue-300' : 'text-blue-600'}`}>Adarsh</Text>
          </Text>
          <Heart size={11} color="#f43f5e" fill="#f43f5e" style={{ marginLeft: 6 }} />
        </View>
      </View>
    </View>
  );
}

