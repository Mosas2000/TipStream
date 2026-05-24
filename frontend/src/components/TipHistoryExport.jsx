import { useState } from 'react';
import { Download, X, Calendar } from 'lucide-react';
import { generateTipHistoryCSV, downloadCSV, filterTipsByDateRange } from '../lib/csvExport';

export default function TipHistoryExport({ tips, onClose, userAddress }) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterError, setFilterError] = useState('');

    const handleExport = () => {
        setFilterError('');

        let filteredTips = tips;

        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;

            if (start && end && start > end) {
                setFilterError('Start date must be before end date');
                return;
            }

            filteredTips = filterTipsByDateRange(tips, start, end);

            if (filteredTips.length === 0) {
                setFilterError('No tips found in the selected date range');
                return;
            }
        }

        const csvContent = generateTipHistoryCSV(filteredTips);
        const timestamp = Date.now();
        const dateRange = startDate || endDate 
            ? `_${startDate || 'start'}_to_${endDate || 'end'}`
            : '';
        const filename = `tip-history_${userAddress.slice(0, 8)}${dateRange}_${timestamp}.csv`;
        
        downloadCSV(csvContent, filename);
        onClose();
    };

    const handleClearDates = () => {
        setStartDate('');
        setEndDate('');
        setFilterError('');
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Export Tip History</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label="Close export dialog"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4 mb-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Export your tip history as a CSV file for accounting or tax purposes.
                    </p>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            <Calendar className="w-4 h-4" />
                            <span>Date Range Filter (Optional)</span>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label htmlFor="start-date" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Start Date
                                </label>
                                <input
                                    id="start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setFilterError('');
                                    }}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-amber-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="end-date" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    End Date
                                </label>
                                <input
                                    id="end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setFilterError('');
                                    }}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-amber-500"
                                />
                            </div>

                            {(startDate || endDate) && (
                                <button
                                    onClick={handleClearDates}
                                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
                                >
                                    Clear date filters
                                </button>
                            )}
                        </div>
                    </div>

                    {filterError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                            {filterError}
                        </div>
                    )}

                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-400">
                        <p className="font-semibold mb-1">CSV will include:</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-1">
                            <li>Transaction ID</li>
                            <li>Direction (sent/received)</li>
                            <li>Sender and recipient addresses</li>
                            <li>Amount in STX and microSTX</li>
                            <li>Message and category</li>
                            <li>Timestamp and formatted date</li>
                        </ul>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-amber-500 text-white dark:text-black rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-amber-400 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>
        </div>
    );
}
