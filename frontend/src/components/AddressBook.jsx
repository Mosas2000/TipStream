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
      <div className="address-book-compact">
        <AddressBookSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search saved addresses..."
        />
        <div className="address-book-list-compact">
          {filteredEntries.length === 0 ? (
            <p className="no-entries">
              {searchQuery ? 'No addresses found' : 'No saved addresses'}
            </p>
          ) : (
            filteredEntries.map(entry => (
              <button
                key={entry.id}
                className="address-book-item-compact"
                onClick={() => handleSelect(entry)}
                type="button"
              >
                <span className="label">{entry.label}</span>
                <span className="address">{formatAddress(entry.address)}</span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="address-book">
      <div className="address-book-header">
        <h2>Address Book</h2>
        <div className="address-book-actions">
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
            type="button"
          >
            {showForm ? 'Cancel' : 'Add Address'}
          </button>
          <button
            onClick={() => setShowImportExport(!showImportExport)}
            className="btn-secondary"
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

      <div className="address-book-list">
        {filteredEntries.length === 0 ? (
          <div className="no-entries">
            {searchQuery ? (
              <p>No addresses found matching "{searchQuery}"</p>
            ) : (
              <div>
                <p>Your address book is empty</p>
                <p>Add frequently used addresses for quick access</p>
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
        <div className="address-book-footer">
          <p>{entries.length} address{entries.length !== 1 ? 'es' : ''} saved</p>
        </div>
      )}
    </div>
  );
}
