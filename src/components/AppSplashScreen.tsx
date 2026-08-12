// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Modal, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Globe } from 'lucide-react-native';
import { useTheme } from '../hooks/use-theme';

const { width, height } = Dimensions.get('window');

// Floating particle component
function FloatingParticle({ delay, startX, size, duration }: { delay: number; startX: number; size: number; duration: number }) {
  const translateY = useRef(new Animated.Value(height * 0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(startX)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -50,
          duration,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: duration * 0.3,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: duration * 0.7,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]),
      ]).start();
    }, delay);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(0, 122, 255, 0.35)',
        opacity,
        transform: [{ translateY }, { translateX }],
      }}
    />
  );
}

export default function AppSplashScreen({ onFinish }: { onFinish: () => void }) {
  const theme = useTheme();

  // Animations
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(0.3)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(15)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const footerTranslateY = useRef(new Animated.Value(30)).current;
  const shimmerTranslate = useRef(new Animated.Value(-width)).current;

  // Pulsing glow animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Stage 1: Icon appears with spring bounce (0-400ms)
    Animated.parallel([
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // Stage 2: Glow ring emanates (200ms delay)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(glowScale, {
          toValue: 1,
          friction: 5,
          tension: 30,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      // Start pulsing
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      ).start();
    }, 200);

    // Stage 3: Title slides up (400ms delay)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }, 400);

    // Stage 4: Subtitle appears (600ms delay)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(subtitleTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }, 600);

    // Stage 5: Footer slides up (800ms delay)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(footerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(footerTranslateY, {
          toValue: 0,
          friction: 7,
          tension: 35,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }, 800);

    // Stage 6: Shimmer sweep across logo (500ms delay)
    setTimeout(() => {
      Animated.timing(shimmerTranslate, {
        toValue: width,
        duration: 800,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }, 500);

    // Stage 7: Exit animation (1800ms)
    const exitTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(iconScale, {
          toValue: 1.2,
          duration: 350,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        onFinish();
      });
    }, 1600);

    return () => clearTimeout(exitTimer);
  }, []);

  // Generate particles with theme-aware settings
  const [particles] = useState(() => Array.from({ length: 10 }, (_, i) => ({
    delay: i * 100,
    startX: Math.random() * width * 0.8 - width * 0.1,
    size: 3 + Math.random() * 5,
    duration: 2500 + Math.random() * 1500,
  })));

  return (
    <Modal visible={true} transparent={false} animationType="none" statusBarHidden={false}>
      <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
        <LinearGradient
          colors={theme.isDark
            ? ['#030712', '#0c1629', '#111d3a', '#0c1629', '#030712']
            : ['#eef2ff', '#e0e7ff', '#c7d2fe', '#e0e7ff', '#f8fafc']
          }
          locations={[0, 0.25, 0.5, 0.75, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Floating particles */}
        {particles.map((p, i) => (
          <FloatingParticle key={i} {...p} />
        ))}

        {/* Decorative background circles */}
        <View style={[styles.bgCircle, styles.bgCircle1, {
          backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.06)' : 'rgba(99, 102, 241, 0.06)',
        }]} />
        <View style={[styles.bgCircle, styles.bgCircle2, {
          backgroundColor: theme.isDark ? 'rgba(139, 92, 246, 0.04)' : 'rgba(59, 130, 246, 0.05)',
        }]} />

        <SafeAreaView style={styles.safeArea}>
          {/* Centered Brand */}
          <View style={styles.centerContainer}>
            {/* Pulsing Glow Ring */}
            <Animated.View style={[styles.glowRing, {
              opacity: glowOpacity,
              transform: [{ scale: Animated.multiply(glowScale, pulseAnim) }],
              borderColor: theme.isDark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(37, 99, 235, 0.15)',
              backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(37, 99, 235, 0.04)',
            }]} />

            {/* Outer glow */}
            <Animated.View style={[styles.outerGlow, {
              opacity: Animated.multiply(glowOpacity, 0.5),
              transform: [{ scale: Animated.multiply(glowScale, pulseAnim) }],
              backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.03)' : 'rgba(37, 99, 235, 0.03)',
            }]} />

            {/* Brand Icon */}
            <Animated.View style={[styles.iconContainer, {
              opacity: iconOpacity,
              transform: [{ scale: iconScale }],
            }]}>
              <LinearGradient
                colors={['#3b82f6', '#4f46e5', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.brandIconBox}
              >
                <Globe size={48} color="#ffffff" strokeWidth={2.2} />
              </LinearGradient>

              {/* Shimmer sweep */}
              <Animated.View
                style={[styles.shimmer, {
                  transform: [{ translateX: shimmerTranslate }],
                }]}
              />
            </Animated.View>

            {/* Title */}
            <Animated.View style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            }}>
              <Text style={[styles.title, {
                color: theme.isDark ? '#f8fafc' : '#0f172a',
              }]}>
                Simraungadh
              </Text>
            </Animated.View>

            {/* Subtitle */}
            <Animated.View style={{
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            }}>
              <Text style={[styles.subtitle, {
                color: theme.isDark ? '#64748b' : '#94a3b8',
              }]}>
                Your Digital Municipality
              </Text>
            </Animated.View>
          </View>

          {/* Footer */}
          <Animated.View style={[styles.footer, {
            opacity: footerOpacity,
            transform: [{ translateY: footerTranslateY }],
          }]}>
            <View style={styles.footerDivider}>
              <View style={[styles.dividerLine, {
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }]} />
              <View style={[styles.dividerDot, {
                backgroundColor: theme.isDark ? '#3b82f6' : '#4f46e5',
              }]} />
              <View style={[styles.dividerLine, {
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }]} />
            </View>
            <Text style={[styles.footerLabel, {
              color: theme.isDark ? '#475569' : '#94a3b8',
            }]}>
              from
            </Text>
            <Text style={[styles.footerBrand, {
              color: theme.isDark ? '#818cf8' : '#4f46e5',
            }]}>
              SIMRAUNGADH MUNICIPALITY
            </Text>
            <Text style={[styles.footerVersion, {
              color: theme.isDark ? '#334155' : '#cbd5e1',
            }]}>
              v1.0.0
            </Text>
          </Animated.View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  bgCircle1: {
    width: 350,
    height: 350,
    top: -80,
    right: -100,
  },
  bgCircle2: {
    width: 280,
    height: 280,
    bottom: -60,
    left: -80,
  },
  glowRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
  },
  outerGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  iconContainer: {
    overflow: 'hidden',
    borderRadius: 28,
    marginBottom: 20,
  },
  brandIconBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(37, 99, 235, 0.35)',
      },
      default: {
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 32,
        elevation: 16,
      },
    }),
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    transform: [{ skewX: '-20deg' }],
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 6,
    textAlign: 'center',
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dividerLine: {
    width: 24,
    height: 1,
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 8,
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  footerBrand: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  footerVersion: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 6,
    letterSpacing: 1,
  },
});
