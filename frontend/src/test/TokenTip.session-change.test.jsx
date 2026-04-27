import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockToast } from './testUtils';
import TokenTip from '../components/TokenTip';
import * as stacksTransactions from '@stacks/transactions';

vi.mock('@stacks/transactions', async () => {
  const actual = await vi.importActual('@stacks/transactions');
  return {
    ...actual,
    fetchCallReadOnlyFunction: vi.fn(),
    cvToJSON: vi.fn(),
  };
});

vi.mock('@stacks/connect', () => ({
  openContractCall: vi.fn(),
}));

const mockUseSenderAddress = vi.fn();
vi.mock('../hooks/useSenderAddress', () => ({
  useSenderAddress: () => mockUseSenderAddress(),
}));

describe('TokenTip session change behavior', () => {
  let mockToast;

  beforeEach(() => {
    mockToast = createMockToast();
    vi.clearAllMocks();
    stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
    stacksTransactions.cvToJSON.mockReturnValue({ value: { value: true } });
  });

  it('updates self-tip validation when sender address changes', async () => {
    const user = userEvent.setup();
    mockUseSenderAddress.mockReturnValue('SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');

    const { rerender } = renderWithProviders(<TokenTip addToast={mockToast} />);

    const recipientInput = screen.getByLabelText(/recipient address/i);
    await user.type(recipientInput, 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');

    await waitFor(() => {
      expect(screen.getByText(/cannot send a tip to yourself/i)).toBeInTheDocument();
    });

    mockUseSenderAddress.mockReturnValue('SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE');

    rerender(<TokenTip addToast={mockToast} />);

    await waitFor(() => {
      expect(screen.queryByText(/cannot send a tip to yourself/i)).not.toBeInTheDocument();
    });
  });

  it('clears validation errors when sender address becomes null', async () => {
    const user = userEvent.setup();
    mockUseSenderAddress.mockReturnValue('SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');

    const { rerender } = renderWithProviders(<TokenTip addToast={mockToast} />);

    const recipientInput = screen.getByLabelText(/recipient address/i);
    await user.type(recipientInput, 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');

    await waitFor(() => {
      expect(screen.getByText(/cannot send a tip to yourself/i)).toBeInTheDocument();
    });

    mockUseSenderAddress.mockReturnValue(null);

    rerender(<TokenTip addToast={mockToast} />);

    await waitFor(() => {
      expect(screen.queryByText(/cannot send a tip to yourself/i)).not.toBeInTheDocument();
    });
  });

  it('uses current sender address for post-conditions', async () => {
    const user = userEvent.setup();
    const mockOpenContractCall = vi.fn(({ postConditions, onFinish }) => {
      expect(postConditions).toBeDefined();
      expect(postConditions.length).toBeGreaterThan(0);
      onFinish({ txId: 'tx123' });
    });
    
    const { openContractCall } = await import('@stacks/connect');
    openContractCall.mockImplementation(mockOpenContractCall);
    
    stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
    stacksTransactions.cvToJSON.mockReturnValue({ value: { value: true } });
    
    mockUseSenderAddress.mockReturnValue('SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE');

    renderWithProviders(<TokenTip addToast={mockToast} />);

    const tokenInput = screen.getByLabelText(/token contract/i);
    const recipientInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount \(smallest token unit\)/i);
    const checkButton = screen.getByRole('button', { name: /check whitelist status/i });

    await user.type(tokenInput, 'SP2TOKEN123.token-contract');
    await user.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText(/token is whitelisted/i)).toBeInTheDocument();
    });

    await user.type(recipientInput, 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');
    await user.type(amountInput, '1000000');

    const sendButtons = screen.getAllByRole('button', { name: /send token tip/i });
    await user.click(sendButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/confirm token tip/i)).toBeInTheDocument();
    });

    const confirmButtons = screen.getAllByRole('button', { name: /send token tip/i });
    await user.click(confirmButtons[1]);

    await waitFor(() => {
      expect(mockOpenContractCall).toHaveBeenCalled();
    });
  });
});
