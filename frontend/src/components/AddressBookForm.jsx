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
    <form onSubmit={handleSubmit} className="address-book-form">
      <h3>{entry ? 'Edit Address' : 'Add New Address'}</h3>

      <div className="form-group">
        <label htmlFor="label">
          Label <span className="required">*</span>
        </label>
        <input
          id="label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., Alice, Bob, Main Wallet"
          maxLength={50}
          disabled={isSubmitting}
          className={errors.label ? 'error' : ''}
        />
        {errors.label && <span className="error-message">{errors.label}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="address">
          Stacks Address <span className="required">*</span>
        </label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="SP..."
          disabled={isSubmitting}
          className={errors.address ? 'error' : ''}
        />
        {errors.address && <span className="error-message">{errors.address}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="notes">Notes (optional)</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this address"
          maxLength={200}
          rows={3}
          disabled={isSubmitting}
          className={errors.notes ? 'error' : ''}
        />
        {errors.notes && <span className="error-message">{errors.notes}</span>}
        <span className="char-count">{notes.length}/200</span>
      </div>

      {errors.submit && (
        <div className="error-message submit-error">{errors.submit}</div>
      )}

      <div className="form-actions">
        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : entry ? 'Update' : 'Add'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
