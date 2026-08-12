// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bookmark, Trash2, ArrowUpDown } from 'lucide-react-native';
import { useTheme } from '../hooks/use-theme';
import { useBookmarkStore } from '../store/bookmarkStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import FeedCard from '../components/FeedCard';
import { Issue } from '../lib/types';

export default function SavedPostsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { bookmarkedIssueIds, clearBookmarks } = useBookmarkStore();
  
  const [savedIssues, setSavedIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'most_liked'>('newest');

  const sortedIssues = React.useMemo(() => {
    return [...savedIssues].sort((a, b) => {
      if (sortOption === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortOption === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortOption === 'most_liked') {
        return (b.upvotes_count || 0) - (a.upvotes_count || 0);
      }
      return 0;
    });
  }, [savedIssues, sortOption]);

  const handleClearAll = () => {
    import('react-native').then(({ Alert }) => {
      Alert.alert(
        'Clear All Saved Posts',
        'Are you sure you want to remove all saved posts?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear All', style: 'destructive', onPress: () => clearBookmarks() }
        ]
      );
    });
  };

  // FeedCard required state
  const { profile } = useAuthStore();
  const [likedIssues, setLikedIssues] = useState<Set<string>>(new Set());
  const [translationsCache, setTranslationsCache] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchSaved = async () => {
      if (bookmarkedIssueIds.length === 0) {
        setSavedIssues([]);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('issues')
          .select('*, author:profiles!issues_author_id_fkey(id, full_name, avatar_url, role, badges, is_verified), issue_comments(count)')
          .in('id', bookmarkedIssueIds)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setSavedIssues(data || []);
      } catch (err) {
        console.error('Error fetching saved issues:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSaved();
  }, [bookmarkedIssueIds]);

  const handleLike = async (issueId: string, isLiked: boolean) => {
    if (!profile) return;
    try {
      setLikedIssues(prev => {
        const next = new Set(prev);
        if (isLiked) next.delete(issueId);
        else next.add(issueId);
        return next;
      });
      
      setSavedIssues(prev => prev.map(issue => 
        issue.id === issueId ? { ...issue, upvotes_count: Math.max(0, issue.upvotes_count + (isLiked ? -1 : 1)) } : issue
      ));

      if (isLiked) {
        await supabase.from('issue_upvotes').delete().match({ issue_id: issueId, user_id: profile.id });
      } else {
        await supabase.from('issue_upvotes').insert({ issue_id: issueId, user_id: profile.id });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTranslate = async (issueId: string, text: string) => {
    if (!text.trim()) return;
    setTranslating(prev => ({ ...prev, [issueId]: true }));
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|en`);
      const data = await res.json();
      if (data?.responseData?.translatedText) {
        setTranslationsCache(prev => ({ ...prev, [issueId]: data.responseData.translatedText }));
      }
    } catch (e) {
      console.error('Translation failed', e);
    } finally {
      setTranslating(prev => ({ ...prev, [issueId]: false }));
    }
  };

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      <View className="px-5 py-3 flex-row justify-between items-center z-10">
        <TouchableOpacity onPress={() => router.back()} className={`w-10 h-10 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
          <ChevronLeft size={24} color={theme.iconColor} />
        </TouchableOpacity>
        
        {savedIssues.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} className={`w-10 h-10 rounded-full items-center justify-center ${theme.isDark ? 'bg-rose-500/10' : 'bg-rose-50'}`}>
            <Trash2 size={18} color={theme.isDark ? '#fb7185' : '#e11d48'} />
          </TouchableOpacity>
        )}
      </View>

      {savedIssues.length > 0 && !loading && (
        <View className="px-5 pb-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[
              { id: 'newest', label: 'Newest First' },
              { id: 'oldest', label: 'Oldest First' },
              { id: 'most_liked', label: 'Most Liked' },
            ].map(opt => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setSortOption(opt.id as any)}
                className={`px-4 py-2 rounded-[20px] flex-row items-center border ${sortOption === opt.id ? (theme.isDark ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200') : (theme.isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200')}`}
              >
                <ArrowUpDown size={12} color={sortOption === opt.id ? (theme.isDark ? '#818cf8' : '#4f46e5') : theme.iconColor} />
                <Text className={`ml-2 text-[12px] font-bold ${sortOption === opt.id ? (theme.isDark ? 'text-indigo-400' : 'text-indigo-700') : theme.textSecondaryClass}`}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.accentColor} />
        </View>
      ) : savedIssues.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className={`w-20 h-20 rounded-full items-center justify-center mb-6 ${theme.isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
            <Bookmark size={32} color={theme.textMuted} strokeWidth={1.5} />
          </View>
          <Text className={`text-[20px] font-black mb-2 ${theme.textClass}`}>No Saved Posts</Text>
          <Text className={`text-[15px] text-center ${theme.textSecondaryClass}`}>Posts you save will appear here. Tap the bookmark icon on any post to save it.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 pt-2" contentContainerStyle={{ paddingBottom: 100 }}>
          {sortedIssues.map(issue => (
            <FeedCard 
              key={issue.id} 
              item={issue} 
              isLiked={likedIssues.has(issue.id)}
              onLike={handleLike}
              translationsCache={translationsCache}
              translating={translating}
              onTranslate={handleTranslate}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
