import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RefundRequest from './RefundRequest';
import { isWithinRefundWindow } from '../hooks/useRefund';

vi.mock('@stacks/connect', () => ({
  openContractCall: vi.fn(),
}));

vi.mock('../utils/stacks', () => ({
  network: {},
  appDetails: { name: 'TipStream', icon: '' },
}));

vi.mock('../config/contracts', () => ({
  CONTRACT_ADDRESS: 'SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60',
  CONTRACT_NAME: 'tipstream',
  FN_REQUEST_REFUND: 'request-refund',
}));

vi.mock('../context/DemoContext', () => ({
  useDemoMode: () => ({ demoEnabled: false }),
}));

vi.mock('../hooks/useRefund', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useRefund: () => ({
      loading: false,
      error: null,
      requestRefund: vi.fn().mockResolvedValue({ ok: true, refundRequest: { tipId: '42', status: 'pending' } }),
      resolveRefund: vi.fn(),
      fetchRefundRequest: vi.fn(),
      fetchUserRefunds: vi.fn(),
      isWithinRefundWindow: actual.isWithinRefundWindow,
    }),
  };
});

const SENDER = 'SP1SENDER000000000000000000000000000';
const RECIPIENT = 'SP2RECIPIENT00000000000000000000000';

function makeTip(overrides = {}) {
  return {
    tipId: '42',
    txId: '0xabc',
    sender: SENDER,
    recipient: RECIPIENT,
    amount: '95000',
    message: '',
    direction: 'sent',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('isWithinRefundWindow', () => {
  it('returns true for a recent timestamp', () => {
    expect(isWithinRefundWindow(Date.now() - 1000)).toBe(true);
  });

  it('returns true for a timestamp 23 hours ago', () => {
    expect(isWithinRefundWindow(Date.now() - 23 * 60 * 60 * 1000)).toBe(true);
  });

  it('returns false for a timestamp 25 hours ago', () => {
    expect(isWithinRefundWindow(Date.now() - 25 * 60 * 60 * 1000)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isWithinRefundWindow(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isWithinRefundWindow(undefined)).toBe(false);
  });
});

describe('RefundRequest', () => {
  const addToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the refund button for the sender within the window', () => {
    const tip = makeTip();
    render(<RefundRequest tip={tip} senderAddress={SENDER} addToast={addToast} />);
    expect(screen.getByRole('button', { name: /request refund/i })).toBeInTheDocument();
  });

  it('does not render for a non-sender', () => {
    const tip = makeTip();
    const { container } = render(<RefundRequest tip={tip} senderAddress={RECIPIENT} addToast={addToast} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when outside the refund window', () => {
    const tip = makeTip({ timestamp: Date.now() - 25 * 60 * 60 * 1000 });
    const { container } = render(<RefundRequest tip={tip} senderAddress={SENDER} addToast={addToast} />);
    expect(container.firstChild).toBeNull();
  });

  it('opens confirm dialog when button is clicked', () => {
    const tip = makeTip();
    render(<RefundRequest tip={tip} senderAddress={SENDER} addToast={addToast} />);
    fireEvent.click(screen.getByRole('button', { name: /request refund/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Request Tip Refund')).toBeInTheDocument();
  });

  it('closes dialog on cancel', () => {
    const tip = makeTip();
    render(<RefundRequest tip={tip} senderAddress={SENDER} addToast={addToast} />);
    fireEvent.click(screen.getByRole('button', { name: /request refund/i }));
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows recipient address in confirm dialog', () => {
    const tip = makeTip();
    render(<RefundRequest tip={tip} senderAddress={SENDER} addToast={addToast} />);
    fireEvent.click(screen.getByRole('button', { name: /request refund/i }));
    expect(screen.getByText(/SP2RECIP/i)).toBeInTheDocument();
  });

  it('allows typing a reason in the dialog', () => {
    const tip = makeTip();
    render(<RefundRequest tip={tip} senderAddress={SENDER} addToast={addToast} />);
    fireEvent.click(screen.getByRole('button', { name: /request refund/i }));
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'wrong address' } });
    expect(textarea.value).toBe('wrong address');
  });
});
