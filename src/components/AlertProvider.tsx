// @ts-nocheck
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, Animated, Platform } from 'react-native';
import { useTheme } from '../hooks/use-theme';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

interface AlertContextType {
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert must be used within an AlertProvider');
  return context;
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<AlertOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const theme = useTheme();

  const nativeDriver = Platform.OS !== 'web';

  const showAlert = (title: string, message?: string, buttons?: AlertButton[]) => {
    setOptions({ title, message, buttons });
    setVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: nativeDriver }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: nativeDriver })
    ]).start();
  };

  const closeAlert = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: nativeDriver }),
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 200, useNativeDriver: nativeDriver })
    ]).start(() => {
      setVisible(false);
      setOptions(null);
    });
  };

  const handleButtonPress = (btn: AlertButton) => {
    closeAlert();
    if (btn.onPress) {
      setTimeout(() => btn.onPress!(), 250);
    }
  };

  const defaultButtons: AlertButton[] = [{ text: 'OK', style: 'default' }];
  const buttonsToRender = options?.buttons && options.buttons.length > 0 ? options.buttons : defaultButtons;

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal visible={visible} transparent animationType="none" onRequestClose={closeAlert}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <TouchableWithoutFeedback onPress={closeAlert}>
            <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: fadeAnim, backgroundColor: theme.isDark ? 'rgba(5, 8, 18, 0.75)' : 'rgba(15, 23, 42, 0.4)' }} />
          </TouchableWithoutFeedback>
          <Animated.View 
            style={{ 
              width: '80%', 
              maxWidth: 340,
              opacity: fadeAnim, 
              transform: [{ scale: scaleAnim }],
              elevation: 10,
              borderRadius: 28,
              overflow: 'hidden',
              backgroundColor: theme.isDark ? '#111a2e' : '#ffffff',
              borderWidth: theme.isDark ? 1 : 0,
              borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'transparent',
              ...Platform.select({
                web: { boxShadow: '0px 10px 20px rgba(0,0,0,0.25)' },
                default: {
                  shadowColor: '#000',
                  shadowOpacity: 0.25,
                  shadowRadius: 20,
                  shadowOffset: { width: 0, height: 10 },
                }
              }) as any,
            }}
          >
            <View className="p-6 pb-7 items-center">
              <Text className={`font-black text-xl mb-2.5 text-center tracking-tight ${theme.textClass}`}>{options?.title}</Text>
              {options?.message && (
                <Text className={`text-[15px] text-center leading-relaxed ${theme.textSecondaryClass}`}>{options.message}</Text>
              )}
            </View>
            <View style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(241,245,249,0.5)', flexDirection: buttonsToRender.length > 2 ? 'column' : 'row' }}>
              {buttonsToRender.map((btn, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={() => handleButtonPress(btn)}
                  style={{
                    paddingVertical: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.isDark ? '#111a2e' : '#ffffff',
                    borderTopWidth: 1,
                    borderTopColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                    ...(buttonsToRender.length <= 2 ? { flex: 1 } : {}),
                    ...(idx > 0 && buttonsToRender.length <= 2 ? { borderLeftWidth: 1, borderLeftColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' } : {}),
                  }}
                >
                  <Text className={`text-[16px] font-bold ${
                    btn.style === 'destructive' 
                      ? (theme.isDark ? 'text-rose-400' : 'text-red-500') 
                      : btn.style === 'cancel' 
                        ? (theme.isDark ? 'text-slate-500' : 'text-slate-400') 
                        : (theme.isDark ? 'text-primary-400' : 'text-primary')
                  }`}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}
