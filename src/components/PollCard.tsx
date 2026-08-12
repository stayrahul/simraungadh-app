// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { PieChart, CheckCircle2, User } from 'lucide-react-native';
import { useTheme } from '../hooks/use-theme';
import { Poll } from '../lib/types';
import { supabase } from '../lib/supabase';
import { getNepaliDate } from '../lib/nepaliDate';
import * as Haptics from 'expo-haptics';
import AnimatedCard from './AnimatedCard';
import { useAuthStore } from '../store/authStore';

export default function PollCard({ poll, onVote }: { poll: Poll, onVote: (pollId: string, options: string[], votes: Record<string, string>) => void }) {
  const theme = useTheme();
  const { profile } = useAuthStore();
  const [isVoting, setIsVoting] = useState(false);

  // Parse votes
  const votes = poll.votes || {};
  const totalVotes = Object.keys(votes).length;
  const userVotedIndex = profile ? votes[profile.id] : undefined;
  const hasVoted = userVotedIndex !== undefined;

  const handleVote = async (optionIndex: number) => {
    if (!profile || hasVoted || isVoting || !poll.is_active) return;
    setIsVoting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const newVotes = { ...votes, [profile.id]: String(optionIndex) };
      
      const { error } = await supabase
        .from('polls')
        .update({ votes: newVotes })
        .eq('id', poll.id);

      if (error) throw error;
      
      onVote(poll.id, poll.options, newVotes);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsVoting(false);
    }
  };

  const getOptionPercentage = (index: number) => {
    if (totalVotes === 0) return 0;
    const optionVotes = Object.values(votes).filter(v => v === String(index)).length;
    return Math.round((optionVotes / totalVotes) * 100);
  };

  return (
    <AnimatedCard>
      <View className={`rounded-[24px] overflow-hidden border ${theme.cardClass} ${theme.borderSubtleClass}`} style={theme.cardElevatedClass}>
        
        {/* Header */}
        <View className="px-5 pt-5 pb-3 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
              <PieChart size={20} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
            </View>
            <View className="flex-1">
              <Text className={`font-bold text-[14px] ${theme.textClass}`}>Community Poll</Text>
              <Text className={`text-[12px] mt-0.5 ${theme.textSecondaryClass}`}>{poll.category || 'General'} • {getNepaliDate(poll.created_at)}</Text>
            </View>
          </View>
          {!poll.is_active && (
            <View className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
              <Text className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Closed</Text>
            </View>
          )}
        </View>

        {/* Question */}
        <View className="px-5 pb-4">
          <Text className={`text-[17px] font-black leading-snug ${theme.textClass}`}>{poll.question}</Text>
        </View>

        {/* Options */}
        <View className="px-5 pb-5 space-y-3">
          {poll.options.map((option, index) => {
            const isSelected = userVotedIndex === String(index);
            const percentage = getOptionPercentage(index);
            const optionVotes = Object.values(votes).filter(v => v === String(index)).length;
            
            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                disabled={hasVoted || !poll.is_active || isVoting}
                onPress={() => handleVote(index)}
                className={`relative overflow-hidden rounded-[16px] border ${hasVoted ? (isSelected ? (theme.isDark ? 'border-indigo-500 bg-indigo-500/10' : 'border-indigo-500 bg-indigo-50') : (theme.isDark ? 'border-white/5 bg-transparent' : 'border-slate-200 bg-transparent')) : (theme.isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50')}`}
                style={{ padding: 14 }}
              >
                {/* Progress bar fill for voted state */}
                {hasVoted && (
                  <View 
                    className={`absolute top-0 left-0 bottom-0 ${isSelected ? (theme.isDark ? 'bg-indigo-500/20' : 'bg-indigo-100') : (theme.isDark ? 'bg-white/5' : 'bg-slate-100')}`}
                    style={{ width: `${percentage}%` }}
                  />
                )}
                
                <View className="flex-row items-center justify-between z-10 relative">
                  <View className="flex-row items-center flex-1">
                    {isSelected && <CheckCircle2 size={16} color={theme.isDark ? '#818cf8' : '#4f46e5'} style={{ marginRight: 8 }} />}
                    <Text className={`text-[15px] ${isSelected ? 'font-black' : 'font-semibold'} ${theme.textClass} flex-1`} numberOfLines={2}>
                      {option}
                    </Text>
                  </View>
                  {hasVoted && (
                    <View className="items-end ml-4">
                      <Text className={`font-black text-[15px] ${isSelected ? (theme.isDark ? 'text-indigo-400' : 'text-indigo-600') : theme.textClass}`}>{percentage}%</Text>
                      <Text className={`text-[11px] ${theme.textMutedClass}`}>{optionVotes} votes</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View className={`px-5 py-3 border-t flex-row items-center justify-between ${theme.borderSubtleClass} ${theme.isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
          <View className="flex-row items-center">
            <User size={12} color={theme.textMuted} />
            <Text className={`text-[12px] font-bold ml-1.5 ${theme.textMutedClass}`}>{totalVotes} Total Votes</Text>
          </View>
          {poll.author && (
            <View className="flex-row items-center">
              <Text className={`text-[11px] font-medium mr-2 ${theme.textMutedClass}`}>by {poll.author.full_name?.split(' ')[0]}</Text>
              {poll.author.avatar_url ? (
                <Image source={{ uri: poll.author.avatar_url }} className="w-5 h-5 rounded-full" />
              ) : (
                <View className={`w-5 h-5 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                  <User size={10} color={theme.iconColor} />
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </AnimatedCard>
  );
}
