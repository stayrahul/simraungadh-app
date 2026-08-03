// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, Animated, Dimensions, Platform } from 'react-native';
import { Share2, Flag, MoreHorizontal, Copy, User, Trash2, Link2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/use-theme';

export interface ActionOption {
  label: string;
  icon?: string;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: ActionOption[];
}

const { height } = Dimensions.get('window');

export default function ActionSheet({ visible, onClose, title, options }: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isModalVisible, setModalVisible] = useState(visible);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 12,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  if (!isModalVisible) return null;

  const renderIcon = (iconName?: string, destructive?: boolean) => {
    const color = destructive ? (theme.isDark ? '#fb7185' : '#e11d48') : theme.iconColor;
    switch (iconName) {
      case 'share':
      case 'share-2':
        return <Share2 size={18} color={color} style={{ marginRight: 12 }} />;
      case 'copy':
        return <Copy size={18} color={color} style={{ marginRight: 12 }} />;
      case 'user':
        return <User size={18} color={color} style={{ marginRight: 12 }} />;
      case 'trash':
        return <Trash2 size={18} color={color} style={{ marginRight: 12 }} />;
      case 'link':
        return <Link2 size={18} color={color} style={{ marginRight: 12 }} />;
      case 'flag':
        return <Flag size={18} color={color} style={{ marginRight: 12 }} />;
      default:
        return <MoreHorizontal size={18} color={color} style={{ marginRight: 12 }} />;
    }
  };

  return (
    <Modal visible={isModalVisible} transparent={true} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={{ flex: 1, backgroundColor: theme.isDark ? 'rgba(5, 8, 18, 0.75)' : 'rgba(15, 23, 42, 0.35)', opacity: fadeAnim }}>
          <View style={{ flex: 1 }} />
        </Animated.View>
      </TouchableWithoutFeedback>

      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          transform: [{ translateY: slideAnim }]
        }}
      >
        <View className={`rounded-t-2xl pt-4 px-4 border-t ${theme.cardClass}`} style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
          <View className={`w-10 h-1.5 rounded-full self-center mb-4 ${theme.isDark ? 'bg-white/[0.12]' : 'bg-slate-300'}`} />

          {title && (
            <Text className={`${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'} font-semibold text-[11px] tracking-wider uppercase mb-2 px-1`}>{title}</Text>
          )}

          <View className={`rounded-xl overflow-hidden mb-3 border ${theme.borderSubtleClass}`}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={option.label}
                onPress={() => {
                  onClose();
                  setTimeout(() => option.onPress(), 200);
                }}
                className={`flex-row items-center px-4 py-3.5 ${index !== options.length - 1 ? `border-b ${theme.borderSubtleClass}` : ''} ${theme.isDark ? 'bg-white/[0.02]' : 'bg-white'}`}
                activeOpacity={0.7}
              >
                {renderIcon(option.icon, option.destructive)}
                <Text className={`text-[14.5px] font-medium ${option.destructive ? (theme.isDark ? 'text-rose-400' : 'text-rose-600') : theme.textClass}`}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={onClose}
            className={`rounded-xl py-3.5 items-center border ${theme.cardSubtleClass}`}
            activeOpacity={0.7}
          >
            <Text className={`font-semibold text-[14.5px] ${theme.textClass}`}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}
