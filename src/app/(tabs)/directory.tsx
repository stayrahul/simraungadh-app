// @ts-nocheck
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Linking, Share, Platform, LayoutAnimation, UIManager } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Star, UserCheck, Activity, Crosshair, Wrench, Zap, PhoneCall, MapPin, Share2, Navigation, AlertTriangle, ShieldAlert } from 'lucide-react-native';

import * as Haptics from 'expo-haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  const isFabric = (global as any)._IS_FABRIC || (global as any).RN$Bridgeless;
  if (!isFabric) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

import { useTheme } from '../../hooks/use-theme';
import { useLangStore } from '../../store/langStore';
import { translations } from '../../lib/translations';

export default function DirectoryScreen() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeWard, setActiveWard] = useState('All Wards');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const theme = useTheme();
  const { language } = useLangStore();
  const t = translations[language] || translations.en;

  const CATEGORY_NAMES: Record<string, string> = {
    'All': t.all,
    'Emergency': language === 'ne' ? 'आपतकालीन' : 'Emergency',
    'Administration': language === 'ne' ? 'प्रशासन' : 'Administration',
    'Ward Members': language === 'ne' ? 'वडा सदस्यहरू' : 'Ward Members',
    'Hospitals': language === 'ne' ? 'अस्पतालहरू' : 'Hospitals',
    'Mechanics': language === 'ne' ? 'मेकानिक्स' : 'Mechanics',
    'Electricians': language === 'ne' ? 'इलेक्ट्रीशियनहरू' : 'Electricians',
    'Plumbers': language === 'ne' ? 'प्लम्बरहरू' : 'Plumbers',
  };

  const DIRECTORY_CATEGORIES = ['All', 'Emergency', 'Administration', 'Ward Members', 'Hospitals', 'Mechanics', 'Electricians', 'Plumbers'];
  const WARDS = ['All Wards', 'Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6', 'Ward 7', 'Ward 8', 'Ward 9', 'Ward 10', 'Ward 11'];

  const getWardLabel = (w: string) => {
    if (w === 'All Wards') return t.allWards;
    if (language === 'ne') return w.replace('Ward ', 'वडा ');
    return w;
  };

  const DIRECTORY_DATA = [
    { id: 'e1', name: 'Nepal Police - Simraungadh', category: 'Emergency', phone: '100', details: 'Emergency Police Station (प्रहरी हेल्पलाइन)', icon: ShieldAlert, ward: 'All', address: 'Simraungadh Police Station', hours: '24/7' },
    { id: 'e2', name: 'Simraungadh Ambulance Service', category: 'Emergency', phone: '102', details: 'Emergency Medical Transport (एम्बुलेन्स सेवा)', icon: AlertTriangle, ward: 'All', address: 'City Hospital', hours: '24/7' },
    { id: 'e3', name: 'Fire Brigade (दमकल सेवा)', category: 'Emergency', phone: '101', details: 'Municipal Fire & Disaster Relief', icon: ShieldAlert, ward: 'All', address: 'Simraungadh Fire Control', hours: '24/7' },
    { id: '1', name: 'Kishori Prasad Kalawar', category: 'Administration', phone: '053-411072', details: language === 'ne' ? 'नगर प्रमुख (Mayor)' : 'Mayor (नगर प्रमुख)', icon: Star, ward: 'All', address: 'Municipality Office', hours: 'Sun-Fri, 10 AM - 5 PM' },
    { id: '2', name: 'Najmu Sehar', category: 'Administration', phone: '053-411072', details: language === 'ne' ? 'उप-प्रमुख (Deputy Mayor)' : 'Deputy Mayor (उप-प्रमुख)', icon: Star, ward: 'All', address: 'Municipality Office', hours: 'Sun-Fri, 10 AM - 5 PM' },
    { id: 'w1', name: 'Ward 1 Secretariat (वडा १ कार्यालय)', category: 'Ward Members', phone: '9840000001', details: language === 'ne' ? 'वडा १ अध्यक्ष एवं सचिव' : 'Ward 1 Chairman & Secretary', icon: UserCheck, ward: 1, address: 'Kankali Chowk, Ward 1', hours: 'Sun-Fri, 10 AM - 5 PM' },
    { id: 'w2', name: 'Ward 2 Secretariat (वडा २ कार्यालय)', category: 'Ward Members', phone: '9840000002', details: language === 'ne' ? 'वडा २ अध्यक्ष एवं सचिव' : 'Ward 2 Chairman & Secretary', icon: UserCheck, ward: 2, address: 'Bhagwanpur, Ward 2', hours: 'Sun-Fri, 10 AM - 5 PM' },
    { id: 'w3', name: 'Ward 3 Secretariat (वडा ३ कार्यालय)', category: 'Ward Members', phone: '9840000003', details: language === 'ne' ? 'वडा ३ अध्यक्ष एवं सचिव' : 'Ward 3 Chairman & Secretary', icon: UserCheck, ward: 3, address: 'Nayanpur, Ward 3', hours: 'Sun-Fri, 10 AM - 5 PM' },
    { id: 'w4', name: 'Ward 4 Secretariat (वडा ४ कार्यालय)', category: 'Ward Members', phone: '9840000004', details: language === 'ne' ? 'वडा ४ अध्यक्ष एवं सचिव' : 'Ward 4 Chairman & Secretary', icon: UserCheck, ward: 4, address: 'Hariharpur, Ward 4', hours: 'Sun-Fri, 10 AM - 5 PM' },
    { id: 'w5', name: 'Ward 5 Secretariat (वडा ५ कार्यालय)', category: 'Ward Members', phone: '9840000005', details: language === 'ne' ? 'वडा ५ अध्यक्ष एवं सचिव' : 'Ward 5 Chairman & Secretary', icon: UserCheck, ward: 5, address: 'Ward 5 Secretariat', hours: 'Sun-Fri, 10 AM - 5 PM' },
    { id: 'w6', name: 'Ward 6 Secretariat (वडा ६ कार्यालय)', category: 'Ward Members', phone: '9840000006', details: language === 'ne' ? 'वडा ६ अध्यक्ष एवं सचिव' : 'Ward 6 Chairman & Secretary', icon: UserCheck, ward: 6, address: 'Ward 6 Secretariat', hours: 'Sun-Fri, 10 AM - 5 PM' },
    { id: 'w7', name: 'Ward 7 Secretariat (वडा ७ कार्यालय)', category: 'Ward Members', phone: '9840000007', details: language === 'ne' ? 'वडा ७ अध्यक्ष एवं सचिव' : 'Ward 7 Chairman & Secretary', icon: UserCheck, ward: 7, address: 'Ward 7 Secretariat', hours: 'Sun-Fri, 10 AM - 5 PM' },
    { id: 'w8', name: 'Ward 8 Secretariat (वडा ८ कार्यालय)', category: 'Ward Members', phone: '9840000008', details: language === 'ne' ? 'वडा ८ अध्यक्ष एवं सचिव' : 'Ward 8 Chairman & Secretary', icon: UserCheck, ward: 8, address: 'Ward 8 Secretariat', hours: 'Sun-Fri, 10 AM - 5 PM' },
    { id: 'w9', name: 'Ward 9 Secretariat (वडा ९ कार्यालय)', category: 'Ward Members', phone: '9840000009', details: language === 'ne' ? 'वडा ९ अध्यक्ष एवं सचिव' : 'Ward 9 Chairman & Secretary', icon: UserCheck, ward: 9, address: 'Ward 9 Secretariat', hours: 'Sun-Fri, 10 AM - 5 PM' },
    { id: 'w10', name: 'Ward 10 Secretariat (वडा १० कार्यालय)', category: 'Ward Members', phone: '9840000010', details: language === 'ne' ? 'वडा १० अध्यक्ष एवं सचिव' : 'Ward 10 Chairman & Secretary', icon: UserCheck, ward: 10, address: 'Ward 10 Secretariat', hours: 'Sun-Fri, 10 AM - 5 PM' },
    { id: 'w11', name: 'Ward 11 Secretariat (वडा ११ कार्यालय)', category: 'Ward Members', phone: '9840000011', details: language === 'ne' ? 'वडा ११ अध्यक्ष एवं सचिव' : 'Ward 11 Chairman & Secretary', icon: UserCheck, ward: 11, address: 'Ward 11 Secretariat', hours: 'Sun-Fri, 10 AM - 5 PM' },
    { id: 'h1', name: 'Simraungadh Primary Hospital', category: 'Hospitals', phone: '053-411075', details: language === 'ne' ? 'आपतकालीन सेवा २४/७' : 'Emergency 24/7 Medical Care', icon: Activity, ward: 'All', address: 'Main Hospital Road', hours: '24/7' },
    { id: 'h2', name: 'Kankali Medical & Pharmacy', category: 'Hospitals', phone: '9840000012', details: language === 'ne' ? 'औषधि र विशेषज्ञ परामर्श' : 'Pharmacy & Specialist Clinic', icon: Crosshair, ward: 2, address: 'Near Kankali Temple', hours: '6 AM - 10 PM' },
    { id: 'ag1', name: 'Simraungadh Agricultural Service Center', category: 'Administration', phone: '053-411080', details: language === 'ne' ? 'कृषि परामर्श र मल वितरण' : 'Farming Support & Fertilizer', icon: Star, ward: 'All', address: 'Agri Center, Simraungadh', hours: 'Sun-Fri, 10 AM - 4 PM' },
    { id: 'p1', name: 'Raju Plumbing & Sanitation', category: 'Plumbers', phone: '9840000013', details: language === 'ne' ? 'खानेपानी मर्मत' : 'Sanitation & pipe repair', icon: Wrench, ward: 1, address: 'Kankali Chowk', hours: 'On Call' },
    { id: 'el1', name: 'Bishnu Electrician & Solar', category: 'Electricians', phone: '9840000014', details: language === 'ne' ? 'विद्युत् मर्मत' : 'Power & Wiring Expert', icon: Zap, ward: 7, address: 'Ward 7 Center', hours: 'On Call' },
    { id: 'm1', name: 'Shiva Auto & Tractor Works', category: 'Mechanics', phone: '9840000015', details: language === 'ne' ? 'सवारी मर्मत' : 'Vehicle & Tractor Repair', icon: Wrench, ward: 3, address: 'Main Highway', hours: '8 AM - 6 PM' },
  ];

  const filteredData = useMemo(() => {
    return DIRECTORY_DATA.filter(item => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;

      let matchesWard = true;
      if (activeWard !== 'All Wards') {
        const wardNum = parseInt(activeWard.replace('Ward ', ''));
        matchesWard = item.ward === 'All' || item.ward === wardNum;
      }

      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.details.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch && matchesWard;
    });
  }, [activeCategory, activeWard, searchQuery]);

  const handleCall = (phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${phone}`);
  };

  const toggleExpand = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleShare = async (contact: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: `${contact.name}\n${contact.details}\n📞 ${contact.phone}\n📍 ${contact.address}\n\nShared via Simraungadh App`
      });
    } catch (e) {
      console.log(e);
    }
  };

  const handleMap = (contact: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const query = contact.ward === 'All' ? `Simraungadh, Nepal` : `Simraungadh Ward ${contact.ward}, Nepal`;
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`
    });
    Linking.openURL(url!);
  };

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      {/* Header */}
      <View className={`px-5 pt-3.5 pb-3.5 border-b ${theme.headerBgClass}`}>
        <Text className={`text-[22px] font-black tracking-tight ${theme.textClass}`}>{t.directoryTitle}</Text>
        <Text className={`text-[12px] font-medium mt-0.5 ${theme.textMutedClass}`}>{t.directorySubhead}</Text>

        {/* Search */}
        <View className={`mt-3 flex-row items-center rounded-xl px-3.5 py-2.5 border ${theme.inputClass}`}>
          <Search size={16} color={theme.iconColor} />
          <TextInput
            className={`flex-1 ml-2.5 text-[14px] font-medium ${theme.textClass}`}
            placeholder={t.searchContacts}
            placeholderTextColor={theme.inputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filters */}
      <View className={`border-b py-2.5 ${theme.headerBgClass}`}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-2.5" contentContainerStyle={{ paddingRight: 32 }}>
          {WARDS.map(ward => {
            const isSelected = activeWard === ward;
            return (
              <TouchableOpacity
                key={ward}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveWard(ward);
                }}
                activeOpacity={0.7}
                className={`px-3.5 py-1.5 rounded-lg mr-1.5 border ${isSelected ? (theme.isDark ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-indigo-600 border-indigo-600') : 'bg-transparent border-transparent'
                  }`}
              >
                <Text className={`text-[11px] font-bold ${isSelected ? (theme.isDark ? 'text-indigo-300' : 'text-white') : theme.textSecondaryClass}`}>
                  {getWardLabel(ward)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4" contentContainerStyle={{ paddingRight: 32 }}>
          {DIRECTORY_CATEGORIES.map(cat => {
            const isSelected = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveCategory(cat);
                }}
                activeOpacity={0.7}
                className={`px-3.5 py-1.5 rounded-full mr-2 border ${isSelected
                    ? (theme.isDark ? 'bg-blue-500/20 border-blue-500/50' : 'bg-blue-50 border-blue-500')
                    : (theme.glassCardClass)
                  }`}
                style={isSelected ? theme.glowShadow('#2563eb') : {}}
              >
                <Text className={`text-[12px] font-extrabold ${isSelected ? (theme.isDark ? 'text-blue-300' : 'text-blue-700') : theme.textSecondaryClass
                  }`}>
                  {CATEGORY_NAMES[cat] || cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <View style={{ flex: 1 }}>
        <FlashList
          data={filteredData}
          keyExtractor={(item) => item.id}
          estimatedItemSize={76}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 px-6">
              <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-3 ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                <Search size={28} color={theme.iconColor} />
              </View>
              <Text className={`font-bold text-lg mb-1 ${theme.textClass}`}>No contacts found</Text>
              <Text className={`text-center text-[13px] ${theme.textSecondaryClass}`}>Try searching for something else.</Text>
            </View>
          }


          renderItem={({ item: contact }) => {
            const IconComp = contact.icon;
            const isExpanded = expandedId === contact.id;
            const isEmergency = contact.category === 'Emergency';

            return (
              <TouchableOpacity
                key={contact.id}
                activeOpacity={0.8}
                onPress={() => toggleExpand(contact.id)}
                className={`rounded-2xl p-4 mb-2.5 border ${theme.glassCardClass}`}
                style={isExpanded ? theme.glowShadow(isEmergency ? '#ef4444' : '#2563eb') : theme.cardShadow}
              >
                <View className="flex-row items-center">
                  <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${isEmergency ? 'bg-red-500/10' : (theme.isDark ? 'bg-blue-500/12' : 'bg-blue-50')}`}>
                    <IconComp size={20} color={isEmergency ? (theme.isDark ? '#f87171' : '#ef4444') : (theme.isDark ? '#60a5fa' : '#2563eb')} />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-semibold text-[14px] ${theme.textClass}`}>{contact.name}</Text>
                    <Text className={`font-medium text-[12px] mt-0.5 ${theme.textSecondaryClass}`}>{contact.details}</Text>
                    <View className="flex-row items-center mt-0.5">
                      <MapPin size={10} color={theme.iconColor} />
                      <Text className={`text-[11px] ml-1 font-medium ${theme.textMutedClass}`}>
                        {contact.ward === 'All' ? 'All Wards' : `Ward ${contact.ward}`}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleCall(contact.phone)} className={`w-9 h-9 rounded-full items-center justify-center ${theme.isDark ? 'bg-emerald-500/12' : 'bg-emerald-50'}`}>
                    <PhoneCall size={16} color={theme.isDark ? '#34d399' : '#059669'} />
                  </TouchableOpacity>
                </View>

                {/* Expanded Action Drawer */}
                {isExpanded && (
                  <View className="mt-4 pt-3 border-t border-slate-200/20 dark:border-white/5">
                    <View className="flex-row items-center justify-between mb-3 px-1">
                      <Text className={`text-[11.5px] font-medium ${theme.textMutedClass}`}>
                        <Text className={`font-bold ${theme.textSecondaryClass}`}>Address:</Text> {contact.address}
                      </Text>
                      {contact.hours && (
                        <Text className={`text-[11.5px] font-medium ${theme.textMutedClass}`}>
                          <Text className={`font-bold ${theme.textSecondaryClass}`}>Hours:</Text> {contact.hours}
                        </Text>
                      )}
                    </View>

                    <View className="flex-row gap-2">
                      <TouchableOpacity onPress={() => handleCall(contact.phone)} activeOpacity={0.7} className="flex-1 bg-emerald-500/10 py-2.5 rounded-xl flex-row items-center justify-center border border-emerald-500/20">
                        <PhoneCall size={14} color={theme.isDark ? '#34d399' : '#059669'} />
                        <Text className={`font-bold text-[13px] ml-1.5 ${theme.isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Call Now</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => handleShare(contact)} activeOpacity={0.7} className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center border ${theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                        <Share2 size={14} color={theme.textClass} />
                        <Text className={`font-bold text-[13px] ml-1.5 ${theme.textClass}`}>Share</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => handleMap(contact)} activeOpacity={0.7} className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center border ${theme.isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                        <Navigation size={14} color={theme.isDark ? '#60a5fa' : '#2563eb'} />
                        <Text className={`font-bold text-[13px] ml-1.5 ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`}>Locate</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}
