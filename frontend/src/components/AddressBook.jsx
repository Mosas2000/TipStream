import { useState, useEffect } from 'react';
import { addressBook } from '../lib/addressBook';
import { validateAddressBookEntry, formatAddress } from '../lib/addressValidation';
import AddressBookEntry from './AddressBookEntry';
import AddressBookForm from './AddressBookForm';
import AddressBookSearch from './AddressBookSearch';
import AddressBookImportExport from './AddressBookImportExport';

export default function AddressBook({ onSelectAddress, compact = false }) {
  const [entries, setEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showImportExport, setShowImportExport] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = () => {
    setEntries(addressBook.getAll());
  };

  const handleAdd = (label, address, notes) => {
    try {
      addressBook.add(label, address, notes);
      loadEntries();
      setShowForm(false);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleUpdate = (id, updates) => {
    try {
      addressBook.update(id, updates);
      loadEntries();
      setEditingEntry(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        addressBook.delete(id);
        loadEntries();
      } catch (error) {
        alert(`Failed to delete: ${error.message}`);
      }
    }
  };

  const handleSelect = (entry) => {
    if (onSelectAddress) {
      onSelectAddress(entry.address, entry.label);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setShowForm(false);
  };

  const handleImport = (result) => {
    loadEntries();
    setShowImportExport(false);
    alert(`Imported ${result.imported.length} addresses. Skipped ${result.skipped.length} duplicates.`);
  };

  const filteredEntries = searchQuery
    ? addressBook.search(searchQuery)
    : entries;

  if (compact) {
    return (
      <div className="space-y-3">
        <AddressBookSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search saved addresses..."
        />
        <div className="max-h-64 overflow-y-auto space-y-2">
          {filteredEntries.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              {searchQuery ? 'No addresses found' : 'No saved addresses'}
            </p>
          ) : (
            filteredEntries.map(entry => (
              <button
                key={entry.id}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                onClick={() => handleSelect(entry)}
                type="button"
              >
                <span className="font-medium text-gray-900 dark:text-white">{entry.label}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{formatAddress(entry.address)}</span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Address Book</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-gray-900 dark:bg-amber-500 text-white dark:text-black rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-amber-400 transition-colors"
            type="button"
          >
            {showForm ? 'Cancel' : 'Add Address'}
          </button>
          <button
            onClick={() => setShowImportExport(!showImportExport)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            type="button"
          >
            Import/Export
          </button>
        </div>
      </div>

      {showForm && (
        <AddressBookForm
          entry={editingEntry}
          onSubmit={editingEntry ? handleUpdate : handleAdd}
          onCancel={handleCancelEdit}
        />
      )}

      {showImportExport && (
        <AddressBookImportExport
          onImport={handleImport}
          onClose={() => setShowImportExport(false)}
        />
      )}

      <AddressBookSearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by label, address, or notes..."
      />

      <div className="space-y-3 mt-6">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery ? (
              <p className="text-gray-500 dark:text-gray-400">No addresses found matching "{searchQuery}"</p>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-900 dark:text-white font-semibold">Your address book is empty</p>
                <p className="text-gray-500 dark:text-gray-400">Add frequently used addresses for quick access</p>
              </div>
            )}
          </div>
        ) : (
          filteredEntries.map(entry => (
            <AddressBookEntry
              key={entry.id}
              entry={entry}
              onSelect={onSelectAddress ? () => handleSelect(entry) : null}
              onEdit={() => handleEdit(entry)}
              onDelete={() => handleDelete(entry.id)}
            />
          ))
        )}
      </div>

      {entries.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            {entries.length} address{entries.length !== 1 ? 'es' : ''} saved
          </p>
        </div>
      )}
    </div>
  );
}
