// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, Dimensions, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useLangStore } from '../../store/langStore';
import { translations } from '../../lib/translations';
import { ArrowLeft, Settings, Camera, Clock, Wrench, Send, FileText, Star, ShieldCheck, CheckCircle2, Inbox, UserX, LogIn, Award, TrendingUp, Globe, Sparkles, Check, Bookmark, Phone, Pencil, X, HelpCircle, ImagePlus, Trash2, LogOut, Moon, Sun, Bell, Edit3, Target, Activity, Heart, PlusCircle } from 'lucide-react-native';
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
import Skeleton from '../../components/Skeleton';
import { useAlert } from '../../components/AlertProvider';
import UserListModal from '../../components/UserListModal';

import { useTheme } from '../../hooks/use-theme';
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
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<{ uri: string; base64: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWard, setEditWard] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editTole, setEditTole] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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

      if (profile.role === 'official') {
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
      let query = supabase.from('issues').select('*').order('created_at', { ascending: false });
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
          <View className={`flex-row p-1 rounded-xl border ${theme.isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100 border-slate-200'}`}>
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
          <View className={`w-full max-w-[340px] rounded-3xl p-6 items-center border ${theme.cardClass}`} style={theme.cardShadow}>
            {/* Avatar Icon */}
            <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-4 ${theme.isDark ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
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

  const isOfficial = profile.role === 'official';
  const pendingCount = issues.filter(i => i.status === 'pending').length;
  const inProgressCount = issues.filter(i => i.status === 'in_progress').length;

  const civicPoints = profile.civic_points || 0;
  const currentLevel = Math.floor(civicPoints / 100) + 1;
  const progressPercent = (civicPoints % 100);

  const openEditModal = (issue: Issue) => {
    setEditingIssue(issue);
    setEditTitle(issue.title);
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

  const handleDeletePost = (issue: Issue) => {
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
  };

  const renderIssue = ({ item }: { item: Issue }) => {
    const firstImage = item.image_urls?.[0] || item.image_url;
    
    return (
      <AnimatedCard 
        className={`mb-3 p-3 rounded-2xl border flex-col ${theme.cardClass}`} 
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
            <View className="flex-row justify-between items-start mb-1">
              <Text className={`font-semibold text-[14px] flex-1 mr-2 ${theme.textClass}`} numberOfLines={1}>
                {item.title}
              </Text>
              {item.status && item.status !== 'pending' ? (
                <Badge 
                  type={item.status} 
                  text={t[item.status as keyof typeof t] || item.status.replace('_', ' ')} 
                  size="sm" 
                />
              ) : null}
            </View>

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
                <Text className={`${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'} font-semibold text-[12px]`}>
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
    <View className="mb-6">
      <SafeAreaView edges={['top']} className="px-5 pt-4">
        {/* Navbar */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} className={`w-9 h-9 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
            <ArrowLeft size={17} color={theme.iconColor} />
          </TouchableOpacity>
          <Text className={`font-bold text-[16px] ${theme.textClass}`}>{isOfficial ? t.workspace : t.myProfile}</Text>
          <TouchableOpacity onPress={() => router.push('/settings')} className={`w-9 h-9 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
            <Settings size={17} color={theme.iconColor} />
          </TouchableOpacity>
        </View>

        {/* Avatar & Info */}
        <View className="items-center mb-5">
          <TouchableOpacity onPress={pickAvatar} className="relative mb-3">
            {profile.avatar_url ? (
              <Image 
                source={{ uri: profile.avatar_url }} 
                style={{ width: 88, height: 88, borderRadius: 44 }}
                className={theme.isDark ? 'bg-[#1a2540]' : 'bg-slate-100'}
                transition={200}
              />
            ) : (
              <View className={`w-[88px] h-[88px] rounded-full justify-center items-center ${theme.isDark ? 'bg-[#1a2540]' : 'bg-slate-100'}`}>
                <Text className={`font-black text-3xl ${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {profile.full_name?.[0]?.toUpperCase() || (isOfficial ? 'O' : 'C')}
                </Text>
              </View>
            )}
            <View className={`absolute bottom-0 right-0 w-8 h-8 rounded-full items-center justify-center ${theme.isDark ? 'bg-indigo-500/20 border-2 border-[#0b1120]' : 'bg-indigo-600 border-2 border-white'}`}>
              <Camera size={14} color={theme.isDark ? '#818cf8' : '#fff'} />
            </View>
          </TouchableOpacity>
          
          <Text className={`text-xl font-bold mt-0.5 ${theme.textClass}`}>{profile.full_name || (isOfficial ? 'Official' : 'Citizen')}</Text>
          <Badge type={isOfficial ? 'department' : 'general'} text={profile.department || profile.role} className="mt-1.5 mb-2" size="md" />

          {/* Quick Edit Profile Button */}
          <View className="flex-row items-center gap-2 mt-1 mb-1">
            <TouchableOpacity 
              onPress={() => setShowEditProfile(true)} 
              className={`flex-row items-center px-4 py-1.5 rounded-full ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
            >
              <Edit3 size={12} color={theme.iconColor} />
              <Text className={`font-semibold text-[11.5px] ml-1.5 ${theme.textClass}`}>Edit Profile</Text>
            </TouchableOpacity>

            {profile.home_ward == null && (
              <TouchableOpacity 
                onPress={() => router.push('/complete-profile')} 
                className="flex-row items-center px-3.5 py-1.5 rounded-full bg-emerald-600"
              >
                <ShieldCheck size={12} color="#ffffff" />
                <Text className="font-bold text-[11.5px] ml-1.5 text-white">Set Ward Number</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Follow Stats */}
          <View className={`flex-row items-center justify-around mt-5 py-3 px-4 w-full rounded-2xl border ${theme.cardClass}`} style={theme.cardShadow}>
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
        </View>

        {/* Stats */}
        {isOfficial ? (
          <View className="mb-2">
            <View className="flex-row gap-2.5 mb-3">
              <View className={`flex-1 p-4 rounded-2xl border items-center ${theme.cardClass}`} style={theme.cardShadow}>
                <View className={`w-9 h-9 rounded-xl items-center justify-center mb-2 ${theme.isDark ? 'bg-amber-500/12' : 'bg-amber-50'}`}>
                  <Clock size={17} color={theme.isDark ? '#fbbf24' : '#d97706'} />
                </View>
                <Text className={`font-medium text-[10px] mb-0.5 uppercase tracking-wider ${theme.textSecondaryClass}`}>{t.pending}</Text>
                <Text className={`font-bold text-2xl ${theme.textClass}`}>{loading ? '-' : pendingCount}</Text>
              </View>
              <View className={`flex-1 p-4 rounded-2xl border items-center ${theme.cardClass}`} style={theme.cardShadow}>
                <View className={`w-9 h-9 rounded-xl items-center justify-center mb-2 ${theme.isDark ? 'bg-indigo-500/12' : 'bg-indigo-50'}`}>
                  <Wrench size={17} color={theme.isDark ? '#818cf8' : '#5b5ef6'} />
                </View>
                <Text className={`font-medium text-[10px] mb-0.5 uppercase tracking-wider ${theme.textSecondaryClass}`}>{t.in_progress}</Text>
                <Text className={`font-bold text-2xl ${theme.textClass}`}>{loading ? '-' : inProgressCount}</Text>
              </View>
            </View>


            <AnimatedCard onPress={() => router.push('/publish-notice')} className={`items-center justify-center py-3.5 flex-row rounded-2xl ${theme.isDark ? 'bg-indigo-500/15' : 'bg-indigo-600'}`}>
              <Send size={16} color={theme.isDark ? '#818cf8' : '#fff'} />
              <Text className={`font-semibold text-[14px] ml-2 ${theme.isDark ? 'text-indigo-300' : 'text-white'}`}>{t.broadcastNotice}</Text>
            </AnimatedCard>
          </View>
        ) : null}

        <View className="mt-5 mb-2">
          <Text className={`font-bold text-[15px] ml-0.5 ${theme.textClass}`}>
            {isOfficial ? t.actionRequired : t.myHistory}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );

  return (
    <View className={`flex-1 ${theme.bgClass}`}>
      <FlatList
        data={loading ? [] : issues}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#5b5ef6']} tintColor={theme.isDark ? '#818cf8' : '#5b5ef6'} />}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => <View className="px-5">{renderIssue({ item })}</View>}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-10 px-5">
              <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-3 ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                {isOfficial ? <CheckCircle2 size={28} color={theme.iconColor} /> : <Inbox size={28} color={theme.iconColor} />}
              </View>
              <Text className={`font-medium text-center text-[13px] ${theme.textSecondaryClass}`}>
                {isOfficial ? t.inboxZero : t.noHistory}
              </Text>
            </View>
          ) : (
            <View className="px-5">
              <Skeleton height={120} className="w-full rounded-2xl mb-3" />
              <Skeleton height={120} className="w-full rounded-2xl mb-3" />
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
                  className={`py-4 rounded-xl items-center ${isSaving ? 'opacity-50' : ''} ${theme.isDark ? 'bg-blue-500' : 'bg-blue-600'}`}
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

      {/* Gentle Interactive Edit Profile Modal */}
      <Modal visible={showEditProfile} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className={`flex-1 justify-end ${theme.isDark ? 'bg-black/80' : 'bg-black/40'}`}>
            <View className={`rounded-t-3xl p-5 h-[88%] ${theme.bgClass}`}>
              <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-slate-200/20 dark:border-white/5">
                <View>
                  <Text className={`font-black text-xl ${theme.textClass}`}>Edit Your Profile</Text>
                  <Text className={`text-[12px] font-medium mt-0.5 ${theme.textMutedClass}`}>Update your civic details & preferences</Text>
                </View>
                <TouchableOpacity onPress={() => setShowEditProfile(false)} className={`p-2 rounded-full ${theme.isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                  <X size={20} color={theme.iconColor} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* 1. Name */}
                <View className="mb-4">
                  <Text className={`font-bold text-[13px] mb-1 ${theme.textClass}`}>What should we call you?</Text>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Your full or display name"
                    placeholderTextColor={theme.inputPlaceholder}
                    className={`border rounded-xl px-3.5 h-11 font-medium text-[14px] ${theme.inputClass} ${theme.textClass}`}
                  />
                </View>

                {/* 2. Phone */}
                <View className="mb-4">
                  <Text className={`font-bold text-[13px] mb-1 ${theme.textClass}`}>Phone Number</Text>
                  <TextInput
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="e.g. 9800000000"
                    placeholderTextColor={theme.inputPlaceholder}
                    keyboardType="phone-pad"
                    className={`border rounded-xl px-3.5 h-11 font-medium text-[14px] ${theme.inputClass} ${theme.textClass}`}
                  />
                </View>

                {/* 3. Home Ward Choice Chips */}
                <View className="mb-4">
                  <Text className={`font-bold text-[13px] mb-1.5 ${theme.textClass}`}>Which Ward do you live in?</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'].map((w) => {
                      const isSelected = editWard === w;
                      return (
                        <TouchableOpacity
                          key={w}
                          onPress={() => setEditWard(w)}
                          activeOpacity={0.7}
                          className={`px-3.5 py-2 rounded-xl mr-2 border ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600'
                              : (theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200')
                          }`}
                        >
                          <Text className={`text-[12.5px] font-bold ${isSelected ? 'text-white' : theme.textClass}`}>
                            Ward {w}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 4. Gender Option Chips */}
                <View className="mb-4">
                  <Text className={`font-bold text-[13px] mb-1.5 ${theme.textClass}`}>Gender Identity</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {['Male', 'Female', 'Other', 'Prefer not to say'].map((g) => {
                      const isSelected = editGender?.toLowerCase() === g.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={g}
                          onPress={() => setEditGender(g)}
                          activeOpacity={0.7}
                          className={`px-3.5 py-2 rounded-xl border ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600'
                              : (theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200')
                          }`}
                        >
                          <Text className={`text-[12.5px] font-bold ${isSelected ? 'text-white' : theme.textClass}`}>
                            {g}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 5. Age Range Option Chips */}
                <View className="mb-4">
                  <Text className={`font-bold text-[13px] mb-1.5 ${theme.textClass}`}>Age Group / Age</Text>
                  <View className="flex-row flex-wrap gap-2 mb-2">
                    {['Under 18', '18–25', '26–35', '36–50', '50+'].map((ageOpt) => {
                      const isSelected = editAge === ageOpt;
                      return (
                        <TouchableOpacity
                          key={ageOpt}
                          onPress={() => setEditAge(ageOpt)}
                          activeOpacity={0.7}
                          className={`px-3 py-1.5 rounded-xl border ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600'
                              : (theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200')
                          }`}
                        >
                          <Text className={`text-[12px] font-bold ${isSelected ? 'text-white' : theme.textClass}`}>
                            {ageOpt}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TextInput
                    value={editAge}
                    onChangeText={setEditAge}
                    placeholder="Or type exact age (e.g. 28)"
                    placeholderTextColor={theme.inputPlaceholder}
                    keyboardType="number-pad"
                    className={`border rounded-xl px-3.5 h-10 font-medium text-[13px] ${theme.inputClass} ${theme.textClass}`}
                  />
                </View>

                {/* 6. Department (If Official) Choice Chips */}
                {profile?.role === 'official' && (
                  <View className="mb-4">
                    <Text className={`font-bold text-[13px] mb-1.5 ${theme.textClass}`}>Municipal Department</Text>
                    <View className="flex-row flex-wrap gap-2 mb-2">
                      {['Public Works', 'Health & Sanitation', 'Administration', 'Education', 'IT & Comms', 'Disaster Relief'].map((dept) => {
                        const isSelected = editDepartment === dept;
                        return (
                          <TouchableOpacity
                            key={dept}
                            onPress={() => setEditDepartment(dept)}
                            activeOpacity={0.7}
                            className={`px-3 py-1.5 rounded-xl border ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : (theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200')
                            }`}
                          >
                            <Text className={`text-[12px] font-bold ${isSelected ? 'text-white' : theme.textClass}`}>
                              {dept}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <TextInput
                      value={editDepartment}
                      onChangeText={setEditDepartment}
                      placeholder="Or type department title..."
                      placeholderTextColor={theme.inputPlaceholder}
                      className={`border rounded-xl px-3.5 h-10 font-medium text-[13px] ${theme.inputClass} ${theme.textClass}`}
                    />
                  </View>
                )}

                {/* 7. Local Area / Tole */}
                <View className="mb-4">
                  <Text className={`font-bold text-[13px] mb-1 ${theme.textClass}`}>Tole / Local Area</Text>
                  <TextInput
                    value={editTole}
                    onChangeText={setEditTole}
                    placeholder="e.g. Simraungadh Bazaar, Ward 4 Center"
                    placeholderTextColor={theme.inputPlaceholder}
                    className={`border rounded-xl px-3.5 h-11 font-medium text-[14px] ${theme.inputClass} ${theme.textClass}`}
                  />
                </View>
              </ScrollView>

              <View className="mt-3 pt-3 border-t border-slate-200/20 dark:border-white/5">
                <TouchableOpacity
                  onPress={handleSaveProfile}
                  disabled={isSavingProfile}
                  className={`py-3.5 rounded-2xl items-center ${isSavingProfile ? 'opacity-50' : ''} ${theme.isDark ? 'bg-blue-500' : 'bg-blue-600'}`}
                  style={theme.glowShadow('#2563eb')}
                >
                  <Text className="font-bold text-white text-[15px]">
                    {isSavingProfile ? 'Saving...' : 'Save Profile'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
