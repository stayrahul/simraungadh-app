// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, User, Shield, Inbox, UserCheck, UserPlus, Users } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { Issue, Profile } from '../../lib/types';
import FeedCard from '../../components/FeedCard';
import Badge from '../../components/Badge';
import Skeleton from '../../components/Skeleton';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/use-theme';
import { UserBadges } from '../../components/UserBadges';
import { useLangStore } from '../../store/langStore';
import { translations } from '../../lib/translations';
import UserListModal from '../../components/UserListModal';
import { createNotification } from '../../lib/notifications';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile: currentUserProfile } = useAuthStore();
  const theme = useTheme();
  const { language } = useLangStore();
  const t = translations[language] || translations.en;
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowedBy, setIsFollowedBy] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [userListTab, setUserListTab] = useState<'followers' | 'following'>('followers');

  const [likedIssues, setLikedIssues] = useState<Set<string>>(new Set());
  const [translationsCache, setTranslationsCache] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
        
      if (profileError) throw profileError;
      setProfile(profileData);

      const { data: issuesData, error: issuesError } = await supabase
        .from('issues')
        .select('*, author:profiles!issues_author_id_fkey(id, full_name, avatar_url, role)')
        .eq('author_id', id)
        .eq('is_anonymous', false)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (issuesError) throw issuesError;
      setIssues(issuesData || []);

      const { count: fCount } = await supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', id);
      setFollowersCount(fCount || 0);

      const { count: fwCount } = await supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', id);
      setFollowingCount(fwCount || 0);

      if (currentUserProfile) {
        if (currentUserProfile.id !== id) {
          const { data: followData } = await supabase
            .from('user_follows')
            .select('*')
            .match({ follower_id: currentUserProfile.id, following_id: id })
            .maybeSingle();
          setIsFollowing(!!followData);

          const { data: followedByData } = await supabase
            .from('user_follows')
            .select('*')
            .match({ follower_id: id, following_id: currentUserProfile.id })
            .maybeSingle();
          setIsFollowedBy(!!followedByData);
        }
        const { data: likes } = await supabase
          .from('issue_upvotes')
          .select('issue_id')
          .eq('user_id', currentUserProfile.id);
        
        if (likes) {
          setLikedIssues(new Set(likes.map(l => l.issue_id)));
        }
      }
    } catch (e) {
      console.error('Error fetching user profile data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, currentUserProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleFollowToggle = useCallback(async () => {
    if (!currentUserProfile) {
      router.push('/login');
      return;
    }
    if (isFollowLoading) return;

    setIsFollowLoading(true);
    const previousIsFollowing = isFollowing;
    const previousFollowersCount = followersCount;

    setIsFollowing(!previousIsFollowing);
    setFollowersCount(prev => prev + (previousIsFollowing ? -1 : 1));

    try {
      if (previousIsFollowing) {
        await supabase.from('user_follows').delete().match({ follower_id: currentUserProfile.id, following_id: id });
      } else {
        await supabase.from('user_follows').insert({ follower_id: currentUserProfile.id, following_id: id });
        createNotification({
          userId: id,
          title: 'New Follower',
          body: `${currentUserProfile.full_name || 'A citizen'} started following you.`,
          type: 'new_follow',
          referenceId: currentUserProfile.id,
        });
      }
    } catch (e: unknown) {
      setIsFollowing(previousIsFollowing);
      setFollowersCount(previousFollowersCount);
      console.error('Follow toggle error', e);
    } finally {
      setIsFollowLoading(false);
    }
  }, [currentUserProfile, isFollowLoading, isFollowing, followersCount, id, router]);

  const handleLike = useCallback(async (issueId: string, isLiked: boolean) => {
    if (!currentUserProfile) {
      router.push('/login');
      return;
    }

    try {
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
        await supabase.from('issue_upvotes').delete().match({ issue_id: issueId, user_id: currentUserProfile.id });
      } else {
        await supabase.from('issue_upvotes').insert({ issue_id: issueId, user_id: currentUserProfile.id });
      }
    } catch (e) {
      fetchData();
    }
  }, [currentUserProfile, id]);

  const handleTranslate = useCallback(async (issueId: string, text: string) => {
    if (!text.trim()) return;
    setTranslating(prev => ({ ...prev, [issueId]: true }));
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|en`);
      const data = await res.json();

      if (data && data.responseData && data.responseData.translatedText) {
        setTranslationsCache(prev => ({ ...prev, [issueId]: data.responseData.translatedText }));
      }
    } catch (e) {
      console.error('Translation failed', e);
    } finally {
      setTranslating(prev => ({ ...prev, [issueId]: false }));
    }
  }, []);

  const renderHeader = () => {
    if (!profile) return null;
    const isSelf = currentUserProfile?.id === profile.id;

    return (
      <View className="mb-6">
        <SafeAreaView edges={['top']} className="px-4 pt-3 pb-2">
          {/* Header Bar */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity 
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} 
              className={`w-10 h-10 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
            >
              <ArrowLeft size={20} color={theme.iconColor} />
            </TouchableOpacity>
            <View className="w-10 h-10" />
          </View>

          {/* Profile Card */}
          <View className="items-center mb-4">
            <View className="relative mb-3">
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={{ width: 72, height: 72, borderRadius: 36 }} cachePolicy="memory-disk" transition={200} />
              ) : (
                <View className={`w-[72px] h-[72px] rounded-full justify-center items-center ${theme.isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                  <User size={32} color={theme.isDark ? '#818cf8' : '#5b5ef6'} />
                </View>
              )}
            </View>

            <View className="flex-1 items-center">
              <View className="flex-row items-center mb-1">
                <Text className={`text-xl font-bold tracking-tight ${theme.textClass}`}>{profile.full_name || 'Citizen'}</Text>
                <UserBadges badges={profile.badges || (profile.is_verified ? ['verified'] : [])} size={18} />
              </View>
              <Text className={`text-[13px] mb-2 ${theme.textSecondaryClass}`}>{profile.tole ? `${profile.tole}, Ward ${profile.home_ward}` : 'Location unknown'}</Text>
            </View>

            <Badge 
              type={profile.role === 'official' ? 'department' : 'general'} 
              text={profile.department || (profile.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Citizen')} 
              className="mt-1.5" 
              size="md" 
            />

            {/* Follow stats */}
            <View className={`flex-row items-center justify-around mt-5 py-3 px-4 w-full rounded-[24px] ${theme.isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={() => { setUserListTab('followers'); setShowUserList(true); }}
                className="items-center flex-1"
              >
                <Text className={`font-bold text-[17px] ${theme.textClass}`}>{followersCount}</Text>
                <Text className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${theme.textMutedClass}`}>{t.followers}</Text>
              </TouchableOpacity>

              <View className={`w-px h-6 ${theme.isDark ? 'bg-white/[0.08]' : 'bg-slate-200'}`} />

              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={() => { setUserListTab('following'); setShowUserList(true); }}
                className="items-center flex-1"
              >
                <Text className={`font-bold text-[17px] ${theme.textClass}`}>{followingCount}</Text>
                <Text className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${theme.textMutedClass}`}>{t.following}</Text>
              </TouchableOpacity>

              <View className={`w-px h-6 ${theme.isDark ? 'bg-white/[0.08]' : 'bg-slate-200'}`} />

              <View className="items-center flex-1">
                <Text className={`font-bold text-[17px] ${theme.textClass}`}>{issues.length}</Text>
                <Text className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${theme.textMutedClass}`}>{t.reports}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            {!isSelf && (
              <View className="mt-4 w-full">
                <TouchableOpacity
                  onPress={handleFollowToggle}
                  disabled={isFollowLoading}
                  activeOpacity={0.8}
                  className="w-full"
                >
                  {isFollowing && isFollowedBy ? (
                    <View className={`h-11 rounded-[24px] items-center justify-center flex-row ${theme.isDark ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
                      <Users size={16} color={theme.isDark ? '#a78bfa' : '#7c3aed'} />
                      <Text className={`font-bold text-[14px] ml-2 ${theme.isDark ? 'text-primary-400' : 'text-primary'}`}>{t.friends || 'Friends 🤝'}</Text>
                    </View>
                  ) : isFollowing ? (
                    <View className={`h-11 rounded-[24px] items-center justify-center flex-row ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                      <UserCheck size={16} color={theme.isDark ? '#34d399' : '#059669'} />
                      <Text className={`font-bold text-[14px] ml-2 ${theme.textClass}`}>{t.following}</Text>
                    </View>
                  ) : (
                    <LinearGradient
                      colors={['#6366f1', '#4f46e5']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ height: 44, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <UserPlus size={16} color="#ffffff" />
                      <Text className="font-bold text-[14px] ml-2 color-white">{isFollowedBy ? (t.followBack || 'Follow Back') : t.follow}</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text className={`font-bold text-[15px] mt-2 ml-0.5 ${theme.textClass}`}>Public Reports ({issues.length})</Text>
        </SafeAreaView>
      </View>
    );
  };

  return (
    <View className={`flex-1 ${theme.bgClass}`}>
      <FlatList
        data={loading ? [] : issues}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <FeedCard
            item={item}
            isLiked={likedIssues.has(item.id)}
            onLike={handleLike}
            translationsCache={translationsCache}
            translating={translating}
            onTranslate={handleTranslate}
            isFollowingAuthor={isFollowing}
            isFollowedByAuthor={isFollowedBy}
            onFollowToggle={handleFollowToggle}
          />
        )}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#5b5ef6']} tintColor={theme.isDark ? '#818cf8' : '#5b5ef6'} />}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-12 px-6">
              <View className={`w-14 h-14 rounded-[24px] items-center justify-center mb-3 ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                <Inbox size={24} color={theme.iconColor} />
              </View>
              <Text className={`font-medium text-center text-[13px] ${theme.textSecondaryClass}`}>
                No public reports posted yet.
              </Text>
            </View>
          ) : (
            <View className="px-4">
              <Skeleton height={140} className="w-full rounded-[24px] mb-3" />
            </View>
          )
        }
      />
      
      {profile && (
        <UserListModal
          visible={showUserList}
          onClose={() => setShowUserList(false)}
          userId={profile.id}
          userName={profile.full_name || 'User'}
          initialTab={userListTab}
        />
      )}
    </View>
  );
}
