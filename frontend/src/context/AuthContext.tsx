import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@/types';
import { getAuthToken, setAuthToken, apiGetMe, apiLogin, apiRegister, apiUpdateProfile } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, options?: { telegram_chat_id?: string; discord_webhook?: string }) => Promise<void>;
  updateProfile: (data: {
    telegram_chat_id?: string | null;
    discord_webhook?: string | null;
    current_password?: string;
    new_password?: string;
  }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await apiGetMe();
        if (res.success && res.data) {
          setUser(res.data);
        } else {
          setAuthToken(null);
          setToken(null);
        }
      } catch {
        setAuthToken(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    if (res.success && res.data) {
      setAuthToken(res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    } else {
      throw new Error(res.error || 'Login failed');
    }
  };

  const register = async (
    email: string,
    password: string,
    options?: { telegram_chat_id?: string; discord_webhook?: string }
  ) => {
    const res = await apiRegister(email, password, options);
    if (res.success && res.data) {
      setAuthToken(res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    } else {
      throw new Error(res.error || 'Registration failed');
    }
  };

  const updateProfile = async (data: {
    telegram_chat_id?: string | null;
    discord_webhook?: string | null;
    current_password?: string;
    new_password?: string;
  }) => {
    const res = await apiUpdateProfile(data);
    if (res.success && res.data) {
      setUser(res.data);
      return res.data;
    } else {
      throw new Error(res.error || 'Failed to update profile');
    }
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
