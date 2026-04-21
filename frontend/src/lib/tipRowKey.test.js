import { describe, it, expect } from 'vitest';
import { getTipRowKey } from './tipRowKey';

describe('getTipRowKey', () => {
  it('uses tipId when present', () => {
    expect(getTipRowKey({ tipId: '123' })).toBe('tip:123');
  });

  it('handles numeric tipId', () => {
    expect(getTipRowKey({ tipId: 0 })).toBe('tip:0');
  });

  it('falls back to unknown when tipId is missing', () => {
    expect(getTipRowKey({})).toBe('tip:unknown');
  });
});
