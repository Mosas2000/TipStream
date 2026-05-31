import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatAmount } from '../services/analytics';
import { useState, useEffect } from 'react';

export default function TipVolumeChart({ data }) {
  const [chartType, setChartType] = useState('line');
  const [isMobile, setIsMobile] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Tip Volume Over Time</h2>
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    tips: item.count,
    volume: Number(formatAmount(item.volume)),
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{payload[0].payload.date}</p>
          <p className="text-sm text-gray-600">
            Tips: <span className="font-semibold text-blue-600">{payload[0].value}</span>
          </p>
          <p className="text-sm text-gray-600">
            Volume: <span className="font-semibold text-green-600">{payload[1].value} STX</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const handleChartClick = (data) => {
    if (data && data.activePayload) {
      setSelectedPoint(data.activePayload[0].payload);
    }
  };

  const chartHeight = isMobile ? 300 : 400;

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 analytics-chart-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Tip Volume Over Time</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1 rounded text-sm ${
              chartType === 'line'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            aria-label="Switch to line chart"
          >
            Line
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 rounded text-sm ${
              chartType === 'bar'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            aria-label="Switch to bar chart"
          >
            Bar
          </button>
        </div>
      </div>

      {selectedPoint && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-semibold text-gray-900">{selectedPoint.date}</p>
          <p className="text-sm text-gray-600">
            Tips: <span className="font-semibold text-blue-600">{selectedPoint.tips}</span>
            {' | '}
            Volume: <span className="font-semibold text-green-600">{selectedPoint.volume} STX</span>
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height={chartHeight}>
        {chartType === 'line' ? (
          <LineChart data={chartData} onClick={handleChartClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              tick={{ fontSize: isMobile ? 10 : 12 }}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 60 : 30}
            />
            <YAxis yAxisId="left" stroke="#3b82f6" tick={{ fontSize: isMobile ? 10 : 12 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: isMobile ? 10 : 12 }} />
            <Tooltip content={<CustomTooltip />} />
            {!isMobile && <Legend />}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="tips"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: isMobile ? 3 : 4 }}
              activeDot={{ r: isMobile ? 5 : 6 }}
              name="Number of Tips"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="volume"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: isMobile ? 3 : 4 }}
              activeDot={{ r: isMobile ? 5 : 6 }}
              name="Volume (STX)"
            />
          </LineChart>
        ) : (
          <BarChart data={chartData} onClick={handleChartClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              tick={{ fontSize: isMobile ? 10 : 12 }}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 60 : 30}
            />
            <YAxis yAxisId="left" stroke="#3b82f6" tick={{ fontSize: isMobile ? 10 : 12 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: isMobile ? 10 : 12 }} />
            <Tooltip content={<CustomTooltip />} />
            {!isMobile && <Legend />}
            <Bar yAxisId="left" dataKey="tips" fill="#3b82f6" name="Number of Tips" />
            <Bar yAxisId="right" dataKey="volume" fill="#10b981" name="Volume (STX)" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
