// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import { useTheme } from '../hooks/use-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineIndicator() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isConnected === false) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 100
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true
      }).start();
    }
  }, [isConnected]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: insets.top,
        left: 0,
        right: 0,
        transform: [{ translateY }],
        zIndex: 999,
        paddingHorizontal: 16,
      }}
    >
      <View
        style={{
          backgroundColor: theme.dangerColor,
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
          elevation: 5
        }}
      >
        <WifiOff size={16} color="#ffffff" strokeWidth={2.5} />
        <Text style={{ color: '#ffffff', fontWeight: '800', marginLeft: 8, fontSize: 13, letterSpacing: 0.5 }}>
          No Internet Connection
        </Text>
      </View>
    </Animated.View>
  );
}
