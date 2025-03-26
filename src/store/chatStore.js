import { create } from 'zustand';
import api from '../services/api';
import socketService from '../services/socket';
import { toast } from 'sonner';

const useChatStore = create((set, get) => ({
  chats: [],
  selectedChat: null,
  messages: [],
  loading: false,
  error: null,
  typingUsers: new Map(),
  unreadCounts: {},
  socketInitialized: false,

  // Add temporary message methods
  addTempMessage: (message) => {
    set(state => ({
      messages: [...state.messages, message]
    }));
  },

  removeTempMessage: (tempId) => {
    set(state => ({
      messages: state.messages.filter(msg => msg._id !== tempId)
    }));
  },

  // Fetch all chats for the current user
  fetchChats: async () => {
    try {
      set({ loading: true, error: null });
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please authenticate');

      const response = await api.get('/chats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ chats: response.data, loading: false });
    } catch (error) {
      console.error('[Chat Store] Error fetching chats:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to fetch chats');
    }
  },

  // Select a chat
  selectChat: (chat) => {
    set({ selectedChat: chat });
  },

  // Fetch messages for a specific chat
  fetchMessages: async (chatId) => {
    try {
      set({ loading: true, error: null });
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please authenticate');

      const response = await api.get(`/messages/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ messages: response.data, loading: false });
    } catch (error) {
      console.error('[Chat Store] Error fetching messages:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to fetch messages');
    }
  },

  // Send a message
  sendMessage: async (content, chatId) => {
    try {
      set({ loading: true, error: null });
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please authenticate');

      const response = await api.post('/messages', {
        content,
        chatId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newMessage = response.data;
      set(state => ({
        messages: [...state.messages, newMessage],
        loading: false
      }));

      // Emit message through socket
      if (socketService.isConnected()) {
        socketService.sendMessage(chatId, newMessage);
      } else {
        console.warn('[Chat Store] Socket not connected, message may not be delivered in real-time');
      }
    } catch (error) {
      console.error('[Chat Store] Error sending message:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to send message');
    }
  },

  // Create a new chat
  createChat: async (userId) => {
    try {
      set({ loading: true, error: null });
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please authenticate');

      const response = await api.post('/chats', {
        userId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newChat = response.data;
      set(state => ({
        chats: [newChat, ...state.chats],
        selectedChat: newChat,
        loading: false
      }));
    } catch (error) {
      console.error('[Chat Store] Error creating chat:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to create chat');
    }
  },

  // Create a group chat
  createGroupChat: async (users, name) => {
    try {
      set({ loading: true, error: null });
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please authenticate');

      const response = await api.post('/chats/group', {
        users,
        name
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newChat = response.data;
      set(state => ({
        chats: [newChat, ...state.chats],
        selectedChat: newChat,
        loading: false
      }));
    } catch (error) {
      console.error('[Chat Store] Error creating group chat:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to create group chat');
    }
  },

  // Initialize chat listeners
  initializeChatListeners: (userId) => {
    if (!userId) {
      console.error('[Chat Store] No user ID provided for chat listeners');
      return () => {};
    }

    console.log('[Chat Store] Initializing chat listeners for user:', userId);

    // Handle new messages
    const handleNewMessage = (message) => {
      console.log('[Chat Store] Received new message:', message);
      set(state => {
        const updatedChats = state.chats.map(chat => {
          if (chat._id === message.chatId) {
            return {
              ...chat,
              lastMessage: message,
              updatedAt: new Date()
            };
          }
          return chat;
        });

        // Sort chats by last message time
        updatedChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        return {
          chats: updatedChats,
          messages: state.selectedChat?._id === message.chatId
            ? [...state.messages, message]
            : state.messages
        };
      });
    };

    // Handle message read status
    const handleMessagesRead = ({ chatId, userId: readByUserId }) => {
      console.log('[Chat Store] Messages read:', { chatId, readByUserId });
      set(state => ({
        messages: state.messages.map(message => {
          if (message.chatId === chatId && !message.readBy.includes(readByUserId)) {
            return {
              ...message,
              readBy: [...message.readBy, readByUserId]
            };
          }
          return message;
        })
      }));
    };

    // Handle message unsent
    const handleMessageUnsent = ({ messageId, chatId }) => {
      console.log('[Chat Store] Message unsent:', { messageId, chatId });
      set(state => ({
        messages: state.messages.filter(message => message._id !== messageId),
        chats: state.chats.map(chat => {
          if (chat._id === chatId) {
            return {
              ...chat,
              lastMessage: chat.messages[chat.messages.length - 1] || null
            };
          }
          return chat;
        })
      }));
    };

    // Set up socket listeners
    const cleanupMessage = socketService.onMessageReceived(handleNewMessage);
    const cleanupRead = socketService.onMessagesRead(handleMessagesRead);
    const cleanupUnsent = socketService.onMessageUnsent(handleMessageUnsent);

    set({ socketInitialized: true });

    // Return cleanup function
    return () => {
      console.log('[Chat Store] Cleaning up chat listeners');
      cleanupMessage();
      cleanupRead();
      cleanupUnsent();
      set({ socketInitialized: false });
    };
  },

  // Cleanup chat listeners
  cleanupChatListeners: () => {
    console.log('[Chat Store] Cleaning up all chat listeners');
    socketService.disconnect();
    set({ socketInitialized: false });
  },

  handleNewMessage: (message) => {
    try {
      // Get user ID safely
      const userJson = localStorage.getItem('user');
      if (!userJson) {
        console.error('[Chat Store] User data not found');
        return;
      }
      
      const user = JSON.parse(userJson);
      if (!user || !user.id) {
        console.error('[Chat Store] Invalid user data');
        return;
      }
      
      const isCurrentChat = get().selectedChat?._id === message.chat._id;
      
      // Update messages if in the same chat
      if (isCurrentChat) {
        set(state => ({
          messages: [...state.messages, message],
        }));
        
        // Mark as read immediately if we're in the chat
        if (socketService.isConnected()) {
          socketService.markMessagesAsRead(message.chat._id, user.id);
        }
      } else {
        // Increment unread count for this chat
        set(state => ({
          unreadCounts: {
            ...state.unreadCounts,
            [message.chat._id]: (state.unreadCounts[message.chat._id] || 0) + 1
          }
        }));
      }
    } catch (error) {
      console.error('[Chat Store] Error handling new message:', error);
    }
  },

  setTypingStatus: (chatId, userId, isTyping) => {
    set(state => {
      const typingUsers = new Map(state.typingUsers);
      if (isTyping) {
        typingUsers.set(userId, chatId);
      } else {
        typingUsers.delete(userId);
      }
      return { typingUsers };
    });
  },
  
  markMessagesAsRead: (chatId) => {
    try {
      // Get user ID safely
      const userJson = localStorage.getItem('user');
      if (!userJson) {
        throw new Error('User data not found');
      }
      
      const user = JSON.parse(userJson);
      if (!user || !user.id) {
        throw new Error('Invalid user data');
      }
      
      socketService.markMessagesAsRead(chatId, user.id);
      
      set(state => ({
        unreadCounts: {
          ...state.unreadCounts,
          [chatId]: 0
        }
      }));
    } catch (error) {
      console.error('%c[Chat Store] Error marking messages as read:', 'color: red', error);
    }
  },
  
  updateUserStatus: (userId, isOnline, lastSeen) => {
    set(state => ({
      chats: state.chats.map(chat => {
        const updatedParticipants = chat.participants.map(p => 
          p._id === userId ? { ...p, isOnline, lastSeen } : p
        );
        return { ...chat, participants: updatedParticipants };
      })
    }));
  }
}));

export default useChatStore;