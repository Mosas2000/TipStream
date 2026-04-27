import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockToast } from '../test/testUtils';
import ProfileManager from './ProfileManager';
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
  useSenderAddress: vi.fn(() => 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B'),
}));

describe('ProfileManager', () => {
  let mockToast;

  beforeEach(() => {
    mockToast = createMockToast();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('shows loading state initially', () => {
      stacksTransactions.fetchCallReadOnlyFunction.mockImplementation(
        () => new Promise(() => {})
      );

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      expect(screen.getByTestId('profile-loading')).toBeInTheDocument();
      expect(screen.getByTestId('profile-loading')).toHaveAttribute('aria-busy', 'true');
    });

    it('renders create profile form when no profile exists', async () => {
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create profile/i })).toBeInTheDocument();
      });
    });

    it('renders edit profile form when profile exists', async () => {
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({
        value: {
          'display-name': { value: 'John Doe' },
          'bio': { value: 'Developer' },
          'avatar-url': { value: 'https://example.com/avatar.png' },
        },
      });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit profile/i })).toBeInTheDocument();
      });
    });

    it('displays all form fields', async () => {
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^bio$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/avatar url/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading Existing Profile', () => {
    it('populates form with existing profile data', async () => {
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({
        value: {
          'display-name': { value: 'Alice Smith' },
          'bio': { value: 'Blockchain enthusiast' },
          'avatar-url': { value: 'https://example.com/alice.png' },
        },
      });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toHaveValue('Alice Smith');
        expect(screen.getByTestId('profile-bio-input')).toHaveValue('Blockchain enthusiast');
        expect(screen.getByTestId('profile-avatar-input')).toHaveValue('https://example.com/alice.png');
      });
    });

    it('handles missing optional fields', async () => {
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({
        value: {
          'display-name': { value: 'Bob' },
          'bio': { value: '' },
          'avatar-url': { value: '' },
        },
      });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toHaveValue('Bob');
        expect(screen.getByTestId('profile-bio-input')).toHaveValue('');
        expect(screen.getByTestId('profile-avatar-input')).toHaveValue('');
      });
    });
  });

  describe('Display Name Validation', () => {
    it('shows character count', async () => {
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText(/0\/50/i)).toBeInTheDocument();
      });
    });

    it('updates character count as user types', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      await user.type(nameInput, 'John');

      expect(screen.getByText(/4\/50/i)).toBeInTheDocument();
    });

    it('enforces maximum length of 50 characters', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      const longName = 'a'.repeat(60);

      await user.type(nameInput, longName);

      expect(nameInput.value.length).toBeLessThanOrEqual(50);
    });

    it('requires display name', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-save-button')).toBeInTheDocument();
      });

      const saveButton = screen.getByTestId('profile-save-button');
      await user.click(saveButton);

      expect(mockToast).toHaveBeenCalledWith('Display name is required', 'warning');
    });
  });

  describe('Bio Validation', () => {
    it('shows character count', async () => {
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText(/0\/280/i)).toBeInTheDocument();
      });
    });

    it('updates character count as user types', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-bio-input')).toBeInTheDocument();
      });

      const bioInput = screen.getByTestId('profile-bio-input');
      await user.type(bioInput, 'Developer');

      expect(screen.getByText(/9\/280/i)).toBeInTheDocument();
    });

    it('enforces maximum length of 280 characters', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-bio-input')).toBeInTheDocument();
      });

      const bioInput = screen.getByTestId('profile-bio-input');
      const longBio = 'a'.repeat(300);

      await user.type(bioInput, longBio);

      expect(bioInput.value.length).toBeLessThanOrEqual(280);
    });
  });

  describe('Avatar URL Validation', () => {
    it('shows character count', async () => {
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText(/0\/256/i)).toBeInTheDocument();
      });
    });

    it('validates HTTPS protocol', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-avatar-input')).toBeInTheDocument();
      });

      const avatarInput = screen.getByTestId('profile-avatar-input');
      await user.type(avatarInput, 'http://example.com/avatar.png');

      await waitFor(() => {
        expect(screen.getByTestId('avatar-invalid')).toBeInTheDocument();
        expect(screen.getByText(/avatar url must use https/i)).toBeInTheDocument();
      });
    });

    it('shows preview for valid HTTPS URL', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-avatar-input')).toBeInTheDocument();
      });

      const avatarInput = screen.getByTestId('profile-avatar-input');
      await user.type(avatarInput, 'https://example.com/avatar.png');

      await waitFor(() => {
        expect(screen.getByTestId('avatar-preview')).toBeInTheDocument();
        const img = screen.getByAltText(/avatar preview/i);
        expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');
      });
    });

    it('enforces maximum length of 256 characters', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-avatar-input')).toBeInTheDocument();
      });

      const avatarInput = screen.getByTestId('profile-avatar-input');
      const longUrl = 'https://example.com/' + 'a'.repeat(300);

      await user.type(avatarInput, longUrl);

      expect(avatarInput.value.length).toBeLessThanOrEqual(256);
    });

    it('disables save button when avatar URL is invalid', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      const avatarInput = screen.getByTestId('profile-avatar-input');

      await user.type(nameInput, 'John Doe');
      await user.type(avatarInput, 'http://example.com/avatar.png');

      const saveButton = screen.getByTestId('profile-save-button');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Saving Profile', () => {
    it('saves new profile successfully', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });
      stacksConnect.openContractCall.mockImplementation(({ onFinish }) => {
        onFinish({ txId: 'tx123' });
      });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      const bioInput = screen.getByTestId('profile-bio-input');
      const avatarInput = screen.getByTestId('profile-avatar-input');

      await user.type(nameInput, 'Alice');
      await user.type(bioInput, 'Blockchain developer');
      await user.type(avatarInput, 'https://example.com/alice.png');

      const saveButton = screen.getByTestId('profile-save-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(stacksConnect.openContractCall).toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(
          expect.stringContaining('Profile updated'),
          'success'
        );
      });
    });

    it('updates existing profile successfully', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({
        value: {
          'display-name': { value: 'Old Name' },
          'bio': { value: 'Old bio' },
          'avatar-url': { value: 'https://example.com/old.png' },
        },
      });
      stacksConnect.openContractCall.mockImplementation(({ onFinish }) => {
        onFinish({ txId: 'tx456' });
      });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toHaveValue('Old Name');
      });

      const nameInput = screen.getByTestId('profile-name-input');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      const saveButton = screen.getByTestId('profile-save-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(stacksConnect.openContractCall).toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(
          expect.stringContaining('Profile updated'),
          'success'
        );
      });
    });

    it('handles cancel during save', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });
      stacksConnect.openContractCall.mockImplementation(({ onCancel }) => {
        onCancel();
      });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      await user.type(nameInput, 'Alice');

      const saveButton = screen.getByTestId('profile-save-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Profile update cancelled', 'info');
      });
    });

    it('handles save error gracefully', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });
      stacksConnect.openContractCall.mockRejectedValue(new Error('Wallet error'));

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      await user.type(nameInput, 'Alice');

      const saveButton = screen.getByTestId('profile-save-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          'Failed to update profile. Please try again.',
          'error'
        );
      });
    });

    it('validates all fields before saving', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      const bioInput = screen.getByTestId('profile-bio-input');

      await user.type(nameInput, 'a'.repeat(51));
      await user.type(bioInput, 'a'.repeat(281));

      const saveButton = screen.getByTestId('profile-save-button');
      await user.click(saveButton);

      expect(mockToast).toHaveBeenCalledWith(
        expect.stringMatching(/50 characters|280 characters/),
        'warning'
      );
    });
  });

  describe('Accessibility', () => {
    it('has proper form role and label', async () => {
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByRole('form', { name: /profile settings/i })).toBeInTheDocument();
      });
    });

    it('has proper labels for all inputs', async () => {
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^bio$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/avatar url/i)).toBeInTheDocument();
      });
    });

    it('marks display name as required', async () => {
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/display name/i);
        expect(nameInput).toHaveAttribute('required');
        expect(nameInput).toHaveAttribute('aria-required', 'true');
      });
    });

    it('associates character counts with inputs', async () => {
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/display name/i);
        expect(nameInput).toHaveAttribute('aria-describedby', 'profile-name-count');
      });
    });

    it('marks invalid avatar URL with aria-invalid', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-avatar-input')).toBeInTheDocument();
      });

      const avatarInput = screen.getByTestId('profile-avatar-input');
      await user.type(avatarInput, 'http://example.com/avatar.png');

      await waitFor(() => {
        expect(avatarInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('provides error message with role alert', async () => {
      const user = userEvent.setup();
      stacksTransactions.fetchCallReadOnlyFunction.mockResolvedValue({});
      stacksTransactions.cvToJSON.mockReturnValue({ value: null });

      renderWithProviders(<ProfileManager addToast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-avatar-input')).toBeInTheDocument();
      });

      const avatarInput = screen.getByTestId('profile-avatar-input');
      await user.type(avatarInput, 'http://example.com/avatar.png');

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toHaveTextContent(/avatar url must use https/i);
      });
    });
  });
});
