// src/context/AuthContext.js
// Global authentication state using React Context + SecureStore

import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // initial hydration

  // ── Hydrate auth state from SecureStore on app launch ──
  useEffect(() => {
    const hydrate = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('auth_token');
        const storedUser = await SecureStore.getItemAsync('auth_user');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.warn('Auth hydration error:', error);
      } finally {
        setLoading(false);
      }
    };
    hydrate();
  }, []);

  // ── Sign up ──
  const signup = async (name, email, password) => {
    const response = await api.post('/auth/signup', { name, email, password });
    const { token: newToken, user: newUser } = response.data;
    await _persistAuth(newToken, newUser);
    return response.data;
  };

  // ── Log in ──
  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = response.data;
    await _persistAuth(newToken, newUser);
    return response.data;
  };

  // ── Log out ──
  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('auth_user');
    } catch {}
    setToken(null);
    setUser(null);
  };

  // ── Update local user state (e.g., after delivery) ──
  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const updatedUser = response.data.user;
      setUser(updatedUser);
      await SecureStore.setItemAsync('auth_user', JSON.stringify(updatedUser));
    } catch (error) {
      console.warn('Could not refresh user:', error);
    }
  };

  // ── Private: persist token + user to SecureStore ──
  const _persistAuth = async (newToken, newUser) => {
    await SecureStore.setItemAsync('auth_token', newToken);
    await SecureStore.setItemAsync('auth_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signup, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for consuming auth context
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;