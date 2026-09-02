// @ts-nocheck
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, Dimensions, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Share, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useLangStore } from '../../store/langStore';
import { useBookmarkStore } from '../../store/bookmarkStore';
import { useAlert } from '../../components/AlertProvider';
import { translations } from '../../lib/translations';
import { 
  BarChart2, Search, Share2, Settings, Plus, Camera, Check, 
  CheckCircle2, ChevronRight, X, ShieldCheck, Heart, MessageSquare, 
  Repeat, Send, MoreHorizontal, UserPlus, Users, Sparkles, MapPin, 
  Bookmark, BookmarkCheck, LayoutGrid, Award, Clock, Wrench, Edit3, ImagePlus, User, Globe
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { uploadImage } from '../../lib/imageStorage';
import { Issue, IssueStatus } from '../../lib/types';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import AnimatedCard from '../../components/AnimatedCard';
import Badge from '../../components/Badge';
import { UserBadges } from '../../components/UserBadges';
import IssueImageCarousel from '../../components/IssueImageCarousel';
import UserListModal from '../../components/UserListModal';
import FullScreenImageViewer from '../../components/FullScreenImageViewer';
import { useTheme } from '../../hooks/use-theme';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 32 - 16) / 3;

const PROFILE_TABS = ['Posts', 'Replies', 'Media', 'Saved'];

export default function ProfileScreen() {
  const { profile, fetchUserProfile } = useAuthStore();
  const { language } = useLangStore();
  const { bookmarkedIssueIds, toggleBookmark } = useBookmarkStore();
  const t = translations[language] || translations.en;
  const router = useRouter();
  const { showAlert } = useAlert();
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState('Posts');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [userReplies, setUserReplies] = useState<any[]>([]);
  const [savedIssues, setSavedIssues] = useState<Issue[]>([]);
  const [likedIssueIds, setLikedIssueIds] = useState<Set<string>>(new Set());

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Follow counts and modals
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showUserList, setShowUserList] = useState(false);
  const [userListTab, setUserListTab] = useState<'followers' | 'following'>('followers');

  // Modals
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);

  // Fullscreen media preview
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Edit profile form state
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWard, setEditWard] = useState('');
  const [editTole, setEditTole] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Finish Profile tasks completion state
  const [dismissOnboarding, setDismissOnboarding] = useState(false);

  const isDark = theme.isDark;
  const username = profile?.username || profile?.full_name?.toLowerCase().replace(/\s+/g, '') || 'citizen';

  useEffect(() => {
    if (profile) {
      setEditName(profile.full_name || '');
      setEditBio(profile.bio || '');
      setEditDepartment(profile.department || '');
      setEditPhone(profile.phone_number || '');
      setEditWard(profile.home_ward?.toString() || '');
      setEditTole(profile.tole || '');
    }
  }, [profile]);

  const profileId = profile?.id;
  const profileRole = profile?.role;

  const fetchProfileData = useCallback(async (isSilent = false) => {
    if (!profileId) return;
    if (!isSilent && issues.length === 0) {
      setLoading(true);
    }
    try {
      // 1. Fetch User Posts
      let query = supabase
        .from('issues')
        .select('*, author:profiles!issues_author_id_fkey(id, full_name, avatar_url, role, badges, is_verified), issue_comments(count)')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (profileRole === 'official') {
        query = query.neq('status', 'resolved');
      } else {
        query = query.eq('author_id', profileId);
      }

      const { data: postsData } = await query;
      setIssues(postsData || []);

      // 2. Fetch User Follow Counts
      const { count: fCount } = await supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', profileId);
      setFollowersCount(fCount || 0);

      const { count: fwCount } = await supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId);
      setFollowingCount(fwCount || 0);

      // 3. Fetch User Replies / Comments
      const { data: commentsData } = await supabase
        .from('issue_comments')
        .select('id, content, created_at, issue_id, issue:issues(id, title, author_id)')
        .eq('author_id', profileId)
        .order('created_at', { ascending: false })
        .limit(30);

      setUserReplies(commentsData || []);

      // 4. Fetch User Saved / Bookmarked Posts
      if (bookmarkedIssueIds.length > 0) {
        const { data: savedData } = await supabase
          .from('issues')
          .select('*, author:profiles!issues_author_id_fkey(id, full_name, avatar_url, role, badges, is_verified), issue_comments(count)')
          .in('id', bookmarkedIssueIds)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false });

        setSavedIssues(savedData || []);
      } else {
        setSavedIssues([]);
      }

      // 5. Fetch Liked Issues
      const { data: likesData } = await supabase
        .from('issue_likes')
        .select('issue_id')
        .eq('user_id', profileId);

      if (likesData) {
        setLikedIssueIds(new Set(likesData.map(l => l.issue_id)));
      }
    } catch (e) {
      console.error('Error fetching profile data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profileId, profileRole, bookmarkedIssueIds]);

  useEffect(() => {
    fetchProfileData(issues.length > 0);
  }, [fetchProfileData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfileData(true);
  }, [fetchProfileData]);

  const handleLikeToggle = async (issueId: string) => {
    if (!profile) {
      router.push('/login');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isCurrentlyLiked = likedIssueIds.has(issueId);

    setLikedIssueIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyLiked) next.delete(issueId);
      else next.add(issueId);
      return next;
    });

    setIssues(prev => prev.map(i => {
      if (i.id === issueId) {
        const currentCount = i.upvotes || 0;
        return { ...i, upvotes: isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1 };
      }
      return i;
    }));

    try {
      if (isCurrentlyLiked) {
        await supabase.from('issue_likes').delete().eq('issue_id', issueId).eq('user_id', profile.id);
      } else {
        await supabase.from('issue_likes').insert({ issue_id: issueId, user_id: profile.id });
      }
    } catch (e) {
      console.error('Like toggle error', e);
    }
  };

  const handleBookmarkToggle = (issueId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toggleBookmark(issueId);
  };

  const handleSharePost = async (post: Issue) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `📢 "${post.title}"\n\n${post.description}\n\nShared from Simraungadh Civic Hub: https://simraungadh.live/issue/${post.id}`
      });
    } catch (e) {}
  };

  const pickAvatar = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setUploadingAvatar(true);
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 400, height: 400 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        if (manipResult.base64 && profile) {
          const publicUrl = await uploadImage(manipResult.base64, 'avatars', profile.id);
          if (publicUrl) {
            await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
            await fetchUserProfile();
            showAlert('Updated', 'Profile picture updated successfully!');
          }
        }
      } catch (e) {
        showAlert('Error', 'Failed to upload profile picture.');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    if (!editName.trim()) {
      showAlert('Error', 'Name cannot be empty.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const updates: any = { 
        full_name: editName.trim(),
        bio: editBio.trim() || null,
        phone_number: editPhone.trim() || null,
        tole: editTole.trim() || null,
      };
      
      if (editWard.trim()) {
        const wardNum = parseInt(editWard.trim(), 10);
        if (!isNaN(wardNum)) updates.home_ward = wardNum;
      } else {
        updates.home_ward = null;
      }

      if (profile.role === 'official' || profile.role === 'admin') {
        updates.department = editDepartment.trim();
      }

      const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
      if (error) throw error;

      await fetchUserProfile();
      setShowEditProfile(false);
      showAlert('Success', 'Profile updated successfully!');
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleShareProfile = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Connect with ${profile?.full_name || 'me'} on Simraungadh Hub! @${username}\nhttps://simraungadh.live/user/${profile?.id}`
      });
    } catch (e) {}
  };

  // Collect all photos from user's posts for Media Tab
  const allMediaPhotos = useMemo(() => {
    const photos: { url: string; postId: string; title: string }[] = [];
    issues.forEach(i => {
      if (i.image_urls && Array.isArray(i.image_urls)) {
        i.image_urls.forEach(u => photos.push({ url: u, postId: i.id, title: i.title }));
      } else if (i.image_url) {
        if (i.image_url.startsWith('[') && i.image_url.endsWith(']')) {
          try {
            const parsed = JSON.parse(i.image_url);
            if (Array.isArray(parsed)) parsed.forEach(u => photos.push({ url: u, postId: i.id, title: i.title }));
          } catch (e) {
            photos.push({ url: i.image_url, postId: i.id, title: i.title });
          }
        } else {
          photos.push({ url: i.image_url, postId: i.id, title: i.title });
        }
      }
    });
    return photos;
  }, [issues]);

  // Unauthenticated screen
  if (!profile) {
    return (
      <SafeAreaView edges={['top']} className={`flex-1 items-center justify-center p-8 ${theme.bgClass}`}>
        <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
          <User size={36} color={theme.iconColor} />
        </View>
        <Text className={`font-black text-2xl mb-2 ${theme.textClass}`}>{t.notLoggedIn || 'Join the Community'}</Text>
        <Text className={`text-center mb-6 text-[14px] leading-relaxed ${theme.textSecondaryClass}`}>
          {t.signInDesc || 'Sign in to share civic updates, report issues, and follow your neighbors.'}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/login')}
          className={`w-full py-4 rounded-2xl items-center ${isDark ? 'bg-white' : 'bg-black'}`}
        >
          <Text className={`font-bold text-[15px] ${isDark ? 'text-black' : 'text-white'}`}>{t.signIn || 'Log In'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Onboarding Tasks
  const onboardingTasks = [
    {
      id: 'follow',
      title: 'Follow 10 profiles',
      desc: 'Fill your feed with posts that interest you.',
      done: followingCount >= 10,
      actionText: 'See profiles',
      onPress: () => router.push('/search'),
      icon: Users,
    },
    {
      id: 'post',
      title: 'Create post',
      desc: 'Say what\'s on your mind or share a civic update.',
      done: issues.length > 0,
      actionText: issues.length > 0 ? 'Done' : 'Create post',
      onPress: () => router.push('/report'),
      icon: Check,
    },
    {
      id: 'ward',
      title: 'Add ward & tole',
      desc: 'Connect with neighbors in your local ward.',
      done: !!profile.home_ward,
      actionText: profile.home_ward ? 'Done' : 'Complete profile',
      onPress: () => router.push('/complete-profile'),
      icon: MapPin,
    },
  ];

  const tasksRemaining = onboardingTasks.filter(t => !t.done).length;

  const renderHeader = () => (
    <View className="px-5 pt-2">
      {/* 1. TOP NAVBAR */}
      <View className="flex-row items-center justify-between pb-3">
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowInsightsModal(true); }}
          className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}
        >
          <BarChart2 size={20} color={theme.iconColor} />
        </TouchableOpacity>

        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.push('/search')}
            className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}
          >
            <Search size={20} color={theme.iconColor} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShareProfile}
            className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}
          >
            <Share2 size={19} color={theme.iconColor} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/settings')}
            className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}
          >
            <Settings size={20} color={theme.iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. PROFILE HERO ROW */}
      <View className="flex-row items-start justify-between mt-3 mb-2">
        <View className="flex-1 mr-4">
          <Text className={`font-bold text-[25px] tracking-tight ${theme.textClass}`}>
            {profile.full_name}
          </Text>

          <View className="flex-row items-center mt-0.5">
            <Text className={`font-semibold text-[14px] ${theme.textSecondaryClass}`}>
              @{username}
            </Text>
            <View className="ml-1">
              <UserBadges badges={profile.badges || (profile.is_verified ? ['verified'] : [])} size={15} />
            </View>
          </View>

          {/* Bio text */}
          <Text className={`text-[14px] font-normal leading-relaxed mt-2.5 ${theme.textClass}`}>
            {profile.bio || (profile.department ? `🏛️ Official · ${profile.department}` : `Citizen of Simraungadh Municipality${profile.home_ward ? ` · Ward ${profile.home_ward}` : ''}`)}
          </Text>

          {/* Followers row */}
          <TouchableOpacity
            onPress={() => { setUserListTab('followers'); setShowUserList(true); }}
            className="flex-row items-center mt-3"
            activeOpacity={0.7}
          >
            <View className="flex-row -space-x-2 mr-2">
              <View className={`w-5 h-5 rounded-full border-2 ${isDark ? 'border-black bg-zinc-700' : 'border-white bg-indigo-500'} items-center justify-center`}>
                <Text className="text-[9px] font-bold text-white">S</Text>
              </View>
              <View className={`w-5 h-5 rounded-full border-2 ${isDark ? 'border-black bg-zinc-600' : 'border-white bg-emerald-500'} items-center justify-center`}>
                <Text className="text-[9px] font-bold text-white">R</Text>
              </View>
            </View>
            <Text className={`text-[13px] font-medium ${theme.textMutedClass}`}>
              {followersCount} followers
            </Text>
          </TouchableOpacity>
        </View>

        {/* Right Column: Avatar with (+) floating badge */}
        <View className="relative">
          <TouchableOpacity
            onPress={() => profile.avatar_url && setShowAvatarViewer(true)}
            activeOpacity={0.85}
          >
            {profile.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{ width: 72, height: 72, borderRadius: 36 }}
                transition={200}
              />
            ) : (
              <View className={`w-[72px] h-[72px] rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-indigo-50'}`}>
                <Text className={`font-black text-2xl ${isDark ? 'text-white' : 'text-indigo-600'}`}>
                  {profile.full_name?.[0]?.toUpperCase() || 'C'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* (+) Floating story / avatar button */}
          <TouchableOpacity
            onPress={pickAvatar}
            activeOpacity={0.8}
            className={`absolute -bottom-1 -left-1 w-6 h-6 rounded-full items-center justify-center border-2 ${isDark ? 'bg-white border-black' : 'bg-black border-white'}`}
          >
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color={isDark ? '#000' : '#fff'} />
            ) : (
              <Plus size={13} color={isDark ? '#000' : '#fff'} strokeWidth={3} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. SIDE-BY-SIDE BUTTONS [ Edit profile ] & [ Share profile ] */}
      <View className="flex-row gap-3 mt-4 mb-4">
        <TouchableOpacity
          onPress={() => setShowEditProfile(true)}
          activeOpacity={0.8}
          className={`flex-1 py-2.5 rounded-2xl items-center justify-center border ${
            isDark ? 'bg-white/[0.04] border-white/15' : 'bg-white border-slate-200'
          }`}
        >
          <Text className={`font-bold text-[14px] ${theme.textClass}`}>
            Edit profile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShareProfile}
          activeOpacity={0.8}
          className={`flex-1 py-2.5 rounded-2xl items-center justify-center border ${
            isDark ? 'bg-white/[0.04] border-white/15' : 'bg-white border-slate-200'
          }`}
        >
          <Text className={`font-bold text-[14px] ${theme.textClass}`}>
            Share profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. SEGMENTED UNDERLINED TABS (Posts | Replies | Media | Saved) */}
      <View className={`flex-row border-b ${isDark ? 'border-white/10' : 'border-slate-200/80'} mt-1`}>
        {PROFILE_TABS.map(tab => {
          const isSelected = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab(tab);
              }}
              activeOpacity={0.8}
              className="flex-1 items-center py-3 relative"
            >
              <Text className={`font-bold text-[14px] ${
                isSelected 
                  ? theme.textClass 
                  : theme.textMutedClass
              }`}>
                {tab}
              </Text>
              {isSelected && (
                <View className={`absolute bottom-0 left-4 right-4 h-[2px] rounded-full ${isDark ? 'bg-white' : 'bg-black'}`} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 5. FINISH YOUR PROFILE / ONBOARDING CAROUSEL */}
      {!dismissOnboarding && tasksRemaining > 0 && activeTab === 'Posts' && (
        <View className="mt-4 mb-2">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text className={`font-semibold text-[13px] ${theme.textSecondaryClass}`}>
              Finish your profile
            </Text>
            <View className="flex-row items-center gap-2">
              <Text className={`text-[12px] font-medium ${theme.textMutedClass}`}>
                {tasksRemaining} left
              </Text>
              <TouchableOpacity onPress={() => setDismissOnboarding(true)}>
                <X size={14} color={theme.iconColor} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {onboardingTasks.map(task => {
              const IconComp = task.icon;
              return (
                <View
                  key={task.id}
                  style={{ width: width * 0.52 }}
                  className={`p-4 rounded-3xl border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200/80'}`}
                >
                  <View className={`w-10 h-10 rounded-full items-center justify-center mb-3 ${task.done ? 'bg-emerald-500/20' : (isDark ? 'bg-white/10' : 'bg-white')}`}>
                    <IconComp size={18} color={task.done ? '#10b981' : theme.iconColor} />
                  </View>

                  <Text className={`font-bold text-[14px] mb-1 ${theme.textClass}`}>{task.title}</Text>
                  <Text className={`text-[12px] leading-relaxed mb-4 ${theme.textMutedClass}`} numberOfLines={2}>
                    {task.desc}
                  </Text>

                  <TouchableOpacity
                    onPress={task.onPress}
                    disabled={task.done}
                    className={`py-2 rounded-xl items-center ${
                      task.done
                        ? (isDark ? 'bg-white/5 border border-white/5' : 'bg-slate-100 border border-slate-200')
                        : (isDark ? 'bg-white' : 'bg-black')
                    }`}
                  >
                    <Text className={`font-bold text-[12.5px] ${
                      task.done
                        ? theme.textMutedClass
                        : (isDark ? 'text-black' : 'text-white')
                    }`}>
                      {task.actionText}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );

  // Render Post Card
  const renderPostItem = ({ item }: { item: Issue }) => {
    const hasPhotos = (item.image_urls && item.image_urls.length > 0) || item.image_url;
    const photos = item.image_urls && item.image_urls.length > 0 ? item.image_urls : item.image_url ? [item.image_url] : [];
    const isLiked = likedIssueIds.has(item.id);
    const isBookmarked = bookmarkedIssueIds.includes(item.id);

    return (
      <TouchableOpacity
        onPress={() => router.push(`/issue/${item.id}`)}
        activeOpacity={0.8}
        className={`px-5 py-4 border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}
      >
        <View className="flex-row items-start">
          {/* Left: Avatar with vertical connecting line */}
          <View className="items-center mr-3">
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={{ width: 38, height: 38, borderRadius: 19 }} />
            ) : (
              <View className={`w-[38px] h-[38px] rounded-full items-center justify-center ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                <Text className={`font-bold text-sm ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{profile?.full_name?.[0]}</Text>
              </View>
            )}
            <View className={`w-[2px] flex-1 my-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
          </View>

          {/* Right: Content */}
          <View className="flex-1">
            {/* Header: Username + timeAgo */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Text className={`font-bold text-[14.5px] mr-1 ${theme.textClass}`}>{username}</Text>
                {profile?.is_verified && (
                  <View className="mr-1.5">
                    <UserBadges badges={profile.badges || ['verified']} size={13} />
                  </View>
                )}
                <Text className={`text-[12px] ${theme.textMutedClass}`}>
                  · {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity className="p-1">
                <MoreHorizontal size={16} color={theme.iconColor} />
              </TouchableOpacity>
            </View>

            {/* Post Title & Description */}
            <Text className={`font-bold text-[15px] mt-1 ${theme.textClass}`}>{item.title}</Text>
            <Text className={`text-[13.5px] leading-relaxed mt-1 ${theme.textSecondaryClass}`}>{item.description}</Text>

            {/* Image Carousel / Photo */}
            {hasPhotos && photos.length > 0 && (
              <View className="mt-2.5 rounded-2xl overflow-hidden">
                <IssueImageCarousel
                  imageUrls={photos}
                  height={200}
                  onImagePress={(url, idx) => {
                    setPreviewImages(photos);
                    setPreviewIndex(idx);
                    setPreviewVisible(true);
                  }}
                />
              </View>
            )}

            {/* Civic Status Pill */}
            <View className="flex-row items-center mt-2.5 gap-2">
              <View className={`px-2.5 py-0.5 rounded-full border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                <Text className={`text-[11px] font-semibold ${theme.textSecondaryClass}`}>Ward {item.ward_number || 1} · {item.category}</Text>
              </View>
              {item.status === 'resolved' ? (
                <View className="px-2 py-0.5 rounded-full bg-emerald-500/15">
                  <Text className="text-emerald-500 text-[10.5px] font-bold">Resolved</Text>
                </View>
              ) : (
                <View className="px-2 py-0.5 rounded-full bg-amber-500/15">
                  <Text className="text-amber-500 text-[10.5px] font-bold">In Progress</Text>
                </View>
              )}
            </View>

            {/* Interactive Actions (Heart, Comment, Repost, Bookmark, Share) */}
            <View className="flex-row items-center justify-between mt-3 pt-1">
              <View className="flex-row items-center gap-5">
                <TouchableOpacity onPress={() => handleLikeToggle(item.id)} className="flex-row items-center">
                  <Heart size={18} color={isLiked ? '#f43f5e' : theme.iconColor} fill={isLiked ? '#f43f5e' : 'none'} />
                  {item.upvotes > 0 && (
                    <Text className={`text-[12px] font-bold ml-1.5 ${isLiked ? 'text-rose-500' : theme.textMutedClass}`}>{item.upvotes}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push(`/issue/${item.id}`)} className="flex-row items-center">
                  <MessageSquare size={18} color={theme.iconColor} />
                  <Text className={`text-[12px] font-medium ml-1.5 ${theme.textMutedClass}`}>{item.issue_comments?.[0]?.count || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleSharePost(item)} className="flex-row items-center">
                  <Repeat size={18} color={theme.iconColor} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleSharePost(item)} className="flex-row items-center">
                  <Send size={18} color={theme.iconColor} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => handleBookmarkToggle(item.id)} className="p-1">
                {isBookmarked ? (
                  <BookmarkCheck size={18} color={theme.accentColor} />
                ) : (
                  <Bookmark size={18} color={theme.iconColor} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render Reply Card
  const renderReplyItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => router.push(`/issue/${item.issue_id}`)}
      activeOpacity={0.8}
      className={`px-5 py-4 border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}
    >
      <View className="flex-row items-start">
        <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
          <MessageSquare size={16} color={theme.accentColor} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text className={`font-bold text-[13.5px] ${theme.textClass}`}>
              Replied to &quot;{item.issue?.title || 'Civic Post'}&quot;
            </Text>
            <Text className={`text-[11.5px] ${theme.textMutedClass}`}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
          <Text className={`text-[13px] leading-relaxed ${theme.textSecondaryClass}`}>{item.content}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      {/* POSTS TAB */}
      {activeTab === 'Posts' && (
        <FlatList
          data={issues}
          keyExtractor={item => item.id}
          renderItem={renderPostItem}
          ListHeaderComponent={renderHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.accentColor]} tintColor={theme.accentColor} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <View className="py-20 items-center justify-center">
                <ActivityIndicator size="small" color={theme.accentColor} />
              </View>
            ) : (
              <View className="py-20 items-center justify-center px-6">
                <Text className={`font-bold text-base mb-1 ${theme.textClass}`}>No posts yet</Text>
                <Text className={`text-center text-[13px] mb-4 ${theme.textMutedClass}`}>
                  When you publish civic reports and updates, they will appear here.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/report')}
                  className={`px-5 py-2.5 rounded-2xl ${isDark ? 'bg-white' : 'bg-black'}`}
                >
                  <Text className={`font-bold text-[13px] ${isDark ? 'text-black' : 'text-white'}`}>Create post</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}

      {/* REPLIES TAB */}
      {activeTab === 'Replies' && (
        <FlatList
          data={userReplies}
          keyExtractor={item => item.id}
          renderItem={renderReplyItem}
          ListHeaderComponent={renderHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.accentColor]} tintColor={theme.accentColor} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <View className="py-20 items-center justify-center">
                <ActivityIndicator size="small" color={theme.accentColor} />
              </View>
            ) : (
              <View className="py-20 items-center justify-center px-6">
                <Text className={`font-bold text-base mb-1 ${theme.textClass}`}>No replies yet</Text>
                <Text className={`text-center text-[13px] ${theme.textMutedClass}`}>
                  Your replies on civic community discussions will show up here.
                </Text>
              </View>
            )
          }
        />
      )}

      {/* MEDIA TAB (Visual 3-column photo grid) */}
      {activeTab === 'Media' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.accentColor]} tintColor={theme.accentColor} />}
        >
          {renderHeader()}
          {allMediaPhotos.length === 0 ? (
            <View className="py-20 items-center justify-center px-6">
              <Text className={`font-bold text-base mb-1 ${theme.textClass}`}>No media yet</Text>
              <Text className={`text-center text-[13px] ${theme.textMutedClass}`}>
                Photos and documents you attach to posts will appear here.
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap px-4 gap-2 py-3">
              {allMediaPhotos.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.85}
                  onPress={() => {
                    setPreviewImages(allMediaPhotos.map(p => p.url));
                    setPreviewIndex(idx);
                    setPreviewVisible(true);
                  }}
                  style={{ width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE, borderRadius: 16, overflow: 'hidden' }}
                  className={`border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'}`}
                >
                  <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* SAVED TAB */}
      {activeTab === 'Saved' && (
        <FlatList
          data={savedIssues}
          keyExtractor={item => item.id}
          renderItem={renderPostItem}
          ListHeaderComponent={renderHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.accentColor]} tintColor={theme.accentColor} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <View className="py-20 items-center justify-center">
                <ActivityIndicator size="small" color={theme.accentColor} />
              </View>
            ) : (
              <View className="py-20 items-center justify-center px-6">
                <Text className={`font-bold text-base mb-1 ${theme.textClass}`}>No saved posts</Text>
                <Text className={`text-center text-[13px] ${theme.textMutedClass}`}>
                  Tap the bookmark icon on any post or circular to save it for later.
                </Text>
              </View>
            )
          }
        />
      )}

      {/* EDIT PROFILE MODAL */}
      <Modal visible={showEditProfile} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end bg-black/70">
          <View className={`rounded-t-[32px] p-6 max-h-[85%] border-t ${isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-slate-200'}`}>
            <View className="flex-row items-center justify-between mb-5">
              <Text className={`font-black text-xl ${theme.textClass}`}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)} className="p-1">
                <X size={20} color={theme.iconColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className={`text-[12px] font-bold uppercase mb-1.5 ${theme.textMutedClass}`}>Full Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                className={`p-3.5 rounded-2xl mb-4 text-[14px] font-medium border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-black'}`}
                placeholder="Your Name"
                placeholderTextColor={theme.inputPlaceholder}
              />

              <Text className={`text-[12px] font-bold uppercase mb-1.5 ${theme.textMutedClass}`}>Bio</Text>
              <TextInput
                value={editBio}
                onChangeText={setEditBio}
                multiline
                numberOfLines={3}
                className={`p-3.5 rounded-2xl mb-4 text-[14px] font-medium border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-black'}`}
                placeholder="Write something about yourself..."
                placeholderTextColor={theme.inputPlaceholder}
              />

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className={`text-[12px] font-bold uppercase mb-1.5 ${theme.textMutedClass}`}>Ward (1 - 10)</Text>
                  <TextInput
                    value={editWard}
                    onChangeText={setEditWard}
                    keyboardType="number-pad"
                    className={`p-3.5 rounded-2xl mb-4 text-[14px] font-medium border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-black'}`}
                    placeholder="e.g. 3"
                    placeholderTextColor={theme.inputPlaceholder}
                  />
                </View>
                <View className="flex-1">
                  <Text className={`text-[12px] font-bold uppercase mb-1.5 ${theme.textMutedClass}`}>Tole / Village</Text>
                  <TextInput
                    value={editTole}
                    onChangeText={setEditTole}
                    className={`p-3.5 rounded-2xl mb-4 text-[14px] font-medium border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-black'}`}
                    placeholder="e.g. Kankali"
                    placeholderTextColor={theme.inputPlaceholder}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
                className={`py-4 rounded-2xl items-center mt-2 mb-6 ${isDark ? 'bg-white' : 'bg-black'}`}
              >
                {isSavingProfile ? (
                  <ActivityIndicator color={isDark ? '#000' : '#fff'} size="small" />
                ) : (
                  <Text className={`font-bold text-[15px] ${isDark ? 'text-black' : 'text-white'}`}>Save Profile</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CIVIC IMPACT INSIGHTS MODAL */}
      <Modal visible={showInsightsModal} animationType="fade" transparent>
        <View className="flex-1 justify-center items-center bg-black/70 px-5">
          <View className={`w-full rounded-3xl p-6 border ${isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-slate-200'}`}>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <BarChart2 size={20} color={isDark ? '#818cf8' : '#4f46e5'} />
                <Text className={`font-black text-lg ml-2 ${theme.textClass}`}>Civic Impact Insights</Text>
              </View>
              <TouchableOpacity onPress={() => setShowInsightsModal(false)} className="p-1">
                <X size={18} color={theme.iconColor} />
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className={`flex-1 p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <Text className={`text-[11px] font-bold uppercase tracking-wider ${theme.textMutedClass}`}>Total Posts</Text>
                <Text className={`font-black text-2xl mt-1 ${theme.textClass}`}>{issues.length}</Text>
              </View>
              <View className={`flex-1 p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <Text className={`text-[11px] font-bold uppercase tracking-wider ${theme.textMutedClass}`}>Followers</Text>
                <Text className={`font-black text-2xl mt-1 ${theme.textClass}`}>{followersCount}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowInsightsModal(false)}
              className={`py-3.5 rounded-2xl items-center ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}
            >
              <Text className={`font-bold text-[14px] ${theme.textClass}`}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Followers / Following List Modal */}
      <UserListModal
        visible={showUserList}
        onClose={() => setShowUserList(false)}
        userId={profile.id}
        initialTab={userListTab}
      />

      {/* Fullscreen Avatar / Media Viewer */}
      {previewVisible && (
        <FullScreenImageViewer
          visible={previewVisible}
          images={previewImages}
          initialIndex={previewIndex}
          onClose={() => setPreviewVisible(false)}
        />
      )}
      {profile.avatar_url && (
        <FullScreenImageViewer
          visible={showAvatarViewer}
          images={[profile.avatar_url]}
          initialIndex={0}
          onClose={() => setShowAvatarViewer(false)}
        />
      )}
    </SafeAreaView>
  );
}
