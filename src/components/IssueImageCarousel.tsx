// @ts-nocheck
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';

import { useTheme } from '../hooks/use-theme';

interface IssueImageCarouselProps {
  imageUrls?: string[] | null;
  fallbackUrl?: string | null;
  onImagePress?: (url: string, index: number) => void;
  height?: number;
}

export default function IssueImageCarousel({ imageUrls, fallbackUrl, onImagePress, height = 260 }: IssueImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const theme = useTheme();

  const images = imageUrls && imageUrls.length > 0 ? imageUrls : fallbackUrl ? [fallbackUrl] : [];

  if (images.length === 0) return null;

  const handleScroll = (event: any) => {
    if (containerWidth === 0) return;
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / containerWidth);
    setActiveIndex(index);
  };

  const bgStyle = theme.isDark ? '#0f1728' : '#f3f5f8';

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

    if (onImagePress) {
      return (
        <TouchableOpacity key={index} activeOpacity={0.9} onPress={() => onImagePress(url, index)} style={{ width, height }}>
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
                  backgroundColor: activeIndex === index ? (theme.isDark ? '#60a5fa' : '#2563eb') : (theme.isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)'),
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
