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
    const { email, password, fullName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      fullName
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: "7d" }
    );
    

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        status: user.status
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during signup' });
    console.error('❌ [Auth] Signup error:', error.message);
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