// src/utils/contactsImport.js
// Modular organization of contact management utilities

// ========== CONFIG ==========
const CONFIG = {
  API_URL: 'https://whatsupdev79.onrender.com/api'
};

// ========== API CALLS ==========
/**
 * API calls for contact management
 */
const ContactAPI = {
  /**
   * Import contacts to the server
   * @param {Array} contacts - Array of contact objects with name and phoneNumber
   * @param {string} token - Authentication token
   * @returns {Promise<Object>} - The response from the server
   */
  importContacts: async (contacts, token) => {
    return makeApiCall({
      endpoint: 'contacts/import',
      method: 'POST',
      token,
      data: { contacts },
      errorMessage: 'Failed to import contacts'
    });
  },

  /**
   * Get all imported contacts
   * @param {string} token - Authentication token
   * @returns {Promise<Array>} - Array of imported contacts
   */
  getImportedContacts: async (token) => {
    try {
      const data = await makeApiCall({
        endpoint: 'contacts/imported',
        method: 'GET',
        token,
        errorMessage: 'Failed to get imported contacts'
      });
      return data.importedContacts;
    } catch (error) {
      logError('Error getting imported contacts', error);
      throw error;
    }
  },

  /**
   * Get all registered contacts (users who are already on the platform)
   * @param {string} token - Authentication token
   * @returns {Promise<Array>} - Array of registered contacts
   */
  getRegisteredContacts: async (token) => {
    try {
      const data = await makeApiCall({
        endpoint: 'contacts/registered',
        method: 'GET',
        token,
        errorMessage: 'Failed to get registered contacts'
      });
      return data.contacts;
    } catch (error) {
      logError('Error getting registered contacts', error);
      throw error;
    }
  },

  /**
   * Send an invite to a contact
   * @param {string} contactPhoneNumber - The phone number of the contact to invite
   * @param {string} token - Authentication token
   * @returns {Promise<Object>} - The response from the server
   */
  sendInvite: async (contactPhoneNumber, token) => {
    return makeApiCall({
      endpoint: 'contacts/invite',
      method: 'POST',
      token,
      data: { contactPhoneNumber },
      errorMessage: 'Failed to send invite'
    });
  },

  /**
   * Delete a contact
   * @param {string} contactId - The ID of the contact to delete
   * @param {string} token - Authentication token
   * @returns {Promise<Object>} - The response from the server
   */
  deleteContact: async (contactId, token) => {
    return makeApiCall({
      endpoint: `contacts/${contactId}`,
      method: 'DELETE',
      token,
      errorMessage: 'Failed to delete contact'
    });
  },

  /**
   * Add a contact manually
   * @param {Object} contact - Contact object with name, phoneNumber, and optional email
   * @param {string} token - Authentication token
   * @returns {Promise<Object>} - The response from the server
   */
  addContact: async (contact, token) => {
    return makeApiCall({
      endpoint: 'contacts/add',
      method: 'POST',
      token,
      data: contact,
      errorMessage: 'Failed to add contact'
    });
  },

  /**
   * Sync contacts with server to update registration status
   * @param {string} token - Authentication token
   * @returns {Promise<Object>} - The response from the server
   */
  syncContacts: async (token) => {
    return makeApiCall({
      endpoint: 'contacts/sync',
      method: 'POST',
      token,
      errorMessage: 'Failed to sync contacts'
    });
  }
};

// ========== FILE PARSERS ==========
/**
 * File parsing utilities for different contact formats
 */
const FileParser = {
  /**
   * Parse contacts from different file formats (CSV, vCard)
   * @param {File} file - The file containing contacts
   * @returns {Promise<Array>} - Array of parsed contacts
   */
  parseContactsFile: async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const fileContent = event.target.result;
          const extension = file.name.split('.').pop().toLowerCase();
          
          let contacts;
          if (extension === 'csv') {
            contacts = FileParser.parseCSV(fileContent);
          } else if (extension === 'vcf') {
            contacts = FileParser.parseVCard(fileContent);
          } else {
            throw new Error('Unsupported file format. Please use CSV or VCF files.');
          }
          
          resolve(contacts);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  },

  /**
   * Parse a CSV file content
   * @param {string} content - The content of the CSV file
   * @returns {Array} - Array of parsed contacts
   */
  parseCSV: (content) => {
    const lines = content.split('\n');
    if (lines.length <= 1) {
      throw new Error('CSV file is empty or invalid');
    }
    
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Find relevant column indices
    const nameIndex = headers.findIndex(h => 
      h.toLowerCase().includes('name') || h.toLowerCase() === 'full name'
    );
    
    const phoneIndex = headers.findIndex(h => 
      h.toLowerCase().includes('phone') || h.toLowerCase().includes('mobile') || h.toLowerCase().includes('cell')
    );
    
    const emailIndex = headers.findIndex(h => 
      h.toLowerCase().includes('email')
    );
    
    if (nameIndex === -1 || phoneIndex === -1) {
      throw new Error('CSV file must contain name and phone number columns');
    }
    
    const contacts = [];
    
    // Parse each line
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(value => value.trim());
      
      if (values.length <= Math.max(nameIndex, phoneIndex)) {
        continue; // Skip invalid lines
      }
      
      const contact = {
        name: values[nameIndex],
        phoneNumber: FormatUtils.formatPhoneNumber(values[phoneIndex])
      };
      
      if (emailIndex !== -1 && values[emailIndex]) {
        contact.email = values[emailIndex];
      }
      
      if (contact.name && contact.phoneNumber) {
        contacts.push(contact);
      }
    }
    
    if (contacts.length === 0) {
      throw new Error('No valid contacts found in CSV file');
    }
    
    return contacts;
  },

  /**
   * Parse a vCard file content
   * @param {string} content - The content of the vCard file
   * @returns {Array} - Array of parsed contacts
   */
  parseVCard: (content) => {
    const vcards = content.split('BEGIN:VCARD');
    const contacts = [];
    
    for (let i = 1; i < vcards.length; i++) {
      const vcard = vcards[i];
      
      // Extract name
      const nameMatch = vcard.match(/FN:(.*?)(?:\r\n|\r|\n)/);
      const name = nameMatch ? nameMatch[1].trim() : null;
      
      // Extract phone number
      const phoneMatch = vcard.match(/TEL(?:;[^:]*)?:(.*?)(?:\r\n|\r|\n)/);
      const phoneNumber = phoneMatch ? FormatUtils.formatPhoneNumber(phoneMatch[1].trim()) : null;
      
      // Extract email
      const emailMatch = vcard.match(/EMAIL(?:;[^:]*)?:(.*?)(?:\r\n|\r|\n)/);
      const email = emailMatch ? emailMatch[1].trim() : null;
      
      if (name && phoneNumber) {
        const contact = { name, phoneNumber };
        if (email) {
          contact.email = email;
        }
        contacts.push(contact);
      }
    }
    
    if (contacts.length === 0) {
      throw new Error('No valid contacts found in vCard file');
    }
    
    return contacts;
  }
};

// ========== HELPERS & UTILITIES ==========
/**
 * Helper utilities for formatting and validation
 */
const FormatUtils = {
  /**
   * Format a phone number by removing all non-digit characters
   * @param {string} phoneNumber - The phone number to format
   * @returns {string} - The formatted phone number
   */
  formatPhoneNumber: (phoneNumber) => {
    if (!phoneNumber) return null;
    
    // Simply remove all non-digit characters - no fancy formatting
    return phoneNumber.replace(/\D/g, '');
  },
  
  /**
   * Validates a phone number
   * @param {string} phoneNumber - The phone number to validate
   * @returns {boolean} - Whether the phone number is valid
   */
  isValidPhoneNumber: (phoneNumber) => {
    if (!phoneNumber) return false;
    const formattedNumber = FormatUtils.formatPhoneNumber(phoneNumber);
    // Basic validation: must have at least 6 digits
    return formattedNumber.length >= 6;
  },
  
  /**
   * Validates an email address
   * @param {string} email - The email to validate
   * @returns {boolean} - Whether the email is valid
   */
  isValidEmail: (email) => {
    if (!email) return true; // Email is optional
    // Basic email validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
};

// Use consistent error logging format throughout the file
const logError = (message, error) => {
  console.error(`❌ [Contacts] ${message}:`, error);
  return error;
};

/**
 * Makes an API call with consistent error handling
 * @param {Object} options - The options for the API call
 * @returns {Promise<Object>} - The response from the server
 */
const makeApiCall = async ({ endpoint, method = 'GET', token, data = null, errorMessage = 'API Error' }) => {
  try {
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    if (data && method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }
    
    const fetchOptions = {
      method,
      headers
    };
    
    if (data && method !== 'GET') {
      fetchOptions.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${CONFIG.API_URL}/${endpoint}`, fetchOptions);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    logError(`API Error (${endpoint})`, error);
    throw error;
  }
};

// ========== MOBILE SPECIFIC FUNCTIONS ==========
/**
 * Import contacts from device (for mobile apps)
 * @returns {Promise<Array>} - Array of contacts from the device
 */
const importContactsFromDevice = async () => {
  throw new Error('This function must be implemented based on your mobile framework');
};

// ========== EXPORTS ==========
// Export individual functions for backward compatibility
export const importContacts = ContactAPI.importContacts;
export const getImportedContacts = ContactAPI.getImportedContacts;
export const getRegisteredContacts = ContactAPI.getRegisteredContacts;
export const sendInvite = ContactAPI.sendInvite;
export const deleteContact = ContactAPI.deleteContact;
export const addContact = ContactAPI.addContact;
export const syncContacts = ContactAPI.syncContacts;
export const parseContactsFile = FileParser.parseContactsFile;
export { importContactsFromDevice };

// Export modules for more advanced usage
export const ContactUtils = {
  api: ContactAPI,
  fileParser: FileParser,
  formatUtils: FormatUtils,
  config: CONFIG
};

// Default export for simpler imports
export default ContactUtils; 