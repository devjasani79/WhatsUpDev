/**
 * API Service
 * Centralized management of API endpoints and common HTTP request handling
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://whatsupdev79.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// API endpoints
const ENDPOINTS = {
  AUTH: {
    SIGNIN: '/auth/signin',
    SIGNUP: '/auth/signup',
  },
  USERS: {
    ME: '/users/me',
    SEARCH: '/users/search',
  },
  CHATS: {
    LIST: '/chats',
    GROUP: '/chats/group',
    MESSAGES: (chatId) => `/chats/${chatId}/messages`,
  },
  MESSAGES: {
    GET: (chatId) => `/messages/${chatId}`,
    DELETE: (messageId) => `/messages/${messageId}`,
  },
};

export default api;

export const api = {
  // Auth endpoints
  auth: {
    login: (email, password) => 
      api.post(ENDPOINTS.AUTH.SIGNIN, { email, password }),
    
    register: (email, password, fullName) => 
      api.post(ENDPOINTS.AUTH.SIGNUP, { email, password, fullName }),
  },
  
  // User endpoints
  users: {
    getProfile: () => api.get(ENDPOINTS.USERS.ME),
    
    updateProfile: (data) => 
      api.put(ENDPOINTS.USERS.ME, data),
    
    search: (query) => 
      api.get(ENDPOINTS.USERS.SEARCH, { params: { query } }),
  },
  
  // Chat endpoints
  chats: {
    getAll: () => api.get(ENDPOINTS.CHATS.LIST),
    
    create: (participantId) => 
      api.post(ENDPOINTS.CHATS.LIST, { participantId }),
    
    createGroup: (name, participants) => 
      api.post(ENDPOINTS.CHATS.GROUP, { name, participants }),
    
    getMessages: (chatId) => 
      api.get(ENDPOINTS.MESSAGES.GET(chatId)),
    
    sendMessage: (chatId, content, type = 'text') => 
      api.post(ENDPOINTS.CHATS.MESSAGES(chatId), { content, type }),
  },
  
  // Message endpoints
  messages: {
    delete: (messageId) => 
      api.delete(ENDPOINTS.MESSAGES.DELETE(messageId)),
  },
};