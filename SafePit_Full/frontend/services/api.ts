// frontend/services/api.ts
import { Platform } from 'react-native';

// ── Get token (web: localStorage, native: AsyncStorage) ──────────────
const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('token');
  }
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return AsyncStorage.getItem('token');
};

// ── Get BASE URL (auto-detect PC IP for physical phone) ──────────────
const getBaseUrl = (): string => {
  if (Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_API_URL
      ? `${process.env.EXPO_PUBLIC_API_URL}/api`
      : 'http://localhost:5000/api';
  }
  try {
    const Constants = require('expo-constants').default;
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    if (host) return `http://${host}:5000/api`;
  } catch {}
  return 'http://localhost:5000/api';
};

// ── Core request helper ──────────────────────────────────────────────
async function req(method: string, path: string, body?: any): Promise<any> {
  const token = await getToken();
  const BASE  = getBaseUrl();

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ── Storage helpers ──────────────────────────────────────────────────
export const storage = {
  saveAuth: async (token: string, user: any) => {
    if (Platform.OS === 'web') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('preferred_lang', user.preferred_lang || 'English');
    } else {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.multiSet([
        ['token', token],
        ['user', JSON.stringify(user)],
        ['preferred_lang', user.preferred_lang || 'English'],
      ]);
    }
  },
  getUser: async () => {
    if (Platform.OS === 'web') {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const u = await AsyncStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },
  clear: async () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('preferred_lang');
    } else {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.multiRemove(['token', 'user', 'preferred_lang']);
    }
  },
  hasToken: async () => {
    if (Platform.OS === 'web') {
      return !!localStorage.getItem('token');
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return !!(await AsyncStorage.getItem('token'));
  },
};

// ── Auth ─────────────────────────────────────────────────────────────
export const authAPI = {
  login:          (email: string, password: string, role: string) =>
    req('POST', '/auth/login', { email, password, role }),
  me:             () => req('GET', '/auth/me'),
  updateLanguage: (language: string) => req('PUT', '/auth/language', { language }),
};

// ── Checklist ────────────────────────────────────────────────────────
export const checklistAPI = {
  getMyTasks:         (lang?: string) =>
    req('GET', `/checklist${lang ? `?lang=${lang}` : ''}`),
  toggleTask:         (id: number) =>
    req('POST', `/checklist/${id}/complete`),
  getAllTasks:         () => req('GET', '/checklist/all'),
  getWorkersProgress: (lang?: string) =>
    req('GET', `/checklist/workers-progress${lang ? `?lang=${lang}` : ''}`),
  createTask:         (data: { task_description: string; role_target?: string; shift_target?: string; lang?: string }) =>
    req('POST', '/checklist', data),
  deleteTask:         (id: number) => req('DELETE', `/checklist/${id}`),
};

// ── SOS ──────────────────────────────────────────────────────────────
export const sosAPI = {
  trigger:     (location?: string) => req('POST', '/sos', { location }),
  getAlerts:   (status?: string)   => req('GET', `/sos${status ? `?status=${status}` : ''}`),
  acknowledge: (id: number)        => req('PATCH', `/sos/${id}/acknowledge`),
  resolve:     (id: number)        => req('PATCH', `/sos/${id}/resolve`),
};

// ── Incident Reports ─────────────────────────────────────────────────
export const reportAPI = {
  create:       (data: { description: string; location?: string; severity: string }) =>
    req('POST', '/reports', data),
  getAll:       (lang?: string) =>
    req('GET', `/reports${lang ? `?lang=${lang}` : ''}`),
  updateStatus: (id: number, status: string) =>
    req('PATCH', `/reports/${id}/status`, { status }),
};

// ── Content ──────────────────────────────────────────────────────────
export const contentAPI = {
  get: (type?: string, lang?: string) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (lang) params.append('lang', lang);
    const query = params.toString();
    return req('GET', `/content${query ? `?${query}` : ''}`);
  },
  create:           (data: { type: string; title?: string; content: string; lang?: string }) =>
    req('POST', '/content', data),
  delete:           (id: number) => req('DELETE', `/content/${id}`),
  getStats:         () => req('GET', '/content/stats'),
  getNotifications: (lang?: string) => req('GET', `/content/notifications${lang ? `?lang=${lang}` : ''}`),
};
