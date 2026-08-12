// @ts-nocheck
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BookmarkState {
  bookmarkedIssueIds: string[];
  toggleBookmark: (id: string) => void;
  clearBookmarks: () => void;
  isBookmarked: (id: string) => boolean;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarkedIssueIds: [],
      toggleBookmark: (id) => {
        set((state) => {
          const isSaved = state.bookmarkedIssueIds.includes(id);
          if (isSaved) {
            return { bookmarkedIssueIds: state.bookmarkedIssueIds.filter((bId) => bId !== id) };
          } else {
            return { bookmarkedIssueIds: [...state.bookmarkedIssueIds, id] };
          }
        });
      },
      clearBookmarks: () => set({ bookmarkedIssueIds: [] }),
      isBookmarked: (id) => get().bookmarkedIssueIds.includes(id),
    }),
    {
      name: 'simraungadh-bookmarks',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
