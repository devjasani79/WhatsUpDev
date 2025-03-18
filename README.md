# WhatsupDev - Real-time Chat Application

A modern, feature-rich chat application built with React, Node.js, and Socket.IO. This application provides real-time messaging capabilities with features like file sharing, voice messages, and user status updates.

## Features

- 🔐 User Authentication & Authorization
- 💬 Real-time Messaging
- 📱 Responsive Design
- 🌓 Dark/Light Mode
- 📸 Image & Video Sharing
- 🎤 Voice Messages
- 📄 File Attachments
- 👥 User Status (Online/Offline)
- ⏰ Message Timestamps
- 🔄 Message Read Status
- 🗑️ Message Unsend
- 🔍 User Search
- 👤 User Profiles

## Tech Stack

### Frontend
- React 18
- Vite
- TailwindCSS
- Zustand (State Management)
- Socket.IO Client
- Lucide React (Icons)
- Sonner (Toast Notifications)

### Backend
- Node.js
- Express
- MongoDB
- Socket.IO
- JWT Authentication
- Multer (File Uploads)

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/whatsupdev.git
cd whatsupdev
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
PORT=3000
```

4. Start the development server:
```bash
# Start backend server
npm run server

# Start frontend development server
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
whatsupdev/
├── src/
│   ├── components/     # React components
│   ├── services/      # API and socket services
│   ├── store/         # Zustand store
│   ├── pages/         # Page components
│   └── lib/           # Utility functions
├── server/
│   ├── routes/        # API routes
│   ├── models/        # MongoDB models
│   ├── middleware/    # Express middleware
│   └── uploads/       # File uploads
└── public/            # Static assets
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- POST `/api/auth/logout` - Logout user

### Users
- GET `/api/users` - Get all users
- GET `/api/users/:id` - Get user by ID
- PUT `/api/users/:id` - Update user profile

### Chats
- GET `/api/chats` - Get user's chats
- POST `/api/chats` - Create new chat
- GET `/api/chats/:id` - Get chat by ID

### Messages
- GET `/api/messages/:chatId` - Get chat messages
- POST `/api/messages` - Send message
- DELETE `/api/messages/:id` - Delete message

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [React](https://reactjs.org/)
- [Socket.IO](https://socket.io/)
- [TailwindCSS](https://tailwindcss.com/)
- [MongoDB](https://www.mongodb.com/) 