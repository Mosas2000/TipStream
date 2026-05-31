import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatAmount, formatAddress } from '../services/analytics';

export default function TopSendersChart({ data }) {
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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Top Senders</h2>
      
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" stroke="#6b7280" />
          <YAxis dataKey="address" type="category" stroke="#6b7280" width={80} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="volume" fill="#3b82f6" name="Volume (STX)" />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Detailed Rankings</h3>
        <div className="space-y-2">
          {data.slice(0, 5).map((sender, index) => (
            <div key={sender.address} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                  {index + 1}
                </span>
                <span className="text-sm font-mono text-gray-700">{formatAddress(sender.address)}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{formatAmount(sender.volume)} STX</p>
                <p className="text-xs text-gray-500">{sender.count} tips</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
