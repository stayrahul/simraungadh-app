// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, MessageSquare, Heart, UserPlus, Radio, Bell, BellOff, CheckCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { AppNotification } from '../lib/types';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/use-theme';

import { useLangStore } from '../store/langStore';
import { translations } from '../lib/translations';

export default function NotificationsScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const theme = useTheme();
  const { language } = useLangStore();
  const t = translations[language] || translations.en;

  const FILTERS = [
    { id: 'all', label: t.allFilter },
    { id: 'new_follow', label: t.followsFilter },
    { id: 'new_like', label: t.likesFilter },
    { id: 'new_comment', label: t.commentsFilter },
    { id: 'status_update', label: t.updatesFilter },
  ];
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

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
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchNotifications();

    if (profile) {
      supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)
        .then();
    }
  }, [fetchNotifications, profile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

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
        status_update: 'bg-blue-500/15',
        new_comment: 'bg-emerald-500/15',
        new_like: 'bg-rose-500/15',
        new_follow: 'bg-purple-500/15',
        broadcast: 'bg-amber-500/15',
      };
      return map[type] || 'bg-white/[0.06]';
    }
    const map: Record<string, string> = {
      status_update: 'bg-blue-50',
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

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'all') return true;
    return n.type === activeFilter;
  });

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity 
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
      className={`mx-4 mb-2.5 p-4 rounded-2xl border flex-row items-start ${theme.cardClass} ${!item.is_read ? (theme.isDark ? 'bg-indigo-500/[0.08] border-indigo-500/20' : 'bg-indigo-50/60 border-indigo-100') : ''}`}
      style={theme.cardShadow}
    >
      <View className={`w-11 h-11 rounded-2xl items-center justify-center mr-3.5 ${getBgForType(item.type)}`}>
        {getIconForType(item.type)}
      </View>
      <View className="flex-1">
        <View className="flex-row items-start justify-between mb-1">
          <Text className={`flex-1 text-[14px] mr-2 ${!item.is_read ? `font-bold ${theme.textClass}` : `font-semibold ${theme.textClass}`}`}>
            {item.title}
          </Text>
          <Text className={`text-[11px] font-medium ${theme.textMutedClass}`}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text className={`text-[12.5px] leading-relaxed ${!item.is_read ? theme.textSecondaryClass : theme.textMutedClass}`}>
          {item.body}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      {/* Navbar Header */}
      <View className={`px-4 py-3.5 flex-row items-center justify-between border-b ${theme.headerBgClass}`}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} className={`w-9 h-9 items-center justify-center rounded-full ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
          <ArrowLeft size={18} color={theme.iconColor} />
        </TouchableOpacity>
        <Text className={`text-[16px] font-bold ${theme.textClass}`}>{t.notifications}</Text>
        <TouchableOpacity 
          onPress={handleMarkAllRead}
          className={`w-9 h-9 items-center justify-center rounded-full ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
        >
          <CheckCheck size={18} color={theme.isDark ? '#818cf8' : '#5b5ef6'} />
        </TouchableOpacity>
      </View>

      {!profile ? (
        <View className={`flex-1 items-center justify-center p-8 ${theme.bgClass}`}>
          <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-3 ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
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
          <View className="py-3 border-b border-white/5">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {FILTERS.map(filter => {
                const isSelected = activeFilter === filter.id;
                return (
                  <TouchableOpacity
                    key={filter.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveFilter(filter.id);
                    }}
                    className={`mr-2 px-4 py-2 rounded-xl border ${
                      isSelected 
                        ? (theme.isDark ? 'bg-indigo-500/20 border-indigo-500/40' : 'bg-indigo-600 border-indigo-600')
                        : (theme.isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100 border-slate-200/80')
                    }`}
                  >
                    <Text className={`text-[12px] font-bold ${
                      isSelected 
                        ? (theme.isDark ? 'text-indigo-300' : 'text-white')
                        : theme.textSecondaryClass
                    }`}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* List */}
          <FlatList
            data={filteredNotifications}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#5b5ef6']} tintColor={theme.isDark ? '#818cf8' : '#5b5ef6'} />}
            contentContainerStyle={filteredNotifications.length === 0 && !loading ? { flex: 1 } : { paddingTop: 12, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              loading ? (
                <View className="flex-1 items-center justify-center py-20">
                  <ActivityIndicator size="large" color={theme.isDark ? '#818cf8' : '#5b5ef6'} />
                </View>
              ) : (
                <View className={`flex-1 items-center justify-center p-8 ${theme.bgClass}`}>
                  <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-4 ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                    <Bell size={28} color={theme.iconColor} />
                  </View>
                  <Text className={`font-bold text-lg mb-1.5 ${theme.textClass}`}>{t.allCaughtUp}</Text>
                  <Text className={`text-center text-[13px] leading-relaxed ${theme.textSecondaryClass}`}>
                    {t.noNotificationsDesc}
                  </Text>
                </View>
              )
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}
