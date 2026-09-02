// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ultra-fast In-Memory Cache for 0ms reads
const memoryCache = new Map<string, any>();

// Keys used across the app
export const CACHE_KEYS = {
  FEED: (category: string, tab: string) => `feed_${category}_${tab}`,
  NOTICES: 'notices_list',
  NOTIFICATIONS: (userId: string) => `notifications_${userId}`,
  PROFILE_POSTS: (userId: string) => `profile_posts_${userId}`,
  PROFILE_SAVED: (userId: string) => `profile_saved_${userId}`,
  PROFILE_STATS: (userId: string) => `profile_stats_${userId}`,
  SERVICES_LEADERBOARD: 'services_leaderboard',
  SERVICES_EVENTS: 'services_events',
  ISSUE_DETAIL: (id: string) => `issue_detail_${id}`,
};

/**
 * 0ms Synchronous In-Memory Cache Read
 */
export function getSyncCache<T>(key: string): T | null {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }
  return null;
}

/**
 * Instant Cache Read (Memory first -> AsyncStorage fallback)
 */
export async function getFastCache<T>(key: string): Promise<T | null> {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }
  try {
    const raw = await AsyncStorage.getItem(`@fast_cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryCache.set(key, parsed);
      return parsed as T;
    }
  } catch (e) {
    // Silent catch
  }
  return null;
}

/**
 * Instant Cache Write (Saves to memory immediately, persists async in background)
 */
export function setFastCache<T>(key: string, data: T): void {
  if (data === undefined || data === null) return;
  memoryCache.set(key, data);
  // Persist to storage in background without blocking execution
  AsyncStorage.setItem(`@fast_cache_${key}`, JSON.stringify(data)).catch(() => {});
}

/**
 * Clears a specific cache entry
 */
export function invalidateCache(key: string): void {
  memoryCache.delete(key);
  AsyncStorage.removeItem(`@fast_cache_${key}`).catch(() => {});
}
