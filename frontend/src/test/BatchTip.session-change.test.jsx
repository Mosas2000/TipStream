import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockToast } from './testUtils';
import BatchTip from '../components/BatchTip';

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
  })),
}));

describe('BatchTip session change behavior', () => {
  let mockToast;

  beforeEach(() => {
    mockToast = createMockToast();
    vi.clearAllMocks();
  });

  it('updates self-tip validation when sender address changes', async () => {
    const user = userEvent.setup();
    mockUseSenderAddress.mockReturnValue('SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');

    const { rerender } = renderWithProviders(<BatchTip addToast={mockToast} />);

    const addressInput = screen.getByLabelText(/recipient 1 address/i);
    await user.type(addressInput, 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');

    await waitFor(() => {
      expect(screen.getByText(/cannot tip yourself/i)).toBeInTheDocument();
    });

    mockUseSenderAddress.mockReturnValue('SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE');

    rerender(<BatchTip addToast={mockToast} />);

    await waitFor(() => {
      expect(screen.queryByText(/cannot tip yourself/i)).not.toBeInTheDocument();
    });
  });

  it('clears validation errors when sender address becomes null', async () => {
    const user = userEvent.setup();
    mockUseSenderAddress.mockReturnValue('SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');

    const { rerender } = renderWithProviders(<BatchTip addToast={mockToast} />);

    const addressInput = screen.getByLabelText(/recipient 1 address/i);
    await user.type(addressInput, 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');

    await waitFor(() => {
      expect(screen.getByText(/cannot tip yourself/i)).toBeInTheDocument();
    });

    mockUseSenderAddress.mockReturnValue(null);

    rerender(<BatchTip addToast={mockToast} />);

    await waitFor(() => {
      expect(screen.queryByText(/cannot tip yourself/i)).not.toBeInTheDocument();
    });
  });

  it('updates post-conditions when sender address changes', async () => {
    const user = userEvent.setup();
    const mockOpenContractCall = vi.fn();
    const { openContractCall } = await import('@stacks/connect');
    openContractCall.mockImplementation(mockOpenContractCall);

    mockUseSenderAddress.mockReturnValue('SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');

    const { rerender } = renderWithProviders(<BatchTip addToast={mockToast} />);

    const addressInput = screen.getByLabelText(/recipient 1 address/i);
    const amountInput = screen.getByLabelText(/recipient 1 amount/i);

    await user.type(addressInput, 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE');
    await user.type(amountInput, '1');

    mockUseSenderAddress.mockReturnValue('SP1NEWADDRESS123456789ABCDEFGHIJK');

    rerender(<BatchTip addToast={mockToast} />);

    const sendButton = screen.getByRole('button', { name: /send 1 tip/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/confirm batch tips/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /send 1 tip/i });
    
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
