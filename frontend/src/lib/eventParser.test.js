import { describe, it, expect } from 'vitest';
import { parseContractEvent } from './eventParser';
import { parseTipEvent } from './parseTipEvent';

describe('eventParser', () => {
  describe('parseContractEvent', () => {
    it('parses tip-sent event', () => {
      const repr = '(tuple (event "tip-sent") (tip-id u42) (sender \'SP1SENDER) (recipient \'SP2RECV) (amount u1000) (fee u50))';
      const result = parseContractEvent(repr);
      expect(result.event).toBe('tip-sent');
      expect(result['tip-id']).toBe('42');
      expect(result.sender).toBe('SP1SENDER');
      expect(result.recipient).toBe('SP2RECV');
      expect(result.amount).toBe('1000');
      expect(result.fee).toBe('50');
    });

    it('parses contract-paused event', () => {
      const repr = '(tuple (event "contract-paused") (paused true))';
      const result = parseContractEvent(repr);
      expect(result.event).toBe('contract-paused');
      expect(result.paused).toBe(true);
    });

    it('parses fee-change-proposed event', () => {
      const repr = '(tuple (event "fee-change-proposed") (new-fee u100) (effective-height u500))';
      const result = parseContractEvent(repr);
      expect(result.event).toBe('fee-change-proposed');
      expect(result['new-fee']).toBe('100');
      expect(result['effective-height']).toBe('500');
    });

    it('parses fee-change-cancelled event with no required fields', () => {
      const repr = '(tuple (event "fee-change-cancelled"))';
      const result = parseContractEvent(repr);
      expect(result.event).toBe('fee-change-cancelled');
    });

    it('applies defaults for optional fields', () => {
      const repr = '(tuple (event "tip-sent") (tip-id u1) (sender \'SP1) (recipient \'SP2) (amount u100))';
      const result = parseContractEvent(repr);
      expect(result.fee).toBe('0');
      expect(result.message).toBe('');
      expect(result.category).toBeNull();
    });

    it('returns null for invalid event type', () => {
      const repr = '(tuple (event "unknown-event"))';
      const result = parseContractEvent(repr);
      expect(result).toBeNull();
    });

    it('returns null for missing required fields', () => {
      const repr = '(tuple (event "tip-sent") (tip-id u1))';
      const result = parseContractEvent(repr);
      expect(result).toBeNull();
    });

    it('returns null for non-string input', () => {
      expect(parseContractEvent(null)).toBeNull();
      expect(parseContractEvent(undefined)).toBeNull();
      expect(parseContractEvent({})).toBeNull();
    });

    it('returns null for malformed event marker', () => {
      const repr = 'some random text without event field';
      const result = parseContractEvent(repr);
      expect(result).toBeNull();
    });

    it('handles principals with addresses', () => {
      const repr = '(tuple (event "user-blocked") (blocker \'SP1BLOCKER) (blocked-user \'SP2BLOCKED))';
      const result = parseContractEvent(repr);
      expect(result.blocker).toBe('SP1BLOCKER');
      expect(result['blocked-user']).toBe('SP2BLOCKED');
    });

    it('handles boolean false value', () => {
      const repr = '(tuple (event "contract-paused") (paused false))';
      const result = parseContractEvent(repr);
      expect(result.paused).toBe(false);
    });

    it('parses token-tip-sent event', () => {
      const repr = '(tuple (event "token-tip-sent") (token-tip-id u99) (sender \'SP1SENDER) (recipient \'SP2RECV) (token-contract \'SPTOKEN123) (amount u5000))';
      const result = parseContractEvent(repr);
      expect(result.event).toBe('token-tip-sent');
      expect(result['token-tip-id']).toBe('99');
      expect(result['token-contract']).toBe('SPTOKEN123');
      expect(result.amount).toBe('5000');
    });

    it('parses profile-updated event with optional fields', () => {
      const repr = '(tuple (event "profile-updated") (user \'SP1USER) (display-name u"Alice") (bio u"Hello"))';
      const result = parseContractEvent(repr);
      expect(result.event).toBe('profile-updated');
      expect(result.user).toBe('SP1USER');
      expect(result['display-name']).toBe('Alice');
      expect(result.bio).toBe('Hello');
    });

    it('parses ownership-transferred event', () => {
      const repr = '(tuple (event "ownership-transferred") (new-owner \'SPNEWOWNER))';
      const result = parseContractEvent(repr);
      expect(result.event).toBe('ownership-transferred');
      expect(result['new-owner']).toBe('SPNEWOWNER');
    });
  });

  describe('parseTipEvent', () => {
    it('parses and normalizes tip-sent event', () => {
      const repr = '(tuple (event "tip-sent") (tip-id u42) (sender \'SP1SENDER) (recipient \'SP2RECV) (amount u1000) (fee u50))';
      const result = parseTipEvent(repr);
      expect(result.event).toBe('tip-sent');
      expect(result.tipId).toBe('42');
      expect(result.sender).toBe('SP1SENDER');
      expect(result.recipient).toBe('SP2RECV');
      expect(result.amount).toBe('1000');
      expect(result.fee).toBe('50');
    });

    it('returns null for invalid input', () => {
      expect(parseTipEvent(null)).toBeNull();
      expect(parseTipEvent(undefined)).toBeNull();
      expect(parseTipEvent('')).toBeNull();
    });
  });
});
