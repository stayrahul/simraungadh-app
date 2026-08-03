// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, Linking } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ArrowLeft, X, User, Megaphone, AlertCircle, Phone, Shield, ChevronRight, Clock } from 'lucide-react-native';
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
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Ward Chairman', 'Water Supply', 'Road repair', 'Health Post', 'Emergency'
  ]);

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
        .select('*')
        .or(`full_name.ilike.${searchTerm},department.ilike.${searchTerm},role.ilike.${searchTerm}`)
        .limit(10);

      // 2. Search Issues / Reports
      const { data: issuesData } = await supabase
        .from('issues')
        .select('*, author:profiles!issues_author_id_fkey(*)')
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
      setRecentSearches(prev => [searchTerm, ...prev.slice(0, 4)]);
    }
  };

  const totalResults = people.length + issues.length + notices.length;

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      {/* Search Header Bar */}
      <View className={`px-4 pt-3 pb-3 border-b ${theme.headerBgClass}`}>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className={`w-9.5 h-9.5 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
          >
            <ArrowLeft size={18} color={theme.iconColor} />
          </TouchableOpacity>

          <View className={`flex-1 flex-row items-center rounded-2xl px-3.5 py-2 border ${theme.inputClass}`}>
            <Search size={16} color={theme.iconColor} />
            <TextInput
              autoFocus
              className={`flex-1 ml-2.5 text-[14px] font-medium ${theme.textClass}`}
              placeholder="Search people, reports, notices..."
              placeholderTextColor={theme.inputPlaceholder}
              value={query}
              onChangeText={handleSearch}
              onSubmitEditing={() => executeSearch(query)}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')} className="p-1">
                <X size={14} color={theme.iconColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Tabs */}
        {query.trim().length >= 2 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ paddingRight: 20 }}>
            {TABS.map(tab => {
              const isSelected = activeTab === tab.split(' ')[0];
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab(tab.split(' ')[0]);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl mr-2 border ${
                    isSelected 
                      ? 'bg-blue-600 border-blue-600' 
                      : (theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200')
                  }`}
                >
                  <Text className={`text-[12px] font-bold ${isSelected ? 'text-white' : theme.textClass}`}>
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
            <ActivityIndicator size="large" color={theme.isDark ? '#60a5fa' : '#2563eb'} />
            <Text className={`text-[13px] font-medium mt-3 ${theme.textMutedClass}`}>Searching Simraungadh database...</Text>
          </View>
        )}

        {/* Recent Search Suggestions when Query is Empty */}
        {!loading && query.trim().length < 2 && (
          <View>
            <View className="flex-row items-center mb-3">
              <Clock size={14} color={theme.iconColor} />
              <Text className={`font-bold text-[13px] uppercase tracking-wider ml-1.5 ${theme.textMutedClass}`}>Recent Searches</Text>
            </View>

            <View className="flex-row flex-wrap gap-2 mb-6">
              {recentSearches.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => executeSearch(item)}
                  className={`px-3 py-1.5 rounded-xl border flex-row items-center ${theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}
                >
                  <Search size={11} color={theme.iconColor} />
                  <Text className={`text-[12.5px] font-bold ml-1.5 ${theme.textClass}`}>{item}</Text>
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
                <View className={`w-16 h-16 rounded-3xl items-center justify-center mb-3 ${theme.isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
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
                    <Text className={`font-black text-[13px] uppercase tracking-wider mb-2.5 ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      People ({people.length})
                    </Text>

                    {people.map(p => (
                      <AnimatedCard
                        key={p.id}
                        onPress={() => router.push(`/user/${p.id}`)}
                        className={`p-3 rounded-2xl border mb-2 flex-row items-center ${theme.cardClass}`}
                        style={theme.cardShadow}
                      >
                        {p.avatar_url ? (
                          <Image source={{ uri: p.avatar_url }} style={{ width: 42, height: 42, borderRadius: 21 }} cachePolicy="memory-disk" />
                        ) : (
                          <View className={`w-10.5 h-10.5 rounded-full items-center justify-center ${theme.isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                            <User size={20} color={theme.isDark ? '#60a5fa' : '#2563eb'} />
                          </View>
                        )}

                        <View className="ml-3 flex-1">
                          <View className="flex-row items-center gap-1.5">
                            <Text className={`font-extrabold text-[14px] ${theme.textClass}`}>{p.full_name || 'Citizen'}</Text>
                            {p.role === 'official' && (
                              <View className="bg-blue-600 px-1.5 py-0.2 rounded flex-row items-center">
                                <Shield size={8} color="#fff" />
                                <Text className="text-white text-[8px] font-black ml-0.5 uppercase">Official</Text>
                              </View>
                            )}
                          </View>
                          <Text className={`text-[11px] font-medium mt-0.5 ${theme.textMutedClass}`}>
                            {p.department ? `${p.department} Dept` : p.ward_number ? `Ward ${p.ward_number}` : 'Citizen'}
                          </Text>
                        </View>

                        <ChevronRight size={16} color={theme.iconColor} />
                      </AnimatedCard>
                    ))}
                  </View>
                )}

                {/* 2. REPORT RESULTS */}
                {(activeTab === 'All' || activeTab === 'Reports') && issues.length > 0 && (
                  <View className="mb-4">
                    <Text className={`font-black text-[13px] uppercase tracking-wider mb-2.5 ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      Civic Reports ({issues.length})
                    </Text>

                    {issues.map(item => (
                      <AnimatedCard
                        key={item.id}
                        onPress={() => router.push(`/issue/${item.id}`)}
                        className={`p-3 rounded-2xl border mb-2 ${theme.cardClass}`}
                        style={theme.cardShadow}
                      >
                        <View className="flex-row justify-between items-start mb-1">
                          <Text className={`font-bold text-[14px] flex-1 mr-2 ${theme.textClass}`} numberOfLines={1}>
                            {item.title}
                          </Text>
                          {item.status && <Badge type={item.status as any} text={item.status.replace('_', ' ')} size="sm" />}
                        </View>

                        <Text className={`text-[12.5px] leading-relaxed mb-2 ${theme.textSecondaryClass}`} numberOfLines={2}>
                          {item.description}
                        </Text>

                        <View className="flex-row justify-between items-center">
                          <Text className={`text-[10.5px] font-semibold ${theme.textMutedClass}`}>Ward {item.ward_number || 1} · {item.category}</Text>
                          <ChevronRight size={15} color={theme.iconColor} />
                        </View>
                      </AnimatedCard>
                    ))}
                  </View>
                )}

                {/* 3. OFFICIAL NOTICES RESULTS */}
                {(activeTab === 'All' || activeTab === 'Notices') && notices.length > 0 && (
                  <View className="mb-4">
                    <Text className={`font-black text-[13px] uppercase tracking-wider mb-2.5 ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      Official Notices ({notices.length})
                    </Text>

                    {notices.map(n => (
                      <AnimatedCard
                        key={n.id}
                        onPress={() => router.push('/notices')}
                        className={`p-3.5 rounded-2xl border mb-2 ${theme.cardClass}`}
                        style={theme.cardShadow}
                      >
                        <View className="flex-row items-center mb-1">
                          <Megaphone size={14} color={theme.isDark ? '#60a5fa' : '#2563eb'} className="mr-1.5" />
                          <Text className={`font-bold text-[14px] flex-1 ml-1.5 ${theme.textClass}`} numberOfLines={1}>{n.title}</Text>
                        </View>
                        <Text className={`text-[12.5px] leading-relaxed ${theme.textSecondaryClass}`} numberOfLines={2}>{n.content}</Text>
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
