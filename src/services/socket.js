// services/socket.js
import { io } from 'socket.io-client';
import { toast } from 'sonner';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://whatsupdev79.onrender.com';

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.messageCallbacks = new Set();
  }

  connect(token) {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 2000,
      });

      this.setupEventListeners();
    }
    return this.socket;
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('%c[Socket] Connected successfully', 'color: green; font-weight: bold');
      this.reconnectAttempts = 0;
    });

    this.socket.on('connect_error', (error) => {
      console.error('%c[Socket] Connection error:', 'color: red; font-weight: bold', error);
      this.handleReconnect();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('%c[Socket] Disconnected:', 'color: orange; font-weight: bold', reason);
      if (reason === 'io server disconnect') {
        this.connect();
      }
    });

    this.socket.on('auth_error', () => {
      console.error('%c[Socket] Authentication error', 'color: red; font-weight: bold');
      toast.error('Authentication failed');
      window.location.href = '/auth';
    });

    this.socket.on('message', (message) => {
      this.messageCallbacks.forEach(callback => callback(message));
    });
  }

  handleReconnect() {
    this.reconnectAttempts++;
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      console.log(`%c[Socket] Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`, 'color: orange');
      setTimeout(() => this.connect(), 2000);
    } else {
      console.error('%c[Socket] Max reconnection attempts reached', 'color: red; font-weight: bold');
      toast.error('Failed to reconnect to chat server');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // Chat room methods
  joinRoom(roomId) {
    if (this.socket) {
      this.socket.emit('join_room', roomId);
    }
  }

  leaveRoom(roomId) {
    if (this.socket) {
      this.socket.emit('leave_room', roomId);
    }
  }

  // Messaging methods
  sendMessage(roomId, message) {
    if (this.socket) {
      this.socket.emit('message', { roomId, message });
    }
  }

  onMessageReceived(callback) {
    if (typeof callback === 'function') {
      this.messageCallbacks.add(callback);
      return () => this.messageCallbacks.delete(callback);
    }
  }

  // Typing indicators
  emitTyping(roomId, isTyping) {
    if (this.socket) {
      this.socket.emit('typing', { roomId, isTyping });
    }
  }

  onTyping(callback) {
    if (this.socket && typeof callback === 'function') {
      this.socket.on('typing', callback);
      return () => this.socket.off('typing', callback);
    }
  }

  // Message status methods
  markMessagesAsRead(chatId, userId) {
    if (this.socket) {
      this.socket.emit('mark_read', { chatId, userId });
    }
  }

  onMessagesRead(callback) {
    if (this.socket && typeof callback === 'function') {
      this.socket.on('messages_read', callback);
      return () => this.socket.off('messages_read', callback);
    }
  }

  // Message unsend
  unsendMessage(messageId, chatId) {
    if (this.socket) {
      this.socket.emit('unsend_message', { messageId, chatId });
    }
  }

  onMessageUnsent(callback) {
    if (this.socket && typeof callback === 'function') {
      this.socket.on('message_unsent', callback);
      return () => this.socket.off('message_unsent', callback);
    }
  }

  // User status
  onUserOnline(callback) {
    if (this.socket && typeof callback === 'function') {
      this.socket.on('user_online', callback);
      return () => this.socket.off('user_online', callback);
    }
  }

  onUserOffline(callback) {
    if (this.socket && typeof callback === 'function') {
      this.socket.on('user_offline', callback);
      return () => this.socket.off('user_offline', callback);
    }
  }
}

// Create and export a single instance
const socketService = new SocketService();
export default socketService;