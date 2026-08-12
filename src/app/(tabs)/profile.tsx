// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, Dimensions, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, Share, ActivityIndicator, Animated } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useLangStore } from '../../store/langStore';
import { useAlert } from '../../components/AlertProvider';
import { translations } from '../../lib/translations';
import { ArrowLeft, Settings, Camera, Clock, Wrench, Send, File, Star, ShieldCheck, CheckCircle2, Inbox, UserX, LogIn, Award, TrendingUp, Globe, Sparkles, Check, Bookmark, Phone, Pencil, X, HelpCircle, ImagePlus, Trash2, LogOut, Moon, Sun, Bell, Edit3, Target, Activity, Heart, PlusCircle, ChevronRight, Share2, LayoutGrid, List } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { uploadImage } from '../../lib/imageStorage';
import { Issue, IssueStatus } from '../../lib/types';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import AnimatedCard from '../../components/AnimatedCard';
import Badge from '../../components/Badge';
import { UserBadges } from '../../components/UserBadges';
import Skeleton from '../../components/Skeleton';
import { BadgeIcon } from '../../components/BadgeIcon';
import IssueImageCarousel from '../../components/IssueImageCarousel';
import UserListModal from '../../components/UserListModal';
import FullScreenImageViewer from '../../components/FullScreenImageViewer';
import { useTheme } from '../../hooks/use-theme';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../../store/settingsStore';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { profile, signOut, fetchUserProfile } = useAuthStore();
  const { language, toggleLanguage } = useLangStore();
  const t = translations[language];
  const router = useRouter();
  const { showAlert } = useAlert();
  const theme = useTheme();
  const { darkMode, setDarkMode } = useSettingsStore();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);

  const [editDescription, setEditDescription] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<{ uri: string; base64: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWard, setEditWard] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editTole, setEditTole] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [hideCompleteProfile, setHideCompleteProfile] = useState(false);
  const statsAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(statsAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: Platform.OS !== 'web'
    }).start();
  }, []);

  useEffect(() => {
    if (profile) {
      setEditName(profile.full_name || '');
      setEditDepartment(profile.department || '');
      setEditPhone(profile.phone_number || '');
      setEditWard(profile.home_ward?.toString() || '');
      setEditGender(profile.gender || '');
      setEditAge(profile.age?.toString() || '');
      setEditTole(profile.tole || '');
    }
  }, [profile]);

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
        phone_number: editPhone.trim() || null,
        gender: editGender.trim() || null,
        tole: editTole.trim() || null,
      };
      
      if (editWard.trim()) {
        const wardNum = parseInt(editWard.trim(), 10);
        if (!isNaN(wardNum)) updates.home_ward = wardNum;
      } else {
        updates.home_ward = null;
      }
      
      if (editAge.trim()) {
        const ageNum = parseInt(editAge.trim(), 10);
        if (!isNaN(ageNum)) updates.age = ageNum;
      } else {
        updates.age = null;
      }

      if (profile.role === 'official' || profile.role === 'admin') {
        updates.department = editDepartment.trim();
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

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


  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showUserList, setShowUserList] = useState(false);
  const [userListTab, setUserListTab] = useState<'followers' | 'following'>('followers');

  const profileId = profile?.id;
  const profileRole = profile?.role;

  const fetchIssues = useCallback(async (isSilent = false) => {
    if (!profileId) return;
    if (!isSilent && issues.length === 0) {
      setLoading(true);
    }
    try {
      let query = supabase.from('issues').select('*, author:profiles!issues_author_id_fkey(id, full_name, avatar_url, role, badges, is_verified), issue_comments(count)').eq('is_deleted', false).order('created_at', { ascending: false });
      if (profileRole === 'official') {
        query = query.neq('status', 'resolved');
      } else {
        query = query.eq('author_id', profileId);
      }
      const { data, error } = await query;
      if (error) throw error;
      setIssues(data || []);

      if (profileRole === 'citizen' || profileRole === 'official') {
        const { count: fCount } = await supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', profileId);
        setFollowersCount(fCount || 0);

        const { count: fwCount } = await supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId);
        setFollowingCount(fwCount || 0);
      }
    } catch (e) {
      console.error('Error fetching profile issues', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profileId, profileRole]);

  useEffect(() => {
    fetchIssues(issues.length > 0);
  }, [fetchIssues]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchIssues(true);
  }, [fetchIssues]);

  const handleUpdateStatus = async (issueId: string, newStatus: IssueStatus) => {
    try {
      const { error } = await supabase.from('issues').update({ status: newStatus }).eq('id', issueId);
      if (error) throw error;
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: newStatus } : i));
      if (newStatus === 'resolved') {
        setIssues(prev => prev.filter(i => i.id !== issueId));
      }
    } catch (e) {
      showAlert('Error', 'Failed to update issue.');
    }
  };

  const pickAvatar = async () => {
    if (!profile) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      base64: false,
    });

    if (!result.canceled && result.assets[0].uri) {
      setUploadingAvatar(true);
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 500, height: 500 } }],
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        const base64Data = manipResult.base64;
        if (!base64Data) throw new Error("Compression failed");

        const publicUrl = await uploadImage(base64Data, 'avatars', profile.id);

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', profile.id);

        if (updateError) throw updateError;
        
        fetchUserProfile(); 
      } catch (e) {
        showAlert('Error', (e as any).message);
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  if (!profile) {
    return (
      <SafeAreaView className={`flex-1 ${theme.bgClass}`}>
        {/* Top Navigation / Language Bar */}
        <View className="px-5 py-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Globe size={18} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
            <Text className={`font-bold text-[14px] ml-2 ${theme.textClass}`}>
              {t.language || 'Language'}
            </Text>
          </View>

          {/* Interactive Language Selector Pill */}
          <View className={`flex-row p-1 rounded-xl ${theme.isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
            <TouchableOpacity
              onPress={() => language !== 'en' && toggleLanguage()}
              className={`px-3 py-1.5 rounded-lg ${language === 'en' ? (theme.isDark ? 'bg-indigo-500/30' : 'bg-indigo-600') : ''}`}
            >
              <Text className={`text-[12px] font-bold ${language === 'en' ? 'text-white' : theme.textSecondaryClass}`}>
                English
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => language !== 'ne' && toggleLanguage()}
              className={`px-3 py-1.5 rounded-lg ${language === 'ne' ? (theme.isDark ? 'bg-indigo-500/30' : 'bg-indigo-600') : ''}`}
            >
              <Text className={`text-[12px] font-bold ${language === 'ne' ? 'text-white' : theme.textSecondaryClass}`}>
                नेपाली
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Center Card Container */}
        <View className="flex-1 justify-center items-center px-5">
          <View className={`w-full max-w-[340px] rounded-[32px] p-6 items-center border ${theme.glassCardClass}`} style={theme.cardShadow}>
            {/* Avatar Icon */}
            <View className={`w-16 h-16 rounded-[32px] items-center justify-center mb-4 ${theme.isDark ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
              <UserX size={32} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
            </View>

            {/* Title & Description */}
            <Text className={`text-xl font-bold text-center mb-2 ${theme.textClass}`}>
              {t.notLoggedIn}
            </Text>
            <Text className={`text-center text-[13px] leading-relaxed mb-6 ${theme.textSecondaryClass}`}>
              {t.signInDesc}
            </Text>

            {/* Clean Sign In Button */}
            <TouchableOpacity
              onPress={() => router.push('/login')}
              activeOpacity={0.8}
              style={{
                height: 48,
                backgroundColor: theme.isDark ? 'rgba(99, 102, 241, 0.25)' : '#4f46e5',
                borderWidth: theme.isDark ? 1 : 0,
                borderColor: 'rgba(129, 140, 248, 0.4)',
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              <LogIn size={18} color={theme.isDark ? '#818cf8' : '#ffffff'} />
              <Text className={`font-bold text-[14.5px] ml-2 ${theme.isDark ? 'text-indigo-300' : 'text-white'}`}>
                {t.signIn}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isOfficial = profile.role === 'official' || profile.role === 'admin';
  const pendingCount = issues.filter(i => i.status === 'pending').length;
  const inProgressCount = issues.filter(i => i.status === 'in_progress').length;

  const openEditModal = (issue: Issue) => {
    setEditingIssue(issue);
    setEditDescription(issue.description);
    setEditImages(issue.image_urls || (issue.image_url ? [issue.image_url] : []));
    setNewImages([]);
  };

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
      Alert.alert('Error', 'Description cannot be empty');
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

  const handleDeletePost = (issue: Issue) => {
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
              const { error } = await supabase.from('issues').update({ is_deleted: true, status: 'rejected' }).eq('id', issue.id).eq('is_deleted', false);
              if (error) throw error;
              setIssues(prev => prev.filter(i => i.id !== issue.id));
              showAlert('Deleted', 'Your post has been deleted.');
            } catch (e: any) {
              showAlert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  const renderIssue = ({ item }: { item: Issue }) => {
    const firstImage = item.image_urls?.[0] || item.image_url;
    
    return (
      <AnimatedCard 
        className={`mb-5 p-5 ${theme.glassCardClass}`} 
        style={theme.cardShadow}
        onPress={() => router.push(`/issue/${item.id}`)}
      >
        <View className="flex-row">
          {firstImage ? (
            <View className="mr-3">
              <Image 
                source={{ uri: firstImage }} 
                style={{ width: 64, height: 64, borderRadius: 12 }} 
                className={theme.isDark ? 'bg-[#1a2540]' : 'bg-slate-100'}
              />
            </View>
          ) : null}

          <View className="flex-1 justify-center">
              {item.post_type === 'report' && item.status && item.status !== 'pending' ? (
                <Badge 
                  type={item.status} 
                  text={t[item.status as keyof typeof t] || item.status.replace('_', ' ')} 
                  size="sm" 
                />
              ) : null}

            <Text className={`text-[12px] mb-2 leading-relaxed ${theme.textSecondaryClass}`} numberOfLines={2}>
              {item.description}
            </Text>
            
            <View className="flex-row justify-between items-center mt-1">
              <Text className={`text-[10px] font-medium uppercase tracking-wider ${theme.textMutedClass}`}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
              
              {item.author_id === profile?.id ? (
                <View className="flex-row items-center space-x-2">
                  <TouchableOpacity onPress={() => openEditModal(item)} className={`p-1.5 rounded-full ${theme.isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                    <Pencil size={13} color={theme.isDark ? '#818cf8' : '#6366f1'} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeletePost(item)} className={`p-1.5 rounded-full ${theme.isDark ? 'bg-rose-500/10' : 'bg-rose-50'} ml-2`}>
                    <Trash2 size={13} color={theme.isDark ? '#fb7185' : '#e11d48'} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {isOfficial ? (
          <View className={`flex-row gap-2 mt-3 pt-3 border-t ${theme.borderSubtleClass}`}>
            {item.status === 'pending' ? (
              <TouchableOpacity onPress={() => handleUpdateStatus(item.id, 'in_progress')} className={`flex-1 py-2 rounded-xl items-center ${theme.isDark ? 'bg-indigo-500/12' : 'bg-indigo-50'}`}>
                <Text className={`${theme.isDark ? 'text-primary-400' : 'text-primary'} font-semibold text-[12px]`}>
                  {t.startWork}
                </Text>
              </TouchableOpacity>
            ) : null}

            {item.status === 'in_progress' ? (
              <TouchableOpacity onPress={() => handleUpdateStatus(item.id, 'resolved')} className={`flex-1 py-2 rounded-xl items-center ${theme.isDark ? 'bg-emerald-500/12' : 'bg-emerald-50'}`}>
                <Text className={`${theme.isDark ? 'text-emerald-400' : 'text-emerald-600'} font-semibold text-[12px]`}>
                  {t.markResolved}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity onPress={() => handleUpdateStatus(item.id, 'rejected')} className={`flex-1 py-2 rounded-xl items-center ${theme.isDark ? 'bg-rose-500/12' : 'bg-rose-50'}`}>
              <Text className={`${theme.isDark ? 'text-rose-400' : 'text-rose-600'} font-semibold text-[12px]`}>
                {t.reject}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </AnimatedCard>
    );
  };

  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const totalUpvotes = issues.reduce((acc, i) => acc + (i.upvotes_count || 0), 0);

  const renderHeader = () => (
    <View className="mb-4">
      {/* Massive Blurred Background Cover Photo */}
      <View className="absolute top-0 left-0 right-0 h-80 overflow-hidden">
        {profile?.avatar_url ? (
          <>
            <Image 
              source={{ uri: profile.avatar_url }} 
              style={{ width: '100%', height: '100%' }}
              blurRadius={60}
              contentFit="cover"
            />
            <View className={`absolute inset-0 ${theme.isDark ? 'bg-[#000000]/50' : 'bg-[#f2f2f7]/60'}`} />
          </>
        ) : (
          <LinearGradient
            colors={theme.isDark ? ['#4f46e5', 'transparent'] : ['#e0e7ff', 'transparent']}
            style={{ flex: 1 }}
          />
        )}
      </View>

      <SafeAreaView edges={['top']} className="px-5 pt-4 z-10">
        {/* Navbar */}
        <View className="flex-row justify-between items-center mb-8">
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} className={`w-10 h-10 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/10' : 'bg-white shadow-sm'}`} style={!theme.isDark ? theme.cardShadow : {}}>
            <ArrowLeft size={18} color={theme.iconColor} />
          </TouchableOpacity>
          <View className="flex-1" />
          <TouchableOpacity onPress={() => router.push('/settings')} className={`w-10 h-10 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/10' : 'bg-white shadow-sm'}`} style={!theme.isDark ? theme.cardShadow : {}}>
            <Settings size={18} color={theme.iconColor} />
          </TouchableOpacity>
        </View>

        {/* Profile Info (Directly on background, no heavy card) */}
        <View className="items-center mb-6">
          {/* Avatar */}
            <View className="relative mb-5">
              <TouchableOpacity onPress={() => profile.avatar_url && setShowAvatarViewer(true)} activeOpacity={0.8}>
                {profile.avatar_url ? (
                  <Image 
                    source={{ uri: profile.avatar_url }} 
                    style={{ width: 80, height: 80, borderRadius: 40 }}
                    className="shadow-sm"
                    transition={200}
                  />
                ) : (
                  <View className={`w-20 h-20 rounded-full justify-center items-center ${theme.isDark ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
                    <Text className={`font-black text-3xl ${theme.isDark ? 'text-primary-400' : 'text-primary'}`}>
                      {profile.full_name?.[0]?.toUpperCase() || 'C'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={pickAvatar} className={`absolute bottom-0 right-[-2px] w-8 h-8 rounded-full items-center justify-center shadow-sm ${theme.isDark ? 'bg-indigo-500' : 'bg-indigo-600'}`}>
                {uploadingAvatar ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Camera size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            {/* Name & Bio Area */}
            <View className="items-center mb-6 mt-1">
              <View className="flex-row items-center flex-wrap justify-center mb-1">
                <Text className={`font-black text-[22px] tracking-tight ${theme.textClass}`}>{profile.full_name}</Text>
                <View className="ml-1.5">
                  <UserBadges badges={profile.badges || (profile.is_verified ? ['verified'] : [])} size={20} />
                </View>
              </View>
              
              {(profile.role === 'official' || profile.role === 'admin') && (
                <View className={`mt-1.5 mb-2 px-3 py-1 rounded-md ${profile.role === 'admin' ? 'bg-rose-500/15' : 'bg-amber-500/15'}`}>
                  <Text className={`text-[10.5px] font-black uppercase tracking-widest ${profile.role === 'admin' ? (theme.isDark ? 'text-rose-400' : 'text-rose-600') : (theme.isDark ? 'text-amber-400' : 'text-amber-700')}`}>{profile.role === 'admin' ? 'System Admin' : 'Official'}</Text>
                </View>
              )}

              {profile.department && (
                <Text className={`text-[13px] font-medium mt-1 ${theme.textSecondaryClass}`}>🏛️ {profile.department}</Text>
              )}
              {(profile.home_ward || profile.tole) && (
                <Text className={`text-[13px] font-medium mt-1 ${theme.textMutedClass}`}>
                  📍 {profile.tole ? `${profile.tole}, ` : ''}Ward {profile.home_ward || '—'}
                </Text>
              )}
            </View>

            {/* Stats Row (Pill design) */}
            <Animated.View 
              style={{
                opacity: statsAnim,
                transform: [
                  { translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                  { scale: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }
                ]
              }}
              className={`flex-row justify-around w-full py-4 rounded-[20px] border border-slate-100 dark:border-white/5 shadow-sm ${theme.isDark ? 'bg-white/[0.03]' : 'bg-white'}`}
            >
              <View className="items-center flex-1">
                <Text className={`font-black text-[22px] ${theme.textClass}`}>{issues.length}</Text>
                <Text className={`text-[10px] font-extrabold mt-1 tracking-widest uppercase ${theme.textMutedClass}`}>Posts</Text>
              </View>
              <View className={`w-[1px] h-full ${theme.borderClass}`} />
              <TouchableOpacity onPress={() => { setUserListTab('followers'); setShowUserList(true); }} className="items-center flex-1">
                <Text className={`font-black text-[22px] ${theme.textClass}`}>{followersCount}</Text>
                <Text className={`text-[10px] font-extrabold mt-1 tracking-widest uppercase ${theme.textMutedClass}`}>{t.followers || 'Followers'}</Text>
              </TouchableOpacity>
              <View className={`w-[1px] h-full ${theme.borderClass}`} />
              <TouchableOpacity onPress={() => { setUserListTab('following'); setShowUserList(true); }} className="items-center flex-1">
                <Text className={`font-black text-[22px] ${theme.textClass}`}>{followingCount}</Text>
                <Text className={`text-[10px] font-extrabold mt-1 tracking-widest uppercase ${theme.textMutedClass}`}>{t.following || 'Following'}</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Quick Action Buttons */}
            <View className="flex-row gap-3 w-full mt-5">
              <TouchableOpacity 
                onPress={() => setShowEditProfile(true)} 
                className={`flex-1 py-3.5 rounded-[16px] items-center justify-center flex-row shadow-sm ${theme.isDark ? 'bg-white/5' : 'bg-white border border-slate-100'}`}
              >
                <Edit3 size={18} color={theme.iconColor} />
                <Text className={`font-bold text-[14.5px] ml-2 tracking-tight ${theme.textClass}`}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={async () => {
                  try {
                    await Share.share({ message: `Check out ${profile.full_name}'s profile on Simraungadh Civic Hub! https://simraungadh.live/user/${profile.id}` });
                  } catch (e) {}
                }}
                className={`flex-1 py-3.5 rounded-[16px] items-center justify-center flex-row shadow-sm ${theme.isDark ? 'bg-white/5' : 'bg-white border border-slate-100'}`}
              >
                <Share2 size={18} color={theme.iconColor} />
                <Text className={`font-bold text-[14.5px] ml-2 tracking-tight ${theme.textClass}`}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>



        {profile.home_ward == null && !hideCompleteProfile && (
          <View 
            className={`mb-5 p-5 rounded-[32px] border flex-row items-center relative ${theme.isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}
          >
            <TouchableOpacity onPress={() => router.push('/complete-profile')} className="flex-row items-center flex-1 pr-6">
              <ShieldCheck size={18} color={theme.isDark ? '#34d399' : '#059669'} />
              <View className="flex-1 ml-3 mr-4">
                <Text className={`font-bold text-[14px] ${theme.isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Complete Your Profile</Text>
                <Text className={`text-[12px] mt-0.5 ${theme.textMutedClass}`}>Set your ward number & tole for better civic engagement</Text>
              </View>
              <ChevronRight size={16} color={theme.isDark ? '#34d399' : '#059669'} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setHideCompleteProfile(true)} 
              className="absolute top-4 right-4 p-2 rounded-full"
            >
              <X size={14} color={theme.isDark ? '#34d399' : '#059669'} />
            </TouchableOpacity>
          </View>
        )}

        {/* Admin Quick Access */}
        {profile.role === 'admin' && (
          <TouchableOpacity 
            onPress={() => router.push('/admin')} 
            className={`mb-4 p-5 rounded-[32px] border flex-row items-center justify-between ${theme.isDark ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200'}`}
            style={theme.glowShadow('#f43f5e')}
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-[20px] bg-rose-500 items-center justify-center mr-4 shadow-sm shadow-rose-500/50">
                <ShieldCheck size={22} color="#fff" />
              </View>
              <View>
                <Text className={`font-black text-[18px] tracking-tight mb-0.5 ${theme.isDark ? 'text-rose-400' : 'text-rose-600'}`}>God Mode</Text>
                <Text className={`text-[12.5px] font-bold ${theme.isDark ? 'text-rose-400/70' : 'text-rose-600/70'}`}>Full system admin access</Text>
              </View>
            </View>
            <ChevronRight size={18} color={theme.isDark ? '#fb7185' : '#e11d48'} />
          </TouchableOpacity>
        )}

        {/* Official Stats */}
        {isOfficial ? (
          <View className="mb-2">
            <View className="flex-row gap-2.5 mb-3">
              <View className={`flex-1 p-5 rounded-[32px] border items-center ${theme.glassCardClass}`} style={theme.cardShadow}>
                <View className={`w-9 h-9 rounded-xl items-center justify-center mb-2 ${theme.isDark ? 'bg-amber-500/12' : 'bg-amber-50'}`}>
                  <Clock size={17} color={theme.isDark ? '#fbbf24' : '#d97706'} />
                </View>
                <Text className={`font-medium text-[10px] mb-0.5 uppercase tracking-wider ${theme.textSecondaryClass}`}>{t.pending}</Text>
                <Text className={`font-bold text-2xl ${theme.textClass}`}>{loading ? '-' : pendingCount}</Text>
              </View>
              <View className={`flex-1 p-5 rounded-[32px] border items-center ${theme.glassCardClass}`} style={theme.cardShadow}>
                <View className={`w-9 h-9 rounded-xl items-center justify-center mb-2 ${theme.isDark ? 'bg-indigo-500/12' : 'bg-indigo-50'}`}>
                  <Wrench size={17} color={theme.isDark ? '#818cf8' : '#5b5ef6'} />
                </View>
                <Text className={`font-medium text-[10px] mb-0.5 uppercase tracking-wider ${theme.textSecondaryClass}`}>{t.in_progress}</Text>
                <Text className={`font-bold text-2xl ${theme.textClass}`}>{loading ? '-' : inProgressCount}</Text>
              </View>
            </View>
            <AnimatedCard onPress={() => router.push('/publish-notice')} className={`items-center justify-center py-3.5 flex-row rounded-[32px] ${theme.isDark ? 'bg-indigo-500/15' : 'bg-indigo-600'}`}>
              <Send size={16} color={theme.isDark ? '#818cf8' : '#fff'} />
              <Text className={`font-semibold text-[14px] ml-2 ${theme.isDark ? 'text-indigo-300' : 'text-white'}`}>{t.broadcastNotice}</Text>
            </AnimatedCard>
          </View>
        ) : null}

        <View className="mt-2 mb-2 flex-row items-center justify-between">
          <Text className={`font-black text-[15px] ml-0.5 ${theme.textClass}`}>
            {isOfficial ? t.actionRequired : 'Activity Feed'}
          </Text>
          <View className={`flex-row rounded-lg p-1 ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
            <TouchableOpacity 
              onPress={() => { Haptics.selectionAsync(); setViewMode('grid'); }}
              className={`p-1.5 rounded-md ${viewMode === 'grid' ? (theme.isDark ? 'bg-white/10' : 'bg-white shadow-sm') : ''}`}
            >
              <LayoutGrid size={16} color={viewMode === 'grid' ? theme.colors.primary : theme.iconColor} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => { Haptics.selectionAsync(); setViewMode('list'); }}
              className={`p-1.5 rounded-md ${viewMode === 'list' ? (theme.isDark ? 'bg-white/10' : 'bg-white shadow-sm') : ''}`}
            >
              <List size={16} color={viewMode === 'list' ? theme.colors.primary : theme.iconColor} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );

  return (
    <View className={`flex-1 ${theme.bgClass}`}>
      <FlatList
        key={viewMode === 'grid' ? 'grid-3' : 'list-1'}
        data={loading ? [] : issues}
        keyExtractor={item => item.id}
        numColumns={viewMode === 'grid' ? 3 : 1}
        contentContainerStyle={viewMode === 'grid' ? { paddingHorizontal: 2, paddingBottom: 100 } : { paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#5b5ef6']} tintColor={theme.isDark ? '#818cf8' : '#5b5ef6'} />}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => {
          if (viewMode === 'grid') {
            const firstImage = item.image_urls?.[0] || item.image_url;
            return (
              <TouchableOpacity 
                onPress={() => router.push(`/issue/${item.id}`)}
                className="p-0.5"
                style={{ width: '33.33%', aspectRatio: 1 }}
              >
                {firstImage ? (
                  <Image source={{ uri: firstImage }} style={{ flex: 1, borderRadius: 8 }} />
                ) : (
                  <View className={`flex-1 rounded-lg items-center justify-center p-2 ${theme.isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <Text className={`font-bold text-[10px] text-center ${theme.textSecondaryClass}`} numberOfLines={3}>{item.description}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }
          return <View className="px-5">{renderIssue({ item })}</View>;
        }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-10 px-5">
              <View className={`w-16 h-16 rounded-[32px] items-center justify-center mb-3 ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                {isOfficial ? <CheckCircle2 size={28} color={theme.iconColor} /> : <Inbox size={28} color={theme.iconColor} />}
              </View>
              <Text className={`font-medium text-center text-[13px] ${theme.textSecondaryClass}`}>
                {isOfficial ? t.inboxZero : t.noHistory}
              </Text>
            </View>
          ) : (
            <View className="px-5">
              <Skeleton height={120} className="w-full rounded-[32px] mb-3" />
              <Skeleton height={120} className="w-full rounded-[32px] mb-3" />
            </View>
          )
        }
      />
      
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

              <View className="mt-4 pt-4">
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
    </View>
  );
}
