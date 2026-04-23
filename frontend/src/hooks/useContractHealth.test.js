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
});
