const API_URL = import.meta.env.VITE_API_URL || 'https://whatsupdev.onrender.com';

export const api = {
  // Auth endpoints
  login: `${API_URL}/api/auth/login`,
  register: `${API_URL}/api/auth/register`,
  logout: `${API_URL}/api/auth/logout`,
  verifyToken: `${API_URL}/api/auth/verify-token`,

  // User endpoints
  getUsers: `${API_URL}/api/users`,
  updateProfile: `${API_URL}/api/users/me`,
  updateAvatar: `${API_URL}/api/users/avatar`,

  // Chat endpoints
  getChats: `${API_URL}/api/chats`,
  createChat: `${API_URL}/api/chats`,
  getChatById: (chatId) => `${API_URL}/api/chats/${chatId}`,
  updateChat: (chatId) => `${API_URL}/api/chats/${chatId}`,
  deleteChat: (chatId) => `${API_URL}/api/chats/${chatId}`,

  // Message endpoints
  getMessages: (chatId) => `${API_URL}/api/messages/${chatId}`,
  sendMessage: `${API_URL}/api/messages`,
  deleteMessage: (messageId) => `${API_URL}/api/messages/${messageId}`,
  markAsRead: (chatId) => `${API_URL}/api/messages/${chatId}/read`,
};

export const socketUrl = import.meta.env.VITE_SOCKET_URL || 'https://whatsupdev.onrender.com'; 