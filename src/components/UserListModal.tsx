// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { X, User, UserCheck, UserPlus, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Profile } from '../lib/types';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/use-theme';
import { useLangStore } from '../store/langStore';
import { translations } from '../lib/translations';
import Badge from './Badge';

import { createNotification } from '../lib/notifications';

interface UserListModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
  initialTab?: 'followers' | 'following';
}

export default function UserListModal({
  visible,
  onClose,
  userId,
  userName,
  initialTab = 'followers',
}: UserListModalProps) {
  const router = useRouter();
  const theme = useTheme();
  const { profile: currentUser } = useAuthStore();
  const { language } = useLangStore();
  const t = translations[language] || translations.en;

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  const fetchUsers = useCallback(async () => {
    if (!userId || !visible) return;
    setLoading(true);
    try {
      if (activeTab === 'followers') {
        const { data, error } = await supabase
          .from('user_follows')
          .select('follower:profiles!user_follows_follower_id_fkey(*)')
          .eq('following_id', userId);

        if (error) throw error;
        const list = (data || []).map(d => d.follower).filter(Boolean);
        setUsers(list as Profile[]);
      } else {
        const { data, error } = await supabase
          .from('user_follows')
          .select('following:profiles!user_follows_following_id_fkey(*)')
          .eq('follower_id', userId);

        if (error) throw error;
        const list = (data || []).map(d => d.following).filter(Boolean);
        setUsers(list as Profile[]);
      }

      if (currentUser) {
        const { data: myFollows } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', currentUser.id);

        if (myFollows) {
          setFollowingSet(new Set(myFollows.map(f => f.following_id)));
        }
      }
    } catch (e) {
      console.error('Error fetching modal users list:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, activeTab, visible, currentUser]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFollowToggle = async (targetId: string) => {
    if (!currentUser) {
      onClose();
      router.push('/login');
      return;
    }
    if (followLoading[targetId]) return;

    setFollowLoading(prev => ({ ...prev, [targetId]: true }));
    const isCurrentlyFollowing = followingSet.has(targetId);

    setFollowingSet(prev => {
      const next = new Set(prev);
      if (isCurrentlyFollowing) next.delete(targetId);
      else next.add(targetId);
      return next;
    });

    try {
      if (isCurrentlyFollowing) {
        await supabase
          .from('user_follows')
          .delete()
          .match({ follower_id: currentUser.id, following_id: targetId });
      } else {
        await supabase
          .from('user_follows')
          .insert({ follower_id: currentUser.id, following_id: targetId });

        createNotification({
          userId: targetId,
          title: 'New Follower',
          body: `${currentUser.full_name || 'A citizen'} started following you.`,
          type: 'new_follow',
          referenceId: currentUser.id,
        });
      }
    } catch (e) {
      console.error('Error toggling follow in modal', e);
      setFollowingSet(prev => {
        const next = new Set(prev);
        if (isCurrentlyFollowing) next.add(targetId);
        else next.delete(targetId);
        return next;
      });
    } finally {
      setFollowLoading(prev => ({ ...prev, [targetId]: false }));
    }
  };

  const handleUserClick = (targetId: string) => {
    onClose();
    router.push(`/user/${targetId}`);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={onClose} 
        className="flex-1 justify-end bg-black/60"
      >
        <TouchableOpacity 
          activeOpacity={1} 
          className={`h-[75%] rounded-t-3xl border-t ${theme.glassCardClass}`}
        >
          {/* Header Bar */}
          <View className="px-5 pt-4 pb-3 flex-row items-center justify-between border-b border-white/5">
            <View>
              <Text className={`font-bold text-[16px] ${theme.textClass}`}>
                {userName ? `${userName}` : t.connections}
              </Text>
              <Text className={`text-[12px] font-medium ${theme.textMutedClass}`}>
                {activeTab === 'followers' ? t.peopleFollowing : t.peopleFollowedBy} {userName || ''}
              </Text>
            </View>

            <TouchableOpacity 
              onPress={onClose}
              className={`w-8 h-8 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/10' : 'bg-slate-100'}`}
            >
              <X size={18} color={theme.iconColor} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View className="flex-row border-b border-white/10 px-5 pt-2">
            <TouchableOpacity 
              onPress={() => setActiveTab('followers')}
              className={`flex-1 py-3 items-center border-b-2 ${activeTab === 'followers' ? (theme.isDark ? 'border-primary-400' : 'border-primary') : 'border-transparent'}`}
            >
              <Text className={`font-bold text-[13px] ${activeTab === 'followers' ? (theme.isDark ? 'text-primary-300' : 'text-primary') : theme.textMutedClass}`}>
                {t.followers}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setActiveTab('following')}
              className={`flex-1 py-3 items-center border-b-2 ${activeTab === 'following' ? (theme.isDark ? 'border-primary-400' : 'border-primary') : 'border-transparent'}`}
            >
              <Text className={`font-bold text-[13px] ${activeTab === 'following' ? (theme.isDark ? 'text-primary-300' : 'text-primary') : theme.textMutedClass}`}>
                {t.following}
              </Text>
            </TouchableOpacity>
          </View>

          {/* List */}
          {loading ? (
            <View className="flex-1 items-center justify-center py-12">
              <ActivityIndicator color={theme.isDark ? '#818cf8' : '#4f46e5'} size="large" />
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <View className="items-center justify-center py-16 px-6">
                  <View className={`w-14 h-14 rounded-3xl items-center justify-center mb-3 ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                    <Users size={24} color={theme.iconColor} />
                  </View>
                  <Text className={`font-bold text-[15px] mb-1 ${theme.textClass}`}>
                    No {activeTab} yet
                  </Text>
                  <Text className={`text-center text-[12px] ${theme.textSecondaryClass}`}>
                    {activeTab === 'followers' ? 'No users are following yet.' : 'Not following any users yet.'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelf = currentUser?.id === item.id;
                const isFollowingItem = followingSet.has(item.id);
                const isLoadingItem = followLoading[item.id];

                return (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => handleUserClick(item.id)}
                    className={`flex-row items-center justify-between p-3.5 mb-3 rounded-3xl border ${theme.cardClass}`}
                    style={theme.cardShadow}
                  >
                    <View className="flex-row items-center flex-1 pr-3">
                      {item.avatar_url ? (
                        <Image
                          source={{ uri: item.avatar_url }}
                          style={{ width: 46, height: 46, borderRadius: 23, marginRight: 14 }}
                          transition={200}
                        />
                      ) : (
                        <View 
                          style={{ width: 46, height: 46, borderRadius: 23, marginRight: 14 }}
                          className={`items-center justify-center ${theme.isDark ? 'bg-primary/20' : 'bg-primary-50'}`}
                        >
                          <User size={22} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
                        </View>
                      )}

                      <View className="flex-1 justify-center">
                        <View className="flex-row items-center flex-wrap gap-1">
                          <Text className={`font-bold text-[14.5px] ${theme.textClass}`} numberOfLines={1}>
                            {item.full_name || 'Citizen'}
                          </Text>
                          {item.role === 'official' && (
                            <View className={`px-1.5 py-0.5 rounded-full ${theme.isDark ? 'bg-primary/20' : 'bg-primary-50'}`}>
                              <Text className={`text-[9px] font-bold ${theme.isDark ? 'text-primary-300' : 'text-primary'}`}>OFFICIAL</Text>
                            </View>
                          )}
                        </View>
                        <Text className={`text-[12px] font-medium mt-0.5 capitalize ${theme.textSecondaryClass}`}>
                          {item.department || (item.role ? item.role.charAt(0).toUpperCase() + item.role.slice(1) : 'Citizen')}
                        </Text>
                      </View>
                    </View>

                    {!isSelf && currentUser && (
                      <TouchableOpacity
                        onPress={() => handleFollowToggle(item.id)}
                        disabled={isLoadingItem}
                        className={`px-3 py-1.5 rounded-full flex-row items-center ${
                          isFollowingItem
                            ? (theme.isDark ? 'bg-white/[0.08]' : 'bg-slate-100')
                            : (theme.isDark ? 'bg-primary/20' : 'bg-primary')
                        }`}
                      >
                        {isLoadingItem ? (
                          <ActivityIndicator size="small" color={isFollowingItem ? theme.iconColor : (theme.isDark ? '#818cf8' : '#ffffff')} />
                        ) : isFollowingItem ? (
                          <>
                            <UserCheck size={13} color={theme.iconColor} />
                            <Text className={`text-[11px] font-semibold ml-1 ${theme.textClass}`}>{t.following}</Text>
                          </>
                        ) : (
                          <>
                            <UserPlus size={13} color={theme.isDark ? '#818cf8' : '#ffffff'} />
                            <Text className={`text-[11px] font-semibold ml-1 ${theme.isDark ? 'text-primary-300' : 'text-white'}`}>{t.follow}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
