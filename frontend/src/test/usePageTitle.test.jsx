import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  ROUTE_SEND,
  ROUTE_FEED,
  ROUTE_LEADERBOARD,
  ROUTE_ACTIVITY,
  ROUTE_STATS,
  ROUTE_PROFILE,
  ROUTE_BLOCK,
  ROUTE_TOKEN_TIP,
  ROUTE_ADMIN,
  ROUTE_TITLES,
  DEFAULT_TITLE,
} from '../config/routes';

/**
 * Tests for the usePageTitle hook.
 *
 * Each test renders the hook inside a MemoryRouter pointed at a specific
 * path and then asserts that document.title was updated accordingly.
 */

const originalTitle = document.title;

afterEach(() => {
  document.title = originalTitle;
});

function wrapper(path) {
  return ({ children }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  );
}

describe('usePageTitle', () => {
  it('sets the title for the /send route', () => {
    renderHook(() => usePageTitle(), { wrapper: wrapper(ROUTE_SEND) });
    expect(document.title).toBe(ROUTE_TITLES[ROUTE_SEND]);
  });

  it('sets the title for the /feed route', () => {
    renderHook(() => usePageTitle(), { wrapper: wrapper(ROUTE_FEED) });
    expect(document.title).toBe(ROUTE_TITLES[ROUTE_FEED]);
  });

  it('sets the title for the /leaderboard route', () => {
    renderHook(() => usePageTitle(), { wrapper: wrapper(ROUTE_LEADERBOARD) });
    expect(document.title).toBe(ROUTE_TITLES[ROUTE_LEADERBOARD]);
  });

  it('sets the title for the /activity route', () => {
    renderHook(() => usePageTitle(), { wrapper: wrapper(ROUTE_ACTIVITY) });
    expect(document.title).toBe(ROUTE_TITLES[ROUTE_ACTIVITY]);
  });

  it('sets the title for the /stats route', () => {
    renderHook(() => usePageTitle(), { wrapper: wrapper(ROUTE_STATS) });
    expect(document.title).toBe(ROUTE_TITLES[ROUTE_STATS]);
  });

  it('sets the title for the /profile route', () => {
    renderHook(() => usePageTitle(), { wrapper: wrapper(ROUTE_PROFILE) });
    expect(document.title).toBe(ROUTE_TITLES[ROUTE_PROFILE]);
  });

  it('sets the title for the /block route', () => {
    renderHook(() => usePageTitle(), { wrapper: wrapper(ROUTE_BLOCK) });
    expect(document.title).toBe(ROUTE_TITLES[ROUTE_BLOCK]);
  });

  it('sets the title for the /token-tip route', () => {
    renderHook(() => usePageTitle(), { wrapper: wrapper(ROUTE_TOKEN_TIP) });
    expect(document.title).toBe(ROUTE_TITLES[ROUTE_TOKEN_TIP]);
  });

  it('sets the title for the /admin route', () => {
    renderHook(() => usePageTitle(), { wrapper: wrapper(ROUTE_ADMIN) });
    expect(document.title).toBe(ROUTE_TITLES[ROUTE_ADMIN]);
  });

  it('falls back to the default title for unknown routes', () => {
    renderHook(() => usePageTitle(), { wrapper: wrapper('/unknown/path') });
    expect(document.title).toBe(DEFAULT_TITLE);
  });

  it('includes the app name in every route title', () => {
    Object.values(ROUTE_TITLES).forEach((title) => {
      expect(title).toContain('TipStream');
    });
  });
});
