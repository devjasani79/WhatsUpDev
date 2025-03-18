import jwt from 'jsonwebtoken';
import User from './models/User.js';
import Message from './models/Message.js';

export const socketHandler = (io) => {
  // Socket.IO middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('User connected:', socket.user._id);

    // Join user's personal room
    socket.join(socket.user._id.toString());

    // Update user's online status
    User.findByIdAndUpdate(socket.user._id, { 
      isOnline: true,
      lastSeen: new Date()
    }).exec();

    socket.on('setup', (userId) => {
      socket.join(userId);
      socket.emit('connected');
    });

    socket.on('join chat', (chatId) => {
      socket.join(chatId);
      console.log('User joined chat:', chatId);
    });

    socket.on('leave chat', (chatId) => {
      socket.leave(chatId);
      console.log('User left chat:', chatId);
    });

    socket.on('new message', (message) => {
      const chat = message.chat;
      
      if (!chat.participants) return;

      chat.participants.forEach(participant => {
        if (participant._id === message.sender._id) return;
        socket.in(participant._id).emit('message received', message);
      });
    });

    socket.on('typing', ({ chatId, userId }) => {
      socket.in(chatId).emit('typing', { chatId, userId });
    });

    socket.on('stop typing', ({ chatId, userId }) => {
      socket.in(chatId).emit('stop typing', { chatId, userId });
    });

    socket.on('read messages', async ({ chatId, userId }) => {
      try {
        // Update messages as read
        await Message.updateMany(
          { 
            chat: chatId,
            sender: { $ne: userId },
            'readBy.user': { $ne: userId }
          },
          {
            $push: {
              readBy: {
                user: userId,
                readAt: new Date()
              }
            }
          }
        );

        // Notify other participants
        socket.in(chatId).emit('messages read', { chatId, userId });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    socket.on('message unsend', ({ messageId, chatId }) => {
      socket.in(chatId).emit('message unsent', { messageId });
    });

    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.user._id);
      
      // Update user's offline status and last seen
      await User.findByIdAndUpdate(socket.user._id, {
        isOnline: false,
        lastSeen: new Date()
      });

      socket.broadcast.emit('user offline', {
        userId: socket.user._id,
        lastSeen: new Date()
      });
    });
  });
}; 