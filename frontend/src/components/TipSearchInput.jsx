import { Search, X } from 'lucide-react';

export default function TipSearchInput({ value, onChange, onClear, placeholder }) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
      <label htmlFor="tip-search-input" className="sr-only">Search tips</label>
      <input
        id="tip-search-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-8 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500"
        placeholder={placeholder || 'Search by address or message...'}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
