// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, Linking } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Search, ArrowLeft, X, User, Megaphone, AlertCircle, Phone, Shield, ChevronRight, Clock, TrendingUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { Profile, Issue, Notice } from '../lib/types';
import { useTheme } from '../hooks/use-theme';
import Badge from '../components/Badge';
import AnimatedCard from '../components/AnimatedCard';

const TABS = ['All', 'People 👥', 'Reports 📑', 'Notices 📢', 'Directory 📞'];

export default function GlobalSearchScreen() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(false);

  const [people, setPeople] = useState<Profile[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const TRENDING = ['Ward Chairman', 'Water Supply', 'Road Repair', 'Mayor', 'Electricity'];

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await AsyncStorage.getItem('@search_history');
        if (history) setRecentSearches(JSON.parse(history));
      } catch (e) {}
    };
    loadHistory();
  }, []);

  const saveHistory = async (history: string[]) => {
    try {
      await AsyncStorage.setItem('@search_history', JSON.stringify(history));
    } catch (e) {}
  };

  const router = useRouter();
  const theme = useTheme();

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (!text.trim() || text.trim().length < 2) {
      setPeople([]);
      setIssues([]);
      setNotices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const searchTerm = `%${text.trim()}%`;

    try {
      // 1. Search People / Profiles
      const { data: peopleData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, department, ward_number')
        .or(`full_name.ilike.${searchTerm},department.ilike.${searchTerm},role.ilike.${searchTerm}`)
        .limit(10);

      // 2. Search Issues / Reports
      const { data: issuesData } = await supabase
        .from('issues')
        .select('id, title, description, category, status, author:profiles!issues_author_id_fkey(id, full_name, avatar_url, role, badges, is_verified)')
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm}`)
        .limit(10);

      // 3. Search Official Notices
      const { data: noticesData } = await supabase
        .from('notices')
        .select('*')
        .or(`title.ilike.${searchTerm},content.ilike.${searchTerm},category.ilike.${searchTerm}`)
        .limit(10);

      setPeople(peopleData || []);
      setIssues(issuesData || []);
      setNotices(noticesData || []);
    } catch (e) {
      console.error('Global search error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const executeSearch = (searchTerm: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleSearch(searchTerm);
    if (!recentSearches.includes(searchTerm)) {
      const newHistory = [searchTerm, ...recentSearches.slice(0, 9)];
      setRecentSearches(newHistory);
      saveHistory(newHistory);
    }
  };

  const clearHistory = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecentSearches([]);
    await AsyncStorage.removeItem('@search_history');
  };

  const totalResults = people.length + issues.length + notices.length;

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      {/* Search Header Bar */}
      <View className="px-4 pt-3 pb-3">
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}
          >
            <ArrowLeft size={20} color={theme.iconColor} />
          </TouchableOpacity>

          <View className={`flex-1 flex-row items-center rounded-[24px] px-4 py-3 border ${theme.inputClass}`}>
            <Search size={18} color={theme.iconColor} />
            <TextInput
              autoFocus
              className={`flex-1 ml-3 text-[15px] font-medium ${theme.textClass}`}
              placeholder="Search people, reports, notices..."
              placeholderTextColor={theme.inputPlaceholder}
              value={query}
              onChangeText={handleSearch}
              onSubmitEditing={() => executeSearch(query)}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')} className="p-1">
                <X size={16} color={theme.iconColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Tabs */}
        {query.trim().length >= 2 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4" contentContainerStyle={{ paddingRight: 20, gap: 10 }}>
            {TABS.map(tab => {
              const isSelected = activeTab === tab.split(' ')[0];
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab(tab.split(' ')[0]);
                  }}
                  activeOpacity={0.8}
                  style={[{
                    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24,
                    backgroundColor: isSelected ? theme.accentColor : (theme.isDark ? '#1c1c1e' : '#ffffff'),
                  }, isSelected ? theme.glowShadow(theme.accentColor) : theme.cardShadow]}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: isSelected ? '#fff' : (theme.isDark ? '#ebebf5' : '#1c1c1e') }}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Main Content Area */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {loading && (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color={theme.accentColor} />
            <Text className={`text-[13px] font-medium mt-3 ${theme.textMutedClass}`}>Searching Simraungadh database...</Text>
          </View>
        )}

        {/* Recent Search & Trending Suggestions when Query is Empty */}
        {!loading && query.trim().length < 2 && (
          <View>
            {recentSearches.length > 0 && (
              <>
                <View className="flex-row items-center justify-between mb-3 mt-1">
                  <View className="flex-row items-center">
                    <Clock size={14} color={theme.iconColor} />
                    <Text className={`font-bold text-[13px] uppercase tracking-wider ml-1.5 ${theme.textMutedClass}`}>Recent Searches</Text>
                  </View>
                  <TouchableOpacity onPress={clearHistory}>
                    <Text className={`font-bold text-[12px] ${theme.isDark ? 'text-primary-400' : 'text-primary'}`}>Clear All</Text>
                  </TouchableOpacity>
                </View>

                <View className="flex-row flex-wrap gap-2 mb-6">
                  {recentSearches.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => executeSearch(item)}
                      className={`px-3.5 py-2 rounded-[20px] flex-row items-center ${theme.isDark ? 'bg-white/10' : 'bg-slate-100'}`}
                    >
                      <Search size={11} color={theme.iconColor} />
                      <Text className={`text-[12.5px] font-bold ml-1.5 ${theme.textClass}`}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View className="flex-row items-center mb-3 mt-2">
              <TrendingUp size={14} color={theme.isDark ? '#fb7185' : '#e11d48'} />
              <Text className={`font-bold text-[13px] uppercase tracking-wider ml-1.5 ${theme.isDark ? 'text-rose-400' : 'text-rose-600'}`}>Trending Topics</Text>
            </View>

            <View className="flex-row flex-wrap gap-2 mb-6">
              {TRENDING.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => executeSearch(item)}
                  className={`px-3.5 py-2 rounded-[20px] flex-row items-center ${theme.isDark ? 'bg-rose-500/10' : 'bg-rose-50'}`}
                >
                  <TrendingUp size={11} color={theme.isDark ? '#fb7185' : '#e11d48'} />
                  <Text className={`text-[12.5px] font-bold ml-1.5 ${theme.isDark ? 'text-rose-400' : 'text-rose-600'}`}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Search Results */}
        {!loading && query.trim().length >= 2 && (
          <>
            {totalResults === 0 ? (
              <View className="py-16 items-center px-6">
                <View className={`w-16 h-16 rounded-[24px] items-center justify-center mb-3 ${theme.isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                  <Search size={28} color={theme.iconColor} />
                </View>
                <Text className={`font-bold text-base mb-1 ${theme.textClass}`}>No results found</Text>
                <Text className={`text-center text-[13px] ${theme.textMutedClass}`}>No matching citizens, reports, or notices found for "{query}".</Text>
              </View>
            ) : (
              <View className="space-y-5">
                {/* 1. PEOPLE RESULTS */}
                {(activeTab === 'All' || activeTab === 'People') && people.length > 0 && (
                  <View className="mb-4">
                    <Text className={`font-black text-[13px] uppercase tracking-wider mb-2.5 ${theme.isDark ? 'text-primary-400' : 'text-primary'}`}>
                      People ({people.length})
                    </Text>

                    {people.map(p => (
                      <AnimatedCard
                        key={p.id}
                        onPress={() => router.push(`/user/${p.id}`)}
                        className={`p-4 mb-3 flex-row items-center ${theme.glassCardClass}`}
                        style={theme.cardShadow}
                      >
                        {p.avatar_url ? (
                          <Image source={{ uri: p.avatar_url }} style={{ width: 46, height: 46, borderRadius: 23 }} cachePolicy="memory-disk" />
                        ) : (
                          <View className={`w-11 h-11 rounded-full items-center justify-center ${theme.isDark ? 'bg-primary-500/20' : 'bg-primary-50'}`}>
                            <User size={20} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
                          </View>
                        )}

                        <View className="ml-3.5 flex-1">
                          <View className="flex-row items-center gap-2">
                            <Text className={`font-black text-[15px] ${theme.textClass}`}>{p.full_name || 'Citizen'}</Text>
                            {p.role === 'official' && (
                              <View className="bg-primary px-1.5 py-0.5 rounded flex-row items-center">
                                <Shield size={9} color="#fff" style={{ marginRight: 2 }} />
                                <Text className="text-white text-[9px] font-black uppercase tracking-wider">Official</Text>
                              </View>
                            )}
                          </View>
                          <Text className={`text-[12px] font-medium mt-1 ${theme.textMutedClass}`}>
                            {p.department ? `${p.department} Dept` : p.ward_number ? `Ward ${p.ward_number}` : 'Citizen'}
                          </Text>
                        </View>

                        <ChevronRight size={18} color={theme.iconColor} />
                      </AnimatedCard>
                    ))}
                  </View>
                )}

                {/* 2. REPORT RESULTS */}
                {(activeTab === 'All' || activeTab === 'Reports') && issues.length > 0 && (
                  <View className="mb-4">
                    <Text className={`font-black text-[13px] uppercase tracking-wider mb-2.5 ${theme.isDark ? 'text-primary-400' : 'text-primary'}`}>
                      Civic Reports ({issues.length})
                    </Text>

                    {issues.map(item => (
                      <AnimatedCard
                        key={item.id}
                        onPress={() => router.push(`/issue/${item.id}`)}
                        className={`p-5 mb-3 ${theme.glassCardClass}`}
                        style={theme.cardShadow}
                      >
                        <View className="flex-row justify-between items-start mb-1.5">
                          <Text className={`font-black text-[15.5px] tracking-tight flex-1 mr-2 ${theme.textClass}`} numberOfLines={1}>
                            {item.title}
                          </Text>
                          {item.status && <Badge type={item.status as any} text={item.status.replace('_', ' ')} size="sm" />}
                        </View>

                        <Text className={`text-[13.5px] font-medium leading-[20px] mb-3 ${theme.textSecondaryClass}`} numberOfLines={2}>
                          {item.description}
                        </Text>

                        <View className="flex-row justify-between items-center">
                          <Text className={`text-[11.5px] font-bold uppercase tracking-wider ${theme.textMutedClass}`}>Ward {item.ward_number || 1} · {item.category}</Text>
                          <ChevronRight size={18} color={theme.iconColor} />
                        </View>
                      </AnimatedCard>
                    ))}
                  </View>
                )}

                {/* 3. OFFICIAL NOTICES RESULTS */}
                {(activeTab === 'All' || activeTab === 'Notices') && notices.length > 0 && (
                  <View className="mb-4">
                    <Text className={`font-black text-[13px] uppercase tracking-wider mb-2.5 ${theme.isDark ? 'text-primary-400' : 'text-primary'}`}>
                      Official Notices ({notices.length})
                    </Text>

                    {notices.map(n => (
                      <AnimatedCard
                        key={n.id}
                        onPress={() => router.push('/notices')}
                        className={`p-5 mb-3 ${theme.glassCardClass}`}
                        style={theme.cardShadow}
                      >
                        <View className="flex-row items-center mb-1.5">
                          <View className="w-6 h-6 rounded-full bg-indigo-500/10 items-center justify-center mr-2">
                            <Megaphone size={14} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
                          </View>
                          <Text className={`font-black text-[15px] flex-1 ${theme.textClass}`} numberOfLines={1}>{n.title}</Text>
                        </View>
                        <Text className={`text-[13.5px] font-medium leading-[20px] ${theme.textSecondaryClass}`} numberOfLines={2}>{n.content}</Text>
                      </AnimatedCard>
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
