import { describe, it, expect } from 'vitest';
import { getTipRowKey } from '../lib/tipRowKey';

describe('getTipRowKey', () => {
  it('returns tip key when tipId is present', () => {
    const tip = {
      tipId: '123',
      txId: '0xabc',
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
    };

    expect(getTipRowKey(tip)).toBe('tip:123');
  });

  it('returns tx key when tipId is missing but txId is present', () => {
    const tip = {
      tipId: undefined,
      txId: '0xabc123',
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
    };

    expect(getTipRowKey(tip)).toBe('tx:0xabc123');
  });

  it('returns fingerprint when both tipId and txId are missing', () => {
    const tip = {
      tipId: undefined,
      txId: undefined,
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
    };

    expect(getTipRowKey(tip)).toBe('fp:SP1SENDER:SP2RECIPIENT:1000000:50000:1700000000');
  });

  it('handles null tipId', () => {
    const tip = {
      tipId: null,
      txId: '0xdef',
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
    };

    expect(getTipRowKey(tip)).toBe('tx:0xdef');
  });

  it('handles empty string tipId', () => {
    const tip = {
      tipId: '',
      txId: '0xghi',
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
    };

    expect(getTipRowKey(tip)).toBe('tx:0xghi');
  });

  it('handles whitespace-only tipId', () => {
    const tip = {
      tipId: '   ',
      txId: '0xjkl',
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
    };

    expect(getTipRowKey(tip)).toBe('tx:0xjkl');
  });

  it('handles null txId with missing tipId', () => {
    const tip = {
      tipId: undefined,
      txId: null,
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
    };

    expect(getTipRowKey(tip)).toBe('fp:SP1SENDER:SP2RECIPIENT:1000000:50000:1700000000');
  });

  it('handles empty string txId with missing tipId', () => {
    const tip = {
      tipId: undefined,
      txId: '',
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
    };

    expect(getTipRowKey(tip)).toBe('fp:SP1SENDER:SP2RECIPIENT:1000000:50000:1700000000');
  });

  it('uses unknown for missing sender in fingerprint', () => {
    const tip = {
      tipId: undefined,
      txId: undefined,
      sender: undefined,
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
    };

    expect(getTipRowKey(tip)).toBe('fp:unknown:SP2RECIPIENT:1000000:50000:1700000000');
  });

  it('uses unknown for missing recipient in fingerprint', () => {
    const tip = {
      tipId: undefined,
      txId: undefined,
      sender: 'SP1SENDER',
      recipient: null,
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
    };

    expect(getTipRowKey(tip)).toBe('fp:SP1SENDER:unknown:1000000:50000:1700000000');
  });

  it('uses 0 for missing amount in fingerprint', () => {
    const tip = {
      tipId: undefined,
      txId: undefined,
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: undefined,
      fee: '50000',
      timestamp: 1700000000,
    };

    expect(getTipRowKey(tip)).toBe('fp:SP1SENDER:SP2RECIPIENT:0:50000:1700000000');
  });

  it('uses 0 for missing fee in fingerprint', () => {
    const tip = {
      tipId: undefined,
      txId: undefined,
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: null,
      timestamp: 1700000000,
    };

    expect(getTipRowKey(tip)).toBe('fp:SP1SENDER:SP2RECIPIENT:1000000:0:1700000000');
  });

  it('uses 0 for missing timestamp in fingerprint', () => {
    const tip = {
      tipId: undefined,
      txId: undefined,
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: undefined,
    };

    expect(getTipRowKey(tip)).toBe('fp:SP1SENDER:SP2RECIPIENT:1000000:50000:0');
  });

  it('handles completely empty tip object', () => {
    const tip = {};

    expect(getTipRowKey(tip)).toBe('fp:unknown:unknown:0:0:0');
  });

  it('handles null tip object', () => {
    const tip = null;

    expect(getTipRowKey(tip)).toBe('fp:unknown:unknown:0:0:0');
  });

  it('handles undefined tip object', () => {
    const tip = undefined;

    expect(getTipRowKey(tip)).toBe('fp:unknown:unknown:0:0:0');
  });

  it('generates same key for identical tips', () => {
    const tip1 = {
      tipId: '42',
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
    };

    const tip2 = {
      tipId: '42',
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
    };

    expect(getTipRowKey(tip1)).toBe(getTipRowKey(tip2));
  });

  it('generates different keys for different tipIds', () => {
    const tip1 = { tipId: '42' };
    const tip2 = { tipId: '43' };

    expect(getTipRowKey(tip1)).not.toBe(getTipRowKey(tip2));
  });

  it('generates different keys for different txIds', () => {
    const tip1 = { tipId: undefined, txId: '0xabc' };
    const tip2 = { tipId: undefined, txId: '0xdef' };

    expect(getTipRowKey(tip1)).not.toBe(getTipRowKey(tip2));
  });

  it('generates different keys for different fingerprints', () => {
    const tip1 = {
      tipId: undefined,
      txId: undefined,
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
    };

    const tip2 = {
      tipId: undefined,
      txId: undefined,
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '2000000',
      fee: '50000',
      timestamp: 1700000000,
    };

    expect(getTipRowKey(tip1)).not.toBe(getTipRowKey(tip2));
  });

  it('trims whitespace from tipId', () => {
    const tip = {
      tipId: '  42  ',
      txId: '0xabc',
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
    };

    expect(getTipRowKey(tip)).toBe('tip:42');
  });

  it('trims whitespace from txId', () => {
    const tip = {
      tipId: undefined,
      txId: '  0xabc  ',
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
    };

    expect(getTipRowKey(tip)).toBe('tx:0xabc');
  });
});
