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

  it('updates post-conditions when sender address changes', async () => {
    const user = userEvent.setup();
    const mockOpenContractCall = vi.fn();
    const { openContractCall } = await import('@stacks/connect');
    openContractCall.mockImplementation(mockOpenContractCall);

    mockUseSenderAddress.mockReturnValue('SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');

    const { rerender } = renderWithProviders(<SendTip addToast={mockToast} />);

    const recipientInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount \(stx\)/i);

    await user.type(recipientInput, 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE');
    await user.type(amountInput, '1');

    mockUseSenderAddress.mockReturnValue('SP1NEWADDRESS123456789ABCDEFGHIJK');

    rerender(<SendTip addToast={mockToast} />);

    const sendButton = screen.getByRole('button', { name: /send tip/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/confirm tip/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /send tip/i });
    
    mockOpenContractCall.mockImplementation(({ onFinish }) => {
      onFinish({ txId: 'tx123' });
    });

    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockOpenContractCall).toHaveBeenCalledWith(
        expect.objectContaining({
          postConditions: expect.arrayContaining([
            expect.objectContaining({
              principal: expect.objectContaining({
                address: expect.objectContaining({
                  hash160: expect.any(String),
                }),
              }),
            }),
          ]),
        })
      );
    });
  });
});
