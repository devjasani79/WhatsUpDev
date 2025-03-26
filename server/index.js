import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import chatRoutes from './routes/chat.js';
import messageRoutes from './routes/messages.js';
import contactRoutes from './routes/contacts.js';
import { socketHandler } from './socket.js';
import { connectDatabase } from './config/database.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "https://whats-up-dev.vercel.app",
    methods: ["GET", "POST"]
  }
});

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());

// Increase JSON body size limit to 10MB for importing larger contact files
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(path.dirname(__dirname), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/contacts', contactRoutes);

// Socket.io setup
socketHandler(io);

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Start server
    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
      console.log(`🚀 [Server] Running on port ${PORT}`);
      console.log(`📱 [Client] Expected at ${process.env.CLIENT_URL || 'https://whats-up-dev.vercel.app'}`);
    });
  } catch (error) {
    console.error('❌ [Server] Failed to start:', error);
    process.exit(1);
  }
};

startServer();