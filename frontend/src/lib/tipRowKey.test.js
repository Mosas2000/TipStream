import { describe, it, expect } from 'vitest';
import { getTipRowKey } from './tipRowKey';

describe('getTipRowKey', () => {
  it('uses tipId when present', () => {
    expect(getTipRowKey({ tipId: '123' })).toBe('tip:123');
  });

  it('handles numeric tipId', () => {
    expect(getTipRowKey({ tipId: 0 })).toBe('tip:0');
  });

  it('uses txId when tipId is missing', () => {
    expect(getTipRowKey({ txId: '0xabc' })).toBe('tx:0xabc');
  });

  it('builds a fingerprint when tipId and txId are missing', () => {
    expect(getTipRowKey({ sender: 'SP1', recipient: 'SP2', amount: '10', fee: '1', timestamp: 1700 }))
      .toBe('fp:SP1:SP2:10:1:1700');
  });

  it('fingerprint does not depend on message enrichment', () => {
    const base = { sender: 'SP1', recipient: 'SP2', amount: '10', fee: '1', timestamp: 1700 };
    expect(getTipRowKey({ ...base, message: '' })).toBe(getTipRowKey({ ...base, message: 'hello' }));
  });
});
