// @ts-nocheck
import React, { useRef, useState, memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Share, Animated, Platform, Pressable } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { User, Check, MapPin, MoreHorizontal, Globe, Heart, MessageSquare, Share2, Sparkles, ChevronDown, ChevronUp, Repeat, UserPlus, UserCheck, Users, Bookmark, BookmarkCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Issue, cleanCivicDescription, cleanCivicTitle } from '../lib/types';
import AnimatedCard from './AnimatedCard';
import IssueImageCarousel from './IssueImageCarousel';
import FullScreenImageViewer from './FullScreenImageViewer';
import ActionSheet from './ActionSheet';
import Badge from './Badge';
import { UserBadges } from './UserBadges';
import { useAlert } from './AlertProvider';
import { useTheme } from '../hooks/use-theme';
import { useAuthStore } from '../store/authStore';
import { useLangStore } from '../store/langStore';
import { useSettingsStore } from '../store/settingsStore';
import { useBookmarkStore } from '../store/bookmarkStore';
import { translations } from '../lib/translations';
import { supabase } from '../lib/supabase';
import { createNotification } from '../lib/notifications';

import * as Clipboard from 'expo-clipboard';

interface FeedCardProps {
  item: Issue;
  isLiked: boolean;
  onLike: (id: string, currentlyLiked: boolean) => void;
  translationsCache?: Record<string, string>;
  translating?: Record<string, boolean>;
  onTranslate?: (id: string, text: string) => void;
  isFollowingAuthor?: boolean;
  isFollowedByAuthor?: boolean;
  onFollowToggle?: (authorId: string) => void;
  onEdit?: (item: Issue) => void;
  onDelete?: (item: Issue) => void;
  onStatusChange?: (item: Issue, newStatus: string) => void;
}

function FeedCard({
  item,
  isLiked = false,
  onLike,
  translationsCache,
  translating,
  onTranslate,
  isFollowingAuthor: initialFollowing = false,
  isFollowedByAuthor: initialFollowedBy = false,
  onFollowToggle,
  onEdit,
  onDelete,
  onStatusChange
}: FeedCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useAuthStore();
  const { alertOnComments } = useSettingsStore();
  const { bookmarkedIssueIds, toggleBookmark } = useBookmarkStore();
  const { language } = useLangStore();
  const t = translations[language] || translations.en;
  const { showAlert } = useAlert();

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const repostScaleAnim = useRef(new Animated.Value(1)).current;
  const heartScaleAnim = useRef(new Animated.Value(0)).current;
  const heartOpacityAnim = useRef(new Animated.Value(0)).current;
  const commentScaleAnim = useRef(new Animated.Value(1)).current;
  const shareScaleAnim = useRef(new Animated.Value(1)).current;

  const [showOptions, setShowOptions] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const isMyPost = profile?.id === item.author_id;
  const isAdmin = profile?.role === 'admin';
  const isMod = profile?.role === 'moderator';
  const canModerate = isAdmin || isMod;

  const [expanded, setExpanded] = useState(false);
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBookmarkedLocal, setIsBookmarkedLocal] = useState(bookmarkedIssueIds.includes(item.id));
  const [isReposted, setIsReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);

  React.useEffect(() => {
    setIsFollowing(initialFollowing);
  }, [initialFollowing]);

  React.useEffect(() => {
    setIsBookmarkedLocal(bookmarkedIssueIds.includes(item.id));
  }, [bookmarkedIssueIds, item.id]);

  const commentCount = item.issue_comments?.[0]?.count || 0;
  const displayDescription = cleanCivicDescription(translationsCache?.[item.id] || item.description);
  const isLongDescription = displayDescription && displayDescription.length > 100;
  const isFriends = isFollowing && Boolean(initialFollowedBy);
  const canFollow = profile && !item.is_anonymous && item.author_id && item.author_id !== profile.id;

  const categoryLabel = cleanCivicTitle(item.category, item.title);

  const handleFollow = useCallback(async () => {
    if (!profile) {
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
          await supabase.from('user_follows').delete().match({ follower_id: profile.id, following_id: item.author_id });
        } else {
          await supabase.from('user_follows').insert({ follower_id: profile.id, following_id: item.author_id });
          try {
            await createNotification({
              userId: item.author_id,
              title: '👤 New Follower',
              body: `${profile?.full_name || 'Someone'} started following you`,
              type: 'new_follow',
              referenceId: profile.id,
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
  }, [profile, item.author_id, followLoading, isFollowing, onFollowToggle, router]);

  const handleRepost = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showAlert('Coming Soon', 'Repost feature will be available in the next update!');
  }, [showAlert]);

  const handleBookmark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleBookmark(item.id);
  }, [item.id, toggleBookmark]);

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
    <AnimatedCard className="mb-0">
      <Pressable
        onPress={() => router.push(`/issue/${item.id}`)}
        className={theme.glassCardClass}
      >
        {isReposted && (
          <View className="flex-row items-center px-3 py-1">
            <Repeat size={11} color={theme.isDark ? '#34d399' : '#059669'} />
            <Text className={`${theme.isDark ? 'text-emerald-400' : 'text-emerald-600'} font-bold text-[10.5px] ml-1.5`}>
              You Reposted
            </Text>
          </View>
        )}

        <View className="flex-row items-center px-3.5 pt-3 pb-1">
          <View className="flex-row items-center flex-1 mr-2">
            <TouchableOpacity
              activeOpacity={item.is_anonymous ? 1 : 0.7}
              onPress={() => {
                if (!item.is_anonymous && item.author_id) {
                  router.push(`/user/${item.author_id}`);
                }
              }}
            >
              {item.author?.avatar_url && !item.is_anonymous ? (
                <Image
                  source={{ uri: item.author.avatar_url }}
                  cachePolicy="memory-disk"
                  placeholder="LKO2?U%2Tw=w]~RBVZRi};RPxuwH"
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                  transition={200}
                />
              ) : (
                <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.isDark ? 'rgba(79,70,229,0.15)' : '#eef2ff' }}>
                  <User size={20} color={theme.accentColor} />
                </View>
              )}
            </TouchableOpacity>

            <View className="ml-3 flex-1">
              <View className="flex-row items-center">
                <TouchableOpacity
                  activeOpacity={item.is_anonymous ? 1 : 0.7}
                  onPress={() => {
                    if (!item.is_anonymous && item.author_id) {
                      router.push(`/user/${item.author_id}`);
                    }
                  }}
                >
                  <Text className={`font-bold text-[15.5px] tracking-tight ${theme.textClass}`}>
                    {item.is_anonymous ? t.anonymous : (item.author?.full_name || t.anonymous)}
                  </Text>
                </TouchableOpacity>
                {!item.is_anonymous && item.author && (
                  <View className="ml-1">
                    <UserBadges badges={item.author.badges || (item.author.is_verified ? ['verified'] : [])} size={15} />
                  </View>
                )}

                {canFollow && !isFollowing && (
                  <TouchableOpacity
                    onPress={handleFollow}
                    disabled={followLoading}
                    activeOpacity={0.7}
                    className="ml-2 py-0.5"
                  >
                    <Text className={`text-[12px] font-bold ${theme.isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{initialFollowedBy ? (t.followBack || 'Follow Back') : t.follow}</Text>
                  </TouchableOpacity>
                )}

                {!item.is_anonymous && isFollowing && (
                  <View className="ml-2 py-0.5">
                    {isFriends ? (
                      <Users size={12} color={theme.isDark ? '#34d399' : '#059669'} />
                    ) : (
                      <UserCheck size={12} color={theme.isDark ? '#34d399' : '#059669'} />
                    )}
                  </View>
                )}
              </View>

              <View className="flex-row items-center mt-0.5">
                <Text className={`text-[11px] font-medium ${theme.textMutedClass}`}>
                  {theme.timeAgo(item.created_at)}
                </Text>
                <Text className={`text-[10px] mx-1.5 ${theme.textMutedClass}`}>•</Text>
                <Text className={`text-[11px] font-semibold ${theme.textMutedClass}`}>
                  {categoryLabel}
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row items-center gap-1.5">
            {item.post_type === 'report' && item.status && (
              item.status === 'in_progress' ? (
                <View className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80">
                  <Text className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">In Progress</Text>
                </View>
              ) : item.status === 'resolved' ? (
                <View className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80">
                  <Text className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">Resolved</Text>
                </View>
              ) : (
                <Badge type={item.status as any} text={item.status.replace('_', ' ')} size="sm" />
              )
            )}

            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={handleBookmark}
              className="w-8 h-8 items-center justify-center rounded-full"
              activeOpacity={0.6}
            >
              <Bookmark size={18} color={isBookmarkedLocal ? theme.accentColor : theme.iconColor} fill={isBookmarkedLocal ? theme.accentColor : 'transparent'} />
            </TouchableOpacity>

            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => setShowOptions(true)}
              className="w-8 h-8 items-center justify-center rounded-full"
              activeOpacity={0.6}
            >
              <MoreHorizontal size={18} color={theme.iconColor} />
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-3.5 pb-2 pt-1">
          <Text className={`text-[14px] leading-[21px] font-normal ${theme.textClass}`} numberOfLines={expanded ? undefined : 3}>
            {displayDescription}
          </Text>

          {isLongDescription && (
            <TouchableOpacity
              onPress={() => setExpanded(!expanded)}
              className="mt-1 flex-row items-center py-0.5"
            >
              <Text className={`font-semibold text-[12px] mr-0.5 ${theme.isDark ? 'text-primary-300' : 'text-primary'}`}>
                {expanded ? 'Show less' : 'Read more'}
              </Text>
              {expanded ? <ChevronUp size={12} color={theme.isDark ? '#818cf8' : '#4f46e5'} /> : <ChevronDown size={12} color={theme.isDark ? '#818cf8' : '#4f46e5'} />}
            </TouchableOpacity>
          )}

          {displayDescription && onTranslate && translationsCache && translating && (
            <TouchableOpacity
              onPress={() => onTranslate(item.id, displayDescription)}
              disabled={translating[item.id]}
              className="mt-2 flex-row items-center self-start py-1"
            >
              <Sparkles size={12} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
              <Text className={`text-[11.5px] font-bold ml-1.5 ${theme.isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                {translating[item.id] ? 'Translating...' : (translationsCache[item.id] ? 'Show Original' : 'Translate')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {((item.image_urls && item.image_urls.length > 0) || item.image_url) ? (
          <View className="mb-1 w-full relative">
            <View className="overflow-hidden">
              <IssueImageCarousel
                imageUrls={item.image_urls}
                fallbackUrl={item.image_url}
                height={400}
                onImagePress={() => {
                  router.push(`/issue/${item.id}`);
                }}
                onDoubleTap={() => {
                  if (!isLiked) {
                    onLike(item.id, false);
                  }

                  Animated.sequence([
                    Animated.parallel([
                      Animated.spring(heartScaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: Platform.OS !== 'web' }),
                      Animated.timing(heartOpacityAnim, { toValue: 1, duration: 100, useNativeDriver: Platform.OS !== 'web' })
                    ]),
                    Animated.delay(500),
                    Animated.parallel([
                      Animated.timing(heartScaleAnim, { toValue: 1.5, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
                      Animated.timing(heartOpacityAnim, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' })
                    ])
                  ]).start(() => {
                    heartScaleAnim.setValue(0);
                  });
                }}
              />
            </View>

            <View style={{ pointerEvents: 'none' }} className="absolute inset-0 items-center justify-center">
              <Animated.View style={{
                opacity: heartOpacityAnim,
                transform: [{ scale: heartScaleAnim }]
              }}>
                <Heart size={100} color="#F43F5E" fill="#F43F5E" />
              </Animated.View>
            </View>
          </View>
        ) : null}

        {/* Action Row - Stitch Civic Modern */}
        <View className="flex-row items-center justify-between px-3 py-2.5 border-t border-slate-100 dark:border-white/5">
          <TouchableOpacity
            onPress={handleLike}
            activeOpacity={0.7}
            className="flex-row items-center py-1 px-2 rounded-full"
          >
            <View className={`w-8 h-8 rounded-full items-center justify-center mr-1.5 ${isLiked ? 'bg-rose-500/10 dark:bg-rose-500/20' : (theme.isDark ? 'bg-white/[0.04]' : 'bg-slate-50')}`}>
              <Animated.View style={{ transform: [{ scale: heartScaleAnim }] }}>
                <Heart size={16} color={isLiked ? '#F43F5E' : theme.iconColor} fill={isLiked ? '#F43F5E' : 'transparent'} strokeWidth={2.2} />
              </Animated.View>
            </View>
            <Text className={`font-bold text-[13px] ${isLiked ? 'text-rose-500' : theme.textSecondaryClass}`}>
              {item.upvotes_count || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Animated.sequence([
                Animated.timing(commentScaleAnim, { toValue: 1.2, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
                Animated.timing(commentScaleAnim, { toValue: 1, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
              ]).start();
              router.push(`/issue/${item.id}`);
            }}
            activeOpacity={0.7}
            className="flex-row items-center py-1 px-2 rounded-full"
          >
            <View className={`w-8 h-8 rounded-full items-center justify-center mr-1.5 ${commentCount > 0 ? (theme.isDark ? 'bg-indigo-500/15' : 'bg-indigo-50') : (theme.isDark ? 'bg-white/[0.04]' : 'bg-slate-50')}`}>
              <Animated.View style={{ transform: [{ scale: commentScaleAnim }] }}>
                <MessageSquare size={16} color={commentCount > 0 ? (theme.isDark ? '#818cf8' : '#4f46e5') : theme.iconColor} strokeWidth={2} />
              </Animated.View>
            </View>
            <Text className={`font-bold text-[13px] ${commentCount > 0 ? (theme.isDark ? 'text-indigo-300' : 'text-indigo-600') : theme.textSecondaryClass}`}>
              {commentCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            activeOpacity={0.7}
            onPressIn={() => {
              Animated.timing(shareScaleAnim, { toValue: 1.2, duration: 100, useNativeDriver: Platform.OS !== 'web' }).start();
            }}
            onPressOut={() => {
              Animated.timing(shareScaleAnim, { toValue: 1, duration: 100, useNativeDriver: Platform.OS !== 'web' }).start();
            }}
            className="flex-row items-center py-1 px-2 rounded-full"
          >
            <View className={`w-8 h-8 rounded-full items-center justify-center mr-1.5 ${theme.isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
              <Animated.View style={{ transform: [{ scale: shareScaleAnim }] }}>
                <Share2 size={16} color={theme.iconColor} strokeWidth={2} />
              </Animated.View>
            </View>
            <Text className={`font-bold text-[13px] ${theme.textSecondaryClass}`}>
              {t.share}
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>

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
          ...(isMyPost || canModerate ? [
            {
              label: isMyPost ? 'Edit Post' : '⚡ Admin Edit',
              icon: 'edit-3',
              onPress: () => {
                if (onEdit) onEdit(item);
              }
            },
            {
              label: isMyPost ? 'Delete Post' : '⚡ Admin Delete',
              icon: 'trash-2',
              destructive: true,
              onPress: () => {
                if (onDelete) onDelete(item);
              }
            }
          ] : []),
          ...(canModerate && onStatusChange ? [
            ...(item.post_type === 'report' && item.status !== 'in_progress' ? [{
              label: '⚡ Mark In Progress',
              icon: 'loader',
              onPress: () => onStatusChange(item, 'in_progress'),
            }] : []),
            ...(item.post_type === 'report' && item.status !== 'resolved' ? [{
              label: '⚡ Mark Resolved',
              icon: 'check-circle',
              onPress: () => onStatusChange(item, 'resolved'),
            }] : []),
            ...(item.post_type === 'report' && item.status !== 'rejected' ? [{
              label: '⚡ Reject Issue',
              icon: 'x-circle',
              destructive: true,
              onPress: () => onStatusChange(item, 'rejected'),
            }] : []),
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

      <FullScreenImageViewer
        visible={showImageViewer}
        images={item.image_urls && item.image_urls.length > 0 ? item.image_urls : (item.image_url ? [item.image_url] : [])}
        initialIndex={selectedImageIndex}
        onClose={() => setShowImageViewer(false)}
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
