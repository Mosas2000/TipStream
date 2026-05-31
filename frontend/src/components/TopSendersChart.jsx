import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatAmount, formatAddress } from '../services/analytics';
import { useState, useEffect } from 'react';

export default function TopSendersChart({ data }) {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedSender, setSelectedSender] = useState(null);

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
        <h2 className="text-xl font-bold text-gray-900 mb-4">Top Senders</h2>
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  const chartData = data.map(item => ({
    address: formatAddress(item.address),
    fullAddress: item.address,
    volume: Number(formatAmount(item.volume)),
    count: item.count,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2 text-xs break-all">
            {payload[0].payload.fullAddress}
          </p>
          <p className="text-sm text-gray-600">
            Tips Sent: <span className="font-semibold text-blue-600">{payload[0].payload.count}</span>
          </p>
          <p className="text-sm text-gray-600">
            Total Volume: <span className="font-semibold text-green-600">{payload[0].value} STX</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const handleBarClick = (data) => {
    if (data && data.fullAddress) {
      setSelectedSender(data);
    }
  };

  const chartHeight = isMobile ? 250 : 400;
  const displayData = isMobile ? chartData.slice(0, 5) : chartData;

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 analytics-chart-container">
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">Top Senders</h2>
      
      {selectedSender && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs font-mono text-gray-900 break-all mb-1">{selectedSender.fullAddress}</p>
          <p className="text-sm text-gray-600">
            Volume: <span className="font-semibold text-green-600">{selectedSender.volume} STX</span>
            {' | '}
            Tips: <span className="font-semibold text-blue-600">{selectedSender.count}</span>
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={displayData} layout="vertical" onClick={handleBarClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" stroke="#6b7280" tick={{ fontSize: isMobile ? 10 : 12 }} />
          <YAxis 
            dataKey="address" 
            type="category" 
            stroke="#6b7280" 
            width={isMobile ? 60 : 80}
            tick={{ fontSize: isMobile ? 9 : 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="volume" fill="#3b82f6" name="Volume (STX)" />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Detailed Rankings</h3>
        <div className="space-y-2">
          {data.slice(0, 5).map((sender, index) => (
            <div 
              key={sender.address} 
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => setSelectedSender({
                fullAddress: sender.address,
                volume: formatAmount(sender.volume),
                count: sender.count
              })}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                  {index + 1}
                </span>
                <span className="text-xs sm:text-sm font-mono text-gray-700">{formatAddress(sender.address)}</span>
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm font-semibold text-gray-900">{formatAmount(sender.volume)} STX</p>
                <p className="text-xs text-gray-500">{sender.count} tips</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
