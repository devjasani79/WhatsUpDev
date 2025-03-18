// services/socket.js
import io from 'socket.io-client';
import { toast } from 'sonner';

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));

      if (!token || !user) {
        throw new Error('Authentication required');
      }

      this.socket = io('http://localhost:3000', {
        auth: { token },
        query: { userId: user._id },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('Socket connection error:', error);
      toast.error('Failed to connect to chat server');
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.handleReconnect();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        this.connect();
      }
    });

    this.socket.on('auth_error', () => {
      console.error('Socket authentication error');
      toast.error('Authentication failed');
      window.location.href = '/auth';
    });
  }

  handleReconnect() {
    this.reconnectAttempts++;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      toast.error('Unable to connect to chat server. Please refresh the page.');
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
  joinRoom(chatId) {
    if (!this.socket) return;
    this.socket.emit('join chat', chatId);
  }

  leaveRoom(chatId) {
    if (!this.socket) return;
    this.socket.emit('leave chat', chatId);
  }

  // Messaging methods
  sendMessage(message) {
    if (!this.socket) return;
    this.socket.emit('new message', message);
  }

  onMessageReceived(callback) {
    if (!this.socket) return;
    this.socket.on('message received', callback);
  }

  // Typing indicators
  typing(chatId, userId) {
    if (!this.socket) return;
    this.socket.emit('typing', { chatId, userId });
  }

  stopTyping(chatId, userId) {
    if (!this.socket) return;
    this.socket.emit('stop typing', { chatId, userId });
  }

  onTyping(callback) {
    if (!this.socket) return;
    this.socket.on('typing', callback);
  }

  onStopTyping(callback) {
    if (!this.socket) return;
    this.socket.on('stop typing', callback);
  }

  // Message status methods
  markMessagesAsRead(chatId, userId) {
    if (!this.socket) return;
    this.socket.emit('read messages', { chatId, userId });
  }

  onMessagesRead(callback) {
    if (!this.socket) return;
    this.socket.on('messages read', callback);
  }

  // Message unsend
  unsendMessage(messageId, chatId) {
    if (!this.socket) return;
    this.socket.emit('message unsend', { messageId, chatId });
  }

  onMessageUnsent(callback) {
    if (!this.socket) return;
    this.socket.on('message unsent', callback);
  }

  // User status
  onUserOnline(callback) {
    if (!this.socket) return;
    this.socket.on('user online', callback);
  }

  onUserOffline(callback) {
    if (!this.socket) return;
    this.socket.on('user offline', callback);
  }
}

export const socketService = new SocketService();