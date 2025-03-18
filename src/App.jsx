import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MessageSquare, LogOut, Menu, X } from 'lucide-react';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';
import { initializeChatListeners } from './store/chatStore';
import { socketService } from './services/socket';

// Lazy load components
const Auth = lazy(() => import('./pages/Auth'));
const Chat = lazy(() => import('./pages/Chat'));
const PrivateRoute = lazy(() => import('./components/PrivateRoute'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
  </div>
);

function App() {
  const { user, isAuthenticated, checkAuth, logout, theme } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Check authentication status on app load
  useEffect(() => {
    checkAuth();
  }, []);

  // Initialize socket connection when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize socket connection and listeners
      initializeChatListeners(user.id);
      
      // Cleanup socket connection on unmount
      return () => {
        socketService.disconnect();
      };
    }
  }, [isAuthenticated, user]);

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
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 bg-green-700 hover:bg-green-800 dark:bg-green-900 dark:hover:bg-green-950 px-3 py-1.5 rounded-lg transition-colors"
              >
                <span>Logout</span>
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </nav>
        
        <Suspense fallback={<LoadingSpinner />}>
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
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
        
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
  );
}

export default App;