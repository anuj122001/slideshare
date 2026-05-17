import { create } from 'zustand';
import api from '../services/api';

function loadFromStorage() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const accessToken  = localStorage.getItem('accessToken')  || null;
    const refreshToken = localStorage.getItem('refreshToken') || null;
    return { user, accessToken, refreshToken };
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

const useAuthStore = create((set) => ({
  ...loadFromStorage(),

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('user',         JSON.stringify(data.user));
    localStorage.setItem('accessToken',  data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.user;
  },

  register: async (name, email, password, role) => {
    const { data } = await api.post('/auth/register', { name, email, password, role });
    localStorage.setItem('user',         JSON.stringify(data.user));
    localStorage.setItem('accessToken',  data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.user;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try { await api.post('/auth/logout', { refreshToken }); } catch {}
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));

export default useAuthStore;
