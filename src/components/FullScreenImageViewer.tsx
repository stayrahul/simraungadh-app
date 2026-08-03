// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface FullScreenImageViewerProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function FullScreenImageViewer({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: FullScreenImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, visible]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const viewWidth = event.nativeEvent.layoutMeasurement.width || screenDimensions.width;
    const index = Math.round(contentOffset / viewWidth);
    if (index >= 0 && index < images.length && index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({ x: nextIndex * screenDimensions.width, animated: true });
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollViewRef.current?.scrollTo({ x: prevIndex * screenDimensions.width, animated: true });
    }
  };

  if (!visible || !images || images.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Top Bar with Counter and Close Button */}
        <View style={styles.topBar}>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Slidable Horizontal ScrollView */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          contentOffset={{ x: initialIndex * screenDimensions.width, y: 0 }}
          style={{ width: screenDimensions.width, height: screenDimensions.height }}
        >
          {images.map((url, index) => (
            <View
              key={`${url}-${index}`}
              style={{
                width: screenDimensions.width,
                height: screenDimensions.height,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Image
                source={{ uri: url }}
                style={{
                  width: screenDimensions.width,
                  height: screenDimensions.height * 0.82,
                }}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={200}
              />
            </View>
          ))}
        </ScrollView>

        {/* Left Arrow Button */}
        {images.length > 1 && currentIndex > 0 && (
          <TouchableOpacity
            onPress={goToPrev}
            activeOpacity={0.8}
            style={[styles.arrowButton, styles.leftArrow]}
          >
            <ChevronLeft size={26} color="#ffffff" />
          </TouchableOpacity>
        )}

        {/* Right Arrow Button */}
        {images.length > 1 && currentIndex < images.length - 1 && (
          <TouchableOpacity
            onPress={goToNext}
            activeOpacity={0.8}
            style={[styles.arrowButton, styles.rightArrow]}
          >
            <ChevronRight size={26} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  counterText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    zIndex: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftArrow: {
    left: 16,
  },
  rightArrow: {
    right: 16,
  },
});
