import { SlidersHorizontal } from 'lucide-react';

export default function TipFilterControls({
  showFilters,
  setShowFilters,
  hasActiveFilters,
  onClear,
  categoryFilter,
  setCategoryFilter,
  sortBy,
  setSortBy,
  minAmount,
  setMinAmount,
  maxAmount,
  setMaxAmount,
  categoryLabels,
  sortOptions,
}) {
  return (
    <div className="mb-5 space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          aria-controls="tip-filter-panel"
          className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${showFilters ? 'bg-gray-900 dark:bg-amber-500 text-white dark:text-black border-gray-900 dark:border-amber-500' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
          Filters
        </button>
        {hasActiveFilters && (
          <button type="button" onClick={onClear} className="px-2 py-2 text-xs text-red-500 hover:text-red-600 font-semibold">
            Clear
          </button>
        )}
      </div>
      {showFilters && (
        <div id="tip-filter-panel" className="flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <label htmlFor="tip-category-filter" className="text-xs font-medium text-gray-500 dark:text-gray-400">Category</label>
            <select
              id="tip-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Categories</option>
              {Object.entries(categoryLabels).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="tip-filter-min" className="text-xs font-medium text-gray-500 dark:text-gray-400">Min STX</label>
            <input
              id="tip-filter-min"
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-24 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="0"
              step="0.001"
              min="0"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="tip-filter-max" className="text-xs font-medium text-gray-500 dark:text-gray-400">Max STX</label>
            <input
              id="tip-filter-max"
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-24 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="any"
              step="0.001"
              min="0"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="tip-sort" className="text-xs font-medium text-gray-500 dark:text-gray-400">Sort</label>
            <select
              id="tip-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
