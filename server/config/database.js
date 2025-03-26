import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Connect to MongoDB with error handling and retry logic
 * @returns {Promise} Resolves when connected successfully
 */
export const connectDatabase = async () => {
  const MAX_RETRIES = 3;
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb+srv://devjasani79:WhatsUpDev79@whatsupdev.3aphy.mongodb.net';
      
      await mongoose.connect(uri);
      
      console.log('🟢 [Database] Connected to MongoDB successfully');
      
      // Add event listeners for connection issues
      mongoose.connection.on('error', (err) => {
        console.error('❌ [Database] MongoDB connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ [Database] MongoDB disconnected');
      });
      
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('🔴 [Database] MongoDB connection closed due to app termination');
        process.exit(0);
      });
      
      return true;
    } catch (error) {
      retries++;
      console.error(`❌ [Database] Connection attempt ${retries}/${MAX_RETRIES} failed:`, error.message);
      
      if (retries >= MAX_RETRIES) {
        console.error('❌ [Database] Failed to connect to MongoDB after multiple attempts');
        throw error;
      }
      
      // Wait before trying again
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}; 