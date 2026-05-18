import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import RefundHistory from './RefundHistory';

vi.mock('../context/DemoContext', () => ({
  useDemoMode: () => ({ demoEnabled: false }),
}));

const mockFetchUserRefunds = vi.fn();

vi.mock('../hooks/useRefund', () => ({
  useRefund: () => ({
    loading: false,
    error: null,
    fetchUserRefunds: mockFetchUserRefunds,
    requestRefund: vi.fn(),
    resolveRefund: vi.fn(),
    fetchRefundRequest: vi.fn(),
    isWithinRefundWindow: vi.fn(() => true),
  }),
}));

const USER = 'SP1SENDER000000000000000000000000000';

function makeRefundRequest(overrides = {}) {
  return {
    tipId: 'tip-1',
    txId: '0xabc',
    sender: USER,
    recipient: 'SP2RECIPIENT00000000000000000000000',
    amount: 95000,
    status: 'pending',
    reason: 'wrong address',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: null,
    refundTxId: null,
    ...overrides,
  };
}

describe('RefundHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    mockFetchUserRefunds.mockReturnValue(new Promise(() => {}));
    render(<RefundHistory userAddress={USER} />);
    expect(screen.getByText(/loading refund history/i)).toBeInTheDocument();
  });

  it('shows empty state when no requests exist', async () => {
    mockFetchUserRefunds.mockResolvedValue({ ok: true, refundRequests: [], total: 0 });
    render(<RefundHistory userAddress={USER} />);
    await waitFor(() => {
      expect(screen.getByText(/no refund requests found/i)).toBeInTheDocument();
    });
  });

  it('renders a pending refund request', async () => {
    const request = makeRefundRequest();
    mockFetchUserRefunds.mockResolvedValue({ ok: true, refundRequests: [request], total: 1 });
    render(<RefundHistory userAddress={USER} />);
    await waitFor(() => {
      const spans = screen.getAllByText('Pending');
      expect(spans.some(el => el.tagName === 'SPAN')).toBe(true);
    });
  });

  it('renders an approved refund request', async () => {
    const request = makeRefundRequest({ tipId: 'tip-2', status: 'approved', resolvedAt: new Date().toISOString() });
    mockFetchUserRefunds.mockResolvedValue({ ok: true, refundRequests: [request], total: 1 });
    render(<RefundHistory userAddress={USER} />);
    await waitFor(() => {
      const spans = screen.getAllByText('Approved');
      expect(spans.some(el => el.tagName === 'SPAN')).toBe(true);
    });
  });

  it('renders a rejected refund request', async () => {
    const request = makeRefundRequest({ tipId: 'tip-3', status: 'rejected', resolvedAt: new Date().toISOString() });
    mockFetchUserRefunds.mockResolvedValue({ ok: true, refundRequests: [request], total: 1 });
    render(<RefundHistory userAddress={USER} />);
    await waitFor(() => {
      const spans = screen.getAllByText('Rejected');
      expect(spans.some(el => el.tagName === 'SPAN')).toBe(true);
    });
  });

  it('shows the refund amount', async () => {
    const request = makeRefundRequest();
    mockFetchUserRefunds.mockResolvedValue({ ok: true, refundRequests: [request], total: 1 });
    render(<RefundHistory userAddress={USER} />);
    await waitFor(() => {
      expect(screen.getByText(/0\.10\s*STX/i)).toBeInTheDocument();
    });
  });

  it('shows the reason when present', async () => {
    const request = makeRefundRequest({ reason: 'wrong address' });
    mockFetchUserRefunds.mockResolvedValue({ ok: true, refundRequests: [request], total: 1 });
    render(<RefundHistory userAddress={USER} />);
    await waitFor(() => {
      expect(screen.getByText(/wrong address/i)).toBeInTheDocument();
    });
  });

  it('shows error state and retry button on failure', async () => {
    mockFetchUserRefunds.mockResolvedValue({ ok: false, error: 'Network error' });
    render(<RefundHistory userAddress={USER} />);
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('renders the Refund History heading', async () => {
    mockFetchUserRefunds.mockResolvedValue({ ok: true, refundRequests: [], total: 0 });
    render(<RefundHistory userAddress={USER} />);
    await waitFor(() => {
      expect(screen.getByText('Refund History')).toBeInTheDocument();
    });
  });

  it('renders direction filter tabs', async () => {
    mockFetchUserRefunds.mockResolvedValue({ ok: true, refundRequests: [], total: 0 });
    render(<RefundHistory userAddress={USER} />);
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /sent/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /received/i })).toBeInTheDocument();
    });
  });

  it('renders status filter dropdown', async () => {
    mockFetchUserRefunds.mockResolvedValue({ ok: true, refundRequests: [], total: 0 });
    render(<RefundHistory userAddress={USER} />);
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('shows empty state when userAddress is null', async () => {
    mockFetchUserRefunds.mockResolvedValue({ ok: true, refundRequests: [], total: 0 });
    render(<RefundHistory userAddress={null} />);
    await waitFor(() => {
      expect(screen.getByText(/no refund requests found/i)).toBeInTheDocument();
    });
  });
});
