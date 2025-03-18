// services/socket.js
import { io } from 'socket.io-client';
import { socketUrl } from './api';
import { toast } from 'sonner';

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(token) {
    if (!this.socket) {
      this.socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

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
          this.connect(token);
        }
      });

      this.socket.on('auth_error', () => {
        console.error('Socket authentication error');
        toast.error('Authentication failed');
        window.location.href = '/auth';
      });
    }
    return this.socket;
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
    this.socket.emit('join_chat', chatId);
  }

  leaveRoom(chatId) {
    if (!this.socket) return;
    this.socket.emit('leave_chat', chatId);
  }

  // Messaging methods
  sendMessage(chatId, message) {
    if (!this.socket) return;
    this.socket.emit('send_message', { chatId, message });
  }

  onMessageReceived(callback) {
    if (!this.socket) return;
    this.socket.on('new_message', callback);
  }

  // Typing indicators
  typing(chatId, userId) {
    if (!this.socket) return;
    this.socket.emit('typing', { chatId, userId });
  }

  stopTyping(chatId, userId) {
    if (!this.socket) return;
    this.socket.emit('stop_typing', { chatId, userId });
  }

  onTyping(callback) {
    if (!this.socket) return;
    this.socket.on('user_typing', callback);
  }

  onStopTyping(callback) {
    if (!this.socket) return;
    this.socket.on('user_stop_typing', callback);
  }

  // Message status methods
  markMessagesAsRead(chatId, userId) {
    if (!this.socket) return;
    this.socket.emit('mark_as_read', { chatId, userId });
  }

  onMessagesRead(callback) {
    if (!this.socket) return;
    this.socket.on('message_read', callback);
  }

  // Message unsend
  unsendMessage(messageId, chatId) {
    if (!this.socket) return;
    this.socket.emit('unsend_message', { messageId, chatId });
  }

  onMessageUnsent(callback) {
    if (!this.socket) return;
    this.socket.on('message_deleted', callback);
  }

  // User status
  onUserOnline(callback) {
    if (!this.socket) return;
    this.socket.on('user_typing', callback);
  }

  onUserOffline(callback) {
    if (!this.socket) return;
    this.socket.on('user_stop_typing', callback);
  }

  // Remove listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export const socketService = new SocketService();