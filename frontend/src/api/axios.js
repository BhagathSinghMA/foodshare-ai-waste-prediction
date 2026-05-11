// src/api/axios.js
// Centralized Axios instance with JWT interceptors

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ── Change this to your backend URL ──
// Android emulator: http://10.0.2.2:5000
// iOS simulator:    http://localhost:5000
// Physical device:  http://192.168.43.23:5000
const BASE_URL = 'http://10.0.2.2:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─────────────────────────────────────────────────────────────
// Request Interceptor: Attach JWT token to every request
// ─────────────────────────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Could not read token from SecureStore:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────────────
// Response Interceptor: Handle 401 globally
// ─────────────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired - clear storage
      try {
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('auth_user');
      } catch {}
    }
    return Promise.reject(error);
  }
);

export default api;