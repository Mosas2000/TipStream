import { formatAddress } from '../lib/addressValidation';

export default function AddressBookEntry({ entry, onSelect, onEdit, onDelete }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(entry.address);
      alert('Address copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formattedDate = new Date(entry.updatedAt).toLocaleDateString();

  return (
    <div className="address-book-entry">
      <div className="entry-main">
        <div className="entry-info">
          <h3 className="entry-label">{entry.label}</h3>
          <p className="entry-address" title={entry.address}>
            {formatAddress(entry.address, 10)}
          </p>
          {entry.notes && (
            <p className="entry-notes">{entry.notes}</p>
          )}
          <p className="entry-date">Updated: {formattedDate}</p>
        </div>
        <div className="entry-actions">
          {onSelect && (
            <button
              onClick={onSelect}
              className="btn-select"
              type="button"
              title="Use this address"
            >
              Select
            </button>
          )}
          <button
            onClick={handleCopy}
            className="btn-copy"
            type="button"
            title="Copy address"
          >
            Copy
          </button>
          <button
            onClick={onEdit}
            className="btn-edit"
            type="button"
            title="Edit entry"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="btn-delete"
            type="button"
            title="Delete entry"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
