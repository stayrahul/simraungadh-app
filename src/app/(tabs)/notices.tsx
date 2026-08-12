// @ts-nocheck
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, RefreshControl, TouchableOpacity, Linking, TextInput, ScrollView, Modal, Share, Switch } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Download, AlertTriangle, Calendar, Megaphone, BellOff, Search, Plus, Check, Share2, Copy, X, Edit3, Trash2, Save } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { Notice } from '../../lib/types';
import AnimatedCard from '../../components/AnimatedCard';
import Badge from '../../components/Badge';
import Skeleton from '../../components/Skeleton';
import IssueImageCarousel from '../../components/IssueImageCarousel';
import FullScreenImageViewer from '../../components/FullScreenImageViewer';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/use-theme';
import { useLangStore } from '../../store/langStore';
import { translations } from '../../lib/translations';
import { getNepaliDate } from '../../lib/nepaliDate';
import { useAlert } from '../../components/AlertProvider';

const CATEGORIES = ['All', 'Emergency', 'General', 'Event', 'Policy'];

export default function NoticesScreen() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Edit Modal State
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [editIsEmergency, setEditIsEmergency] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const router = useRouter();
  const { profile } = useAuthStore();
  const theme = useTheme();
  const { language } = useLangStore();
  const t = translations[language] || translations.en;
  const { showAlert } = useAlert();

  const fetchNotices = useCallback(async () => {
    try {
      let { data, error } = await supabase
        .from('notices')
        .select(`*, author:profiles!notices_author_id_fkey(*)`)
        .eq('is_deleted', false)
        .order('is_emergency', { ascending: false })
        .order('created_at', { ascending: false });

      if (error && (error.code === 'PGRST200' || error.message.includes('foreign key'))) {
        const fallback = await supabase
          .from('notices')
          .select('*')
          .eq('is_deleted', false)
          .order('is_emergency', { ascending: false })
          .order('created_at', { ascending: false });
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      setNotices(data || []);
    } catch (e) {
      console.error('Error fetching notices', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotices();
    }, [fetchNotices])
  );

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  useEffect(() => {
    const channel = supabase
      .channel('public:notices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        fetchNotices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotices();
  }, [fetchNotices]);

  const emergencyCount = useMemo(() => {
    return notices.filter(n => n.is_emergency).length;
  }, [notices]);

  const filteredNotices = useMemo(() => {
    return notices.filter(item => {
      const matchesCategory = activeCategory === 'All' 
        ? true 
        : activeCategory === 'Emergency' 
          ? item.is_emergency || item.category === 'Emergency'
          : item.category === activeCategory;

      const matchesSearch = !searchQuery.trim() || 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.content?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [notices, activeCategory, searchQuery]);

  const handleShareNotice = async (notice: Notice) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: `📢 *Official Notice: ${notice.title}*\n\n${notice.content}\n\nDate: ${getNepaliDate(new Date(notice.created_at), language)}\nSimraungadh Municipality`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  const handleCopyNotice = async (notice: Notice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(`${notice.title}\n\n${notice.content}`);
    showAlert('Copied to Clipboard', 'Notice text copied to clipboard.');
  };

  // Delete Notice
  const handleDeleteNotice = (notice: Notice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showAlert('Delete Notice', 'Are you sure you want to delete this official notice?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('notices').update({ is_deleted: true }).eq('id', notice.id);
            if (error) throw error;
            setNotices(prev => prev.filter(n => n.id !== notice.id));
            showAlert('Deleted', 'Notice deleted successfully.');
          } catch (e: any) {
            showAlert('Error', e?.message || 'Failed to delete notice.');
          }
        }
      }
    ]);
  };

  // Open Edit Modal
  const handleOpenEdit = (notice: Notice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingNotice(notice);
    setEditTitle(notice.title);
    setEditContent(notice.content);
    setEditCategory(notice.category || 'General');
    setEditIsEmergency(!!notice.is_emergency);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingNotice || !editTitle.trim() || !editContent.trim()) {
      showAlert('Error', 'Title and content cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory,
        is_emergency: editIsEmergency,
      };

      const { error } = await supabase.from('notices').update(updates).eq('id', editingNotice.id);
      if (error) throw error;

      setNotices(prev => prev.map(n => n.id === editingNotice.id ? { ...n, ...updates } : n));
      setEditingNotice(null);
      showAlert('Success', 'Notice updated successfully.');
    } catch (e: any) {
      showAlert('Error', e?.message || 'Failed to update notice.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSkeleton = useCallback(() => (
    <View className={`rounded-[24px] p-4 mb-3 border ${theme.cardClass}`}>
      <Skeleton height={18} width="60%" className="mb-2" />
      <Skeleton height={12} width="100%" className="mb-1.5" />
      <Skeleton height={12} width="90%" className="mb-3" />
      <Skeleton height={18} width={90} />
    </View>
  ), [theme.cardClass]);

  const renderItem = useCallback(({ item }: { item: Notice }) => {
    let imagesList: string[] = [];
    if (item.image_urls && Array.isArray(item.image_urls) && item.image_urls.length > 0) {
      imagesList = item.image_urls;
    } else if (item.image_url) {
      try {
        if (item.image_url.startsWith('[') || item.image_url.startsWith('{')) {
          const parsed = JSON.parse(item.image_url);
          if (Array.isArray(parsed) && parsed.length > 0) imagesList = parsed;
        }
      } catch (e) {}
      if (imagesList.length === 0 && item.image_url.length > 5) {
        imagesList = [item.image_url];
      }
    }

    const isAuthorOrOfficial = profile && (profile.role === 'official' || profile.id === item.author_id);

    return (
      <AnimatedCard 
        className={`mb-3 rounded-[24px] border overflow-hidden ${
          item.is_emergency 
            ? (theme.isDark ? 'bg-rose-950/20 border-rose-500/40' : 'bg-rose-50/80 border-rose-300')
            : theme.cardClass
        }`}
        style={item.is_emergency ? theme.glowShadow('#ef4444') : theme.cardShadow}
      >
        {/* Integrated Emergency Alert Banner */}
        {item.is_emergency && (
          <View className="bg-rose-600 px-3.5 py-1.5 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <AlertTriangle size={12} color="#ffffff" />
              <Text className="text-white font-black text-[10px] ml-1 uppercase tracking-wider">
                HIGH-PRIORITY EMERGENCY ALERT
              </Text>
            </View>
            <View className="w-1.5 h-1.5 rounded-full bg-white" />
          </View>
        )}

        {/* Notice Card Content Container (with proper padding) */}
        <View className="p-3.5">
          {/* Author Header */}
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1 mr-2">
              {item.author?.avatar_url ? (
                <Image 
                  source={{ uri: item.author.avatar_url }} 
                  style={{ width: 32, height: 32, borderRadius: 16 }}
                  cachePolicy="memory-disk"
                  className={theme.isDark ? 'bg-[#1a2540]' : 'bg-slate-100'}
                />
              ) : (
                <View className={`w-8 h-8 rounded-full items-center justify-center ${theme.isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                  <Megaphone size={15} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
                </View>
              )}
              <View className="ml-2 flex-1">
                <View className="flex-row items-center">
                  <Text className={`font-bold text-[13px] ${theme.textClass}`} numberOfLines={1}>
                    {item.author?.full_name || 'Municipal Admin'}
                  </Text>
                  <View className="ml-1 px-1.5 py-0.2 rounded bg-indigo-600 flex-row items-center">
                    <Check size={7} color="#ffffff" strokeWidth={3.5} />
                    <Text className="text-white text-[8px] font-black ml-0.5 tracking-tight">OFFICIAL</Text>
                  </View>
                </View>
                <Text className={`text-[10px] font-medium ${theme.textMutedClass}`}>
                  {item.author?.department ? `${item.author.department} Dept` : 'Simraungadh Municipality'}
                </Text>
              </View>
            </View>

            {/* Category Tag */}
            <View className={`px-2 py-0.5 rounded-lg border ${
              theme.isDark ? 'bg-indigo-500/15 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'
            }`}>
              <Text className={`text-[10px] font-extrabold ${theme.isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                {item.category || 'General'}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text className={`font-black text-[15px] mb-1 leading-snug ${
            item.is_emergency ? (theme.isDark ? 'text-rose-100' : 'text-rose-950') : theme.textClass
          }`}>
            {item.title}
          </Text>

          {/* Body */}
          <Text className={`text-[13px] leading-[19px] font-normal ${
            item.is_emergency ? (theme.isDark ? 'text-rose-200/90' : 'text-rose-900/80') : theme.textSecondaryClass
          }`}>
            {item.content}
          </Text>
        </View>

        {/* Attached Photos Carousel */}
        {imagesList.length > 0 && (
          <View className="mb-2 px-3.5">
            <View className="rounded-xl overflow-hidden">
              <IssueImageCarousel 
                imageUrls={imagesList} 
                height={170} 
                onImagePress={(_url, index) => {
                  setPreviewImages(imagesList);
                  setPreviewIndex(index);
                  setPreviewVisible(true);
                }} 
              />
            </View>
          </View>
        )}

        {/* Compact Footer Bar */}
        <View className={`flex-row justify-between items-center px-3.5 py-2.5 border-t ${theme.borderSubtleClass}`}>
          <View className="flex-row items-center">
            <Calendar size={11} color={theme.iconColor} />
            <Text className={`text-[11px] font-semibold ml-1 ${theme.textMutedClass}`}>
              {getNepaliDate(new Date(item.created_at), language)}
            </Text>
          </View>

          <View className="flex-row items-center gap-1.5">
            {item.pdf_url && (
              <TouchableOpacity 
                onPress={() => Linking.openURL(item.pdf_url!)}
                className={`flex-row items-center px-2 py-1 rounded-lg ${theme.isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}
              >
                <Download size={11} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
                <Text className={`${theme.isDark ? 'text-indigo-300' : 'text-indigo-700'} font-bold text-[10px] ml-1`}>PDF</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => handleCopyNotice(item)}
              activeOpacity={0.7}
              className={`p-1.5 rounded-lg ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
            >
              <Copy size={13} color={theme.iconColor} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleShareNotice(item)}
              activeOpacity={0.7}
              className={`p-1.5 rounded-lg ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
            >
              <Share2 size={13} color={theme.iconColor} />
            </TouchableOpacity>

            {/* Edit / Delete Buttons for Official / Author */}
            {isAuthorOrOfficial && (
              <>
                <TouchableOpacity
                  onPress={() => handleOpenEdit(item)}
                  activeOpacity={0.7}
                  className={`p-1.5 rounded-lg ${theme.isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}
                >
                  <Edit3 size={13} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteNotice(item)}
                  activeOpacity={0.7}
                  className={`p-1.5 rounded-lg ${theme.isDark ? 'bg-rose-500/20' : 'bg-rose-50'}`}
                >
                  <Trash2 size={13} color="#ef4444" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </AnimatedCard>
    );
  }, [theme, language, profile]);

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      {/* Top Header */}
      <View className="px-5 pt-3 pb-2.5">
        <View className="flex-row items-center justify-between mb-2.5">
          <View className="flex-1 pr-2">
            <View className="flex-row items-center flex-wrap" style={{ gap: 8 }}>
              <Text style={{ fontSize: 21, fontWeight: '900', letterSpacing: -0.3, color: theme.textPrimary }}>
                {t.officialNotices}
              </Text>
              {emergencyCount > 0 && (
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: theme.dangerColor }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{emergencyCount} Emergency</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 11.5, fontWeight: '500', color: theme.textMuted, marginTop: 2 }}>
              {t.noticesSubhead}
            </Text>
          </View>

          {profile?.role === 'official' && (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/publish-notice');
              }}
              activeOpacity={0.85}
              style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.accentColor }, theme.glowShadow(theme.accentColor)]}
            >
              <Plus size={15} color="#ffffff" strokeWidth={2.5} />
              <Text style={{ fontWeight: '700', fontSize: 12, color: '#fff', marginLeft: 4 }}>Broadcast</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search */}
        <View className={`flex-row items-center rounded-2xl px-3.5 py-2.5 border ${theme.inputClass}`}>
          <Search size={15} color={theme.iconColor} />
          <TextInput
            className={`flex-1 ml-2.5 text-[13px] font-medium ${theme.textClass}`}
            placeholder={language === 'ne' ? 'सूचना खोज्नुहोस्...' : 'Search notices...'}
            placeholderTextColor={theme.inputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
              <X size={13} color={theme.iconColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories */}
      <View className="py-2.5 px-4 z-0">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24, gap: 8 }}>
          {CATEGORIES.map(cat => {
            const isSelected = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveCategory(cat);
                }}
                activeOpacity={0.8}
                className={`px-4 py-2 rounded-full border ${isSelected ? theme.pillActiveClass : theme.pillInactiveClass}`}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#fff' : theme.textSecondaryClass }}>
                  {cat === 'All' ? t.all : (t[cat.toLowerCase() as keyof typeof t] || cat)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notice List */}
      <View style={{ flex: 1 }}>
        <FlashList
          data={loading ? [1, 2, 3] as any : filteredNotices}
          keyExtractor={(item, index) => loading ? `skel-${index}` : item.id}
          renderItem={loading ? renderSkeleton : renderItem}
          estimatedItemSize={240}
          contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.accentColor]} tintColor={theme.accentColor} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <View className="items-center py-16 px-6">
                <View className={`w-14 h-14 rounded-[24px] items-center justify-center mb-3 ${theme.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                  <BellOff size={24} color={theme.iconColor} />
                </View>
                <Text className={`font-bold text-base mb-1 text-center ${theme.textClass}`}>{t.noNoticesFound}</Text>
                <Text className={`text-center text-[12px] ${theme.textSecondaryClass}`}>{t.noNoticesDesc}</Text>
              </View>
            ) : null
          }
        />
      </View>

      {/* EDIT NOTICE MODAL */}
      <Modal visible={!!editingNotice} transparent animationType="slide" onRequestClose={() => setEditingNotice(null)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className={`p-5 rounded-t-3xl border-t ${theme.cardClass}`} style={{ maxHeight: '85%' }}>
            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-white/10">
              <Text className={`text-lg font-black ${theme.textClass}`}>Edit Official Notice</Text>
              <TouchableOpacity onPress={() => setEditingNotice(null)} className="p-1">
                <X size={20} color={theme.iconColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className={`text-xs font-bold uppercase tracking-wider mb-1 ${theme.textMutedClass}`}>Notice Title</Text>
              <TextInput
                className={`p-3 rounded-xl border mb-3 text-[14px] font-medium ${theme.inputClass} ${theme.textClass}`}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Title..."
              />

              <Text className={`text-xs font-bold uppercase tracking-wider mb-1 ${theme.textMutedClass}`}>Content & Details</Text>
              <TextInput
                className={`p-3 rounded-xl border mb-3 text-[14px] font-medium min-h-[100px] ${theme.inputClass} ${theme.textClass}`}
                value={editContent}
                onChangeText={setEditContent}
                multiline
                placeholder="Notice details..."
              />

              <Text className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${theme.textMutedClass}`}>Category</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {['General', 'Emergency', 'Event', 'Policy'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setEditCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl border ${
                      editCategory === cat ? 'bg-indigo-600 border-indigo-600' : (theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200')
                    }`}
                  >
                    <Text className={`text-xs font-bold ${editCategory === cat ? 'text-white' : theme.textClass}`}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="flex-row items-center justify-between mb-6 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40">
                <View>
                  <Text className={`text-xs font-black ${theme.isDark ? 'text-rose-200' : 'text-rose-900'}`}>High-Priority Emergency</Text>
                  <Text className={`text-[10.5px] ${theme.isDark ? 'text-rose-300/80' : 'text-rose-700'}`}>Highlights banner with red alert status</Text>
                </View>
                <Switch value={editIsEmergency} onValueChange={setEditIsEmergency} trackColor={{ false: '#cbd5e1', true: '#ef4444' }} />
              </View>

              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={isSaving}
                className="bg-indigo-600 h-12 rounded-xl items-center justify-center flex-row"
              >
                <Save size={16} color="#ffffff" className="mr-1.5" />
                <Text className="text-white font-bold text-sm ml-1.5">{isSaving ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Slidable Full-Screen Image Preview Modal */}
      <FullScreenImageViewer
        visible={previewVisible}
        images={previewImages}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />
    </SafeAreaView>
  );
}
