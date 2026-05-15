import { formatAddress } from '../lib/addressValidation';
import { Copy, Edit2, Trash2, Check } from 'lucide-react';

export default function AddressBookEntry({ entry, onSelect, onEdit, onDelete }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(entry.address);
    } catch (error) {
      console.error('Failed to copy address:', error);
      const textarea = document.createElement('textarea');
      textarea.value = entry.address;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
      }
      document.body.removeChild(textarea);
    }
  };

  const formattedDate = new Date(entry.updatedAt).toLocaleDateString();

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{entry.label}</h3>
          <p className="text-sm font-mono text-gray-600 dark:text-gray-300 break-all mb-2" title={entry.address}>
            {formatAddress(entry.address, 10)}
          </p>
          {entry.notes && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{entry.notes}</p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500">Updated: {formattedDate}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onSelect && (
            <button
              onClick={onSelect}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 dark:bg-amber-500 text-white dark:text-black rounded-lg text-sm font-semibold hover:bg-gray-800 dark:hover:bg-amber-400 transition-colors"
              type="button"
              title="Use this address"
            >
              <Check className="w-4 h-4" />
              Select
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            type="button"
            title="Copy address"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            type="button"
            title="Edit entry"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            type="button"
            title="Delete entry"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
