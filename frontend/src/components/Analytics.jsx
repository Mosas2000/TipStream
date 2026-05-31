import { useState, useEffect } from 'react';
import { fetchAnalytics } from '../services/analytics';
import AnalyticsSummary from './AnalyticsSummary';
import TipVolumeChart from './TipVolumeChart';
import TopSendersChart from './TopSendersChart';
import TopRecipientsChart from './TopRecipientsChart';
import DateRangeFilter from './DateRangeFilter';
import ExportData from './ExportData';

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAnalytics(dateRange.startDate, dateRange.endDate);
      setAnalyticsData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDateRangeChange(newRange) {
    setDateRange(newRange);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading analytics: {error}</p>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Track tip statistics, trends, and insights</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <DateRangeFilter
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={handleDateRangeChange}
        />
        <ExportData data={analyticsData} />
      </div>

      <AnalyticsSummary summary={analyticsData.summary} />

      <div className="mt-8">
        <TipVolumeChart data={analyticsData.timeSeriesData} />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TopSendersChart data={analyticsData.topSenders} />
        <TopRecipientsChart data={analyticsData.topRecipients} />
      </div>
    </div>
  );
}
