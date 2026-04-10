import { describe, it, expect } from 'vitest';
import { eventSchemas, getEventSchema, isValidEventType } from './eventSchemas';

describe('eventSchemas', () => {
  it('defines schema for all known event types', () => {
    const expectedTypes = [
      'tip-sent',
      'tip-categorized',
      'token-tip-sent',
      'profile-updated',
      'user-blocked',
      'user-unblocked',
      'token-whitelist-updated',
      'contract-paused',
      'fee-updated',
      'fee-change-proposed',
      'fee-change-executed',
      'fee-change-cancelled',
      'pause-change-proposed',
      'pause-change-executed',
      'pause-change-cancelled',
      'multisig-updated',
      'ownership-proposed',
      'ownership-transferred',
    ];

    for (const eventType of expectedTypes) {
      expect(eventSchemas[eventType]).toBeDefined();
      expect(eventSchemas[eventType].type).toBe(eventType);
    }
  });

  describe('getEventSchema', () => {
    it('returns schema for valid event type', () => {
      const schema = getEventSchema('tip-sent');
      expect(schema).toBeDefined();
      expect(schema.type).toBe('tip-sent');
      expect(schema.required).toContain('tip-id');
      expect(schema.required).toContain('sender');
    });

    it('returns null for invalid event type', () => {
      const schema = getEventSchema('unknown-event');
      expect(schema).toBeNull();
    });
  });

  describe('isValidEventType', () => {
    it('returns true for known event type', () => {
      expect(isValidEventType('tip-sent')).toBe(true);
      expect(isValidEventType('contract-paused')).toBe(true);
      expect(isValidEventType('ownership-transferred')).toBe(true);
    });

    it('returns false for unknown event type', () => {
      expect(isValidEventType('unknown-event')).toBe(false);
      expect(isValidEventType('invalid')).toBe(false);
    });
  });

  describe('schema structure validation', () => {
    it('tip-sent has required sender, recipient, amount, tip-id', () => {
      const schema = getEventSchema('tip-sent');
      expect(schema.required).toEqual(['tip-id', 'sender', 'recipient', 'amount']);
    });

    it('contract-paused has required paused field', () => {
      const schema = getEventSchema('contract-paused');
      expect(schema.required).toContain('paused');
    });

    it('fee-change-proposed includes effective-height', () => {
      const schema = getEventSchema('fee-change-proposed');
      expect(schema.required).toContain('effective-height');
    });

    it('fee-change-cancelled requires no fields', () => {
      const schema = getEventSchema('fee-change-cancelled');
      expect(schema.required.length).toBe(0);
    });

    it('user-blocked requires blocker and blocked-user', () => {
      const schema = getEventSchema('user-blocked');
      expect(schema.required).toContain('blocker');
      expect(schema.required).toContain('blocked-user');
    });

    it('ownership-transferred requires new-owner', () => {
      const schema = getEventSchema('ownership-transferred');
      expect(schema.required).toContain('new-owner');
    });
  });

  describe('defaults', () => {
    it('tip-sent provides defaults for fee, message, category', () => {
      const schema = getEventSchema('tip-sent');
      expect(schema.defaults.fee).toBe('0');
      expect(schema.defaults.message).toBe('');
      expect(schema.defaults.category).toBeNull();
    });

    it('token-tip-sent provides default for fee', () => {
      const schema = getEventSchema('token-tip-sent');
      expect(schema.defaults.fee).toBe('0');
    });

    it('events without defaults have no defaults field', () => {
      const schema = getEventSchema('contract-paused');
      expect(schema.defaults).toBeUndefined();
    });
  });
});
