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

  fetchChats: async () => {
    try {
      set({ loading: true });
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch('https://whatsupdev79.onrender.com/api/chats', {
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
      console.error('%c[Chat Store] Error fetching chats:', 'color: red', error);
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
      const response = await fetch(`https://whatsupdev79.onrender.com/api/messages/${chat._id}`, {
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
      console.error('%c[Chat Store] Error selecting chat:', 'color: red', error);
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
      
      const response = await fetch(`https://whatsupdev79.onrender.com/api/chats/${chatId}/messages`, {
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
      console.error('%c[Chat Store] Error fetching messages:', 'color: red', error);
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
      
      // For videos, handle them differently to avoid payload size issues
      if (type === 'video') {
        try {
          // Parse the video data (it should be a stringified object for videos)
          const videoData = JSON.parse(content);
          
          // Create a smaller payload for the server with just the thumbnail
          const serverPayload = {
            thumbnail: videoData.thumbnail,
            name: videoData.name,
            type: videoData.type,
            size: videoData.size
          };
          
          // Send the smaller payload to the server
          const response = await fetch(`https://whatsupdev79.onrender.com/api/chats/${chatId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ 
              content: JSON.stringify(serverPayload), 
              type 
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to send message');
          }

          const serverMessage = await response.json();
          
          // Create a local message that includes the blob URL for local playback
          const localMessage = {
            ...serverMessage,
            content: content, // Keep the original content with the URL for local playback
            isLocalVideo: true
          };
          
          // Add message to the local messages list
          set(state => ({
            messages: [...state.messages, localMessage],
          }));

          // Notify other clients about the message
          socketService.sendMessage({
            ...serverMessage,
            chat: get().selectedChat,
          });

          // Update chat list
          set(state => {
            const updatedChats = state.chats.map(chat => 
              chat._id === chatId 
                ? { ...chat, lastMessage: serverMessage }
                : chat
            );
            
            // Sort chats
            const sortedChats = updatedChats.sort((a, b) => {
              if (!a.lastMessage) return 1;
              if (!b.lastMessage) return -1;
              return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
            });
            
            return { chats: sortedChats };
          });

          return localMessage;
        } catch (error) {
          console.error('%c[Chat Store] Error handling video message:', 'color: red', error);
          throw new Error('Failed to process video message');
        }
      }
      
      // For regular messages (text, image, audio)
      const response = await fetch(`https://whatsupdev79.onrender.com/api/chats/${chatId}/messages`, {
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
      console.error('%c[Chat Store] Error sending message:', 'color: red', error);
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
      
      const response = await fetch('https://whatsupdev79.onrender.com/api/chats', {
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
      console.error('%c[Chat Store] Error creating chat:', 'color: red', error);
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
      
      const response = await fetch('https://whatsupdev79.onrender.com/api/chats/group', {
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
      console.error('%c[Chat Store] Error creating group chat:', 'color: red', error);
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
        console.error('%c[Chat Store] User data not found', 'color: red');
        return;
      }
      
      const user = JSON.parse(userJson);
      if (!user || !user.id) {
        console.error('%c[Chat Store] Invalid user data', 'color: red');
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
        const content = message.type === 'image' ? '📷 Image' : 
                        message.type === 'video' ? '🎥 Video' :
                        message.type === 'audio' ? '🎤 Voice message' : message.content;
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
      console.error('%c[Chat Store] Error handling new message:', 'color: red', error);
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

// Initialize socket listeners
export const initializeChatListeners = (userId) => {
  if (!userId) {
    console.error('%c[Chat Store] Cannot initialize chat listeners: No user ID provided', 'color: red');
    return;
  }
  
  console.log('%c[Chat Store] Initializing chat listeners for user:', 'color: blue', userId);
  
  // Connect to socket server
  socketService.connect();
  
  // Set up message listener
  socketService.onMessageReceived((message) => {
    console.log('%c[Chat Store] Message received:', 'color: green', message);
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
    console.log('%c[Chat Store] Messages read in chat:', 'color: green', chatId);
    // Update read status of messages
    useChatStore.getState().fetchMessages(chatId);
  });
  
  // Set up user status listeners
  socketService.onUserOnline(({ userId }) => {
    console.log('%c[Chat Store] User online:', 'color: green', userId);
    useChatStore.getState().updateUserStatus(userId, true, new Date());
  });
  
  socketService.onUserOffline(({ userId, lastSeen }) => {
    console.log('%c[Chat Store] User offline:', 'color: orange', userId);
    useChatStore.getState().updateUserStatus(userId, false, lastSeen);
  });
};