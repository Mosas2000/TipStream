import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/analytics', () => ({
  analytics: {
    getSummary: vi.fn(),
    reset: vi.fn(),
  },
}));

import TelemetryDashboard from '../components/TelemetryDashboard';
import { analytics } from '../lib/analytics';

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
    analytics.getSummary.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('shows retry button in error state', async () => {
    analytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  it('keeps export buttons available during error state', async () => {
    analytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      const exportJsonButton = screen.getByLabelText('Export telemetry data as JSON');
      const exportCsvButton = screen.getByLabelText('Export telemetry data as CSV');
      expect(exportJsonButton).toBeInTheDocument();
      expect(exportCsvButton).toBeInTheDocument();
    });
  });

  it('allows retry after error', async () => {
    const user = userEvent.setup();
    analytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    const { rerender } = render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
    });

    analytics.getSummary.mockReturnValue({
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
    const user = userEvent.setup();
    analytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
    });

    analytics.getSummary.mockReturnValue({
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

  it('displays generic error message for unknown errors', async () => {
    analytics.getSummary.mockImplementation(() => {
      throw new Error();
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
    });
  });

  it('shows error with specific message from exception', async () => {
    const specificError = 'Database connection timeout';
    analytics.getSummary.mockImplementation(() => {
      throw new Error(specificError);
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(specificError)).toBeInTheDocument();
    });
  });

  it('maintains error state across re-renders', async () => {
    analytics.getSummary.mockImplementation(() => {
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

    analytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    const addToast = vi.fn();
    render(<TelemetryDashboard addToast={addToast} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
    });

    const exportJsonButton = screen.getByLabelText('Export telemetry data as JSON');
    await user.click(exportJsonButton);

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Exported'), 'success');
    });
  });

  it('exports CSV even when data load fails', async () => {
    const user = userEvent.setup();

    analytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    const addToast = vi.fn();
    render(<TelemetryDashboard addToast={addToast} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
    });

    const exportCsvButton = screen.getByLabelText('Export telemetry data as CSV');
    await user.click(exportCsvButton);

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Exported'), 'success');
    });
  });

  it('displays error message in monospace font', async () => {
    const errorMessage = 'Connection refused: localhost:5432';
    analytics.getSummary.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      const errorElement = screen.getByText(errorMessage);
      expect(errorElement).toBeInTheDocument();
      expect(errorElement.className).toContain('font-mono');
    });
  });

  it('shows alert icon in error state', async () => {
    analytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    const { container } = render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      const alertIcon = container.querySelector('svg[class*="text-red-500"]');
      expect(alertIcon).toBeInTheDocument();
    });
  });

  it('clears loading state when error occurs', async () => {
    analytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
    });
  });

  it('error container has alert role for accessibility', async () => {
    analytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      const alertContainer = screen.getByRole('alert');
      expect(alertContainer).toBeInTheDocument();
      expect(alertContainer).toHaveAttribute('aria-live', 'assertive');
    });
  });

  it('buttons have descriptive aria labels in error state', async () => {
    analytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Retry loading telemetry data')).toBeInTheDocument();
      expect(screen.getByLabelText('Export telemetry data as JSON')).toBeInTheDocument();
      expect(screen.getByLabelText('Export telemetry data as CSV')).toBeInTheDocument();
    });
  });

  it('export buttons are enabled in error state', async () => {
    analytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      const exportJsonButton = screen.getByLabelText('Export telemetry data as JSON');
      const exportCsvButton = screen.getByLabelText('Export telemetry data as CSV');
      expect(exportJsonButton).not.toBeDisabled();
      expect(exportCsvButton).not.toBeDisabled();
    });
  });

  it('handles string errors gracefully', async () => {
    analytics.getSummary.mockImplementation(() => {
      throw 'String error message';
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
      expect(screen.getByText('String error message')).toBeInTheDocument();
    });
  });

  it('does not show error state when data loads successfully', async () => {
    analytics.getSummary.mockReturnValue({
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

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText('Failed to Load Telemetry Data')).not.toBeInTheDocument();
      expect(screen.getByText('Telemetry Dashboard')).toBeInTheDocument();
    });
  });

  it('handles null error with fallback message', async () => {
    analytics.getSummary.mockImplementation(() => {
      throw null;
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
    });
  });

  it('retry button triggers data reload', async () => {
    const user = userEvent.setup();
    let callCount = 0;
    
    analytics.getSummary.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error('First attempt failed');
      }
      return {
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
      };
    });

    render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Telemetry Data')).toBeInTheDocument();
    });

    const retryButton = screen.getByLabelText('Retry loading telemetry data');
    await user.click(retryButton);

    await waitFor(() => {
      expect(callCount).toBe(2);
      expect(screen.queryByText('Failed to Load Telemetry Data')).not.toBeInTheDocument();
    });
  });

  it('error message container has proper styling', async () => {
    analytics.getSummary.mockImplementation(() => {
      throw new Error('Service error');
    });

    const { container } = render(<TelemetryDashboard addToast={vi.fn()} />);

    await waitFor(() => {
      const errorMessage = screen.getByText('Service error');
      expect(errorMessage.className).toContain('bg-gray-50');
      expect(errorMessage.className).toContain('border');
    });
  });
});
