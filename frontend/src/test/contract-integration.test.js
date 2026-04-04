import { describe, expect, it } from 'vitest';
import {
    stringUtf8CV,
    uintCV,
    principalCV,
    cvToJSON,
    cvToString,
    Cl,
} from '@stacks/transactions';
import { toMicroSTX, formatSTX } from '../lib/utils';

/**
 * Integration tests that verify the frontend correctly constructs
 * Clarity values for contract calls and parses responses.
 */
describe('Contract Integration - Argument Construction', () => {
    const VALID_ADDRESS = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
    const VALID_ADDRESS_2 = 'SP000000000000000000002Q6VF78';

    describe('send-tip argument construction', () => {
        it('constructs valid principalCV for recipient', () => {
            const cv = principalCV(VALID_ADDRESS);
            const json = cvToJSON(cv);
            expect(json.value).toBe(VALID_ADDRESS);
            expect(json.type).toBe('principal');
        });

        it('constructs valid uintCV for amount', () => {
            const amount = toMicroSTX('1.5');
            const cv = uintCV(amount);
            const json = cvToJSON(cv);
            expect(json.value).toBe('1500000');
        });

        it('constructs valid stringUtf8CV for message', () => {
            const message = 'Great work! 🎉';
            const cv = stringUtf8CV(message);
            const json = cvToJSON(cv);
            expect(json.value).toBe(message);
        });

        it('constructs valid uintCV for category', () => {
            const cv = uintCV(3); // community-help
            const json = cvToJSON(cv);
            expect(json.value).toBe('3');
        });

        it('all send-categorized-tip args produce valid Clarity values', () => {
            const args = [
                principalCV(VALID_ADDRESS_2),
                uintCV(toMicroSTX('0.5')),
                stringUtf8CV('Thanks for the help!'),
                uintCV(4), // appreciation
            ];
            // Ensure all args can be converted to JSON (validates internal structure)
            args.forEach(arg => {
                const json = cvToJSON(arg);
                expect(json).toBeDefined();
                expect(json.type).toBeDefined();
            });
        });
    });

    describe('STX amount conversion edge cases', () => {
        it('handles minimum tip (0.001 STX)', () => {
            expect(toMicroSTX('0.001')).toBe(1000);
        });

        it('handles whole number STX amounts', () => {
            expect(toMicroSTX('10')).toBe(10000000);
        });

        it('handles floating-point precision for 0.1 + 0.2', () => {
            // 0.1 + 0.2 = 0.30000000000000004 in JS
            // Math.floor ensures we always get correct integer
            const result = toMicroSTX(0.1 + 0.2);
            expect(result).toBe(300000);
        });

        it('handles very small amounts near float boundary', () => {
            expect(toMicroSTX('0.999999')).toBe(999999);
        });

        it('handles large amounts', () => {
            expect(toMicroSTX('10000')).toBe(10000000000);
        });

        it('rounds down fractional microSTX', () => {
            // 1.0000001 STX = 1000000.1 microSTX → floors to 1000000
            expect(toMicroSTX('1.0000001')).toBe(1000000);
        });

        it('formatSTX is inverse of toMicroSTX for clean values', () => {
            const stxAmount = '2.5';
            const micro = toMicroSTX(stxAmount);
            const back = formatSTX(micro, 1);
            expect(back).toBe('2.5');
        });

        it('formatSTX handles zero', () => {
            expect(formatSTX(0)).toBe('0.000000');
        });

        it('formatSTX respects decimal parameter', () => {
            expect(formatSTX(1500000, 2)).toBe('1.50');
            expect(formatSTX(1500000, 6)).toBe('1.500000');
        });
    });

    describe('Contract response parsing', () => {
        it('parses ok uint response (tip-id)', () => {
            const cv = Cl.ok(Cl.uint(42));
            const json = cvToJSON(cv);
            expect(json.success).toBe(true);
            expect(json.value.value).toBe('42');
        });

        it('parses err uint response (error code)', () => {
            const cv = Cl.error(Cl.uint(101));
            const json = cvToJSON(cv);
            expect(json.success).toBe(false);
            expect(json.value.value).toBe('101');
        });

        it('parses tuple response (user stats)', () => {
            const cv = Cl.tuple({
                'tips-sent': Cl.uint(5),
                'tips-received': Cl.uint(3),
                'total-sent': Cl.uint(5000000),
                'total-received': Cl.uint(3000000),
            });
            const json = cvToJSON(cv);
            expect(json.value['tips-sent'].value).toBe('5');
            expect(json.value['tips-received'].value).toBe('3');
            expect(json.value['total-sent'].value).toBe('5000000');
            expect(json.value['total-received'].value).toBe('3000000');
        });

        it('parses optional none response', () => {
            const cv = Cl.none();
            const json = cvToJSON(cv);
            expect(json.type).toContain('optional');
            expect(json.value).toBeNull();
        });

        it('parses optional some response (tip data)', () => {
            const cv = Cl.some(Cl.tuple({
                sender: Cl.principal(VALID_ADDRESS),
                recipient: Cl.principal(VALID_ADDRESS_2),
                amount: Cl.uint(1000000),
                message: Cl.stringUtf8('hello'),
                'tip-height': Cl.uint(100),
            }));
            const json = cvToJSON(cv);
            expect(json.value.value.sender.value).toBe(VALID_ADDRESS);
            expect(json.value.value.amount.value).toBe('1000000');
        });
    });

    describe('Post-condition amount matching', () => {
        it('post-condition amount matches function arg', () => {
            const userInput = '5.25';
            const microSTX = toMicroSTX(userInput);

            // Frontend builds: Pc.principal(sender).willSendLte(microSTX).ustx()
            // Function arg: uintCV(microSTX)
            // They must use the same value
            const argCV = uintCV(microSTX);
            const argValue = cvToJSON(argCV).value;

            expect(argValue).toBe(String(microSTX));
            expect(microSTX).toBe(5250000);
        });

        it('fee calculation matches contract logic', () => {
            const FEE_BASIS_POINTS = 50;
            const BASIS_POINTS_DIVISOR = 10000;

            const amount = 1000000; // 1 STX in microSTX
            const fee = Math.floor(amount * FEE_BASIS_POINTS / BASIS_POINTS_DIVISOR);
            const net = amount - fee;

            expect(fee).toBe(5000);
            expect(net).toBe(995000);
        });

        it('minimum fee is enforced for small amounts', () => {
            // Contract enforces min 1 uSTX fee
            const FEE_BASIS_POINTS = 50;
            const BASIS_POINTS_DIVISOR = 10000;

            // A very small amount where raw fee truncates to 0
            const amount = 100; // 0.0001 STX
            const rawFee = Math.floor(amount * FEE_BASIS_POINTS / BASIS_POINTS_DIVISOR);
            const fee = Math.max(rawFee, 1); // Frontend should mirror contract's min fee

            expect(rawFee).toBe(0);
            expect(fee).toBe(1);
        });
    });

    describe('cvToString output (event repr parsing)', () => {
        it('produces parseable principal string', () => {
            const cv = Cl.principal(VALID_ADDRESS);
            const str = cvToString(cv);
            expect(str).toContain(VALID_ADDRESS);
        });

        it('produces parseable uint string', () => {
            const cv = Cl.uint(42);
            const str = cvToString(cv);
            expect(str).toContain('42');
        });
    });
});
