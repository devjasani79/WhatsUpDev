import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { validateSignup, validateSignin } from '../validators/authValidator.js';

const router = express.Router();
import dotenv from "dotenv";
dotenv.config({ path: "./.env" }); // Explicitly load .env


const secretKey = process.env.JWT_SECRET || 'fallback_secret';

// Sign up route
router.post('/signup', validateSignup, async (req, res) => {
  try {
    const { email, password, fullName, phoneNumber } = req.body;

    // Check if user already exists by email
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Check if user already exists by phone number - temporarily removed
    // const existingUserByPhone = await User.findOne({ phoneNumber });
    // if (existingUserByPhone) {
    //   return res.status(400).json({ message: 'User with this phone number already exists' });
    // }

    // Create new user
    const user = new User({
      email,
      phoneNumber,
      password,
      fullName
    });

    try {
      await user.save();
    } catch (saveError) {
      console.error('❌ [Auth] Error saving user:', saveError);
      
      // Check for MongoDB validation errors
      if (saveError.name === 'ValidationError') {
        // Extract the first validation error message
        const errorField = Object.keys(saveError.errors)[0];
        const errorMessage = saveError.errors[errorField].message;
        return res.status(400).json({ message: `Validation error: ${errorMessage}` });
      }
      
      // Check for MongoDB duplicate key error
      if (saveError.code === 11000) {
        return res.status(400).json({ message: 'Email is already in use. Please try another email.' });
      }
      
      return res.status(400).json({ message: 'Registration failed. Please try again.' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: "7d" }
    );
    
    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        status: user.status
      },
      token
    });
  } catch (error) {
    console.error('❌ [Auth] Signup error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Sign in route
router.post('/signin', validateSignin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: "7d" }
    );

    res.json({
      user: {
        id: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        status: user.status
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during signin' });
    console.error('❌ [Auth] Signin error:', error.message);
  }
});

export default router;