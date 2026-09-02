// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Platform } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Search, X, User, Megaphone, AlertCircle, Phone, Shield, ChevronRight, Clock, TrendingUp, Users, UserPlus, UserCheck, Flame, Sparkles, PhoneCall, Building2, Activity, ShieldAlert, Crosshair, Wrench, Zap, Star } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { Profile, Issue, Notice } from '../../lib/types';
import { useTheme } from '../../hooks/use-theme';
import { useAuthStore } from '../../store/authStore';
import { useLangStore } from '../../store/langStore';
import { translations } from '../../lib/translations';
import { UserBadges } from '../../components/UserBadges';

const TABS = ['All', 'People', 'Reports', 'Notices', 'Directory'];

const DIRECTORY_DATA = [
  { id: 'e1', name: 'Nepal Police - Simraungadh', category: 'Emergency', phone: '100', details: 'Emergency Police Station (प्रहरी हेल्पलाइन)', icon: ShieldAlert, ward: 'All', address: 'Simraungadh Police Station', hours: '24/7' },
  { id: 'e2', name: 'Simraungadh Ambulance Service', category: 'Emergency', phone: '102', details: 'Emergency Medical Transport (एम्बुलेन्स सेवा)', icon: AlertCircle, ward: 'All', address: 'City Hospital', hours: '24/7' },
  { id: 'e3', name: 'Fire Brigade (दमकल सेवा)', category: 'Emergency', phone: '101', details: 'Municipal Fire & Disaster Relief', icon: ShieldAlert, ward: 'All', address: 'Simraungadh Fire Control', hours: '24/7' },
  { id: '1', name: 'Kishori Prasad Kalawar', category: 'Administration', phone: '053-411072', details: 'Mayor (नगर प्रमुख)', icon: Star, ward: 'All', address: 'Municipality Office', hours: 'Sun-Fri, 10 AM - 5 PM' },
  { id: '2', name: 'Najmu Sehar', category: 'Administration', phone: '053-411072', details: 'Deputy Mayor (उप-प्रमुख)', icon: Star, ward: 'All', address: 'Municipality Office', hours: 'Sun-Fri, 10 AM - 5 PM' },
  { id: 'w1', name: 'Ward 1 Secretariat (वडा १ कार्यालय)', category: 'Ward Members', phone: '9840000001', details: 'Ward 1 Chairman & Secretary', icon: UserCheck, ward: 'Ward 1', address: 'Kankali Chowk, Ward 1', hours: 'Sun-Fri, 10 AM - 5 PM' },
  { id: 'w2', name: 'Ward 2 Secretariat (वडा २ कार्यालय)', category: 'Ward Members', phone: '9840000002', details: 'Ward 2 Chairman & Secretary', icon: UserCheck, ward: 'Ward 2', address: 'Bhagwanpur, Ward 2', hours: 'Sun-Fri, 10 AM - 5 PM' },
  { id: 'w3', name: 'Ward 3 Secretariat (वडा ३ कार्यालय)', category: 'Ward Members', phone: '9840000003', details: 'Ward 3 Chairman & Secretary', icon: UserCheck, ward: 'Ward 3', address: 'Nayanpur, Ward 3', hours: 'Sun-Fri, 10 AM - 5 PM' },
  { id: 'w4', name: 'Ward 4 Secretariat (वडा ४ कार्यालय)', category: 'Ward Members', phone: '9840000004', details: 'Ward 4 Chairman & Secretary', icon: UserCheck, ward: 'Ward 4', address: 'Hariharpur, Ward 4', hours: 'Sun-Fri, 10 AM - 5 PM' },
  { id: 'w5', name: 'Ward 5 Secretariat (वडा ५ कार्यालय)', category: 'Ward Members', phone: '9840000005', details: 'Ward 5 Chairman & Secretary', icon: UserCheck, ward: 'Ward 5', address: 'Ward 5 Secretariat', hours: 'Sun-Fri, 10 AM - 5 PM' },
  { id: 'w6', name: 'Ward 6 Secretariat (वडा ६ कार्यालय)', category: 'Ward Members', phone: '9840000006', details: 'Ward 6 Chairman & Secretary', icon: UserCheck, ward: 'Ward 6', address: 'Ward 6 Secretariat', hours: 'Sun-Fri, 10 AM - 5 PM' },
  { id: 'w7', name: 'Ward 7 Secretariat (वडा ७ कार्यालय)', category: 'Ward Members', phone: '9840000007', details: 'Ward 7 Chairman & Secretary', icon: UserCheck, ward: 'Ward 7', address: 'Ward 7 Secretariat', hours: 'Sun-Fri, 10 AM - 5 PM' },
  { id: 'w8', name: 'Ward 8 Secretariat (वडा ८ कार्यालय)', category: 'Ward Members', phone: '9840000008', details: 'Ward 8 Chairman & Secretary', icon: UserCheck, ward: 'Ward 8', address: 'Ward 8 Secretariat', hours: 'Sun-Fri, 10 AM - 5 PM' },
  { id: 'w9', name: 'Ward 9 Secretariat (वडा ९ कार्यालय)', category: 'Ward Members', phone: '9840000009', details: 'Ward 9 Chairman & Secretary', icon: UserCheck, ward: 'Ward 9', address: 'Ward 9 Secretariat', hours: 'Sun-Fri, 10 AM - 5 PM' },
  { id: 'w10', name: 'Ward 10 Secretariat (वडा १० कार्यालय)', category: 'Ward Members', phone: '9840000010', details: 'Ward 10 Chairman & Secretary', icon: UserCheck, ward: 'Ward 10', address: 'Ward 10 Secretariat', hours: 'Sun-Fri, 10 AM - 5 PM' },
  { id: 'w11', name: 'Ward 11 Secretariat (वडा ११ कार्यालय)', category: 'Ward Members', phone: '9840000011', details: 'Ward 11 Chairman & Secretary', icon: UserCheck, ward: 'Ward 11', address: 'Ward 11 Secretariat', hours: 'Sun-Fri, 10 AM - 5 PM' },
  { id: 'h1', name: 'Simraungadh Primary Hospital', category: 'Hospitals', phone: '053-411075', details: 'Emergency 24/7 Medical Care', icon: Activity, ward: 'All', address: 'Main Hospital Road', hours: '24/7' },
  { id: 'h2', name: 'Kankali Medical & Pharmacy', category: 'Hospitals', phone: '9840000012', details: 'Pharmacy & Specialist Clinic', icon: Crosshair, ward: 'Ward 2', address: 'Near Kankali Temple', hours: '6 AM - 10 PM' },
  { id: 'ag1', name: 'Simraungadh Agricultural Center', category: 'Administration', phone: '053-411080', details: 'Farming Support & Fertilizer', icon: Star, ward: 'All', address: 'Agri Center, Simraungadh', hours: 'Sun-Fri, 10 AM - 4 PM' },
  { id: 'p1', name: 'Raju Plumbing & Sanitation', category: 'Directory', phone: '9840000013', details: 'Sanitation & pipe repair', icon: Wrench, ward: 'Ward 1', address: 'Kankali Chowk', hours: 'On Call' },
  { id: 'el1', name: 'Bishnu Electrician & Solar', category: 'Directory', phone: '9840000014', details: 'Power & Wiring Expert', icon: Zap, ward: 'Ward 7', address: 'Ward 7 Center', hours: 'On Call' },
  { id: 'm1', name: 'Shiva Auto & Tractor Works', category: 'Directory', phone: '9840000015', details: 'Vehicle & Tractor Repair', icon: Wrench, ward: 'Ward 3', address: 'Main Highway', hours: '8 AM - 6 PM' },
];

export default function TabSearchScreen() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(false);

  const [people, setPeople] = useState<Profile[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [directoryItems, setDirectoryItems] = useState<typeof DIRECTORY_DATA>([]);
  const [suggestedPeople, setSuggestedPeople] = useState<Profile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const TRENDING = ['Ward Chairman', 'Water Supply', 'Road Repair', 'Mayor', 'Electricity', 'Kankali Temple', 'Hospital'];

  const router = useRouter();
  const theme = useTheme();
  const { profile } = useAuthStore();
  const { language } = useLangStore();
  const t = translations[language] || translations.en;

  useEffect(() => {
    const loadHistoryAndSuggestions = async () => {
      try {
        const history = await AsyncStorage.getItem('@search_history');
        if (history) setRecentSearches(JSON.parse(history));

        // Fetch suggested active citizens / officials to follow
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role, badges, is_verified, home_ward, department')
          .neq('id', profile?.id || '00000000-0000-0000-0000-000000000000')
          .limit(8);

        if (usersData) setSuggestedPeople(usersData);

        if (profile) {
          const { data: follows } = await supabase
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', profile.id);
          if (follows) {
            setFollowingIds(new Set(follows.map(f => f.following_id)));
          }
        }
      } catch (e) {}
    };
    loadHistoryAndSuggestions();
  }, [profile]);

  const saveHistory = async (history: string[]) => {
    try {
      await AsyncStorage.setItem('@search_history', JSON.stringify(history));
    } catch (e) {}
  };

  const handleFollowToggle = async (targetId: string) => {
    if (!profile) {
      router.push('/login');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isCurrentlyFollowing = followingIds.has(targetId);

    setFollowingIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyFollowing) next.delete(targetId);
      else next.add(targetId);
      return next;
    });

    try {
      if (isCurrentlyFollowing) {
        await supabase.from('user_follows').delete().eq('follower_id', profile.id).eq('following_id', targetId);
      } else {
        await supabase.from('user_follows').insert({ follower_id: profile.id, following_id: targetId });
      }
    } catch (e) {
      console.error('Follow toggle error', e);
    }
  };

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);
    const trimmed = text.trim();
    if (!trimmed) {
      setPeople([]);
      setIssues([]);
      setNotices([]);
      setDirectoryItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const searchTerm = `%${trimmed}%`;
    const lowerTrimmed = trimmed.toLowerCase();

    try {
      // 1. Search Directory Items locally
      const filteredDirectory = DIRECTORY_DATA.filter(item => 
        item.name.toLowerCase().includes(lowerTrimmed) ||
        item.details.toLowerCase().includes(lowerTrimmed) ||
        item.category.toLowerCase().includes(lowerTrimmed) ||
        (item.ward && item.ward.toLowerCase().includes(lowerTrimmed)) ||
        (item.address && item.address.toLowerCase().includes(lowerTrimmed)) ||
        item.phone.includes(trimmed)
      );

      // 2. Search People / Profiles
      let peopleData: Profile[] = [];
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role, badges, is_verified, home_ward, department, phone_number')
          .ilike('full_name', searchTerm)
          .limit(15);
        if (!error && data) {
          peopleData = data;
        }
      } catch (err) {
        console.error('People search error:', err);
      }

      // 3. Search Issues / Civic Reports
      let issuesData: Issue[] = [];
      try {
        const { data, error } = await supabase
          .from('issues')
          .select('id, title, description, category, status, ward_number, created_at')
          .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm}`)
          .limit(15);
        if (!error && data) {
          issuesData = data;
        }
      } catch (err) {
        console.error('Issues search error:', err);
      }

      // 4. Search Official Notices
      let noticesData: Notice[] = [];
      try {
        const { data, error } = await supabase
          .from('notices')
          .select('*')
          .or(`title.ilike.${searchTerm},content.ilike.${searchTerm},category.ilike.${searchTerm}`)
          .limit(15);
        if (!error && data) {
          noticesData = data;
        }
      } catch (err) {
        console.error('Notices search error:', err);
      }

      setQuery((currentQuery) => {
        if (currentQuery === text) {
          setPeople(peopleData || []);
          setIssues(issuesData || []);
          setNotices(noticesData || []);
          setDirectoryItems(filteredDirectory || []);
          setLoading(false);
        }
        return currentQuery;
      });
    } catch (e) {
      console.error('Global search error:', e);
      setLoading(false);
    }
  }, []);

  const executeSearch = (searchTerm: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleSearch(searchTerm);
    if (searchTerm.trim() && !recentSearches.includes(searchTerm.trim())) {
      const newHistory = [searchTerm.trim(), ...recentSearches.slice(0, 9)];
      setRecentSearches(newHistory);
      saveHistory(newHistory);
    }
  };

  const clearHistory = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecentSearches([]);
    await AsyncStorage.removeItem('@search_history');
  };

  const getTabResults = () => {
    let count = 0;
    if (activeTab === 'All' || activeTab === 'People') count += people.length;
    if (activeTab === 'All' || activeTab === 'Reports') count += issues.length;
    if (activeTab === 'All' || activeTab === 'Notices') count += notices.length;
    if (activeTab === 'All' || activeTab === 'Directory') count += directoryItems.length;
    return count;
  };

  const currentTabResults = getTabResults();

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      {/* Search Header Bar */}
      <View className="px-5 pt-3 pb-2 z-10">
        <View className="flex-row items-center justify-between mb-3">
          <Text className={`font-black text-[28px] tracking-tight ${theme.textClass}`}>
            Search
          </Text>
        </View>

        <View className={`flex-row items-center rounded-2xl px-4 py-3 border ${theme.isDark ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200/60'}`}>
          <Search size={18} color={theme.iconColor} strokeWidth={2.2} />
          <TextInput
            className={`flex-1 ml-3 text-[15px] font-medium ${theme.textClass}`}
            placeholder="Search citizens, reports, notices, contacts..."
            placeholderTextColor={theme.inputPlaceholder}
            value={query}
            onChangeText={handleSearch}
            onSubmitEditing={() => executeSearch(query)}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} className="p-1">
              <X size={16} color={theme.iconColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter Chips */}
        {query.trim().length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ paddingRight: 10 }}>
            {TABS.map(tab => {
              const isSelected = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab(tab);
                  }}
                  activeOpacity={0.8}
                  className={`px-4 py-2 mr-2 rounded-full border ${
                    isSelected ? theme.pillActiveClass : theme.pillInactiveClass
                  }`}
                >
                  <Text className={`font-bold text-[13px] ${isSelected ? 'text-white' : theme.textSecondaryClass}`}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Main Content Area */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 18, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {loading && (
          <View className="py-12 items-center">
            <ActivityIndicator size="small" color={theme.accentColor} />
            <Text className={`text-[13px] font-medium mt-3 ${theme.textMutedClass}`}>Searching Simraungadh...</Text>
          </View>
        )}

        {/* Suggested People & Trending when Query is Empty */}
        {!loading && query.trim().length === 0 && (
          <View>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Clock size={14} color={theme.iconColor} />
                    <Text className={`font-bold text-[12px] uppercase tracking-wider ml-1.5 ${theme.textMutedClass}`}>Recent Searches</Text>
                  </View>
                  <TouchableOpacity onPress={clearHistory}>
                    <Text className={`font-bold text-[12px] ${theme.isDark ? 'text-primary-400' : 'text-primary'}`}>Clear</Text>
                  </TouchableOpacity>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  {recentSearches.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => executeSearch(item)}
                      className={`px-3.5 py-2 rounded-2xl flex-row items-center border ${theme.isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200/60'}`}
                    >
                      <Search size={11} color={theme.iconColor} />
                      <Text className={`text-[12.5px] font-bold ml-1.5 ${theme.textClass}`}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Trending Topics */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <TrendingUp size={14} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
                <Text className={`font-bold text-[12px] uppercase tracking-wider ml-1.5 ${theme.isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                  Trending in Simraungadh
                </Text>
              </View>

              <View className="flex-row flex-wrap gap-2">
                {TRENDING.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => executeSearch(item)}
                    className={`px-3.5 py-2 rounded-2xl flex-row items-center border ${theme.isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50/70 border-indigo-100'}`}
                  >
                    <Flame size={12} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
                    <Text className={`text-[12.5px] font-bold ml-1.5 ${theme.isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Suggested Citizens / Officials to Follow */}
            {suggestedPeople.length > 0 && (
              <View>
                <View className="flex-row items-center mb-3">
                  <Users size={14} color={theme.iconColor} />
                  <Text className={`font-bold text-[12px] uppercase tracking-wider ml-1.5 ${theme.textMutedClass}`}>
                    Citizens & Officials to follow
                  </Text>
                </View>

                {suggestedPeople.map(person => {
                  const isFollowing = followingIds.has(person.id);
                  return (
                    <View
                      key={person.id}
                      className={`p-3.5 mb-2.5 rounded-2xl border flex-row items-center justify-between ${
                        theme.isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200/60'
                      }`}
                    >
                      <TouchableOpacity
                        onPress={() => router.push(`/user/${person.id}`)}
                        activeOpacity={0.7}
                        className="flex-row items-center flex-1 mr-3"
                      >
                        {person.avatar_url ? (
                          <Image source={{ uri: person.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                        ) : (
                          <View className={`w-10 h-10 rounded-full items-center justify-center ${theme.isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                            <User size={18} color={theme.accentColor} />
                          </View>
                        )}
                        <View className="ml-3 flex-1">
                          <View className="flex-row items-center">
                            <Text className={`font-bold text-[14px] ${theme.textClass}`}>{person.full_name || 'Citizen'}</Text>
                            {person.is_verified && (
                              <View className="ml-1">
                                <UserBadges badges={person.badges || ['verified']} size={13} />
                              </View>
                            )}
                          </View>
                          <Text className={`text-[12px] font-medium mt-0.5 ${theme.textMutedClass}`} numberOfLines={1}>
                            {person.role === 'admin' || person.role === 'official' ? (person.department ? `${person.department} Official` : 'Municipality Official') : person.home_ward ? `Ward ${person.home_ward} Resident` : 'Citizen'}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleFollowToggle(person.id)}
                        activeOpacity={0.8}
                        className={`px-4 py-1.5 rounded-xl border ${
                          isFollowing
                            ? theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
                            : theme.isDark ? 'bg-white border-white' : 'bg-slate-900 border-slate-900'
                        }`}
                      >
                        <Text className={`text-[12px] font-bold ${
                          isFollowing
                            ? theme.textClass
                            : theme.isDark ? 'text-slate-900' : 'text-white'
                        }`}>
                          {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Search Results */}
        {!loading && query.trim().length > 0 && (
          <View>
            {currentTabResults === 0 ? (
              <View className="py-16 items-center px-6">
                <View className={`w-16 h-16 rounded-[24px] items-center justify-center mb-3 ${theme.isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                  <Search size={24} color={theme.iconColor} />
                </View>
                <Text className={`font-bold text-base mb-1 ${theme.textClass}`}>No results found</Text>
                <Text className={`text-center text-[13px] ${theme.textMutedClass}`}>We couldn&apos;t find anything matching &quot;{query}&quot;</Text>
              </View>
            ) : (
              <>
                {/* 1. PEOPLE / CITIZENS & OFFICIALS */}
                {(activeTab === 'All' || activeTab === 'People') && people.length > 0 && (
                  <View className="mb-5">
                    <Text className={`font-bold text-[12px] uppercase tracking-wider mb-2.5 ${theme.isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                      Citizens & Officials ({people.length})
                    </Text>
                    {people.map(p => {
                      const isFollowing = followingIds.has(p.id);
                      return (
                        <View
                          key={p.id}
                          className={`p-3.5 mb-2 rounded-2xl border flex-row items-center justify-between ${
                            theme.isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200/60'
                          }`}
                        >
                          <TouchableOpacity
                            onPress={() => router.push(`/user/${p.id}`)}
                            activeOpacity={0.7}
                            className="flex-row items-center flex-1 mr-3"
                          >
                            {p.avatar_url ? (
                              <Image source={{ uri: p.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                            ) : (
                              <View className={`w-10 h-10 rounded-full items-center justify-center ${theme.isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                                <User size={18} color={theme.accentColor} />
                              </View>
                            )}
                            <View className="ml-3 flex-1">
                              <View className="flex-row items-center">
                                <Text className={`font-bold text-[14px] ${theme.textClass}`}>{p.full_name || 'Citizen'}</Text>
                                {p.is_verified && (
                                  <View className="ml-1">
                                    <UserBadges badges={p.badges || ['verified']} size={13} />
                                  </View>
                                )}
                              </View>
                              <Text className={`text-[12px] font-medium mt-0.5 ${theme.textMutedClass}`}>
                                {p.role === 'admin' || p.role === 'official' ? (p.department ? `${p.department} Official` : 'Municipality Official') : p.home_ward ? `Ward ${p.home_ward} Resident` : 'Citizen'}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          {profile && profile.id !== p.id && (
                            <TouchableOpacity
                              onPress={() => handleFollowToggle(p.id)}
                              activeOpacity={0.8}
                              className={`px-3.5 py-1.5 rounded-xl border ${
                                isFollowing
                                  ? theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
                                  : theme.isDark ? 'bg-white border-white' : 'bg-slate-900 border-slate-900'
                              }`}
                            >
                              <Text className={`text-[12px] font-bold ${
                                isFollowing
                                  ? theme.textClass
                                  : theme.isDark ? 'text-slate-900' : 'text-white'
                              }`}>
                                {isFollowing ? 'Following' : 'Follow'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* 2. DIRECTORY & CONTACTS */}
                {(activeTab === 'All' || activeTab === 'Directory') && directoryItems.length > 0 && (
                  <View className="mb-5">
                    <Text className={`font-bold text-[12px] uppercase tracking-wider mb-2.5 ${theme.isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      Directory & Emergency Contacts ({directoryItems.length})
                    </Text>
                    {directoryItems.map(item => (
                      <View
                        key={item.id}
                        className={`p-3.5 mb-2 rounded-2xl border flex-row items-center justify-between ${
                          theme.isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200/60'
                        }`}
                      >
                        <View className="flex-1 mr-3">
                          <View className="flex-row items-center">
                            <Text className={`font-bold text-[14px] ${theme.textClass}`}>{item.name}</Text>
                            {item.ward && (
                              <View className="ml-2 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10">
                                <Text className={`text-[10px] font-bold ${theme.textSecondaryClass}`}>{item.ward}</Text>
                              </View>
                            )}
                          </View>
                          <Text className={`text-[12px] font-medium mt-0.5 ${theme.textSecondaryClass}`} numberOfLines={1}>
                            {item.details}
                          </Text>
                          <Text className={`text-[11px] font-bold mt-1 text-primary`}>
                            {item.phone} · {item.hours}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => Linking.openURL(`tel:${item.phone}`)}
                          className="w-10 h-10 rounded-full bg-emerald-500 items-center justify-center shadow-sm"
                          activeOpacity={0.8}
                        >
                          <PhoneCall size={16} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* 3. CIVIC REPORTS */}
                {(activeTab === 'All' || activeTab === 'Reports') && issues.length > 0 && (
                  <View className="mb-5">
                    <Text className={`font-bold text-[12px] uppercase tracking-wider mb-2.5 ${theme.isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                      Civic Reports ({issues.length})
                    </Text>
                    {issues.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => router.push(`/issue/${item.id}`)}
                        className={`p-3.5 mb-2 rounded-2xl border ${
                          theme.isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200/60'
                        }`}
                      >
                        <Text className={`font-bold text-[14px] ${theme.textClass}`}>{item.title}</Text>
                        <Text className={`text-[12.5px] font-medium mt-1 leading-relaxed ${theme.textSecondaryClass}`} numberOfLines={2}>{item.description}</Text>
                        <View className="flex-row items-center justify-between mt-2.5">
                          <Text className={`text-[11px] font-bold ${theme.isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                            {item.ward_number ? `Ward ${item.ward_number} · ` : ''}{item.category}
                          </Text>
                          <Text className={`text-[11px] font-bold ${theme.textMutedClass}`}>{item.status}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 4. OFFICIAL NOTICES */}
                {(activeTab === 'All' || activeTab === 'Notices') && notices.length > 0 && (
                  <View className="mb-5">
                    <Text className={`font-bold text-[12px] uppercase tracking-wider mb-2.5 ${theme.isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                      Notices & Circulars ({notices.length})
                    </Text>
                    {notices.map(n => (
                      <TouchableOpacity
                        key={n.id}
                        onPress={() => router.push('/notifications')}
                        className={`p-3.5 mb-2 rounded-2xl border ${
                          theme.isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200/60'
                        }`}
                      >
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className={`font-bold text-[14px] flex-1 ${theme.textClass}`}>{n.title}</Text>
                          {n.is_emergency && (
                            <View className="bg-rose-500/10 px-2 py-0.5 rounded-full ml-2">
                              <Text className="text-rose-500 text-[10px] font-bold">EMERGENCY</Text>
                            </View>
                          )}
                        </View>
                        <Text className={`text-[12.5px] font-medium ${theme.textSecondaryClass}`} numberOfLines={2}>{n.content}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
