import express from 'express';
import { auth } from '../middleware/auth.js';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';

const router = express.Router();

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