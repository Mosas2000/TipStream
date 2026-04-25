import { useState, useEffect, useCallback } from 'react';
import { analytics } from '../lib/analytics';
import { getEnvironmentLabel, getEnvironmentColor } from '../lib/telemetry-env';
import { computeVitalsSummary } from '../lib/telemetry-vitals';
import { computeTipFunnel, computeBatchFunnel, computeWalletDropOff, identifyDropOffPoints } from '../lib/telemetry-funnel';
import { downloadExport, exportToCsv, copyToClipboard } from '../lib/telemetry-export';
import { isSinkEnabled, getSinkConfig, sendSnapshot } from '../lib/telemetry-sink';
import { getStorageUsage } from '../lib/telemetry-storage';
import { useDemoMode } from '../context/DemoContext';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Download,
  Copy,
  RefreshCw,
  Gauge,
  Users,
  Zap,
  Clock,
  Server,
  FileJson,
  FileSpreadsheet,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

/**
 * TelemetryDashboard -- displays application performance metrics and error logs.
 * Note: Shared sub-components (MetricCard, AlertPanel, etc.) must be defined
 * at the top level to avoid "symbol has already been declared" errors during
 * Vite/Rollup transformation when build optimizations are enabled.
 */
export default function TelemetryDashboard({ addToast }) {
  const { demoEnabled } = useDemoMode();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    
    if (demoEnabled) {
      setTimeout(() => {
        setSummary({
          sessions: 42,
          totalPageViews: 156,
          tipsConfirmed: 28,
          tipCompletionRate: '84.2',
          tipDropOffRate: '15.8',
          batchTipsConfirmed: 5,
          batchCompletionRate: '92.0',
          totalErrors: 2,
          sortedPages: [
            ['/', 84],
            ['/leaderboard', 32],
            ['/profile', 28],
            ['/batch', 12]
          ],
          sortedErrors: [
            ['WalletConnectionError: User rejected', 2]
          ],
          webVitals: {
            LCP: { value: 1200, rating: 'good' },
            FID: { value: 12, rating: 'good' },
            CLS: { value: 0.02, rating: 'good' }
          },
          walletConnections: 45,
          walletDisconnections: 3,
          firstSeen: Date.now() - 86400000 * 2,
          lastSeen: Date.now()
        });
        setLoading(false);
      }, 500);
      return;
    }

    try {
      const data = analytics.getSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, [demoEnabled]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    loadData();
    addToast('Telemetry data refreshed', 'success');
  };

  const handleExportJson = async () => {
    setExporting(true);
    try {
      const filename = downloadExport({ includeAllEnvironments: true });
      addToast(`Exported to ${filename}`, 'success');
    } catch (err) {
      addToast('Export failed: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const filename = exportToCsv();
      addToast(`Exported to ${filename}`, 'success');
    } catch (err) {
      addToast('Export failed: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await copyToClipboard();
      addToast('Telemetry data copied to clipboard', 'success');
    } catch (err) {
      addToast('Copy failed: ' + err.message, 'error');
    }
  };

  const handleSyncToSink = async () => {
    if (demoEnabled) {
      setSyncing(true);
      await new Promise(r => setTimeout(r, 1000));
      addToast('Demo: Telemetry synced (simulated)', 'success');
      setSyncing(false);
      return;
    }

    setSyncing(true);
    try {
      const result = await sendSnapshot();
      if (result.success) {
        addToast('Telemetry synced to remote endpoint', 'success');
      } else {
        addToast('Sync failed: ' + (result.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      addToast('Sync failed: ' + err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all telemetry data? This cannot be undone.')) {
      if (!demoEnabled) analytics.reset();
      loadData();
      addToast('Telemetry data reset', 'success');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const vitalsSummary = computeVitalsSummary(summary?.webVitals || {});
  const tipFunnel = computeTipFunnel(summary || {});
  const batchFunnel = computeBatchFunnel(summary || {});
  const walletMetrics = computeWalletDropOff(summary || {});
  const dropOffIssues = identifyDropOffPoints(tipFunnel);
  const sinkEnabled = isSinkEnabled();
  const sinkConfig = getSinkConfig();
  const storageUsage = getStorageUsage();
  const envLabel = getEnvironmentLabel();
  const envColor = getEnvironmentColor();

  return (
    <div className="space-y-8">
      <DashboardHeader
        envLabel={demoEnabled ? 'DEMO' : envLabel}
        envColor={demoEnabled ? 'amber' : envColor}
        onRefresh={handleRefresh}
        onExportJson={handleExportJson}
        onExportCsv={handleExportCsv}
        onCopy={handleCopy}
        onSync={handleSyncToSink}
        onReset={handleReset}
        exporting={exporting}
        syncing={syncing}
        sinkEnabled={demoEnabled || sinkEnabled}
        demoEnabled={demoEnabled}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Sessions"
          value={summary?.sessions || 0}
        />
        <MetricCard
          icon={Activity}
          label="Page Views"
          value={summary?.totalPageViews || 0}
        />
        <MetricCard
          icon={Zap}
          label="Tips Confirmed"
          value={summary?.tipsConfirmed || 0}
        />
        <MetricCard
          icon={TrendingUp}
          label="Conversion Rate"
          value={`${summary?.tipCompletionRate || '0.0'}%`}
        />
      </div>

      {demoEnabled && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
          <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Sandbox Mode:</strong> Telemetry data is simulated for demonstration purposes.
          </p>
        </div>
      )}

      {dropOffIssues.length > 0 && !demoEnabled && (
        <AlertPanel issues={dropOffIssues} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WebVitalsPanel vitalsSummary={vitalsSummary} />
        <WalletMetricsPanel metrics={walletMetrics} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FunnelPanel title="Tip Conversion Funnel" funnel={tipFunnel} />
        <FunnelPanel title="Batch Tip Funnel" funnel={batchFunnel} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RouteUsagePanel sortedPages={summary?.sortedPages || []} />
        <ErrorLogPanel sortedErrors={summary?.sortedErrors || []} totalErrors={summary?.totalErrors || 0} />
      </div>

      <TelemetryFooter
        firstSeen={summary?.firstSeen}
        lastSeen={summary?.lastSeen}
        sinkEnabled={demoEnabled || sinkEnabled}
        sinkEndpoint={demoEnabled ? 'demo-endpoint.stacks.id' : sinkConfig.endpoint}
        storageUsage={demoEnabled ? { telemetryBytes: 2450 } : storageUsage}
      />
    </div>
  );
}

function DashboardHeader({
  envLabel,
  envColor,
  onRefresh,
  onExportJson,
  onExportCsv,
  onCopy,
  onSync,
  onReset,
  exporting,
  syncing,
  sinkEnabled,
  demoEnabled,
}) {
  const colorClasses = {
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    gray: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400',
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        <Gauge className="w-6 h-6 text-amber-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Telemetry Dashboard
        </h1>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClasses[envColor]}`}>
          {envLabel}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <button
          onClick={onExportJson}
          disabled={exporting}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <FileJson className="w-4 h-4" />
          JSON
        </button>
        <button
          onClick={onExportCsv}
          disabled={exporting}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4" />
          CSV
        </button>
        <button
          onClick={onCopy}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Copy className="w-4 h-4" />
          Copy
        </button>
        {sinkEnabled && (
          <button
            onClick={onSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Sync
          </button>
        )}
        {!demoEnabled && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function AlertPanel({ issues }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        <h3 className="font-semibold text-amber-800 dark:text-amber-300">Drop-off Issues Detected</h3>
      </div>
      <ul className="space-y-2">
        {issues.map((issue, index) => (
          <li key={index} className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${issue.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
            {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WebVitalsPanel({ vitalsSummary }) {
  const { vitals, overallScore, coreVitalsPassing } = vitalsSummary;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Gauge className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          Web Vitals
        </h3>
        {overallScore !== null && (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${coreVitalsPassing ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {coreVitalsPassing ? 'Passing' : 'Needs Work'}
            </span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{overallScore}</span>
          </div>
        )}
      </div>

      {vitals.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No Web Vitals data collected yet.</p>
      ) : (
        <div className="space-y-3">
          {vitals.map((vital) => (
            <div key={vital.name} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">{vital.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${vital.colors.bg} ${vital.colors.text}`}>
                    {vital.rating}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{vital.label}</p>
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {vital.formattedValue}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WalletMetricsPanel({ metrics }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        Wallet Metrics
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Connections</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics.connections}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Disconnections</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics.disconnections}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Retention Rate</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{metrics.retentionRate}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Drop-off Rate</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{metrics.dropOffRate}%</p>
        </div>
      </div>
    </div>
  );
}

function FunnelPanel({ title, funnel }) {
  const maxCount = Math.max(...funnel.stages.map(s => s.count), 1);
  const colors = [
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-green-500',
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          {title}
        </h3>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {funnel.overallConversion}% conversion
        </span>
      </div>

      <div className="space-y-3">
        {funnel.stages.map((stage, index) => (
          <div key={stage.id}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300">{stage.label}</span>
              <span className="font-medium text-gray-900 dark:text-white">{stage.count}</span>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
              <div
                className={`h-full ${colors[index]} transition-all duration-500`}
                style={{ width: `${Math.max(5, (stage.count / maxCount) * 100)}%` }}
              />
            </div>
            {stage.dropOffPercent > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {stage.dropOffPercent.toFixed(1)}% drop-off
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-4 text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          Cancelled: <span className="font-medium text-gray-900 dark:text-white">{funnel.cancelled}</span>
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          Failed: <span className="font-medium text-gray-900 dark:text-white">{funnel.failed}</span>
        </span>
      </div>
    </div>
  );
}

function RouteUsagePanel({ sortedPages }) {
  const maxViews = sortedPages.length > 0 ? Math.max(...sortedPages.map(([, count]) => count)) : 1;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        Route Usage
      </h3>

      {sortedPages.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No page views recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {sortedPages.slice(0, 10).map(([route, count]) => (
            <div key={route} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300 truncate font-mono text-xs">{route}</span>
                  <span className="font-medium text-gray-900 dark:text-white ml-2">{count}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-500 dark:bg-blue-600"
                    style={{ width: `${(count / maxViews) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ErrorLogPanel({ sortedErrors, totalErrors }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          Top Errors
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {totalErrors} total
        </span>
      </div>

      {sortedErrors.length === 0 ? (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm">No errors recorded</span>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedErrors.map(([error, count], index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <span className="font-medium text-red-600 dark:text-red-400 shrink-0">{count}x</span>
              <span className="text-gray-700 dark:text-gray-300 break-all font-mono text-xs">{error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TelemetryFooter({ firstSeen, lastSeen, sinkEnabled, sinkEndpoint, storageUsage }) {
  const formatDate = (ts) => ts ? new Date(ts).toLocaleString() : 'Never';
  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex flex-wrap gap-6 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>First seen: {formatDate(firstSeen)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>Last seen: {formatDate(lastSeen)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4" />
          <span>
            Sink: {sinkEnabled ? (
              <span className="text-green-600 dark:text-green-400">{sinkEndpoint}</span>
            ) : (
              <span className="text-gray-400">Not configured</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          <span>Storage: {formatBytes(storageUsage.telemetryBytes)}</span>
        </div>
      </div>
    </div>
  );
}


