import { useState } from 'react';
import { Calendar } from 'lucide-react';

export default function DateRangeFilter({ startDate, endDate, onChange }) {
  const [localStartDate, setLocalStartDate] = useState(startDate || '');
  const [localEndDate, setLocalEndDate] = useState(endDate || '');

  function handleApply() {
    onChange({
      startDate: localStartDate || null,
      endDate: localEndDate || null,
    });
  }

  function handleReset() {
    setLocalStartDate('');
    setLocalEndDate('');
    onChange({
      startDate: null,
      endDate: null,
    });
  }

  function handlePreset(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    setLocalStartDate(startStr);
    setLocalEndDate(endStr);
    onChange({
      startDate: startStr,
      endDate: endStr,
    });
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Date Range</h3>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-1">Start Date</label>
          <input
            type="date"
            value={localStartDate}
            onChange={(e) => setLocalStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-1">End Date</label>
          <input
            type="date"
            value={localEndDate}
            onChange={(e) => setLocalEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => handlePreset(7)}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
        >
          Last 7 days
        </button>
        <button
          onClick={() => handlePreset(30)}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
        >
          Last 30 days
        </button>
        <button
          onClick={() => handlePreset(90)}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
        >
          Last 90 days
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleApply}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          Apply
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
