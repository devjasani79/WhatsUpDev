import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { auth } from '../middleware/auth.js';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm', 'audio/webm', 'audio/mp3', 'audio/mpeg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Handle file uploads
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    res.json({
      url: fileUrl,
      fileMetadata: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Failed to upload file' });
  }
});

// Delete a message
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.messageId,
      sender: req.user._id
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found or unauthorized' });
    }

    // If message has a file, delete it
    if (message.type !== 'text') {
      const filePath = message.content.split('/uploads/')[1];
      if (filePath) {
        const fullPath = path.join('uploads', filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    }

    await message.deleteOne();
    
    // Update last message in chat if this was the last message
    const chat = await Chat.findById(message.chat);
    if (chat && chat.lastMessage?.toString() === message._id.toString()) {
      const lastMessage = await Message.findOne({ chat: chat._id })
        .sort({ createdAt: -1 });
      
      chat.lastMessage = lastMessage?._id || null;
      await chat.save();
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Message delete error:', error);
    res.status(500).json({ message: 'Failed to delete message' });
  }
});

export default router; 