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

## Technology Stack

- **Frontend**: React, Zustand (state management), TailwindCSS
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Real-time Communication**: Socket.IO
- **Authentication**: JWT

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB account or local MongoDB database
- Git

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/whatsupdev.git
   cd whatsupdev
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

See `.env.example` for required environment variables.

## Security Notes

- JWT tokens are used for authentication
- Passwords are hashed using bcrypt before storing
- CORS is configured to allow only specific origins
- Socket connections are authenticated using JWT

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

- Your Name

## Acknowledgments

- All third-party libraries and resources used in this project 

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

## Technology Stack

- **Frontend**: React, Zustand (state management), TailwindCSS
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Real-time Communication**: Socket.IO
- **Authentication**: JWT

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB account or local MongoDB database
- Git

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/whatsupdev.git
   cd whatsupdev
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

See `.env.example` for required environment variables.

## Security Notes

- JWT tokens are used for authentication
- Passwords are hashed using bcrypt before storing
- CORS is configured to allow only specific origins
- Socket connections are authenticated using JWT

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

- Your Name

## Acknowledgments

- All third-party libraries and resources used in this project 