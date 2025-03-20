import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Send, Image, Video, File, Mic, X, AlertCircle, Play, Pause, ArrowDown, Trash2, Clock, Download } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { socketService } from '../services/socket';
import { format } from 'date-fns';
import { toast } from 'sonner';

function ChatMessages() {
  const { user } = useAuthStore();
  const { theme } = useAuthStore();
  const { selectedChat, messages, sendMessage, fetchMessages, typingUsers, markMessagesAsRead } = useChatStore();
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [attachmentType, setAttachmentType] = useState(null);
  const [showMessageActions, setShowMessageActions] = useState(null);
  const [autoDeleteTime, setAutoDeleteTime] = useState(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastMessageRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [lastTapTime, setLastTapTime] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat._id);
      markMessagesAsRead(selectedChat._id);
    }
  }, [selectedChat]);

  useEffect(() => {
    if (messages.length > 0) {
    scrollToBottom();
    }
  }, [messages]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setShowScrollButton(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTyping = useCallback(() => {
    if (!isTyping && selectedChat) {
      setIsTyping(true);
      socketService.typing(selectedChat._id, user.id);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (selectedChat) {
      socketService.stopTyping(selectedChat._id, user.id);
      }
    }, 3000);
  }, [isTyping, selectedChat, user]);

  const handleMessageChange = (e) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      await sendMessage(selectedChat._id, newMessage);
      setNewMessage('');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        setIsTyping(false);
        socketService.stopTyping(selectedChat._id, user.id);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleFileUpload = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size should be less than 50MB');
        return;
      }

      // Determine file type
      let messageType;
      if (file.type.startsWith('image/')) {
        messageType = 'image';
      } else if (file.type.startsWith('video/')) {
        messageType = 'video';
        
        // For videos, create a temporary message with a loading state
        const tempId = `temp-${Date.now()}`;
        const tempMessage = {
          _id: tempId,
          sender: { _id: user.id },
          content: 'Processing video...',
          type: 'text',
          chat: selectedChat._id,
          createdAt: new Date().toISOString(),
          isLoading: true
        };
        
        // Add temporary message to the chat
        useChatStore.getState().addTempMessage(tempMessage);
        
        try {
          // Create smaller thumbnail from the video
          const thumbnailUrl = await createVideoThumbnail(file);
          
          // Create a special video message that includes the file name but not the full content
          const videoData = {
            name: file.name,
            type: file.type,
            size: file.size,
            thumbnail: thumbnailUrl,
            url: URL.createObjectURL(file) // Temporary URL for preview
          };
          
          // Send the metadata as the message
          const sentMessage = await sendMessage(
            selectedChat._id, 
            JSON.stringify(videoData), 
            'video'
          );
          
          // Remove the temporary message
          useChatStore.getState().removeTempMessage(tempId);
          
          toast.success('Video sent successfully');
          return;
        } catch (error) {
          // Remove the temporary message on error
          useChatStore.getState().removeTempMessage(tempId);
          toast.error(error.message || 'Failed to send video');
          return;
        }
      } else if (file.type.startsWith('audio/')) {
        messageType = 'audio';
      } else {
        toast.error('Only images, videos, and audio files are supported');
        return;
      }

      // For images and audio, use the existing data URL approach
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const dataUrl = event.target.result;
          await sendMessage(selectedChat._id, dataUrl, messageType);
          toast.success('File sent successfully');
        } catch (error) {
          console.error('Failed to send file:', error);
          toast.error(error.message || 'Failed to send file');
        }
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to process file:', error);
      toast.error(error.message || 'Failed to process file');
    }
  };

  // Helper function to create a video thumbnail
  const createVideoThumbnail = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        // Seek to a frame at 25% of the video
        video.currentTime = Math.min(video.duration * 0.25, 1.0);
      };
      
      video.onseeked = () => {
        try {
          // Create a canvas and draw the video frame
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Get the thumbnail as a data URL (JPEG, low quality)
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.5);
          URL.revokeObjectURL(video.src);
          resolve(thumbnailUrl);
        } catch (e) {
          reject(e);
        }
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video for thumbnail creation'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const handleRecordingTap = () => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    
    if (tapLength < 300 && isRecording) { // Double tap detected while recording
      stopRecording();
    } else if (!isRecording) { // Start recording on first tap
      startRecording();
    }
    
    setLastTapTime(currentTime);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      const options = { mimeType: 'audio/webm;codecs=opus' };
      const mediaRecorder = new MediaRecorder(stream, options);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
          
          // Convert blob to data URL
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const audioDataUrl = event.target.result;
              await sendMessage(selectedChat._id, audioDataUrl, 'audio');
              toast.success('Voice message sent');
            } catch (error) {
              console.error('Failed to send voice message:', error);
              toast.error(error.message || 'Failed to send voice message');
            }
          };
          reader.onerror = () => {
            toast.error('Failed to process audio recording');
          };
          reader.readAsDataURL(audioBlob);
        } catch (error) {
          console.error('Failed to process audio:', error);
          toast.error(error.message || 'Failed to send voice message');
        }
      };

      mediaRecorder.start(1000); // Record in 1-second chunks
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      setRecordingStartTime(Date.now());

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Automatically stop recording after 1 minute
      setTimeout(() => {
        if (isRecording) {
          stopRecording();
          toast.info('Recording stopped: Maximum duration reached (1 minute)');
        }
      }, 60000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Only stop if we've been recording for at least 1 second
      const recordingDuration = Date.now() - recordingStartTime;
      if (recordingDuration < 1000) {
        toast.error('Recording too short. Hold longer to record.');
        resetRecording();
        return;
      }

      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      clearInterval(recordingIntervalRef.current);
      setIsRecording(false);
      setRecordingTime(0);
      setRecordingStartTime(null);
    }
  };

  const resetRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    clearInterval(recordingIntervalRef.current);
    setIsRecording(false);
    setRecordingTime(0);
    setRecordingStartTime(null);
  };

  const formatMessageDate = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return format(messageDate, 'MMM d, yyyy');
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatMessageDate(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  // Add the renderMessageContent function
  const renderMessageContent = (message) => {
    switch (message.type) {
      case 'image':
        return (
          <div className="relative group">
            <div className="absolute top-2 left-2 w-5 h-5 text-white z-10">
              <Image className="w-full h-full" />
            </div>
            <img 
              src={message.content} 
              alt="Shared image" 
              className="max-w-sm rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              loading="lazy"
              onClick={() => window.open(message.content, '_blank')}
            />
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <a 
                href={message.content} 
                download 
                className="bg-black/50 p-2 rounded-full text-white hover:bg-black/70"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          </div>
        );
      case 'video':
        try {
          // Handle loading state
          if (message.isLoading) {
            return (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent"></div>
                <span>Processing video...</span>
              </div>
            );
          }
          
          // Try parsing the content if it's in JSON format (new format)
          let videoData;
          let isBlob = false;
          
          try {
            videoData = JSON.parse(message.content);
            
            // Check if it has a URL property (local playback)
            if (videoData.url && videoData.url.startsWith('blob:')) {
              isBlob = true;
            }
          } catch (e) {
            // Not JSON, must be a direct URL (old format)
            videoData = { url: message.content };
          }
          
          return (
            <div className="relative group flex flex-col">
              <div className="absolute top-2 left-2 w-5 h-5 text-white z-10">
                <Video className="w-full h-full" />
              </div>
              
              {/* Display thumbnail if available */}
              {videoData.thumbnail && !isBlob && (
                <div className="relative cursor-pointer" 
                     onClick={() => window.open(videoData.url || message.content, '_blank')}>
                  <img 
                    src={videoData.thumbnail} 
                    alt="Video thumbnail" 
                    className="max-w-sm rounded-lg shadow-md hover:shadow-lg transition-shadow"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/50 rounded-full p-3">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Show video player for blob URLs (local) or if no thumbnail */}
              {(isBlob || !videoData.thumbnail) && (
                <video 
                  src={videoData.url || message.content} 
                  controls
                  preload="metadata"
                  className="max-w-sm rounded-lg shadow-md"
                  playsInline
                >
                  Your browser does not support the video tag.
                </video>
              )}
              
              {/* Show file name if available */}
              {videoData.name && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                  <Video className="w-3 h-3 mr-1" />
                  <span>{videoData.name}</span>
                  {videoData.size && (
                    <span className="ml-1">({Math.round(videoData.size / 1024 / 1024 * 10) / 10} MB)</span>
                  )}
                </div>
              )}
              
              {/* Download button for local videos */}
              {isBlob && (
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a 
                    href={videoData.url} 
                    download={videoData.name || "video"} 
                    className="bg-black/50 p-2 rounded-full text-white hover:bg-black/70"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          );
        } catch (error) {
          console.error('Error rendering video:', error);
          return (
            <div className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 p-2 rounded-lg flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              <span>Error displaying video</span>
            </div>
          );
        }
      case 'audio':
        return (
          <div className="relative flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-2 min-w-[200px]">
            <Mic className="w-5 h-5 text-gray-500" />
            <audio 
              src={message.content} 
              controls
              className="max-w-full"
            ></audio>
            <a 
              href={message.content} 
              download 
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        );
      case 'file':
        return (
          <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
            <File className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {message.content.split('/').pop()}
            </span>
            <a 
              href={message.content} 
              download 
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
            >
              <Download className="w-4 h-4 text-gray-500" />
            </a>
          </div>
        );
      default:
        return (
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        );
    }
  };

  const handleUnsendMessage = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:3000/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to unsend message');
      }

      // Remove message from local state
      const updatedMessages = messages.filter(msg => msg._id !== messageId);
      // Update messages in store
      useChatStore.setState({ messages: updatedMessages });
      
      // Use the new socket method for real-time unsend
      socketService.unsendMessage(messageId, selectedChat._id);
      
      toast.success('Message unsent');
    } catch (error) {
      console.error('Failed to unsend message:', error);
      toast.error(error.message || 'Failed to unsend message');
    }
    setShowMessageActions(null);
  };

  if (!selectedChat) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-600">Welcome to WhatsupDev</h2>
          <p className="text-gray-500 mt-2">Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  const otherUser = selectedChat.participants.find(p => p._id !== user.id);
  const isOtherUserTyping = typingUsers.get(otherUser?._id) === selectedChat._id;

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white'}`}>
      <div className={`p-4 border-b flex items-center gap-3 ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'bg-white border-gray-200'}`}>
        <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center ${theme === 'dark' ? 'bg-gray-600' : 'bg-green-100'}`}>
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
        <div>
          <h2 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {otherUser?.fullName}
          </h2>
          {isOtherUserTyping ? (
            <p className="text-sm text-green-500">typing...</p>
          ) : (
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
              {otherUser?.isOnline ? 'Online' : otherUser?.lastSeen ? `Last seen ${format(new Date(otherUser.lastSeen), 'h:mm a')}` : 'Offline'}
            </p>
          )}
        </div>
      </div>

      <div 
        ref={messagesContainerRef} 
        className={`flex-1 overflow-y-auto p-4 space-y-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}
        onScroll={handleScroll}
      >
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date} className="space-y-4">
            <div className="flex justify-center">
              <div className={`${
                theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
              } text-xs px-3 py-1 rounded-full`}>
                {date}
              </div>
            </div>
            
            {dateMessages.map((message, index) => {
          const isOwnMessage = message.sender._id === user.id;
              const isLastMessage = index === dateMessages.length - 1 && 
                                   date === Object.keys(groupedMessages)[Object.keys(groupedMessages).length - 1];
              
          return (
            <div
              key={message._id}
                  ref={isLastMessage ? messagesEndRef : null}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} items-end gap-2`}
                  onMouseEnter={() => isOwnMessage && setShowMessageActions(message._id)}
                  onMouseLeave={() => setShowMessageActions(null)}
                >
                  {!isOwnMessage && (
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      {message.sender.avatarUrl ? (
                        <img 
                          src={message.sender.avatarUrl} 
                          alt={message.sender.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-green-100 text-green-800'}`}>
                          {message.sender.fullName[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="relative max-w-[90%]">
              <div
                className={`max-w-[90%] rounded-lg p-3 ${
                  isOwnMessage
                    ? 'bg-green-500 text-white rounded-br-none'
                          : theme === 'dark'
                            ? 'bg-gray-700 text-white rounded-bl-none'
                            : 'bg-white text-gray-900 border rounded-bl-none'
                      }`}
                    >
                      {renderMessageContent(message)}
                      <div
                        className={`text-xs mt-1 flex justify-between items-center gap-2 ${
                          isOwnMessage ? 'text-green-100' : theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{format(new Date(message.createdAt), 'h:mm a')}</span>
                          {message.autoDelete && (
                            <Clock className="h-3 w-3" title="Auto-delete enabled" />
                          )}
                        </div>
                        {isOwnMessage && (
                          <span>{message.readBy?.length > 0 ? '✓✓' : '✓'}</span>
                        )}
                </div>
                    </div>

                    {/* Message actions */}
                    {showMessageActions === message._id && isOwnMessage && (
                      <div className={`
                        absolute top-0 right-full mr-2 flex items-center gap-1
                        ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
                      `}>
                        <button
                          onClick={() => handleUnsendMessage(message._id)}
                          className="p-1 hover:bg-red-500 hover:text-white rounded-full transition-colors"
                          title="Unsend message"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
              </div>
            </div>
          );
        })}
          </div>
        ))}
      </div>

      {showScrollButton && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-20 right-6 bg-green-500 text-white p-2 rounded-full shadow-lg"
        >
          <ArrowDown size={20} />
        </button>
      )}

      <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={handleMessageChange}
              placeholder="Type a message..."
              className={`w-full p-3 rounded-lg resize-none ${
                theme === 'dark' 
                  ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600' 
                  : 'bg-gray-100 text-gray-900 border-gray-200'
              } border focus:outline-none focus:ring-2 focus:ring-green-500`}
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              <button
                onClick={() => {
                  setAttachmentType('image');
                  fileInputRef.current?.click();
                }}
                className={`p-1.5 rounded-full transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-gray-600 text-gray-300' 
                    : 'hover:bg-gray-200 text-gray-500'
                }`}
                title="Send image"
              >
                <Image className="h-5 w-5" />
              </button>
          <button
                onClick={() => {
                  setAttachmentType('video');
                  fileInputRef.current?.click();
                }}
                className={`p-1.5 rounded-full transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-gray-600 text-gray-300' 
                    : 'hover:bg-gray-200 text-gray-500'
                }`}
                title="Send video"
              >
                <Video className="h-5 w-5" />
          </button>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept={
              attachmentType === 'image' ? 'image/*' :
              attachmentType === 'video' ? 'video/*' :
              attachmentType === 'audio' ? 'audio/webm,audio/mp3' : ''
            }
            className="hidden"
          />

          <button
            onClick={handleRecordingTap}
            className={`p-3 rounded-full ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
            title={isRecording ? "Double-tap to stop recording" : "Tap to start recording"}
          >
            <Mic className="h-5 w-5" />
          </button>

          <button
            onClick={handleSend}
            disabled={!newMessage.trim() && !isRecording}
            className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        {isRecording && (
          <div className="mt-2 flex items-center gap-2 text-red-500">
            <span className="animate-pulse">●</span>
            <span>Recording: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessages;