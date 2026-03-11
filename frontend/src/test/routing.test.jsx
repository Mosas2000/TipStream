import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { TipProvider } from '../context/TipContext';
import {
  ROUTE_HOME,
  ROUTE_SEND,
  ROUTE_BATCH,
  ROUTE_TOKEN_TIP,
  ROUTE_FEED,
  ROUTE_LEADERBOARD,
  ROUTE_ACTIVITY,
  ROUTE_STATS,
  ROUTE_PROFILE,
  ROUTE_BLOCK,
  ROUTE_ADMIN,
  DEFAULT_AUTHENTICATED_ROUTE,
} from '../config/routes';

/**
 * Routing tests for the TipStream App component.
 *
 * Validates that the root URL ("/") redirects to the default
 * authenticated route and that unknown paths render the NotFound page.
 *
 * Route paths are sourced from config/routes.js so that changes to
 * path strings automatically propagate to these tests.
 */

// Stub out wallet session so the App component thinks the user is signed in
vi.mock('../utils/stacks', () => ({
  userSession: {
    isUserSignedIn: () => true,
    loadUserData: () => ({
      profile: {
        stxAddress: {
          mainnet: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
          testnet: 'ST2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQYAC0RQ',
        },
      },
    }),
  },
  authenticate: vi.fn(),
  disconnect: vi.fn(),
  getMainnetAddress: (data) => data?.profile?.stxAddress?.mainnet ?? null,
  getTestnetAddress: (data) => data?.profile?.stxAddress?.testnet ?? null,
  getNetworkAddress: (data, network = 'mainnet') => {
    if (network === 'testnet' || network === 'devnet') return data?.profile?.stxAddress?.testnet ?? null;
    return data?.profile?.stxAddress?.mainnet ?? null;
  },
  isValidUserData: (data) => {
    const addr = data?.profile?.stxAddress?.mainnet;
    return typeof addr === 'string' && addr.length > 0;
  },
  getSenderAddress: () => 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
}));

// Stub analytics to avoid side effects
vi.mock('../lib/analytics', () => ({
  analytics: {
    trackSession: vi.fn(),
    trackPageView: vi.fn(),
    trackWalletConnect: vi.fn(),
    trackWalletDisconnect: vi.fn(),
    trackAuthError: vi.fn(),
  },
}));

// Stub hooks that hit the network
vi.mock('../hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markAllRead: vi.fn(),
    loading: false,
  }),
}));

vi.mock('../hooks/useContractHealth', () => ({
  useContractHealth: () => ({
    healthy: true,
    error: null,
    checking: false,
    retry: vi.fn(),
  }),
}));

vi.mock('../hooks/useAdmin', () => ({
  useAdmin: () => ({
    isOwner: false,
  }),
}));

// Lazy-loaded route components -- provide lightweight stubs
vi.mock('../components/SendTip', () => ({
  default: () => <div data-testid="send-tip-page">SendTip Page</div>,
}));

vi.mock('../components/TipHistory', () => ({
  default: () => <div data-testid="tip-history-page">TipHistory Page</div>,
}));

vi.mock('../components/PlatformStats', () => ({
  default: () => <div data-testid="platform-stats-page">PlatformStats Page</div>,
}));

vi.mock('../components/RecentTips', () => ({
  default: () => <div data-testid="recent-tips-page">RecentTips Page</div>,
}));

vi.mock('../components/Leaderboard', () => ({
  default: () => <div data-testid="leaderboard-page">Leaderboard Page</div>,
}));

vi.mock('../components/ProfileManager', () => ({
  default: () => <div data-testid="profile-manager-page">ProfileManager Page</div>,
}));

vi.mock('../components/BlockManager', () => ({
  default: () => <div data-testid="block-manager-page">BlockManager Page</div>,
}));

vi.mock('../components/BatchTip', () => ({
  default: () => <div data-testid="batch-tip-page">BatchTip Page</div>,
}));

vi.mock('../components/TokenTip', () => ({
  default: () => <div data-testid="token-tip-page">TokenTip Page</div>,
}));

vi.mock('../components/NotFound', () => ({
  default: () => <div data-testid="not-found-page">NotFound Page</div>,
}));

vi.mock('../components/AdminDashboard', () => ({
  default: () => <div data-testid="admin-dashboard-page">AdminDashboard Page</div>,
}));

import App from '../App';

function renderWithRouter(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <ThemeProvider>
        <TipProvider>
          <App />
        </TipProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('App routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects "/" to the SendTip page', async () => {
    renderWithRouter(ROUTE_HOME);
    const page = await screen.findByTestId('send-tip-page');
    expect(page).toBeInTheDocument();
  });

  it('does not show NotFound for the root URL', async () => {
    renderWithRouter(ROUTE_HOME);
    await screen.findByTestId('send-tip-page');
    expect(screen.queryByTestId('not-found-page')).not.toBeInTheDocument();
  });

  it('renders SendTip at /send', async () => {
    renderWithRouter(ROUTE_SEND);
    const page = await screen.findByTestId('send-tip-page');
    expect(page).toBeInTheDocument();
  });

  it('renders RecentTips at /feed', async () => {
    renderWithRouter(ROUTE_FEED);
    const page = await screen.findByTestId('recent-tips-page');
    expect(page).toBeInTheDocument();
  });

  it('renders Leaderboard at /leaderboard', async () => {
    renderWithRouter(ROUTE_LEADERBOARD);
    const page = await screen.findByTestId('leaderboard-page');
    expect(page).toBeInTheDocument();
  });

  it('renders TipHistory at /activity', async () => {
    renderWithRouter(ROUTE_ACTIVITY);
    const page = await screen.findByTestId('tip-history-page');
    expect(page).toBeInTheDocument();
  });

  it('renders PlatformStats at /stats', async () => {
    renderWithRouter(ROUTE_STATS);
    const page = await screen.findByTestId('platform-stats-page');
    expect(page).toBeInTheDocument();
  });

  it('renders ProfileManager at /profile', async () => {
    renderWithRouter(ROUTE_PROFILE);
    const page = await screen.findByTestId('profile-manager-page');
    expect(page).toBeInTheDocument();
  });

  it('renders BlockManager at /block', async () => {
    renderWithRouter(ROUTE_BLOCK);
    const page = await screen.findByTestId('block-manager-page');
    expect(page).toBeInTheDocument();
  });

  it('renders BatchTip at /batch', async () => {
    renderWithRouter(ROUTE_BATCH);
    const page = await screen.findByTestId('batch-tip-page');
    expect(page).toBeInTheDocument();
  });

  it('renders TokenTip at /token-tip', async () => {
    renderWithRouter(ROUTE_TOKEN_TIP);
    const page = await screen.findByTestId('token-tip-page');
    expect(page).toBeInTheDocument();
  });

  it('renders NotFound for unknown paths', async () => {
    renderWithRouter('/some/nonexistent/path');
    const page = await screen.findByTestId('not-found-page');
    expect(page).toBeInTheDocument();
  });

  it('renders NotFound for /settings which does not exist', async () => {
    renderWithRouter('/settings');
    const page = await screen.findByTestId('not-found-page');
    expect(page).toBeInTheDocument();
  });
});

describe('App navigation bar', () => {
  it('shows the main navigation links for authenticated users', async () => {
    renderWithRouter(ROUTE_SEND);
    await screen.findByTestId('send-tip-page');
    const nav = screen.getByRole('navigation', { name: /main/i });
    expect(within(nav).getByText('Send Tip')).toBeInTheDocument();
    expect(within(nav).getByText('Live Feed')).toBeInTheDocument();
    expect(within(nav).getByText('Leaderboard')).toBeInTheDocument();
    expect(within(nav).getByText('Stats')).toBeInTheDocument();
  }, 15000);

  it('does not show Admin link for non-owners', async () => {
    renderWithRouter(ROUTE_SEND);
    await screen.findByTestId('send-tip-page');
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });
});
