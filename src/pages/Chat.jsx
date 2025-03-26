import React, { useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import ChatList from '../components/ChatList';
import ChatMessages from '../components/ChatMessages';
import UserProfile from '../components/UserProfile';
import { socketService } from '../services/socket';

function Chat({ isSidebarOpen, toggleSidebar }) {
  const { user } = useAuthStore();
  const { fetchChats } = useChatStore();
  const { theme } = useAuthStore();

  useEffect(() => {
    // Fetch chats when component mounts
    fetchChats();

    // Set up polling for real-time updates (backup for socket)
    const interval = setInterval(() => {
      if (!socketService.isConnected()) {
        fetchChats();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`container mx-auto h-[calc(100vh-4rem)] p-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 h-full gap-4 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`
            lg:col-span-1
            fixed lg:relative inset-y-0 left-0 z-30
            w-[320px] lg:w-full h-full
            transform lg:transform-none transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
            rounded-lg shadow-lg overflow-hidden flex flex-col
            border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
          `}
        >
          <UserProfile />
          <div className="flex-1 overflow-hidden">
            <ChatList />
          </div>
        </div>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden backdrop-blur-sm"
            onClick={toggleSidebar}
          />
        )}

        {/* Main chat area */}
        <div 
          className={`
            lg:col-span-2 h-full rounded-lg shadow-lg overflow-hidden
            ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
            border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
          `}
        >
          <ChatMessages />
        </div>
      </div>
    </div>
  );
}

export default Chat;