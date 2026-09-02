// @ts-nocheck
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Share, Modal, Dimensions, Keyboard } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, User, Check, MapPin, MoreHorizontal, Heart, MessageSquare, Share2, Shield, Send, X, Clock, Sparkles, MessageCircle, ThumbsUp, ThumbsDown, CornerUpLeft, CornerDownRight, Activity } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import ImageViewer from 'react-native-image-zoom-viewer';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Issue, IssueComment, cleanCivicDescription, cleanCivicTitle } from '../../lib/types';
import { getFastCache, setFastCache, CACHE_KEYS } from '../../lib/cache';
import Badge from '../../components/Badge';
import Skeleton from '../../components/Skeleton';
import IssueImageCarousel from '../../components/IssueImageCarousel';
import ActionSheet from '../../components/ActionSheet';
import { useAlert } from '../../components/AlertProvider';
import { useTheme } from '../../hooks/use-theme';
import { createNotification } from '../../lib/notifications';

function formatTimeAgo(dateString?: string) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function structureCommentList(rawComments: IssueComment[]): IssueComment[] {
  const topLevel: IssueComment[] = [];
  const childrenMap = new Map<string, IssueComment[]>();

  rawComments.forEach(c => {
    if (c.parent_id) {
      if (!childrenMap.has(c.parent_id)) childrenMap.set(c.parent_id, []);
      childrenMap.get(c.parent_id)!.push(c);
    } else {
      topLevel.push(c);
    }
  });

  const structuredComments: IssueComment[] = [];
  topLevel.forEach(parent => {
    structuredComments.push(parent);
    if (childrenMap.has(parent.id)) {
      structuredComments.push(...childrenMap.get(parent.id)!);
    }
  });

  return structuredComments;
}

export default function IssueDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { profile } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [showOptions, setShowOptions] = useState(false);
  const { showAlert } = useAlert();
  const theme = useTheme();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState<number | null>(null);

  // Keyboard avoidance tracking for Android edge-to-edge
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Comment Like/Dislike & Reply state
  const [isLikingComment, setIsLikingComment] = useState<Record<string, boolean>>({});
  const [visibleReplies, setVisibleReplies] = useState<Set<string>>(new Set());

  const visibleComments = React.useMemo(() => {
    return comments.filter(c => !c.parent_id || visibleReplies.has(c.parent_id));
  }, [comments, visibleReplies]);

  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [dislikedComments, setDislikedComments] = useState<Set<string>>(new Set());
  const [commentLikeCounts, setCommentLikeCounts] = useState<Record<string, number>>({});
  const [commentDislikeCounts, setCommentDislikeCounts] = useState<Record<string, number>>({});
  const [replyingTo, setReplyingTo] = useState<{ id: string, name: string } | null>(null);

  const flatListRef = useRef<FlashList<IssueComment>>(null);
  const inputRef = useRef<TextInput>(null);

  const fetchIssueDetails = useCallback(async () => {
    if (!id) return;
    const cacheKey = CACHE_KEYS.ISSUE_DETAIL(id as string);

    // Instant SWR Cache for 0ms initial render
    const cached = await getFastCache<Issue>(cacheKey);
    if (cached) {
      setIssue(cached);
      setLoading(false);
    }

    try {
      const issuePromise = supabase
        .from('issues')
        .select('*, author:profiles!issues_author_id_fkey(id, full_name, avatar_url, role, badges, is_verified)')
        .eq('id', id)
        .single();

      const commentsPromise = supabase
        .from('issue_comments')
        .select('*, author:profiles(id, full_name, avatar_url, role, is_verified)')
        .eq('issue_id', id)
        .order('created_at', { ascending: true });

      const likePromise = profile
        ? supabase
            .from('issue_upvotes')
            .select('issue_id')
            .eq('issue_id', id)
            .eq('user_id', profile.id)
            .maybeSingle()
        : Promise.resolve({ data: null });

      // Run all requests in parallel
      const [issueRes, commentsRes, likeRes] = await Promise.all([
        issuePromise,
        commentsPromise,
        likePromise,
      ]);

      if (issueRes.data) {
        setIssue(issueRes.data);
        setFastCache(cacheKey, issueRes.data);
      }

      if (commentsRes.data) {
        setComments(structureCommentList(commentsRes.data));
      }

      if (likeRes?.data) {
        setIsLiked(true);
      }
    } catch (e) {
      console.error('Error fetching issue details:', e);
    } finally {
      setLoading(false);
    }
  }, [id, profile]);

  useEffect(() => {
    fetchIssueDetails();
  }, [fetchIssueDetails]);

  const handleLike = async () => {
    if (!profile) {
      router.push('/login');
      return;
    }
    if (!issue) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const currentlyLiked = isLiked;
    setIsLiked(!currentlyLiked);
    setIssue(prev => prev ? { ...prev, upvotes_count: (prev.upvotes_count || 0) + (currentlyLiked ? -1 : 1) } : null);

    try {
      if (currentlyLiked) {
        await supabase.from('issue_upvotes').delete().eq('issue_id', issue.id).eq('user_id', profile.id);
      } else {
        await supabase.from('issue_upvotes').insert([{ issue_id: issue.id, user_id: profile.id }]);
      }
    } catch (e) {
      setIsLiked(currentlyLiked);
      fetchIssueDetails();
    }
  };

  const handleCommentLikeToggle = (commentId: string) => {
    if (!profile) {
      router.push('/login');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const isCommentLiked = likedComments.has(commentId);
    setLikedComments(prev => {
      const next = new Set(prev);
      if (isCommentLiked) next.delete(commentId);
      else next.add(commentId);
      return next;
    });

    // Remove dislike if present
    setDislikedComments(prev => {
      const next = new Set(prev);
      next.delete(commentId);
      return next;
    });

    setCommentLikeCounts(prev => ({
      ...prev,
      [commentId]: Math.max(0, (prev[commentId] || 0) + (isCommentLiked ? -1 : 1))
    }));
  };

  const handleCommentDislikeToggle = (commentId: string) => {
    if (!profile) {
      router.push('/login');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const isCommentDisliked = dislikedComments.has(commentId);
    setDislikedComments(prev => {
      const next = new Set(prev);
      if (isCommentDisliked) next.delete(commentId);
      else next.add(commentId);
      return next;
    });

    setCommentDislikeCounts(prev => ({
      ...prev,
      [commentId]: Math.max(0, (prev[commentId] || 0) + (isCommentDisliked ? -1 : 1))
    }));

    // Bumps off like if it was liked
    if (likedComments.has(commentId)) {
      setLikedComments(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
      setCommentLikeCounts(prev => ({
        ...prev,
        [commentId]: Math.max(0, (prev[commentId] || 0) - 1)
      }));
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || !profile || !issue) return;
    setPosting(true);

    try {
      const isOfficial = profile.role === 'official';
      let payload: any = {
        issue_id: issue.id,
        author_id: profile.id,
        content: commentText.trim(),
        is_official_response: isOfficial,
      };

      if (replyingTo) {
        payload.parent_id = replyingTo.id;
        // Auto-expand the thread so user sees the newly added reply
        setVisibleReplies(prev => new Set(prev).add(replyingTo.id));
      }

      let { data, error } = await supabase
        .from('issue_comments')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.warn('Comment insert error:', error);
        throw new Error(error.message || error.details || 'Failed to submit comment.');
      }

      const fullComment: IssueComment = {
        ...data,
        author: profile,
      };

      setComments(prev => structureCommentList([...prev, fullComment]));
      const currentCommentText = commentText.trim();
      setCommentText('');
      setReplyingTo(null);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

      if (issue && issue.author_id && issue.author_id !== profile.id) {
        createNotification({
          userId: issue.author_id,
          title: isOfficial ? 'Official Response' : 'New Comment',
          body: `${profile.full_name || 'Someone'} commented: "${currentCommentText.slice(0, 45)}${currentCommentText.length > 45 ? '...' : ''}"`,
          type: isOfficial ? 'status_update' : 'new_comment',
          referenceId: issue.id,
        });
      }
    } catch (e: any) {
      console.error('Error posting comment:', e);
      const msg = typeof e === 'string' ? e : e?.message || e?.details || 'Unable to post comment. Please try again.';
      showAlert('Notice', String(msg));
    } finally {
      setPosting(false);
    }
  };

  const renderHeader = () => {
    if (!issue) return null;
    return (
      <View className="mb-4 px-4 pt-4">
        {/* Main Elevated Card Container */}
        <View 
          className={`p-5 border ${theme.cardElevatedClass}`}
          style={Platform.OS !== 'web' ? theme.cardShadow : undefined}
        >
          {/* Author Row */}
          <View className="flex-row items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/5">
            <TouchableOpacity 
              className="flex-row items-center flex-1 mr-2"
              activeOpacity={issue.is_anonymous ? 1 : 0.75}
              onPress={() => {
                if (!issue.is_anonymous && issue.author_id) {
                  router.push(`/user/${issue.author_id}`);
                }
              }}
            >
              {issue.author?.avatar_url && !issue.is_anonymous ? (
                <Image source={{ uri: issue.author.avatar_url }} style={{ width: 44, height: 44, borderRadius: 22 }} cachePolicy="memory-disk" className={theme.isDark ? 'bg-slate-800' : 'bg-slate-100'} transition={200} />
              ) : (
                <View className={`w-11 h-11 rounded-full items-center justify-center ${theme.isDark ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
                  <User size={20} color={theme.isDark ? '#818cf8' : '#5b5ef6'} />
                </View>
              )}
              <View className="ml-3 flex-1">
                <View className="flex-row items-center flex-wrap gap-1.5">
                  <Text className={`font-black text-[16px] tracking-tight ${theme.textClass}`}>
                    {issue.is_anonymous ? 'Anonymous Citizen' : (issue.author?.full_name || 'Citizen')}
                  </Text>
                  {issue.author?.role === 'official' && (
                    <View className="bg-indigo-500/15 px-2.5 py-0.5 rounded-md flex-row items-center border border-indigo-500/20">
                      <Shield size={10} color={theme.isDark ? '#818cf8' : '#5b5ef6'} style={{ marginRight: 4 }} />
                      <Text className={`text-[9px] font-black uppercase tracking-widest ${theme.isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>Official</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-center mt-1 flex-wrap gap-1.5">
                  <Badge type="category" text={cleanCivicTitle(issue.category)} size="sm" />
                  {issue.status && issue.status !== 'pending' && <Badge type={issue.status as any} text={issue.status.replace('_', ' ')} size="sm" />}
                  <Text className={`text-[10px] ${theme.textMutedClass}`}>·</Text>
                  <Text className={`text-[11px] font-medium ${theme.textMutedClass}`}>{formatTimeAgo(issue.created_at)}</Text>
                </View>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setShowOptions(true)} className={`w-8.5 h-8.5 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
              <MoreHorizontal size={16} color={theme.iconColor} />
            </TouchableOpacity>
          </View>

          {/* Description Text */}
          <View className="pt-4 pb-3">
            <Text className={`text-[15.5px] leading-[24px] font-medium tracking-wide ${theme.textClass}`}>{cleanCivicDescription(issue.description)}</Text>
          </View>

          {/* Photos Carousel */}
          {((issue.image_urls && issue.image_urls.length > 0) || issue.image_url) && (
            <View className="my-3 rounded-2xl overflow-hidden">
              <IssueImageCarousel imageUrls={issue.image_urls} fallbackUrl={issue.image_url} onImagePress={(_url, index) => setFullScreenImageIndex(index)} />
            </View>
          )}

          {/* Integrated Action Row */}
          <View className={`flex-row items-center mt-2 pt-3 border-t ${theme.borderSubtleClass}`}>
            <TouchableOpacity onPress={handleLike} className={`flex-row items-center justify-center flex-1 py-2.5 rounded-xl mr-2 ${isLiked ? (theme.isDark ? 'bg-rose-500/20' : 'bg-rose-50') : (theme.isDark ? 'bg-white/5' : 'bg-slate-50')}`} activeOpacity={0.7}>
              <Heart size={20} color={isLiked ? '#ef4444' : theme.iconColor} fill={isLiked ? '#ef4444' : 'none'} />
              {issue.upvotes_count > 0 && <Text className={`font-bold ml-2 text-[14px] ${isLiked ? 'text-rose-500' : theme.textMutedClass}`}>{issue.upvotes_count}</Text>}
            </TouchableOpacity>

            <View className={`flex-row items-center justify-center flex-1 py-2.5 rounded-xl mr-2 ${theme.isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
              <MessageSquare size={20} color={theme.iconColor} />
              {comments.length > 0 && <Text className={`font-bold ml-2 text-[14px] ${theme.textMutedClass}`}>{comments.length}</Text>}
            </View>

            <TouchableOpacity className={`flex-row items-center justify-center flex-1 py-2.5 rounded-xl ${theme.isDark ? 'bg-white/5' : 'bg-slate-50'}`} activeOpacity={0.7} onPress={() => setShowOptions(true)}>
              <Share2 size={20} color={theme.iconColor} />
              <Text className={`font-bold ml-2 text-[14px] ${theme.textMutedClass}`}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Timeline */}
        {issue.post_type === 'report' && (
          <View className={`mt-2 mx-4 p-4 rounded-[20px] border ${theme.cardClass} ${theme.borderSubtleClass}`}>
            <Text className={`font-black text-[13px] uppercase tracking-wider mb-4 ${theme.textSecondaryClass}`}>Status Timeline</Text>
            <View className="ml-2 border-l-2 border-slate-200 dark:border-white/10 pl-6 pb-2 relative">
              
              {/* Submitted Node */}
              <View className="absolute -left-[11px] top-0 w-5 h-5 rounded-full items-center justify-center bg-indigo-500">
                <Check size={12} color="#fff" strokeWidth={3} />
              </View>
              <View className="mb-6 -mt-1">
                <Text className={`font-bold text-[15px] ${theme.textClass}`}>Report Submitted</Text>
                <Text className={`text-[12px] mt-1 ${theme.textMutedClass}`}>{new Date(issue.created_at).toLocaleString()}</Text>
              </View>

              {/* In Progress Node */}
              <View className={`absolute -left-[11px] top-[60px] w-5 h-5 rounded-full items-center justify-center ${(issue.status === 'in_progress' || issue.status === 'resolved') ? 'bg-amber-500' : (theme.isDark ? 'bg-white/10' : 'bg-slate-200')}`}>
                <Activity size={12} color="#fff" strokeWidth={3} />
              </View>
              <View className="mb-6">
                <Text className={`font-bold text-[15px] ${(issue.status === 'in_progress' || issue.status === 'resolved') ? theme.textClass : theme.textMutedClass}`}>In Progress</Text>
                <Text className={`text-[12px] mt-1 ${theme.textMutedClass}`}>{(issue.status === 'in_progress' || issue.status === 'resolved') ? 'Authorities are working on this' : 'Pending review'}</Text>
              </View>

              {/* Resolved Node */}
              <View className={`absolute -left-[11px] top-[120px] w-5 h-5 rounded-full items-center justify-center ${issue.status === 'resolved' ? 'bg-green-500' : (theme.isDark ? 'bg-white/10' : 'bg-slate-200')}`}>
                <Check size={12} color="#fff" strokeWidth={3} />
              </View>
              <View>
                <Text className={`font-bold text-[15px] ${issue.status === 'resolved' ? theme.textClass : theme.textMutedClass}`}>Resolved</Text>
                <Text className={`text-[12px] mt-1 ${theme.textMutedClass}`}>{issue.status === 'resolved' ? 'Issue marked as fixed' : 'Waiting for completion'}</Text>
              </View>

            </View>
          </View>
        )}

        {/* Section Header */}
        <View className="px-4 pt-5 pb-2 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <MessageSquare size={16} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
            <Text className={`font-black text-[13.5px] uppercase tracking-wider ml-1.5 ${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
              Comments ({comments.length})
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderComment = ({ item }: { item: IssueComment }) => {
    const isMe = profile && item.author_id === profile.id;
    const isCommentLiked = likedComments.has(item.id);
    const isCommentDisliked = dislikedComments.has(item.id);
    const likesCount = commentLikeCounts[item.id] || 0;
    const dislikesCount = commentDislikeCounts[item.id] || 0;
    const repliesCount = comments.filter(c => c.parent_id === item.id).length;
    const isRepliesVisible = visibleReplies.has(item.id);

    return (
      <View className={`px-5 py-3.5 border-b ${theme.borderSubtleClass} ${
        item.is_official_response 
          ? (theme.isDark ? 'bg-indigo-500/[0.08]' : 'bg-indigo-50/60') 
          : 'bg-transparent'
      }`}>
        <View className={`flex-row items-start ${item.parent_id ? 'ml-7 pl-3.5 border-l-2 border-indigo-400/30 dark:border-indigo-500/35' : ''}`}>
          <TouchableOpacity 
            activeOpacity={item.author_id ? 0.75 : 1}
            onPress={() => {
              if (item.author_id) router.push(`/user/${item.author_id}`);
            }}
          >
            {item.author?.avatar_url ? (
              <Image source={{ uri: item.author.avatar_url }} style={{ width: item.parent_id ? 28 : 36, height: item.parent_id ? 28 : 36, borderRadius: item.parent_id ? 14 : 18 }} cachePolicy="memory-disk" className="bg-slate-800 mr-2.5 mt-0.5" transition={200} />
            ) : (
              <View className={`${item.parent_id ? 'w-7 h-7' : 'w-9 h-9'} rounded-full items-center justify-center mr-2.5 mt-0.5 ${item.is_official_response ? 'bg-indigo-600' : (theme.isDark ? 'bg-white/[0.08]' : 'bg-slate-200')}`}>
                <Text className={`font-bold ${item.parent_id ? 'text-[10px]' : 'text-xs'} ${item.is_official_response ? 'text-white' : theme.textClass}`}>
                  {item.author?.full_name?.[0]?.toUpperCase() || 'C'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View className="flex-1">
            {/* Author Name Row */}
            <View className="flex-row items-center justify-between mb-1 flex-wrap">
              <View className="flex-row items-center flex-wrap gap-1.5">
                <Text className={`font-extrabold text-[14px] ${theme.textClass}`}>
                  {item.author?.full_name || 'Anonymous Citizen'}
                </Text>
                {item.is_official_response && (
                  <View className="bg-indigo-500/20 px-2 py-0.5 rounded-full flex-row items-center border border-indigo-500/30">
                    <Shield size={9} color={theme.isDark ? '#818cf8' : '#5b5ef6'} style={{ marginRight: 3 }} />
                    <Text className={`text-[9px] font-black uppercase tracking-wider ${theme.isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>Official Response</Text>
                  </View>
                )}
                {item.parent_id && (
                  <View className="bg-indigo-500/10 px-1.5 py-0.5 rounded flex-row items-center">
                    <CornerDownRight size={10} color={theme.isDark ? '#818cf8' : '#4f46e5'} style={{ marginRight: 2 }} />
                    <Text className={`text-[10px] font-bold ${theme.isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>reply</Text>
                  </View>
                )}
              </View>
              <Text className={`text-[11px] font-medium ${theme.textMutedClass}`}>
                {formatTimeAgo(item.created_at)}
              </Text>
            </View>

            {/* Comment Text with Vertical Breathing Room */}
            <Text className={`text-[14px] leading-[22px] font-normal mt-0.5 mb-2 ${theme.textClass}`}>
              {item.content}
            </Text>

            {/* Compact Comment Like / Dislike / Reply Bar */}
            <View className="flex-row items-center gap-4 pt-0.5">
              <TouchableOpacity
                onPress={() => handleCommentLikeToggle(item.id)}
                activeOpacity={0.7}
                className="flex-row items-center py-1 pr-2"
              >
                <Heart
                  size={13}
                  color={isCommentLiked ? '#ef4444' : theme.iconColor}
                  fill={isCommentLiked ? '#ef4444' : 'none'}
                />
                <Text className={`text-[11.5px] font-bold ml-1.5 ${isCommentLiked ? 'text-rose-500' : theme.textMutedClass}`}>
                  {likesCount > 0 ? likesCount : 'Like'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleCommentDislikeToggle(item.id)}
                activeOpacity={0.7}
                className="flex-row items-center py-1 pr-2 ml-1"
              >
                <ThumbsDown
                  size={13}
                  color={isCommentDisliked ? (theme.isDark ? '#fb7185' : '#e11d48') : theme.iconColor}
                  fill={isCommentDisliked ? (theme.isDark ? '#fb7185' : '#e11d48') : 'none'}
                />
                <Text className={`text-[11.5px] font-bold ml-1.5 ${isCommentDisliked ? 'text-rose-500' : theme.textMutedClass}`}>
                  {dislikesCount > 0 ? dislikesCount : 'Dislike'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const name = item.author?.full_name || 'Citizen';
                  const rootParentId = item.parent_id || item.id;
                  setReplyingTo({ id: rootParentId, name });
                  // Auto-expand replies so the user can see the thread
                  setVisibleReplies(prev => new Set(prev).add(rootParentId));
                  inputRef.current?.focus();
                }}
                activeOpacity={0.7}
                className="flex-row items-center py-1 pr-2 ml-1"
              >
                <CornerUpLeft
                  size={13}
                  color={theme.isDark ? '#818cf8' : '#4f46e5'}
                />
                <Text className={`text-[11.5px] font-bold ml-1.5 ${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  Reply
                </Text>
              </TouchableOpacity>
            </View>

            {/* Show/Hide Replies Toggle Button */}
            {!item.parent_id && repliesCount > 0 && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setVisibleReplies(prev => {
                    const next = new Set(prev);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  });
                }}
                activeOpacity={0.7}
                className="mt-2.5 flex-row items-center self-start px-3 py-1.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20"
              >
                <CornerDownRight size={12} color={theme.isDark ? '#818cf8' : '#4f46e5'} style={{ marginRight: 6 }} />
                <Text className={`text-[11.5px] font-bold ${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {isRepliesVisible ? 'Hide replies' : `View ${repliesCount} ${repliesCount === 1 ? 'reply' : 'replies'}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${theme.bgClass}`}>
        <View className={`p-4 flex-row items-center border-b ${theme.borderClass}`}><ArrowLeft size={20} color={theme.iconColor} /></View>
        <Skeleton height={200} className="w-full mb-4" />
        <View className="px-4"><Skeleton height={28} width="70%" className="mb-3" /><Skeleton height={14} width="100%" className="mb-2" /><Skeleton height={14} width="90%" /></View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      className={`flex-1 ${theme.bgClass}`}
    >
      {/* Navbar */}
      <View style={[{ paddingTop: insets.top }]} className="px-5 py-3 flex-row justify-between items-center z-10">
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} className={`w-10 h-10 items-center justify-center rounded-full ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
          <ArrowLeft size={20} color={theme.iconColor} />
        </TouchableOpacity>
        <View className="w-10 h-10" />
      </View>

      <View style={{ flex: 1 }}>
        <FlashList
          ref={flatListRef}
          data={visibleComments}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader()}
          renderItem={renderComment}
          contentContainerStyle={{ paddingBottom: 20 }}
          estimatedItemSize={120}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => {
            if (isKeyboardVisible) Keyboard.dismiss();
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-12 px-5">
              <View className={`w-14 h-14 rounded-2xl items-center justify-center mb-3 ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                <MessageCircle size={26} color={theme.iconColor} />
              </View>
              <Text className={`font-bold text-[15px] mb-1 text-center ${theme.textClass}`}>No comments yet</Text>
              <Text className={`font-medium text-center text-[12.5px] ${theme.textSecondaryClass}`}>Be the first citizen to leave a comment on this report!</Text>
            </View>
          }
        />
      </View>

      {profile && (
        <View 
          style={{
            paddingBottom: isKeyboardVisible ? 8 : Math.max(insets.bottom, 12),
            marginBottom: Platform.OS === 'android' ? keyboardHeight : 0,
          }}
          className="w-full px-4 pt-2 border-t border-slate-200/50 dark:border-white/5 bg-transparent"
        >
          <View className={`border rounded-[24px] shadow-sm overflow-hidden ${theme.isDark ? 'bg-[#121216] border-white/10' : 'bg-white border-slate-200'}`}>
            {replyingTo && (
              <View className={`px-4 py-2 flex-row justify-between items-center border-b ${theme.isDark ? 'bg-indigo-500/15 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                <View className="flex-row items-center flex-1 mr-2">
                  <CornerDownRight size={13} color={theme.isDark ? '#818cf8' : '#4f46e5'} style={{ marginRight: 6 }} />
                  <Text className={`text-[12px] font-medium ${theme.isDark ? 'text-indigo-200' : 'text-indigo-800'}`} numberOfLines={1}>
                    Replying to <Text className="font-extrabold">@{replyingTo.name}</Text>
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.selectionAsync();
                    setReplyingTo(null);
                  }} 
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className="w-5 h-5 rounded-full items-center justify-center bg-indigo-500/20"
                >
                  <X size={12} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
                </TouchableOpacity>
              </View>
            )}
            <View className="px-3.5 py-2.5 flex-row items-end">
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={{ width: 32, height: 32, borderRadius: 16, marginBottom: 2 }} className="bg-slate-800 mr-2.5" transition={200} />
              ) : (
                <View className={`w-8 h-8 rounded-full items-center justify-center mr-2.5 mb-0.5 ${theme.isDark ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
                  <User size={16} color={theme.isDark ? '#818cf8' : '#6366f1'} />
                </View>
              )}

              <View className="flex-1 flex-row items-center">
                <TextInput
                  ref={inputRef}
                  className={`flex-1 text-[14.5px] min-h-[36px] max-h-[120px] py-1 font-medium ${theme.textClass}`}
                  placeholder={replyingTo ? `Reply to @${replyingTo.name}...` : "Add a comment..."}
                  placeholderTextColor={theme.inputPlaceholder}
                  multiline
                  value={commentText}
                  onChangeText={setCommentText}
                />
                <TouchableOpacity
                  onPress={handlePostComment}
                  disabled={!commentText.trim() || posting}
                  className={`w-8 h-8 items-center justify-center rounded-full ml-2 ${
                    !commentText.trim() || posting 
                      ? (theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100') 
                      : (theme.isDark ? 'bg-indigo-500' : 'bg-indigo-600')
                  }`}
                >
                  <Send size={14} color={!commentText.trim() || posting ? theme.iconColor : '#ffffff'} style={commentText.trim() && !posting ? { marginLeft: -2 } : {}} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      <ActionSheet
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        title="Post Options"
        options={[
          {
            label: 'Share Issue',
            icon: 'share-2',
            onPress: async () => {
              try {
                const title = cleanCivicTitle(issue?.title, issue?.category);
                await Share.share({
                  message: `Check out this issue on Simraungadh:\n\n*${title}*\n${cleanCivicDescription(issue?.description)}\n\nhttps://simraungadh.live/issue/${issue?.id}`,
                });
              } catch (error) { }
            },
          },
          {
            label: 'Copy Link',
            icon: 'link',
            onPress: async () => {
              await Clipboard.setStringAsync(`https://simraungadh.live/issue/${issue?.id}`);
              showAlert('Copied', 'Issue link copied to clipboard.');
            },
          },
          {
            label: 'Copy Description',
            icon: 'copy',
            onPress: async () => {
              if (issue?.description) {
                await Clipboard.setStringAsync(cleanCivicDescription(issue.description));
                showAlert('Copied', 'Description copied to clipboard.');
              }
            },
          },
          ...(!issue?.is_anonymous && issue?.author_id ? [{
            label: `View ${issue?.author?.full_name || 'Author'}'s Profile`,
            icon: 'user',
            onPress: () => router.push(`/user/${issue.author_id}`),
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

      <Modal visible={fullScreenImageIndex !== null} transparent={true} animationType="fade" onRequestClose={() => setFullScreenImageIndex(null)}>
        <View className="flex-1 bg-black/95">
          <SafeAreaView className="absolute top-0 w-full z-10" edges={['top']}>
            <View className="flex-row justify-end p-4">
              <TouchableOpacity onPress={() => setFullScreenImageIndex(null)} className="w-10 h-10 bg-white/20 rounded-full items-center justify-center z-50">
                <X size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
          
          <ImageViewer 
            imageUrls={(issue?.image_urls && issue.image_urls.length > 0 ? issue.image_urls : issue?.image_url ? [issue.image_url] : []).map(url => ({ url }))}
            index={fullScreenImageIndex || 0}
            enableSwipeDown
            onSwipeDown={() => setFullScreenImageIndex(null)}
            renderIndicator={() => <View />}
            backgroundColor="transparent"
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
