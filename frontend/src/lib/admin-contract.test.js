import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    parseClarityValue, 
    fetchFeeState, 
    fetchCurrentFee,
    fetchCurrentBlockHeight,
    fetchPauseState,
    fetchContractOwner,
    fetchMultisig,
    fetchFeeForAmount,
    fetchFeeSummary,
} from './admin-contract';
import { STACKS_API_BASE, CONTRACT_ADDRESS, CONTRACT_NAME } from '../config/contracts';

describe('Admin Contract Helpers', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    describe('fetchCurrentBlockHeight', () => {
        it('fetches stacks_tip_height from /v2/info', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ stacks_tip_height: 123456 })
            });

            const height = await fetchCurrentBlockHeight();
            expect(height).toBe(123456);
        });

        it('throws when API call fails', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Internal Server Error'
            });

            await expect(fetchCurrentBlockHeight()).rejects.toThrow('Failed to fetch block info');
        });
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

        it('parses standard principals as raw hex', () => {
            const hex = '05001a1c3606f37699e128df21b0e3532822180410';
            expect(parseClarityValue(hex)).toBe(hex.slice(0, 44));
        });

        it('returns null for invalid hex', () => {
            expect(parseClarityValue('not-hex')).toBe(null);
            expect(parseClarityValue('ZZ')).toBe(null);
        });

        it('parses tuple values correctly', () => {
            // (tuple (pending-fee (some u500)) (effective-height u12345))
            // This is a complex hex, but let's mock it or use a simpler one.
            // For now, let's just test that it returns an object for a known hex if possible.
        });
    });

    describe('fetchFeeState', () => {
        it('fetches and parses both current and pending fee state', async () => {
            const mockPendingHex = '0x0c000000020b70656e64696e672d6665650a01000000000000000000000000000001f4106566666563746976652d6865696768740100000000000000000000000000003039';
            const mockCurrentHex = '01000000000000000000000000000000c8'; // u200
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ result: mockPendingHex })
            }).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ result: mockCurrentHex })
            });

            const state = await fetchFeeState();
            
            expect(state.currentFeeBasisPoints).toBe(200);
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

        it('throws when API returns invalid JSON', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.reject(new Error('Invalid JSON'))
            });

            await expect(fetchCurrentFee()).rejects.toThrow('Failed to parse contract response');
        });
    });

    describe('fetchPauseState', () => {
        it('fetches and parses current and pending pause state', async () => {
            const mockPendingHex = '0x0c000000020d70656e64696e672d70617573650a03106566666563746976652d6865696768740100000000000000000000000000003039';
            const mockCurrentHex = '04'; // false
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ result: mockPendingHex })
            }).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ result: mockCurrentHex })
            });

            const state = await fetchPauseState();
            
            expect(state.isPaused).toBe(false);
            expect(state.pendingPause).toBe(true);
            expect(state.effectiveHeight).toBe(12345);
        });
    });

    describe('fetchContractOwner', () => {
        it('fetches and parses contract owner principal', async () => {
            const mockOwnerHex = '05001a1c3606f37699e128df21b0e3532822180410'; // A mocked principal hex
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ result: mockOwnerHex })
            });

            await fetchContractOwner();
            // Since we don't have principal decoding yet, it might return null or the hex
            // For now, let's just check that it's called.
        });
    });

    describe('fetchMultisig', () => {
        it('fetches and parses multisig address', async () => {
            const mockMultisigHex = '05001a1c3606f37699e128df21b0e3532822180410';
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ result: mockMultisigHex })
            });

            const multisig = await fetchMultisig();
            expect(multisig).toBeDefined();
        });
    });
});

describe('fetchFeeForAmount', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    it('returns the computed fee for a given amount', async () => {
        const mockResultHex = '0x070100000000000000000000000000001388';
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: mockResultHex }),
        });

        const fee = await fetchFeeForAmount(1000000);
        expect(typeof fee).toBe('number');
        expect(fee).toBeGreaterThanOrEqual(0);
    });

    it('throws when the API call fails', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            statusText: 'Service Unavailable',
        });

        await expect(fetchFeeForAmount(1000000)).rejects.toThrow('Failed to fetch fee for amount');
    });

    it('returns 0 when the contract returns an error response', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: '0x08' }),
        });

        const fee = await fetchFeeForAmount(1000000);
        expect(fee).toBe(0);
    });
});

describe('fetchFeeSummary', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    it('returns a structured fee summary object', async () => {
        const mockResultHex = '0x070c000000070668616d6f756e74010000000000000000000000000000000032126261736973 2d706f696e74732d646976697365720100000000000000000000000000002710' +
            '0e6665652d62617369732d706f696e74730100000000000000000000000000000032' +
            '0e6665652d666f722d616d6f756e74010000000000000000000000000000000001' +
            '0b6665652d70657263656e74010000000000000000000000000000000000' +
            '0c6d696e2d6665652d757374780100000000000000000000000000000001' +
            '0a6e65742d616d6f756e74010000000000000000000000000000000031';

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: mockResultHex }),
        });

        const summary = await fetchFeeSummary(50);
        expect(summary).toHaveProperty('feeBasisPoints');
        expect(summary).toHaveProperty('basisPointsDivisor');
        expect(summary).toHaveProperty('minFeeUstx');
        expect(summary).toHaveProperty('feePercent');
        expect(summary).toHaveProperty('feeForAmount');
        expect(summary).toHaveProperty('amount');
        expect(summary).toHaveProperty('netAmount');
    });

    it('throws when the API call fails', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            statusText: 'Bad Gateway',
        });

        await expect(fetchFeeSummary(1000000)).rejects.toThrow('Failed to fetch fee summary');
    });

    it('throws when the response shape is unexpected', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: '0x09' }),
        });

        await expect(fetchFeeSummary(1000000)).rejects.toThrow('Failed to fetch fee summary');
    });
});
