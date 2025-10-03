import { create } from 'zustand';

export const useUserStore = create((set) => ({
  searchResults: [],
  loading: false,
  error: null,
  avatarUploading: false,

  searchUsers: async (query) => {
    try {
      set({ loading: true });
      const token = localStorage.getItem('token');
      const response = await fetch(`https://whatsupdev79.onrender.com/api/users/search?query=${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to search users');

      const data = await response.json();
      set({ searchResults: data });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (updates) => {
    try {
      set({ loading: true });
      const token = localStorage.getItem('token');
      const response = await fetch('https://whatsupdev79.onrender.com/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update profile');

      const data = await response.json();
      return data.user;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  uploadAvatar: async (file) => {
    try {
      set({ avatarUploading: true });
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('avatar', file);
      const response = await fetch('https://whatsupdev79.onrender.com/api/users/me/avatar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });
      if (!response.ok) throw new Error('Failed to upload avatar');
      const data = await response.json();
      return data.user;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ avatarUploading: false });
    }
  },
}));