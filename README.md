# WhatsUpDev Chat Application

A real-time chat application built with React, Node.js, Express, Socket.IO and MongoDB.

## Features

- Real-time messaging with Socket.IO
- User authentication and account management
- One-on-one and group chat functionality
- Multimedia message support (text, images, audio, video)
- Read receipts and typing indicators
- Message unsend functionality
- Online/offline status indicators
- Dark mode support
- vCard contact import functionality
- Google OAuth integration
- File upload support

## Technology Stack

- **Frontend**: React, Zustand (state management), TailwindCSS
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Real-time Communication**: Socket.IO
- **Authentication**: JWT, Google OAuth
- **File Handling**: Multer
- **Contact Import**: vCard parser

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB account or local MongoDB database
- Git
- Google OAuth credentials (for Google login)

### Installation

1. Clone the repository
   ```
   git clone https://github.com/devjasani79/WhatsUpDev.git
   cd WhatsUpDev
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   ```
   cp .env.example .env
   ```
   Then edit `.env` with your configuration details.

4. Start the development server
   ```
   npm run dev    # Start the client
   npm run server # Start the server (in a separate terminal)
   ```

## Project Structure

```
├── public/                # Static assets
├── server/                # Backend code
│   ├── config/            # Configuration files
│   ├── middleware/        # Express middleware
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── utils/             # Utility functions
│   ├── validators/        # Request validation
│   ├── index.js           # Server entry point
│   └── socket.js          # Socket.IO handlers
├── src/                   # Frontend code
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── pages/             # Page components
│   ├── services/          # API services
│   ├── store/             # Zustand stores
│   ├── types/             # TypeScript types
│   ├── App.jsx            # Main app component
│   ├── index.css          # Global styles
│   └── main.jsx           # App entry point
├── uploads/               # User uploaded files
└── package.json           # Dependencies and scripts
```

## Environment Variables

Required environment variables:

### Frontend (.env)
```
VITE_API_URL=https://whatsupdev79.onrender.com/api
VITE_SOCKET_URL=https://whatsupdev79.onrender.com
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### Backend (.env)
```
PORT=5002
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLIENT_URL=https://whats-up-dev.vercel.app
```

## Deployment

The application is deployed on:
- Frontend: Vercel (https://whats-up-dev.vercel.app)
- Backend: Render (https://whatsupdev79.onrender.com)

## Security Notes

- JWT tokens are used for authentication
- Passwords are hashed using bcrypt before storing
- CORS is configured to allow only specific origins
- Socket connections are authenticated using JWT
- Environment variables are properly managed
- Sensitive files are excluded from version control

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

- Dev Jasani

## Acknowledgments

- All third-party libraries and resources used in this project
- MongoDB Atlas for database hosting
- Vercel for frontend deployment
- Render for backend deployment
