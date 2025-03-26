import React, { useState, useEffect, useRef } from 'react';
import { Plus, Upload, Users, UserPlus, Send, X, Check, AlertCircle, Trash2, RefreshCw, Eye, EyeOff, Settings, Search, MessageCircle, Phone, User, Mail } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { 
  importContacts, 
  parseContactsFile, 
  getImportedContacts, 
  getRegisteredContacts,
  sendInvite,
  syncContacts,
  deleteContact
} from '../utils/contactsImport';
import { toast } from 'sonner';

function Contacts() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [registeredContacts, setRegisteredContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newContact, setNewContact] = useState({
    name: '',
    phoneNumber: '',
    email: ''
  });
  const [privacySettings, setPrivacySettings] = useState({
    lastSeen: 'everyone',
    profilePicture: 'everyone',
    status: 'everyone',
    readReceipts: true
  });
  const [filterOption, setFilterOption] = useState('all'); // 'all', 'registered', 'unregistered'
  const fileInputRef = useRef(null);

  // Fetch contacts on component mount
  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Fetch both imported and registered contacts
      const importedData = await getImportedContacts(token);
      const registeredData = await getRegisteredContacts(token);
      
      setContacts(importedData);
      setRegisteredContacts(registeredData);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error(error.message || 'Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      setError('');
      
      // Parse the file
      const parsedContacts = await parseContactsFile(file);
      
      if (parsedContacts.length === 0) {
        throw new Error('No valid contacts found in the file');
      }
      
      // Import the contacts to the server
      const token = localStorage.getItem('token');
      const result = await importContacts(parsedContacts, token);
      
      toast.success(`Successfully imported ${result.totalContacts} contacts`);
      
      // Refresh the contacts list
      await fetchContacts();
    } catch (error) {
      console.error('Error importing contacts:', error);
      setError(error.message || 'Failed to import contacts');
      toast.error(error.message || 'Failed to import contacts');
    } finally {
      setLoading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualAdd = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Validate contact info
      if (!newContact.name.trim()) {
        throw new Error('Name is required');
      }
      
      if (!newContact.phoneNumber.trim()) {
        throw new Error('Phone number is required');
      }
      
      // Format phone number if needed
      if (!newContact.phoneNumber.startsWith('+')) {
        newContact.phoneNumber = `+${newContact.phoneNumber.replace(/\D/g, '')}`;
      }
      
      // Import the single contact
      const token = localStorage.getItem('token');
      await importContacts([newContact], token);
      
      toast.success(`Contact ${newContact.name} added successfully`);
      
      // Reset form and refresh contacts
      setNewContact({ name: '', phoneNumber: '', email: '' });
      setShowAddContact(false);
      await fetchContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      setError(error.message || 'Failed to add contact');
      toast.error(error.message || 'Failed to add contact');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (phoneNumber) => {
    try {
      const token = localStorage.getItem('token');
      await sendInvite(phoneNumber, token);
      toast.success('Invitation sent successfully');
      await fetchContacts(); // Refresh to update invitation status
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error(error.message || 'Failed to send invitation');
    }
  };

  const handleDelete = async (contactId) => {
    if (!confirm('Are you sure you want to delete this contact?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await deleteContact(contactId, token);
      toast.success('Contact deleted successfully');
      await fetchContacts(); // Refresh contacts list
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error(error.message || 'Failed to delete contact');
    }
  };

  const handleSync = async () => {
    try {
      setSyncLoading(true);
      const token = localStorage.getItem('token');
      const result = await syncContacts(token);
      
      if (result.newlyRegisteredCount > 0) {
        toast.success(`Found ${result.newlyRegisteredCount} newly registered contacts!`);
      } else {
        toast.success('Contacts synced successfully');
      }
      
      await fetchContacts(); // Refresh contacts list
    } catch (error) {
      console.error('Error syncing contacts:', error);
      toast.error(error.message || 'Failed to sync contacts');
    } finally {
      setSyncLoading(false);
    }
  };

  const handlePrivacySettingsChange = (setting, value) => {
    setPrivacySettings({
      ...privacySettings,
      [setting]: value
    });
    
    // In a real app, you would save this to the server
    toast.success(`Privacy setting updated: ${setting}`);
  };

  // Filter contacts based on selected option and search query
  const filteredContacts = contacts.filter(contact => {
    // First apply filter option
    if (filterOption === 'registered' && !contact.isRegistered) return false;
    if (filterOption === 'unregistered' && contact.isRegistered) return false;
    
    // Then apply search query if present
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    
    // Search by name (case insensitive)
    if (contact.name.toLowerCase().includes(query)) return true;
    
    // Search by email (if exists, case insensitive)
    if (contact.email && contact.email.toLowerCase().includes(query)) return true;
    
    // Search by phone number - remove non-digits for more effective search
    const normalizedQuery = query.replace(/\D/g, '');
    const normalizedPhone = contact.phoneNumber.replace(/\D/g, '');
    
    return normalizedPhone.includes(normalizedQuery);
  });

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Users className="mr-2 h-6 w-6" />
            Contacts
          </h1>
          <p className="text-gray-600 mt-1">
            {contacts.length} contacts ({contacts.filter(c => c.isRegistered).length} on WhatsupDev)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          <button
            onClick={() => setShowPrivacySettings(true)}
            className="flex items-center text-gray-700 px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-4 w-4 mr-2" />
            Privacy
          </button>
          <button
            onClick={handleSync}
            disabled={syncLoading}
            className="flex items-center text-blue-600 px-3 py-2 rounded-lg border border-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncLoading ? 'animate-spin' : ''}`} />
            {syncLoading ? 'Syncing...' : 'Sync Contacts'}
          </button>
          <label
            className="flex items-center bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
            htmlFor="contactsFile"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
            <input
              id="contactsFile"
              type="file"
              accept=".csv,.vcf"
              onChange={handleFileUpload}
              className="hidden"
              ref={fileInputRef}
            />
          </label>
          <button
            onClick={() => setShowAddContact(true)}
            className="flex items-center bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Contact
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border shadow-sm p-4 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          {/* Search bar */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Filter dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="filterOption" className="text-gray-600 whitespace-nowrap">
              Show:
            </label>
            <select
              id="filterOption"
              value={filterOption}
              onChange={(e) => setFilterOption(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Contacts</option>
              <option value="registered">On WhatsupDev</option>
              <option value="unregistered">Not on WhatsupDev</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-8">Loading contacts...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? (
              <div>
                <p>No contacts matching "{searchQuery}"</p>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-blue-600 hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div>
                <p>No contacts found.</p>
                <p className="mt-2">Import contacts or add them manually to get started.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredContacts.map((contact, index) => (
              <div 
                key={index} 
                className={`p-4 border rounded-lg shadow-sm ${
                  contact.isRegistered 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <h3 className="font-semibold text-lg">{contact.name}</h3>
                    <div className="flex items-center text-gray-600 mt-1">
                      <Phone className="h-4 w-4 mr-1" />
                      <span>{contact.phoneNumber}</span>
                    </div>
                    {contact.email && (
                      <div className="flex items-center text-gray-500 text-sm mt-1">
                        <Mail className="h-4 w-4 mr-1" />
                        <span>{contact.email}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      {contact.isRegistered ? (
                        <button
                          onClick={() => {
                            // Navigate to chat with this user - implement this in your app
                            toast.info(`Start chatting with ${contact.name}`);
                          }}
                          className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded-md text-sm hover:bg-green-700"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Message
                        </button>
                      ) : contact.inviteSent ? (
                        <span className="text-blue-600 text-sm font-medium flex items-center">
                          <Check className="h-4 w-4 mr-1" />
                          Invite sent
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendInvite(contact.phoneNumber)}
                          className="text-blue-600 hover:text-blue-800 flex items-center text-sm bg-blue-50 px-2 py-1 rounded-md"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send Invite
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDelete(contact._id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                        title="Delete contact"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {contact.synced && (
                      <span className="text-gray-500 text-xs">
                        Synced {new Date(contact.lastSyncedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {contact.isRegistered && (
                  <div className="mt-2 flex items-center">
                    <span className="inline-flex items-center text-green-600 text-sm bg-green-100 px-2 py-0.5 rounded-full">
                      <Check className="h-3 w-3 mr-1" />
                      On WhatsupDev
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showPrivacySettings && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Privacy Settings</h2>
            <button
              onClick={() => setShowPrivacySettings(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Who can see my last seen
              </label>
              <select
                value={privacySettings.lastSeen}
                onChange={(e) => handlePrivacySettingsChange('lastSeen', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My Contacts</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Who can see my profile picture
              </label>
              <select
                value={privacySettings.profilePicture}
                onChange={(e) => handlePrivacySettingsChange('profilePicture', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My Contacts</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Who can see my status
              </label>
              <select
                value={privacySettings.status}
                onChange={(e) => handlePrivacySettingsChange('status', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My Contacts</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="readReceipts"
                checked={privacySettings.readReceipts}
                onChange={(e) => handlePrivacySettingsChange('readReceipts', e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mr-2"
              />
              <label htmlFor="readReceipts" className="text-sm font-medium text-gray-700">
                Send read receipts
              </label>
            </div>
          </div>
        </div>
      )}
      
      {showAddContact && (
        <div className="mb-8 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Add New Contact</h2>
            <button
              onClick={() => {
                setShowAddContact(false);
                setNewContact({ name: '', phoneNumber: '', email: '' });
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={newContact.name}
                onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                placeholder="Full Name"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                value={newContact.phoneNumber}
                onChange={(e) => setNewContact({...newContact, phoneNumber: e.target.value})}
                placeholder="+1234567890"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                id="email"
                value={newContact.email}
                onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                placeholder="email@example.com"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleManualAdd}
                disabled={loading}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />
                <span>Save Contact</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Contacts; 