"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

type AuthProviderProps = {
  children: ReactNode;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  userDisplayName: string | null;
  userInitials: string | null;
};

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

const initialAuthState: AuthState = {
  user: null,
  session: null,
  loading: true,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const getStringMetadataValue = (
  user: User | null,
  key: string,
): string | null => {
  const value = user?.user_metadata?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const getAuthenticatedUserDisplayName = (user: User | null) => {
  return (
    getStringMetadataValue(user, "name") ??
    getStringMetadataValue(user, "full_name") ??
    getStringMetadataValue(user, "display_name") ??
    user?.email ??
    user?.id ??
    null
  );
};

const getAuthenticatedUserInitials = (displayName: string | null) => {
  if (!displayName) {
    return null;
  }

  const normalizedName = displayName.includes("@")
    ? displayName.split("@")[0]
    : displayName;
  const words = normalizedName.split(/[\s._-]+/).filter(Boolean);

  if (words.length === 0) {
    return normalizedName.slice(0, 2).toUpperCase();
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!isMounted) {
          return;
        }

        setAuthState({
          session,
          user: session?.user ?? null,
          loading: false,
        });
      } catch (error) {
        console.error("Failed to load Supabase auth session", error);

        if (!isMounted) {
          return;
        }

        setAuthState({
          session: null,
          user: null,
          loading: false,
        });
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState({
        session,
        user: session?.user ?? null,
        loading: false,
      });
    });

    void loadCurrentSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => {
      const userDisplayName = getAuthenticatedUserDisplayName(authState.user);

      return {
        user: authState.user,
        session: authState.session,
        loading: authState.loading,
        isAuthenticated: Boolean(authState.session?.user),
        userDisplayName,
        userInitials: getAuthenticatedUserInitials(userDisplayName),
      };
    },
    [authState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export default AuthProvider;
