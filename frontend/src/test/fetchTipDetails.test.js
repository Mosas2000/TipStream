import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    fetchTipDetail,
    fetchTipMessages,
    clearTipCache,
    getCacheSize,
    getCachedEntry,
    CACHE_TTL_MS,
} from '../lib/fetchTipDetails';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@stacks/transactions', () => ({
    fetchCallReadOnlyFunction: vi.fn(),
    cvToJSON: vi.fn(),
    uintCV: vi.fn(v => ({ type: 'uint', value: v })),
}));

vi.mock('../utils/stacks', () => ({
    network: {},
}));

vi.mock('../config/contracts', () => ({
    CONTRACT_ADDRESS: 'SP_TEST_ADDRESS',
    CONTRACT_NAME: 'tipstream',
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { fetchCallReadOnlyFunction, cvToJSON } from '@stacks/transactions';

/**
 * Configure the mocked fetchCallReadOnlyFunction to return a result that
 * cvToJSON will parse as a tip with the given message.
 */
function mockTipResult(message) {
    const fakeResult = {};
    fetchCallReadOnlyFunction.mockResolvedValue(fakeResult);
    cvToJSON.mockReturnValue({
        type: 'some',
        value: {
            message: { value: message },
        },
    });
}

/**
 * Configure the mocked fetchCallReadOnlyFunction to return a "none" result
 * (tip does not exist on-chain).
 */
function mockTipNotFound() {
    const fakeResult = {};
    fetchCallReadOnlyFunction.mockResolvedValue(fakeResult);
    cvToJSON.mockReturnValue({ type: 'none' });
}

/**
 * Configure the mocked fetchCallReadOnlyFunction to reject with an error.
 */
function mockTipError(message = 'Network error') {
    fetchCallReadOnlyFunction.mockRejectedValue(new Error(message));
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
    clearTipCache();
    vi.clearAllMocks();
});

afterEach(() => {
    clearTipCache();
    vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// CACHE_TTL_MS constant
// ---------------------------------------------------------------------------

describe('CACHE_TTL_MS', () => {
    it('is a positive number', () => {
        expect(CACHE_TTL_MS).toBeGreaterThan(0);
    });

    it('is exactly 5 minutes in milliseconds', () => {
        expect(CACHE_TTL_MS).toBe(5 * 60 * 1000);
    });
});

// ---------------------------------------------------------------------------
// fetchTipDetail -- cache miss (cold path)
// ---------------------------------------------------------------------------

describe('fetchTipDetail -- cold path', () => {
    it('returns null when the contract returns none', async () => {
        mockTipNotFound();
        const result = await fetchTipDetail(1);
        expect(result).toBeNull();
    });

    it('calls fetchCallReadOnlyFunction exactly once for a cache miss', async () => {
        mockTipResult('hello');
        await fetchTipDetail(42);
        expect(fetchCallReadOnlyFunction).toHaveBeenCalledTimes(1);
    });

    it('returns the parsed value on a successful fetch', async () => {
        mockTipResult('nice work');
        const result = await fetchTipDetail(7);
        expect(result).toEqual({ message: { value: 'nice work' } });
    });

    it('returns null and logs a warning on fetch error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockTipError('timeout');
        const result = await fetchTipDetail(99);
        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// fetchTipDetail -- cache hit (warm path)
// ---------------------------------------------------------------------------

describe('fetchTipDetail -- warm path', () => {
    it('returns cached value without calling the API a second time', async () => {
        mockTipResult('cached message');
        await fetchTipDetail(10);
        await fetchTipDetail(10);
        expect(fetchCallReadOnlyFunction).toHaveBeenCalledTimes(1);
    });

    it('stores the result in the cache after a successful fetch', async () => {
        mockTipResult('stored');
        await fetchTipDetail(5);
        expect(getCacheSize()).toBe(1);
    });

    it('accepts both numeric and string tipId and deduplications correctly', async () => {
        mockTipResult('dedup test');
        await fetchTipDetail(3);
        await fetchTipDetail('3');
        expect(fetchCallReadOnlyFunction).toHaveBeenCalledTimes(1);
    });

    it('caches distinct tip IDs independently', async () => {
        mockTipResult('msg a');
        await fetchTipDetail(1);
        mockTipResult('msg b');
        await fetchTipDetail(2);
        expect(getCacheSize()).toBe(2);
        expect(fetchCallReadOnlyFunction).toHaveBeenCalledTimes(2);
    });

    it('does not cache a null result when the tip is not found', async () => {
        mockTipNotFound();
        await fetchTipDetail(99);
        expect(getCacheSize()).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// fetchTipDetail -- TTL expiry
// ---------------------------------------------------------------------------

describe('fetchTipDetail -- TTL expiry', () => {
    it('re-fetches after a cache entry has expired', async () => {
        mockTipResult('initial');
        await fetchTipDetail(20);
        expect(fetchCallReadOnlyFunction).toHaveBeenCalledTimes(1);

        // Manually expire the cache entry.
        const entry = getCachedEntry(20);
        entry.expiresAt = Date.now() - 1;

        mockTipResult('refreshed');
        const result = await fetchTipDetail(20);
        expect(fetchCallReadOnlyFunction).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ message: { value: 'refreshed' } });
    });

    it('still returns cached value when entry has not yet expired', async () => {
        mockTipResult('fresh');
        await fetchTipDetail(21);
        expect(fetchCallReadOnlyFunction).toHaveBeenCalledTimes(1);

        // Entry is still well within TTL.
        const result = await fetchTipDetail(21);
        expect(fetchCallReadOnlyFunction).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ message: { value: 'fresh' } });
    });

    it('getCachedEntry returns an expiresAt in the future for a fresh entry', async () => {
        mockTipResult('ttl check');
        const before = Date.now();
        await fetchTipDetail(30);
        const entry = getCachedEntry(30);
        expect(entry.expiresAt).toBeGreaterThan(before);
        expect(entry.expiresAt).toBeLessThanOrEqual(before + CACHE_TTL_MS + 50);
    });
});

// ---------------------------------------------------------------------------
// getCacheSize
// ---------------------------------------------------------------------------

describe('getCacheSize', () => {
    it('returns 0 on a fresh or cleared cache', () => {
        expect(getCacheSize()).toBe(0);
    });

    it('increments with each new cached entry', async () => {
        mockTipResult('a');
        await fetchTipDetail(100);
        expect(getCacheSize()).toBe(1);
        mockTipResult('b');
        await fetchTipDetail(101);
        expect(getCacheSize()).toBe(2);
    });

    it('returns to 0 after clearTipCache()', async () => {
        mockTipResult('x');
        await fetchTipDetail(200);
        clearTipCache();
        expect(getCacheSize()).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// getCachedEntry
// ---------------------------------------------------------------------------

describe('getCachedEntry', () => {
    it('returns undefined for an uncached tip ID', () => {
        expect(getCachedEntry(999)).toBeUndefined();
    });

    it('returns a raw entry with value and expiresAt fields', async () => {
        mockTipResult('raw entry');
        await fetchTipDetail(50);
        const entry = getCachedEntry(50);
        expect(entry).toBeDefined();
        expect(entry).toHaveProperty('value');
        expect(entry).toHaveProperty('expiresAt');
    });

    it('accepts string and numeric tipId interchangeably', async () => {
        mockTipResult('str/num');
        await fetchTipDetail(60);
        expect(getCachedEntry('60')).toBeDefined();
        expect(getCachedEntry(60)).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// clearTipCache
// ---------------------------------------------------------------------------

describe('clearTipCache', () => {
    it('removes all entries from the cache', async () => {
        mockTipResult('clear me');
        await fetchTipDetail(70);
        await fetchTipDetail(71);
        clearTipCache();
        expect(getCacheSize()).toBe(0);
        expect(getCachedEntry(70)).toBeUndefined();
        expect(getCachedEntry(71)).toBeUndefined();
    });

    it('is idempotent when called on an already empty cache', () => {
        expect(() => {
            clearTipCache();
            clearTipCache();
        }).not.toThrow();
        expect(getCacheSize()).toBe(0);
    });

    it('causes the next fetch to hit the API again', async () => {
        mockTipResult('before clear');
        await fetchTipDetail(80);
        expect(fetchCallReadOnlyFunction).toHaveBeenCalledTimes(1);

        clearTipCache();
        mockTipResult('after clear');
        await fetchTipDetail(80);
        expect(fetchCallReadOnlyFunction).toHaveBeenCalledTimes(2);
    });
});

// ---------------------------------------------------------------------------
// fetchTipMessages
// ---------------------------------------------------------------------------

describe('fetchTipMessages', () => {
    it('returns an empty Map for an empty array of tip IDs', async () => {
        const result = await fetchTipMessages([]);
        expect(result).toBeInstanceOf(Map);
        expect(result.size).toBe(0);
    });

    it('includes only tips that have a message field', async () => {
        // Tip 1 has a message; tip 2 returns none.
        fetchCallReadOnlyFunction.mockResolvedValue({});
        cvToJSON
            .mockReturnValueOnce({ type: 'some', value: { message: { value: 'hello' } } })
            .mockReturnValueOnce({ type: 'none' });

        const result = await fetchTipMessages([1, 2]);
        expect(result.size).toBe(1);
        expect(result.get('1')).toBe('hello');
        expect(result.has('2')).toBe(false);
    });

    it('keys the returned Map by string tip ID', async () => {
        mockTipResult('keyed');
        const result = await fetchTipMessages([42]);
        expect(result.has('42')).toBe(true);
    });

    it('returns a message value for each valid tip', async () => {
        fetchCallReadOnlyFunction.mockResolvedValue({});
        cvToJSON
            .mockReturnValueOnce({ type: 'some', value: { message: { value: 'first' } } })
            .mockReturnValueOnce({ type: 'some', value: { message: { value: 'second' } } });

        const result = await fetchTipMessages([1, 2]);
        expect(result.get('1')).toBe('first');
        expect(result.get('2')).toBe('second');
    });

    it('skips tips that return an API error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        fetchCallReadOnlyFunction
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValueOnce({});
        cvToJSON.mockReturnValueOnce({ type: 'some', value: { message: { value: 'ok' } } });

        const result = await fetchTipMessages([10, 11]);
        expect(result.size).toBe(1);
        expect(result.get('11')).toBe('ok');
        consoleSpy.mockRestore();
    });

    it('uses the cache so repeated calls do not re-fetch', async () => {
        mockTipResult('cached batch');
        await fetchTipMessages([5]);
        await fetchTipMessages([5]);
        expect(fetchCallReadOnlyFunction).toHaveBeenCalledTimes(1);
    });

    it('deduplicates repeated tip IDs within a single batch', async () => {
        mockTipResult('deduped');

        const result = await fetchTipMessages([7, '7', 7]);

        expect(fetchCallReadOnlyFunction).toHaveBeenCalledTimes(1);
        expect(result.size).toBe(1);
        expect(result.get('7')).toBe('deduped');
    });

    it('ignores invalid tip IDs in a batch', async () => {
        mockTipResult('valid only');

        const result = await fetchTipMessages([0, '0', null, undefined, 'abc', 9]);

        expect(fetchCallReadOnlyFunction).toHaveBeenCalledTimes(1);
        expect(result.size).toBe(1);
        expect(result.get('9')).toBe('valid only');
    });
});
