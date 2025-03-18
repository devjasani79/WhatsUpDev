import express from 'express';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Search users
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    const users = await User.find({
      $and: [
        {
          $or: [
            { email: { $regex: query, $options: 'i' } },
            { fullName: { $regex: query, $options: 'i' } }
          ]
        },
        { _id: { $ne: req.user._id } }
      ]
    }).select('-password');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.patch('/me', auth, async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['fullName', 'status', 'avatarUrl', 'email', 'theme', 'notifications'];
    
    // Filter out undefined values
    Object.keys(updates).forEach(key => 
      updates[key] === undefined && delete updates[key]
    );

    const isValidOperation = Object.keys(updates).every(
      update => allowedUpdates.includes(update)
    );

    if (!isValidOperation) {
      return res.status(400).json({ 
        message: 'Invalid updates', 
        allowedFields: allowedUpdates,
        receivedFields: Object.keys(updates)
      });
    }

    Object.assign(req.user, updates);
    await req.user.save();

    res.json({ user: req.user.getPublicProfile() });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Server error || couldnt update' });
  }
});

export default router;