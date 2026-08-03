// @ts-nocheck
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { UserRole, Profile } from '../lib/types';

interface AuthState {
  session: Session | null;
  user: SupabaseUser | null;
  profile: Profile | null;
  role: UserRole | null;
  initialized: boolean;
  isProfileIncomplete: boolean;

  setSession: (session: Session | null) => void;
  fetchUserProfile: () => Promise<Profile | null>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  role: null,
  initialized: false,
  isProfileIncomplete: false,

  setSession: (session) => {
    set({ session, user: session?.user || null });
    if (session?.user) {
      get().fetchUserProfile();
    } else {
      set({ profile: null, role: null, initialized: true, isProfileIncomplete: false });
    }
  },

  fetchUserProfile: async () => {
    const { user } = get();
    if (!user) {
      set({ initialized: true, isProfileIncomplete: false });
      return null;
    }

    try {
      // Fetch the user's profile
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code === '42703') {
        // Fallback if civic_points migration hasn't been run
        const fallback = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, department, role, created_at, phone_number, home_ward, gender, age, tole')
          .eq('id', user.id)
          .maybeSingle();
        profile = fallback.data;
        error = fallback.error;
      }

      // If no profile row exists in Supabase (e.g. initial Google OAuth login)
      if (!profile && user) {
        const metadata = user.user_metadata || {};
        const fullName = metadata.full_name || metadata.name || user.email?.split('@')[0] || '';
        const avatarUrl = metadata.avatar_url || metadata.picture || null;

        const defaultProfile = {
          id: user.id,
          full_name: fullName,
          avatar_url: avatarUrl,
          role: 'citizen',
          phone_number: user.phone || null,
          home_ward: null,
        };

        const { data: created, error: createErr } = await supabase
          .from('profiles')
          .upsert(defaultProfile)
          .select()
          .single();

        if (!createErr && created) {
          profile = created;
        } else {
          profile = defaultProfile as any;
        }
      }

      const isIncomplete = !profile || profile.home_ward == null || !profile.phone_number || !profile.full_name;

      set({
        profile: profile as Profile,
        role: ((profile?.role as UserRole) || 'citizen'),
        isProfileIncomplete: isIncomplete,
      });

      return profile as Profile;
    } catch (e) {
      console.log('fetchUserProfile error:', e);
      return null;
    } finally {
      set({ initialized: true });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      session: null,
      user: null,
      profile: null,
      role: null,
      isProfileIncomplete: false,
    });
  },
}));

