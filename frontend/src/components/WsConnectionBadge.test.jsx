import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WsConnectionBadge } from './WsConnectionBadge';
import { WS_STATUS } from '../hooks/useWebSocket';

// Mock TipContext so we can control wsStatus without a real WebSocket.
const mockUseTipContext = vi.fn();
vi.mock('../context/TipContext', () => ({
  useTipContext: () => mockUseTipContext(),
}));

// Default: WS_URL is configured.
vi.mock('../config/contracts', () => ({
  WS_URL: 'ws://localhost:3001/ws',
}));

function renderBadge(wsStatus) {
  mockUseTipContext.mockReturnValue({ wsStatus });
  return render(<WsConnectionBadge />);
}

describe('WsConnectionBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Live" label when connected', () => {
    renderBadge(WS_STATUS.CONNECTED);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders "Connecting" label when connecting', () => {
    renderBadge(WS_STATUS.CONNECTING);
    expect(screen.getByText('Connecting')).toBeInTheDocument();
  });

  it('renders "Reconnecting" label when reconnecting', () => {
    renderBadge(WS_STATUS.RECONNECTING);
    expect(screen.getByText('Reconnecting')).toBeInTheDocument();
  });

  it('renders "Polling" label when disconnected', () => {
    renderBadge(WS_STATUS.DISCONNECTED);
    expect(screen.getByText('Polling')).toBeInTheDocument();
  });

  it('renders "Polling" label on error', () => {
    renderBadge(WS_STATUS.ERROR);
    expect(screen.getByText('Polling')).toBeInTheDocument();
  });

  it('has an accessible aria-label when connected', () => {
    renderBadge(WS_STATUS.CONNECTED);
    expect(screen.getByLabelText('Real-time updates active')).toBeInTheDocument();
  });

  it('has an accessible aria-label when polling', () => {
    renderBadge(WS_STATUS.DISCONNECTED);
    expect(
      screen.getByLabelText('Real-time unavailable, using polling')
    ).toBeInTheDocument();
  });

  it('has an accessible aria-label when connecting', () => {
    renderBadge(WS_STATUS.CONNECTING);
    expect(
      screen.getByLabelText('Connecting to real-time feed')
    ).toBeInTheDocument();
  });

  it('renders the status dot with aria-hidden', () => {
    renderBadge(WS_STATUS.CONNECTED);
    const badge = screen.getByLabelText('Real-time updates active');
    const dot = badge.querySelector('[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
  });

  it('applies extra className prop', () => {
    mockUseTipContext.mockReturnValue({ wsStatus: WS_STATUS.CONNECTED });
    render(<WsConnectionBadge className="extra-class" />);
    const badge = screen.getByLabelText('Real-time updates active');
    expect(badge.className).toContain('extra-class');
  });

  it('dot has animate-pulse class when connecting', () => {
    renderBadge(WS_STATUS.CONNECTING);
    const badge = screen.getByLabelText('Connecting to real-time feed');
    const dot = badge.querySelector('[aria-hidden="true"]');
    expect(dot.className).toContain('animate-pulse');
  });

  it('dot has green background when connected', () => {
    renderBadge(WS_STATUS.CONNECTED);
    const badge = screen.getByLabelText('Real-time updates active');
    const dot = badge.querySelector('[aria-hidden="true"]');
    expect(dot.className).toContain('bg-green-500');
  });

  it('dot has gray background when polling', () => {
    renderBadge(WS_STATUS.DISCONNECTED);
    const badge = screen.getByLabelText('Real-time unavailable, using polling');
    const dot = badge.querySelector('[aria-hidden="true"]');
    expect(dot.className).toContain('bg-gray-400');
  });
});
