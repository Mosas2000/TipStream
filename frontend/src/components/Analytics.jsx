import { useState, useEffect } from 'react';
import { fetchAnalytics } from '../services/analytics';
import AnalyticsSummary from './AnalyticsSummary';
import TipVolumeChart from './TipVolumeChart';
import TopSendersChart from './TopSendersChart';
import TopRecipientsChart from './TopRecipientsChart';
import DateRangeFilter from './DateRangeFilter';
import ExportData from './ExportData';
import AnalyticsErrorBoundary from './AnalyticsErrorBoundary';
import AnalyticsLoadingSkeleton from './AnalyticsLoadingSkeleton';
import { RefreshCw } from 'lucide-react';
import '../styles/analytics.css';

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadAnalytics(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [dateRange]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  async function loadAnalytics(isAutoRefresh = false) {
    try {
      if (!isAutoRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      const data = await fetchAnalytics(dateRange.startDate, dateRange.endDate);
      setAnalyticsData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    loadAnalytics();
  }

  function handleDateRangeChange(newRange) {
    setDateRange(newRange);
  }

  if (loading) {
    return <AnalyticsLoadingSkeleton />;
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
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Track tip statistics, trends, and insights</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Refresh analytics data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <DateRangeFilter
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={handleDateRangeChange}
        />
        <ExportData data={analyticsData} />
      </div>

      <AnalyticsErrorBoundary title="Summary Statistics">
        <AnalyticsSummary summary={analyticsData.summary} />
      </AnalyticsErrorBoundary>

      <div className="mt-8">
        <AnalyticsErrorBoundary title="Tip Volume Chart">
          <TipVolumeChart data={analyticsData.timeSeriesData} />
        </AnalyticsErrorBoundary>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AnalyticsErrorBoundary title="Top Senders">
          <TopSendersChart data={analyticsData.topSenders} />
        </AnalyticsErrorBoundary>
        <AnalyticsErrorBoundary title="Top Recipients">
          <TopRecipientsChart data={analyticsData.topRecipients} />
        </AnalyticsErrorBoundary>
      </div>
    </div>
  );
}
