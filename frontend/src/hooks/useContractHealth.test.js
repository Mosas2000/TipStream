import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useContractHealth } from './useContractHealth';

// Mock the config
vi.mock('../config/contracts', () => ({
  CONTRACT_ADDRESS: 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T',
  CONTRACT_NAME: 'tipstream',
  STACKS_API_BASE: 'https://api.hiro.so'
}));

describe('useContractHealth Hook', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('sets healthy to true when contract check succeeds', async () => {
    const mockResponse = {
      functions: [{ name: 'send-tip' }]
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const { result } = renderHook(() => useContractHealth());

    expect(result.current.checking).toBe(true);

    await waitFor(() => {
      expect(result.current.healthy).toBe(true);
    });
    
    expect(result.current.checking).toBe(false);
  });

  it('sets healthy to false when contract is missing expected functions', async () => {
    const mockResponse = {
      functions: [{ name: 'other-function' }]
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const { result } = renderHook(() => useContractHealth());

    await waitFor(() => {
      expect(result.current.healthy).toBe(false);
    });
    
    expect(result.current.error).toContain('does not contain expected functions');
  });

  it('handles network errors', async () => {
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useContractHealth());

    await waitFor(() => {
      expect(result.current.healthy).toBe(false);
    });
    
    expect(result.current.error).toContain('Unable to reach the Stacks API');
  });

  it('handles API errors (non-ok responses)', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404
    });

    const { result } = renderHook(() => useContractHealth());

    await waitFor(() => {
      expect(result.current.healthy).toBe(false);
    });
    
    expect(result.current.error).toContain('not found');
  });

  it('handles health check timeout', async () => {
    vi.useFakeTimers();
    // Mock fetch to simulate a hang
    global.fetch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useContractHealth());

    act(() => {
      vi.advanceTimersByTime(11000);
    });

    await waitFor(() => {
      expect(result.current.healthy).toBe(false);
    });
    
    expect(result.current.error).toContain('timed out');
    vi.useRealTimers();
  });

  it('cleans up resources on unmount and ignores late updates', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    let resolveFetch;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    global.fetch.mockReturnValue(fetchPromise);

    const { unmount, result } = renderHook(() => useContractHealth());

    expect(result.current.checking).toBe(true);

    unmount();

    // Verify clearTimeout was called (at least once for the timeoutId)
    expect(clearTimeoutSpy).toHaveBeenCalled();

    // Resolve fetch after unmount
    await act(async () => {
      resolveFetch({
        ok: true,
        json: () => Promise.resolve({ functions: [{ name: 'send-tip' }] })
      });
    });

    // Healthy should still be null, not true
    expect(result.current.healthy).toBeNull();
  });
});
