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

// Load env
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------------------------------------------------------------- */
/*                                   CORS                                     */
/* -------------------------------------------------------------------------- */

const allowedOrigins = [
  'https://whats-up-dev.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow server-to-server / Postman / curl
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// VERY IMPORTANT: handle preflight
app.options('*', cors());

/* -------------------------------------------------------------------------- */
/*                                MIDDLEWARE                                  */
/* -------------------------------------------------------------------------- */

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* -------------------------------------------------------------------------- */
/*                              STATIC FILES                                  */
/* -------------------------------------------------------------------------- */

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(
  '/uploads/avatars',
  express.static(path.join(process.cwd(), 'uploads', 'avatars'))
);

/* -------------------------------------------------------------------------- */
/*                                   ROUTES                                   */
/* -------------------------------------------------------------------------- */

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/contacts', contactRoutes);

/* -------------------------------------------------------------------------- */
/*                                 SOCKET.IO                                  */
/* -------------------------------------------------------------------------- */

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

socketHandler(io);

/* -------------------------------------------------------------------------- */
/*                              START SERVER                                  */
/* -------------------------------------------------------------------------- */

const startServer = async () => {
  try {
    await connectDatabase();

    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(
        `🌍 Client allowed: ${
          process.env.CLIENT_URL || 'https://whats-up-dev.vercel.app'
        }`
      );
    });
  } catch (error) {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  }
};

startServer();
