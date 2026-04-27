import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockToast } from '../test/testUtils';
import BlockManager from './BlockManager';
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

describe('BlockManager', () => {
  let mockToast;

  beforeEach(() => {
    mockToast = createMockToast();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the block manager form', () => {
      renderWithProviders(<BlockManager addToast={mockToast} />);

      expect(screen.getByRole('heading', { name: /block manager/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/user address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /check block status/i })).toBeInTheDocument();
    });

    it('displays the correct description', () => {
      renderWithProviders(<BlockManager addToast={mockToast} />);

      expect(screen.getByText(/block or unblock users from sending you tips/i)).toBeInTheDocument();
    });
  });

  describe('Address Input Validation', () => {
    it('disables check button when address is empty', () => {
      renderWithProviders(<BlockManager addToast={mockToast} />);

      const checkButton = screen.getByRole('button', { name: /check block status/i });
      expect(checkButton).toBeDisabled();
    });

    it('enables check button when address is entered', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BlockManager addToast={mockToast} />);

      const input = screen.getByLabelText(/user address/i);
      const checkButton = screen.getByRole('button', { name: /check block status/i });

      await user.type(input, 'SP2RECIPIENT456');

      expect(checkButton).not.toBeDisabled();
    });

    it('shows warning for invalid Stacks address', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BlockManager addToast={mockToast} />);

      const input = screen.getByLabelText(/user address/i);
      const checkButton = screen.getByRole('button', { name: /check block status/i });

      await user.type(input, 'invalid-address');
      await user.click(checkButton);

      expect(mockToast).toHaveBeenCalledWith('Enter a valid Stacks address', 'warning');
    });

    it('shows warning when trying to block yourself', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BlockManager addToast={mockToast} />);

      const input = screen.getByLabelText(/user address/i);
      const checkButton = screen.getByRole('button', { name: /check block status/i });

      await user.type(input, 'SP1SENDER123');
      await user.click(checkButton);

      expect(mockToast).toHaveBeenCalledWith('You cannot block yourself', 'warning');
    });
  });

  describe('Check Block Status', () => {
    it('checks if user is blocked successfully', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: true });

      renderWithProviders(<BlockManager addToast={mockToast} />);

      const input = screen.getByLabelText(/user address/i);
      const checkButton = screen.getByRole('button', { name: /check block status/i });

      await user.type(input, 'SP2RECIPIENT456');
      await user.click(checkButton);

      await waitFor(() => {
        expect(screen.getByText(/currently blocked/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /unblock/i })).toBeInTheDocument();
    });

    it('checks if user is not blocked successfully', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: false });

      renderWithProviders(<BlockManager addToast={mockToast} />);

      const input = screen.getByLabelText(/user address/i);
      const checkButton = screen.getByRole('button', { name: /check block status/i });

      await user.type(input, 'SP2RECIPIENT456');
      await user.click(checkButton);

      await waitFor(() => {
        expect(screen.getByText(/not blocked/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /^block$/i })).toBeInTheDocument();
    });

    it('shows loading state while checking', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 100))
      );
      stacksTransactions.cvToJSON.mockReturnValue({ value: false });

      renderWithProviders(<BlockManager addToast={mockToast} />);

      const input = screen.getByLabelText(/user address/i);
      const checkButton = screen.getByRole('button', { name: /check block status/i });

      await user.type(input, 'SP2RECIPIENT456');
      await user.click(checkButton);

      expect(checkButton).toBeDisabled();
    });

    it('handles check error gracefully', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockRejectedValue(
        new Error('Network error')
      );

      renderWithProviders(<BlockManager addToast={mockToast} />);

      const input = screen.getByLabelText(/user address/i);
      const checkButton = screen.getByRole('button', { name: /check block status/i });

      await user.type(input, 'SP2RECIPIENT456');
      await user.click(checkButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Failed to check block status', 'error');
      });
    });

    it('allows checking via Enter key', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: false });

      renderWithProviders(<BlockManager addToast={mockToast} />);

      const input = screen.getByLabelText(/user address/i);

      await user.type(input, 'SP2RECIPIENT456{Enter}');

      await waitFor(() => {
        expect(stacksTransactions.fetchCallReadOnlyFunction).toHaveBeenCalled();
      });
    });
  });

  describe('Toggle Block', () => {
    it('opens wallet to block a user', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: false });
      stacksConnect.openContractCall.mockImplementation(({ onFinish }) => {
        onFinish({ txId: 'tx123' });
      });

      renderWithProviders(<BlockManager addToast={mockToast} />);

      const input = screen.getByLabelText(/user address/i);
      const checkButton = screen.getByRole('button', { name: /check block status/i });

      await user.type(input, 'SP2RECIPIENT456');
      await user.click(checkButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^block$/i })).toBeInTheDocument();
      });

      const blockButton = screen.getByRole('button', { name: /^block$/i });
      await user.click(blockButton);

      expect(stacksConnect.openContractCall).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringContaining('Blocked'),
        'success'
      );
    });

    it('opens wallet to unblock a user', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: true });
      stacksConnect.openContractCall.mockImplementation(({ onFinish }) => {
        onFinish({ txId: 'tx456' });
      });

      renderWithProviders(<BlockManager addToast={mockToast} />);

      const input = screen.getByLabelText(/user address/i);
      const checkButton = screen.getByRole('button', { name: /check block status/i });

      await user.type(input, 'SP2RECIPIENT456');
      await user.click(checkButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /unblock/i })).toBeInTheDocument();
      });

      const unblockButton = screen.getByRole('button', { name: /unblock/i });
      await user.click(unblockButton);

      expect(stacksConnect.openContractCall).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringContaining('Unblocked'),
        'success'
      );
    });

    it('handles cancel during block toggle', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: false });
      stacksConnect.openContractCall.mockImplementation(({ onCancel }) => {
        onCancel();
      });

      renderWithProviders(<BlockManager addToast={mockToast} />);

      const input = screen.getByLabelText(/user address/i);
      const checkButton = screen.getByRole('button', { name: /check block status/i });

      await user.type(input, 'SP2RECIPIENT456');
      await user.click(checkButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^block$/i })).toBeInTheDocument();
      });

      const blockButton = screen.getByRole('button', { name: /^block$/i });
      await user.click(blockButton);

      expect(mockToast).toHaveBeenCalledWith('Block toggle cancelled', 'info');
    });

    it('handles toggle error gracefully', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: false });
      stacksConnect.openContractCall.mockRejectedValue(new Error('Wallet error'));

      renderWithProviders(<BlockManager addToast={mockToast} />);

      const input = screen.getByLabelText(/user address/i);
      const checkButton = screen.getByRole('button', { name: /check block status/i });

      await user.type(input, 'SP2RECIPIENT456');
      await user.click(checkButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^block$/i })).toBeInTheDocument();
      });

      const blockButton = screen.getByRole('button', { name: /^block$/i });
      await user.click(blockButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          'Failed to toggle block status. Please try again.',
          'error'
        );
      });
    });
  });

  describe('Recently Blocked List', () => {
    it('displays recently blocked users', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: false });
      stacksConnect.openContractCall.mockImplementation(({ onFinish }) => {
        onFinish({ txId: 'tx123' });
      });

      renderWithProviders(<BlockManager addToast={mockToast} />);

      const input = screen.getByLabelText(/user address/i);
      const checkButton = screen.getByRole('button', { name: /check block status/i });

      await user.type(input, 'SP2RECIPIENT456');
      await user.click(checkButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^block$/i })).toBeInTheDocument();
      });

      const blockButton = screen.getByRole('button', { name: /^block$/i });
      await user.click(blockButton);

      await waitFor(() => {
        expect(screen.getByText(/recently blocked/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithProviders(<BlockManager addToast={mockToast} />);

      expect(screen.getByLabelText(/user address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /check block status/i })).toBeInTheDocument();
    });

    it('announces status changes', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: true });

      renderWithProviders(<BlockManager addToast={mockToast} />);

      const input = screen.getByLabelText(/user address/i);
      const checkButton = screen.getByRole('button', { name: /check block status/i });

      await user.type(input, 'SP2RECIPIENT456');
      await user.click(checkButton);

      await waitFor(() => {
        const statusElement = screen.getByRole('status');
        expect(statusElement).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});
