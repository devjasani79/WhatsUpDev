/**
 * API Service
 * Centralized management of API endpoints and common HTTP request handling
 */

// Base API URL - loads from environment variables in production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

// Helper for making authenticated requests
const makeAuthRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication token not found');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API request failed: ${response.status}`);
  }

  return response.json();
};

export const api = {
  // Auth endpoints
  auth: {
    login: (email, password) => 
      makeAuthRequest(ENDPOINTS.AUTH.SIGNIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }),
    
    register: (email, password, fullName) => 
      makeAuthRequest(ENDPOINTS.AUTH.SIGNUP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      }),
  },
  
  // User endpoints
  users: {
    getProfile: () => makeAuthRequest(ENDPOINTS.USERS.ME),
    
    updateProfile: (data) => 
      makeAuthRequest(ENDPOINTS.USERS.ME, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    search: (query) => 
      makeAuthRequest(`${ENDPOINTS.USERS.SEARCH}?query=${encodeURIComponent(query)}`),
  },
  
  // Chat endpoints
  chats: {
    getAll: () => makeAuthRequest(ENDPOINTS.CHATS.LIST),
    
    create: (participantId) => 
      makeAuthRequest(ENDPOINTS.CHATS.LIST, {
        method: 'POST',
        body: JSON.stringify({ participantId }),
      }),
    
    createGroup: (name, participants) => 
      makeAuthRequest(ENDPOINTS.CHATS.GROUP, {
        method: 'POST',
        body: JSON.stringify({ name, participants }),
      }),
    
    getMessages: (chatId) => 
      makeAuthRequest(ENDPOINTS.MESSAGES.GET(chatId)),
    
    sendMessage: (chatId, content, type = 'text') => 
      makeAuthRequest(ENDPOINTS.CHATS.MESSAGES(chatId), {
        method: 'POST',
        body: JSON.stringify({ content, type }),
      }),
  },
  
  // Message endpoints
  messages: {
    delete: (messageId) => 
      makeAuthRequest(ENDPOINTS.MESSAGES.DELETE(messageId), {
        method: 'DELETE',
      }),
  },
};