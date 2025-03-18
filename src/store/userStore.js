import { create } from 'zustand';

export const useUserStore = create((set) => ({
  searchResults: [],
  loading: false,
  error: null,

  searchUsers: async (query) => {
    try {
      set({ loading: true });
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/users/search?query=${query}`, {
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
      const response = await fetch('http://localhost:3000/api/users/me', {
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
}));