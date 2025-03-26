import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { MessageSquare, LogOut, Menu, X, Users } from 'lucide-react';
import { Toaster } from 'sonner';
import Auth from './pages/Auth';
import Chat from './pages/Chat';
import Contacts from './pages/Contacts';
import PrivateRoute from './components/PrivateRoute';
import { useAuthStore } from './store/authStore';
import { useChatStore } from './store/chatStore';
import socketService from './services/socket';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const { user, isAuthenticated, checkAuth, logout, theme } = useAuthStore();
  const { initializeChatListeners, cleanupChatListeners } = useChatStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Check authentication status on app load
  useEffect(() => {
    checkAuth();
  }, []);

  // Initialize socket connection when user is authenticated
  useEffect(() => {
    if (user && isAuthenticated) {
      try {
        // Connect socket with token
        socketService.connect(user.token);
        
        // Initialize chat listeners
        const cleanup = initializeChatListeners(user.id);
        
        // Cleanup function
        return () => {
          cleanup();
          socketService.disconnect();
        };
      } catch (error) {
        console.error('Error initializing chat:', error);
      }
    }
  }, [user, isAuthenticated, initializeChatListeners]);

  // Apply dark mode
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleLogout = () => {
    socketService.disconnect();
    logout();
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <ErrorBoundary>
      <Router>
        <div className={`min-h-screen ${theme === 'dark' ? 'dark:bg-gray-900 dark:text-white' : 'bg-gray-100'}`}>
          <nav className={`bg-green-600 dark:bg-green-800 text-white p-4 shadow-md`}>
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isAuthenticated && (
                  <button
                    onClick={toggleSidebar}
                    className="lg:hidden mr-2 hover:bg-green-700 p-1.5 rounded-lg"
                  >
                    {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                  </button>
                )}
                <MessageSquare className="h-6 w-6" />
                <h1 className="text-xl font-bold">WhatsupDev</h1>
              </div>
              
              {isAuthenticated && (
                <div className="flex items-center gap-3">
                  <Link 
                    to="/"
                    className="flex items-center gap-1 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <MessageSquare className="h-5 w-5" />
                    <span className="hidden sm:inline">Chats</span>
                  </Link>
                  
                  <Link 
                    to="/contacts"
                    className="flex items-center gap-1 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Users className="h-5 w-5" />
                    <span className="hidden sm:inline">Contacts</span>
                  </Link>
                  
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-1 bg-green-700 hover:bg-green-800 dark:bg-green-900 dark:hover:bg-green-950 px-3 py-1.5 rounded-lg transition-colors ml-2"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </nav>
          
          <Routes>
            <Route path="/auth" element={
              isAuthenticated ? <Navigate to="/" /> : <Auth />
            } />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <div className="flex">
                    <Chat isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
                  </div>
                </PrivateRoute>
              }
            />
            <Route
              path="/contacts"
              element={
                <PrivateRoute>
                  <Contacts />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          
          {/* Toast notifications */}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              className: theme === 'dark' ? 'dark-toast' : '',
              style: {
                background: theme === 'dark' ? '#374151' : '#fff',
                color: theme === 'dark' ? '#fff' : '#333',
              },
            }}
          />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;