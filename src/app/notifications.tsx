// @ts-nocheck
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, RefreshControl, ActivityIndicator, ScrollView, Animated, Linking, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { ArrowLeft, CheckCircle2, MessageSquare, Heart, UserPlus, Radio, Bell, BellOff, CheckCheck, Trash2, Megaphone, AlertTriangle, Calendar, Download, Share2, Copy, ShieldAlert, Sparkles } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { AppNotification, Notice } from '../lib/types';
import { useTheme } from '../hooks/use-theme';
import { useLangStore } from '../store/langStore';
import { translations } from '../lib/translations';
import { useAlert } from '../components/AlertProvider';

const NOTICE_CATEGORIES = ['All', 'Emergency', 'General', 'Event', 'Policy'];

export default function NotificationsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profile } = useAuthStore();
  const theme = useTheme();
  const { language } = useLangStore();
  const t = translations[language] || translations.en;
  const { showAlert } = useAlert();

  const [topTab, setTopTab] = useState<'activity' | 'notices'>(
    params.tab === 'notices' ? 'notices' : 'activity'
  );

  // Activity Notifications State
  const FILTERS = [
    { id: 'all', label: t.allFilter || 'All' },
    { id: 'new_follow', label: t.followsFilter || 'Follows' },
    { id: 'new_like', label: t.likesFilter || 'Likes' },
    { id: 'new_comment', label: t.commentsFilter || 'Comments' },
    { id: 'status_update', label: t.updatesFilter || 'Updates' },
  ];
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [refreshingNotifs, setRefreshingNotifs] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  // Municipal Notices State
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [refreshingNotices, setRefreshingNotices] = useState(false);
  const [noticeCategory, setNoticeCategory] = useState('All');

  // Fetch Activity Notifications
  const fetchNotifications = useCallback(async () => {
    if (!profile) return;
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

  // Fetch Official Municipal Notices
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
      console.error('Error fetching notices:', e);
    } finally {
      setLoadingNotices(false);
      setRefreshingNotices(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchNotices();

    if (profile) {
      supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)
        .then();
    }
  }, [fetchNotifications, fetchNotices, profile]);

  const onRefresh = useCallback(() => {
    if (topTab === 'activity') {
      setRefreshingNotifs(true);
      fetchNotifications();
    } else {
      setRefreshingNotices(true);
      fetchNotices();
    }
  }, [topTab, fetchNotifications, fetchNotices]);

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
      console.error('Error marking all as read', e);
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
    showAlert({
      title: 'Copied',
      message: 'Notice text copied to clipboard',
      type: 'success',
    });
  };

  const getIconForType = (type: string) => {
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

  const getBgForType = (type: string) => {
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

  const sectionedData = useMemo(() => {
    const rawData = notifications.filter(n => {
      if (activeFilter === 'all') return true;
      return n.type === activeFilter;
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
  }, [notifications, activeFilter]);

  const filteredNotices = useMemo(() => {
    return notices.filter(n => {
      if (noticeCategory === 'All') return true;
      if (noticeCategory === 'Emergency') return n.is_emergency;
      return n.category === noticeCategory;
    });
  }, [notices, noticeCategory]);

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
          <View className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 ${getBgForType(notif.type)}`}>
            {getIconForType(notif.type)}
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
      {/* Top Navbar */}
      <View className="px-5 pt-3 pb-1 flex-row items-center justify-between z-10">
        <TouchableOpacity 
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} 
          style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}
        >
          <ArrowLeft size={18} color={theme.iconColor} />
        </TouchableOpacity>

        <Text className={`font-black text-[20px] tracking-tight ${theme.textClass}`}>
          Notifications & Notices
        </Text>

        {topTab === 'activity' && profile ? (
          <TouchableOpacity 
            onPress={handleMarkAllRead}
            style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}
          >
            <CheckCheck size={18} color={theme.accentColor} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {/* Segmented Switcher: [ Activity | Municipal Notices ] */}
      <View className="px-5 pt-2 pb-2">
        <View className={`flex-row p-1 rounded-2xl border ${theme.isDark ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200/60'}`}>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setTopTab('activity'); }}
            activeOpacity={0.8}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
              topTab === 'activity'
                ? theme.isDark ? 'bg-white/10' : 'bg-white'
                : 'bg-transparent'
            }`}
          >
            <Bell size={15} color={topTab === 'activity' ? (theme.isDark ? '#818cf8' : '#4f46e5') : theme.iconColor} />
            <Text className={`font-bold text-[13px] ml-2 ${topTab === 'activity' ? (theme.isDark ? 'text-indigo-300' : 'text-indigo-600') : theme.textMutedClass}`}>
              Activity
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setTopTab('notices'); }}
            activeOpacity={0.8}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
              topTab === 'notices'
                ? theme.isDark ? 'bg-white/10' : 'bg-white'
                : 'bg-transparent'
            }`}
          >
            <Megaphone size={15} color={topTab === 'notices' ? (theme.isDark ? '#818cf8' : '#4f46e5') : theme.iconColor} />
            <Text className={`font-bold text-[13px] ml-2 ${topTab === 'notices' ? (theme.isDark ? 'text-indigo-300' : 'text-indigo-600') : theme.textMutedClass}`}>
              Municipal Notices
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ACTIVITY TAB CONTENT */}
      {topTab === 'activity' && (
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
                  {FILTERS.map(filter => {
                    const isSelected = activeFilter === filter.id;
                    return (
                      <TouchableOpacity
                        key={filter.id}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setActiveFilter(filter.id);
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

              {/* Activity List */}
              <FlashList
                data={sectionedData}
                keyExtractor={item => item.id}
                renderItem={renderNotificationItem}
                estimatedItemSize={90}
                getItemType={(item) => item.type}
                refreshControl={<RefreshControl refreshing={refreshingNotifs} onRefresh={onRefresh} colors={[theme.accentColor]} tintColor={theme.accentColor} />}
                contentContainerStyle={sectionedData.length === 0 && !loadingNotifs ? { flex: 1 } : { paddingTop: 6, paddingBottom: 40 }}
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

      {/* MUNICIPAL NOTICES TAB CONTENT */}
      {topTab === 'notices' && (
        <View className="flex-1">
          {/* Category Filter Pills */}
          <View className="pb-2">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {NOTICE_CATEGORIES.map(cat => {
                const isSelected = noticeCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setNoticeCategory(cat);
                    }}
                    activeOpacity={0.8}
                    className={`px-3.5 py-1.5 rounded-full border ${
                      isSelected ? theme.pillActiveClass : theme.pillInactiveClass
                    }`}
                  >
                    <Text className={`text-[12px] font-bold ${isSelected ? 'text-white' : theme.textSecondaryClass}`}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Notices List */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
            refreshControl={<RefreshControl refreshing={refreshingNotices} onRefresh={onRefresh} colors={[theme.accentColor]} tintColor={theme.accentColor} />}
            showsVerticalScrollIndicator={false}
          >
            {loadingNotices ? (
              <View className="py-20 items-center justify-center">
                <ActivityIndicator size="small" color={theme.accentColor} />
              </View>
            ) : filteredNotices.length === 0 ? (
              <View className="py-16 items-center justify-center">
                <View className={`w-16 h-16 rounded-[24px] items-center justify-center mb-3 ${theme.isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                  <Megaphone size={28} color={theme.iconColor} />
                </View>
                <Text className={`font-bold text-base mb-1 ${theme.textClass}`}>No official notices</Text>
                <Text className={`text-center text-[13px] ${theme.textMutedClass}`}>There are no municipal notices published in this category.</Text>
              </View>
            ) : (
              filteredNotices.map(notice => (
                <View
                  key={notice.id}
                  className={`p-4 mb-3.5 rounded-2xl border ${
                    notice.is_emergency
                      ? 'bg-rose-500/10 border-rose-500/25'
                      : theme.isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200/60'
                  }`}
                >
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
                      <Text className={`text-[11px] font-medium ${theme.textMutedClass}`}>
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

                  <Text className={`font-bold text-[15px] mb-1.5 ${theme.textClass}`}>{notice.title}</Text>
                  <Text className={`text-[13px] leading-relaxed mb-3 ${theme.textSecondaryClass}`}>{notice.content}</Text>

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
              ))
            )}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}
