import { useState } from 'react';
import { addressBook } from '../lib/addressBook';

export default function AddressBookImportExport({ onImport, onClose }) {
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState('');
  const [activeTab, setActiveTab] = useState('export');

  const handleExport = () => {
    const data = addressBook.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `address-book-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyExport = async () => {
    try {
      const data = addressBook.exportData();
      await navigator.clipboard.writeText(data);
      alert('Address book data copied to clipboard');
    } catch (error) {
      alert('Failed to copy to clipboard');
    }
  };

  const handleImport = () => {
    setImportError('');
    try {
      const result = addressBook.importData(importData);
      onImport(result);
      setImportData('');
    } catch (error) {
      setImportError(error.message);
    }
  };

  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImportData(event.target.result);
    };
    reader.onerror = () => {
      setImportError('Failed to read file');
    };
    reader.readAsText(file);
  };

  return (
    <div className="address-book-import-export">
      <div className="import-export-header">
        <h3>Import/Export Address Book</h3>
        <button onClick={onClose} className="close-button" type="button">
          ×
        </button>
      </div>

      <div className="import-export-tabs">
        <button
          onClick={() => setActiveTab('export')}
          className={activeTab === 'export' ? 'active' : ''}
          type="button"
        >
          Export
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={activeTab === 'import' ? 'active' : ''}
          type="button"
        >
          Import
        </button>
      </div>

      {activeTab === 'export' ? (
        <div className="export-section">
          <p>Export your address book to back it up or transfer to another device.</p>
          <div className="export-actions">
            <button onClick={handleExport} className="btn-primary" type="button">
              Download as JSON
            </button>
            <button onClick={handleCopyExport} className="btn-secondary" type="button">
              Copy to Clipboard
            </button>
          </div>
        </div>
      ) : (
        <div className="import-section">
          <p>Import addresses from a JSON file or paste JSON data.</p>
          
          <div className="import-file">
            <label htmlFor="import-file" className="file-label">
              Choose File
            </label>
            <input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="file-input"
            />
          </div>

          <div className="import-textarea">
            <label htmlFor="import-data">Or paste JSON data:</label>
            <textarea
              id="import-data"
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder='[{"label":"Alice","address":"SP...","notes":""}]'
              rows={8}
            />
          </div>

          {importError && (
            <div className="error-message">{importError}</div>
          )}

          <div className="import-actions">
            <button
              onClick={handleImport}
              className="btn-primary"
              disabled={!importData}
              type="button"
            >
              Import
            </button>
          </div>

          <div className="import-note">
            Note: Duplicate addresses will be skipped during import.
          </div>
        </div>
      )}
    </div>
  );
}
