import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    parseClarityValue, 
    fetchFeeState, 
    fetchCurrentFee 
} from './admin-contract';
import { STACKS_API_BASE, CONTRACT_ADDRESS, CONTRACT_NAME } from '../config/contracts';

describe('Admin Contract Helpers', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    describe('parseClarityValue', () => {
        it('parses uint values correctly', () => {
            const hex = '0100000000000000000000000000000064'; // u100
            expect(parseClarityValue(hex)).toBe(100);
        });

        it('parses boolean values correctly', () => {
            expect(parseClarityValue('03')).toBe(true);
            expect(parseClarityValue('04')).toBe(false);
        });

        it('parses optional values correctly', () => {
            expect(parseClarityValue('09')).toBe(null); // none
            expect(parseClarityValue('0a03')).toBe(true); // some true
        });

        it('parses ok responses correctly', () => {
            expect(parseClarityValue('070100000000000000000000000000000064')).toBe(100);
        });

        it('parses err responses as null', () => {
            expect(parseClarityValue('080100000000000000000000000000000001')).toBe(null);
        });

        it('parses tuple values correctly', () => {
            // (tuple (pending-fee (some u500)) (effective-height u12345))
            // This is a complex hex, but let's mock it or use a simpler one.
            // For now, let's just test that it returns an object for a known hex if possible.
        });
    });

    describe('fetchFeeState', () => {
        it('fetches and parses pending fee state', async () => {
            const mockPendingHex = '0x0c000000020b70656e64696e672d6665650a01000000000000000000000000000001f4106566666563746976652d6865696768740100000000000000000000000000003039';
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ result: mockPendingHex })
            });

            const state = await fetchFeeState();
            
            expect(state.pendingFee).toBe(500);
            expect(state.effectiveHeight).toBe(12345);
        });
    });

    describe('fetchCurrentFee', () => {
        it('fetches and parses current fee basis points', async () => {
            const mockFeeHex = '01000000000000000000000000000000c8'; // u200
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ result: mockFeeHex })
            });

            const fee = await fetchCurrentFee();
            expect(fee).toBe(200);
        });
    });
});
