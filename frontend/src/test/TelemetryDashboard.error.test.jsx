import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TelemetryDashboard from '../components/TelemetryDashboard';

const mockAnalytics = {
  getSummary: vi.fn(),
  reset: vi.fn(),
};

vi.mock('../lib/analytics', () => ({
  analytics: mockAnalytics,
}));

vi.mock('../context/DemoContext', () => ({
  useDemoMode: vi.fn(() => ({
    demoEnabled: false,
    setDemoBalance: vi.fn(),
  })),
}));

vi.mock('../lib/telemetry-env', () => ({
  getEnvironmentLabel: vi.fn(() => 'PRODUCTION'),
  getEnvironmentColor: vi.fn(() => 'green'),
}));

vi.mock('../lib/telemetry-vitals', () => ({
  computeVitalsSummary: vi.fn(() => ({
    vitals: [],
    overallScore: null,
    coreVitalsPassing: false,
  })),
}));

vi.mock('../lib/telemetry-funnel', () => ({
  computeTipFunnel: vi.fn(() => ({
    stages: [],
    overallConversion: 0,
    cancelled: 0,
    failed: 0,
  })),
  computeBatchFunnel: vi.fn(() => ({
    stages: [],
    overallConversion: 0,
    cancelled: 0,
    failed: 0,
  })),
  computeWalletDropOff: vi.fn(() => ({
    connections: 0,
    disconnections: 0,
    retentionRate: 0,
    dropOffRate: 0,
  })),
  identifyDropOffPoints: vi.fn(() => []),
}));

vi.mock('../lib/telemetry-export', () => ({
  downloadExport: vi.fn(() => 'export.json'),
  exportToCsv: vi.fn(() => 'export.csv'),
  copyToClipboard: vi.fn(),
}));

vi.mock('../lib/telemetry-sink', () => ({
  isSinkEnabled: vi.fn(() => false),
  getSinkConfig: vi.fn(() => ({ endpoint: '' })),
  sendSnapshot: vi.fn(),
}));

vi.mock('../lib/telemetry-storage', () => ({
  getStorageUsage: vi.fn(() => ({ telemetryBytes: 0 })),
}));

describe('TelemetryDashboard error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays error state when analytics.getSummary throws', async () => {
    const errorMessage = 'Analytics service unavailable';
    mockAnalytics.getSummary.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('shows retry button in error state', async () => {
    mockAnalytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  it('keeps export buttons available during error state', async () => {
    mockAnalytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      const exportJsonButton = screen.getByRole('button', { name: /export json/i });
      const exportCsvButton = screen.getByRole('button', { name: /export csv/i });
      expect(exportJsonButton).toBeInTheDocument();
      expect(exportCsvButton).toBeInTheDocument();
    });
  });

  it('allows retry after error', async () => {
    const user = userEvent.setup();
    mockAnalytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    const { rerender } = render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
    });

    mockAnalytics.getSummary.mockReturnValue({
      sessions: 10,
      totalPageViews: 50,
      tipsConfirmed: 5,
      tipCompletionRate: '50',
      tipDropOffRate: '50',
      batchTipsConfirmed: 1,
      batchCompletionRate: '100',
      totalErrors: 0,
      sortedPages: [],
      sortedErrors: [],
      webVitals: {},
      walletConnections: 5,
      walletDisconnections: 0,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.queryByText('Failed to Load Telemetry Data')).not.toBeInTheDocument();
    });
  });

  it('clears error when data loads successfully', async () => {
    mockAnalytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    const { rerender } = render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
    });

    mockAnalytics.getSummary.mockReturnValue({
      sessions: 10,
      totalPageViews: 50,
      tipsConfirmed: 5,
      tipCompletionRate: '50',
      tipDropOffRate: '50',
      batchTipsConfirmed: 1,
      batchCompletionRate: '100',
      totalErrors: 0,
      sortedPages: [],
      sortedErrors: [],
      webVitals: {},
      walletConnections: 5,
      walletDisconnections: 0,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    });

    rerender(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText('Failed to Load Telemetry Data')).not.toBeInTheDocument();
    });
  });

  it('displays generic error message for unknown errors', async () => {
    mockAnalytics.getSummary.mockImplementation(() => {
      throw new Error();
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
    });
  });

  it('shows error with specific message from exception', async () => {
    const specificError = 'Database connection timeout';
    mockAnalytics.getSummary.mockImplementation(() => {
      throw new Error(specificError);
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(specificError)).toBeInTheDocument();
    });
  });

  it('maintains error state across re-renders', async () => {
    mockAnalytics.getSummary.mockImplementation(() => {
      throw new Error('Persistent error');
    });

    const { rerender } = render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
    });

    rerender(<TelemetryDashboard addToast={vi.fn()} />);

    expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
  });

  it('exports JSON even when data load fails', async () => {
    const user = userEvent.setup();
    const mockDownloadExport = vi.fn(() => 'export.json');
    
    vi.doMock('../lib/telemetry-export', () => ({
      downloadExport: mockDownloadExport,
      exportToCsv: vi.fn(() => 'export.csv'),
      copyToClipboard: vi.fn(),
    }));

    mockAnalytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    const addToast = vi.fn();
    render(<TelemetryDashboard addToast={addToast} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
    });

    const exportJsonButton = screen.getByRole('button', { name: /export json/i });
    await user.click(exportJsonButton);

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Exported'), 'success');
    });
  });

  it('exports CSV even when data load fails', async () => {
    const user = userEvent.setup();
    const mockExportCsv = vi.fn(() => 'export.csv');
    
    vi.doMock('../lib/telemetry-export', () => ({
      downloadExport: vi.fn(() => 'export.json'),
      exportToCsv: mockExportCsv,
      copyToClipboard: vi.fn(),
    }));

    mockAnalytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    const addToast = vi.fn();
    render(<TelemetryDashboard addToast={addToast} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
    });

    const exportCsvButton = screen.getByRole('button', { name: /export csv/i });
    await user.click(exportCsvButton);

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Exported'), 'success');
    });
  });
});
