import express from 'express';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Helper function to normalize phone numbers (remove formatting)
const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;
  // Remove all non-digit characters including + sign
  return phoneNumber.replace(/\D/g, '');
};

// Import contacts
router.post('/import', auth, async (req, res) => {
  try {
    const { contacts } = req.body;
    
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ message: 'Invalid contacts format. Expected non-empty array.' });
    }

    // Get the current user
    const currentUser = req.user;
    
    // Process each contact
    const processedContacts = [];
    const newImportedContacts = [];
    const updatedContacts = [];
    const newRegisteredContacts = [];

    for (const contact of contacts) {
      // Validate contact data
      if (!contact.name || !contact.phoneNumber) {
        continue; // Skip invalid contacts
      }

      // Normalize phone number
      const normalizedPhoneNumber = normalizePhoneNumber(contact.phoneNumber);
      
      // First check if user is registered by checking the phone number
      let registeredUser = await User.findOne({ 
        phoneNumber: { $regex: normalizedPhoneNumber, $options: 'i' }
      });
      
      // If not found by phone, check by email if available
      if (!registeredUser && contact.email) {
        registeredUser = await User.findOne({ email: contact.email.toLowerCase() });
      }
      
      // Create contact object
      const contactData = {
        name: contact.name,
        phoneNumber: normalizedPhoneNumber, // Store the normalized version
        email: contact.email || null,
        isRegistered: registeredUser ? true : false,
        userId: registeredUser ? registeredUser._id : null,
        inviteSent: false,
        synced: true // Mark as synced to database
      };

      // Check if contact is already imported - use normalized numbers for comparison
      const existingContactIndex = currentUser.importedContacts.findIndex(
        c => normalizePhoneNumber(c.phoneNumber) === normalizedPhoneNumber ||
             (c.email && contact.email && c.email.toLowerCase() === contact.email.toLowerCase())
      );

      if (existingContactIndex !== -1) {
        // Update existing contact
        const existingContact = currentUser.importedContacts[existingContactIndex];
        currentUser.importedContacts[existingContactIndex] = {
          ...existingContact,
          ...contactData,
          // Preserve inviteSent status if it was already true
          inviteSent: existingContact.inviteSent || contactData.inviteSent
        };
        updatedContacts.push(contactData);
      } else {
        // Add new contact
        newImportedContacts.push(contactData);
      }

      processedContacts.push(contactData);

      // If user is registered, add to contacts list if not already there
      if (registeredUser) {
        // Convert to string for comparison
        const registeredUserId = registeredUser._id.toString();
        const contactExists = currentUser.contacts.some(id => id.toString() === registeredUserId);
        
        if (!contactExists) {
          currentUser.contacts.push(registeredUser._id);
          newRegisteredContacts.push(registeredUser._id);
        }
      }
    }

    // Add new contacts to imported contacts
    currentUser.importedContacts.push(...newImportedContacts);
    
    // Save the updated user
    await currentUser.save();

    res.status(200).json({ 
      message: 'Contacts imported successfully', 
      totalContacts: processedContacts.length,
      newContacts: newImportedContacts.length,
      updatedContacts: updatedContacts.length,
      registeredContacts: processedContacts.filter(c => c.isRegistered).length,
      newRegisteredContacts: newRegisteredContacts.length
    });
  } catch (error) {
    console.error('Contact import error:', error);
    res.status(500).json({ message: 'Server error during contact import' });
  }
});

// Get all imported contacts
router.get('/imported', auth, async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    res.status(200).json({ 
      importedContacts: req.user.importedContacts 
    });
  } catch (error) {
    console.error('Get imported contacts error:', error);
    res.status(500).json({ message: 'Server error fetching imported contacts' });
  }
});

// Get registered contacts (those who are already using the app)
router.get('/registered', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('contacts', '_id email fullName phoneNumber profilePicture status lastSeen isOnline');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ 
      contacts: user.contacts
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ message: 'Server error fetching registered contacts' });
  }
});

// Send invite to a contact
router.post('/invite', auth, async (req, res) => {
  try {
    const { contactPhoneNumber } = req.body;
    
    if (!contactPhoneNumber) {
      return res.status(400).json({ message: 'Contact phone number is required' });
    }

    const normalizedPhoneNumber = normalizePhoneNumber(contactPhoneNumber);
    
    // Find the contact in imported contacts
    const contactIndex = req.user.importedContacts.findIndex(
      contact => normalizePhoneNumber(contact.phoneNumber) === normalizedPhoneNumber
    );

    if (contactIndex === -1) {
      return res.status(404).json({ message: 'Contact not found in your imported contacts' });
    }

    // Check if the contact is already registered
    if (req.user.importedContacts[contactIndex].isRegistered) {
      return res.status(400).json({ message: 'This contact is already registered on WhatsupDev' });
    }

    // Mark invite as sent
    req.user.importedContacts[contactIndex].inviteSent = true;
    await req.user.save();

    // In a real app, you would send an SMS invitation here
    // This would involve integrating with a service like Twilio, MessageBird, etc.

    res.status(200).json({ 
      message: 'Invitation sent successfully',
      contact: req.user.importedContacts[contactIndex]
    });
  } catch (error) {
    console.error('Send invite error:', error);
    res.status(500).json({ message: 'Server error during invite sending' });
  }
});

// Add a single contact manually
router.post('/add', auth, async (req, res) => {
  try {
    const { name, phoneNumber, email } = req.body;

    // Validate required fields
    if (!name || !phoneNumber) {
      return res.status(400).json({ message: 'Name and phone number are required' });
    }

    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    
    // Check if contact already exists
    const existingContactIndex = req.user.importedContacts.findIndex(
      contact => normalizePhoneNumber(contact.phoneNumber) === normalizedPhoneNumber || 
                (contact.email && email && contact.email.toLowerCase() === email.toLowerCase())
    );

    // Check if this contact is already registered in the app by phone
    let registeredUser = await User.findOne({ 
      phoneNumber: { $regex: normalizedPhoneNumber, $options: 'i' }
    });
    
    // If not found by phone, check by email if available
    if (!registeredUser && email) {
      registeredUser = await User.findOne({ email: email.toLowerCase() });
    }
    
    // Create contact object
    const contactData = {
      name,
      phoneNumber: normalizedPhoneNumber,
      email: email || null,
      isRegistered: registeredUser ? true : false,
      userId: registeredUser ? registeredUser._id : null,
      inviteSent: false,
      synced: true
    };

    if (existingContactIndex !== -1) {
      // Update existing contact
      req.user.importedContacts[existingContactIndex] = {
        ...req.user.importedContacts[existingContactIndex],
        ...contactData,
        // Preserve inviteSent status if it was already true
        inviteSent: req.user.importedContacts[existingContactIndex].inviteSent || false
      };
    } else {
      // Add new contact
      req.user.importedContacts.push(contactData);
    }

    // If user is registered, add to contacts list if not already there
    if (registeredUser) {
      // Convert to string for comparison
      const registeredUserId = registeredUser._id.toString();
      const contactExists = req.user.contacts.some(id => id.toString() === registeredUserId);
      
      if (!contactExists) {
        req.user.contacts.push(registeredUser._id);
      }
    }

    await req.user.save();

    res.status(200).json({
      message: existingContactIndex !== -1 ? 'Contact updated successfully' : 'Contact added successfully',
      contact: contactData
    });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ message: 'Server error adding contact' });
  }
});

// Delete a contact
router.delete('/:contactId', auth, async (req, res) => {
  try {
    const { contactId } = req.params;
    
    // Remove from imported contacts if it exists
    req.user.importedContacts = req.user.importedContacts.filter(
      contact => contact._id.toString() !== contactId
    );
    
    // Find if this contact is also in the contacts list
    const contactToRemove = await User.findById(contactId);
    if (contactToRemove) {
      // Remove from contacts list if it exists
      req.user.contacts = req.user.contacts.filter(
        id => id.toString() !== contactId
      );
    }
    
    await req.user.save();
    
    res.status(200).json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ message: 'Server error deleting contact' });
  }
});

// Sync contacts - check if any imported contacts are now registered
router.post('/sync', auth, async (req, res) => {
  try {
    let updatedCount = 0;
    let newRegisteredCount = 0;
    
    // Get all imported contacts that aren't marked as registered
    const unregisteredContacts = req.user.importedContacts.filter(contact => !contact.isRegistered);
    
    for (const contact of unregisteredContacts) {
      // Check if this contact is now registered
      const normalizedPhoneNumber = normalizePhoneNumber(contact.phoneNumber);
      
      // Check by phone number
      let registeredUser = await User.findOne({ 
        phoneNumber: { $regex: normalizedPhoneNumber, $options: 'i' }
      });
      
      // If not found by phone and we have an email, check by email
      if (!registeredUser && contact.email) {
        registeredUser = await User.findOne({ email: contact.email.toLowerCase() });
      }
      
      if (registeredUser) {
        // Update the contact info
        contact.isRegistered = true;
        contact.userId = registeredUser._id;
        contact.synced = true;
        updatedCount++;
        
        // Add to contacts list if not already there
        const registeredUserId = registeredUser._id.toString();
        const contactExists = req.user.contacts.some(id => id.toString() === registeredUserId);
        
        if (!contactExists) {
          req.user.contacts.push(registeredUser._id);
          newRegisteredCount++;
        }
      }
    }
    
    if (updatedCount > 0 || newRegisteredCount > 0) {
      // Update contact sync info
      req.user.contactSyncInfo = {
        lastSynced: new Date(),
        totalSyncs: (req.user.contactSyncInfo?.totalSyncs || 0) + 1,
        lastSyncStatus: 'success'
      };
      
      await req.user.save();
    }
    
    res.status(200).json({
      message: 'Contacts synchronized successfully',
      updatedCount,
      newRegisteredCount
    });
  } catch (error) {
    console.error('Sync contacts error:', error);
    
    // Update sync status to failed
    if (req.user.contactSyncInfo) {
      req.user.contactSyncInfo.lastSyncStatus = 'failed';
      await req.user.save();
    }
    
    res.status(500).json({ message: 'Server error syncing contacts' });
  }
});

export default router; 