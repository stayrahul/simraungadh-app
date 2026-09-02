// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, Platform, Text, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Bell, Plus, LayoutGrid, BookOpen, User, Search } from 'lucide-react-native';
import { useTheme } from '../../hooks/use-theme';
import { useLangStore } from '../../store/langStore';
import { translations } from '../../lib/translations';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

// Animated Tab Icon with label
function TabIcon({ icon: Icon, label, focused, color, theme, hasBadge }: any) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0.92)).current;
  const labelOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const dotScale = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1 : 0.92,
        tension: 300,
        friction: 15,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(labelOpacity, {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(dotScale, {
        toValue: focused ? 1 : 0,
        tension: 400,
        friction: 12,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [focused]);

  const activeColor = theme.isDark ? '#818cf8' : '#4f46e5';

  return (
    <Animated.View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 22,
        backgroundColor: focused
          ? (theme.isDark ? 'rgba(99, 102, 241, 0.16)' : 'rgba(79, 70, 229, 0.10)')
          : 'transparent',
        borderWidth: focused ? 1 : 0,
        borderColor: focused
          ? (theme.isDark ? 'rgba(129, 140, 248, 0.25)' : 'rgba(79, 70, 229, 0.18)')
          : 'transparent',
        transform: [{ scale: scaleAnim }],
      }}
    >
      <Icon
        size={21}
        color={focused ? activeColor : (theme.isDark ? '#94a3b8' : '#64748b')}
        fill={focused ? (theme.isDark ? 'rgba(129, 140, 248, 0.2)' : 'rgba(79, 70, 229, 0.15)') : 'none'}
        strokeWidth={focused ? 2.3 : 1.7}
      />
      {hasBadge && (
        <View style={{ position: 'absolute', top: 4, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#f43f5e', borderWidth: 1.5, borderColor: theme.isDark ? '#000' : '#fff' }} />
      )}
      <Animated.Text
        style={{
          fontSize: 10.5,
          fontWeight: '700',
          color: focused ? activeColor : (theme.isDark ? '#94a3b8' : '#64748b'),
          marginTop: 2,
          opacity: labelOpacity,
          letterSpacing: 0.2,
        }}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>
      {focused && (
        <Animated.View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: activeColor,
            marginTop: 2,
            transform: [{ scale: dotScale }],
          }}
        />
      )}
    </Animated.View>
  );
}

// Animated FAB with pulse ring
function FABIcon({ theme }: any) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 1200,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.4,
            duration: 0,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View
      style={{
        top: Platform.OS === 'ios' ? -14 : -12,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Pulse ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: '#4f46e5',
          opacity: pulseOpacity,
          transform: [{ scale: pulseAnim }],
        }}
      />
      <LinearGradient
        colors={['#4f46e5', '#6366f1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 54,
          height: 54,
          borderRadius: 27,
          justifyContent: 'center',
          alignItems: 'center',
          ...Platform.select({
            web: { boxShadow: '0px 10px 24px rgba(79, 70, 229, 0.45)' },
            default: {
              shadowColor: '#4f46e5',
              shadowOpacity: 0.45,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
            },
          }),
          elevation: 10,
          borderWidth: 2.5,
          borderColor: theme.isDark ? '#1e1b4b' : '#ffffff',
        }}
      >
        <Plus size={26} color="#ffffff" strokeWidth={2.8} />
      </LinearGradient>
    </View>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const theme = useTheme();
  const { language } = useLangStore();
  const t = translations[language] || translations.en;
  
  const [hasNewNotices, setHasNewNotices] = React.useState(false);

  React.useEffect(() => {
    const checkNewNotices = async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const { data } = await supabase.from('notices').select('created_at').order('created_at', { ascending: false }).limit(1).single();
        if (data) {
          const lastRead = await AsyncStorage.getItem('@last_read_notice');
          if (!lastRead || new Date(data.created_at) > new Date(lastRead)) {
            setHasNewNotices(true);
          }
        }
      } catch (e) {}
    };
    checkNewNotices();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          height: Platform.OS === 'ios' ? 80 : 72,
          paddingBottom: Platform.OS === 'ios' ? 16 : 8,
          paddingTop: Platform.OS === 'ios' ? 8 : 6,
          elevation: 0,
          ...Platform.select({
            web: { boxShadow: `0px -1px 40px ${theme.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.08)'}` },
            default: {
              shadowColor: theme.isDark ? '#000000' : '#1c1c1e',
              shadowOpacity: theme.isDark ? 0.5 : 0.08,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: -4 },
            },
          }) as any,
          borderTopWidth: 0,
          bottom: Platform.OS === 'ios' ? 20 : 12,
          left: 12,
          right: 12,
        },
        tabBarBackground: () => (
          <View
            style={{
              flex: 1,
              borderRadius: 32,
              overflow: 'hidden',
              backgroundColor: theme.tabBarBg,
              borderWidth: 1,
              borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(226, 232, 240, 0.85)',
            }}
          >
            <BlurView
              intensity={100}
              tint={theme.blurTint}
              style={{ flex: 1 }}
            />
          </View>
        ),
        tabBarActiveTintColor: theme.accentColor,
        tabBarInactiveTintColor: theme.isDark ? '#48484a' : '#aeaeb2',
        tabBarShowLabel: false,
      }}
    >
      {/* 1. Feed Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Home} label="Feed" focused={focused} color={color} theme={theme} />
          ),
        }}
      />

      {/* 2. Notices Tab */}
      <Tabs.Screen
        name="notices"
        options={{
          title: 'Notices',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Bell} label="Notices" focused={focused} color={color} theme={theme} hasBadge={hasNewNotices && !focused} />
          ),
        }}
        listeners={() => ({
          tabPress: async () => {
            setHasNewNotices(false);
            try {
              const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
              await AsyncStorage.setItem('@last_read_notice', new Date().toISOString());
            } catch(e) {}
          }
        })}
      />

      {/* 3. Center FAB (+) Report Button */}
      <Tabs.Screen
        name="report-action"
        options={{
          title: '',
          tabBarIcon: () => <FABIcon theme={theme} />,
        }}
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/report');
          },
        })}
      />

      {/* 4. Services Tab */}
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={LayoutGrid} label="Services" focused={focused} color={color} theme={theme} />
          ),
        }}
      />

      {/* 5. Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={User} label="Profile" focused={focused} color={color} theme={theme} />
          ),
        }}
      />
    </Tabs>
  );
}
