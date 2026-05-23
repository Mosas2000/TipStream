import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import NotificationPreferences from '../components/NotificationPreferences';
import { NotificationPreferencesProvider } from '../context/NotificationPreferencesContext';
import { CHANNELS, EVENT_TYPES, EVENT_LABELS, CHANNEL_LABELS } from '../lib/notificationPreferences';

const ADDRESS = 'SP1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE';

function renderWithProvider(addToast = vi.fn()) {
  return render(
    <NotificationPreferencesProvider userAddress={ADDRESS}>
      <NotificationPreferences addToast={addToast} />
    </NotificationPreferencesProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('NotificationPreferences rendering', () => {
  it('renders the component with a heading', () => {
    renderWithProvider();
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
  });

  it('renders the Channels section heading', () => {
    renderWithProvider();
    expect(screen.getByText('Channels')).toBeInTheDocument();
  });

  it('renders the Event types section heading', () => {
    renderWithProvider();
    expect(screen.getByText('Event types')).toBeInTheDocument();
  });

  it('renders the in-app channel toggle', () => {
    renderWithProvider();
    expect(screen.getByText(CHANNEL_LABELS[CHANNELS.IN_APP])).toBeInTheDocument();
  });

  it('renders the email channel toggle', () => {
    renderWithProvider();
    expect(screen.getByText(CHANNEL_LABELS[CHANNELS.EMAIL])).toBeInTheDocument();
  });

  it('renders all event type labels', () => {
    renderWithProvider();
    Object.values(EVENT_LABELS).forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('renders the reset button', () => {
    renderWithProvider();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('has the correct data-testid', () => {
    renderWithProvider();
    expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
  });
});

describe('channel toggles', () => {
  it('in-app toggle is checked by default', () => {
    renderWithProvider();
    const toggle = screen.getByRole('switch', { name: /in-app/i });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('email toggle is unchecked by default', () => {
    renderWithProvider();
    const toggle = screen.getByRole('switch', { name: /email notifications/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking in-app toggle disables it', () => {
    renderWithProvider();
    const toggle = screen.getByRole('switch', { name: /in-app/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking email toggle enables it', () => {
    renderWithProvider();
    const toggle = screen.getByRole('switch', { name: /email notifications/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('persists channel toggle to localStorage', () => {
    renderWithProvider();
    const toggle = screen.getByRole('switch', { name: /email notifications/i });
    fireEvent.click(toggle);
    const stored = JSON.parse(localStorage.getItem(`tipstream_notif_prefs_${ADDRESS}`));
    expect(stored.channels[CHANNELS.EMAIL]).toBe(true);
  });
});

describe('email input', () => {
  it('does not show email input when email channel is disabled', () => {
    renderWithProvider();
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
  });

  it('shows email input when email channel is enabled', () => {
    renderWithProvider();
    const toggle = screen.getByRole('switch', { name: /email notifications/i });
    fireEvent.click(toggle);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('shows validation error for an invalid email', () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole('switch', { name: /email notifications/i }));
    const input = screen.getByLabelText(/email address/i);
    fireEvent.change(input, { target: { value: 'not-valid' } });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert').textContent).toMatch(/valid email/i);
  });

  it('clears validation error when a valid email is entered', () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole('switch', { name: /email notifications/i }));
    const input = screen.getByLabelText(/email address/i);
    fireEvent.change(input, { target: { value: 'not-valid' } });
    fireEvent.change(input, { target: { value: 'valid@example.com' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('saves email on Save button click and calls addToast', () => {
    const addToast = vi.fn();
    renderWithProvider(addToast);
    fireEvent.click(screen.getByRole('switch', { name: /email notifications/i }));
    const input = screen.getByLabelText(/email address/i);
    fireEvent.change(input, { target: { value: 'save@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(addToast).toHaveBeenCalledWith('Email address saved', 'success');
  });

  it('saves email on Enter key press', () => {
    const addToast = vi.fn();
    renderWithProvider(addToast);
    fireEvent.click(screen.getByRole('switch', { name: /email notifications/i }));
    const input = screen.getByLabelText(/email address/i);
    fireEvent.change(input, { target: { value: 'enter@example.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(addToast).toHaveBeenCalledWith('Email address saved', 'success');
  });

  it('Save button is disabled when email is invalid', () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole('switch', { name: /email notifications/i }));
    const input = screen.getByLabelText(/email address/i);
    fireEvent.change(input, { target: { value: 'bad' } });
    const saveBtn = screen.getByRole('button', { name: /^save$/i });
    expect(saveBtn).toBeDisabled();
  });
});

describe('event type toggles', () => {
  it('tip_received toggle is checked by default', () => {
    renderWithProvider();
    const toggle = screen.getByRole('switch', { name: new RegExp(EVENT_LABELS[EVENT_TYPES.TIP_RECEIVED], 'i') });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('tip_sent toggle is unchecked by default', () => {
    renderWithProvider();
    const toggle = screen.getByRole('switch', { name: new RegExp(EVENT_LABELS[EVENT_TYPES.TIP_SENT], 'i') });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking tip_sent toggle enables it', () => {
    renderWithProvider();
    const toggle = screen.getByRole('switch', { name: new RegExp(EVENT_LABELS[EVENT_TYPES.TIP_SENT], 'i') });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('clicking tip_received toggle disables it', () => {
    renderWithProvider();
    const toggle = screen.getByRole('switch', { name: new RegExp(EVENT_LABELS[EVENT_TYPES.TIP_RECEIVED], 'i') });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('persists event toggle to localStorage', () => {
    renderWithProvider();
    const toggle = screen.getByRole('switch', { name: new RegExp(EVENT_LABELS[EVENT_TYPES.TIP_SENT], 'i') });
    fireEvent.click(toggle);
    const stored = JSON.parse(localStorage.getItem(`tipstream_notif_prefs_${ADDRESS}`));
    expect(stored.events[EVENT_TYPES.TIP_SENT]).toBe(true);
  });
});

describe('reset button', () => {
  it('resets all toggles to defaults', () => {
    renderWithProvider();
    const inAppToggle = screen.getByRole('switch', { name: /in-app/i });
    fireEvent.click(inAppToggle);
    expect(inAppToggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(inAppToggle).toHaveAttribute('aria-checked', 'true');
  });

  it('calls addToast with info type on reset', () => {
    const addToast = vi.fn();
    renderWithProvider(addToast);
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(addToast).toHaveBeenCalledWith(
      'Notification preferences reset to defaults',
      'info'
    );
  });

  it('clears localStorage on reset', () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole('switch', { name: /email notifications/i }));
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(localStorage.getItem(`tipstream_notif_prefs_${ADDRESS}`)).toBeNull();
  });

  it('hides email input after reset when email channel was enabled', () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole('switch', { name: /email notifications/i }));
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
  });
});

describe('accessibility', () => {
  it('channels section has an accessible heading', () => {
    renderWithProvider();
    expect(screen.getByRole('region', { name: /channels/i })).toBeInTheDocument();
  });

  it('event types section has an accessible heading', () => {
    renderWithProvider();
    expect(screen.getByRole('region', { name: /event types/i })).toBeInTheDocument();
  });

  it('all toggles have role switch', () => {
    renderWithProvider();
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThanOrEqual(2);
  });

  it('reset button has an accessible aria-label', () => {
    renderWithProvider();
    expect(
      screen.getByRole('button', { name: /reset notification preferences/i })
    ).toBeInTheDocument();
  });
});
