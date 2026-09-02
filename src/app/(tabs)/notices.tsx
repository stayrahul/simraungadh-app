// @ts-nocheck
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, RefreshControl, TouchableOpacity, Linking, TextInput, ScrollView, Modal, Share, ActivityIndicator, Animated } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Download, AlertTriangle, Calendar, Megaphone, Search, Share2, Copy, X, Bell, BellOff, CheckCheck, Trash2, CheckCircle2, MessageSquare, Heart, UserPlus, Radio, Sparkles } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { Notice, AppNotification } from '../../lib/types';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/use-theme';
import { useLangStore } from '../../store/langStore';
import { translations } from '../../lib/translations';
import { useAlert } from '../../components/AlertProvider';
import IssueImageCarousel from '../../components/IssueImageCarousel';
import FullScreenImageViewer from '../../components/FullScreenImageViewer';

const NOTICE_CATEGORIES = ['All', 'Emergency', 'General', 'Event', 'Policy'];

export default function NoticesScreen() {
  const [activeTab, setActiveTab] = useState<'notices' | 'notifications'>('notices');

  // Notices State
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [refreshingNotices, setRefreshingNotices] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Full Screen Image Viewer State
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Personal Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [refreshingNotifs, setRefreshingNotifs] = useState(false);
  const [activeNotifFilter, setActiveNotifFilter] = useState('all');

  const router = useRouter();
  const { profile } = useAuthStore();
  const theme = useTheme();
  const { language } = useLangStore();
  const t = translations[language] || translations.en;
  const { showAlert } = useAlert();

  const NOTIF_FILTERS = [
    { id: 'all', label: t.allFilter || 'All' },
    { id: 'new_follow', label: t.followsFilter || 'Follows' },
    { id: 'new_like', label: t.likesFilter || 'Likes' },
    { id: 'new_comment', label: t.commentsFilter || 'Comments' },
    { id: 'status_update', label: t.updatesFilter || 'Updates' },
  ];

  // Fetch Notices
  const fetchNotices = useCallback(async () => {
    try {
      let { data, error } = await supabase
        .from('notices')
        .select(`*, author:profiles!notices_author_id_fkey(*)`)
        .eq('is_deleted', false)
        .order('is_emergency', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        const fallback = await supabase
          .from('notices')
          .select('*')
          .eq('is_deleted', false)
          .order('is_emergency', { ascending: false })
          .order('created_at', { ascending: false });
        data = fallback.data;
      }

      setNotices(data || []);
    } catch (e) {
      console.error('Error fetching notices', e);
    } finally {
      setLoadingNotices(false);
      setRefreshingNotices(false);
    }
  }, []);

  // Fetch Personal Notifications
  const fetchNotifications = useCallback(async () => {
    if (!profile) {
      setLoadingNotifs(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (e) {
      console.error('Error fetching notifications:', e);
    } finally {
      setLoadingNotifs(false);
      setRefreshingNotifs(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      fetchNotices();
      fetchNotifications();
    }, [fetchNotices, fetchNotifications])
  );

  useEffect(() => {
    fetchNotices();
    fetchNotifications();

    const channel = supabase
      .channel('public:notices_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        fetchNotices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotices, fetchNotifications]);

  const onRefresh = useCallback(() => {
    if (activeTab === 'notices') {
      setRefreshingNotices(true);
      fetchNotices();
    } else {
      setRefreshingNotifs(true);
      fetchNotifications();
    }
  }, [activeTab, fetchNotices, fetchNotifications]);

  const handleShareNotice = async (notice: Notice) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: `📢 [MUNICIPAL NOTICE: ${notice.title}]\n\n${notice.content}\n\nShared via Simraungadh Civic App`
      });
    } catch (e) {}
  };

  const handleCopyNotice = async (notice: Notice) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(`${notice.title}\n\n${notice.content}`);
    showAlert('Copied', 'Notice text copied to clipboard.');
  };

  const handleMarkAllRead = async () => {
    if (!profile || notifications.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id);
    } catch (e) {
      console.error('Error marking all read', e);
    }
  };

  const handleNotificationPress = (item: AppNotification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!item.is_read) {
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
      supabase.from('notifications').update({ is_read: true }).eq('id', item.id).then();
    }
    if (item.reference_id) {
      if (item.type === 'new_follow') {
        router.push(`/user/${item.reference_id}`);
      } else {
        router.push(`/issue/${item.reference_id}`);
      }
    }
  };

  const handleDeleteNotification = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications(prev => prev.filter(n => n.id !== id));
    supabase.from('notifications').delete().eq('id', id).then();
  };

  const getIconForNotifType = (type: string) => {
    const iconMap: Record<string, { icon: any, color: string }> = {
      status_update: { icon: CheckCircle2, color: '#3b82f6' },
      new_comment: { icon: MessageSquare, color: '#10b981' },
      new_like: { icon: Heart, color: '#f43f5e' },
      new_follow: { icon: UserPlus, color: '#8b5cf6' },
      broadcast: { icon: Radio, color: '#f59e0b' },
    };
    const config = iconMap[type] || { icon: Bell, color: theme.iconColor };
    const IconComp = config.icon;
    return <IconComp size={18} color={config.color} fill={type === 'new_like' ? config.color : undefined} />;
  };

  const getBgForNotifType = (type: string) => {
    if (theme.isDark) {
      const map: Record<string, string> = {
        status_update: 'bg-primary-500/15',
        new_comment: 'bg-emerald-500/15',
        new_like: 'bg-rose-500/15',
        new_follow: 'bg-purple-500/15',
        broadcast: 'bg-amber-500/15',
      };
      return map[type] || 'bg-white/[0.06]';
    }
    const map: Record<string, string> = {
      status_update: 'bg-primary-50',
      new_comment: 'bg-emerald-50',
      new_like: 'bg-rose-50',
      new_follow: 'bg-purple-50',
      broadcast: 'bg-amber-50',
    };
    return map[type] || 'bg-slate-100';
  };

  const timeAgo = (dateString: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval >= 1) return Math.floor(interval) + 'y';
    interval = seconds / 2592000;
    if (interval >= 1) return Math.floor(interval) + 'mo';
    interval = seconds / 86400;
    if (interval >= 1) return Math.floor(interval) + 'd';
    interval = seconds / 3600;
    if (interval >= 1) return Math.floor(interval) + 'h';
    interval = seconds / 60;
    if (interval >= 1) return Math.floor(interval) + 'm';
    return 'now';
  };

  const sectionedNotifications = useMemo(() => {
    const rawData = notifications.filter(n => {
      if (activeNotifFilter === 'all') return true;
      return n.type === activeNotifFilter;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const grouped = new Map<string, typeof rawData>();
    grouped.set('Today', []);
    grouped.set('Yesterday', []);
    grouped.set('Earlier', []);

    rawData.forEach(item => {
      const itemDate = new Date(item.created_at);
      if (itemDate >= today) {
        grouped.get('Today')!.push(item);
      } else if (itemDate >= yesterday) {
        grouped.get('Yesterday')!.push(item);
      } else {
        grouped.get('Earlier')!.push(item);
      }
    });

    const sections: any[] = [];
    ['Today', 'Yesterday', 'Earlier'].forEach(label => {
      const items = grouped.get(label)!;
      if (items.length > 0) {
        sections.push({ type: 'header', id: `header-${label}`, label });
        sections.push(...items.map(item => ({ type: 'item', ...item })));
      }
    });
    return sections;
  }, [notifications, activeNotifFilter]);

  // Extract photos for each notice
  const getNoticePhotos = (notice: Notice): string[] => {
    if (notice.image_urls && Array.isArray(notice.image_urls) && notice.image_urls.length > 0) {
      return notice.image_urls;
    }
    if (notice.image_url) {
      if (notice.image_url.startsWith('[') && notice.image_url.endsWith(']')) {
        try {
          const parsed = JSON.parse(notice.image_url);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
      return [notice.image_url];
    }
    return [];
  };

  const filteredNotices = useMemo(() => {
    return notices.filter(item => {
      const matchesCategory = activeCategory === 'All' 
        ? true 
        : activeCategory === 'Emergency' 
        ? item.is_emergency 
        : item.category === activeCategory;
      
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || item.title.toLowerCase().includes(q) || item.content.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [notices, activeCategory, searchQuery]);

  const renderNotificationItem = ({ item }: { item: any }) => {
    if (item.type === 'header') {
      return (
        <View className="px-5 py-2 mb-1 mt-2 border-b pb-1" style={{ borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
          <Text className={`font-bold text-[13px] ${theme.textMutedClass}`}>{item.label}</Text>
        </View>
      );
    }
    const notif = item;

    const renderRightActions = (progress: any, dragX: any) => {
      const trans = dragX.interpolate({
        inputRange: [-80, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      });
      return (
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => handleDeleteNotification(notif.id)}
          className={`justify-center items-center w-20 rounded-2xl mb-2.5 mr-4 ml-[-8px] ${theme.isDark ? 'bg-rose-500/20' : 'bg-rose-500'}`}
        >
          <Animated.View style={{ opacity: trans }}>
            <Trash2 size={20} color={theme.isDark ? '#fb7185' : '#fff'} />
          </Animated.View>
        </TouchableOpacity>
      );
    };

    return (
      <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
        <TouchableOpacity 
          onPress={() => handleNotificationPress(notif)}
          activeOpacity={0.85}
          className={`mx-4 mb-2.5 p-3.5 rounded-2xl border flex-row items-start ${!notif.is_read ? (theme.isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100') : (theme.isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200/60')}`}
        >
          <View className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 ${getBgForNotifType(notif.type)}`}>
            {getIconForNotifType(notif.type)}
          </View>
          <View className="flex-1">
            <View className="flex-row items-start justify-between mb-0.5">
              <Text className={`flex-1 text-[13.5px] mr-2 ${!notif.is_read ? `font-bold ${theme.textClass}` : `font-semibold ${theme.textClass}`}`}>
                {notif.title}
              </Text>
              <Text className={`text-[11px] font-medium ${theme.textMutedClass}`}>{timeAgo(notif.created_at)}</Text>
            </View>
            <Text className={`text-[12.5px] leading-relaxed ${!notif.is_read ? theme.textSecondaryClass : theme.textMutedClass}`}>
              {notif.body}
            </Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      {/* Top Header */}
      <View className="px-5 pt-3 pb-2 z-10">
        <View className="flex-row items-center justify-between mb-2">
          <Text className={`font-black text-[26px] tracking-tight ${theme.textClass}`}>
            Notices & Alerts
          </Text>
          {activeTab === 'notifications' && profile && (
            <TouchableOpacity 
              onPress={handleMarkAllRead}
              className={`p-2 rounded-full ${theme.isDark ? 'bg-white/5' : 'bg-slate-100'}`}
            >
              <CheckCheck size={18} color={theme.accentColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* Segmented Switcher: [ 🏛️ Municipal Notices | 🔔 Notifications ] */}
        <View className={`flex-row p-1 rounded-2xl border mb-2 ${theme.isDark ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200/60'}`}>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setActiveTab('notices'); }}
            activeOpacity={0.8}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
              activeTab === 'notices'
                ? theme.isDark ? 'bg-white/10' : 'bg-white'
                : 'bg-transparent'
            }`}
          >
            <Megaphone size={15} color={activeTab === 'notices' ? (theme.isDark ? '#818cf8' : '#4f46e5') : theme.iconColor} />
            <Text className={`font-bold text-[13px] ml-2 ${activeTab === 'notices' ? (theme.isDark ? 'text-indigo-300' : 'text-indigo-600') : theme.textMutedClass}`}>
              Municipal Notices
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setActiveTab('notifications'); }}
            activeOpacity={0.8}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
              activeTab === 'notifications'
                ? theme.isDark ? 'bg-white/10' : 'bg-white'
                : 'bg-transparent'
            }`}
          >
            <Bell size={15} color={activeTab === 'notifications' ? (theme.isDark ? '#818cf8' : '#4f46e5') : theme.iconColor} />
            <Text className={`font-bold text-[13px] ml-2 ${activeTab === 'notifications' ? (theme.isDark ? 'text-indigo-300' : 'text-indigo-600') : theme.textMutedClass}`}>
              Activity ({notifications.filter(n => !n.is_read).length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MUNICIPAL NOTICES TAB */}
      {activeTab === 'notices' && (
        <View className="flex-1">
          {/* Search Bar */}
          <View className="px-5 pb-2">
            <View className={`flex-row items-center rounded-2xl px-4 py-2.5 border ${theme.isDark ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200/60'}`}>
              <Search size={16} color={theme.iconColor} strokeWidth={2.2} />
              <TextInput
                className={`flex-1 ml-3 text-[14px] font-medium ${theme.textClass}`}
                placeholder="Search official notices, circulars..."
                placeholderTextColor={theme.inputPlaceholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
                  <X size={15} color={theme.iconColor} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Category Filters */}
          <View className="pb-2">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
              {NOTICE_CATEGORIES.map(cat => {
                const isSelected = activeCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveCategory(cat);
                    }}
                    activeOpacity={0.8}
                    className={`px-4 py-2 rounded-full border ${
                      isSelected ? 'bg-indigo-600 border-indigo-600 shadow-sm' : (theme.isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200/80')
                    }`}
                  >
                    <Text className={`font-bold text-[12.5px] ${isSelected ? 'text-white' : theme.textSecondaryClass}`}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Notices ScrollView with Photos */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshingNotices} onRefresh={onRefresh} colors={[theme.accentColor]} tintColor={theme.accentColor} />}
            showsVerticalScrollIndicator={false}
          >
            {loadingNotices ? (
              <View className="py-20 items-center justify-center">
                <ActivityIndicator size="small" color={theme.accentColor} />
                <Text className={`text-[13px] font-medium mt-3 ${theme.textMutedClass}`}>Loading official notices...</Text>
              </View>
            ) : filteredNotices.length === 0 ? (
              <View className="py-20 items-center justify-center px-6">
                <View className={`w-16 h-16 rounded-[24px] items-center justify-center mb-3 ${theme.isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                  <Megaphone size={28} color={theme.iconColor} />
                </View>
                <Text className={`font-bold text-base mb-1 ${theme.textClass}`}>No notices found</Text>
                <Text className={`text-center text-[13px] ${theme.textMutedClass}`}>
                  {searchQuery ? `No notices matching "${searchQuery}"` : 'No municipal circulars posted in this category.'}
                </Text>
              </View>
            ) : (
              filteredNotices.map(notice => {
                const photos = getNoticePhotos(notice);

                return (
                  <View
                    key={notice.id}
                    className={`p-4 mb-4 rounded-[26px] border overflow-hidden ${
                      notice.is_emergency
                        ? 'bg-rose-500/10 border-rose-500/25'
                        : theme.isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-slate-200/70'
                    }`}
                    style={theme.cardShadow}
                  >
                    {/* Notice Header */}
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center flex-1 mr-2">
                        {notice.is_emergency ? (
                          <View className="flex-row items-center bg-rose-500 px-2.5 py-0.5 rounded-full mr-2">
                            <AlertTriangle size={11} color="#fff" />
                            <Text className="text-white text-[10px] font-bold ml-1">EMERGENCY</Text>
                          </View>
                        ) : (
                          <View className={`px-2.5 py-0.5 rounded-full mr-2 ${theme.isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                            <Text className={`text-[10.5px] font-bold ${theme.isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{notice.category}</Text>
                          </View>
                        )}
                        <Text className={`text-[11.5px] font-medium ${theme.textMutedClass}`}>
                          {new Date(notice.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <TouchableOpacity onPress={() => handleCopyNotice(notice)} className="p-1.5">
                          <Copy size={14} color={theme.iconColor} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleShareNotice(notice)} className="p-1.5">
                          <Share2 size={14} color={theme.iconColor} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Notice Title & Content */}
                    <Text className={`font-bold text-[16.5px] mb-1.5 ${theme.textClass}`}>{notice.title}</Text>
                    <Text className={`text-[13.5px] leading-relaxed mb-3 ${theme.textSecondaryClass}`}>{notice.content}</Text>

                    {/* Photos Carousel / Gallery */}
                    {photos.length > 0 && (
                      <View className="mb-3 rounded-2xl overflow-hidden">
                        <IssueImageCarousel
                          imageUrls={photos}
                          height={220}
                          onImagePress={(url, idx) => {
                            setPreviewImages(photos);
                            setPreviewIndex(idx);
                            setPreviewVisible(true);
                          }}
                        />
                      </View>
                    )}

                    {/* Official PDF Attachment */}
                    {notice.pdf_url && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(notice.pdf_url!)}
                        activeOpacity={0.8}
                        className={`flex-row items-center justify-between p-3 rounded-xl border ${theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200/60'}`}
                      >
                        <View className="flex-row items-center flex-1 mr-2">
                          <Download size={16} color={theme.accentColor} />
                          <Text className={`text-[12.5px] font-bold ml-2 ${theme.textClass}`} numberOfLines={1}>
                            Download Official Notice PDF
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {/* PERSONAL NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <View className="flex-1">
          {!profile ? (
            <View className={`flex-1 items-center justify-center p-8 ${theme.bgClass}`}>
              <View className={`w-16 h-16 rounded-[24px] items-center justify-center mb-3 ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                <BellOff size={28} color={theme.iconColor} />
              </View>
              <Text className={`font-bold text-lg mb-1.5 ${theme.textClass}`}>{t.notLoggedIn}</Text>
              <Text className={`text-center mb-5 text-[13px] ${theme.textSecondaryClass}`}>{t.signInDesc}</Text>
              <TouchableOpacity onPress={() => router.push('/login')} className={`px-6 py-3 rounded-xl ${theme.isDark ? 'bg-indigo-500/20' : 'bg-indigo-600'}`}>
                <Text className={`font-semibold text-[14px] ${theme.isDark ? 'text-indigo-300' : 'text-white'}`}>{t.signIn}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-1">
              {/* Category Filter Pills */}
              <View className="pb-2">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                  {NOTIF_FILTERS.map(filter => {
                    const isSelected = activeNotifFilter === filter.id;
                    return (
                      <TouchableOpacity
                        key={filter.id}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setActiveNotifFilter(filter.id);
                        }}
                        activeOpacity={0.8}
                        className={`px-3.5 py-1.5 rounded-full border ${
                          isSelected ? theme.pillActiveClass : theme.pillInactiveClass
                        }`}
                      >
                        <Text className={`text-[12px] font-bold ${isSelected ? 'text-white' : theme.textSecondaryClass}`}>
                          {filter.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Notifications List */}
              <FlashList
                data={sectionedNotifications}
                keyExtractor={item => item.id}
                renderItem={renderNotificationItem}
                estimatedItemSize={90}
                getItemType={(item) => item.type}
                refreshControl={<RefreshControl refreshing={refreshingNotifs} onRefresh={onRefresh} colors={[theme.accentColor]} tintColor={theme.accentColor} />}
                contentContainerStyle={sectionedNotifications.length === 0 && !loadingNotifs ? { flex: 1 } : { paddingTop: 6, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  loadingNotifs ? (
                    <View className="flex-1 items-center justify-center py-20">
                      <ActivityIndicator size="small" color={theme.accentColor} />
                    </View>
                  ) : (
                    <View className={`flex-1 items-center justify-center p-8 ${theme.bgClass}`}>
                      <View className={`w-16 h-16 rounded-[24px] items-center justify-center mb-4 ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                        <Bell size={28} color={theme.iconColor} />
                      </View>
                      <Text className={`font-bold text-base mb-1 ${theme.textClass}`}>{t.allCaughtUp || 'All caught up'}</Text>
                      <Text className={`text-center text-[13px] leading-relaxed ${theme.textMutedClass}`}>
                        {t.noNotificationsDesc || 'No new activity notifications right now.'}
                      </Text>
                    </View>
                  )
                }
              />
            </View>
          )}
        </View>
      )}

      {/* Full Screen Image Viewer Modal */}
      <FullScreenImageViewer
        visible={previewVisible}
        images={previewImages}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />
    </SafeAreaView>
  );
}
