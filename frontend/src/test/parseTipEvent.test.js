import { describe, it, expect } from 'vitest';
import { parseTipEvent } from '../lib/parseTipEvent';

describe('parseTipEvent', () => {
    it('returns null for empty string', () => {
        expect(parseTipEvent('')).toBeNull();
    });

    it('returns null for invalid repr', () => {
        expect(parseTipEvent('(tuple (foo "bar"))')).toBeNull();
    });

    it('returns null for null-ish input', () => {
        expect(parseTipEvent(null)).toBeNull();
        expect(parseTipEvent(undefined)).toBeNull();
    });

    it('parses a valid tip-sent event', () => {
        const repr = '(tuple (event "tip-sent") (tip-id u42) (sender \'SP1SENDER) (recipient \'SP2RECV) (amount u5000000) (fee u50000))';
        const result = parseTipEvent(repr);

        expect(result).not.toBeNull();
        expect(result.event).toBe('tip-sent');
        expect(result.sender).toBe('SP1SENDER');
        expect(result.recipient).toBe('SP2RECV');
        expect(result.amount).toBe('5000000');
        expect(result.fee).toBe('50000');
        expect(result.tipId).toBe('42');
    });

    it('parses a structured clarity event object', () => {
        const value = {
            event: 'tip-sent',
            'tip-id': 42,
            sender: 'SP1SENDER',
            recipient: 'SP2RECV',
            amount: 5000000,
            fee: 50000,
        };

        const result = parseTipEvent(value);

        expect(result.event).toBe('tip-sent');
        expect(result.tipId).toBe('42');
        expect(result.amount).toBe('5000000');
        expect(result.fee).toBe('50000');
    });

    it('parses a tip-categorized event', () => {
        const repr = '(tuple (event "tip-categorized") (tip-id u7) (category u3))';
        const result = parseTipEvent(repr);

        expect(result.event).toBe('tip-categorized');
        expect(result.tipId).toBe('7');
        expect(result.category).toBe('3');
    });

    it('returns defaults for missing optional fields', () => {
        const repr = '(tuple (event "tip-sent"))';
        const result = parseTipEvent(repr);

        expect(result.event).toBe('tip-sent');
        expect(result.sender).toBe('');
        expect(result.recipient).toBe('');
        expect(result.amount).toBe('0');
        expect(result.fee).toBe('0');
        expect(result.message).toBe('');
        expect(result.tipId).toBe('0');
        expect(result.category).toBeNull();
    });

    it('extracts message from repr', () => {
        const repr = '(tuple (event "tip-sent") (tip-id u1) (sender \'SP1A) (recipient \'SP2B) (amount u100) (fee u10) (message u"Hello world"))';
        const result = parseTipEvent(repr);

        expect(result.message).toBe('Hello world');
    });

    it('handles missing message field', () => {
        const repr = '(tuple (event "tip-sent") (tip-id u1) (sender \'SP1A) (recipient \'SP2B) (amount u100) (fee u10))';
        const result = parseTipEvent(repr);

        expect(result.message).toBe('');
    });

    it('handles large tip IDs', () => {
        const repr = '(tuple (event "tip-sent") (tip-id u999999))';
        const result = parseTipEvent(repr);

        expect(result.tipId).toBe('999999');
    });

    it('handles large amounts', () => {
        const repr = '(tuple (event "tip-sent") (amount u99999999999))';
        const result = parseTipEvent(repr);

        expect(result.amount).toBe('99999999999');
    });

    it('handles event name with unicode prefix', () => {
        const repr = '(tuple (event u"tip-sent") (tip-id u1))';
        const result = parseTipEvent(repr);

        expect(result.event).toBe('tip-sent');
    });

    it('parses all seven common categories', () => {
        for (let i = 0; i <= 6; i++) {
            const repr = `(tuple (event "tip-categorized") (tip-id u${i + 1}) (category u${i}))`;
            const result = parseTipEvent(repr);
            expect(result.category).toBe(String(i));
        }
    });

    it('returns category as null when not present', () => {
        const repr = '(tuple (event "tip-sent") (tip-id u1))';
        const result = parseTipEvent(repr);
        expect(result.category).toBeNull();
    });

    it('parses sender addresses case-insensitively', () => {
        const repr = '(tuple (event "tip-sent") (sender \'sp1sender))';
        const result = parseTipEvent(repr);
        expect(result.sender).toBe('sp1sender');
    });

    it('handles repr with extra whitespace', () => {
        const repr = '(tuple  (event  "tip-sent")  (tip-id  u5)  (amount  u1000))';
        const result = parseTipEvent(repr);
        expect(result.event).toBe('tip-sent');
        expect(result.tipId).toBe('5');
        expect(result.amount).toBe('1000');
    });

    it('extracts fee correctly', () => {
        const repr = '(tuple (event "tip-sent") (fee u12345))';
        const result = parseTipEvent(repr);
        expect(result.fee).toBe('12345');
    });

    it('handles completely malformed input without throwing', () => {
        expect(parseTipEvent(42)).toBeNull();
        expect(parseTipEvent({})).toBeNull();
        expect(parseTipEvent([])).toBeNull();
    });

    it('parses amount of u0 as "0"', () => {
        const repr = '(tuple (event "tip-sent") (amount u0))';
        const result = parseTipEvent(repr);
        expect(result.amount).toBe('0');
    });

    it('parses tip-id u0 as "0"', () => {
        const repr = '(tuple (event "tip-sent") (tip-id u0))';
        const result = parseTipEvent(repr);
        expect(result.tipId).toBe('0');
    });

    it('parses empty message u"" as empty string', () => {
        const repr = '(tuple (event "tip-sent") (message u""))';
        const result = parseTipEvent(repr);
        expect(result.message).toBe('');
    });

    it('handles category values beyond standard range', () => {
        const repr = '(tuple (event "tip-categorized") (category u99))';
        const result = parseTipEvent(repr);
        expect(result.category).toBe('99');
    });

    it('preserves principal suffixes', () => {
        const repr = '(tuple (event "tip-sent") (sender \'SP1SENDER.tipstream))';
        const result = parseTipEvent(repr);
        expect(result.sender).toBe('SP1SENDER.tipstream');
    });

    it('parses boolean-like event names', () => {
        const repr = '(tuple (event "user-blocked"))';
        const result = parseTipEvent(repr);
        expect(result.event).toBe('user-blocked');
    });
});
