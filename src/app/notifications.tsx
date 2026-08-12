// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, RefreshControl, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { ArrowLeft, CheckCircle2, MessageSquare, Heart, UserPlus, Radio, Bell, BellOff, CheckCheck, Trash2 } from 'lucide-react-native';
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

  const sectionedData = React.useMemo(() => {
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

  const handleDeleteNotification = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications(prev => prev.filter(n => n.id !== id));
    supabase.from('notifications').delete().eq('id', id).then();
  };

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'header') {
      return (
        <View className="px-5 py-2 mb-1 mt-2 border-b pb-1" style={{ borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
          <Text className={`font-bold text-[14px] ${theme.textMutedClass}`}>{item.label}</Text>
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
          className={`justify-center items-center w-20 rounded-[24px] mb-2.5 mr-4 ml-[-8px] ${theme.isDark ? 'bg-rose-500/20' : 'bg-rose-500'}`}
        >
          <Animated.View style={{ opacity: trans }}>
            <Trash2 size={22} color={theme.isDark ? '#fb7185' : '#fff'} />
          </Animated.View>
        </TouchableOpacity>
      );
    };

    return (
      <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
        <TouchableOpacity 
          onPress={() => handleNotificationPress(notif)}
          activeOpacity={0.85}
          className={`mx-4 mb-2.5 p-4 rounded-[24px] border flex-row items-start ${!notif.is_read ? (theme.isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100') : theme.cardClass}`}
          style={theme.cardShadow}
        >
          <View className={`w-11 h-11 rounded-[24px] items-center justify-center mr-3.5 ${getBgForType(notif.type)}`}>
            {getIconForType(notif.type)}
          </View>
          <View className="flex-1">
            <View className="flex-row items-start justify-between mb-1">
              <Text className={`flex-1 text-[14px] mr-2 ${!notif.is_read ? `font-bold ${theme.textClass}` : `font-semibold ${theme.textClass}`}`}>
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
      {/* Navbar Header */}
      <View className={`px-5 py-3 flex-row items-center justify-between`}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}>
          <ArrowLeft size={18} color={theme.iconColor} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={handleMarkAllRead}
          style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}
        >
          <CheckCheck size={18} color={theme.accentColor} />
        </TouchableOpacity>
      </View>

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
          <View className="py-3">
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
                    style={[{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
                      backgroundColor: isSelected ? theme.accentColor : (theme.isDark ? '#1c1c1e' : '#ffffff'),
                      borderColor: isSelected ? theme.accentColor : (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                    }, isSelected ? theme.glowShadow(theme.accentColor) : theme.cardShadow]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#ffffff' : (theme.isDark ? '#ebebf5' : '#1c1c1e') }}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* List */}
          <FlashList
            data={sectionedData}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            estimatedItemSize={100}
            getItemType={(item) => item.type}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.accentColor]} tintColor={theme.accentColor} />}
            contentContainerStyle={sectionedData.length === 0 && !loading ? { flex: 1 } : { paddingTop: 12, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              loading ? (
                <View className="flex-1 items-center justify-center py-20">
                  <ActivityIndicator size="large" color={theme.isDark ? '#818cf8' : '#5b5ef6'} />
                </View>
              ) : (
                <View className={`flex-1 items-center justify-center p-8 ${theme.bgClass}`}>
                  <View className={`w-16 h-16 rounded-[24px] items-center justify-center mb-4 ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
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
