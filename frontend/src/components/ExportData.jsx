import { useState } from 'react';
import { Download, FileText, FileJson } from 'lucide-react';
import { exportToCSV, exportToJSON } from '../services/analytics';

export default function ExportData({ data }) {
  const [isOpen, setIsOpen] = useState(false);

  function handleExportCSV() {
    if (!data || !data.timeSeriesData) return;
    
    const timestamp = new Date().toISOString().split('T')[0];
    exportToCSV(data.timeSeriesData, `analytics-${timestamp}.csv`);
    setIsOpen(false);
  }

  function handleExportJSON() {
    if (!data) return;
    
    const timestamp = new Date().toISOString().split('T')[0];
    exportToJSON(data, `analytics-${timestamp}.json`);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
      >
        <Download className="w-4 h-4" />
        Export Data
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <button
              onClick={handleExportCSV}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
            >
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Export as CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-t border-gray-100"
            >
              <FileJson className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Export as JSON</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
