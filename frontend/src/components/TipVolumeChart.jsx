import { formatAmount } from '../services/analytics';
import { useState, useEffect, useMemo } from 'react';

/**
 * Custom Premium SVG-based Chart to avoid external charting library dependencies (like Recharts)
 * which can cause installation timeouts/failures in offline or restricted environments.
 * 
 * Provides interactive tooltips, line/bar toggle, and mobile responsiveness.
 */
export default function TipVolumeChart({ data }) {
  const [chartType, setChartType] = useState('line');
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Tip Volume Over Time</h2>
        <p className="text-gray-600 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  const chartData = useMemo(() => {
    return data.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      tips: item.count,
      volume: Number(formatAmount(item.volume)),
    }));
  }, [data]);

  const maxTips = useMemo(() => {
    const vals = chartData.map(d => d.tips);
    return Math.max(...vals, 1);
  }, [chartData]);

  const maxVolume = useMemo(() => {
    const vals = chartData.map(d => d.volume);
    return Math.max(...vals, 1);
  }, [chartData]);

  const svgWidth = 800;
  const svgHeight = 350;
  const paddingLeft = 50;
  const paddingRight = 50;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const points = useMemo(() => {
    if (chartData.length === 0) return [];
    
    return chartData.map((d, index) => {
      const x = paddingLeft + (index / Math.max(chartData.length - 1, 1)) * chartWidth;
      
      const yTips = paddingTop + chartHeight - (d.tips / maxTips) * chartHeight;
      const yVolume = paddingTop + chartHeight - (d.volume / maxVolume) * chartHeight;
      
      return { x, yTips, yVolume, ...d };
    });
  }, [chartData, chartWidth, chartHeight, maxTips, maxVolume]);

  const linePathTips = useMemo(() => {
    if (points.length < 2) return '';
    return points.reduce((path, p, i) => {
      return i === 0 ? `M ${p.x} ${p.yTips}` : `${path} L ${p.x} ${p.yTips}`;
    }, '');
  }, [points]);

  const linePathVolume = useMemo(() => {
    if (points.length < 2) return '';
    return points.reduce((path, p, i) => {
      return i === 0 ? `M ${p.x} ${p.yVolume}` : `${path} L ${p.x} ${p.yVolume}`;
    }, '');
  }, [points]);

  const areaPathTips = useMemo(() => {
    if (points.length < 2) return '';
    const baseLine = paddingTop + chartHeight;
    return `${linePathTips} L ${points[points.length - 1].x} ${baseLine} L ${points[0].x} ${baseLine} Z`;
  }, [points, linePathTips, chartHeight]);

  const areaPathVolume = useMemo(() => {
    if (points.length < 2) return '';
    const baseLine = paddingTop + chartHeight;
    return `${linePathVolume} L ${points[points.length - 1].x} ${baseLine} L ${points[0].x} ${baseLine} Z`;
  }, [points, linePathVolume, chartHeight]);

  const selectedPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6 analytics-chart-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Tip Volume Over Time</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
              chartType === 'line'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            aria-label="Switch to line chart"
          >
            Line
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
              chartType === 'bar'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            aria-label="Switch to bar chart"
          >
            Bar
          </button>
        </div>
      </div>

      {selectedPoint && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 animate-fade-in">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{selectedPoint.date}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
            Tips: <span className="font-bold text-blue-600 dark:text-blue-400">{selectedPoint.tips}</span>
            {' | '}
            Volume: <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedPoint.volume.toFixed(2)} STX</span>
          </p>
        </div>
      )}

      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          height="100%"
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="tipsAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="volumeAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = paddingTop + chartHeight * ratio;
            return (
              <line
                key={i}
                x1={paddingLeft}
                y1={y}
                x2={svgWidth - paddingRight}
                y2={y}
                stroke="#f3f4f6"
                className="dark:stroke-gray-800"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            );
          })}

          <text
            x={paddingLeft - 10}
            y={paddingTop - 10}
            textAnchor="end"
            className="text-[10px] font-bold fill-blue-500"
          >
            Tips
          </text>
          {[0, 0.5, 1].map((ratio, i) => {
            const val = Math.round(maxTips * ratio);
            const y = paddingTop + chartHeight - (ratio * chartHeight);
            return (
              <text
                key={i}
                x={paddingLeft - 10}
                y={y + 3}
                textAnchor="end"
                className="text-[10px] font-medium fill-gray-400 dark:fill-gray-600"
              >
                {val}
              </text>
            );
          })}

          <text
            x={svgWidth - paddingRight + 10}
            y={paddingTop - 10}
            textAnchor="start"
            className="text-[10px] font-bold fill-emerald-500"
          >
            STX
          </text>
          {[0, 0.5, 1].map((ratio, i) => {
            const val = (maxVolume * ratio).toFixed(1);
            const y = paddingTop + chartHeight - (ratio * chartHeight);
            return (
              <text
                key={i}
                x={svgWidth - paddingRight + 10}
                y={y + 3}
                textAnchor="start"
                className="text-[10px] font-medium fill-gray-400 dark:fill-gray-600"
              >
                {val}
              </text>
            );
          })}

          {points.map((p, index) => {
            if (isMobile && index % 2 !== 0) return null;
            if (points.length > 10 && index % 2 !== 0) return null;

            return (
              <text
                key={index}
                x={p.x}
                y={paddingTop + chartHeight + 20}
                textAnchor="middle"
                className="text-[10px] font-medium fill-gray-400 dark:fill-gray-500"
              >
                {p.date}
              </text>
            );
          })}

          {chartType === 'line' ? (
            <>
              <path d={areaPathTips} fill="url(#tipsAreaGradient)" />
              <path d={areaPathVolume} fill="url(#volumeAreaGradient)" />

              <path
                d={linePathTips}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={linePathVolume}
                fill="none"
                stroke="#10b981"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {points.map((p, index) => {
                const isHovered = hoveredIndex === index;
                return (
                  <g key={index}>
                    <circle
                      cx={p.x}
                      cy={p.yTips}
                      r={15}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                    <circle
                      cx={p.x}
                      cy={p.yTips}
                      r={isHovered ? 6 : 4}
                      fill="#3b82f6"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      className="pointer-events-none transition-all duration-150"
                    />
                    <circle
                      cx={p.x}
                      cy={p.yVolume}
                      r={isHovered ? 6 : 4}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      className="pointer-events-none transition-all duration-150"
                    />
                  </g>
                );
              })}
            </>
          ) : (
            <>
              {points.map((p, index) => {
                const isHovered = hoveredIndex === index;
                const barWidth = Math.max(10, Math.min(30, chartWidth / (points.length * 2.5)));
                const gap = 2;

                const baseLine = paddingTop + chartHeight;
                const hTips = baseLine - p.yTips;
                const hVolume = baseLine - p.yVolume;

                return (
                  <g
                    key={index}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <rect
                      x={p.x - barWidth - gap / 2}
                      y={p.yTips}
                      width={barWidth}
                      height={Math.max(2, hTips)}
                      fill={isHovered ? '#2563eb' : '#3b82f6'}
                      rx={3}
                      className="transition-colors duration-150"
                    />
                    <rect
                      x={p.x + gap / 2}
                      y={p.yVolume}
                      width={barWidth}
                      height={Math.max(2, hVolume)}
                      fill={isHovered ? '#059669' : '#10b981'}
                      rx={3}
                      className="transition-colors duration-150"
                    />
                  </g>
                );
              })}
            </>
          )}

          {points.map((p, index) => {
            const barWidth = chartWidth / points.length;
            return (
              <rect
                key={index}
                x={p.x - barWidth / 2}
                y={paddingTop}
                width={barWidth}
                height={chartHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </svg>
      </div>

      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-blue-500" />
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Number of Tips</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Volume (STX)</span>
        </div>
      </div>
    </div>
  );
}
