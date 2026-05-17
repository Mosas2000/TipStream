import { useState, useEffect } from 'react';
import { validateAddressBookEntry } from '../lib/addressValidation';

export default function AddressBookForm({ entry, onSubmit, onCancel }) {
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (entry) {
      setLabel(entry.label);
      setAddress(entry.address);
      setNotes(entry.notes || '');
    }
  }, [entry]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const validation = validateAddressBookEntry(label.trim(), address.trim(), notes.trim());
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    const result = entry
      ? await onSubmit(entry.id, {
          label: label.trim(),
          address: address.trim(),
          notes: notes.trim(),
        })
      : await onSubmit(label.trim(), address.trim(), notes.trim());

    setIsSubmitting(false);

    if (result.success) {
      setLabel('');
      setAddress('');
      setNotes('');
      setErrors({});
    } else {
      setErrors({ submit: result.error });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {entry ? 'Edit Address' : 'Add New Address'}
      </h3>

      <div className="space-y-4">
        <div>
          <label htmlFor="label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Label <span className="text-red-500">*</span>
          </label>
          <input
            id="label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., Alice, Bob, Main Wallet"
            maxLength={50}
            disabled={isSubmitting}
            className={`w-full px-4 py-2 rounded-lg border ${
              errors.label
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-amber-500 disabled:opacity-50`}
          />
          {errors.label && <span className="text-sm text-red-500 mt-1 block">{errors.label}</span>}
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Stacks Address <span className="text-red-500">*</span>
          </label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="SP..."
            disabled={isSubmitting}
            className={`w-full px-4 py-2 rounded-lg border ${
              errors.address
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-amber-500 disabled:opacity-50 font-mono text-sm`}
          />
          {errors.address && <span className="text-sm text-red-500 mt-1 block">{errors.address}</span>}
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this address"
            maxLength={200}
            rows={3}
            disabled={isSubmitting}
            className={`w-full px-4 py-2 rounded-lg border ${
              errors.notes
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-amber-500 disabled:opacity-50 resize-none`}
          />
          {errors.notes && <span className="text-sm text-red-500 mt-1 block">{errors.notes}</span>}
          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 block">{notes.length}/200</span>
        </div>
      </div>

      {errors.submit && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {errors.submit}
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          className="px-4 py-2 bg-gray-900 dark:bg-amber-500 text-white dark:text-black rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : entry ? 'Update' : 'Add'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
