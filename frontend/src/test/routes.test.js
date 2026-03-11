import { describe, it, expect } from 'vitest';
import {
  ROUTE_HOME,
  ROUTE_SEND,
  ROUTE_BATCH,
  ROUTE_TOKEN_TIP,
  ROUTE_FEED,
  ROUTE_LEADERBOARD,
  ROUTE_ACTIVITY,
  ROUTE_PROFILE,
  ROUTE_BLOCK,
  ROUTE_STATS,
  ROUTE_ADMIN,
  DEFAULT_AUTHENTICATED_ROUTE,
  ROUTE_LABELS,
} from '../config/routes';

/**
 * Tests for route configuration constants.
 *
 * Ensures all paths start with "/", nothing is accidentally duplicated,
 * and the default route points to a valid path.
 */

describe('Route constants', () => {
  const ALL_ROUTES = [
    ROUTE_HOME,
    ROUTE_SEND,
    ROUTE_BATCH,
    ROUTE_TOKEN_TIP,
    ROUTE_FEED,
    ROUTE_LEADERBOARD,
    ROUTE_ACTIVITY,
    ROUTE_PROFILE,
    ROUTE_BLOCK,
    ROUTE_STATS,
    ROUTE_ADMIN,
  ];

  it('every route starts with a forward slash', () => {
    for (const route of ALL_ROUTES) {
      expect(route).toMatch(/^\//);
    }
  });

  it('no two routes share the same path (except HOME)', () => {
    const nonHome = ALL_ROUTES.filter((r) => r !== ROUTE_HOME);
    const unique = new Set(nonHome);
    expect(unique.size).toBe(nonHome.length);
  });

  it('ROUTE_HOME is "/"', () => {
    expect(ROUTE_HOME).toBe('/');
  });

  it('DEFAULT_AUTHENTICATED_ROUTE points to ROUTE_SEND', () => {
    expect(DEFAULT_AUTHENTICATED_ROUTE).toBe(ROUTE_SEND);
  });

  it('DEFAULT_AUTHENTICATED_ROUTE is one of the defined routes', () => {
    expect(ALL_ROUTES).toContain(DEFAULT_AUTHENTICATED_ROUTE);
  });

  it('ROUTE_SEND is "/send"', () => {
    expect(ROUTE_SEND).toBe('/send');
  });

  it('ROUTE_BATCH is "/batch"', () => {
    expect(ROUTE_BATCH).toBe('/batch');
  });

  it('ROUTE_TOKEN_TIP is "/token-tip"', () => {
    expect(ROUTE_TOKEN_TIP).toBe('/token-tip');
  });

  it('ROUTE_FEED is "/feed"', () => {
    expect(ROUTE_FEED).toBe('/feed');
  });

  it('ROUTE_LEADERBOARD is "/leaderboard"', () => {
    expect(ROUTE_LEADERBOARD).toBe('/leaderboard');
  });

  it('ROUTE_ACTIVITY is "/activity"', () => {
    expect(ROUTE_ACTIVITY).toBe('/activity');
  });

  it('ROUTE_PROFILE is "/profile"', () => {
    expect(ROUTE_PROFILE).toBe('/profile');
  });

  it('ROUTE_BLOCK is "/block"', () => {
    expect(ROUTE_BLOCK).toBe('/block');
  });

  it('ROUTE_STATS is "/stats"', () => {
    expect(ROUTE_STATS).toBe('/stats');
  });

  it('ROUTE_ADMIN is "/admin"', () => {
    expect(ROUTE_ADMIN).toBe('/admin');
  });
});

describe('ROUTE_LABELS', () => {
  it('has a label for every navigable route', () => {
    expect(ROUTE_LABELS[ROUTE_SEND]).toBeDefined();
    expect(ROUTE_LABELS[ROUTE_BATCH]).toBeDefined();
    expect(ROUTE_LABELS[ROUTE_TOKEN_TIP]).toBeDefined();
    expect(ROUTE_LABELS[ROUTE_FEED]).toBeDefined();
    expect(ROUTE_LABELS[ROUTE_LEADERBOARD]).toBeDefined();
    expect(ROUTE_LABELS[ROUTE_ACTIVITY]).toBeDefined();
    expect(ROUTE_LABELS[ROUTE_PROFILE]).toBeDefined();
    expect(ROUTE_LABELS[ROUTE_BLOCK]).toBeDefined();
    expect(ROUTE_LABELS[ROUTE_STATS]).toBeDefined();
    expect(ROUTE_LABELS[ROUTE_ADMIN]).toBeDefined();
  });

  it('labels are non-empty strings', () => {
    for (const label of Object.values(ROUTE_LABELS)) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('Send Tip label is correct', () => {
    expect(ROUTE_LABELS[ROUTE_SEND]).toBe('Send Tip');
  });

  it('Admin label is correct', () => {
    expect(ROUTE_LABELS[ROUTE_ADMIN]).toBe('Admin');
  });
});
