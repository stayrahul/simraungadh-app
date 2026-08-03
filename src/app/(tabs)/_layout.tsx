// @ts-nocheck
import { Tabs, useRouter } from 'expo-router';
import { View, Platform, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Bell, Plus, LayoutGrid, BookOpen, User } from 'lucide-react-native';
import { useTheme } from '../../hooks/use-theme';
import { useLangStore } from '../../store/langStore';
import { translations } from '../../lib/translations';

import { BlurView } from 'expo-blur';

export default function TabLayout() {
  const router = useRouter();
  const theme = useTheme();
  const { language } = useLangStore();
  const t = translations[language] || translations.en;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          height: Platform.OS === 'ios' ? 76 : 68,
          paddingBottom: Platform.OS === 'ios' ? 18 : 8,
          paddingTop: Platform.OS === 'ios' ? 10 : 8,
          elevation: 12,
          ...Platform.select({
            web: { boxShadow: `0px 8px 20px ${theme.isDark ? 'rgba(0,0,0,0.4)' : 'rgba(79,70,229,0.12)'}` },
            default: {
              shadowColor: theme.isDark ? '#000000' : '#4f46e5',
              shadowOpacity: theme.isDark ? 0.4 : 0.12,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 8 },
            }
          }) as any,
          borderTopWidth: 0,
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 16,
          right: 16,
        },
        tabBarBackground: () => (
          <View 
            style={{ 
              flex: 1, 
              borderRadius: 30, 
              overflow: 'hidden', 
              backgroundColor: theme.isDark ? 'rgba(8, 14, 26, 0.85)' : 'rgba(255, 255, 255, 0.9)',
              borderWidth: 1,
              borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
            }}
          >
            <BlurView 
              intensity={95} 
              tint={theme.blurTint} 
              style={{ flex: 1 }} 
            />
          </View>
        ),
        tabBarActiveTintColor: theme.isDark ? '#60a5fa' : '#2563eb',
        tabBarInactiveTintColor: theme.isDark ? '#64748b' : '#94a3b8',
        tabBarShowLabel: false,
      }}
    >
      {/* 1. Feed Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, focused }) => {
            const activeColor = theme.isDark ? '#60a5fa' : '#2563eb';
            return (
              <View className={`items-center justify-center py-1.5 px-3.5 rounded-2xl ${focused ? (theme.isDark ? 'bg-blue-500/20' : 'bg-blue-50') : ''}`}>
                <Home 
                  size={21} 
                  color={focused ? activeColor : color} 
                  fill={focused ? activeColor : 'none'} 
                  strokeWidth={focused ? 2 : 1.8} 
                />
                {focused && <View className={`w-1.5 h-1.5 rounded-full mt-1 ${theme.isDark ? 'bg-blue-400' : 'bg-blue-600'}`} />}
              </View>
            );
          },
        }}
      />

      {/* 2. Notices Tab */}
      <Tabs.Screen
        name="notices"
        options={{
          title: 'Notices',
          tabBarIcon: ({ color, focused }) => {
            const activeColor = theme.isDark ? '#60a5fa' : '#2563eb';
            return (
              <View className={`items-center justify-center py-1.5 px-3.5 rounded-2xl ${focused ? (theme.isDark ? 'bg-blue-500/20' : 'bg-blue-50') : ''}`}>
                <Bell 
                  size={21} 
                  color={focused ? activeColor : color} 
                  fill={focused ? activeColor : 'none'} 
                  strokeWidth={focused ? 2 : 1.8} 
                />
                {focused && <View className={`w-1.5 h-1.5 rounded-full mt-1 ${theme.isDark ? 'bg-blue-400' : 'bg-blue-600'}`} />}
              </View>
            );
          },
        }}
      />
      
      {/* 3. Center FAB (+) Report Button */}
      <Tabs.Screen
        name="report-action"
        options={{
          title: '',
          tabBarIcon: () => (
            <View 
              style={{
                top: Platform.OS === 'ios' ? -12 : -10,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LinearGradient
                colors={['#3b82f6', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  justifyContent: 'center',
                  alignItems: 'center',
                  ...Platform.select({
                    web: { boxShadow: '0px 6px 14px rgba(37,99,235,0.45)' },
                    default: {
                      shadowColor: '#2563eb',
                      shadowOpacity: 0.45,
                      shadowRadius: 14,
                      shadowOffset: { width: 0, height: 6 },
                    }
                  }) as any,
                  elevation: 8,
                  borderWidth: 3,
                  borderColor: theme.isDark ? '#080e1a' : '#ffffff',
                }}
              >
                <Plus size={26} color="#ffffff" strokeWidth={2.6} />
              </LinearGradient>
            </View>
          ),
        }}
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault();
            router.push('/report');
          },
        })}
      />

      {/* 4. Services Tab */}
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ color, focused }) => {
            const activeColor = theme.isDark ? '#60a5fa' : '#2563eb';
            return (
              <View className={`items-center justify-center py-1.5 px-3.5 rounded-2xl ${focused ? (theme.isDark ? 'bg-blue-500/20' : 'bg-blue-50') : ''}`}>
                <LayoutGrid 
                  size={21} 
                  color={focused ? activeColor : color} 
                  fill={focused ? activeColor : 'none'} 
                  strokeWidth={focused ? 2 : 1.8} 
                />
                {focused && <View className={`w-1.5 h-1.5 rounded-full mt-1 ${theme.isDark ? 'bg-blue-400' : 'bg-blue-600'}`} />}
              </View>
            );
          },
        }}
      />

      {/* 5. Directory Tab */}
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Directory',
          tabBarIcon: ({ color, focused }) => {
            const activeColor = theme.isDark ? '#60a5fa' : '#2563eb';
            return (
              <View className={`items-center justify-center py-1.5 px-3.5 rounded-2xl ${focused ? (theme.isDark ? 'bg-blue-500/20' : 'bg-blue-50') : ''}`}>
                <BookOpen 
                  size={21} 
                  color={focused ? activeColor : color} 
                  fill={focused ? activeColor : 'none'} 
                  strokeWidth={focused ? 2 : 1.8} 
                />
                {focused && <View className={`w-1.5 h-1.5 rounded-full mt-1 ${theme.isDark ? 'bg-blue-400' : 'bg-blue-600'}`} />}
              </View>
            );
          },
        }}
      />

      {/* 6. Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          href: null,
          tabBarItemStyle: { display: 'none' },
          tabBarIcon: ({ color, focused }) => {
            const activeColor = theme.isDark ? '#60a5fa' : '#2563eb';
            return (
              <View className={`items-center justify-center py-1.5 px-3.5 rounded-2xl ${focused ? (theme.isDark ? 'bg-blue-500/20' : 'bg-blue-50') : ''}`}>
                <User 
                  size={21} 
                  color={focused ? activeColor : color} 
                  fill={focused ? activeColor : 'none'} 
                  strokeWidth={focused ? 2 : 1.8} 
                />
                {focused && <View className={`w-1.5 h-1.5 rounded-full mt-1 ${theme.isDark ? 'bg-blue-400' : 'bg-blue-600'}`} />}
              </View>
            );
          },
        }}
      />
    </Tabs>
  );
}
