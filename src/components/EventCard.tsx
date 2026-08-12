// @ts-nocheck
import React from 'react';
import { View, Text, TouchableOpacity, Share } from 'react-native';
import { Image } from 'expo-image';
import { Calendar, MapPin, Users, Share2 } from 'lucide-react-native';
import { useTheme } from '../hooks/use-theme';
import { CivicEvent } from '../lib/types';
import { getNepaliDate } from '../lib/nepaliDate';
import AnimatedCard from './AnimatedCard';
import * as Haptics from 'expo-haptics';

export default function EventCard({ event }: { event: CivicEvent }) {
  const theme = useTheme();

  const handleShare = async () => {
    Haptics.selectionAsync();
    try {
      await Share.share({
        message: `Check out this upcoming event: ${event.title} happening on ${getNepaliDate(event.event_date)}! Join me on the Simraungadh app.`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const isUpcoming = new Date(event.event_date) > new Date();

  return (
    <AnimatedCard>
      <View className={`rounded-[24px] overflow-hidden mb-4 border ${theme.cardClass} ${theme.borderSubtleClass}`} style={theme.cardElevatedClass}>
        
        {/* Image / Header */}
        {event.image_url ? (
          <View className="h-40 w-full relative">
            <Image source={{ uri: event.image_url }} className="w-full h-full" contentFit="cover" />
            <View className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md flex-row items-center">
              <Calendar size={12} color="#fff" style={{ marginRight: 6 }} />
              <Text className="text-white text-[12px] font-bold">{getNepaliDate(event.event_date)}</Text>
            </View>
            {event.is_official && (
              <View className="absolute top-3 right-3 px-2 py-1 rounded-full bg-blue-500 shadow-sm">
                <Text className="text-white text-[10px] font-bold uppercase tracking-wider">Official</Text>
              </View>
            )}
          </View>
        ) : (
          <View className={`px-5 pt-5 pb-3 flex-row items-center justify-between`}>
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                <Calendar size={20} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
              </View>
              <View>
                <Text className={`font-bold text-[14px] ${theme.textClass}`}>Civic Event</Text>
                <Text className={`text-[12px] mt-0.5 ${theme.textSecondaryClass}`}>{getNepaliDate(event.event_date)}</Text>
              </View>
            </View>
            {event.is_official && (
              <View className="px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                <Text className="text-blue-500 text-[10px] font-bold uppercase tracking-wider">Official</Text>
              </View>
            )}
          </View>
        )}

        {/* Content */}
        <View className="px-5 pt-4 pb-2">
          <Text className={`text-[17px] font-black leading-snug mb-2 ${theme.textClass}`}>{event.title}</Text>
          {event.description && (
            <Text className={`text-[14px] leading-relaxed mb-4 ${theme.textSecondaryClass}`} numberOfLines={3}>
              {event.description}
            </Text>
          )}

          {event.location && (
            <View className="flex-row items-center mb-3">
              <MapPin size={14} color={theme.textMuted} style={{ marginRight: 6 }} />
              <Text className={`text-[13px] font-medium ${theme.textSecondaryClass}`}>{event.location}</Text>
            </View>
          )}
        </View>

        {/* Footer Actions */}
        <View className={`px-5 py-3 border-t flex-row items-center justify-between ${theme.borderSubtleClass} ${theme.isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
          <View className="flex-row items-center">
            <Users size={14} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
            <Text className={`text-[12px] font-bold ml-1.5 ${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
              {event.attendees_count} attending
            </Text>
          </View>
          
          <View className="flex-row items-center space-x-2">
            <TouchableOpacity onPress={handleShare} className={`w-8 h-8 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
              <Share2 size={14} color={theme.iconColor} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className={`px-4 py-1.5 rounded-full ${isUpcoming ? (theme.isDark ? 'bg-indigo-500' : 'bg-indigo-600') : (theme.isDark ? 'bg-slate-700' : 'bg-slate-300')}`}
              disabled={!isUpcoming}
            >
              <Text className={`text-[12px] font-bold ${isUpcoming ? 'text-white' : (theme.isDark ? 'text-slate-400' : 'text-slate-500')}`}>
                {isUpcoming ? 'Join Event' : 'Past Event'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </AnimatedCard>
  );
}
