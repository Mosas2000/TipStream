export default function AddressBookSearch({ value, onChange, placeholder }) {
  return (
    <div className="address-book-search">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Search addresses...'}
        className="search-input"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="clear-search"
          type="button"
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  );
}
