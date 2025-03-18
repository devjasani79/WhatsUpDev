import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { socketService } from '../services/socket';
import { toast } from 'sonner';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      theme: 'light',
      notifications: {
        sound: true,
        desktop: true
      },

      setTheme: (theme) => {
        set({ theme });
        localStorage.setItem('theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
      },

      setNotifications: (notifications) => {
        set({ notifications });
      },

      checkAuth: () => {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (token && user) {
          try {
            set({ 
              user: JSON.parse(user),
              isAuthenticated: true 
            });
            return true;
          } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            set({ 
              user: null,
              isAuthenticated: false 
            });
            return false;
          }
        }
        
        return false;
      },

      login: async (email, password) => {
        try {
          set({ loading: true, error: null });
          
          // Check if the server is running on the expected port, otherwise use a fallback
          const apiUrl = 'http://localhost:3000/api/auth/signin';
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          // Handle non-JSON responses
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server error: Expected JSON response but got something else');
          }

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'Login failed');
          }

          // Ensure we have the expected data structure
          if (!data.token || !data.user) {
            throw new Error('Invalid response format from server');
          }

          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));

          set({
            user: data.user,
            isAuthenticated: true,
            loading: false,
          });
          
          toast.success('Login successful');
          return true;
        } catch (error) {
          console.error('Login error:', error);
          set({
            error: error.message,
            loading: false,
          });
          toast.error(error.message || 'Login failed');
          return false;
        }
      },

      register: async (userData) => {
        try {
          set({ loading: true, error: null });
          
          // Check if the server is running on the expected port, otherwise use a fallback
          const apiUrl = 'http://localhost:3000/api/auth/signup';
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
          });

          // Handle non-JSON responses
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server error: Expected JSON response but got something else');
          }

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
          }

          // Ensure we have the expected data structure
          if (!data.token || !data.user) {
            throw new Error('Invalid response format from server');
          }

          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));

          set({
            user: data.user,
            isAuthenticated: true,
            loading: false,
          });
          
          toast.success('Registration successful');
          return true;
        } catch (error) {
          console.error('Registration error:', error);
          set({
            error: error.message,
            loading: false,
          });
          toast.error(error.message || 'Registration failed');
          return false;
        }
      },

      updateProfile: async (updates) => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('No authentication token found');
          }

          // Filter out undefined and null values
          const validUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, value]) => 
              value !== undefined && value !== null && value !== ''
            )
          );

          // If no valid updates, return early
          if (Object.keys(validUpdates).length === 0) {
            throw new Error('No valid updates provided');
          }

          const response = await fetch('http://localhost:3000/api/users/me', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(validUpdates),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update profile');
          }

          const data = await response.json();
          
          // Update user in localStorage and state
          const updatedUser = { ...get().user, ...data.user };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          set({ user: updatedUser });
          
          toast.success('Profile updated successfully');
        } catch (error) {
          console.error('Profile update error:', error);
          toast.error(error.message || 'Failed to update profile');
          throw error;
        }
      },

      logout: () => {
        // Disconnect socket before clearing auth data
        socketService.disconnect();
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        set({
          user: null,
          isAuthenticated: false,
        });
        
        toast.success('Logged out successfully');
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        theme: state.theme,
        notifications: state.notifications
      }),
    }
  )
);