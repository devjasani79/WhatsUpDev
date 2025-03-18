import express from 'express';
import { auth } from '../middleware/auth.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

const router = express.Router();

// Get user's chats
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id
    })
    .populate('participants', '-password')
    .populate('lastMessage')
    .sort('-updatedAt');

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new chat
router.post('/', auth, async (req, res) => {
  try {
    const { participantId } = req.body;

    // Check if chat already exists
    const existingChat = await Chat.findOne({
      isGroup: false,
      participants: { 
        $all: [req.user._id, participantId]
      }
    });

    if (existingChat) {
      return res.json(existingChat);
    }

    const chat = new Chat({
      participants: [req.user._id, participantId],
      isGroup: false
    });

    await chat.save();
    await chat.populate('participants', '-password');

    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get chat messages
router.get('/:chatId/messages', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      chat: req.params.chatId
    })
    .populate('sender', '-password')
    .sort('-createdAt');

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message
router.post('/:chatId/messages', auth, async (req, res) => {
  try {
    const { content, type = 'text' } = req.body;
    const chatId = req.params.chatId;

    const message = new Message({
      chat: chatId,
      sender: req.user._id,
      content,
      type
    });

    await message.save();
    await message.populate('sender', '-password');

    // Update chat's last message
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;