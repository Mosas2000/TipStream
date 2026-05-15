import { useState } from 'react';
import { addressBook } from '../lib/addressBook';
import { Download, Copy, Upload, X } from 'lucide-react';

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
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Import/Export Address Book</h3>
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" 
          type="button"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'export'
              ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-amber-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          type="button"
        >
          Export
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'import'
              ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-amber-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          type="button"
        >
          Import
        </button>
      </div>

      {activeTab === 'export' ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Export your address book to back it up or transfer to another device.
          </p>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleExport} 
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-amber-500 text-white dark:text-black rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-amber-400 transition-colors" 
              type="button"
            >
              <Download className="w-4 h-4" />
              Download as JSON
            </button>
            <button 
              onClick={handleCopyExport} 
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" 
              type="button"
            >
              <Copy className="w-4 h-4" />
              Copy to Clipboard
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Import addresses from a JSON file or paste JSON data.
          </p>
          
          <div>
            <label 
              htmlFor="import-file" 
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer inline-flex"
            >
              <Upload className="w-4 h-4" />
              Choose File
            </label>
            <input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>

          <div>
            <label htmlFor="import-data" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Or paste JSON data:
            </label>
            <textarea
              id="import-data"
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder='[{"label":"Alice","address":"SP...","notes":""}]'
              rows={8}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-amber-500 font-mono text-sm resize-none"
            />
          </div>

          {importError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {importError}
            </div>
          )}

          <button
            onClick={handleImport}
            className="px-4 py-2 bg-gray-900 dark:bg-amber-500 text-white dark:text-black rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!importData}
            type="button"
          >
            Import
          </button>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-400">
            Note: Duplicate addresses will be skipped during import.
          </div>
        </div>
      )}
    </div>
  );
}
