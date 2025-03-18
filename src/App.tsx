import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import Auth from './pages/Auth';
import Chat from './pages/Chat';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-green-600 text-white p-4">
          <div className="container mx-auto flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            <h1 className="text-xl font-bold">WhatsupDev</h1>
          </div>
        </nav>
        
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;