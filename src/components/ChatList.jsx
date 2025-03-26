import React, { useState, useEffect } from 'react';
import { Search, Plus, Users, Pin, BellOff, Trash2, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { useChatStore } from '../store/chatStore';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';

function ChatList() {
  const { user } = useAuthStore();
  const { 
    chats, 
    selectedChat, 
    selectChat, 
    createChat, 
    createGroupChat, 
    fetchChats,
    unreadCounts
  } = useChatStore();
  const { searchUsers, searchResults } = useUserStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(null);
  const [filteredChats, setFilteredChats] = useState([]);
  const { theme } = useAuthStore();

  // Fetch chats on component mount
  useEffect(() => {
    fetchChats();
    // Set up interval to refresh chats every 30 seconds
    const interval = setInterval(() => {
      fetchChats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Filter chats when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredChats(chats);
    } else {
      const filtered = chats.filter(chat => {
        const otherUser = getOtherParticipant(chat);
        return otherUser?.fullName.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredChats(filtered);
    }
  }, [searchQuery, chats]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showContextMenu && !e.target.closest('.context-menu')) {
        setShowContextMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showContextMenu]);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length >= 2) {
      searchUsers(query);
    }
  };

  const handleCreateChat = async (userId) => {
    try {
      await createChat(userId);
      setShowSearch(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (groupName.trim() && selectedUsers.length > 0) {
      try {
      await createGroupChat(groupName, selectedUsers.map(u => u._id));
      setShowNewGroup(false);
      setSelectedUsers([]);
      setGroupName('');
      } catch (error) {
        console.error('Failed to create group chat:', error);
      }
    }
  };

  const toggleUserSelection = (user) => {
    if (selectedUsers.find(u => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter(u => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleContextMenu = (e, chat) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(chat._id);
  };

  const formatLastMessage = (chat) => {
    if (!chat.lastMessage) return 'No messages yet';
    
    if (chat.lastMessage.type === 'image') {
      return '📷 Image';
    }
    
    return chat.lastMessage.content.length > 30
      ? `${chat.lastMessage.content.substring(0, 30)}...`
      : chat.lastMessage.content;
  };

  const formatLastMessageTime = (chat) => {
    if (!chat.lastMessage) return '';
    
    const date = new Date(chat.lastMessage.createdAt);
    
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MM/dd/yyyy');
    }
  };

  const getOtherParticipant = (chat) => {
    return chat.participants.find(p => p._id !== user.id);
  };

  const getUnreadCount = (chatId) => {
    return unreadCounts[chatId] || 0;
  };

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : ''}`}>Chats</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowSearch(true);
                setShowNewGroup(false);
              }}
              className={`p-2 rounded-full ${
                theme === 'dark' 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              title="Search users"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                setShowNewGroup(true);
                setShowSearch(false);
              }}
              className={`p-2 rounded-full ${
                theme === 'dark' 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              title="Create group"
            >
              <Users className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search chats..."
            className={`w-full p-2 pl-10 rounded-lg focus:outline-none ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500'
                : 'bg-white border border-gray-300 focus:border-green-500'
            }`}
          />
          <Search className={`absolute left-3 top-2.5 h-5 w-5 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
          }`} />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-3 top-2.5 ${
                theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-4"
            >
              {searchQuery.length >= 2 && (
                <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                  {searchResults.length > 0 ? (
                    searchResults.map(user => (
                      <div
                          key={user._id}
                          className={`p-3 cursor-pointer flex items-center justify-between ${
                            theme === 'dark' 
                              ? 'hover:bg-gray-700 border-gray-700' 
                              : 'hover:bg-gray-50 border-gray-200'
                          }`}
                          onClick={() => handleCreateChat(user._id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center ${
                              theme === 'dark' ? 'bg-gray-600' : 'bg-green-100'
                            }`}>
                              {user.avatarUrl ? (
                                <img 
                                  src={user.avatarUrl} 
                                  alt={user.fullName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className={theme === 'dark' ? 'text-white' : 'text-green-800'}>
                                  {user.fullName[0].toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : ''}`}>
                                {user.fullName}
                              </p>
                              <p className={`text-sm ${
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                {user.email}
                              </p>
                            </div>
                          </div>
                          <Plus className={`h-5 w-5 ${
                            theme === 'dark' ? 'text-green-400' : 'text-green-500'
                          }`} />
                        </div>
                    ))
                  ) : (
                    <div className={`p-3 text-center ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      No users found
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {showNewGroup && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-4"
            >
              <div className="mb-4">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                  className="w-full p-2 border rounded-lg mb-2 focus:outline-none focus:border-green-500"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Search users to add..."
                  className="w-full p-2 border rounded-lg focus:outline-none focus:border-green-500"
                />
              </div>

              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedUsers.map(user => (
                    <div
                      key={user._id}
                      className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm flex items-center gap-1"
                    >
                      {user.fullName}
                      <button
                        onClick={() => toggleUserSelection(user)}
                        className="text-green-800 hover:text-green-900"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && (
                <div className="max-h-40 overflow-y-auto border rounded-lg divide-y mb-4">
                  {searchResults.length > 0 ? (
                    searchResults.map(user => (
                      <div
                          key={user._id}
                          className={`p-3 cursor-pointer flex items-center justify-between ${
                            theme === 'dark' 
                              ? 'hover:bg-gray-700 border-gray-700' 
                              : 'hover:bg-gray-50 border-gray-200'
                          }`}
                          onClick={() => toggleUserSelection(user)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ${
                              theme === 'dark' ? 'bg-gray-600' : 'bg-green-100'
                            }`}>
                              {user.avatarUrl ? (
                                <img 
                                  src={user.avatarUrl} 
                                  alt={user.fullName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className={theme === 'dark' ? 'text-white' : 'text-green-800'}>
                                  {user.fullName[0].toUpperCase()}
                                </span>
                              )}
                            </div>
                            <p className={`font-medium ${theme === 'dark' ? 'text-white' : ''}`}>
                              {user.fullName}
                            </p>
                          </div>
                          {selectedUsers.find(u => u._id === user._id) ? (
                            <Check className={`h-5 w-5 ${
                              theme === 'dark' ? 'text-green-400' : 'text-green-500'
                            }`} />
                          ) : (
                            <Plus className={`h-5 w-5 ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                            }`} />
                          )}
                        </div>
                    ))
                  ) : (
                    <div className={`p-3 text-center ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      No users found
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedUsers.length === 0}
                className="w-full p-2 bg-green-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Group
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredChats.length > 0 ? (
          filteredChats.map(chat => {
            const otherUser = getOtherParticipant(chat);
            const isSelected = selectedChat?._id === chat._id;
            const unreadCount = getUnreadCount(chat._id);
            
            return (
              <div
                key={chat._id}
                onClick={() => selectChat(chat)}
                onContextMenu={(e) => handleContextMenu(e, chat)}
                className={`p-3 border-b cursor-pointer relative ${
                  isSelected 
                    ? theme === 'dark'
                      ? 'bg-gray-700'
                      : 'bg-green-50'
                    : theme === 'dark'
                    ? 'hover:bg-gray-700'
                    : 'hover:bg-gray-50'
                } ${theme === 'dark' ? 'border-gray-700' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center ${
                      theme === 'dark' ? 'bg-gray-600' : 'bg-green-100'
                    }`}>
                      {otherUser?.avatarUrl ? (
                        <img
                          src={otherUser.avatarUrl}
                          alt={otherUser?.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className={theme === 'dark' ? 'text-white' : 'text-green-800'}>
                          {otherUser?.fullName[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    {otherUser?.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className={`font-medium truncate ${theme === 'dark' ? 'text-white' : ''}`}>
                        {otherUser?.fullName}
                      </h3>
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatLastMessageTime(chat)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center mt-1">
                      <p className={`text-sm truncate ${
                        theme === 'dark' 
                          ? unreadCount > 0 ? 'text-white' : 'text-gray-400'
                          : unreadCount > 0 ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {formatLastMessage(chat)}
                      </p>
                      
                      {unreadCount > 0 && (
                        <div className="bg-green-500 text-white text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                          {unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {showContextMenu === chat._id && (
                  <div className={`absolute right-3 top-16 z-10 w-48 py-1 rounded-lg shadow-lg context-menu ${
                    theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'
                  }`}>
                    <button className={`w-full text-left px-4 py-2 flex items-center gap-2 ${
                      theme === 'dark' ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-50 text-gray-700'
                    }`}>
                      <Pin className="h-4 w-4" />
                      {chat.isPinned ? 'Unpin chat' : 'Pin chat'}
                    </button>
                    <button className={`w-full text-left px-4 py-2 flex items-center gap-2 ${
                      theme === 'dark' ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-50 text-gray-700'
                    }`}>
                      <BellOff className="h-4 w-4" />
                      {chat.isMuted ? 'Unmute chat' : 'Mute chat'}
                    </button>
                    <button className={`w-full text-left px-4 py-2 flex items-center gap-2 ${
                      theme === 'dark' ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-50 text-red-600'
                    }`}>
                      <Trash2 className="h-4 w-4" />
                      Delete chat
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className={`p-4 text-center ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {searchQuery ? 'No chats found' : 'No chats yet'}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatList;