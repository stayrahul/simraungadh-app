// @ts-nocheck
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, RefreshControl, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Linking, Animated as RNAnimated } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Sun, CloudRain, Cloud, MapPin, Bell, User, Inbox, Flame, Navigation, Droplets, Zap, Trash2, HelpCircle, TrendingUp, ArrowUp, Globe, Users, X, Camera, ImagePlus, Search, Plus, PhoneCall, File, Sparkles, PieChart, Landmark } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { decode } from 'base64-arraybuffer';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useLangStore } from '../../store/langStore';
import { translations } from '../../lib/translations';
import { useAlert } from '../../components/AlertProvider';
import { Issue } from '../../lib/types';
import { useWeatherStore } from '../../store/weatherStore';
import { getNepaliDate } from '../../lib/nepaliDate';
import { createNotification } from '../../lib/notifications';
import Skeleton from '../../components/Skeleton';
import FeedCard from '../../components/FeedCard';
import PollCard from '../../components/PollCard';
import { useTheme } from '../../hooks/use-theme';

const CATEGORIES = [
  { name: 'All', icon: Flame },
  { name: 'Polls', icon: PieChart },
  { name: 'Community', icon: Camera },
  { name: 'Reports', icon: Navigation },
  { name: 'Farming', icon: Sun },
  { name: 'Trade', icon: Zap },
  { name: 'Roads', icon: Navigation },
  { name: 'Water', icon: Droplets },
  { name: 'General', icon: HelpCircle },
];

const feedCache: Record<string, Issue[]> = {};
const PAGE_SIZE = 15;

export default function FeedScreen() {
  const { profile, signOut } = useAuthStore();
  const { language, setLanguage } = useLangStore();
  const t = translations[language];
  const router = useRouter();
  const theme = useTheme();

  const waveAnim = useRef(new RNAnimated.Value(0)).current;
  const headerOpacity = useRef(new RNAnimated.Value(0)).current;

  const [issues, setIssues] = useState<Issue[]>([]);
  const issuesRef = useRef<Issue[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [likedIssues, setLikedIssues] = useState<Set<string>>(new Set());
  const [feedTab, setFeedTab] = useState<'all' | 'following'>('all');

  // Follow relationships state
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [followerUsers, setFollowerUsers] = useState<Set<string>>(new Set());

  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);

  const [editDescription, setEditDescription] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<{ uri: string; base64: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const pageRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(true);

  // Translations state
  const [translationsCache, setTranslationsCache] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  // Trending count
  const [trendingCount, setTrendingCount] = useState(0);
  const [hasUnread, setHasUnread] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    // Fade in header
    RNAnimated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }).start();
    // Wave the hand emoji
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(waveAnim, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
        RNAnimated.timing(waveAnim, { toValue: -1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
        RNAnimated.timing(waveAnim, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
        RNAnimated.timing(waveAnim, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
        RNAnimated.delay(3000),
      ]),
      { iterations: 2 }
    ).start();
  }, []);



  const filteredIssues = useMemo(() => {
    if (feedTab === 'following') {
      return issues.filter(item => item.author_id && followingUsers.has(item.author_id));
    }
    return issues;
  }, [issues, feedTab, followingUsers]);

  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // ExtraData memoization for FlashList
  const extraData = useMemo(
    () => ({ followingUsers, followerUsers, likedIssues, translating, translationsCache }),
    [followingUsers, followerUsers, likedIssues, translating, translationsCache]
  );

  // Weather state
  const { temp, condition, loading: weatherLoading, fetchWeather } = useWeatherStore();

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

      const currentPage = isLoadMore ? pageRef.current + 1 : 1;
      const isLoadMoreTriggered = currentPage > 1;
      let newIssues = [];

      if (activeCategory === 'Polls') {
        let query = supabase
          .from('polls')
          .select('*, author:profiles!polls_author_id_fkey(id, full_name, avatar_url, role, badges, is_verified)')
          .order('created_at', { ascending: false })
          .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);
          
        const { data, error } = await query;
        if (error) throw error;
        newIssues = data || [];
      } else {
        let query = supabase
          .from('issues')
          .select('*, author:profiles!issues_author_id_fkey(id, full_name, avatar_url, role, badges, is_verified), issue_comments(count)')
          .eq('is_deleted', false)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

        if (feedTab === 'following' && profile) {
          if (followingUsers.size > 0) {
            query = query.in('author_id', Array.from(followingUsers));
          } else {
            query = query.eq('id', '00000000-0000-0000-0000-000000000000');
          }
        } else if (activeCategory !== 'All') {
          query = query.eq('category', activeCategory);
        }

        const { data, error } = await query;
        if (error) throw error;
        newIssues = data || [];
      }

      const moreExist = newIssues.length >= PAGE_SIZE;
      setHasMore(moreExist);
      hasMoreRef.current = moreExist;

      if (!isLoadMoreTriggered) {
        feedCache[activeCategory] = newIssues;
      }

      setIssues(prev => {
        const updated = isLoadMoreTriggered ? [...prev, ...newIssues] : newIssues;
        issuesRef.current = updated;
        return updated;
      });
      setPage(currentPage);
      pageRef.current = currentPage;

      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      loadingRef.current = false;
      loadingMoreRef.current = false;

      if (!isLoadMoreTriggered && newIssues.length > 0 && activeCategory !== 'Polls') {
        const dayAgo = new Date(Date.now() - 86400000).toISOString();
        const trending = newIssues.filter(i => new Date(i.created_at) > new Date(dayAgo) && i.upvotes_count >= 2);
        setTrendingCount(trending.length);
      }

      if (profile && !isLoadMoreTriggered) {
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
  }, [activeCategory, profile, feedTab, followingUsers]);

  useEffect(() => {
    issuesRef.current = issues;
  }, [issues]);

  useEffect(() => {
    setPage(1);
    fetchIssues(false, issuesRef.current.length > 0);
  }, [activeCategory, profile?.id, feedTab]);

  useFocusEffect(
    useCallback(() => {
      fetchIssues(false, true);
    }, [fetchIssues])
  );

  useEffect(() => {
    fetchWeather();

    const channel = supabase
      .channel(`public:issues_feed_${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'issues' }, (payload) => {
        if (payload.new && payload.new.author_id === profile?.id) {
          fetchIssues(false, true);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'issues' }, (payload) => {
        setIssues(prev => prev.map(issue => issue.id === payload.new.id ? { ...issue, ...payload.new } : issue));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'issues' }, (payload) => {
        setIssues(prev => prev.filter(issue => issue.id !== payload.old.id));
      })
      .subscribe();

    const autoSyncTimer = setInterval(() => {
      fetchIssues(false, false);
    }, 60000);

    return () => {
      clearInterval(autoSyncTimer);
      supabase.removeChannel(channel);
    };
  }, [profile, fetchIssues]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
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
      }
    } catch (e: unknown) {
      fetchIssues();
    }
  }, [profile, fetchIssues, router]);

  const handleTranslate = useCallback(async (issueId: string, text: string) => {
    if (!text.trim()) return;

    setTranslating(prev => ({ ...prev, [issueId]: true }));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|en`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      if (data && data.responseData && data.responseData.translatedText) {
        setTranslationsCache(prev => ({ ...prev, [issueId]: data.responseData.translatedText }));
      }
    } catch (e: unknown) {
      setTranslationsCache(prev => ({ ...prev, [issueId]: text }));
    } finally {
      clearTimeout(timeoutId);
      setTranslating(prev => ({ ...prev, [issueId]: false }));
    }
  }, []);

  const handlePollVote = (pollId: string, options: string[], newVotes: Record<string, string>) => {
    setIssues(prev => prev.map(item => item.id === pollId ? { ...item, votes: newVotes } : item) as any);
  };

  const handleEditPost = useCallback((issue: Issue) => {
    setEditingIssue(issue);
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
    if (!editDescription.trim()) {
      showAlert('Error', 'Description cannot be empty');
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
      showAlert('Success', 'Post updated successfully');
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = useCallback(async (issue: Issue) => {
    showAlert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Soft delete keeps comments and upvotes intact
              
              const { error } = await supabase.from('issues').update({ is_deleted: true, status: 'rejected' }).eq('id', issue.id);
              if (error) {
                console.warn('Supabase post delete note:', error);
              }
              setIssues(prev => prev.filter(i => i.id !== issue.id));
              showAlert('Deleted', 'Post has been deleted.');
            } catch (e: any) {
              setIssues(prev => prev.filter(i => i.id !== issue.id));
              showAlert('Deleted', 'Post removed.');
            }
          }
        }
      ]
    );
  }, [showAlert]);

  const handleStatusChange = useCallback(async (issue: Issue, newStatus: string) => {
    try {
      const { error } = await supabase.from('issues').update({ status: newStatus }).eq('id', issue.id);
      if (error) throw error;
      setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: newStatus as any } : i));
      showAlert('Status Updated', `Issue status changed to ${newStatus.replace('_', ' ')}.`);
    } catch (e: any) {
      showAlert('Error', e.message);
    }
  }, [showAlert]);

  const renderSkeleton = useCallback(() => (
    <View className="px-4 mb-4">
      <Skeleton height={200} borderRadius={20} />
    </View>
  ), []);

  const renderItem = useCallback(({ item, extraData }: any) => {
    if ('question' in item) {
      return (
        <View className="mb-1.5 px-3">
          <PollCard poll={item} onVote={handlePollVote} />
        </View>
      );
    }
    
    return (
      <View className="mb-0.5 px-3">
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
          onStatusChange={handleStatusChange}
        />
      </View>
    );
  }, [handleLike, handleTranslate, handleFollowToggle, handleEditPost, handleDeletePost, handleStatusChange]);

  const formattedDate = getNepaliDate(new Date(), language);

  const WeatherIcon = condition === 'Clear' ? Sun : condition === 'Rain' ? CloudRain : Cloud;
  const weatherColor = condition === 'Clear' ? '#f59e0b' : condition === 'Rain' ? '#38bdf8' : '#94a3b8';

  const RenderListFooter = () => (
    <View>
      {loadingMore ? (
        <View className="py-4 items-center">
          <ActivityIndicator color={theme.isDark ? '#818cf8' : '#4f46e5'} />
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      {/* Stitch Civic Modern Top Bar */}
      <View className="px-5 pt-2 pb-2 z-10">
        <View className="flex-row items-center justify-between">
          {/* Left: Municipality Crest & Branding */}
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-2xl bg-indigo-600/10 items-center justify-center mr-2.5 border border-indigo-500/20">
              <Landmark size={20} color={theme.accentColor} />
            </View>
            <View>
              <View className="flex-row items-center">
                <Text className={`font-black text-[20px] tracking-tight ${theme.textClass}`}>
                  Simraungadh
                </Text>
                <View className="ml-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">सिम्रौनगढ</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Right: Actions (Language toggle, Search) */}
          <View className="flex-row items-center gap-2">
            {/* Language Switcher */}
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setLanguage(language === 'en' ? 'ne' : 'en');
              }}
              activeOpacity={0.75}
              className={`px-2.5 py-1.5 rounded-full border flex-row items-center ${
                theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <Globe size={13} color={theme.iconColor} />
              <Text className={`ml-1 text-[11px] font-bold ${theme.textClass}`}>
                {language === 'en' ? 'नेपाली' : 'EN'}
              </Text>
            </TouchableOpacity>

            {/* Search Trigger */}
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); router.push('/search'); }}
              activeOpacity={0.75}
              className={`w-9 h-9 rounded-full items-center justify-center border ${
                theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <Search size={16} color={theme.iconColor} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Category Chips */}
      <View className="pl-4 pb-2 pt-1 z-0">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 6, paddingRight: 20 }}>
          {/* Following Chip */}
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFeedTab(feedTab === 'following' ? 'all' : 'following'); setActiveCategory('All'); }}
            activeOpacity={0.8}
            className={`flex-row items-center px-4 py-2 mr-2 rounded-full border ${
              feedTab === 'following' 
                ? 'bg-indigo-600 border-indigo-600 shadow-sm'
                : (theme.isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white border-slate-200/80')
            }`}
          >
            <Users size={14} color={feedTab === 'following' ? '#ffffff' : theme.iconColor} strokeWidth={2.4} />
            <Text className={`ml-2 font-bold text-[13px] ${
              feedTab === 'following' 
                ? 'text-white'
                : theme.textSecondaryClass
            }`}>
              Following
            </Text>
          </TouchableOpacity>

          {/* Category Chips */}
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.name && feedTab === 'all';
            const IconComp = cat.icon;

            return (
              <TouchableOpacity
                key={cat.name}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFeedTab('all'); setActiveCategory(cat.name); }}
                activeOpacity={0.8}
                className={`flex-row items-center px-4 py-2 mr-2 rounded-full border ${
                  isActive 
                    ? 'bg-indigo-600 border-indigo-600 shadow-sm'
                    : (theme.isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white border-slate-200/80')
                }`}
              >
                <IconComp size={14} color={isActive ? '#ffffff' : theme.iconColor} strokeWidth={isActive ? 2.4 : 2} />
                <Text className={`ml-2 font-bold text-[13px] ${
                  isActive 
                    ? 'text-white'
                    : theme.textSecondaryClass
                }`}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>



      <View style={{ flex: 1 }}>


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
              tintColor={theme.isDark ? '#818cf8' : '#4f46e5'}
              colors={['#4f46e5']}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={RenderListFooter}
          ListEmptyComponent={
            !loading ? (
              <View className="items-center justify-center py-20 px-6">
                <View className="relative items-center justify-center mb-6">
                  <View className={`absolute w-32 h-32 rounded-full ${theme.isDark ? 'bg-indigo-500/10' : 'bg-indigo-50/60'}`} />
                  <LinearGradient
                    colors={theme.isDark ? ['#6366f1', '#4f46e5'] : ['#818cf8', '#6366f1']}
                    style={[{ borderRadius: 24, width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }, theme.cardShadow]}
                  >
                    {feedTab === 'following' ? <Users size={28} color="#fff" /> : <Inbox size={28} color="#fff" />}
                  </LinearGradient>
                  <View className={`absolute -top-1 -right-2 p-1.5 rounded-full ${theme.isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                    <Sparkles size={14} color={theme.isDark ? '#fbbf24' : '#f59e0b'} />
                  </View>
                </View>
                <Text className={`font-black text-lg mb-2 text-center tracking-tight ${theme.textClass}`}>
                  {feedTab === 'following' ? 'No Following Activity' : t.no_issues}
                </Text>
                <Text className={`text-[14px] text-center max-w-[280px] leading-relaxed ${theme.textSecondaryClass}`}>
                  {feedTab === 'following'
                    ? 'Tap on a citizen\'s avatar or profile to follow them and see their civic reports here!'
                    : (t.no_issues_sub || 'No civic reports reported yet in this category. Be the first to report something!')}
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
The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
