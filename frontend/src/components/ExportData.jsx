import { useState } from 'react';
import { Download, FileText, FileJson } from 'lucide-react';
import { exportToCSV, exportToJSON } from '../services/analytics';

export default function ExportData({ data }) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExportCSV() {
    if (!data || !data.timeSeriesData) return;
    
    setExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      exportToCSV(data.timeSeriesData, `analytics-${timestamp}.csv`);
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  }

  async function handleExportJSON() {
    if (!data) return;
    
    setExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      exportToJSON(data, `analytics-${timestamp}.json`);
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={exporting || !data}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Export analytics data"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Export Data</span>
        <span className="sm:hidden">Export</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 analytics-export-menu">
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Export as CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              disabled={exporting}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-t border-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
