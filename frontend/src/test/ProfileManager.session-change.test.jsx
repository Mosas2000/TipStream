import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockToast } from './testUtils';
import ProfileManager from '../components/ProfileManager';
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

describe('ProfileManager session change behavior', () => {
  let mockToast;

  beforeEach(() => {
    mockToast = createMockToast();
    vi.clearAllMocks();
    stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
    stacksTransactions.cvToJSON.mockReturnValue({ value: null });
  });

  it('refetches profile when sender address changes', async () => {
    mockUseSenderAddress.mockReturnValue('SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');

    const { rerender } = renderWithProviders(<ProfileManager addToast={mockToast} />);

    await waitFor(() => {
      expect(stacksTransactions.fetchCallReadOnlyFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          senderAddress: 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B',
        })
      );
    });

    const firstCallCount = stacksTransactions.fetchCallReadOnlyFunction.mock.calls.length;

    mockUseSenderAddress.mockReturnValue('SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE');

    rerender(<ProfileManager addToast={mockToast} />);

    await waitFor(() => {
      expect(stacksTransactions.fetchCallReadOnlyFunction.mock.calls.length).toBeGreaterThan(firstCallCount);
      expect(stacksTransactions.fetchCallReadOnlyFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          senderAddress: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE',
        })
      );
    });
  });

  it('clears profile when sender address becomes null', async () => {
    mockUseSenderAddress.mockReturnValue('SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B');
    stacksTransactions.cvToJSON.mockReturnValue({
      value: {
        'display-name': { value: 'Test User' },
        'bio': { value: 'Test bio' },
        'avatar-url': { value: 'https://example.com/avatar.png' },
      },
    });

    const { rerender } = renderWithProviders(<ProfileManager addToast={mockToast} />);

    await waitFor(() => {
      expect(screen.getByTestId('profile-name-input')).toHaveValue('Test User');
    });

    mockUseSenderAddress.mockReturnValue(null);
    stacksTransactions.cvToJSON.mockReturnValue({ value: null });

    rerender(<ProfileManager addToast={mockToast} />);

    await waitFor(() => {
      expect(screen.getByTestId('profile-name-input')).toHaveValue('');
    });
  });
});
