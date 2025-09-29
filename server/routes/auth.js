import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PasswordReset from '../models/PasswordReset.js';
import { validateSignup, validateSignin } from '../validators/authValidator.js';
import nodemailer from 'nodemailer';

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

// ---------------- Password Reset ----------------

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOtpEmail = async (to, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>🔐 WhatsUpDev Password Reset</h2>
      <p>You requested to reset your password. Use the OTP below:</p>
      <h1 style="background-color: #f3f4f6; padding: 15px 30px; border-radius: 8px; display: inline-block;">
        ${otp}
      </h1>
      <p>This OTP is valid for <strong>10 minutes</strong>.</p>
      <p style="font-size: 12px; color: gray;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;
  await transporter.sendMail({
    from: process.env.FROM_EMAIL || `"WhatsUpDev" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your WhatsUpDev OTP',
    html,
  });
};

// Request Password Reset OTP
router.post('/request-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, msg: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, msg: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PasswordReset.deleteMany({ email });
    await PasswordReset.create({ email, otp, expiresAt });

    try {
      await sendOtpEmail(email, otp);
      return res.status(200).json({ success: true, msg: 'OTP sent to email' });
    } catch (emailErr) {
      console.error('Email send error:', emailErr);
      return res.status(500).json({ success: false, error: 'Failed to send OTP' });
    }
  } catch (err) {
    console.error('OTP request error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Verify OTP and Reset Password
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, msg: 'All fields are required' });
    }

    const record = await PasswordReset.findOne({ email });
    if (!record || record.otp !== otp || record.expiresAt < new Date()) {
      return res.status(400).json({ success: false, msg: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });
    await PasswordReset.deleteMany({ email });

    return res.status(200).json({ success: true, msg: 'Password reset successful' });
  } catch (err) {
    console.error('OTP verification error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});