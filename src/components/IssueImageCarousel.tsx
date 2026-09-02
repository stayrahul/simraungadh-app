// @ts-nocheck
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';

import { useTheme } from '../hooks/use-theme';

interface IssueImageCarouselProps {
  imageUrls?: string[] | null;
  fallbackUrl?: string | null;
  onImagePress?: (url: string, index: number) => void;
  onDoubleTap?: () => void;
  height?: number;
}

export default function IssueImageCarousel({ imageUrls, fallbackUrl, onImagePress, onDoubleTap, height = 260 }: IssueImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const theme = useTheme();
  let lastTap = 0;
  let tapTimer: NodeJS.Timeout;

  const images = imageUrls && imageUrls.length > 0 ? imageUrls : fallbackUrl ? [fallbackUrl] : [];

  if (images.length === 0) return null;

  const handleScroll = (event: any) => {
    if (containerWidth === 0) return;
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / containerWidth);
    setActiveIndex(index);
  };

  const bgStyle = theme.isDark ? '#121212' : '#f3f5f8';

  const renderImage = (url: string, index: number, width: number | `${number}%`) => {
    const imageElement = (
      <Image
        source={{ uri: url }}
        cachePolicy="memory-disk"
        style={{ width, height, backgroundColor: bgStyle }}
        contentFit="cover"
        transition={200}
      />
    );

    const handleTap = () => {
      if (!onDoubleTap) {
        if (onImagePress) onImagePress(url, index);
        return;
      }
      
      const time = new Date().getTime();
      const delta = time - lastTap;
      
      if (delta < 300) {
        clearTimeout(tapTimer);
        if (onDoubleTap) onDoubleTap();
      } else {
        tapTimer = setTimeout(() => {
          if (onImagePress) onImagePress(url, index);
        }, 300);
      }
      lastTap = time;
    };

    if (onImagePress || onDoubleTap) {
      return (
        <TouchableOpacity key={index} activeOpacity={0.9} onPress={handleTap} style={{ width, height }}>
          {imageElement}
        </TouchableOpacity>
      );
    }
    return (
      <View key={index} style={{ width, height }}>
        {imageElement}
      </View>
    );
  };

  if (images.length === 1) {
    return renderImage(images[0], 0, '100%');
  }

  return (
    <View 
      style={{ width: '100%', height }} 
      onLayout={(e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {containerWidth > 0 ? (
        <>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            style={{ width: containerWidth, height, backgroundColor: bgStyle }}
          >
            {images.map((url, index) => renderImage(url, index, containerWidth))}
          </ScrollView>

          {/* Pagination Dots Overlay */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'center', 
            alignItems: 'center', 
            position: 'absolute', 
            bottom: 10, 
            left: 0, 
            right: 0 
          }}>
            {images.map((_, index) => (
              <View
                key={index}
                style={{
                  width: activeIndex === index ? 14 : 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: activeIndex === index ? (theme.isDark ? '#818cf8' : '#4f46e5') : (theme.isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)'),
                  marginHorizontal: 2.5,
                }}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}
