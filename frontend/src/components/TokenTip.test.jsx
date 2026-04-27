import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockToast } from '../test/testUtils';
import TokenTip from './TokenTip';
import * as stacksTransactions from '@stacks/transactions';
import * as stacksConnect from '@stacks/connect';

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

vi.mock('../hooks/useSenderAddress', () => ({
  useSenderAddress: vi.fn(() => 'SP1SENDER123'),
}));

describe('TokenTip', () => {
  let mockToast;

  beforeEach(() => {
    mockToast = createMockToast();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the token tip form', () => {
      renderWithProviders(<TokenTip addToast={mockToast} />);

      expect(screen.getByRole('heading', { name: /token tip/i })).toBeInTheDocument();
      expect(screen.getByText(/send tips using whitelisted sip-010 tokens/i)).toBeInTheDocument();
    });

    it('displays all required form fields', () => {
      renderWithProviders(<TokenTip addToast={mockToast} />);

      expect(screen.getByLabelText(/token contract/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/recipient address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/amount \(smallest token unit\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/message \(optional\)/i)).toBeInTheDocument();
    });

    it('displays check button for whitelist verification', () => {
      renderWithProviders(<TokenTip addToast={mockToast} />);

      expect(screen.getByRole('button', { name: /check whitelist status/i })).toBeInTheDocument();
    });
  });

  describe('Token Contract Validation', () => {
    it('validates token contract format', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TokenTip addToast={mockToast} />);

      const tokenInput = screen.getByLabelText(/token contract/i);
      const checkButton = screen.getByRole('button', { name: /check whitelist status/i });

      await user.type(tokenInput, 'invalid-contract');
      await user.click(checkButton);

      await waitFor(() => {
        expect(screen.getByText(/enter a valid contract identifier/i)).toBeInTheDocument();
      });
    });

    it('checks if token is whitelisted successfully', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: { value: true } });

      renderWithProviders(<TokenTip addToast={mockToast} />);

      const tokenInput = screen.getByLabelText(/token contract/i);
      const checkButton = screen.getByRole('button', { name: /check whitelist status/i });

      await user.type(tokenInput, 'SP2TOKEN123.token-contract');
      await user.click(checkButton);

      await waitFor(() => {
        expect(screen.getByText(/token is whitelisted/i)).toBeInTheDocument();
      });
    });

    it('shows error when token is not whitelisted', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: { value: false } });

      renderWithProviders(<TokenTip addToast={mockToast} />);

      const tokenInput = screen.getByLabelText(/token contract/i);
      const checkButton = screen.getByRole('button', { name: /check whitelist status/i });

      await user.type(tokenInput, 'SP2TOKEN123.token-contract');
      await user.click(checkButton);

      await waitFor(() => {
        expect(screen.getByText(/token is not whitelisted/i)).toBeInTheDocument();
      });
    });

    it('handles whitelist check error', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockRejectedValue(
        new Error('Network error')
      );

      renderWithProviders(<TokenTip addToast={mockToast} />);

      const tokenInput = screen.getByLabelText(/token contract/i);
      const checkButton = screen.getByRole('button', { name: /check whitelist status/i });

      await user.type(tokenInput, 'SP2TOKEN123.token-contract');
      await user.click(checkButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to check token whitelist status/i)).toBeInTheDocument();
      });
    });

    it('allows checking via Enter key', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: { value: true } });

      renderWithProviders(<TokenTip addToast={mockToast} />);

      const tokenInput = screen.getByLabelText(/token contract/i);

      await user.type(tokenInput, 'SP2TOKEN123.token-contract{Enter}');

      await waitFor(() => {
        expect(stacksTransactions.fetchCallReadOnlyFunction).toHaveBeenCalled();
      });
    });
  });

  describe('Recipient Validation', () => {
    it('validates recipient address format', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TokenTip addToast={mockToast} />);

      const recipientInput = screen.getByLabelText(/recipient address/i);

      await user.type(recipientInput, 'invalid-address');

      await waitFor(() => {
        expect(screen.getByText(/enter a valid stacks address/i)).toBeInTheDocument();
      });
    });

    it('prevents self-tipping', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TokenTip addToast={mockToast} />);

      const recipientInput = screen.getByLabelText(/recipient address/i);

      await user.type(recipientInput, 'SP1SENDER123');

      await waitFor(() => {
        expect(screen.getByText(/cannot send a tip to yourself/i)).toBeInTheDocument();
      });
    });

    it('clears error when valid address is entered', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TokenTip addToast={mockToast} />);

      const recipientInput = screen.getByLabelText(/recipient address/i);

      await user.type(recipientInput, 'invalid');
      await waitFor(() => {
        expect(screen.getByText(/enter a valid stacks address/i)).toBeInTheDocument();
      });

      await user.clear(recipientInput);
      await user.type(recipientInput, 'SP2RECIPIENT456');

      await waitFor(() => {
        expect(screen.queryByText(/enter a valid stacks address/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Amount Validation', () => {
    it('validates positive integer amount', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TokenTip addToast={mockToast} />);

      const amountInput = screen.getByLabelText(/amount \(smallest token unit\)/i);

      await user.type(amountInput, '-100');

      await waitFor(() => {
        expect(screen.getByText(/amount must be a positive integer/i)).toBeInTheDocument();
      });
    });

    it('accepts valid integer amount', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TokenTip addToast={mockToast} />);

      const amountInput = screen.getByLabelText(/amount \(smallest token unit\)/i);

      await user.type(amountInput, '1000000');

      await waitFor(() => {
        expect(screen.queryByText(/amount must be a positive integer/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Message Field', () => {
    it('displays character count', () => {
      renderWithProviders(<TokenTip addToast={mockToast} />);

      expect(screen.getByText(/0\/280/i)).toBeInTheDocument();
    });

    it('updates character count as user types', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TokenTip addToast={mockToast} />);

      const messageInput = screen.getByLabelText(/message \(optional\)/i);

      await user.type(messageInput, 'Thanks!');

      expect(screen.getByText(/7\/280/i)).toBeInTheDocument();
    });

    it('enforces maximum length', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TokenTip addToast={mockToast} />);

      const messageInput = screen.getByLabelText(/message \(optional\)/i);
      const longMessage = 'a'.repeat(300);

      await user.type(messageInput, longMessage);

      expect(messageInput.value.length).toBeLessThanOrEqual(280);
    });
  });

  describe('Form Submission', () => {
    it('disables send button when token is not whitelisted', () => {
      renderWithProviders(<TokenTip addToast={mockToast} />);

      const sendButton = screen.getByRole('button', { name: /send token tip/i });
      expect(sendButton).toBeDisabled();
    });

    it('opens confirmation dialog before sending', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: { value: true } });

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

      await user.type(recipientInput, 'SP2RECIPIENT456');
      await user.type(amountInput, '1000000');

      const sendButton = screen.getByRole('button', { name: /send token tip/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm token tip/i)).toBeInTheDocument();
      });
    });

    it('sends token tip successfully', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: { value: true } });
      stacksConnect.openContractCall.mockImplementation(({ onFinish }) => {
        onFinish({ txId: 'tx123' });
      });

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

      await user.type(recipientInput, 'SP2RECIPIENT456');
      await user.type(amountInput, '1000000');

      const sendButton = screen.getByRole('button', { name: /send token tip/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm token tip/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /send token tip/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(stacksConnect.openContractCall).toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(
          expect.stringContaining('Token tip sent'),
          'success'
        );
      });
    });

    it('handles cancel during send', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: { value: true } });
      stacksConnect.openContractCall.mockImplementation(({ onCancel }) => {
        onCancel();
      });

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

      await user.type(recipientInput, 'SP2RECIPIENT456');
      await user.type(amountInput, '1000000');

      const sendButton = screen.getByRole('button', { name: /send token tip/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm token tip/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /send token tip/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Token tip cancelled', 'info');
      });
    });

    it('handles send error gracefully', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: { value: true } });
      stacksConnect.openContractCall.mockRejectedValue(new Error('Wallet error'));

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

      await user.type(recipientInput, 'SP2RECIPIENT456');
      await user.type(amountInput, '1000000');

      const sendButton = screen.getByRole('button', { name: /send token tip/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm token tip/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /send token tip/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          'Failed to send token tip. Please try again.',
          'error'
        );
      });
    });

    it('clears form after successful send', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: { value: true } });
      stacksConnect.openContractCall.mockImplementation(({ onFinish }) => {
        onFinish({ txId: 'tx123' });
      });

      renderWithProviders(<TokenTip addToast={mockToast} />);

      const tokenInput = screen.getByLabelText(/token contract/i);
      const recipientInput = screen.getByLabelText(/recipient address/i);
      const amountInput = screen.getByLabelText(/amount \(smallest token unit\)/i);
      const messageInput = screen.getByLabelText(/message \(optional\)/i);
      const checkButton = screen.getByRole('button', { name: /check whitelist status/i });

      await user.type(tokenInput, 'SP2TOKEN123.token-contract');
      await user.click(checkButton);

      await waitFor(() => {
        expect(screen.getByText(/token is whitelisted/i)).toBeInTheDocument();
      });

      await user.type(recipientInput, 'SP2RECIPIENT456');
      await user.type(amountInput, '1000000');
      await user.type(messageInput, 'Thanks!');

      const sendButton = screen.getByRole('button', { name: /send token tip/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm token tip/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /send token tip/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(recipientInput).toHaveValue('');
        expect(amountInput).toHaveValue(null);
        expect(messageInput).toHaveValue('');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for all inputs', () => {
      renderWithProviders(<TokenTip addToast={mockToast} />);

      expect(screen.getByLabelText(/token contract/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/recipient address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/amount \(smallest token unit\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/message \(optional\)/i)).toBeInTheDocument();
    });

    it('marks invalid inputs with aria-invalid', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TokenTip addToast={mockToast} />);

      const recipientInput = screen.getByLabelText(/recipient address/i);

      await user.type(recipientInput, 'invalid-address');

      await waitFor(() => {
        expect(recipientInput).toHaveAttribute('aria-invalid');
      });
    });

    it('associates error messages with inputs', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TokenTip addToast={mockToast} />);

      const recipientInput = screen.getByLabelText(/recipient address/i);

      await user.type(recipientInput, 'invalid-address');

      await waitFor(() => {
        const errorMessage = screen.getByText(/enter a valid stacks address/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });
});
