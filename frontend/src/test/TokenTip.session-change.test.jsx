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
    stacksTransactions.cvToJSON.mockReturnValue({ value: true });
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

  it.skip('validates with current sender address', async () => {
    const user = userEvent.setup();
    
    mockUseSenderAddress.mockReturnValue('SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE');

    renderWithProviders(<TokenTip addToast={mockToast} />);

    const tokenInput = screen.getByLabelText(/token contract/i);
    const recipientInput = screen.getByLabelText(/recipient address/i);
    const checkButton = screen.getByRole('button', { name: /check whitelist status/i });

    await user.type(tokenInput, 'SP2TOKEN123.token-contract');
    await user.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText(/token is whitelisted/i)).toBeInTheDocument();
    });

    await user.type(recipientInput, 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');

    expect(screen.queryByText(/cannot send a tip to yourself/i)).not.toBeInTheDocument();
  });
});
