import React, { useState, useRef } from 'react';
import { Paperclip, Send, Mic, X } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { toast } from 'sonner';

const ChatInput = () => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const fileInputRef = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const { selectedChat, sendMessage } = useChatStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedChat) return;

    try {
      await sendMessage(selectedChat._id, message);
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    const fileType = file.type.split('/')[0];
    if (!['image', 'video', 'audio'].includes(fileType)) {
      toast.error('Only image, video, and audio files are supported');
      return;
    }

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target.result;
        const type = fileType === 'image' ? 'image' : 
                    fileType === 'video' ? 'video' : 'audio';
        
        await sendMessage(selectedChat._id, content, type);
      };
      reader.readAsDataURL(file);
      e.target.value = null;
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast.error('Failed to upload file');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async (event) => {
          await sendMessage(selectedChat._id, event.target.result, 'audio');
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingStartTime(Date.now());
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      setIsRecording(false);
      setRecordingStartTime(null);
    }
  };

  const getRecordingDuration = () => {
    if (!recordingStartTime) return '0:00';
    const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!selectedChat) {
    return (
      <div className="p-4 text-center text-gray-500">
        Select a chat to start messaging
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t dark:border-gray-700">
      <div className="flex items-center space-x-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,video/*,audio/*"
          className="hidden"
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-secondary p-2 rounded-full"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <div className="flex-1 relative">
          {isRecording ? (
            <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <div className="animate-pulse w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-red-600 dark:text-red-400">{getRecordingDuration()}</span>
              <button
                type="button"
                onClick={stopRecording}
                className="ml-auto text-red-600 dark:text-red-400 hover:text-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 focus:outline-none"
            />
          )}
        </div>

        {message.trim() ? (
          <button
            type="submit"
            className="btn btn-primary p-2 rounded-full"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            className="btn btn-secondary p-2 rounded-full"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </form>
  );
};

export default ChatInput; 