import express from 'express';
import auth from '../middleware/auth.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

const router = express.Router();

// Get user's chats
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user.id
    })
    .populate('participants', '-password')
    .populate('lastMessage')
    .sort('-updatedAt');

    res.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ message: 'Server error while fetching chats' });
  }
});

// Create new chat
router.post('/', auth, async (req, res) => {
  try {
    const { participantId } = req.body;

    // Check if participant is in user's contacts
    const currentUser = await User.findById(req.user.id);
    
    // Ensure the participant is in the user's contacts list
    if (!currentUser.contacts.includes(participantId)) {
      return res.status(403).json({ 
        message: 'You can only chat with users from your contacts list',
        errorCode: 'NOT_IN_CONTACTS'
      });
    }

    // Check if chat already exists
    const existingChat = await Chat.findOne({
      isGroup: false,
      participants: { 
        $all: [req.user.id, participantId]
      }
    });

    if (existingChat) {
      await existingChat.populate('participants', '-password');
      return res.json(existingChat);
    }

    const chat = new Chat({
      participants: [req.user.id, participantId],
      isGroup: false
    });

    await chat.save();
    await chat.populate('participants', '-password');

    res.status(201).json(chat);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ message: 'Server error while creating chat' });
  }
});

// Get chat messages
router.get('/:chatId/messages', auth, async (req, res) => {
  try {
    const chatId = req.params.chatId;
    
    // Check if the user is a participant in this chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Verify the user is a participant in this chat
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ 
        message: 'You do not have permission to access these messages',
        errorCode: 'NOT_CHAT_PARTICIPANT'
      });
    }
    
    const messages = await Message.find({
      chat: chatId
    })
    .populate('sender', '-password')
    .sort('-createdAt');

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error while fetching messages' });
  }
});

// Send message
router.post('/:chatId/messages', auth, async (req, res) => {
  try {
    const { content, type = 'text' } = req.body;
    const chatId = req.params.chatId;
    
    // Check if the user is a participant in this chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Verify the user is a participant in this chat
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ 
        message: 'You do not have permission to send messages in this chat',
        errorCode: 'NOT_CHAT_PARTICIPANT'
      });
    }

    const message = new Message({
      chat: chatId,
      sender: req.user.id,
      content,
      type
    });

    await message.save();
    await message.populate('sender', '-password');

    // Update chat's last message and update timestamp
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
      updatedAt: new Date()
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error while sending message' });
  }
});

export default router;