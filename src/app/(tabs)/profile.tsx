// @ts-nocheck
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, RefreshControl, 
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, 
  Share, ActivityIndicator, Linking 
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useLangStore } from '../../store/langStore';
import { useBookmarkStore } from '../../store/bookmarkStore';
import { useAlert } from '../../components/AlertProvider';
import { translations } from '../../lib/translations';
import { 
  Search, Share2, Settings, Plus, Camera, Check, 
  CheckCircle2, ChevronRight, X, Heart, MessageSquare, 
  Navigation, MapPin, Bookmark, BookmarkCheck, PhoneCall, 
  Building2, Edit3, User, Globe, AlertTriangle, Users, UserCheck
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { uploadImage } from '../../lib/imageStorage';
import { Issue, cleanCivicDescription } from '../../lib/types';
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

const PROFILE_TABS = ['My Reports', 'Saved'];

export default function ProfileScreen() {
  const { profile, fetchUserProfile } = useAuthStore();
  const { language } = useLangStore();
  const { bookmarkedIssueIds, toggleBookmark } = useBookmarkStore();
  const t = translations[language] || translations.en;
  const router = useRouter();
  const { showAlert } = useAlert();
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState<'My Reports' | 'Saved'>('My Reports');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [savedIssues, setSavedIssues] = useState<Issue[]>([]);
  const [likedIssueIds, setLikedIssueIds] = useState<Set<string>>(new Set());

  // Followers & Following state
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showUserList, setShowUserList] = useState(false);
  const [userListTab, setUserListTab] = useState<'followers' | 'following'>('followers');

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Modals
  const [showEditProfile, setShowEditProfile] = useState(false);
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

      // 2. Fetch User Saved / Bookmarked Posts
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

      // 3. Fetch Liked Issues
      const { data: likesData } = await supabase
        .from('issue_likes')
        .select('issue_id')
        .eq('user_id', profileId);

      if (likesData) {
        setLikedIssueIds(new Set(likesData.map(l => l.issue_id)));
      }

      // 4. Fetch Followers and Following counts
      const { count: fCount } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileId);
      setFollowersCount(fCount || 0);

      const { count: fwCount } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileId);
      setFollowingCount(fwCount || 0);
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
        const currentCount = i.upvotes_count || i.upvotes || 0;
        return { 
          ...i, 
          upvotes_count: isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
          upvotes: isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1 
        };
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
        message: `📢 "${post.title}"\n\n${post.description}\n\n📍 Ward ${post.ward_number || 1}, Simraungadh\nhttps://simraungadh.live/issue/${post.id}`
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
        message: `Connect with ${profile?.full_name || 'me'} on Simraungadh Civic App! @${username}\nhttps://simraungadh.live/user/${profile?.id}`
      });
    } catch (e) {}
  };

  // Unauthenticated screen
  if (!profile) {
    return (
      <SafeAreaView edges={['top']} className={`flex-1 items-center justify-center p-8 ${theme.bgClass}`}>
        <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
          <User size={36} color={theme.iconColor} />
        </View>
        <Text className={`font-black text-2xl mb-2 ${theme.textClass}`}>{t.notLoggedIn || 'Join the Community'}</Text>
        <Text className={`text-center mb-6 text-[14px] leading-relaxed ${theme.textSecondaryClass}`}>
          {t.signInDesc || 'Sign in to share civic updates, report issues, and access municipal services.'}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/login')}
          className="w-full py-4 rounded-2xl items-center bg-indigo-600 shadow-sm"
        >
          <Text className="font-bold text-[15px] text-white">{t.signIn || 'Log In'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Civic Stats Calculations (from Stitch spec)
  const totalReportsCount = issues.length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const totalUpvotesCount = issues.reduce((acc, curr) => acc + (curr.upvotes_count || curr.upvotes || 0), 0);

  const renderHeader = () => (
    <View className="px-5 pt-2">
      {/* 1. TOP NAVBAR */}
      <View className="flex-row items-center justify-between pb-3">
        <View className="flex-row items-center">
          <Text className={`font-bold text-[17px] tracking-tight ${theme.textClass}`}>
            @{username}
          </Text>
        </View>

        <View className="flex-row items-center gap-2.5">
          <TouchableOpacity
            onPress={() => router.push('/search')}
            activeOpacity={0.75}
            className={`w-10 h-10 rounded-full items-center justify-center border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200/80'}`}
          >
            <Search size={18} color={theme.iconColor} strokeWidth={2.2} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShareProfile}
            activeOpacity={0.75}
            className={`w-10 h-10 rounded-full items-center justify-center border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200/80'}`}
          >
            <Share2 size={18} color={theme.iconColor} strokeWidth={2.2} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/settings')}
            activeOpacity={0.75}
            className={`w-10 h-10 rounded-full items-center justify-center border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200/80'}`}
          >
            <Settings size={18} color={theme.iconColor} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. PROFILE HERO CARD (Stitch Civic Modern) */}
      <View 
        className={`p-5 rounded-[28px] border mb-4 relative overflow-hidden ${
          isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-slate-200/70'
        }`}
        style={theme.cardShadow}
      >
        <LinearGradient
          colors={isDark ? ['rgba(79, 70, 229, 0.15)', 'transparent'] : ['rgba(79, 70, 229, 0.06)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
        />

        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center flex-wrap gap-1.5">
              <Text className={`font-black text-[23px] tracking-tight ${theme.textClass}`}>
                {profile.full_name}
              </Text>
              {profile.is_verified && (
                <UserBadges badges={profile.badges || ['verified']} size={16} />
              )}
            </View>

            {/* Resident / Official Verification Pill */}
            <View className="flex-row items-center mt-1.5">
              <View className="flex-row items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
                <CheckCircle2 size={12} color="#10B981" />
                <Text className="text-[11.5px] font-bold text-emerald-600 dark:text-emerald-400 ml-1.5">
                  {profile.role === 'official' ? 'Municipal Official' : profile.role === 'admin' ? 'Municipality Admin' : 'Verified Resident'}
                  {profile.home_ward ? ` • Ward ${profile.home_ward}` : ''}
                </Text>
              </View>
            </View>

            {/* Address / Tole info */}
            {profile.tole && (
              <View className="flex-row items-center mt-2">
                <MapPin size={12} color={theme.accentColor} />
                <Text className={`text-[12.5px] font-medium ml-1.5 ${theme.textMutedClass}`}>
                  {profile.tole}, Simraungadh
                </Text>
              </View>
            )}

            {/* Bio */}
            <Text className={`text-[13.5px] leading-relaxed mt-2.5 font-normal ${theme.textSecondaryClass}`}>
              {profile.bio || (profile.department ? `🏛️ ${profile.department} Department` : 'Citizen of Simraungadh contributing to a cleaner, safer municipality.')}
            </Text>

            {/* Followers & Following Interactive Bar */}
            <View className="flex-row items-center gap-2.5 mt-3.5">
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setUserListTab('followers');
                  setShowUserList(true);
                }}
                activeOpacity={0.75}
                className={`flex-row items-center px-3.5 py-1.5 rounded-full border ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <Users size={14} color={theme.accentColor} />
                <Text className={`ml-1.5 text-[12.5px] font-bold ${theme.textClass}`}>
                  {followersCount} <Text className={`font-semibold ${theme.textMutedClass}`}>Followers</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setUserListTab('following');
                  setShowUserList(true);
                }}
                activeOpacity={0.75}
                className={`flex-row items-center px-3.5 py-1.5 rounded-full border ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <UserCheck size={14} color="#10B981" />
                <Text className={`ml-1.5 text-[12.5px] font-bold ${theme.textClass}`}>
                  {followingCount} <Text className={`font-semibold ${theme.textMutedClass}`}>Following</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar with Camera Update Trigger */}
          <View className="relative">
            <TouchableOpacity
              onPress={() => profile.avatar_url && setShowAvatarViewer(true)}
              activeOpacity={0.85}
              className="p-1 rounded-full border-2 border-indigo-500/20 dark:border-indigo-400/30"
            >
              {profile.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={{ width: 74, height: 74, borderRadius: 37 }}
                  transition={200}
                />
              ) : (
                <View className={`w-[74px] h-[74px] rounded-full items-center justify-center ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                  <Text className={`font-black text-2xl ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                    {profile.full_name?.[0]?.toUpperCase() || 'C'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={pickAvatar}
              activeOpacity={0.8}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full items-center justify-center bg-indigo-600 border-2 border-white dark:border-black shadow-sm"
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Camera size={13} color="#ffffff" strokeWidth={2.4} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. CIVIC IMPACT STATS GRID (Stitch Civic Modern) */}
        <View className="flex-row gap-2.5 mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
          {/* Reports Submitted */}
          <View className={`flex-1 p-3 rounded-2xl items-center ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
            <View className="w-8 h-8 rounded-full bg-indigo-500/15 items-center justify-center mb-1">
              <Navigation size={15} color={theme.accentColor} />
            </View>
            <Text className={`font-black text-[17px] ${theme.textClass}`}>
              {totalReportsCount}
            </Text>
            <Text className={`text-[10.5px] font-semibold ${theme.textMutedClass}`}>
              Reported
            </Text>
          </View>

          {/* Issues Resolved */}
          <View className={`flex-1 p-3 rounded-2xl items-center ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
            <View className="w-8 h-8 rounded-full bg-emerald-500/15 items-center justify-center mb-1">
              <CheckCircle2 size={15} color="#10B981" />
            </View>
            <Text className={`font-black text-[17px] ${theme.textClass}`}>
              {resolvedCount}
            </Text>
            <Text className={`text-[10.5px] font-semibold ${theme.textMutedClass}`}>
              Resolved
            </Text>
          </View>

          {/* Community Upvotes */}
          <View className={`flex-1 p-3 rounded-2xl items-center ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
            <View className="w-8 h-8 rounded-full bg-amber-500/15 items-center justify-center mb-1">
              <Heart size={15} color="#F59E0B" />
            </View>
            <Text className={`font-black text-[17px] ${theme.textClass}`}>
              {totalUpvotesCount}
            </Text>
            <Text className={`text-[10.5px] font-semibold ${theme.textMutedClass}`}>
              Upvotes
            </Text>
          </View>
        </View>
      </View>

      {/* 4. ACTIONS: [ Edit Profile ] & [ Share Profile ] */}
      <View className="flex-row gap-2.5 mb-3">
        <TouchableOpacity
          onPress={() => setShowEditProfile(true)}
          activeOpacity={0.8}
          className="flex-1 rounded-2xl overflow-hidden shadow-sm"
        >
          <LinearGradient
            colors={['#4F46E5', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
          >
            <Edit3 size={15} color="#ffffff" />
            <Text className="font-bold text-[13.5px] text-white ml-2">
              Edit Profile
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShareProfile}
          activeOpacity={0.8}
          className={`flex-1 py-3 rounded-2xl border flex-row items-center justify-center ${
            isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-slate-200/80'
          }`}
          style={theme.cardShadow}
        >
          <Share2 size={15} color={theme.iconColor} />
          <Text className={`font-bold text-[13.5px] ml-2 ${theme.textClass}`}>
            Share Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* 5. WARD CIVIC UTILITY CARD */}
      <View 
        className={`p-3.5 rounded-[22px] border mb-4 flex-row items-center justify-between ${
          isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-slate-200/70'
        }`}
        style={theme.cardShadow}
      >
        <View className="flex-row items-center flex-1 mr-2">
          <View className="w-9 h-9 rounded-xl bg-indigo-500/10 items-center justify-center mr-2.5">
            <Building2 size={18} color={theme.accentColor} />
          </View>
          <View className="flex-1">
            <Text className={`font-bold text-[13px] ${theme.textClass}`}>
              Ward {profile.home_ward || 1} Municipal Office
            </Text>
            <Text className={`text-[11px] font-medium ${theme.textMutedClass}`}>
              Contact desk: 053-411072 • Sun-Fri, 10-5
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Linking.openURL('tel:053411072');
          }}
          activeOpacity={0.8}
          className="px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex-row items-center"
        >
          <PhoneCall size={12} color="#10B981" />
          <Text className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 ml-1.5">Call</Text>
        </TouchableOpacity>
      </View>

      {/* 6. STREAMLINED CIVIC TABS: [ My Reports | Saved Items ] */}
      <View className={`flex-row p-1 rounded-2xl border mb-3 ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200/60'}`}>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab('My Reports');
          }}
          activeOpacity={0.8}
          className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
            activeTab === 'My Reports'
              ? (isDark ? 'bg-white/10' : 'bg-white shadow-sm')
              : 'bg-transparent'
          }`}
        >
          <Text className={`font-bold text-[13px] ${
            activeTab === 'My Reports'
              ? (isDark ? 'text-indigo-300' : 'text-indigo-600')
              : theme.textMutedClass
          }`}>
            My Reports ({totalReportsCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab('Saved');
          }}
          activeOpacity={0.8}
          className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
            activeTab === 'Saved'
              ? (isDark ? 'bg-white/10' : 'bg-white shadow-sm')
              : 'bg-transparent'
          }`}
        >
          <Text className={`font-bold text-[13px] ${
            activeTab === 'Saved'
              ? (isDark ? 'text-indigo-300' : 'text-indigo-600')
              : theme.textMutedClass
          }`}>
            Saved ({savedIssues.length})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render Civic Issue Item (Stitch Civic Modern Card)
  const renderIssueItem = ({ item }: { item: Issue }) => {
    const hasPhotos = (item.image_urls && item.image_urls.length > 0) || item.image_url;
    const photos = item.image_urls && item.image_urls.length > 0 ? item.image_urls : item.image_url ? [item.image_url] : [];
    const isLiked = likedIssueIds.has(item.id);
    const isBookmarked = bookmarkedIssueIds.includes(item.id);

    return (
      <View className="px-5 mb-3">
        <TouchableOpacity
          onPress={() => router.push(`/issue/${item.id}`)}
          activeOpacity={0.85}
          className={`p-4 rounded-[26px] border ${
            isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-slate-200/70'
          }`}
          style={theme.cardShadow}
        >
          {/* Header Row: Ward, Date, Status */}
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mr-2">
                <Text className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  {item.category || 'General'}
                </Text>
              </View>
              <Text className={`text-[11px] font-medium ${theme.textMutedClass}`}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>

            {/* Status Pill */}
            {item.status === 'resolved' ? (
              <View className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                <Text className="text-emerald-600 dark:text-emerald-400 text-[10.5px] font-bold">Resolved</Text>
              </View>
            ) : item.status === 'in_progress' ? (
              <View className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30">
                <Text className="text-indigo-600 dark:text-indigo-400 text-[10.5px] font-bold">In Progress</Text>
              </View>
            ) : (
              <View className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                <Text className="text-amber-600 dark:text-amber-400 text-[10.5px] font-bold">Pending</Text>
              </View>
            )}
          </View>

          {/* Title & Description */}
          <Text className={`font-bold text-[15.5px] mb-1 tracking-tight ${theme.textClass}`}>
            {item.title}
          </Text>
          <Text className={`text-[13.5px] leading-relaxed ${theme.textSecondaryClass}`} numberOfLines={3}>
            {cleanCivicDescription(item.description)}
          </Text>

          {/* Photos Carousel if available */}
          {hasPhotos && photos.length > 0 && (
            <View className="mt-3 rounded-2xl overflow-hidden">
              <IssueImageCarousel
                imageUrls={photos}
                height={180}
                onImagePress={(url, idx) => {
                  setPreviewImages(photos);
                  setPreviewIndex(idx);
                  setPreviewVisible(true);
                }}
              />
            </View>
          )}

          {/* Interactive Footer */}
          <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5">
            <View className="flex-row items-center gap-4">
              <TouchableOpacity 
                onPress={() => handleLikeToggle(item.id)} 
                activeOpacity={0.7}
                className="flex-row items-center"
              >
                <Heart size={16} color={isLiked ? '#f43f5e' : theme.iconColor} fill={isLiked ? '#f43f5e' : 'none'} />
                <Text className={`text-[12px] font-bold ml-1.5 ${isLiked ? 'text-rose-500' : theme.textMutedClass}`}>
                  {item.upvotes_count || item.upvotes || 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => router.push(`/issue/${item.id}`)} 
                activeOpacity={0.7}
                className="flex-row items-center"
              >
                <MessageSquare size={16} color={theme.iconColor} />
                <Text className={`text-[12px] font-medium ml-1.5 ${theme.textMutedClass}`}>
                  {item.issue_comments?.[0]?.count || 0}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center gap-3">
              <TouchableOpacity onPress={() => handleBookmarkToggle(item.id)} activeOpacity={0.7} className="p-1">
                {isBookmarked ? (
                  <BookmarkCheck size={18} color={theme.accentColor} />
                ) : (
                  <Bookmark size={18} color={theme.iconColor} />
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleSharePost(item)} activeOpacity={0.7} className="p-1">
                <Share2 size={16} color={theme.iconColor} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const currentData = activeTab === 'My Reports' ? issues : savedIssues;

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      <FlatList
        data={currentData}
        keyExtractor={item => item.id}
        renderItem={renderIssueItem}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.accentColor]} tintColor={theme.accentColor} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        ListEmptyComponent={
          loading ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="small" color={theme.accentColor} />
              <Text className={`text-[13px] font-medium mt-3 ${theme.textMutedClass}`}>Loading...</Text>
            </View>
          ) : (
            <View className="py-16 items-center justify-center px-6">
              <View className={`w-16 h-16 rounded-[24px] items-center justify-center mb-3 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                {activeTab === 'My Reports' ? (
                  <Navigation size={26} color={theme.iconColor} />
                ) : (
                  <Bookmark size={26} color={theme.iconColor} />
                )}
              </View>
              <Text className={`font-bold text-base mb-1 ${theme.textClass}`}>
                {activeTab === 'My Reports' ? 'No reports submitted yet' : 'No saved issues'}
              </Text>
              <Text className={`text-center text-[13px] mb-5 ${theme.textMutedClass}`}>
                {activeTab === 'My Reports' 
                  ? 'Submit issues or updates about roads, water, or municipal services.' 
                  : 'Tap the bookmark icon on any issue to save it for quick access.'}
              </Text>

              {activeTab === 'My Reports' && (
                <TouchableOpacity
                  onPress={() => router.push('/report')}
                  activeOpacity={0.8}
                  className="px-6 py-3 rounded-full bg-indigo-600 shadow-sm"
                >
                  <Text className="font-bold text-[13.5px] text-white">Create Civic Report</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />

      {/* EDIT PROFILE MODAL */}
      <Modal visible={showEditProfile} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end bg-black/70">
          <View className={`rounded-t-[32px] p-6 max-h-[88%] border-t ${isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-slate-200'}`}>
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

              <Text className={`text-[12px] font-bold uppercase mb-1.5 ${theme.textMutedClass}`}>Bio / Note</Text>
              <TextInput
                value={editBio}
                onChangeText={setEditBio}
                multiline
                numberOfLines={3}
                className={`p-3.5 rounded-2xl mb-4 text-[14px] font-medium border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-black'}`}
                placeholder="Tell neighbors about your civic interests..."
                placeholderTextColor={theme.inputPlaceholder}
              />

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className={`text-[12px] font-bold uppercase mb-1.5 ${theme.textMutedClass}`}>Ward (1 - 11)</Text>
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
                    placeholder="e.g. Ranivas"
                    placeholderTextColor={theme.inputPlaceholder}
                  />
                </View>
              </View>

              <Text className={`text-[12px] font-bold uppercase mb-1.5 ${theme.textMutedClass}`}>Phone Number (Optional)</Text>
              <TextInput
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                className={`p-3.5 rounded-2xl mb-4 text-[14px] font-medium border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-black'}`}
                placeholder="053-XXXXXX or 98XXXXXXXX"
                placeholderTextColor={theme.inputPlaceholder}
              />

              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
                className="py-4 rounded-2xl items-center mt-2 mb-6 bg-indigo-600 shadow-sm"
              >
                {isSavingProfile ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="font-bold text-[15px] text-white">Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* FULLSCREEN AVATAR VIEWER */}
      {profile.avatar_url && (
        <FullScreenImageViewer
          visible={showAvatarViewer}
          imageUrls={[profile.avatar_url]}
          initialIndex={0}
          onClose={() => setShowAvatarViewer(false)}
        />
      )}

      {/* FULLSCREEN ISSUE PHOTO VIEWER */}
      {previewImages.length > 0 && (
        <FullScreenImageViewer
          visible={previewVisible}
          imageUrls={previewImages}
          initialIndex={previewIndex}
          onClose={() => setPreviewVisible(false)}
        />
      )}

      {/* USER LIST MODAL (FOLLOWERS & FOLLOWING) */}
      <UserListModal
        visible={showUserList}
        onClose={() => {
          setShowUserList(false);
          fetchProfileData(true);
        }}
        userId={profile?.id}
        userName={profile?.full_name}
        initialTab={userListTab}
      />
    </SafeAreaView>
  );
}
