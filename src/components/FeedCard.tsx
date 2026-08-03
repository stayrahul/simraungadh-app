// @ts-nocheck
import React, { useRef, useState, memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Share, Animated, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { User, Check, MapPin, MoreHorizontal, Globe, Heart, MessageSquare, Share2, Sparkles, ChevronDown, ChevronUp, Repeat, UserPlus, UserCheck, Users, Bookmark, BookmarkCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Issue } from '../lib/types';
import AnimatedCard from './AnimatedCard';
import IssueImageCarousel from './IssueImageCarousel';
import ActionSheet from './ActionSheet';
import Badge from './Badge';
import { useAlert } from './AlertProvider';
import { useTheme } from '../hooks/use-theme';
import { useAuthStore } from '../store/authStore';
import { useLangStore } from '../store/langStore';
import { translations } from '../lib/translations';
import { supabase } from '../lib/supabase';
import { createNotification } from '../lib/notifications';

import * as Clipboard from 'expo-clipboard';

interface FeedCardProps {
  item: Issue;
  isLiked: boolean;
  onLike: (id: string, currentlyLiked: boolean) => void;
  translationsCache: Record<string, string>;
  translating: Record<string, boolean>;
  onTranslate: (id: string, text: string) => void;
  isFollowingAuthor?: boolean;
  isFollowedByAuthor?: boolean;
  onFollowToggle?: (authorId: string) => void;
  onEdit?: (item: Issue) => void;
  onDelete?: (item: Issue) => void;
}

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

function FeedCard({
  item,
  isLiked,
  onLike,
  translationsCache,
  translating,
  onTranslate,
  isFollowingAuthor: initialFollowing = false,
  isFollowedByAuthor: initialFollowedBy = false,
  onFollowToggle,
  onEdit,
  onDelete
}: FeedCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const { profile: currentUser } = useAuthStore();
  const { language } = useLangStore();
  const t = translations[language] || translations.en;
  const { showAlert } = useAlert();

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const repostScaleAnim = useRef(new Animated.Value(1)).current;

  const [showOptions, setShowOptions] = useState(false);
  const { profile } = useAuthStore();
  const isMyPost = profile?.id === item.author_id;

  const [expanded, setExpanded] = useState(false);
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  React.useEffect(() => {
    setIsFollowing(initialFollowing);
  }, [initialFollowing]);

  // Repost State
  const [isReposted, setIsReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);

  const commentCount = item.issue_comments?.[0]?.count || 0;
  const isLongDescription = item.description && item.description.length > 160;
  const canFollow = currentUser && !item.is_anonymous && item.author_id && item.author_id !== currentUser.id;

  const isFriends = isFollowing && initialFollowedBy;

  const categoryLabel = item.category || (item.title ? item.title.replace(/ Report/i, '').replace(/- Ward \d+/i, '').trim() : 'General');

  const handleFollow = useCallback(async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (!item.author_id || followLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowLoading(true);
    const nextState = !isFollowing;
    setIsFollowing(nextState);

    try {
      if (onFollowToggle) {
        onFollowToggle(item.author_id);
      } else {
        if (!nextState) {
          await supabase.from('user_follows').delete().match({ follower_id: currentUser.id, following_id: item.author_id });
        } else {
          await supabase.from('user_follows').insert({ follower_id: currentUser.id, following_id: item.author_id });
          try {
            await createNotification({
              userId: item.author_id,
              title: '👤 New Follower',
              body: `${profile?.full_name || 'Someone'} started following you`,
              type: 'new_follow',
              referenceId: currentUser.id,
            });
          } catch (notifErr) {
            console.warn('Follow notification error:', notifErr);
          }
        }
      }
    } catch (e) {
      setIsFollowing(!nextState);
    } finally {
      setFollowLoading(false);
    }
  }, [currentUser, item.author_id, followLoading, isFollowing, onFollowToggle, router]);

  const handleRepost = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showAlert('Coming Soon', 'Repost feature will be available in the next update!');
  }, [showAlert]);

  const handleBookmark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsBookmarked(prev => !prev);
  }, []);

  const handleShare = async () => {
    try {
      const title = item.title ? item.title.replace(/- Ward \d+/i, '').trim() : item.category || 'Issue';
      await Share.share({
        message: `Check out this issue on Simraungadh:\n\n*${title}*\n${item.description}\n\n📍 Ward ${item.ward_number || 1}\nhttps://simraungadh.live/issue/${item.id}`,
      });
    } catch (error: unknown) {
      console.error((error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <AnimatedCard
      onPress={() => router.push(`/issue/${item.id}`)}
      className="mx-1.5 mb-2"
    >
      <View className="overflow-hidden rounded-2xl">
        {/* Repost Banner */}
        {isReposted && (
          <View className={`flex-row items-center px-4 py-1.5 ${theme.isDark ? 'bg-emerald-500/8' : 'bg-emerald-50'}`}>
            <Repeat size={11} color={theme.isDark ? '#34d399' : '#059669'} />
            <Text className={`${theme.isDark ? 'text-emerald-400' : 'text-emerald-600'} font-bold text-[10.5px] ml-1.5`}>
              You Reposted
            </Text>
          </View>
        )}

        {/* Header Row — Clean: Avatar | Name + Meta | Menu */}
        <View className="flex-row items-center px-4 pt-3.5 pb-1.5">
          <TouchableOpacity
            className="flex-row items-center flex-1 mr-2"
            activeOpacity={item.is_anonymous ? 1 : 0.7}
            onPress={() => {
              if (!item.is_anonymous && item.author_id) {
                router.push(`/user/${item.author_id}`);
              }
            }}
          >
            {/* Avatar */}
            {item.author?.avatar_url && !item.is_anonymous ? (
              <View className="relative">
                <Image
                  source={{ uri: item.author.avatar_url }}
                  cachePolicy="memory-disk"
                  style={{ width: 36, height: 36, borderRadius: 18 }}
                  className={theme.isDark ? 'bg-[#1a2540]' : 'bg-slate-100'}
                  transition={200}
                />
                {item.author?.role === 'official' && (
                  <View className="absolute -bottom-0.5 -right-0.5 bg-[#5b5ef6] rounded-full p-0.5 border-2 border-[#111a2e]">
                    <Check size={7} color="#ffffff" strokeWidth={3.5} />
                  </View>
                )}
              </View>
            ) : (
              <View className={`w-9 h-9 rounded-full items-center justify-center ${theme.isDark ? 'bg-blue-500/12' : 'bg-blue-50'}`}>
                <User size={17} color={theme.isDark ? '#60a5fa' : '#2563eb'} />
              </View>
            )}

            {/* Name + Meta Line */}
            <View className="ml-2.5 flex-1">
              <View className="flex-row items-center">
                <Text className={`font-bold text-[13.5px] tracking-tight ${theme.textClass}`} numberOfLines={1}>
                  {item.is_anonymous ? t.anonymous : (item.author?.full_name || t.anonymous)}
                </Text>

                {item.author?.role === 'official' && !item.is_anonymous && (
                  <View className={`ml-1 px-1.5 py-0.5 rounded ${theme.isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
                    <Text className={`text-[9px] font-bold ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`}>{t.official ? t.official.toUpperCase() : 'OFFICIAL'}</Text>
                  </View>
                )}

                {/* Follow button inline */}
                {canFollow && !isFollowing && (
                  <TouchableOpacity
                    onPress={handleFollow}
                    disabled={followLoading}
                    activeOpacity={0.7}
                    className="ml-1.5"
                  >
                    <Text className={`text-[12px] font-bold ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`}>· {initialFollowedBy ? (t.followBack || 'Follow Back') : t.follow}</Text>
                  </TouchableOpacity>
                )}

                {/* Mutual / Following indicators */}
                {!item.is_anonymous && isFollowing && (
                  <View className="ml-1">
                    {isFriends ? (
                      <Users size={11} color={theme.isDark ? '#38bdf8' : '#0284c7'} />
                    ) : (
                      <UserCheck size={11} color={theme.isDark ? '#34d399' : '#059669'} />
                    )}
                  </View>
                )}
              </View>

              {/* Subtitle: Ward · Time · Category */}
              <View className="flex-row items-center mt-0.5">
                <MapPin size={9} color={theme.isDark ? '#60a5fa' : '#2563eb'} />
                <Text className={`text-[11px] font-medium ml-0.5 ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  Ward {item.ward_number || 1}
                </Text>
                <Text className={`text-[10px] mx-1 ${theme.textMutedClass}`}>·</Text>
                <Text className={`text-[10.5px] font-medium ${theme.textMutedClass}`}>
                  {timeAgo(item.created_at)}
                </Text>
                <Text className={`text-[10px] mx-1 ${theme.textMutedClass}`}>·</Text>
                <Text className={`text-[10.5px] font-medium ${theme.textMutedClass}`}>
                  {categoryLabel}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Right side: Status badge + Menu */}
          <View className="flex-row items-center gap-1.5">
            {item.status && item.status !== 'pending' && (
              <Badge type={item.status as any} text={item.status.replace('_', ' ')} size="sm" />
            )}
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => setShowOptions(true)}
              className="w-7 h-7 items-center justify-center rounded-full"
              activeOpacity={0.6}
            >
              <MoreHorizontal size={16} color={theme.iconColor} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Caption Text */}
        <View className="px-4 pb-2.5 pt-1">
          <Text className={`text-[14px] leading-[21px] font-normal ${theme.textClass}`} numberOfLines={expanded ? undefined : 3}>
            {item.description}
          </Text>

          {isLongDescription && (
            <TouchableOpacity
              onPress={() => setExpanded(!expanded)}
              className="mt-1 flex-row items-center py-0.5"
            >
              <Text className={`font-semibold text-[12px] mr-0.5 ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                {expanded ? 'Show less' : 'Read more'}
              </Text>
              {expanded ? <ChevronUp size={12} color={theme.isDark ? '#60a5fa' : '#2563eb'} /> : <ChevronDown size={12} color={theme.isDark ? '#60a5fa' : '#2563eb'} />}
            </TouchableOpacity>
          )}

          {/* Translation */}
          {translationsCache?.[item.id] ? (
            <View className={`mt-2.5 p-3 rounded-xl ${theme.isDark ? 'bg-blue-500/8' : 'bg-blue-50/80'}`}>
              <View className="flex-row items-center mb-1">
                <Globe size={11} color={theme.isDark ? '#60a5fa' : '#2563eb'} />
                <Text className={`${theme.isDark ? 'text-blue-400' : 'text-blue-600'} text-[10px] font-bold uppercase tracking-widest ml-1`}>Translated</Text>
              </View>
              <Text className={`text-[13px] leading-relaxed ${theme.textClass}`}>
                {translationsCache[item.id]}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => onTranslate(item.id, item.description)}
              disabled={!!translating?.[item.id]}
              className="mt-2 flex-row items-center"
              activeOpacity={0.6}
            >
              {translating?.[item.id] ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color={theme.isDark ? '#60a5fa' : '#2563eb'} style={{ transform: [{ scale: 0.6 }] }} />
                  <Text className={`${theme.isDark ? 'text-blue-400' : 'text-blue-500'} font-medium text-[11.5px] ml-0.5`}>Translating…</Text>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Sparkles size={11} color={theme.isDark ? '#60a5fa' : '#2563eb'} />
                  <Text className={`${theme.isDark ? 'text-blue-400' : 'text-blue-500'} font-medium text-[11.5px] ml-1`}>Translate</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Photos */}
        {((item.image_urls && item.image_urls.length > 0) || item.image_url) ? (
          <View className="mx-3.5 mb-2.5 rounded-xl overflow-hidden">
            <IssueImageCarousel
              imageUrls={item.image_urls}
              fallbackUrl={item.image_url}
              onImagePress={() => router.push(`/issue/${item.id}`)}
            />
          </View>
        ) : null}

        {/* Action Bar — Flat, Threads-inspired */}
        <View className={`flex-row items-center px-2.5 py-2 border-t ${theme.borderSubtleClass}`}>
          {/* Like */}
          <TouchableOpacity
            onPress={() => {
              Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.3, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
                Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 45, useNativeDriver: Platform.OS !== 'web' })
              ]).start();
              onLike(item.id, isLiked);
            }}
            className="flex-row items-center px-3 py-2"
            activeOpacity={0.6}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Heart
                size={18}
                color={isLiked ? "#f43f5e" : theme.iconColor}
                fill={isLiked ? "#f43f5e" : "none"}
              />
            </Animated.View>
            {item.upvotes_count > 0 && (
              <Text className={`font-semibold text-[12px] ml-1.5 ${isLiked ? 'text-rose-500' : theme.textMutedClass}`}>
                {item.upvotes_count}
              </Text>
            )}
          </TouchableOpacity>

          {/* Comment */}
          <TouchableOpacity
            onPress={() => router.push(`/issue/${item.id}`)}
            className="flex-row items-center px-3 py-2"
            activeOpacity={0.6}
          >
            <MessageSquare size={18} color={theme.iconColor} />
            {commentCount > 0 && (
              <Text className={`font-semibold text-[12px] ml-1.5 ${theme.textMutedClass}`}>
                {commentCount}
              </Text>
            )}
          </TouchableOpacity>

          {/* Repost */}
          <TouchableOpacity
            onPress={handleRepost}
            className="flex-row items-center px-3 py-2"
            activeOpacity={0.6}
          >
            <Animated.View style={{ transform: [{ scale: repostScaleAnim }] }}>
              <Repeat
                size={18}
                color={isReposted ? (theme.isDark ? "#34d399" : "#059669") : theme.iconColor}
              />
            </Animated.View>
            {repostCount > 0 && (
              <Text className={`font-semibold text-[12px] ml-1.5 ${isReposted ? (theme.isDark ? 'text-emerald-400' : 'text-emerald-600') : theme.textMutedClass}`}>
                {repostCount}
              </Text>
            )}
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity
            onPress={handleShare}
            className="px-3 py-2"
            activeOpacity={0.6}
          >
            <Share2 size={17} color={theme.iconColor} />
          </TouchableOpacity>

          {/* Spacer */}
          <View className="flex-1" />

          {/* Bookmark */}
          <TouchableOpacity
            onPress={handleBookmark}
            className="px-3 py-2"
            activeOpacity={0.6}
          >
            {isBookmarked ? (
              <BookmarkCheck size={17} color={theme.isDark ? '#818cf8' : '#5b5ef6'} fill={theme.isDark ? '#818cf8' : '#5b5ef6'} />
            ) : (
              <Bookmark size={17} color={theme.iconColor} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ActionSheet
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        title="Post Options"
        options={[
          {
            label: 'Share Issue',
            icon: 'share-2',
            onPress: handleShare,
          },
          {
            label: 'Copy Link',
            icon: 'link',
            onPress: async () => {
              await Clipboard.setStringAsync(`https://simraungadh.live/issue/${item.id}`);
              showAlert('Copied', 'Issue link copied to clipboard.');
            },
          },
          {
            label: 'Copy Description',
            icon: 'copy',
            onPress: async () => {
              if (item.description) {
                await Clipboard.setStringAsync(item.description);
                showAlert('Copied', 'Description copied to clipboard.');
              }
            },
          },
          ...(isMyPost ? [
            {
              label: 'Edit Post',
              icon: 'edit-3',
              onPress: () => {
                if (onEdit) onEdit(item);
              }
            },
            {
              label: 'Delete Post',
              icon: 'trash-2',
              destructive: true,
              onPress: () => {
                if (onDelete) onDelete(item);
              }
            }
          ] : []),
          ...(!item.is_anonymous && item.author_id ? [{
            label: `View ${item.author?.full_name || 'Author'}'s Profile`,
            icon: 'user',
            onPress: () => router.push(`/user/${item.author_id}`),
          }] : []),
          {
            label: 'Report Post',
            icon: 'flag',
            destructive: true,
            onPress: () => {
              setTimeout(() => {
                showAlert('Reported', 'Thank you for keeping our community safe. Our team will review this post.');
              }, 400);
            },
          },
        ]}
      />
    </AnimatedCard>
  );
}

export default memo(FeedCard, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.isLiked === next.isLiked &&
    prev.isFollowingAuthor === next.isFollowingAuthor &&
    prev.isFollowedByAuthor === next.isFollowedByAuthor &&
    prev.item.upvotes_count === next.item.upvotes_count &&
    prev.item.issue_comments?.[0]?.count === next.item.issue_comments?.[0]?.count &&
    prev.translationsCache?.[prev.item.id] === next.translationsCache?.[next.item.id] &&
    prev.translating?.[prev.item.id] === next.translating?.[next.item.id]
  );
});
