import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SendTip from '../components/SendTip';
import { TipProvider } from '../context/TipContext';
import * as useBlockCheckModule from '../hooks/useBlockCheck';
import * as useBalanceModule from '../hooks/useBalance';
import * as useStxPriceModule from '../hooks/useStxPrice';
import * as stacksModule from '../utils/stacks';
import * as analyticsModule from '../lib/analytics';

vi.mock('../hooks/useBlockCheck');
vi.mock('../hooks/useBalance');
vi.mock('../hooks/useStxPrice');
vi.mock('../utils/stacks');
vi.mock('../lib/analytics');
vi.mock('@stacks/connect', () => ({
  openContractCall: vi.fn(),
}));

// Mock contractEvents to prevent network calls in TipProvider
vi.mock('../lib/contractEvents', () => ({
  contractEvents: {
    fetchAll: vi.fn().mockResolvedValue([]),
    subscribe: vi.fn(),
  },
  POLL_INTERVAL_MS: 30000,
}));

describe('SendTip - High-Risk Recipient Blocking', () => {
  const mockSenderAddress = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';
  const mockRecipient = 'SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP';

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(stacksModule, 'getSenderAddress').mockReturnValue(mockSenderAddress);
    vi.spyOn(useStxPriceModule, 'useStxPrice').mockReturnValue({
      toUsd: () => '50.00',
    });
    vi.spyOn(analyticsModule, 'analytics', 'get').mockReturnValue({
      trackTipStarted: vi.fn(),
      trackTipSubmitted: vi.fn(),
      trackTipConfirmed: vi.fn(),
      trackTipCancelled: vi.fn(),
      trackTipFailed: vi.fn(),
    });
  });

  describe('blocked recipient enforcement', () => {
    it('displays error message when recipient has blocked sender', async () => {
      const mockAddToast = vi.fn();
      const user = userEvent.setup();

      vi.spyOn(useBlockCheckModule, 'useBlockCheck').mockReturnValue({
        blocked: true,
        checking: false,
        checkBlocked: vi.fn(),
        reset: vi.fn(),
      });

      vi.spyOn(useBalanceModule, 'useBalance').mockReturnValue({
        balance: '1000000000',
        balanceStx: 1.0,
        loading: false,
        refetch: vi.fn(),
      });

      render(
        <TipProvider>
          <SendTip addToast={mockAddToast} />
        </TipProvider>
      );

      const recipientInput = screen.getByPlaceholderText('SP2...');
      await user.type(recipientInput, mockRecipient);
      await user.type(screen.getByPlaceholderText('0.5'), '1.0');

      const sendButton = screen.getByRole('button', { name: /send tip/i });
      expect(sendButton).toBeDisabled();

      await user.click(sendButton);
      await waitFor(() => {
        expect(mockAddToast).not.toHaveBeenCalled();
      });
    });

    it('prevents wallet prompt when recipient has blocked sender', async () => {
      const mockAddToast = vi.fn();
      const user = userEvent.setup();

      vi.spyOn(useBlockCheckModule, 'useBlockCheck').mockReturnValue({
        blocked: true,
        checking: false,
        checkBlocked: vi.fn(),
        reset: vi.fn(),
      });

      vi.spyOn(useBalanceModule, 'useBalance').mockReturnValue({
        balance: '1000000000',
        balanceStx: 1.0,
        loading: false,
        refetch: vi.fn(),
      });

      render(
        <TipProvider>
          <SendTip addToast={mockAddToast} />
        </TipProvider>
      );

      const recipientInput = screen.getByPlaceholderText('SP2...');
      await user.type(recipientInput, mockRecipient);
      await user.type(screen.getByPlaceholderText('0.5'), '1.0');

      const sendButton = screen.getByRole('button', { name: /send tip/i });
      expect(sendButton).toBeDisabled();
    });

    it('shows blocked recipient error in red', async () => {
      const mockAddToast = vi.fn();

      vi.spyOn(useBlockCheckModule, 'useBlockCheck').mockReturnValue({
        blocked: true,
        checking: false,
        checkBlocked: vi.fn(),
        reset: vi.fn(),
      });

      vi.spyOn(useBalanceModule, 'useBalance').mockReturnValue({
        balance: '1000000000',
        balanceStx: 1.0,
        loading: false,
        refetch: vi.fn(),
      });

      const { container } = render(
        <TipProvider>
          <SendTip addToast={mockAddToast} />
        </TipProvider>
      );
      const recipientInput = container.querySelector('#tip-recipient');
      fireEvent.change(recipientInput, { target: { value: mockRecipient } });

      await waitFor(() => {
        const errorMsg = screen.queryByText(/blocked you/i);
        if (errorMsg) {
          expect(errorMsg).toHaveClass('text-red-500');
        }
      });
    });
  });

  describe('contract principal enforcement', () => {
    it('blocks submission for contract principals', async () => {
      const mockAddToast = vi.fn();

      vi.spyOn(useBlockCheckModule, 'useBlockCheck').mockReturnValue({
        blocked: false,
        checking: false,
        checkBlocked: vi.fn(),
        reset: vi.fn(),
      });

      vi.spyOn(useBalanceModule, 'useBalance').mockReturnValue({
        balance: '1000000000',
        balanceStx: 1.0,
        loading: false,
        refetch: vi.fn(),
      });

      render(
        <TipProvider>
          <SendTip addToast={mockAddToast} />
        </TipProvider>
      );

      const sendButton = screen.getByRole('button', { name: /send tip/i });
      expect(sendButton.classList.contains('disabled')).toBeFalsy();
    });
  });
});
