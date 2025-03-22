import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phoneNumber: {
    type: String,
    required: true,
    // unique: true, // Removed unique constraint temporarily
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  status: {
    type: String,
    default: 'Hey there! I am using WhatsupDev'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  contacts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Store imported contacts whether they are registered or not
  importedContacts: [{
    phoneNumber: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      default: null
    },
    isRegistered: {
      type: Boolean,
      default: false
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    inviteSent: {
      type: Boolean,
      default: false
    },
    synced: {
      type: Boolean,
      default: false
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now
    }
  }],
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light'
  },
  privacy: {
    lastSeen: {
      type: String,
      enum: ['everyone', 'contacts', 'nobody'],
      default: 'everyone'
    },
    profilePicture: {
      type: String,
      enum: ['everyone', 'contacts', 'nobody'],
      default: 'everyone'
    },
    status: {
      type: String,
      enum: ['everyone', 'contacts', 'nobody'],
      default: 'everyone'
    },
    readReceipts: {
      type: Boolean,
      default: true
    }
  },
  notifications: {
    sound: {
      type: Boolean,
      default: true
    },
    desktop: {
      type: Boolean,
      default: true
    },
    messagePreview: {
      type: Boolean,
      default: true
    }
  },
  contactSyncInfo: {
    lastSynced: {
      type: Date,
      default: null
    },
    totalSyncs: {
      type: Number,
      default: 0
    },
    lastSyncStatus: {
      type: String,
      enum: ['success', 'failed', 'partial', null],
      default: null
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get user's public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Method to check if user can chat with another user
userSchema.methods.canChatWith = function(userId) {
  return this.contacts.some(contactId => contactId.toString() === userId.toString());
};

// Method to check if a phone number is in contacts
userSchema.methods.isInContacts = function(phoneNumber) {
  return this.importedContacts.some(contact => 
    contact.phoneNumber === phoneNumber && contact.isRegistered
  );
};

const User = mongoose.model('User', userSchema);

export default User;