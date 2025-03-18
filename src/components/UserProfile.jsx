import React, { useState, useRef, useEffect } from 'react';
import { User, Camera, Edit, LogOut, Moon, Bell, X, Check, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

function UserProfile() {
  const { user, updateProfile, logout, theme, setTheme, notifications, setNotifications } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileData, setProfileData] = useState({
    fullName: '',
    status: 'Available',
    email: '',
    profilePicture: '',
  });
  const fileInputRef = useRef(null);

  // Update profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        status: user.status || 'Available',
        email: user.email || '',
        profilePicture: user.profilePicture || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
    setProfileError('');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setProfileError('Image size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({
          ...profileData,
          profilePicture: reader.result,
        });
        setProfileError('');
      };
      reader.onerror = () => {
        setProfileError('Failed to read image file');
      };
      reader.readAsDataURL(file);
    }
  };

  const validateProfileData = () => {
    if (!profileData.fullName.trim()) {
      setProfileError('Full name is required');
      return false;
    }
    
    if (!profileData.email.trim()) {
      setProfileError('Email is required');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      setProfileError('Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateProfileData()) {
      return;
    }
    
    try {
      // Only send fields that have changed
      const updates = {};
      if (profileData.fullName !== user.fullName) updates.fullName = profileData.fullName;
      if (profileData.status !== user.status) updates.status = profileData.status;
      if (profileData.email !== user.email) updates.email = profileData.email;
      if (profileData.profilePicture !== user.profilePicture) updates.profilePicture = profileData.profilePicture;

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        await updateProfile(updates);
        setIsEditing(false);
      } else {
      setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setProfileError(error.message || 'Failed to update profile');
    }
  };

  const handleLogout = () => {
    try {
      logout();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Apply dark mode class to html element
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Store theme preference
    localStorage.setItem('theme', newTheme);
  };

  const toggleNotifications = (type) => {
    setNotifications({
      ...notifications,
      [type]: !notifications[type],
    });
  };

  if (!user) {
    return (
      <div className="p-4 border-b flex items-center justify-center">
        <p className="text-gray-500">Loading user profile...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* User info section */}
      <div className="p-4 border-b flex items-center justify-between dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="relative">
            {profileData.profilePicture ? (
              <img
                src={profileData.profilePicture}
                alt={user.fullName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <User className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
            )}
            {user.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
            )}
          </div>
          <div>
            <h2 className="font-semibold dark:text-white">{user.fullName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.status || 'Available'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            title="Edit profile"
          >
            <Edit className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            title="Settings"
          >
            <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Edit profile modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Edit Profile</h2>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setProfileError('');
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              {profileError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <p>{profileError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    {profileData.profilePicture ? (
                      <img
                        src={profileData.profilePicture}
                        alt={profileData.fullName}
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                        <User className="h-12 w-12 text-green-600" />
            </div>
                    )}
            <button
                      type="button"
              onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 bg-green-500 p-2 rounded-full text-white"
            >
                      <Camera className="h-4 w-4" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
                      onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
                </div>

          <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={profileData.fullName}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <input
                    type="text"
                    name="status"
                    value={profileData.status}
                    onChange={handleChange}
                    placeholder="What's on your mind?"
                    maxLength={50}
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {50 - (profileData.status?.length || 0)} characters remaining
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setProfileError('');
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

      {/* Settings dropdown */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-4 top-20 bg-white dark:bg-gray-800 shadow-lg rounded-lg z-10 w-64 py-2"
          >
            <div className="px-4 py-2 border-b dark:border-gray-700">
              <h3 className="font-medium dark:text-white">Settings</h3>
            </div>
            
            <div className="p-2">
              <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer" onClick={toggleTheme}>
                <div className="flex items-center gap-3">
                  <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="dark:text-white">Dark Mode</span>
                </div>
                <div className={`w-10 h-5 rounded-full ${theme === 'dark' ? 'bg-green-500' : 'bg-gray-300'} relative`}>
                  <div className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${theme === 'dark' ? 'right-0.5' : 'left-0.5'}`}></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer" onClick={() => toggleNotifications('sound')}>
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="dark:text-white">Sound Notifications</span>
                </div>
                <div className={`w-10 h-5 rounded-full ${notifications.sound ? 'bg-green-500' : 'bg-gray-300'} relative`}>
                  <div className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${notifications.sound ? 'right-0.5' : 'left-0.5'}`}></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer" onClick={() => toggleNotifications('desktop')}>
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="dark:text-white">Desktop Notifications</span>
                </div>
                <div className={`w-10 h-5 rounded-full ${notifications.desktop ? 'bg-green-500' : 'bg-gray-300'} relative`}>
                  <div className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${notifications.desktop ? 'right-0.5' : 'left-0.5'}`}></div>
                </div>
              </div>
              
              <div className="border-t dark:border-gray-700 mt-2 pt-2">
          <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full p-2 text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-left"
          >
            <LogOut className="h-5 w-5" />
                  <span>Logout</span>
          </button>
        </div>
      </div>
    </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UserProfile;