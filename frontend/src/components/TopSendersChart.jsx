import { formatAmount, formatAddress } from '../services/analytics';
import { useState, useEffect, useMemo } from 'react';

/**
 * Custom Premium SVG/CSS-based Chart to avoid external charting library dependencies (like Recharts)
 * which can cause installation timeouts/failures in offline or restricted environments.
 * 
 * Provides interactive rankings, hover tooltips, and high mobile responsiveness.
 */
export default function TopSendersChart({ data }) {
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);

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
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Top Senders</h2>
        <p className="text-gray-600 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  const chartData = useMemo(() => {
    return data.map(item => ({
      address: formatAddress(item.address),
      fullAddress: item.address,
      volume: Number(formatAmount(item.volume)),
      count: item.count,
    }));
  }, [data]);

  const displayData = useMemo(() => {
    return isMobile ? chartData.slice(0, 5) : chartData;
  }, [chartData, isMobile]);

  const maxVolume = useMemo(() => {
    const vals = displayData.map(d => d.volume);
    return Math.max(...vals, 1);
  }, [displayData]);

  const selectedPoint = hoveredIndex !== null ? displayData[hoveredIndex] : null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6 analytics-chart-container">
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-6">Top Senders</h2>
      
      {selectedPoint && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 animate-fade-in">
          <p className="text-xs font-mono text-gray-900 dark:text-gray-100 break-all mb-1">{selectedPoint.fullAddress}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Volume: <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedPoint.volume.toFixed(2)} STX</span>
            {' | '}
            Tips: <span className="font-bold text-blue-600 dark:text-blue-400">{selectedPoint.count}</span>
          </p>
        </div>
      )}

      <div className="relative w-full overflow-hidden select-none">
        <div className="flex flex-col gap-4">
          {displayData.map((d, index) => {
            const isHovered = hoveredIndex === index;
            const percentage = (d.volume / maxVolume) * 100;
            return (
              <div
                key={d.fullAddress}
                className="flex items-center gap-3 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="w-16 sm:w-20 text-left">
                  <span className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400">
                    {d.address}
                  </span>
                </div>

                <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-full h-7 overflow-hidden border border-gray-100 dark:border-gray-850 relative">
                  <div
                    style={{ width: `${Math.max(5, percentage)}%` }}
                    className={`h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 relative flex items-center justify-end px-3 ${
                      isHovered ? 'brightness-110 shadow-sm' : ''
                    }`}
                  >
                    {percentage > 15 && (
                      <span className="text-[10px] font-bold text-white leading-none">
                        {d.volume.toFixed(1)} STX
                      </span>
                    )}
                  </div>
                  {percentage <= 15 && (
                    <span className="absolute left-[calc(15%+8px)] top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 dark:text-gray-400 leading-none pl-2">
                      {d.volume.toFixed(1)} STX
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Detailed Rankings</h3>
        <div className="space-y-2">
          {data.slice(0, 5).map((sender, index) => (
            <div 
              key={sender.address} 
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/80 border border-gray-100/50 dark:border-gray-800/40 transition-colors cursor-pointer"
              onClick={() => setHoveredIndex(index)}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold">
                  {index + 1}
                </span>
                <span className="text-xs sm:text-sm font-mono text-gray-700 dark:text-gray-300">{formatAddress(sender.address)}</span>
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">{formatAmount(sender.volume)} STX</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{sender.count} tips</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
