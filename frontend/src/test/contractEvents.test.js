import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseRawEvents, fetchAllContractEvents, PAGE_LIMIT, MAX_INITIAL_PAGES, POLL_INTERVAL_MS } from '../lib/contractEvents';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a fake Stacks API event entry with a contract_log value.
 * @param {string} repr - Clarity print representation.
 * @param {Object} [overrides] - Optional field overrides.
 */
function fakeApiEntry(repr, overrides = {}) {
    const value = typeof repr === 'string' ? { repr } : { value: repr };
    return {
        contract_log: { value },
        block_time: overrides.block_time ?? 1700000000,
        tx_id: overrides.tx_id ?? '0xabc123',
    };
}

/** Convenience: a valid tip-sent repr string. */
function tipSentRepr({ tipId = '1', sender = 'SP1SENDER', recipient = 'SP2RECEIVER', amount = '1000000' } = {}) {
    return `(tuple (event "tip-sent") (tip-id u${tipId}) (sender '${sender}) (recipient '${recipient}) (amount u${amount}) (fee u50000))`;
}

/** Convenience: a tip-categorized repr string. */
function tipCategorizedRepr({ tipId = '1', category = '3' } = {}) {
    return `(tuple (event "tip-categorized") (tip-id u${tipId}) (category u${category}))`;
}

// ---------------------------------------------------------------------------
// parseRawEvents
// ---------------------------------------------------------------------------

describe('parseRawEvents', () => {
    it('returns an empty array for empty input', () => {
        expect(parseRawEvents([])).toEqual([]);
    });

    it('parses valid tip-sent events', () => {
        const results = [fakeApiEntry(tipSentRepr())];
        const parsed = parseRawEvents(results);

        expect(parsed).toHaveLength(1);
        expect(parsed[0].event).toBe('tip-sent');
        expect(parsed[0].sender).toBe('SP1SENDER');
        expect(parsed[0].recipient).toBe('SP2RECEIVER');
        expect(parsed[0].amount).toBe('1000000');
    });

    it('enriches each event with timestamp and txId from the raw entry', () => {
        const results = [fakeApiEntry(tipSentRepr(), { block_time: 1700001111, tx_id: '0xdef456' })];
        const parsed = parseRawEvents(results);

        expect(parsed[0].timestamp).toBe(1700001111);
        expect(parsed[0].txId).toBe('0xdef456');
    });

    it('filters out entries without contract_log data', () => {
        const results = [
            { tx_id: '0x111' },
            { contract_log: { value: {} } },
            { contract_log: null },
            fakeApiEntry(tipSentRepr()),
        ];
        const parsed = parseRawEvents(results);
        expect(parsed).toHaveLength(1);
    });

    it('parses structured decoded clarity values when available', () => {
        const results = [
            fakeApiEntry({
                event: 'tip-sent',
                'tip-id': 1,
                sender: 'SP1SENDER',
                recipient: 'SP2RECEIVER',
                amount: 1000000,
                fee: 50000,
            }),
        ];

        const parsed = parseRawEvents(results);

        expect(parsed).toHaveLength(1);
        expect(parsed[0].tipId).toBe('1');
        expect(parsed[0].amount).toBe('1000000');
    });

    it('filters out entries that parseTipEvent cannot parse', () => {
        const results = [fakeApiEntry('(tuple (invalid-structure))')];
        const parsed = parseRawEvents(results);
        expect(parsed).toEqual([]);
    });

    it('parses multiple event types', () => {
        const results = [
            fakeApiEntry(tipSentRepr({ tipId: '1' })),
            fakeApiEntry(tipCategorizedRepr({ tipId: '1', category: '5' })),
            fakeApiEntry(tipSentRepr({ tipId: '2' })),
        ];
        const parsed = parseRawEvents(results);

        expect(parsed).toHaveLength(3);
        expect(parsed[0].event).toBe('tip-sent');
        expect(parsed[1].event).toBe('tip-categorized');
        expect(parsed[1].category).toBe('5');
        expect(parsed[2].tipId).toBe('2');
    });

    it('handles null block_time and tx_id gracefully', () => {
        const results = [{
            contract_log: { value: { repr: tipSentRepr() } },
        }];
        const parsed = parseRawEvents(results);

        expect(parsed[0].timestamp).toBeNull();
        expect(parsed[0].txId).toBeNull();
    });

    it('filters out entries with empty repr string', () => {
        const results = [
            { contract_log: { value: { repr: '' } } },
            fakeApiEntry(tipSentRepr()),
        ];
        const parsed = parseRawEvents(results);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].event).toBe('tip-sent');
    });

    it('treats zero block_time as falsy (maps to null)', () => {
        const results = [fakeApiEntry(tipSentRepr(), { block_time: 0 })];
        const parsed = parseRawEvents(results);
        expect(parsed[0].timestamp).toBeNull();
    });

});

// ---------------------------------------------------------------------------
// Exported constants
// ---------------------------------------------------------------------------

describe('contractEvents constants', () => {
    it('exports a positive PAGE_LIMIT', () => {
        expect(PAGE_LIMIT).toBeGreaterThan(0);
        expect(typeof PAGE_LIMIT).toBe('number');
    });

    it('exports a positive MAX_INITIAL_PAGES', () => {
        expect(MAX_INITIAL_PAGES).toBeGreaterThan(0);
    });

    it('exports POLL_INTERVAL_MS of at least 10 seconds', () => {
        expect(POLL_INTERVAL_MS).toBeGreaterThanOrEqual(10_000);
    });
});

// ---------------------------------------------------------------------------
// fetchAllContractEvents
// ---------------------------------------------------------------------------

describe('fetchAllContractEvents', () => {
    let fetchSpy;

    beforeEach(() => {
        fetchSpy = vi.spyOn(globalThis, 'fetch');
    });

    afterEach(() => {
        fetchSpy.mockRestore();
    });

    /**
     * Create a mock fetch response for a single page.
     * @param {Array} results - Raw API results.
     * @param {number} total - Total events available.
     * @param {number} offset - Offset of this page.
     */
    function mockFetchResponse(results, total, offset = 0) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ results, total, offset }),
        });
    }

    it('fetches a single page when results fit in one request', async () => {
        const entries = [fakeApiEntry(tipSentRepr())];
        fetchSpy.mockReturnValueOnce(mockFetchResponse(entries, 1, 0));

        const result = await fetchAllContractEvents();

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(result.events).toHaveLength(1);
        expect(result.events[0].event).toBe('tip-sent');
        expect(result.total).toBe(1);
        expect(result.hasMore).toBe(false);
        expect(result.apiOffset).toBe(1);
    });

    it('auto-paginates across multiple pages', async () => {
        const page1 = Array.from({ length: PAGE_LIMIT }, (_, i) => fakeApiEntry(tipSentRepr({ tipId: String(i) })));
        const page2 = [fakeApiEntry(tipSentRepr({ tipId: '999' }))];
        const total = PAGE_LIMIT + 1;

        fetchSpy
            .mockReturnValueOnce(mockFetchResponse(page1, total, 0))
            .mockReturnValueOnce(mockFetchResponse(page2, total, PAGE_LIMIT));

        const result = await fetchAllContractEvents({ maxPages: 5 });

        expect(fetchSpy).toHaveBeenCalledTimes(2);
        expect(result.events).toHaveLength(total);
        expect(result.hasMore).toBe(false);
        expect(result.apiOffset).toBe(total);
    });

    it('stops at maxPages even if more data is available', async () => {
        const page = Array.from({ length: PAGE_LIMIT }, (_, i) => fakeApiEntry(tipSentRepr({ tipId: String(i) })));
        const total = PAGE_LIMIT * 5;

        fetchSpy.mockReturnValue(mockFetchResponse(page, total, 0));

        const result = await fetchAllContractEvents({ maxPages: 2 });

        expect(fetchSpy).toHaveBeenCalledTimes(2);
        expect(result.hasMore).toBe(true);
    });

    it('respects startOffset parameter', async () => {
        const entries = [fakeApiEntry(tipSentRepr())];
        fetchSpy.mockReturnValueOnce(mockFetchResponse(entries, 100, 50));

        await fetchAllContractEvents({ startOffset: 50 });

        const url = fetchSpy.mock.calls[0][0];
        expect(url).toContain('offset=50');
    });

    it('throws on non-ok response', async () => {
        fetchSpy.mockReturnValueOnce(Promise.resolve({ ok: false, status: 500 }));

        await expect(fetchAllContractEvents()).rejects.toThrow('Stacks API returned 500');
    });

    it('returns hasMore=true when currentOffset < total', async () => {
        const page = Array.from({ length: PAGE_LIMIT }, (_, i) => fakeApiEntry(tipSentRepr({ tipId: String(i) })));
        const total = PAGE_LIMIT * 3;

        fetchSpy.mockReturnValueOnce(mockFetchResponse(page, total, 0));

        const result = await fetchAllContractEvents({ maxPages: 1 });

        expect(result.hasMore).toBe(true);
        expect(result.apiOffset).toBe(PAGE_LIMIT);
        expect(result.total).toBe(total);
    });

    it('handles empty results gracefully', async () => {
        fetchSpy.mockReturnValueOnce(mockFetchResponse([], 0, 0));

        const result = await fetchAllContractEvents();

        expect(result.events).toEqual([]);
        expect(result.total).toBe(0);
        expect(result.hasMore).toBe(false);
    });

    it('stops pagination when a page returns fewer than PAGE_LIMIT results', async () => {
        const shortPage = [fakeApiEntry(tipSentRepr({ tipId: '1' }))];
        const total = PAGE_LIMIT + 1;

        fetchSpy
            .mockReturnValueOnce(mockFetchResponse(
                Array.from({ length: PAGE_LIMIT }, (_, i) => fakeApiEntry(tipSentRepr({ tipId: String(i) }))),
                total,
                0,
            ))
            .mockReturnValueOnce(mockFetchResponse(shortPage, total, PAGE_LIMIT));

        const result = await fetchAllContractEvents({ maxPages: 5 });

        expect(fetchSpy).toHaveBeenCalledTimes(2);
        expect(result.events).toHaveLength(PAGE_LIMIT + 1);
    });

    it('requests decoded clarity values from the stacks api', async () => {
        fetchSpy.mockReturnValueOnce(mockFetchResponse([], 0, 0));

        await fetchAllContractEvents();

        const url = fetchSpy.mock.calls[0][0];
        expect(url).toContain('decode_clarity_values=true');
    });

    it('throws when second page fails mid-pagination', async () => {
        const fullPage = Array.from({ length: PAGE_LIMIT }, (_, i) =>
            fakeApiEntry(tipSentRepr({ tipId: String(i) })),
        );

        fetchSpy
            .mockReturnValueOnce(mockFetchResponse(fullPage, PAGE_LIMIT * 3, 0))
            .mockReturnValueOnce(Promise.resolve({ ok: false, status: 503 }));

        await expect(fetchAllContractEvents({ maxPages: 3 })).rejects.toThrow('Stacks API returned 503');
    });

    it('combines startOffset and maxPages', async () => {
        const entries = [fakeApiEntry(tipSentRepr())];
        fetchSpy.mockReturnValueOnce(mockFetchResponse(entries, 200, 100));

        const result = await fetchAllContractEvents({ startOffset: 100, maxPages: 1 });

        const url = fetchSpy.mock.calls[0][0];
        expect(url).toContain('offset=100');
        expect(result.events).toHaveLength(1);
    });
});
