import { describe, it, expect } from 'vitest';
import { getTipRowKey } from '../lib/tipRowKey';

describe('getTipRowKey edge cases', () => {
  describe('boolean values', () => {
    it('handles false as tipId', () => {
      const tip = {
        tipId: false,
        txId: '0xabc',
        sender: 'SP1SENDER',
        recipient: 'SP2RECIPIENT',
        amount: '1000000',
        fee: '50000',
        timestamp: 1700000000,
      };

      expect(getTipRowKey(tip)).toBe('tx:0xabc');
    });

    it('handles true as tipId', () => {
      const tip = {
        tipId: true,
        txId: '0xabc',
        sender: 'SP1SENDER',
        recipient: 'SP2RECIPIENT',
        amount: '1000000',
        fee: '50000',
        timestamp: 1700000000,
      };

      expect(getTipRowKey(tip)).toBe('tip:true');
    });
  });

  describe('array values', () => {
    it('handles array as tipId', () => {
      const tip = {
        tipId: ['123'],
        txId: '0xabc',
        sender: 'SP1SENDER',
        recipient: 'SP2RECIPIENT',
        amount: '1000000',
        fee: '50000',
        timestamp: 1700000000,
      };

      expect(getTipRowKey(tip)).toBe('tip:123');
    });

    it('handles empty array as tipId', () => {
      const tip = {
        tipId: [],
        txId: '0xabc',
        sender: 'SP1SENDER',
        recipient: 'SP2RECIPIENT',
        amount: '1000000',
        fee: '50000',
        timestamp: 1700000000,
      };

      expect(getTipRowKey(tip)).toBe('tx:0xabc');
    });
  });

  describe('object values', () => {
    it('handles object as tipId', () => {
      const tip = {
        tipId: { id: '123' },
        txId: '0xabc',
        sender: 'SP1SENDER',
        recipient: 'SP2RECIPIENT',
        amount: '1000000',
        fee: '50000',
        timestamp: 1700000000,
      };

      expect(getTipRowKey(tip)).toContain('tip:');
    });
  });
});
