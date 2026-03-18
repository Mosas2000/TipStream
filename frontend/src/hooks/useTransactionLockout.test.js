import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTransactionLockout } from './useTransactionLockout';

describe('useTransactionLockout Hook', () => {
  it('allows transactions when primary source is live', () => {
    const { result } = renderHook(() =>
      useTransactionLockout({ primary: 'live' })
    );

    expect(result.current.isLocked).toBe(false);
    expect(result.current.lockReason).toBeNull();
    expect(result.current.severity).toBe('none');
  });

  it('locks transactions when primary source is cache', () => {
    const { result } = renderHook(() =>
      useTransactionLockout({ primary: 'cache' })
    );

    expect(result.current.isLocked).toBe(true);
    expect(result.current.lockReason).toContain('cached data');
    expect(result.current.severity).toBe('warning');
    expect(result.current.canSuggestRetry).toBe(true);
  });

  it('locks transactions with critical severity when data unavailable', () => {
    const { result } = renderHook(() =>
      useTransactionLockout({ primary: 'none' })
    );

    expect(result.current.isLocked).toBe(true);
    expect(result.current.lockReason).toContain('Unable to verify');
    expect(result.current.severity).toBe('critical');
    expect(result.current.canSuggestRetry).toBe(true);
  });

  it('provides transaction status via method', () => {
    const { result } = renderHook(() =>
      useTransactionLockout({ primary: 'cache' })
    );

    const status = result.current.getTransactionStatus();
    expect(status.allowed).toBe(false);
    expect(status.reason).toBeDefined();
    expect(status.severity).toBe('warning');
    expect(status.canRetry).toBe(true);
  });

  it('handles default sources', () => {
    const { result } = renderHook(() =>
      useTransactionLockout()
    );

    expect(result.current.isLocked).toBe(false);
    expect(result.current.severity).toBe('none');
  });

  it('provides informative messages for each state', () => {
    const cacheResult = renderHook(() =>
      useTransactionLockout({ primary: 'cache' })
    );
    expect(cacheResult.result.current.lockReason).toContain('cached');

    const noneResult = renderHook(() =>
      useTransactionLockout({ primary: 'none' })
    );
    expect(noneResult.result.current.lockReason).toContain('connection');
  });

  it('indicates retry suggestion availability', () => {
    const liveResult = renderHook(() =>
      useTransactionLockout({ primary: 'live' })
    );
    expect(liveResult.result.current.canSuggestRetry).toBe(false);

    const cachedResult = renderHook(() =>
      useTransactionLockout({ primary: 'cache' })
    );
    expect(cachedResult.result.current.canSuggestRetry).toBe(true);

    const noneResult = renderHook(() =>
      useTransactionLockout({ primary: 'none' })
    );
    expect(noneResult.result.current.canSuggestRetry).toBe(true);
  });
});
