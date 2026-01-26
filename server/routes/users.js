import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Avatar upload storage
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
const dir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const avatarFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Invalid avatar file type'));
};

const uploadAvatar = multer({ storage: avatarStorage, fileFilter: avatarFilter, limits: { fileSize: 5 * 1024 * 1024 } });

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
        { _id: { $ne: req.userId } }
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
    const user = await User.findById(req.userId).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.patch('/me', auth, async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['fullName', 'status', 'profilePicture', 'email', 'theme', 'notifications'];
    
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

    // Apply updates to user object
    Object.keys(updates).forEach(update => {
      req.user[update] = updates[update];
    });
    
    await req.user.save();

    res.json({ user: req.user.getPublicProfile() });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Upload avatar and persist on user
router.post('/me/avatar', auth, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No avatar uploaded' });
    }

    const publicUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`;
    req.user.profilePicture = publicUrl;
    await req.user.save();
    res.json({ user: req.user.getPublicProfile(), avatarUrl: publicUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
