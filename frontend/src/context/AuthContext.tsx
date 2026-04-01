import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { setAccessToken, setUnauthorizedHandler } from "@/lib/api";
import { authService } from "@/services/authService";
import type { User } from "@/types/api";

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { email: string; password: string; full_name: string }) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (token: string | null, user: User | null) => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, updateToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const setSession = useCallback((nextToken: string | null, nextUser: User | null) => {
    updateToken(nextToken);
    setAccessToken(nextToken);
    setUser(nextUser);
  }, []);

  const clearSession = useCallback(() => {
    setSession(null, null);
  }, [setSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => clearSession());
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const session = await authService.bootstrap();
        if (!active) {
          return;
        }
        setSession(session.access_token, session.user);
      } catch {
        if (!active) {
          return;
        }
        clearSession();
      } finally {
        if (active) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [clearSession, setSession]);

  const login = useCallback(
    async (payload: { email: string; password: string }) => {
      const session = await authService.login(payload);
      setSession(session.access_token, session.user);
    },
    [setSession]
  );

  const register = useCallback(
    async (payload: { email: string; password: string; full_name: string }) => {
      const session = await authService.register(payload);
      setSession(session.access_token, session.user);
    },
    [setSession]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken: token,
      isAuthenticated: Boolean(user && token),
      isBootstrapping,
      login,
      register,
      logout,
      setSession,
    }),
    [isBootstrapping, login, logout, register, setSession, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}