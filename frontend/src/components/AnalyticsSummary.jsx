import { formatAmount } from '../services/analytics';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

export default function AnalyticsSummary({ summary }) {
  if (!summary) return null;

  const stats = [
    {
      label: 'Total Tips',
      value: summary.totalTips.toLocaleString(),
      icon: Activity,
      color: 'blue',
    },
    {
      label: 'Total Volume',
      value: `${formatAmount(summary.totalVolume)} STX`,
      icon: DollarSign,
      color: 'green',
    },
    {
      label: 'Average Tip',
      value: `${formatAmount(summary.avgTipAmount)} STX`,
      icon: TrendingUp,
      color: 'purple',
    },
    {
      label: 'Unique Users',
      value: (summary.uniqueSenders + summary.uniqueRecipients).toLocaleString(),
      icon: Users,
      color: 'orange',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 analytics-summary-grid">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition-shadow analytics-card"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className={`p-2 sm:p-3 rounded-lg ${colorClasses[stat.color]}`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
            <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-1">{stat.label}</h3>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}
