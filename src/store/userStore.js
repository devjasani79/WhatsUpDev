import { create } from 'zustand';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://whatsupdev79.onrender.com/api';

export const useUserStore = create((set) => ({
  searchResults: [],
  loading: false,
  error: null,
  avatarUploading: false,

  /* -------------------------------------------------------------------------- */
  /*                                SEARCH USERS                                */
  /* -------------------------------------------------------------------------- */
  searchUsers: async (query) => {
    try {
      set({ loading: true, error: null });

      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch(
        `${API_BASE_URL}/users/search?query=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to search users');
      }

      const data = await response.json();
      set({ searchResults: data });
    } catch (error) {
      console.error('[UserStore] searchUsers error:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /* -------------------------------------------------------------------------- */
  /*                               UPDATE PROFILE                                */
  /* -------------------------------------------------------------------------- */
  updateProfile: async (updates) => {
    try {
      set({ loading: true, error: null });

      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update profile');
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('[UserStore] updateProfile error:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /* -------------------------------------------------------------------------- */
  /*                               UPLOAD AVATAR                                 */
  /* -------------------------------------------------------------------------- */
  uploadAvatar: async (file) => {
    try {
      set({ avatarUploading: true, error: null });

      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      if (!file) throw new Error('No file provided');

      const formData = new FormData();

      // 🔑 MUST MATCH multer: uploadAvatar.single('avatar')
      formData.append('avatar', file);

      const response = await fetch(`${API_BASE_URL}/users/me/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // ❌ DO NOT set Content-Type manually
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to upload avatar');
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('[UserStore] uploadAvatar error:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ avatarUploading: false });
    }
  },
}));
