import { supabase } from './supabase/client';
import type { User } from '@/types';

export async function signUp(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { user: null, error };
    }

    if (!data.user) {
      return { user: null, error: new Error('No user returned from signup') };
    }

    const user: User = {
      id: data.user.id,
      email: data.user.email || null,
    };

    return { user, error: null };
  } catch (error) {
    return { user: null, error: error as Error };
  }
}

export async function signIn(email: string, password: string): Promise<{ user: User | null; token: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, token: null, error };
    }

    if (!data.user || !data.session) {
      return { user: null, token: null, error: new Error('No user or session returned from signin') };
    }

    const user: User = {
      id: data.user.id,
      email: data.user.email || null,
    };

    return { user, token: data.session.access_token, error: null };
  } catch (error) {
    return { user: null, token: null, error: error as Error };
  }
}

export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      return { error };
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error };
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function getCurrentSession(): Promise<{ user: User | null; token: string | null }> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return { user: null, token: null };
    }

    const user: User = {
      id: session.user.id,
      email: session.user.email || null,
    };

    return { user, token: session.access_token };
  } catch (error) {
    console.error('Error getting current session:', error);
    return { user: null, token: null };
  }
}

export async function refreshSession(): Promise<{ user: User | null; token: string | null }> {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();

    if (error || !session) {
      return { user: null, token: null };
    }

    const user: User = {
      id: session.user.id,
      email: session.user.email || null,
    };

    return { user, token: session.access_token };
  } catch (error) {
    console.error('Error refreshing session:', error);
    return { user: null, token: null };
  }
}

