import { create } from 'zustand';
import { socketService } from '../services/socket';
import { toast } from 'sonner';

export const useChatStore = create((set, get) => ({
  chats: [],
  selectedChat: null,
  messages: [],
  loading: false,
  error: null,
  typingUsers: new Map(),
  unreadCounts: {},

  fetchChats: async () => {
    try {
      set({ loading: true });
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch('http://localhost:3000/api/chats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch chats');
      }

      const data = await response.json();
      
      // Sort chats by last message timestamp
      const sortedChats = data.sort((a, b) => {
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
      });
      
      set({ chats: sortedChats });
    } catch (error) {
      console.error('Error fetching chats:', error);
      set({ error: error.message });
      toast.error(error.message || 'Failed to fetch chats');
    } finally {
      set({ loading: false });
    }
  },

  selectChat: async (chat) => {
    try {
      set({ selectedChat: chat, loading: true, error: null });

      // Leave previous chat room if exists
      if (get().selectedChat) {
        socketService.leaveRoom(get().selectedChat._id);
      }

      // Join new chat room
      socketService.joinRoom(chat._id);

      // Fetch messages for the selected chat
      const response = await fetch(`http://localhost:3000/api/messages/${chat._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      set({ messages: data.messages, loading: false });
    } catch (error) {
      console.error('Error selecting chat:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to load chat messages');
    }
  },

  fetchMessages: async (chatId) => {
    try {
      set({ loading: true });
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch(`http://localhost:3000/api/chats/${chatId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch messages');
      }

      const data = await response.json();
      
      // Sort messages by timestamp (oldest first)
      const sortedMessages = data.sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      set({ messages: sortedMessages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      set({ error: error.message });
      toast.error(error.message || 'Failed to fetch messages');
    } finally {
      set({ loading: false });
    }
  },

  sendMessage: async (chatId, content, type = 'text') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch(`http://localhost:3000/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, type }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send message');
      }

      const message = await response.json();
      
      // Add message to the end of the list (newest at bottom)
      set(state => ({
        messages: [...state.messages, message],
      }));

      // Send message via socket
      const success = socketService.sendMessage({
        ...message,
        chat: get().selectedChat,
      });

      // If socket failed, show a warning but continue
      if (!success) {
        toast.warning('Message sent but real-time updates may be delayed');
      }

      // Update last message in chat list and reorder chats
      set(state => {
        const updatedChats = state.chats.map(chat => 
          chat._id === chatId 
            ? { ...chat, lastMessage: message }
            : chat
        );
        
        // Sort chats to bring the most recent to the top
        const sortedChats = updatedChats.sort((a, b) => {
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
        });
        
        return { chats: sortedChats };
      });

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      set({ error: error.message });
      toast.error(error.message || 'Failed to send message');
      throw error;
    }
  },

  createChat: async (participantId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch('http://localhost:3000/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ participantId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create chat');
      }

      const chat = await response.json();
      set(state => ({
        chats: [chat, ...state.chats],
        selectedChat: chat,
      }));

      return chat;
    } catch (error) {
      console.error('Error creating chat:', error);
      set({ error: error.message });
      toast.error(error.message || 'Failed to create chat');
      throw error;
    }
  },

  createGroupChat: async (name, participantIds) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch('http://localhost:3000/api/chats/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, participants: participantIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create group chat');
      }

      const chat = await response.json();
      set(state => ({
        chats: [chat, ...state.chats],
        selectedChat: chat,
      }));

      return chat;
    } catch (error) {
      console.error('Error creating group chat:', error);
      set({ error: error.message });
      toast.error(error.message || 'Failed to create group chat');
      throw error;
    }
  },

  handleNewMessage: (message) => {
    try {
      // Get user ID safely
      const userJson = localStorage.getItem('user');
      if (!userJson) {
        console.error('User data not found');
        return;
      }
      
      const user = JSON.parse(userJson);
      if (!user || !user.id) {
        console.error('Invalid user data');
        return;
      }
      
      const isCurrentChat = get().selectedChat?._id === message.chat._id;
      
      // Update messages if in the same chat
      if (isCurrentChat) {
        set(state => ({
          messages: [...state.messages, message],
        }));
        
        // Mark as read immediately if we're in the chat
        socketService.markMessagesAsRead(message.chat._id, user.id);
      } else {
        // Increment unread count for this chat
        set(state => ({
          unreadCounts: {
            ...state.unreadCounts,
            [message.chat._id]: (state.unreadCounts[message.chat._id] || 0) + 1
          }
        }));
        
        // Show notification for new message
        const sender = message.sender?.fullName || 'Someone';
        const content = message.type === 'image' ? '📷 Image' : message.content;
        toast(`${sender}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
      }

      // Update last message in chat list and reorder chats
      set(state => {
        const updatedChats = state.chats.map(chat => 
          chat._id === message.chat._id 
            ? { ...chat, lastMessage: message }
            : chat
        );
        
        // Sort chats to bring the most recent to the top
        const sortedChats = updatedChats.sort((a, b) => {
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
        });
        
        return { chats: sortedChats };
      });
    } catch (error) {
      console.error('Error handling new message:', error);
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
      console.error('Error marking messages as read:', error);
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

// Initialize socket listeners
export const initializeChatListeners = (userId) => {
  if (!userId) {
    console.error('Cannot initialize chat listeners: No user ID provided');
    return;
  }
  
  console.log('Initializing chat listeners for user:', userId);
  
  // Connect to socket server
  socketService.connect();
  
  // Set up message listener
  socketService.onMessageReceived((message) => {
    console.log('Message received:', message);
    useChatStore.getState().handleNewMessage(message);
  });

  // Set up typing listeners
  socketService.onTyping(({ chatId, userId }) => {
    useChatStore.getState().setTypingStatus(chatId, userId, true);
  });

  socketService.onStopTyping(({ chatId, userId }) => {
    useChatStore.getState().setTypingStatus(chatId, userId, false);
  });
  
  // Set up read receipt listener
  socketService.onMessagesRead(({ chatId }) => {
    console.log('Messages read in chat:', chatId);
    // Update read status of messages
    useChatStore.getState().fetchMessages(chatId);
  });
  
  // Set up user status listeners
  socketService.onUserOnline(({ userId }) => {
    console.log('User online:', userId);
    useChatStore.getState().updateUserStatus(userId, true, new Date());
  });
  
  socketService.onUserOffline(({ userId, lastSeen }) => {
    console.log('User offline:', userId);
    useChatStore.getState().updateUserStatus(userId, false, lastSeen);
  });
};