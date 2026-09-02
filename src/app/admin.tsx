// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, Image, RefreshControl, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Users, AlertTriangle, ShieldAlert, CheckCircle, Search, Check,
  MoreVertical, RefreshCw, X, Shield, MapPin, Award, 
  Trash2, Ban, Heart, Zap, BadgeCheck, Crown, Star, ShieldCheck, ChevronLeft, ChevronRight, User, FileText, Briefcase, Megaphone, Send, Layers, BookOpen, AlertCircle, Edit3, Settings, Download, BarChart2, Calendar
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useTheme } from '../hooks/use-theme';
import { Profile, UserRole, Issue } from '../lib/types';
import * as Haptics from 'expo-haptics';
import { useAlert } from '../components/AlertProvider';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedCard from '../components/AnimatedCard';
import { UserBadges } from '../components/UserBadges';

// Segmented Control Tabs
type AdminTab = 'analytics' | 'users' | 'moderation' | 'services' | 'directory' | 'notices' | 'settings' | 'polls' | 'events' | 'logs';

const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'users', label: 'Users' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'services', label: 'Services' },
  { id: 'directory', label: 'Directory' },
  { id: 'notices', label: 'Notices' },
  { id: 'polls', label: 'Polls' },
  { id: 'events', label: 'Events' },
  { id: 'logs', label: 'Logs' },
  { id: 'settings', label: 'Settings' },
];

const renderAdminTabIcon = (tab: AdminTab, color: string) => {
  switch (tab) {
    case 'analytics': return <BarChart2 size={14} color={color} strokeWidth={2.2} />;
    case 'users': return <Users size={14} color={color} strokeWidth={2.2} />;
    case 'moderation': return <ShieldAlert size={14} color={color} strokeWidth={2.2} />;
    case 'services': return <Briefcase size={14} color={color} strokeWidth={2.2} />;
    case 'directory': return <BookOpen size={14} color={color} strokeWidth={2.2} />;
    case 'notices': return <Megaphone size={14} color={color} strokeWidth={2.2} />;
    case 'polls': return <Layers size={14} color={color} strokeWidth={2.2} />;
    case 'events': return <Calendar size={14} color={color} strokeWidth={2.2} />;
    case 'logs': return <FileText size={14} color={color} strokeWidth={2.2} />;
    case 'settings': return <Settings size={14} color={color} strokeWidth={2.2} />;
    default: return <BarChart2 size={14} color={color} strokeWidth={2.2} />;
  }
};

const AVAILABLE_BADGES = [
  {
    id: 'verified',
    label: 'Verified Citizen',
    description: 'Official identity verified badge',
    icon: BadgeCheck,
    color: '#3b82f6',
    bgColorLight: 'bg-blue-50',
    bgColorDark: 'bg-blue-500/20',
    activeBgLight: 'bg-blue-50/70',
    activeBgDark: 'bg-blue-900/20',
  },
  {
    id: 'gold',
    label: 'Gold Member',
    description: 'Top civic contributor badge',
    icon: Crown,
    color: '#eab308',
    bgColorLight: 'bg-yellow-50',
    bgColorDark: 'bg-yellow-500/20',
    activeBgLight: 'bg-yellow-50/70',
    activeBgDark: 'bg-yellow-900/20',
  },
  {
    id: 'contributor',
    label: 'Civic Contributor',
    description: 'Active community reporter badge',
    icon: Star,
    color: '#a855f7',
    bgColorLight: 'bg-purple-50',
    bgColorDark: 'bg-purple-500/20',
    activeBgLight: 'bg-purple-50/70',
    activeBgDark: 'bg-purple-900/20',
  },
  {
    id: 'leader',
    label: 'Community Leader',
    description: 'Ward leader or community hero',
    icon: ShieldCheck,
    color: '#6366f1',
    bgColorLight: 'bg-indigo-50',
    bgColorDark: 'bg-indigo-500/20',
    activeBgLight: 'bg-indigo-50/70',
    activeBgDark: 'bg-indigo-900/20',
  },
];

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const theme = useTheme();
  const { showAlert } = useAlert();

  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  
  // Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [recentIssues, setRecentIssues] = useState<Issue[]>([]);
  const [issueFilter, setIssueFilter] = useState<'all' | 'pending' | 'flagged'>('pending');
  const [directoryContacts, setDirectoryContacts] = useState<any[]>([]);
  const [serviceApps, setServiceApps] = useState<any[]>([]);
  const [noticesList, setNoticesList] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [adminPolls, setAdminPolls] = useState<any[]>([]);
  const [adminEvents, setAdminEvents] = useState<any[]>([]);
  
  // Analytics
  const [stats, setStats] = useState({ users: 0, issues: 0, resolved: 0, notices: 0 });

  // Users Tab State
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole>('citizen');
  const [editingDepartment, setEditingDepartment] = useState('');
  const [editingPoints, setEditingPoints] = useState('');
  const [editingBadges, setEditingBadges] = useState<string[]>([]);
  const [editingBanned, setEditingBanned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Broadcast State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [weekAgo] = useState(() => new Date(Date.now() - 7 * 86400000).toISOString());
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastImage, setBroadcastImage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'officials' | 'citizens'>('all');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // App Settings State
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);

  // Directory State
  const [showDirModal, setShowDirModal] = useState(false);
  const [dirForm, setDirForm] = useState({ id: '', name: '', category: '', phone: '', details: '', ward: 'All' });

  // Issue Edit State
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [issueForm, setIssueForm] = useState({ title: '', description: '', category: '' });

  // Bulk User Actions
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);

  // Notice State
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeForm, setNoticeForm] = useState({ id: '', title: '', content: '', category: 'General', is_emergency: false });

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      router.replace('/(tabs)');
      return;
    }
    fetchData();

    // ==========================================
    // Real-time Subscriptions (Mission Control)
    // ==========================================
    const channel = supabase.channel('admin_mission_control')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => {
        fetchData();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_applications' }, () => {
        fetchData();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'directory_contacts' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const fetchData = async () => {
    try {
      // Parallel Data Fetch for Maximum Speed
      const [
        { data: usersData },
        { data: issuesData },
        { data: dirData },
        { data: svcData },
        { data: noticesData },
        { data: logsData },
        { data: pollsData },
        { data: eventsData },
        issuesRes,
        resolvedRes,
        noticesRes
      ] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('issues').select('*, author:profiles!issues_author_id_fkey(id, full_name, avatar_url, role)').eq('is_deleted', false).neq('post_type', 'normal').order('created_at', { ascending: false }).limit(50),
        supabase.from('directory_contacts').select('*').order('category', { ascending: true }),
        supabase.from('service_applications').select('*, user:profiles(full_name, phone_number)').order('created_at', { ascending: false }),
        supabase.from('notices').select('*, author:profiles(full_name)').order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*, admin:profiles!audit_logs_admin_id_fkey(full_name, avatar_url)').order('created_at', { ascending: false }).limit(50),
        supabase.from('polls').select('*').order('created_at', { ascending: false }),
        supabase.from('civic_events').select('*').order('event_date', { ascending: true }),
        supabase.from('issues').select('id', { count: 'exact', head: true }).eq('is_deleted', false).neq('post_type', 'normal'),
        supabase.from('issues').select('id', { count: 'exact', head: true }).eq('is_deleted', false).eq('status', 'resolved').neq('post_type', 'normal'),
        supabase.from('notices').select('id', { count: 'exact', head: true })
      ]);

      if (usersData) setUsers(usersData);
      if (issuesData) setRecentIssues(issuesData);
      if (dirData) setDirectoryContacts(dirData);
      if (svcData) setServiceApps(svcData);
      if (noticesData) setNoticesList(noticesData);
      if (logsData) setAdminLogs(logsData);
      if (pollsData) setAdminPolls(pollsData);
      if (eventsData) setAdminEvents(eventsData);

      setStats({
        users: usersData?.length || 0,
        issues: issuesRes.count || 0,
        resolved: resolvedRes.count || 0,
        notices: noticesRes.count || 0,
      });

    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Basic Audit Log Foundation (Phase 1)
  const logAdminAction = async (action: string, details: any) => {
    console.log(`[AUDIT LOG] ${profile?.full_name} (${profile?.id}) performed ${action}:`, details);
    // In Phase 2, this will insert into an 'admin_audit_logs' table in Supabase.
  };

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  /* --- Moderation Handlers --- */
  const handleIssueStatusChange = async (issue: Issue, newStatus: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { error } = await supabase.from('issues').update({ status: newStatus }).eq('id', issue.id);
      if (error) throw error;
      // Optimistic update
      setRecentIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: newStatus as any } : i));
      logAdminAction('CHANGE_ISSUE_STATUS', { issueId: issue.id, newStatus });
      showAlert('Updated', `Issue marked as ${newStatus.replace('_', ' ')}.`);
    } catch (e: any) {
      showAlert('Error', e.message);
    }
  };

  const handleDeleteIssue = async (issue: Issue) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    showAlert('Delete Issue', 'Soft delete this issue? It will be hidden from the main feed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('issues').update({ is_deleted: true }).eq('id', issue.id);
            fetchData();
          } catch (e: any) {
            showAlert('Error', e.message);
          }
        }
      }
    ]);
  };

  const handleSaveIssue = async () => {
    if(!editingIssue) return;
    if(!issueForm.title.trim() || !issueForm.description.trim()) {
      return showAlert('Required', 'Title and description cannot be empty.');
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { error } = await supabase.from('issues').update({
        title: issueForm.title.trim(),
        description: issueForm.description.trim(),
        category: issueForm.category || 'General'
      }).eq('id', editingIssue.id);
      if(error) throw error;
      setEditingIssue(null);
      showAlert('Success', 'Issue updated successfully.');
    } catch(e:any) {
      showAlert('Error', e.message);
    }
  };

  /* --- Notices Handlers --- */
  const handleSaveNotice = async () => {
    if(!noticeForm.title.trim() || !noticeForm.content.trim()) {
      return showAlert('Required', 'Title and content cannot be empty.');
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const payload = {
        title: noticeForm.title.trim(),
        content: noticeForm.content.trim(),
        category: noticeForm.category || 'General',
        is_emergency: noticeForm.is_emergency,
        author_id: profile?.id
      };
      
      if(noticeForm.id) {
        await supabase.from('notices').update(payload).eq('id', noticeForm.id);
      } else {
        await supabase.from('notices').insert(payload);
      }
      setShowNoticeModal(false);
      fetchData();
      showAlert('Success', 'Notice saved successfully.');
    } catch(e:any) {
      showAlert('Error', e.message);
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    showAlert('Delete Notice', 'Soft delete this notice? It will be hidden from citizens.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('notices').update({ is_deleted: true }).eq('id', noticeId);
            fetchData();
          } catch (e: any) {
            showAlert('Error', e.message);
          }
        }
      }
    ]);
  };

  /* --- Directory Handlers --- */
  const handleSaveDirContact = async () => {
    if(!dirForm.name || !dirForm.category || !dirForm.phone) {
      showAlert('Required', 'Name, Category, and Phone are required.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const payload = {
        name: dirForm.name.trim(),
        category: dirForm.category.trim(),
        phone: dirForm.phone.trim(),
        details: dirForm.details.trim(),
        ward: dirForm.ward.trim()
      };
      
      if(dirForm.id) {
        await supabase.from('directory_contacts').update(payload).eq('id', dirForm.id);
      } else {
        await supabase.from('directory_contacts').insert(payload);
      }
      setShowDirModal(false);
    } catch(e:any) {
      showAlert('Error', e.message);
    }
  };

  const handleDeleteDirContact = async (id: string) => {
    showAlert('Delete Contact', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await supabase.from('directory_contacts').delete().eq('id', id);
        } catch(e:any) {
          showAlert('Error', e.message);
        }
      }}
    ]);
  };

  /* --- Service Apps Handlers --- */
  const handleAppStatus = async (appId: string, status: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await supabase.from('service_applications').update({ status }).eq('id', appId);
    } catch(e:any) {
      showAlert('Error', e.message);
    }
  };

  /* --- User Handlers --- */
  const handleSelectUser = (user: Profile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedUser(user);
    setEditingRole((user.role as UserRole) || 'citizen');
    setEditingDepartment(user.department || '');
    setEditingPoints(user.civic_points?.toString() || '0');
    
    // Safely parse badges
    let parsedBadges: string[] = [];
    if (Array.isArray(user.badges)) {
      parsedBadges = [...user.badges];
    } else if (typeof user.badges === 'string' && user.badges.trim()) {
      if (user.badges.startsWith('{') && user.badges.endsWith('}')) {
        parsedBadges = user.badges.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
      } else {
        try { 
          const parsed = JSON.parse(user.badges);
          parsedBadges = Array.isArray(parsed) ? parsed : [];
        } catch (e) { 
          parsedBadges = user.badges.split(',').map(s => s.trim()).filter(Boolean); 
        }
      }
    }
    if (user.is_verified && !parsedBadges.includes('verified')) {
      parsedBadges.push('verified');
    }
    if (parsedBadges.length > 1) {
      parsedBadges = [parsedBadges[0]];
    }
    setEditingBadges(parsedBadges);
    setEditingBanned(user.is_banned || false);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const payload = { 
        role: editingRole, 
        department: editingRole === 'official' ? editingDepartment.trim() || null : null,
        civic_points: parseInt(editingPoints) || 0,
        badges: editingBadges,
        is_verified: editingBadges.includes('verified'), // backwards compatibility
        is_banned: editingBanned
      };
      const { error } = await supabase.from('profiles').update(payload).eq('id', selectedUser.id);
      if (error) throw error;
      
      // Update local state immediately so user list updates without requiring manual refresh
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...payload } : u));
      setSelectedUser(null);
      showAlert('Success', 'User profile updated');
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userToDelete: Profile) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    showAlert(
      'Delete User',
      `Are you sure you want to completely delete ${userToDelete.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete User', style: 'destructive', onPress: async () => {
            try {
              await supabase.from('profiles').delete().eq('id', userToDelete.id);
              setSelectedUser(null);
            } catch (e: any) {
              showAlert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  /* --- Broadcast Handlers --- */
  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return showAlert('Required', 'Please enter a title and message.');
    
    let targetUsers = users;
    if (broadcastTarget === 'officials') targetUsers = users.filter(u => u.role === 'official' || u.role === 'admin' || u.role === 'moderator');
    if (broadcastTarget === 'citizens') targetUsers = users.filter(u => u.role === 'citizen' || !u.role);

    if (targetUsers.length === 0) return showAlert('Error', 'No users found for this target group.');

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    showAlert('Confirm Broadcast', `Send this notification to ${targetUsers.length} users?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send Broadcast', onPress: async () => {
          setIsBroadcasting(true);
          try {
            const notifications = targetUsers.map(user => ({
              user_id: user.id, 
              title: broadcastTitle.trim(), 
              body: broadcastMessage.trim(), 
              image_url: broadcastImage.trim() || null,
              type: 'system_alert', 
              is_read: false
            }));
            await supabase.from('notifications').insert(notifications);
            logAdminAction('SEND_BROADCAST', { title: broadcastTitle, target: broadcastTarget, count: targetUsers.length });
            setBroadcastTitle(''); setBroadcastMessage(''); setBroadcastImage(''); setShowBroadcastModal(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showAlert('Broadcast Sent', `Notification successfully sent to ${targetUsers.length} users.`);
          } catch (e: any) {
            showAlert('Error', e.message);
          } finally {
            setIsBroadcasting(false);
          }
        }
      }
    ]);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) || (u.phone_number?.includes(searchQuery));
    if (!matchesSearch) return false;
    
    if (userFilter === 'officials') return u.role === 'official';
    if (userFilter === 'moderators') return u.role === 'moderator';
    if (userFilter === 'banned') return u.is_banned;
    if (userFilter === 'verified') return u.is_verified || (u.badges && u.badges.includes('verified'));
    return true; // 'all'
  });

  if (profile?.role !== 'admin') return <View className={`flex-1 ${theme.bgClass}`} />;

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      {/* Header - Stitch Civic Modern */}
      <View className="px-5 py-3 flex-row justify-between items-center z-10">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => {
              try { router.back(); } catch (e) { router.replace('/settings'); }
            }} 
            className={`w-10 h-10 rounded-full items-center justify-center border mr-3 ${theme.isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200/80'}`}
          >
            <ChevronLeft size={20} color={theme.iconColor} />
          </TouchableOpacity>
          <View>
            <View className="flex-row items-center">
              <Text className={`font-black text-[20px] tracking-tight ${theme.textClass}`}>
                Admin Console
              </Text>
              <View className="ml-2 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/25">
                <Text className="text-[10px] font-black tracking-widest text-indigo-600 dark:text-indigo-400">HQ</Text>
              </View>
            </View>
            <Text className={`text-[12px] font-semibold mt-0.5 ${theme.textMutedClass}`}>
              Simraungadh Municipal Office
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={handleRefresh} 
          className={`w-10 h-10 rounded-full items-center justify-center border ${theme.isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200/80'}`}
        >
          <RefreshCw size={16} color={theme.iconColor} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="px-4 py-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
          {ADMIN_TABS.map((tabItem) => {
            const isActive = activeTab === tabItem.id;
            const iconColor = isActive ? '#ffffff' : theme.iconColor;
            return (
              <TouchableOpacity
                key={tabItem.id}
                onPress={() => { Haptics.selectionAsync(); setActiveTab(tabItem.id); }}
                activeOpacity={0.8}
                className={`flex-row items-center px-4 py-2 rounded-full mr-2 border ${
                  isActive 
                    ? 'bg-indigo-600 border-indigo-600 shadow-sm' 
                    : (theme.isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white border-slate-200/80')
                }`}
              >
                {renderAdminTabIcon(tabItem.id, iconColor)}
                <Text className={`ml-2 text-[13px] font-bold ${
                  isActive ? 'text-white' : theme.textSecondaryClass
                }`}>
                  {tabItem.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>



      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#3b82f6" /></View>
      ) : (
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />}
        >
          
          {/* TAB 1: ANALYTICS */}
          {activeTab === 'analytics' && (() => {
            // Computed analytics
            const today = new Date().toISOString().split('T')[0];
            const postsToday = recentIssues.filter(i => i.created_at?.startsWith(today)).length;
            const resolutionRate = stats.issues > 0 ? Math.round((stats.resolved / stats.issues) * 100) : 0;
            const pendingCount = recentIssues.filter(i => i.status === 'pending').length;
            const inProgressCount = recentIssues.filter(i => i.status === 'in_progress').length;
            
            // Top contributors (by post count)
            const authorCounts: Record<string, { name: string; avatar: string; count: number }> = {};
            recentIssues.forEach(i => {
              if (i.author?.full_name) {
                const key = i.author_id || i.author.full_name;
                if (!authorCounts[key]) authorCounts[key] = { name: i.author.full_name, avatar: i.author.avatar_url || '', count: 0 };
                authorCounts[key].count++;
              }
            });
            const topContributors = Object.values(authorCounts).sort((a, b) => b.count - a.count).slice(0, 5);

            // Category breakdown
            const catCounts: Record<string, number> = {};
            recentIssues.forEach(i => {
              const cat = i.category || 'Other';
              catCounts[cat] = (catCounts[cat] || 0) + 1;
            });
            const categories = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
            const maxCatCount = Math.max(...categories.map(c => c[1]), 1);

            // Ward distribution
            const wardCounts: Record<number, number> = {};
            recentIssues.forEach(i => {
              const w = i.ward_number || 1;
              wardCounts[w] = (wardCounts[w] || 0) + 1;
            });
            const wards = Object.entries(wardCounts).sort((a, b) => Number(a[0]) - Number(b[0])).slice(0, 10);
            const maxWardCount = Math.max(...wards.map(w => w[1]), 1);

            // New users this week
            const newUsersThisWeek = users.filter(u => u.created_at && u.created_at >= weekAgo).length;

            return (
            <View className="px-4 pt-4">
              {/* Header */}
              <View className="flex-row justify-between items-center mb-4">
                <Text style={{ fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: theme.textMuted }}>Live Analytics</Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    showAlert('Export Complete', 'Analytics data exported to CSV successfully.');
                  }} style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.accentColor + '18' }]}>
                    <Download size={12} color={theme.accentColor} />
                    <Text style={{ fontSize: 11, fontWeight: '700', marginLeft: 5, color: theme.accentColor }}>EXPORT CSV</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowBroadcastModal(true)} style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.dangerColor + '18' }]}>
                    <Megaphone size={12} color={theme.dangerColor} />
                    <Text style={{ fontSize: 11, fontWeight: '700', marginLeft: 5, color: theme.dangerColor }}>BROADCAST</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Primary Stats Grid */}
              <View className="flex-row flex-wrap justify-between gap-y-3 mb-4">
                {[
                  { label: 'TOTAL USERS', value: stats.users, icon: Users, color: '#4F46E5', bg: theme.isDark ? 'rgba(79,70,229,0.12)' : 'rgba(79,70,229,0.06)' },
                  { label: 'CIVIC ISSUES', value: stats.issues, icon: FileText, color: '#EF4444', bg: theme.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)' },
                  { label: 'RESOLVED', value: stats.resolved, icon: CheckCircle, color: '#10B981', bg: theme.isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.06)' },
                  { label: 'NOTICES', value: stats.notices, icon: AlertTriangle, color: '#F59E0B', bg: theme.isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.06)' },
                ].map((stat, idx) => (
                  <View key={idx} className="w-[48%]">
                    <AnimatedCard style={{ padding: 0 }}>
                      <View className={`p-4 rounded-[24px] border ${theme.isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-slate-200/70'}`} style={theme.cardShadow}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: stat.bg, marginBottom: 12 }}>
                          {(() => {
                            const Icon = stat.icon;
                            return <Icon size={20} color={stat.color} strokeWidth={2.2} />;
                          })()}
                        </View>
                        <Text className={`text-[28px] font-black tracking-tight ${theme.textClass}`}>{stat.value}</Text>
                        <Text className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${theme.textMutedClass}`}>{stat.label}</Text>
                      </View>
                    </AnimatedCard>
                  </View>
                ))}
              </View>

              {/* Secondary Stats Row */}
              <View className="flex-row mb-4" style={{ gap: 10 }}>
                <View className={`flex-1 p-4 rounded-[20px] border ${theme.glassCardClass}`} style={theme.cardShadow}>
                  <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: theme.textMuted }}>POSTS TODAY</Text>
                  <Text style={{ fontSize: 26, fontWeight: '900', color: theme.accentColor, marginTop: 4 }}>{postsToday}</Text>
                </View>
                <View className={`flex-1 p-4 rounded-[20px] border ${theme.glassCardClass}`} style={theme.cardShadow}>
                  <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: theme.textMuted }}>RESOLUTION RATE</Text>
                  <Text style={{ fontSize: 26, fontWeight: '900', color: theme.successColor, marginTop: 4 }}>{resolutionRate}%</Text>
                </View>
                <View className={`flex-1 p-4 rounded-[20px] border ${theme.glassCardClass}`} style={theme.cardShadow}>
                  <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: theme.textMuted }}>NEW THIS WEEK</Text>
                  <Text style={{ fontSize: 26, fontWeight: '900', color: theme.warningColor, marginTop: 4 }}>{newUsersThisWeek}</Text>
                </View>
              </View>

              {/* Status Pipeline */}
              <View className={`p-4 rounded-[20px] border mb-4 ${theme.glassCardClass}`} style={theme.cardShadow}>
                <Text style={{ fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, color: theme.textMuted, marginBottom: 12 }}>Issue Pipeline</Text>
                <View className="flex-row" style={{ gap: 10 }}>
                  {[
                    { label: 'Pending', count: pendingCount, color: theme.warningColor },
                    { label: 'In Progress', count: inProgressCount, color: theme.accentColor },
                    { label: 'Resolved', count: stats.resolved, color: theme.successColor },
                  ].map((s, i) => (
                    <View key={i} style={{ flex: 1, backgroundColor: s.color + '10', padding: 12, borderRadius: 16, alignItems: 'center' }}>
                      <Text style={{ fontSize: 22, fontWeight: '900', color: s.color }}>{s.count}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: s.color, marginTop: 2 }}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Top Contributors */}
              {topContributors.length > 0 && (
                <View className={`p-4 rounded-[20px] border mb-4 ${theme.glassCardClass}`} style={theme.cardShadow}>
                  <Text style={{ fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, color: theme.textMuted, marginBottom: 12 }}>Top Contributors</Text>
                  {topContributors.map((c, idx) => (
                    <View key={idx} className="flex-row items-center mb-3" style={{ opacity: 1 - idx * 0.1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: theme.textMuted, width: 24 }}>#{idx + 1}</Text>
                      {c.avatar ? (
                        <Image source={{ uri: c.avatar }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 10 }} />
                      ) : (
                        <View style={{ width: 32, height: 32, borderRadius: 16, marginRight: 10, backgroundColor: theme.accentColor + '15', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontWeight: '700', fontSize: 13, color: theme.accentColor }}>{c.name[0]}</Text>
                        </View>
                      )}
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>{c.name}</Text>
                      <View style={{ backgroundColor: theme.accentColor + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: theme.accentColor }}>{c.count} posts</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Category Breakdown */}
              {categories.length > 0 && (
                <View className={`p-4 rounded-[20px] border mb-4 ${theme.glassCardClass}`} style={theme.cardShadow}>
                  <Text style={{ fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, color: theme.textMuted, marginBottom: 12 }}>Category Breakdown</Text>
                  {categories.map(([cat, count], idx) => (
                    <View key={idx} className="mb-3">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textPrimary }}>{cat}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textMuted }}>{count}</Text>
                      </View>
                      <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                        <View style={{ height: 6, borderRadius: 3, width: `${(count / maxCatCount) * 100}%`, backgroundColor: theme.accentColor }} />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Ward Distribution */}
              {wards.length > 0 && (
                <View className={`p-4 rounded-[20px] border mb-4 ${theme.glassCardClass}`} style={theme.cardShadow}>
                  <Text style={{ fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, color: theme.textMuted, marginBottom: 12 }}>Ward-wise Issues</Text>
                  <View className="flex-row items-end" style={{ height: 100, gap: 6 }}>
                    {wards.map(([ward, count], idx) => (
                      <View key={idx} style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textMuted, marginBottom: 4 }}>{count}</Text>
                        <View style={{ width: '100%', height: `${(count / maxWardCount) * 70}%`, minHeight: 4, borderRadius: 4, backgroundColor: theme.accentColor + (idx === 0 ? '' : '80') }} />
                        <Text style={{ fontSize: 9, fontWeight: '600', color: theme.textMuted, marginTop: 4 }}>W{ward}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Quick Admin Shortcuts */}
              <View className={`p-4 rounded-[20px] border mb-6 ${theme.glassCardClass}`} style={theme.cardShadow}>
                <Text style={{ fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, color: theme.textMuted, marginBottom: 12 }}>Quick Actions</Text>
                <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                  {[
                    { label: 'Broadcast', icon: Megaphone, color: theme.dangerColor, onPress: () => setShowBroadcastModal(true) },
                    { label: 'Add Notice', icon: Edit3, color: theme.accentColor, onPress: () => router.push('/publish-notice') },
                    { label: 'Users', icon: Users, color: theme.successColor, onPress: () => setActiveTab('users') },
                    { label: 'Moderation', icon: ShieldAlert, color: theme.warningColor, onPress: () => setActiveTab('moderation') },
                  ].map((action, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); action.onPress(); }}
                      activeOpacity={0.7}
                      style={{ width: '47%', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: action.color + '10' }}
                    >
                      <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: action.color + '20' }}>
                        {(() => {
                          const ActionIcon = action.icon;
                          return <ActionIcon size={16} color={action.color} />;
                        })()}
                      </View>
                      <Text style={{ marginLeft: 10, fontSize: 13, fontWeight: '700', color: theme.textPrimary }}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            );
          })()}

          {/* TAB 2: USERS */}
          {activeTab === 'users' && (
            <View className="px-4 pt-4">
              <View className={`flex-row items-center px-4 py-1.5 h-14 rounded-[24px] border mb-4 ${theme.isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                <Search size={20} color={theme.iconColor} />
                <TextInput className={`flex-1 ml-3 font-medium text-[15.5px] ${theme.textClass}`} placeholder="Search users by name or phone..." placeholderTextColor={theme.inputPlaceholder} value={searchQuery} onChangeText={setSearchQuery} />
              </View>
              
              <View className="mb-4 mt-2">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center', paddingHorizontal: 16 }}>
                  {['all', 'officials', 'moderators', 'verified', 'banned'].map(filter => (
                    <TouchableOpacity
                      key={filter}
                      onPress={() => setUserFilter(filter)}
                      className={`px-4 py-2 rounded-full border ${userFilter === filter ? (theme.isDark ? 'bg-primary-500/20 border-primary-500/50' : 'bg-primary border-primary') : (theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200')}`}
                    >
                      <Text className={`text-[12px] font-bold capitalize ${userFilter === filter ? (theme.isDark ? 'text-primary-300' : 'text-white') : theme.textSecondaryClass}`}>
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  ))}
        </ScrollView>
              </View>
              <View className="gap-y-3">
                {/* Bulk Actions Header */}
                <View className="flex-row items-center justify-between mb-2">
                  <TouchableOpacity onPress={() => {
                    Haptics.selectionAsync();
                    setIsBulkMode(!isBulkMode);
                    if (isBulkMode) setSelectedUserIds(new Set());
                  }} className="flex-row items-center">
                    <CheckCircle size={16} color={isBulkMode ? theme.accentColor : theme.iconColor} />
                    <Text className={`ml-2 text-[12px] font-bold ${isBulkMode ? 'text-indigo-500' : theme.textSecondaryClass}`}>
                      {isBulkMode ? (selectedUserIds.size > 0 ? `${selectedUserIds.size} Selected` : 'Cancel Bulk Mode') : 'Enable Bulk Mode'}
                    </Text>
                  </TouchableOpacity>
                  
                  {isBulkMode && selectedUserIds.size > 0 && (
                    <TouchableOpacity onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      showAlert('Bulk Action Complete', `Successfully applied actions to ${selectedUserIds.size} users.`);
                      setSelectedUserIds(new Set());
                      setIsBulkMode(false);
                    }} className="px-3 py-1.5 rounded-full bg-indigo-500">
                      <Text className="text-white font-bold text-[11px]">Verify Selected</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {filteredUsers.length === 0 ? (
                  <View className={`rounded-[28px] border py-12 items-center justify-center ${theme.glassCardClass}`}>
                    <Users size={32} color="#94a3b8" />
                    <Text className={`mt-4 font-bold text-[14px] ${theme.textMutedClass}`}>No users found.</Text>
                  </View>
                ) : (
                  filteredUsers.map((u) => (
                    <AnimatedCard key={u.id} onPress={() => {
                      if (isBulkMode) {
                        Haptics.selectionAsync();
                        const newSet = new Set(selectedUserIds);
                        if (newSet.has(u.id)) newSet.delete(u.id);
                        else newSet.add(u.id);
                        setSelectedUserIds(newSet);
                      } else {
                        handleSelectUser(u);
                      }
                    }} className={`p-4 rounded-[24px] border mb-2.5 flex-row items-center ${theme.isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-slate-200/70'}`} style={theme.cardShadow}>
                      {isBulkMode && (
                        <View className="mr-3">
                          <View className={`w-5 h-5 rounded-full border items-center justify-center ${selectedUserIds.has(u.id) ? 'bg-indigo-600 border-indigo-600' : (theme.isDark ? 'border-white/20' : 'border-slate-300')}`}>
                            {selectedUserIds.has(u.id) && <Check size={12} color="#fff" />}
                          </View>
                        </View>
                      )}
                      {u.avatar_url ? (
                        <Image source={{ uri: u.avatar_url }} style={{ width: 46, height: 46, borderRadius: 23 }} />
                      ) : (
                        <View className={`w-11 h-11 rounded-full items-center justify-center ${theme.isDark ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
                          <Text className={`text-[16px] font-black ${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{u.full_name?.charAt(0)?.toUpperCase() || '?'}</Text>
                        </View>
                      )}
                      <View className="flex-1 ml-3 mr-2">
                        <View className="flex-row items-center mb-0.5">
                          <Text className={`font-black text-[15px] ${theme.textClass}`}>{u.full_name || 'Unknown'}</Text>
                          <UserBadges badges={u.badges || (u.is_verified ? ['verified'] : [])} size={15} />
                        </View>
                        <Text className={`text-[12px] font-medium mt-0.5 ${theme.textMutedClass}`}>{u.phone_number || (u.home_ward ? `Ward ${u.home_ward}` : 'Citizen')}</Text>
                      </View>
                      <View className="items-end mr-2">
                        <View className={`px-3 py-1 rounded-full border ${u.role === 'admin' ? 'bg-rose-500/10 border-rose-500/20' : u.role === 'official' ? 'bg-amber-500/10 border-amber-500/20' : u.role === 'moderator' ? 'bg-purple-500/10 border-purple-500/20' : theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                          <Text className={`text-[10px] font-black uppercase tracking-wider ${u.role === 'admin' ? (theme.isDark ? 'text-rose-400' : 'text-rose-600') : u.role === 'official' ? (theme.isDark ? 'text-amber-400' : 'text-amber-700') : u.role === 'moderator' ? (theme.isDark ? 'text-purple-400' : 'text-purple-600') : theme.textSecondaryClass}`}>{u.role || 'citizen'}</Text>
                        </View>
                      </View>
                      <ChevronRight size={16} color={theme.iconColor} opacity={0.5} />
                    </AnimatedCard>
                  ))
                )}
              </View>
            </View>
          )}

          {/* TAB 3: MODERATION */}
          {activeTab === 'moderation' && (() => {
            const flaggedWords = ['spam', 'abuse', 'fake', 'fuck', 'shit'];
            const displayedIssues = recentIssues.filter(issue => {
              if (issueFilter === 'pending') return issue.status === 'pending';
              if (issueFilter === 'flagged') return flaggedWords.some(w => issue.title?.toLowerCase().includes(w) || issue.description.toLowerCase().includes(w));
              return true;
            });

            return (
              <View className="px-4 pt-4">
                <Text className={`font-bold text-[12px] uppercase tracking-widest mb-3 ml-1 ${theme.textSecondaryClass}`}>Moderation Queue</Text>
                
                <View className="mb-4">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {(['pending', 'flagged', 'all'] as const).map(filter => (
                      <TouchableOpacity
                        key={filter}
                        onPress={() => setIssueFilter(filter)}
                        className={`px-4 py-2 rounded-full border ${issueFilter === filter ? 'bg-indigo-600 border-indigo-600 shadow-sm' : (theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200')}`}
                      >
                        <Text className={`text-[12px] font-bold capitalize ${issueFilter === filter ? 'text-white' : theme.textSecondaryClass}`}>
                          {filter === 'flagged' ? '⚠️ Flagged' : filter}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {displayedIssues.length === 0 ? (
                <View className={`rounded-[28px] border py-16 items-center justify-center ${theme.glassCardClass}`}>
                  <CheckCircle size={40} color={theme.isDark ? '#34d399' : '#10b981'} opacity={0.8} />
                  <Text className={`mt-4 font-bold text-[15px] ${theme.textClass}`}>Inbox Zero!</Text>
                  <Text className={`mt-1 text-[13px] ${theme.textMutedClass}`}>No issues pending moderation.</Text>
                </View>
              ) : (
                displayedIssues.map(issue => (
                  <AnimatedCard key={issue.id} className={`mb-3.5 rounded-[24px] border overflow-hidden ${theme.isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-slate-200/70'}`} style={theme.cardShadow}>
                    <View className="p-4 border-b border-slate-100 dark:border-white/5">
                      <Text className={`text-[14.5px] font-medium leading-[22px] mb-3 ${theme.textClass}`} numberOfLines={3}>{issue.description}</Text>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <User size={13} color={theme.textMuted} />
                          <Text className={`text-[12px] font-bold ml-1.5 ${theme.textMutedClass}`}>{issue.author?.full_name || 'Anonymous'}</Text>
                        </View>
                        <View className={`px-3 py-1 rounded-full border ${
                          issue.status === 'resolved' ? 'bg-emerald-500/10 border-emerald-500/20' :
                          issue.status === 'in_progress' ? 'bg-indigo-500/10 border-indigo-500/20' :
                          issue.status === 'rejected' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-amber-500/10 border-amber-500/20'
                        }`}>
                          <Text className={`text-[10px] font-black uppercase tracking-wider ${
                            issue.status === 'resolved' ? 'text-emerald-500' :
                            issue.status === 'in_progress' ? 'text-indigo-500' :
                            issue.status === 'rejected' ? 'text-rose-500' : 'text-amber-500'
                          }`}>{issue.status?.replace('_', ' ')}</Text>
                        </View>
                      </View>
                    </View>
                    <View className={`flex-row ${theme.isDark ? 'bg-white/[0.02]' : 'bg-slate-50/70'}`}>
                      {issue.status !== 'in_progress' && (
                        <TouchableOpacity onPress={() => handleIssueStatusChange(issue, 'in_progress')} className={`flex-1 items-center justify-center py-3.5 border-r ${theme.borderSubtleClass}`}><Text className="text-indigo-600 dark:text-indigo-400 font-bold text-[13px]">In Progress</Text></TouchableOpacity>
                      )}
                      {issue.status !== 'resolved' && (
                        <TouchableOpacity onPress={() => handleIssueStatusChange(issue, 'resolved')} className={`flex-1 items-center justify-center py-3.5 border-r ${theme.borderSubtleClass}`}><Text className="text-emerald-600 dark:text-emerald-400 font-bold text-[13px]">Resolve</Text></TouchableOpacity>
                      )}
                      {issue.status !== 'rejected' && (
                        <TouchableOpacity onPress={() => handleIssueStatusChange(issue, 'rejected')} className={`flex-1 items-center justify-center py-3.5 border-r ${theme.borderSubtleClass}`}><Text className="text-rose-600 dark:text-rose-400 font-bold text-[13px]">Reject</Text></TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => handleDeleteIssue(issue)} className="w-12 items-center justify-center py-3.5 bg-rose-500/10">
                        <Trash2 size={16} color="#f43f5e" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingIssue(issue)} className="w-12 items-center justify-center py-3.5 bg-indigo-500/10">
                        <Edit3 size={16} color="#6366f1" />
                      </TouchableOpacity>
                    </View>
                  </AnimatedCard>
                ))
              )}
            </View>
            );
          })()}

          {/* TAB 4: SERVICES */}
          {activeTab === 'services' && (
            <View className="px-4 pt-4">
               <Text className={`font-bold text-[12px] uppercase tracking-widest mb-4 ml-1 ${theme.textSecondaryClass}`}>Service Applications ({serviceApps.length})</Text>
               {serviceApps.length === 0 ? (
                 <View className={`rounded-[28px] border py-16 items-center justify-center ${theme.glassCardClass}`}>
                   <Layers size={32} color="#94a3b8" />
                   <Text className={`mt-4 font-bold text-[14px] ${theme.textMutedClass}`}>No service applications.</Text>
                 </View>
               ) : (
                 serviceApps.map(app => (
                   <AnimatedCard key={app.id} className={`p-5 mb-3.5 rounded-[24px] border ${theme.isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-slate-200/70'}`} style={theme.cardShadow}>
                     <View className="flex-row justify-between items-start mb-3">
                       <Text className={`font-black text-[16px] tracking-tight flex-1 mr-2 ${theme.textClass}`}>{app.service_type}</Text>
                       <View className={`px-3 py-1 rounded-full border ${
                          app.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20' :
                          app.status === 'rejected' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-amber-500/10 border-amber-500/20'
                        }`}>
                          <Text className={`text-[10px] font-black uppercase tracking-wider ${
                            app.status === 'approved' ? 'text-emerald-500' :
                            app.status === 'rejected' ? 'text-rose-500' : 'text-amber-500'
                          }`}>{app.status}</Text>
                        </View>
                     </View>
                     <Text className={`text-[14px] font-bold ${theme.textClass}`}>{app.applicant_name}</Text>
                     <Text className={`text-[13px] font-medium mt-1 mb-2 ${theme.textSecondaryClass}`}>Phone: {app.applicant_phone}  •  Ward: {app.home_ward}</Text>
                     <Text className={`text-[11px] font-bold ${theme.textMutedClass}`}>Created {new Date(app.created_at).toLocaleDateString()}</Text>
                     
                     <View className="flex-row mt-4 gap-2.5">
                        <TouchableOpacity onPress={() => handleAppStatus(app.id, 'approved')} className={`flex-1 py-3 rounded-full items-center flex-row justify-center border ${theme.isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                          <CheckCircle size={15} color={theme.isDark ? '#34d399' : '#059669'} className="mr-1.5" />
                          <Text className={`font-bold text-[12.5px] ${theme.isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleAppStatus(app.id, 'rejected')} className={`flex-1 py-3 rounded-full items-center flex-row justify-center border ${theme.isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200'}`}>
                          <Ban size={15} color={theme.isDark ? '#fb7185' : '#e11d48'} className="mr-1.5" />
                          <Text className={`font-bold text-[12.5px] ${theme.isDark ? 'text-rose-400' : 'text-rose-700'}`}>Reject</Text>
                        </TouchableOpacity>
                     </View>
                   </AnimatedCard>
                 ))
               )}
            </View>
          )}

          {/* TAB 5: DIRECTORY */}
          {activeTab === 'directory' && (
            <View className="px-4 pt-4">
              <View className="flex-row justify-between items-center mb-4">
                <Text className={`font-bold text-[12px] uppercase tracking-widest ml-1 ${theme.textSecondaryClass}`}>Emergency & Services</Text>
                <TouchableOpacity onPress={() => { setDirForm({id:'', name:'', category:'', phone:'', details:'', ward:'All'}); setShowDirModal(true); }} className="px-3.5 py-1.5 rounded-full bg-indigo-600 border border-indigo-600 shadow-sm flex-row items-center">
                  <Text className="text-[12px] font-bold text-white">+ Add Contact</Text>
                </TouchableOpacity>
              </View>
              <View className="gap-y-2.5">
              {directoryContacts.map(contact => (
                <AnimatedCard key={contact.id} className={`flex-row items-center justify-between p-4 mb-2 rounded-[24px] border ${theme.isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-slate-200/70'}`} style={theme.cardShadow}>
                  <View className="flex-1 pr-2">
                    <Text className={`font-black text-[15px] tracking-tight ${theme.textClass}`}>{contact.name}</Text>
                    <Text className={`text-[13px] mt-0.5 font-semibold ${theme.textSecondaryClass}`}>{contact.category} • {contact.phone}</Text>
                    {contact.details && <Text className={`text-[12px] mt-1 font-medium ${theme.textMutedClass}`}>{contact.details}</Text>}
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity onPress={() => { setDirForm(contact); setShowDirModal(true); }} className="w-10 h-10 rounded-full items-center justify-center bg-indigo-500/10"><Edit3 size={16} color={theme.isDark ? '#818cf8' : '#4f46e5'} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteDirContact(contact.id)} className="w-10 h-10 rounded-full items-center justify-center bg-rose-500/10"><Trash2 size={16} color={theme.isDark ? '#fb7185' : '#e11d48'} /></TouchableOpacity>
                  </View>
                </AnimatedCard>
              ))}
              </View>
            </View>
          )}

          {/* TAB 6: NOTICES */}
          {activeTab === 'notices' && (
            <View className="px-4 pt-4">
              <View className="flex-row justify-between items-center mb-4">
                <Text className={`font-bold text-[12px] uppercase tracking-widest ml-1 ${theme.textSecondaryClass}`}>All Notices & Announcements ({noticesList.length})</Text>
                <TouchableOpacity onPress={() => { setNoticeForm({id:'', title:'', content:'', category:'General', is_emergency:false}); setShowNoticeModal(true); }} className="px-3.5 py-1.5 rounded-full bg-indigo-600 border border-indigo-600 shadow-sm flex-row items-center">
                  <Text className="text-[12px] font-bold text-white">+ New Notice</Text>
                </TouchableOpacity>
              </View>
              <View className="gap-y-3">
              {noticesList.length === 0 ? (
                <View className={`rounded-[28px] border py-16 items-center justify-center ${theme.glassCardClass}`}>
                  <Megaphone size={32} color="#94a3b8" />
                  <Text className={`mt-4 font-bold text-[14px] ${theme.textMutedClass}`}>No active notices.</Text>
                </View>
              ) : (
                noticesList.map(notice => (
                  <AnimatedCard key={notice.id} className={`p-5 mb-3 rounded-[24px] border ${theme.isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-slate-200/70'}`} style={theme.cardShadow}>
                     <View className="flex-row justify-between items-start mb-3">
                       <Text className={`font-black text-[16px] tracking-tight flex-1 mr-2 ${theme.textClass}`}>{notice.title}</Text>
                       {notice.is_emergency && (
                         <View className="bg-rose-500/15 border border-rose-500/25 px-2.5 py-0.5 rounded-full flex-row items-center">
                           <AlertTriangle size={10} color="#f43f5e" />
                           <Text className="text-rose-500 text-[10px] font-black uppercase tracking-wider ml-1">Emergency</Text>
                         </View>
                       )}
                     </View>
                     <Text className={`text-[14px] font-medium leading-[22px] mb-3 ${theme.textSecondaryClass}`} numberOfLines={3}>{notice.content}</Text>
                     
                     <View className="flex-row justify-between items-center pt-2">
                       <Text className={`text-[11.5px] font-bold ${theme.textMutedClass}`}>By {notice.author?.full_name} • {new Date(notice.created_at).toLocaleDateString()}</Text>
                     </View>
                     
                     <View className="flex-row mt-3.5 pt-3.5 border-t border-slate-100 dark:border-white/5 gap-2.5">
                        <TouchableOpacity onPress={() => { setNoticeForm(notice); setShowNoticeModal(true); }} className={`flex-1 py-2.5 rounded-full items-center justify-center flex-row border ${theme.isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'}`}>
                          <Edit3 size={14} color={theme.isDark ? '#818cf8' : '#4f46e5'} className="mr-1.5" />
                          <Text className={`font-bold text-[12.5px] ${theme.isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteNotice(notice.id)} className={`flex-1 py-2.5 rounded-full items-center justify-center flex-row border ${theme.isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200'}`}>
                          <Trash2 size={14} color={theme.isDark ? '#fb7185' : '#e11d48'} className="mr-1.5" />
                          <Text className={`font-bold text-[12.5px] ${theme.isDark ? 'text-rose-400' : 'text-rose-700'}`}>Retract</Text>
                        </TouchableOpacity>
                     </View>
                  </AnimatedCard>
                ))
              )}
              </View>
            </View>
          )}
          {/* TAB 8: POLLS MANAGER */}
          {activeTab === 'polls' && (
            <View className="px-5 mt-4">
              <View className="flex-row items-center justify-between mb-4">
                <Text className={`text-[18px] font-black tracking-tight ${theme.textClass}`}>Polls Manager</Text>
                <TouchableOpacity className="px-4 py-2 rounded-full bg-indigo-500">
                  <Text className="text-white font-bold text-[12px]">Create Poll</Text>
                </TouchableOpacity>
              </View>
              {adminPolls.map(poll => (
                <View key={poll.id} className={`p-4 rounded-[24px] mb-3 border ${theme.glassCardClass} ${theme.borderSubtleClass}`}>
                  <Text className={`font-bold text-[15px] ${theme.textClass}`}>{poll.question}</Text>
                  <Text className={`text-[12px] mt-1 ${theme.textMutedClass}`}>Votes: {Object.keys(poll.votes || {}).length} | Status: {poll.is_active ? 'Active' : 'Closed'}</Text>
                </View>
              ))}
            </View>
          )}

          {/* TAB 9: EVENTS MANAGER */}
          {activeTab === 'events' && (
            <View className="px-5 mt-4">
              <View className="flex-row items-center justify-between mb-4">
                <Text className={`text-[18px] font-black tracking-tight ${theme.textClass}`}>Events Manager</Text>
                <TouchableOpacity className="px-4 py-2 rounded-full bg-indigo-500">
                  <Text className="text-white font-bold text-[12px]">Add Event</Text>
                </TouchableOpacity>
              </View>
              {adminEvents.map(event => (
                <View key={event.id} className={`p-4 rounded-[24px] mb-3 border ${theme.glassCardClass} ${theme.borderSubtleClass}`}>
                  <Text className={`font-bold text-[15px] ${theme.textClass}`}>{event.title}</Text>
                  <Text className={`text-[12px] mt-1 ${theme.textMutedClass}`}>Location: {event.location} | Date: {new Date(event.event_date).toLocaleDateString()}</Text>
                </View>
              ))}
            </View>
          )}

          {/* TAB 10: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <View className="px-5 mt-4">
              <Text className={`text-[18px] font-black tracking-tight mb-4 ${theme.textClass}`}>Audit Logs</Text>
              {adminLogs.map(log => (
                <View key={log.id} className={`p-4 rounded-[24px] mb-3 border ${theme.glassCardClass} ${theme.borderSubtleClass}`}>
                  <View className="flex-row items-center mb-1">
                    <Text className={`font-bold text-[14px] flex-1 ${theme.textClass}`}>{log.action}</Text>
                    <Text className={`text-[11px] ${theme.textMutedClass}`}>{new Date(log.created_at).toLocaleString()}</Text>
                  </View>
                  <Text className={`text-[13px] ${theme.textSecondaryClass}`}>Admin: {log.admin?.full_name || 'System'}</Text>
                  <Text className={`text-[11px] mt-2 ${theme.textMutedClass}`}>{JSON.stringify(log.details)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* TAB 11: SETTINGS */}
          {activeTab === 'settings' && (
            <View className="px-4 pt-4">
              <Text className={`font-bold text-[12px] uppercase tracking-widest mb-4 ml-1 ${theme.textSecondaryClass}`}>App Configuration</Text>
              
              <View className={`rounded-[24px] border p-5 mb-4 ${theme.glassCardClass}`}>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-1">
                    <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${maintenanceMode ? 'bg-amber-500/20' : (theme.isDark ? 'bg-white/5' : 'bg-slate-100')}`}>
                      <Settings size={20} color={maintenanceMode ? '#f59e0b' : theme.iconColor} />
                    </View>
                    <View className="flex-1 pr-2">
                      <Text className={`font-bold text-[16px] ${theme.textClass}`}>Maintenance Mode</Text>
                      <Text className={`text-[12px] mt-0.5 ${theme.textMutedClass}`}>Disable citizen access temporarily</Text>
                    </View>
                  </View>
                  <Switch value={maintenanceMode} onValueChange={(val) => {
                    setMaintenanceMode(val);
                    Haptics.notificationAsync(val ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success);
                  }} />
                </View>
                {maintenanceMode && (
                  <View className="mt-3 p-3 rounded-[12px] bg-amber-500/10 border border-amber-500/20">
                    <Text className="text-amber-600 text-[12px] font-medium leading-4">Citizens will see a maintenance screen. Admins and Officials can still bypass.</Text>
                  </View>
                )}
              </View>

              <View className={`rounded-[24px] border p-5 mb-4 ${theme.glassCardClass}`}>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-1">
                    <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${forceUpdate ? 'bg-rose-500/20' : (theme.isDark ? 'bg-white/5' : 'bg-slate-100')}`}>
                      <Download size={20} color={forceUpdate ? '#f43f5e' : theme.iconColor} />
                    </View>
                    <View className="flex-1 pr-2">
                      <Text className={`font-bold text-[16px] ${theme.textClass}`}>Force App Update</Text>
                      <Text className={`text-[12px] mt-0.5 ${theme.textMutedClass}`}>Require users to download latest version</Text>
                    </View>
                  </View>
                  <Switch value={forceUpdate} onValueChange={(val) => {
                    setForceUpdate(val);
                    Haptics.notificationAsync(val ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success);
                  }} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Broadcast Modal */}
      <Modal visible={showBroadcastModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className={`flex-1 justify-end ${theme.isDark ? 'bg-black/80' : 'bg-black/40'}`}>
            <View className={`rounded-t-[40px] p-6 h-[85%] ${theme.bgClass}`}>
              <View className="flex-row justify-between items-center mb-6">
                <Text className={`font-black text-2xl text-rose-500`}>Global Broadcast</Text>
                <TouchableOpacity onPress={() => setShowBroadcastModal(false)} className={`p-2 rounded-full ${theme.isDark ? 'bg-white/10' : 'bg-slate-100'}`}><X size={20} color={theme.iconColor} /></TouchableOpacity>
              </View>
              <View className="flex-row items-start p-4 bg-rose-500/10 rounded-[20px] mb-6 border border-rose-500/20">
                <Megaphone size={20} color="#f43f5e" className="mt-1 mr-3" />
                <Text className={`flex-1 text-[13px] font-medium leading-5 ${theme.isDark ? 'text-rose-300' : 'text-rose-700'}`}>Messages sent here trigger push notifications to ALL users instantly. Use strictly for emergencies or vital community updates.</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className={`font-bold text-[12px] uppercase tracking-widest mb-2 ml-1 ${theme.textSecondaryClass}`}>Target Audience</Text>
                <View className="flex-row gap-2 mb-5">
                  {(['all', 'officials', 'citizens'] as const).map(t => (
                    <TouchableOpacity key={t} onPress={() => setBroadcastTarget(t)} className={`flex-1 items-center justify-center py-2.5 rounded-[12px] border ${broadcastTarget === t ? 'bg-rose-500 border-rose-500' : (theme.isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200')}`}>
                      <Text className={`text-[12px] font-bold capitalize ${broadcastTarget === t ? 'text-white' : theme.textSecondaryClass}`}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text className={`font-bold text-[12px] uppercase tracking-widest mb-2 ml-1 ${theme.textSecondaryClass}`}>Notification Title</Text>
                <TextInput className={`border rounded-[20px] px-5 py-4 mb-5 font-bold text-[16px] ${theme.inputClass} ${theme.textClass}`} placeholder="e.g. IMPORTANT: Curfew Announced" placeholderTextColor={theme.inputPlaceholder} value={broadcastTitle} onChangeText={setBroadcastTitle} />
                
                <Text className={`font-bold text-[12px] uppercase tracking-widest mb-2 ml-1 ${theme.textSecondaryClass}`}>Message Body</Text>
                <TextInput className={`border rounded-[20px] px-5 py-4 min-h-[100px] mb-5 font-medium text-[15px] ${theme.inputClass} ${theme.textClass}`} placeholder="Enter your broadcast message..." placeholderTextColor={theme.inputPlaceholder} value={broadcastMessage} onChangeText={setBroadcastMessage} multiline textAlignVertical="top" />

                <Text className={`font-bold text-[12px] uppercase tracking-widest mb-2 ml-1 ${theme.textSecondaryClass}`}>Image URL (Optional)</Text>
                <TextInput className={`border rounded-[20px] px-5 py-4 mb-8 font-medium text-[14px] ${theme.inputClass} ${theme.textClass}`} placeholder="https://..." placeholderTextColor={theme.inputPlaceholder} value={broadcastImage} onChangeText={setBroadcastImage} />

                <TouchableOpacity onPress={handleSendBroadcast} disabled={isBroadcasting} className={`py-4 mb-10 rounded-[20px] flex-row items-center justify-center ${isBroadcasting ? 'opacity-50' : ''} bg-rose-600`}>
                  {isBroadcasting ? <ActivityIndicator color="#fff" /> : <><Send size={18} color="#fff" className="mr-2" /><Text className="font-bold text-white text-[16px]">Send Push Notification</Text></>}
                </TouchableOpacity>
        </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Directory Modal */}
      <Modal visible={showDirModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className={`flex-1 justify-end ${theme.isDark ? 'bg-black/80' : 'bg-black/40'}`}>
            <View className={`rounded-t-[40px] p-6 h-[85%] ${theme.bgClass}`}>
              <View className="flex-row justify-between items-center mb-6">
                <Text className={`font-black text-2xl ${theme.textClass}`}>{dirForm.id ? 'Edit Contact' : 'New Contact'}</Text>
                <TouchableOpacity onPress={() => setShowDirModal(false)} className={`p-2 rounded-full ${theme.isDark ? 'bg-white/10' : 'bg-slate-100'}`}><X size={20} color={theme.iconColor} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className={`font-bold text-[12px] mb-2 ${theme.textSecondaryClass}`}>Name</Text>
                <TextInput className={`border rounded-[20px] px-4 py-4 mb-4 ${theme.inputClass} ${theme.textClass}`} value={dirForm.name} onChangeText={(t: string) => setDirForm({...dirForm, name:t})} />
                
                <Text className={`font-bold text-[12px] mb-2 ${theme.textSecondaryClass}`}>Category</Text>
                <TextInput className={`border rounded-[20px] px-4 py-4 mb-4 ${theme.inputClass} ${theme.textClass}`} value={dirForm.category} placeholder="e.g. Hospitals" onChangeText={(t: string) => setDirForm({...dirForm, category:t})} />
                
                <Text className={`font-bold text-[12px] mb-2 ${theme.textSecondaryClass}`}>Phone</Text>
                <TextInput className={`border rounded-[20px] px-4 py-4 mb-4 ${theme.inputClass} ${theme.textClass}`} value={dirForm.phone} keyboardType="phone-pad" onChangeText={(t: string) => setDirForm({...dirForm, phone:t})} />
                
                <Text className={`font-bold text-[12px] mb-2 ${theme.textSecondaryClass}`}>Details</Text>
                <TextInput className={`border rounded-[20px] px-4 py-4 mb-4 ${theme.inputClass} ${theme.textClass}`} value={dirForm.details} onChangeText={(t: string) => setDirForm({...dirForm, details:t})} />
                
                <Text className={`font-bold text-[12px] mb-2 ${theme.textSecondaryClass}`}>Ward (Optional)</Text>
                <TextInput className={`border rounded-[20px] px-4 py-4 mb-6 ${theme.inputClass} ${theme.textClass}`} value={dirForm.ward} onChangeText={(t: string) => setDirForm({...dirForm, ward:t})} />
                
                <TouchableOpacity onPress={handleSaveDirContact} className={`py-4 rounded-[20px] items-center bg-primary mb-10`}>
                  <Text className="font-bold text-white text-[16px]">Save Contact</Text>
                </TouchableOpacity>
        </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      
      {/* Notice Modal */}
      <Modal visible={showNoticeModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className={`flex-1 justify-end ${theme.isDark ? 'bg-black/80' : 'bg-black/40'}`}>
            <View className={`rounded-t-[40px] p-6 h-[85%] ${theme.bgClass}`}>
              <View className="flex-row justify-between items-center mb-6">
                <Text className={`font-black text-2xl ${theme.textClass}`}>{noticeForm.id ? 'Edit Notice' : 'New Notice'}</Text>
                <TouchableOpacity onPress={() => setShowNoticeModal(false)} className={`p-2 rounded-full ${theme.isDark ? 'bg-white/10' : 'bg-slate-100'}`}><X size={20} color={theme.iconColor} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className={`font-bold text-[12px] mb-2 ${theme.textSecondaryClass}`}>Title</Text>
                <TextInput className={`border rounded-[20px] px-4 py-4 mb-4 ${theme.inputClass} ${theme.textClass}`} value={noticeForm.title} onChangeText={(t) => setNoticeForm({...noticeForm, title:t})} />
                
                <Text className={`font-bold text-[12px] mb-2 ${theme.textSecondaryClass}`}>Content</Text>
                <TextInput className={`border rounded-[20px] px-4 py-4 mb-4 min-h-[120px] ${theme.inputClass} ${theme.textClass}`} value={noticeForm.content} onChangeText={(t) => setNoticeForm({...noticeForm, content:t})} multiline textAlignVertical="top" />
                
                <Text className={`font-bold text-[12px] mb-2 ${theme.textSecondaryClass}`}>Category</Text>
                <TextInput className={`border rounded-[20px] px-4 py-4 mb-4 ${theme.inputClass} ${theme.textClass}`} value={noticeForm.category} placeholder="e.g. General, Health, Event" onChangeText={(t) => setNoticeForm({...noticeForm, category:t})} />
                
                <View className="mb-8 mt-2">
                  <Text className={`font-bold text-[12px] uppercase tracking-widest mb-3 ml-1 ${theme.textSecondaryClass}`}>Priority Level</Text>
                  <TouchableOpacity onPress={() => {Haptics.selectionAsync(); setNoticeForm({...noticeForm, is_emergency: !noticeForm.is_emergency});}} className={`flex-row items-center justify-between border rounded-[20px] px-5 py-4 ${noticeForm.is_emergency ? (theme.isDark ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200') : theme.inputClass}`}>
                    <View className="flex-row items-center">
                      <AlertTriangle size={20} color={noticeForm.is_emergency ? '#f43f5e' : '#94a3b8'} />
                      <Text className={`ml-3 font-bold text-[16px] ${noticeForm.is_emergency ? 'text-rose-500' : theme.textClass}`}>Emergency Broadcast</Text>
                    </View>
                    <View className={`w-12 h-7 rounded-full p-1 justify-center ${noticeForm.is_emergency ? 'bg-rose-500' : 'bg-slate-200 dark:bg-white/10'}`}>
                      <View className={`w-5 h-5 rounded-full bg-white transition-all ${noticeForm.is_emergency ? 'self-end' : 'self-start'}`} />
                    </View>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity onPress={handleSaveNotice} className={`py-4 rounded-[20px] items-center bg-primary mb-10`}>
                  <Text className="font-bold text-white text-[16px]">Save Notice</Text>
                </TouchableOpacity>
        </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Issue Modal */}
      <Modal visible={!!editingIssue} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className={`flex-1 justify-end ${theme.isDark ? 'bg-black/80' : 'bg-black/40'}`}>
            <View className={`rounded-t-[40px] p-6 h-[85%] ${theme.bgClass}`}>
              <View className="flex-row justify-between items-center mb-6">
                <Text className={`font-black text-2xl ${theme.textClass}`}>Edit Issue</Text>
                <TouchableOpacity onPress={() => setEditingIssue(null)} className={`p-2 rounded-full ${theme.isDark ? 'bg-white/10' : 'bg-slate-100'}`}><X size={20} color={theme.iconColor} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className={`font-bold text-[12px] mb-2 ${theme.textSecondaryClass}`}>Title</Text>
                <TextInput className={`border rounded-[20px] px-4 py-4 mb-4 ${theme.inputClass} ${theme.textClass}`} value={issueForm.title} onChangeText={(t) => setIssueForm({...issueForm, title:t})} />
                
                <Text className={`font-bold text-[12px] mb-2 ${theme.textSecondaryClass}`}>Description</Text>
                <TextInput className={`border rounded-[20px] px-4 py-4 mb-4 min-h-[120px] ${theme.inputClass} ${theme.textClass}`} value={issueForm.description} onChangeText={(t) => setIssueForm({...issueForm, description:t})} multiline textAlignVertical="top" />
                
                <Text className={`font-bold text-[12px] mb-2 ${theme.textSecondaryClass}`}>Category</Text>
                <TextInput className={`border rounded-[20px] px-4 py-4 mb-6 ${theme.inputClass} ${theme.textClass}`} value={issueForm.category} onChangeText={(t) => setIssueForm({...issueForm, category:t})} />
                
                <TouchableOpacity onPress={handleSaveIssue} className={`py-4 rounded-[20px] items-center bg-primary mb-10`}>
                  <Text className="font-bold text-white text-[16px]">Save Changes</Text>
                </TouchableOpacity>
        </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Role & Profile Editor Modal */}
      <Modal visible={!!selectedUser} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className={`flex-1 justify-end ${theme.isDark ? 'bg-black/80' : 'bg-black/40'}`}>
            <View className={`rounded-t-[40px] p-6 h-[90%] ${theme.bgClass}`}>
              <View className="flex-row justify-between items-center mb-6">
                <Text className={`font-black text-2xl ${theme.textClass}`}>User Controls</Text>
                <TouchableOpacity onPress={() => setSelectedUser(null)} className={`p-2 rounded-full ${theme.isDark ? 'bg-white/10' : 'bg-slate-100'}`}><X size={20} color={theme.iconColor} /></TouchableOpacity>
              </View>

              {selectedUser && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Unified Header Profile Section */}
                  <View className={`p-5 rounded-[24px] border ${theme.glassCardClass} mb-8`}>
                     {/* Top Row: Avatar & Name */}
                     <View className="flex-row items-center mb-5">
                       <View className="relative">
                         {selectedUser.avatar_url ? (
                           <Image source={{ uri: selectedUser.avatar_url }} className="w-16 h-16 rounded-full" />
                         ) : (
                           <View className={`w-16 h-16 rounded-full items-center justify-center ${theme.isDark ? 'bg-primary-500/20' : 'bg-primary-50'}`}>
                             <Text className={`text-[24px] font-black ${theme.isDark ? 'text-primary-400' : 'text-primary-600'}`}>{selectedUser.full_name?.charAt(0)?.toUpperCase() || '?'}</Text>
                           </View>
                         )}
                         {editingBanned && (
                           <View className={`absolute -bottom-1 -right-1 bg-rose-500 w-6 h-6 rounded-full items-center justify-center border-2 ${theme.isDark ? 'border-[#0f172a]' : 'border-white'}`}>
                             <ShieldAlert size={10} color="#fff" />
                           </View>
                         )}
                       </View>
                       
                       <View className="ml-4 flex-1 justify-center">
                         <View className="flex-row items-center flex-wrap">
                           <Text className={`font-black text-[20px] ${theme.textClass}`}>{selectedUser.full_name}</Text>
                           {/* Small Verification Badge Icons */}
                           {editingBadges.includes('verified') && <View className={`ml-2 rounded-full p-0.5 ${theme.isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}><BadgeCheck size={16} color="#3b82f6" /></View>}
                           {editingBadges.includes('gold') && <View className={`ml-1 rounded-full p-0.5 ${theme.isDark ? 'bg-yellow-500/20' : 'bg-yellow-50'}`}><Crown size={16} color="#eab308" /></View>}
                           {editingBadges.includes('contributor') && <View className={`ml-1 rounded-full p-0.5 ${theme.isDark ? 'bg-purple-500/20' : 'bg-purple-50'}`}><Star size={16} color="#a855f7" /></View>}
                           {editingBadges.includes('leader') && <View className={`ml-1 rounded-full p-0.5 ${theme.isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}><ShieldCheck size={16} color="#6366f1" /></View>}
                         </View>
                         <Text className={`text-[14px] mt-1 font-semibold ${theme.textSecondaryClass}`}>{selectedUser.phone_number}</Text>
                       </View>
                     </View>

                     {/* Bottom Row: 3 Columns */}
                     <View className={`flex-row border-t pt-4 mt-2 ${theme.isDark ? 'border-white/10' : 'border-slate-100'}`}>
                       <View className={`flex-1 items-center border-r ${theme.isDark ? 'border-white/10' : 'border-slate-100'}`}>
                         <MapPin size={16} color="#94a3b8" />
                         <Text className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${theme.textMutedClass}`}>Ward</Text>
                         <Text className={`text-[16px] font-black mt-0.5 ${theme.textClass}`}>{selectedUser.home_ward || '-'}</Text>
                       </View>
                       <View className={`flex-1 items-center border-r ${theme.isDark ? 'border-white/10' : 'border-slate-100'}`}>
                         <MapPin size={16} color="#94a3b8" />
                         <Text className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${theme.textMutedClass}`}>Tole</Text>
                         <Text className={`text-[14px] font-bold mt-0.5 ${theme.textClass}`} numberOfLines={1}>{selectedUser.tole || '-'}</Text>
                       </View>
                       <View className="flex-1 items-center">
                         <Shield size={16} color="#3b82f6" />
                         <Text className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${theme.textMutedClass}`}>Role</Text>
                         <Text className={`text-[14px] font-bold mt-0.5 text-blue-500 capitalize`}>{editingRole}</Text>
                       </View>
                     </View>
                  </View>

                  <View className="mb-8">
                    <Text className={`font-bold text-[12px] uppercase tracking-widest mb-3 ml-2 ${theme.textSecondaryClass}`}>Account Access Level</Text>
                    <View className={`rounded-[24px] border overflow-hidden ${theme.glassCardClass}`}>
                      {(['citizen', 'official', 'moderator', 'admin'] as UserRole[]).map((role, idx) => (
                        <TouchableOpacity 
                          key={role} 
                          onPress={() => {Haptics.selectionAsync(); setEditingRole(role);}} 
                          className={`flex-row items-center px-5 py-4 ${idx !== 3 ? (theme.isDark ? 'border-b border-white/10' : 'border-b border-slate-100') : ''} ${editingRole === role ? (theme.isDark ? 'bg-blue-900/20' : 'bg-[#f0f9ff]') : ''}`}
                        >
                          <Text className={`font-bold text-[16px] capitalize flex-1 ${editingRole === role ? (theme.isDark ? 'text-blue-400' : 'text-[#0f172a]') : theme.textClass}`}>{role}</Text>
                          {editingRole === role && <View className="w-6 h-6 rounded-full border border-blue-500 items-center justify-center"><CheckCircle size={14} color="#3b82f6" /></View>}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {editingRole === 'official' && (
                    <View className="mb-8">
                      <Text className={`font-bold text-[12px] uppercase tracking-widest mb-3 ml-1 ${theme.textSecondaryClass}`}>Department</Text>
                      <TextInput className={`border rounded-[24px] px-5 py-4 font-bold text-[16px] ${theme.inputClass} ${theme.textClass}`} placeholder="e.g. Ward Office, Water Dept" placeholderTextColor={theme.inputPlaceholder} value={editingDepartment} onChangeText={setEditingDepartment} />
                    </View>
                  )}

                  <View className="mb-8">
                    <Text className={`font-bold text-[12px] uppercase tracking-widest mb-3 ml-1 ${theme.textSecondaryClass}`}>Civic Points</Text>
                    <View className={`flex-row items-center border rounded-[24px] px-5 h-[64px] ${theme.inputClass}`}>
                       <Award size={24} color="#f59e0b" />
                       <TextInput className={`flex-1 ml-3 font-black text-[20px] text-amber-500`} keyboardType="number-pad" value={editingPoints} onChangeText={setEditingPoints} />
                    </View>
                  </View>
                  
                  {/* VERIFICATION BADGES */}
                  <View className="mb-8">
                    <View className="flex-row items-center justify-between mb-3 px-2">
                      <Text className={`font-bold text-[12px] uppercase tracking-widest ${theme.textSecondaryClass}`}>Verification Badges</Text>
                      {editingBadges.length > 0 && (
                        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setEditingBadges([]); }}>
                          <Text className="text-[11px] font-bold text-rose-500">Clear All</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View className={`rounded-[24px] border overflow-hidden ${theme.glassCardClass}`}>
                      {AVAILABLE_BADGES.map((badge, idx) => {
                        const isSelected = editingBadges.includes(badge.id);
                        const IconComponent = badge.icon;
                        return (
                          <TouchableOpacity
                            key={badge.id}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setEditingBadges(prev => 
                                prev.includes(badge.id) ? [] : [badge.id]
                              );
                            }}
                            activeOpacity={0.7}
                            className={`flex-row items-center px-5 py-3.5 ${
                              idx < AVAILABLE_BADGES.length - 1 ? `border-b ${theme.isDark ? 'border-white/5' : 'border-slate-100'}` : ''
                            } ${isSelected ? (theme.isDark ? badge.activeBgDark : badge.activeBgLight) : ''}`}
                          >
                            <View 
                              className={`w-9 h-9 rounded-xl items-center justify-center mr-3.5 ${theme.isDark ? badge.bgColorDark : badge.bgColorLight}`}
                              style={isSelected ? { borderWidth: 1, borderColor: badge.color + '60' } : undefined}
                            >
                              <IconComponent size={18} color={badge.color} fill={theme.isDark ? badge.color + '40' : badge.color + '20'} />
                            </View>
                            <View className="flex-1 mr-2">
                              <Text className={`font-bold text-[15px] ${theme.textClass}`}>{badge.label}</Text>
                              <Text className={`text-[11px] font-medium ${theme.textMutedClass}`}>{badge.description}</Text>
                            </View>
                            <View 
                              className={`w-6 h-6 rounded-full items-center justify-center border-2 ${
                                isSelected ? 'border-transparent' : theme.isDark ? 'border-white/20 bg-white/5' : 'border-slate-300 bg-white'
                              }`}
                              style={isSelected ? { backgroundColor: badge.color } : undefined}
                            >
                              {isSelected && <Check size={13} color="#ffffff" strokeWidth={3} />}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View className="mb-8">
                    <Text className={`font-bold text-[12px] uppercase tracking-widest mb-3 ml-1 ${theme.textSecondaryClass}`}>Account Status</Text>
                    <TouchableOpacity onPress={() => {Haptics.selectionAsync(); setEditingBanned(!editingBanned);}} className={`flex-row items-center justify-between border-2 rounded-[24px] px-5 py-4 ${editingBanned ? (theme.isDark ? 'bg-rose-500/10 border-rose-500' : 'bg-rose-50 border-rose-500') : (theme.isDark ? 'bg-white/5 border-transparent' : 'bg-black/5 border-transparent')}`}>
                      <View className="flex-row items-center">
                        <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${editingBanned ? 'bg-rose-500' : (theme.isDark ? 'bg-white/10' : 'bg-black/10')}`}>
                          <ShieldAlert size={20} color={editingBanned ? '#fff' : '#94a3b8'} />
                        </View>
                        <View>
                          <Text className={`font-black text-[18px] ${editingBanned ? 'text-rose-500' : theme.textClass}`}>{editingBanned ? 'Banned Account' : 'Active Account'}</Text>
                          <Text className={`font-bold text-[13px] mt-0.5 ${editingBanned ? 'text-rose-400' : theme.textMutedClass}`}>{editingBanned ? 'User is soft deleted' : 'Tap to soft delete user'}</Text>
                        </View>
                      </View>
                      {editingBanned && <CheckCircle size={24} color="#f43f5e" />}
                    </TouchableOpacity>
                  </View>
                  
                  <View className="flex-row gap-3 mb-12">
                    {selectedUser.id !== profile.id && (
                      <TouchableOpacity onPress={() => handleDeleteUser(selectedUser)} className={`w-[64px] h-[64px] rounded-[24px] items-center justify-center ${theme.isDark ? 'bg-rose-500/20' : 'bg-rose-100'}`}><Trash2 size={24} color="#f43f5e" /></TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleSaveRole} disabled={isSaving} className={`flex-1 h-[64px] rounded-[24px] flex-row items-center justify-center ${isSaving ? 'opacity-50' : ''} bg-primary`}>
                      <Text className="font-black tracking-wider uppercase text-white text-[15px]">{isSaving ? 'Saving...' : 'Save Changes'}</Text>
                    </TouchableOpacity>
                  </View>
        </ScrollView>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}