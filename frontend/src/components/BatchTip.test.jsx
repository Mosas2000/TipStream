import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockToast } from '../test/testUtils';
import BatchTip from './BatchTip';
import * as stacksConnect from '@stacks/connect';

vi.mock('@stacks/connect', () => ({
  openContractCall: vi.fn(),
}));

vi.mock('../hooks/useSenderAddress', () => ({
  useSenderAddress: vi.fn(() => 'SP1SENDER123'),
}));

vi.mock('../hooks/useBalance', () => ({
  useBalance: vi.fn(() => ({
    balance: '10000000000',
    balanceStx: 10000,
    loading: false,
  })),
}));

describe('BatchTip', () => {
  let mockToast;

  beforeEach(() => {
    mockToast = createMockToast();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the batch tip form', () => {
      renderWithProviders(<BatchTip addToast={mockToast} />);

      expect(screen.getByRole('heading', { name: /batch tips/i })).toBeInTheDocument();
      expect(screen.getByText(/send tips to multiple recipients/i)).toBeInTheDocument();
    });

    it('displays balance information', () => {
      renderWithProviders(<BatchTip addToast={mockToast} />);

      expect(screen.getByText(/your balance/i)).toBeInTheDocument();
      expect(screen.getByText(/10000/)).toBeInTheDocument();
    });

    it('renders one recipient by default', () => {
      renderWithProviders(<BatchTip addToast={mockToast} />);

      expect(screen.getByText(/#1/)).toBeInTheDocument();
      expect(screen.getByLabelText(/recipient 1 address/i)).toBeInTheDocument();
    });

    it('displays strict mode toggle', () => {
      renderWithProviders(<BatchTip addToast={mockToast} />);

      expect(screen.getByText(/strict mode/i)).toBeInTheDocument();
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });
  });

  describe('Adding and Removing Recipients', () => {
    it('adds a new recipient when clicking add button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BatchTip addToast={mockToast} />);

      const addButton = screen.getByRole('button', { name: /add recipient/i });
      await user.click(addButton);

      expect(screen.getByText(/#2/)).toBeInTheDocument();
      expect(screen.getByLabelText(/recipient 2 address/i)).toBeInTheDocument();
    });

    it('removes a recipient when clicking remove button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BatchTip addToast={mockToast} />);

      const addButton = screen.getByRole('button', { name: /add recipient/i });
      await user.click(addButton);

      expect(screen.getByText(/#2/)).toBeInTheDocument();

      const removeButtons = screen.getAllByRole('button', { name: /remove recipient/i });
      await user.click(removeButtons[1]);

      expect(screen.queryByText(/#2/)).not.toBeInTheDocument();
    });

    it('prevents removing the last recipient', () => {
      renderWithProviders(<BatchTip addToast={mockToast} />);

      expect(screen.queryByRole('button', { name: /remove recipient 1/i })).not.toBeInTheDocument();
    });

    it('shows warning when trying to add more than max recipients', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BatchTip addToast={mockToast} />);

      const addButton = screen.getByRole('button', { name: /add recipient/i });

      for (let i = 0; i < 50; i++) {
        await user.click(addButton);
      }

      expect(mockToast).toHaveBeenCalledWith(
        expect.stringContaining('Maximum 50 recipients'),
        'warning'
      );
    });
  });

  describe('Form Validation', () => {
    it('validates empty address', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BatchTip addToast={mockToast} />);

      const sendButton = screen.getByRole('button', { name: /send 1 tip/i });
      await user.click(sendButton);

      expect(mockToast).toHaveBeenCalledWith('Add at least one recipient', 'warning');
    });

    it('validates invalid Stacks address', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BatchTip addToast={mockToast} />);

      const addressInput = screen.getByLabelText(/recipient 1 address/i);
      const amountInput = screen.getByLabelText(/recipient 1 amount/i);

      await user.type(addressInput, 'invalid-address');
      await user.type(amountInput, '1');

      const sendButton = screen.getByRole('button', { name: /send 1 tip/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid stacks address/i)).toBeInTheDocument();
      });
    });

    it('prevents self-tipping', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BatchTip addToast={mockToast} />);

      const addressInput = screen.getByLabelText(/recipient 1 address/i);
      const amountInput = screen.getByLabelText(/recipient 1 amount/i);

      await user.type(addressInput, 'SP1SENDER123');
      await user.type(amountInput, '1');

      await waitFor(() => {
        expect(screen.getByText(/cannot tip yourself/i)).toBeInTheDocument();
      });
    });

    it('validates minimum tip amount', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BatchTip addToast={mockToast} />);

      const addressInput = screen.getByLabelText(/recipient 1 address/i);
      const amountInput = screen.getByLabelText(/recipient 1 amount/i);

      await user.type(addressInput, 'SP2RECIPIENT456');
      await user.type(amountInput, '0.0001');

      const sendButton = screen.getByRole('button', { name: /send 1 tip/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/min 0.001 stx/i)).toBeInTheDocument();
      });
    });

    it('validates message length', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BatchTip addToast={mockToast} />);

      const messageInput = screen.getByLabelText(/recipient 1 message/i);
      const longMessage = 'a'.repeat(281);

      await user.type(messageInput, longMessage);

      const sendButton = screen.getByRole('button', { name: /send 1 tip/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/max 280 characters/i)).toBeInTheDocument();
      });
    });

    it('detects duplicate addresses', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BatchTip addToast={mockToast} />);

      const addButton = screen.getByRole('button', { name: /add recipient/i });
      await user.click(addButton);

      const addressInputs = screen.getAllByPlaceholderText(/sp2\.\.\. recipient address/i);
      const amountInputs = screen.getAllByPlaceholderText(/stx/i);

      await user.type(addressInputs[0], 'SP2RECIPIENT456');
      await user.type(amountInputs[0], '1');
      await user.type(addressInputs[1], 'SP2RECIPIENT456');
      await user.type(amountInputs[1], '1');

      const sendButton = screen.getByRole('button', { name: /send 2 tips/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/duplicate address/i)).toBeInTheDocument();
      });
    });

    it('validates insufficient balance', async () => {
      const user = userEvent.setup();
      const { useBalance } = await import('../hooks/useBalance');
      useBalance.mockReturnValue({
        balance: '1000000',
        balanceStx: 1,
        loading: false,
      });

      renderWithProviders(<BatchTip addToast={mockToast} />);

      const addressInput = screen.getByLabelText(/recipient 1 address/i);
      const amountInput = screen.getByLabelText(/recipient 1 amount/i);

      await user.type(addressInput, 'SP2RECIPIENT456');
      await user.type(amountInput, '10');

      const sendButton = screen.getByRole('button', { name: /send 1 tip/i });
      await user.click(sendButton);

      expect(mockToast).toHaveBeenCalledWith(
        'Insufficient balance for this batch',
        'warning'
      );
    });
  });

  describe('Strict Mode Toggle', () => {
    it('toggles strict mode on and off', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BatchTip addToast={mockToast} />);

      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');

      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-checked', 'true');

      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('displays correct mode in summary', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BatchTip addToast={mockToast} />);

      const addressInput = screen.getByLabelText(/recipient 1 address/i);
      const amountInput = screen.getByLabelText(/recipient 1 amount/i);

      await user.type(addressInput, 'SP2RECIPIENT456');
      await user.type(amountInput, '1');

      expect(screen.getByText(/best effort/i)).toBeInTheDocument();

      const toggle = screen.getByRole('switch');
      await user.click(toggle);

      expect(screen.getByText(/strict \(all-or-nothing\)/i)).toBeInTheDocument();
    });
  });

  describe('Batch Summary', () => {
    it('calculates and displays total amount', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BatchTip addToast={mockToast} />);

      const addressInput = screen.getByLabelText(/recipient 1 address/i);
      const amountInput = screen.getByLabelText(/recipient 1 amount/i);

      await user.type(addressInput, 'SP2RECIPIENT456');
      await user.type(amountInput, '2.5');

      await waitFor(() => {
        expect(screen.getByText(/2\.500000 stx/i)).toBeInTheDocument();
      });
    });

    it('displays recipient count', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BatchTip addToast={mockToast} />);

      const addButton = screen.getByRole('button', { name: /add recipient/i });
      await user.click(addButton);
      await user.click(addButton);

      const addressInputs = screen.getAllByPlaceholderText(/sp2\.\.\. recipient address/i);
      const amountInputs = screen.getAllByPlaceholderText(/stx/i);

      for (let i = 0; i < 3; i++) {
        await user.type(addressInputs[i], `SP2RECIPIENT${i}`);
        await user.type(amountInputs[i], '1');
      }

      await waitFor(() => {
        const summary = screen.getByText(/recipients/i).closest('div');
        expect(summary).toHaveTextContent('3');
      });
    });
  });

  describe('Sending Batch Tips', () => {
    it('opens confirmation dialog before sending', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BatchTip addToast={mockToast} />);

      const addressInput = screen.getByLabelText(/recipient 1 address/i);
      const amountInput = screen.getByLabelText(/recipient 1 amount/i);

      await user.type(addressInput, 'SP2RECIPIENT456');
      await user.type(amountInput, '1');

      const sendButton = screen.getByRole('button', { name: /send 1 tip/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm batch tips/i)).toBeInTheDocument();
      });
    });

    it('sends batch tips successfully', async () => {
      const user = userEvent.setup();
      stacksConnect.openContractCall.mockImplementation(({ onFinish }) => {
        onFinish({ txId: 'tx123' });
      });

      renderWithProviders(<BatchTip addToast={mockToast} />);

      const addressInput = screen.getByLabelText(/recipient 1 address/i);
      const amountInput = screen.getByLabelText(/recipient 1 amount/i);

      await user.type(addressInput, 'SP2RECIPIENT456');
      await user.type(amountInput, '1');

      const sendButton = screen.getByRole('button', { name: /send 1 tip/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm batch tips/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /send 1 tip/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(stacksConnect.openContractCall).toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(
          expect.stringContaining('Batch transaction submitted'),
          'info'
        );
      });
    });

    it('handles cancel during send', async () => {
      const user = userEvent.setup();
      stacksConnect.openContractCall.mockImplementation(({ onCancel }) => {
        onCancel();
      });

      renderWithProviders(<BatchTip addToast={mockToast} />);

      const addressInput = screen.getByLabelText(/recipient 1 address/i);
      const amountInput = screen.getByLabelText(/recipient 1 amount/i);

      await user.type(addressInput, 'SP2RECIPIENT456');
      await user.type(amountInput, '1');

      const sendButton = screen.getByRole('button', { name: /send 1 tip/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm batch tips/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /send 1 tip/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Batch tip cancelled', 'info');
      });
    });

    it('handles send error gracefully', async () => {
      const user = userEvent.setup();
      stacksConnect.openContractCall.mockRejectedValue(new Error('Wallet error'));

      renderWithProviders(<BatchTip addToast={mockToast} />);

      const addressInput = screen.getByLabelText(/recipient 1 address/i);
      const amountInput = screen.getByLabelText(/recipient 1 amount/i);

      await user.type(addressInput, 'SP2RECIPIENT456');
      await user.type(amountInput, '1');

      const sendButton = screen.getByRole('button', { name: /send 1 tip/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm batch tips/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /send 1 tip/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          'Failed to send batch tips. Please try again.',
          'error'
        );
      });
    });

    it('clears form after successful send', async () => {
      const user = userEvent.setup();
      stacksConnect.openContractCall.mockImplementation(({ onFinish }) => {
        onFinish({ txId: 'tx123' });
      });

      renderWithProviders(<BatchTip addToast={mockToast} />);

      const addressInput = screen.getByLabelText(/recipient 1 address/i);
      const amountInput = screen.getByLabelText(/recipient 1 amount/i);

      await user.type(addressInput, 'SP2RECIPIENT456');
      await user.type(amountInput, '1');

      const sendButton = screen.getByRole('button', { name: /send 1 tip/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm batch tips/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /send 1 tip/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(addressInput).toHaveValue('');
        expect(amountInput).toHaveValue(null);
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper fieldset structure for recipients', () => {
      renderWithProviders(<BatchTip addToast={mockToast} />);

      const fieldsets = screen.getAllByRole('group');
      expect(fieldsets.length).toBeGreaterThan(0);
    });

    it('has proper labels for all inputs', () => {
      renderWithProviders(<BatchTip addToast={mockToast} />);

      expect(screen.getByLabelText(/recipient 1 address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/recipient 1 amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/recipient 1 message/i)).toBeInTheDocument();
    });

    it('has proper switch role for strict mode toggle', () => {
      renderWithProviders(<BatchTip addToast={mockToast} />);

      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked');
      expect(toggle).toHaveAttribute('aria-label', 'Toggle strict mode');
    });
  });
});
