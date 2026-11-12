import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { Session, User } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import {
  AuthProfile,
  deleteMyAccount,
  fetchProfile,
  insertProfile,
  updateMyProfile,
} from './api';
import { supabase } from './supabase';
import { useStore } from '@/state/store';

const NEXT_KEY = 'margines:auth-next';

/* ------------------------------- helpers ---------------------------------- */

function safePath(value?: string | null): string {
  if (!value) return '/';
  return value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function cleanHandle(value: string): string {
  const ascii = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '.')
    .replace(/[._-]{2,}/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 24);
  return ascii || 'czytelnik';
}

function codeFromUrl(url: string): string | null {
  const match = url.match(/[?&#]code=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function rememberNext(next: string) {
  try {
    await AsyncStorage.setItem(NEXT_KEY, safePath(next));
  } catch {
    // The redirect still works; the callback simply falls back to the feed.
  }
}

/** Reads and clears the path the reader wanted to reach before signing in. */
export async function consumeAuthNext(): Promise<string> {
  try {
    const value = await AsyncStorage.getItem(NEXT_KEY);
    if (value) await AsyncStorage.removeItem(NEXT_KEY);
    return safePath(value);
  } catch {
    return '/';
  }
}

async function createProfile(user: User): Promise<AuthProfile> {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const emailName = user.email?.split('@')[0] ?? '';
  const displayName =
    firstString(meta.full_name, meta.name, meta.user_name, emailName) || 'Czytelnik';
  const base = cleanHandle(
    firstString(meta.user_name, meta.preferred_username, emailName, displayName),
  );
  const avatarUrl = firstString(meta.avatar_url, meta.picture) || null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const handle =
      attempt === 0 ? base : `${base}${attempt + 1}`.slice(0, 28);
    try {
      return await insertProfile({
        id: user.id,
        email: user.email ?? null,
        displayName,
        handle,
        avatarUrl,
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== '23505') throw error;
      // A concurrent sign-in may have created the profile already.
      const existing = await fetchProfile(user.id);
      if (existing) return existing;
    }
  }

  throw new Error('Nie udało się utworzyć profilu. Spróbuj ponownie.');
}

/* -------------------------------- context --------------------------------- */

type AuthValue = {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  /** Temporarily hidden in the UI while the beta runs on in-house accounts. */
  signInWithGoogle: (nextPath?: string) => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (input: { name: string; handle: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

/** Turns Supabase auth errors into copy a reader can act on. */
function authError(error: { message?: string; code?: string; status?: number }): Error {
  const code = error.code ?? '';
  const message = (error.message ?? '').toLowerCase();

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return new Error('E-mail lub hasło są nieprawidłowe.');
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return new Error('Potwierdź adres e-mail, zanim się zalogujesz.');
  }
  if (
    code === 'over_request_rate_limit' ||
    error.status === 429 ||
    message.includes('rate limit')
  ) {
    return new Error('Za dużo prób logowania. Odczekaj chwilę i spróbuj ponownie.');
  }
  return new Error('Nie udało się zalogować. Spróbuj ponownie.');
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { dispatch } = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const effectiveProfile = session?.user ? profile : null;

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setSessionLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setSessionLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const current = session?.user;

    if (!current) {
      return () => {
        active = false;
      };
    }

    (async () => {
      setProfileLoading(true);
      try {
        const existing = await fetchProfile(current.id);
        const next = existing ?? (await createProfile(current));
        if (active) setProfile(next);
      } catch {
        // Keep the local profile as a fallback; the app stays usable.
        if (active) setProfile(null);
      } finally {
        if (active) setProfileLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [session]);

  // Keep the rest of the app (feed cards, publish form) on the account identity.
  useEffect(() => {
    if (!effectiveProfile) return;
    dispatch({
      type: 'UPDATE_PROFILE',
      name: effectiveProfile.displayName,
      handle: effectiveProfile.handle,
      joinedAt: effectiveProfile.joinedAt,
    });
  }, [effectiveProfile, dispatch]);

  const signInWithGoogle = useCallback(async (nextPath = '/') => {
    await rememberNext(nextPath);

    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') {
        throw new Error('Logowanie przez Google wymaga przeglądarki.');
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth-callback` },
      });
      if (error) throw new Error('Google nie odpowiedział. Spróbuj ponownie.');
      return true;
    }

    const redirectTo = makeRedirectUri({ scheme: 'margines', path: 'auth-callback' });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });

    if (error) throw new Error('Google nie odpowiedział. Spróbuj ponownie.');
    if (!data.url) throw new Error('Google nie zwrócił adresu logowania.');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) return false;

    const code = codeFromUrl(result.url);
    if (!code) throw new Error('Nie udało się odebrać kodu logowania.');

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      throw new Error('Sesja logowania wygasła. Spróbuj ponownie.');
    }
    return true;
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      throw new Error('Podaj e-mail i hasło.');
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) throw authError(error);
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error('Nie udało się wylogować. Spróbuj ponownie.');
    setProfile(null);
  }, []);

  const updateProfile = useCallback(
    async (input: { name: string; handle: string }) => {
      if (!session?.user) {
        throw new Error('Musisz być zalogowany, żeby zmienić profil.');
      }
      try {
        const next = await updateMyProfile(session.user.id, {
          displayName: input.name.trim(),
          handle: cleanHandle(input.handle),
        });
        setProfile(next);
      } catch (error) {
        if ((error as { code?: string }).code === '23505') {
          throw new Error('Ta nazwa użytkownika jest już zajęta. Wybierz inną.');
        }
        throw new Error('Nie udało się zapisać profilu. Spróbuj ponownie.');
      }
    },
    [session],
  );

  const deleteAccount = useCallback(async () => {
    await deleteMyAccount();
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // The account is already gone; clearing the local session is best effort.
    }
    setProfile(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile: effectiveProfile,
      loading: sessionLoading || (!!session && profileLoading),
      signInWithGoogle,
      signInWithEmail,
      signOut,
      updateProfile,
      deleteAccount,
    }),
    [
      session,
      effectiveProfile,
      sessionLoading,
      profileLoading,
      signInWithGoogle,
      signInWithEmail,
      signOut,
      updateProfile,
      deleteAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
