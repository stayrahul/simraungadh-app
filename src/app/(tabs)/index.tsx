// @ts-nocheck
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, RefreshControl, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Sun, CloudRain, Cloud, MapPin, Bell, User, Inbox, Flame, Navigation, Droplets, Zap, Trash2, HelpCircle, TrendingUp, ArrowUp, Globe, Users, X, Camera, ImagePlus, Search } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useLangStore } from '../../store/langStore';
import { translations } from '../../lib/translations';
import { Issue } from '../../lib/types';
import { useWeatherStore } from '../../store/weatherStore';
import { getNepaliDate } from '../../lib/nepaliDate';
import { createNotification } from '../../lib/notifications';
import Skeleton from '../../components/Skeleton';
import FeedCard from '../../components/FeedCard';
import Footer from '../../components/Footer';
import { useTheme } from '../../hooks/use-theme';

const CATEGORIES = [
  { name: 'All', icon: Flame },
  { name: 'Roads', icon: Navigation },
  { name: 'Water', icon: Droplets },
  { name: 'Electricity', icon: Zap },
  { name: 'Trash', icon: Trash2 },
  { name: 'General', icon: HelpCircle },
];

const feedCache: Record<string, Issue[]> = {};

export default function FeedScreen() {
  const { profile, signOut } = useAuthStore();
  const { language } = useLangStore();
  const t = translations[language];
  const router = useRouter();
  const theme = useTheme();

  const [issues, setIssues] = useState<Issue[]>([]);
  const issuesRef = useRef<Issue[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [likedIssues, setLikedIssues] = useState<Set<string>>(new Set());
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [feedTab, setFeedTab] = useState<'all' | 'following'>('all');

  // Follow relationships state
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [followerUsers, setFollowerUsers] = useState<Set<string>>(new Set());

  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<{ uri: string; base64: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const filteredIssues = useMemo(() => {
    if (feedTab === 'following') {
      return issues.filter(item => item.author_id && followingUsers.has(item.author_id));
    }
    return issues;
  }, [issues, feedTab, followingUsers]);

  // Pagination
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const pageRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(true);

  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Translations state
  const [translationsCache, setTranslationsCache] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  // ExtraData memoization for FlashList
  const extraData = useMemo(
    () => ({ followingUsers, followerUsers, likedIssues, translating, translationsCache }),
    [followingUsers, followerUsers, likedIssues, translating, translationsCache]
  );

  // Weather state
  const { temp, condition, loading: weatherLoading, fetchWeather } = useWeatherStore();

  // Trending count
  const [trendingCount, setTrendingCount] = useState(0);
  const [hasUnread, setHasUnread] = useState(false);

  const fetchIssues = useCallback(async (isLoadMore = false, isSilent = false) => {
    if (isLoadMore && (loadingMoreRef.current || !hasMoreRef.current || loadingRef.current)) return;

    // Instant SWR cache hit for 0ms initial render
    if (!isLoadMore && !isSilent && feedCache[activeCategory] && feedCache[activeCategory].length > 0 && issuesRef.current.length === 0) {
      setIssues(feedCache[activeCategory]);
      issuesRef.current = feedCache[activeCategory];
      setLoading(false);
      loadingRef.current = false;
    }

    try {
      if (isLoadMore) {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      } else if (!isSilent && issuesRef.current.length === 0) {
        setLoading(true);
        loadingRef.current = true;
      }

      const currentPage = isLoadMore ? pageRef.current + 1 : 0;
      const limit = 8;
      const start = currentPage * limit;
      const end = start + limit - 1;

      let query = supabase
        .from('issues')
        .select(`*, author:profiles!issues_author_id_fkey(id, full_name, avatar_url, role), issue_comments(count)`)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (activeCategory !== 'All') {
        query = query.eq('category', activeCategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      const newIssues = data || [];
      const moreExist = newIssues.length >= limit;
      setHasMore(moreExist);
      hasMoreRef.current = moreExist;

      if (!isLoadMore) {
        feedCache[activeCategory] = newIssues;
      }

      setIssues(prev => {
        const updated = isLoadMore ? [...prev, ...newIssues] : newIssues;
        issuesRef.current = updated;
        return updated;
      });
      setPage(currentPage);
      pageRef.current = currentPage;

      // Unblock UI rendering immediately!
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      loadingRef.current = false;
      loadingMoreRef.current = false;

      // Count trending (issues from last 24h with 2+ upvotes)
      if (!isLoadMore && newIssues.length > 0) {
        const dayAgo = new Date(Date.now() - 86400000).toISOString();
        const trending = newIssues.filter(i => new Date(i.created_at) > new Date(dayAgo) && i.upvotes_count >= 2);
        setTrendingCount(trending.length);
      }

      // Non-blocking background auxiliary fetch
      if (profile && !isLoadMore) {
        setTimeout(async () => {
          try {
            const [likesRes, followsRes, followersRes, unreadRes] = await Promise.all([
              supabase.from('issue_upvotes').select('issue_id').eq('user_id', profile.id),
              supabase.from('user_follows').select('following_id').eq('follower_id', profile.id),
              supabase.from('user_follows').select('follower_id').eq('following_id', profile.id),
              supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('is_read', false),
            ]);

            if (likesRes.data) setLikedIssues(new Set(likesRes.data.map(l => l.issue_id)));
            if (followsRes.data) setFollowingUsers(new Set(followsRes.data.map(f => f.following_id)));
            if (followersRes.data) setFollowerUsers(new Set(followersRes.data.map(f => f.follower_id)));
            setHasUnread((unreadRes.count || 0) > 0);
          } catch (auxErr) {
            console.warn('Auxiliary background fetch warning:', auxErr);
          }
        }, 0);
      }
    } catch (e: any) {
      console.error('Error fetching issues', e);
      if (e?.code === 'PGRST303' || e?.message?.includes('JWT issued at future')) {
        signOut();
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      loadingRef.current = false;
      loadingMoreRef.current = false;
    }
  }, [activeCategory, profile]);

  useEffect(() => {
    issuesRef.current = issues;
  }, [issues]);

  useEffect(() => {
    fetchIssues(false, issuesRef.current.length > 0);
  }, [activeCategory, profile?.id]);

  useFocusEffect(
    useCallback(() => {
      // Auto-refresh feed silently in background when user returns to feed
      fetchIssues(false, true);
    }, [fetchIssues])
  );

  useEffect(() => {
    fetchWeather();
    
    const channel = supabase
      .channel('public:issues')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'issues' }, (payload) => {
        if (payload.new && payload.new.author_id === profile?.id) {
          // If current user created the post, refresh background immediately
          fetchIssues(false, true);
        } else {
          setNewPostsAvailable(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, fetchIssues]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    setNewPostsAvailable(false);
    fetchWeather();
    fetchIssues(false, true);
  }, [fetchIssues, fetchWeather]);

  const handleLoadMore = useCallback(() => {
    fetchIssues(true);
  }, [fetchIssues]);

  const handleFollowToggle = useCallback((authorId: string) => {
    setFollowingUsers(prev => {
      const next = new Set(prev);
      if (next.has(authorId)) next.delete(authorId);
      else next.add(authorId);
      return next;
    });
  }, []);

  const handleLike = useCallback(async (issueId: string, isLiked: boolean) => {
    if (!profile) {
      router.push('/login');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      setLikedIssues(prev => {
        const next = new Set(prev);
        if (isLiked) next.delete(issueId);
        else next.add(issueId);
        return next;
      });

      setIssues(prev => prev.map(issue =>
        issue.id === issueId ? { ...issue, upvotes_count: Math.max(0, issue.upvotes_count + (isLiked ? -1 : 1)) } : issue
      ));

      if (isLiked) {
        await supabase.from('issue_upvotes').delete().eq('issue_id', issueId).eq('user_id', profile.id);
      } else {
        const { error } = await supabase.from('issue_upvotes').insert({ issue_id: issueId, user_id: profile.id });
        if (error && error.code !== '23505') throw error;

        const targetIssue = issuesRef.current.find(i => i.id === issueId);
        if (targetIssue && targetIssue.author_id && targetIssue.author_id !== profile.id) {
          createNotification({
            userId: targetIssue.author_id,
            title: 'New Like',
            body: `${profile.full_name || 'Someone'} liked your report "${targetIssue.title || 'issue'}".`,
            type: 'new_like',
            referenceId: issueId,
          });
        }
      }
    } catch (e: unknown) {
      fetchIssues();
    }
  }, [profile, fetchIssues, router]);

  const handleTranslate = useCallback(async (issueId: string, text: string) => {
    if (!text.trim()) return;

    setTranslating(prev => ({ ...prev, [issueId]: true }));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|en`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await res.json();

      if (data && data.responseData && data.responseData.translatedText) {
        if (data.responseData.translatedText === 'PLEASE SELECT TWO DISTINCT LANGUAGES' || data.responseData.translatedText === 'INVALID LANGUAGE PAIR SPECIFIED. AUTODETECTING...' || data.responseStatus === 429) {
          setTranslationsCache(prev => ({ ...prev, [issueId]: text })); // Fallback to original
        } else {
          setTranslationsCache(prev => ({ ...prev, [issueId]: data.responseData.translatedText }));
        }
      }
    } catch (e: unknown) {
      console.error('Translation failed', e);
      setTranslationsCache(prev => ({ ...prev, [issueId]: text })); // Fallback to original on error
    } finally {
      clearTimeout(timeoutId);
      setTranslating(prev => ({ ...prev, [issueId]: false }));
    }
  }, []);

  const renderSkeleton = () => (
    <View 
      className={`rounded-2xl p-3.5 mb-1.5 mx-1.5 border ${theme.cardClass}`}
      style={theme.cardShadow}
    >
      <View className="flex-row items-center mb-3">
        <Skeleton height={36} width={36} className="rounded-full mr-2.5" />
        <View>
          <Skeleton height={13} width={110} className="mb-1.5" />
          <Skeleton height={10} width={75} />
        </View>
      </View>
      <Skeleton height={14} width="85%" className="mb-2" />
      <Skeleton height={12} width="60%" className="mb-3" />
      <Skeleton height={180} className="w-full rounded-xl mb-3" />
      <View className="flex-row gap-3 pt-2">
        <Skeleton height={20} width={50} className="rounded-lg" />
        <Skeleton height={20} width={50} className="rounded-lg" />
        <Skeleton height={20} width={50} className="rounded-lg" />
      </View>
    </View>
  );

  const handleEditPost = useCallback((issue: Issue) => {
    setEditingIssue(issue);
    setEditTitle(issue.title);
    setEditDescription(issue.description);
    setEditImages(issue.image_urls || (issue.image_url ? [issue.image_url] : []));
    setNewImages([]);
  }, []);

  const pickImage = async () => {
    if (editImages.length + newImages.length >= 4) {
      Alert.alert('Limit Reached', 'You can only upload up to 4 images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setNewImages(prev => [...prev, { uri: result.assets[0].uri, base64: result.assets[0].base64! }]);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingIssue) return;
    if (!editTitle.trim() || !editDescription.trim()) {
      Alert.alert('Error', 'Title and description cannot be empty');
      return;
    }
    setIsSaving(true);
    try {
      let uploadedUrls: string[] = [];
      if (newImages.length > 0) {
        await Promise.all(newImages.map(async (img, index) => {
          const filePath = `${profile?.id}/${Date.now()}_${index}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('civic_images')
            .upload(filePath, decode(img.base64), { contentType: 'image/jpeg' });
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('civic_images').getPublicUrl(filePath);
          uploadedUrls.push(data.publicUrl);
        }));
      }

      const finalImages = [...editImages, ...uploadedUrls];
      const payload = {
        title: editTitle,
        description: editDescription,
        image_urls: finalImages,
        image_url: finalImages[0] || null,
      };

      const { error } = await supabase
        .from('issues')
        .update(payload)
        .eq('id', editingIssue.id);
        
      if (error) throw error;
      
      setIssues(prev => prev.map(i => i.id === editingIssue.id ? { ...i, ...payload } : i));
      setEditingIssue(null);
      Alert.alert('Success', 'Post updated successfully');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = useCallback(async (issue: Issue) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('issues').delete().eq('id', issue.id);
              if (error) throw error;
              setIssues(prev => prev.filter(i => i.id !== issue.id));
              Alert.alert('Deleted', 'Your post has been deleted.');
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  }, []);

  const renderItem = useCallback(({ item, extraData }: any) => (
    <FeedCard
      item={item}
      isLiked={extraData.likedIssues.has(item.id)}
      onLike={handleLike}
      translationsCache={extraData.translationsCache}
      translating={extraData.translating}
      onTranslate={handleTranslate}
      isFollowingAuthor={item.author_id ? extraData.followingUsers.has(item.author_id) : false}
      isFollowedByAuthor={item.author_id ? extraData.followerUsers.has(item.author_id) : false}
      onFollowToggle={handleFollowToggle}
      onEdit={handleEditPost}
      onDelete={handleDeletePost}
    />
  ), [handleLike, handleTranslate, handleFollowToggle, handleEditPost, handleDeletePost]);

  const formattedDate = getNepaliDate(new Date(), language);

  const WeatherIcon = condition === 'Clear' ? Sun : condition === 'Rain' ? CloudRain : Cloud;
  const weatherColor = condition === 'Clear' ? '#f59e0b' : condition === 'Rain' ? '#38bdf8' : '#94a3b8';

  const renderListFooter = () => (
    <View>
      {loadingMore ? (
        <View className="py-4 items-center">
          <ActivityIndicator color={theme.isDark ? '#60a5fa' : '#2563eb'} />
        </View>
      ) : null}
      <Footer />
    </View>
  );

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      {/* Header */}
      <View className={`px-4 pt-3 pb-3 border-b ${theme.headerBgClass}`}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className={`text-[22px] font-black tracking-tight ${theme.textClass}`} numberOfLines={1}>
              {language === 'ne' 
                ? `नमस्ते, ${profile?.full_name ? profile.full_name.split(' ')[0] : 'नागरिक'} 👋`
                : `Hello, ${profile?.full_name ? profile.full_name.split(' ')[0] : 'Citizen'} 👋`
              }
            </Text>
            <View className="flex-row items-center mt-0.5 flex-wrap">
              <Calendar size={11} color={theme.iconColor} />
              <Text className={`text-[11px] font-medium ml-1 ${theme.textMutedClass}`}>{formattedDate}</Text>
              {!weatherLoading && temp !== null && (
                <>
                  <Text className={`text-[10px] mx-1.5 ${theme.textMutedClass}`}>·</Text>
                  <WeatherIcon size={11} color={weatherColor} />
                  <Text className={`text-[11px] font-medium ml-1 ${theme.textMutedClass}`}>{temp}°C {condition}</Text>
                </>
              )}
              {trendingCount > 0 && (
                <>
                  <Text className={`text-[10px] mx-1.5 ${theme.textMutedClass}`}>·</Text>
                  <TrendingUp size={11} color={theme.isDark ? '#34d399' : '#059669'} />
                  <Text className={`text-[11px] font-medium ml-0.5 ${theme.isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{trendingCount} trending</Text>
                </>
              )}
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity 
              onPress={() => router.push('/search')} 
              activeOpacity={0.7}
              className={`w-9 h-9 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
            >
              <Search size={18} color={theme.iconColor} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => router.push('/notifications')} 
              activeOpacity={0.7}
              className={`relative w-9 h-9 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
            >
              <Bell size={18} color={theme.iconColor} />
              {hasUnread && (
                <View className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#0b1120]" />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => router.push('/profile')} 
              activeOpacity={0.7}
            >
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={{ width: 34, height: 34, borderRadius: 17 }} transition={200} />
              ) : (
                <View className={`w-[34px] h-[34px] rounded-full items-center justify-center ${theme.isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
                  <User size={16} color={theme.isDark ? '#60a5fa' : '#2563eb'} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Category Filters */}
      <View className={`border-b py-2 ${theme.headerBgClass}`}>

        {/* Category Horizontal Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-3.5" contentContainerStyle={{ paddingRight: 24 }}>
          {CATEGORIES.map(cat => {
            const IconComp = cat.icon;
            const isSelected = activeCategory === cat.name;
            return (
              <TouchableOpacity
                key={cat.name}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveCategory(cat.name);
                }}
                activeOpacity={0.7}
                className={`flex-row items-center px-3 py-1.5 rounded-lg mr-1.5 ${
                  isSelected 
                    ? (theme.isDark ? 'bg-blue-500/20' : 'bg-blue-600')
                    : 'bg-transparent'
                }`}
              >
                <IconComp size={13} color={isSelected ? (theme.isDark ? '#60a5fa' : '#ffffff') : theme.iconColor} />
                <Text className={`ml-1.5 text-[12px] font-semibold ${
                  isSelected 
                    ? (theme.isDark ? 'text-blue-300' : 'text-white')
                    : theme.textSecondaryClass
                }`}>
                  {cat.name === 'All' ? 'All' : (t[cat.name.toLowerCase() as keyof typeof t] || cat.name)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        {newPostsAvailable && (
          <View className="absolute top-4 left-0 right-0 items-center z-10">
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setNewPostsAvailable(false);
                onRefresh();
              }}
              className={`flex-row items-center px-4 py-2.5 rounded-full shadow-lg ${theme.isDark ? 'bg-blue-500' : 'bg-blue-600'}`}
              style={Platform.select({
                web: { boxShadow: '0px 4px 10px rgba(37,99,235,0.4)' },
                default: { shadowColor: '#2563eb', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 }
              }) as any}
            >
              <ArrowUp size={16} color="#ffffff" />
              <Text className="text-white font-bold text-[13px] ml-1.5">New reports available</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlashList
          style={{ flex: 1 }}
          data={loading ? [1, 2, 3] as any : filteredIssues}
          keyExtractor={(item, index) => loading ? `skel-${index}` : item.id}
          renderItem={loading ? renderSkeleton : renderItem}
          estimatedItemSize={300}
          extraData={extraData}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.isDark ? '#60a5fa' : '#2563eb'}
              colors={['#2563eb']}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderListFooter}
          ListEmptyComponent={
            !loading ? (
              <View className="items-center justify-center py-16 px-6">
                <View className={`w-16 h-16 rounded-3xl items-center justify-center mb-4 ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                  {feedTab === 'following' ? <Users size={28} color={theme.iconColor} /> : <Inbox size={28} color={theme.iconColor} />}
                </View>
                <Text className={`font-bold text-base mb-1.5 text-center ${theme.textClass}`}>
                  {feedTab === 'following' ? 'No posts from citizens you follow' : t.no_issues}
                </Text>
                <Text className={`text-[13px] text-center max-w-[260px] ${theme.textMutedClass}`}>
                  {feedTab === 'following' 
                    ? 'Tap on a citizen\'s avatar or profile to follow them and see their civic reports here!' 
                    : (t.no_issues_sub || 'No civic reports reported yet in this category.')}
                </Text>
              </View>
            ) : null
          }
        />
      </View>
      
      <Modal visible={!!editingIssue} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className={`flex-1 justify-end ${theme.isDark ? 'bg-black/80' : 'bg-black/40'}`}>
            <View className={`rounded-t-3xl p-6 h-[80%] ${theme.bgClass}`}>
              <View className="flex-row justify-between items-center mb-6">
                <Text className={`font-black text-xl ${theme.textClass}`}>Edit Post</Text>
                <TouchableOpacity onPress={() => setEditingIssue(null)} className={`p-2 rounded-full ${theme.isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                  <X size={20} color={theme.iconColor} />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text className={`font-bold text-[13px] uppercase tracking-wider mb-2 ${theme.textSecondaryClass}`}>Title</Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  className={`border rounded-xl px-4 py-3 mb-4 font-medium text-[15px] ${theme.inputClass} ${theme.textClass}`}
                  placeholderTextColor={theme.inputPlaceholder}
                />
                
                <Text className={`font-bold text-[13px] uppercase tracking-wider mb-2 ${theme.textSecondaryClass}`}>Description</Text>
                <TextInput
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  textAlignVertical="top"
                  className={`border rounded-xl px-4 py-3 h-32 mb-4 font-medium text-[15px] ${theme.inputClass} ${theme.textClass}`}
                  placeholderTextColor={theme.inputPlaceholder}
                />

                <Text className={`font-bold text-[13px] uppercase tracking-wider mb-2 ${theme.textSecondaryClass}`}>Images</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  {editImages.map((uri, idx) => (
                    <View key={`old-${idx}`} className="relative mr-3">
                      <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 12 }} />
                      <TouchableOpacity 
                        onPress={() => setEditImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 bg-rose-500 rounded-full p-1"
                      >
                        <X size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {newImages.map((img, idx) => (
                    <View key={`new-${idx}`} className="relative mr-3">
                      <Image source={{ uri: img.uri }} style={{ width: 80, height: 80, borderRadius: 12 }} />
                      <TouchableOpacity 
                        onPress={() => setNewImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 bg-rose-500 rounded-full p-1"
                      >
                        <X size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {(editImages.length + newImages.length) < 4 && (
                    <TouchableOpacity 
                      onPress={pickImage} 
                      className={`w-20 h-20 rounded-xl border-2 border-dashed items-center justify-center ${theme.isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-300 bg-slate-50'}`}
                    >
                      <ImagePlus size={24} color={theme.textMutedClass.includes('text-slate-400') ? '#94a3b8' : '#cbd5e1'} />
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </ScrollView>
              
              <View className="mt-4 pt-4 border-t border-slate-200/20 dark:border-white/5">
                <TouchableOpacity 
                  onPress={handleSaveEdit} 
                  disabled={isSaving}
                  className={`py-4 rounded-xl items-center ${isSaving ? 'opacity-50' : ''} ${theme.isDark ? 'bg-indigo-500' : 'bg-indigo-600'}`}
                >
                  <Text className="font-bold text-white text-[15px]">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
