import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockToast } from './testUtils';
import SendTip from '../components/SendTip';

vi.mock('@stacks/connect', () => ({
  openContractCall: vi.fn(),
}));

const mockUseSenderAddress = vi.fn();
vi.mock('../hooks/useSenderAddress', () => ({
  useSenderAddress: () => mockUseSenderAddress(),
}));

vi.mock('../hooks/useBalance', () => ({
  useBalance: vi.fn(() => ({
    balance: '10000000000',
    balanceStx: 10000,
    loading: false,
    refetch: vi.fn(),
  })),
}));

vi.mock('../hooks/useBlockCheck', () => ({
  useBlockCheck: vi.fn(() => ({
    blocked: null,
    checkBlocked: vi.fn(),
    reset: vi.fn(),
  })),
}));

vi.mock('../hooks/useStxPrice', () => ({
  useStxPrice: vi.fn(() => ({
    toUsd: vi.fn(() => '1.00'),
  })),
}));

vi.mock('../hooks/useSendTipWithDemo', () => ({
  useSendTipWithDemo: vi.fn((balance) => ({
    displayBalance: balance,
    sendTipInDemo: vi.fn(),
    pendingTransaction: null,
  })),
}));

describe('SendTip session change behavior', () => {
  let mockToast;

  beforeEach(() => {
    mockToast = createMockToast();
    vi.clearAllMocks();
  });

  it('updates self-tip validation when sender address changes', async () => {
    const user = userEvent.setup();
    mockUseSenderAddress.mockReturnValue('SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');

    const { rerender } = renderWithProviders(<SendTip addToast={mockToast} />);

    const recipientInput = screen.getByLabelText(/recipient address/i);
    await user.type(recipientInput, 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');

    await waitFor(() => {
      expect(screen.getByText(/you cannot send a tip to yourself/i)).toBeInTheDocument();
    });

    mockUseSenderAddress.mockReturnValue('SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE');

    rerender(<SendTip addToast={mockToast} />);

    await waitFor(() => {
      expect(screen.queryByText(/you cannot send a tip to yourself/i)).not.toBeInTheDocument();
    });
  });

  it('clears validation errors when sender address becomes null', async () => {
    const user = userEvent.setup();
    mockUseSenderAddress.mockReturnValue('SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');

    const { rerender } = renderWithProviders(<SendTip addToast={mockToast} />);

    const recipientInput = screen.getByLabelText(/recipient address/i);
    await user.type(recipientInput, 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');

    await waitFor(() => {
      expect(screen.getByText(/you cannot send a tip to yourself/i)).toBeInTheDocument();
    });

    mockUseSenderAddress.mockReturnValue(null);

    rerender(<SendTip addToast={mockToast} />);

    await waitFor(() => {
      expect(screen.queryByText(/you cannot send a tip to yourself/i)).not.toBeInTheDocument();
    });
  });

  it('uses current sender address for post-conditions', async () => {
    const user = userEvent.setup();
    const mockOpenContractCall = vi.fn();
    const { openContractCall } = await import('@stacks/connect');
    
    mockUseSenderAddress.mockReturnValue('SP1NEWADDRESS123456789ABCDEFGHIJK');

    renderWithProviders(<SendTip addToast={mockToast} />);

    const recipientInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount \(stx\)/i);

    await user.type(recipientInput, 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE');
    await user.type(amountInput, '1');

    const sendButtons = screen.getAllByRole('button', { name: /send tip/i });
    await user.click(sendButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/confirm tip/i)).toBeInTheDocument();
    });
    
    mockOpenContractCall.mockImplementation(({ postConditions, onFinish }) => {
      expect(postConditions).toBeDefined();
      expect(postConditions.length).toBeGreaterThan(0);
      onFinish({ txId: 'tx123' });
    });
    
    openContractCall.mockImplementation(mockOpenContractCall);

    const confirmButtons = screen.getAllByRole('button', { name: /send tip/i });
    await user.click(confirmButtons[1]);

    await waitFor(() => {
      expect(mockOpenContractCall).toHaveBeenCalled();
    });
  });
});
