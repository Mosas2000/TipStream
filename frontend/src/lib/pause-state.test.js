import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPauseState } from './admin-contract';

describe('Pause State Read-Only Function Integration', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    it('calls get-is-paused function to fetch current pause state', async () => {
        const mockPendingHex = '0x0c000000020d70656e64696e672d70617573650910106566666563746976652d6865696768740100000000000000000000000000000000';
        const mockCurrentHex = '0704';
        
        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ result: mockPendingHex })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ result: mockCurrentHex })
            });

        const state = await fetchPauseState();
        
        expect(global.fetch).toHaveBeenCalledTimes(2);
        
        const secondCall = global.fetch.mock.calls[1];
        expect(secondCall[0]).toContain('get-is-paused');
        
        expect(state.isPaused).toBe(false);
    });

    it('correctly parses paused state as true', async () => {
        const mockPendingHex = '0x0c000000020d70656e64696e672d70617573650910106566666563746976652d6865696768740100000000000000000000000000000000';
        const mockCurrentHex = '0703';
        
        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ result: mockPendingHex })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ result: mockCurrentHex })
            });

        const state = await fetchPauseState();
        
        expect(state.isPaused).toBe(true);
    });

    it('handles pending pause proposal correctly', async () => {
        const mockPendingHex = '0x0c000000020d70656e64696e672d70617573650a03106566666563746976652d6865696768740100000000000000000000000000003039';
        const mockCurrentHex = '0704';
        
        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ result: mockPendingHex })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ result: mockCurrentHex })
            });

        const state = await fetchPauseState();
        
        expect(state.isPaused).toBe(false);
        expect(state.pendingPause).toBe(true);
        expect(state.effectiveHeight).toBe(12345);
    });

    it('throws error when get-is-paused call fails', async () => {
        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ result: '0x0c000000020d70656e64696e672d70617573650910106566666563746976652d6865696768740100000000000000000000000000000000' })
            })
            .mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found'
            });

        await expect(fetchPauseState()).rejects.toThrow('Failed to fetch pause state');
    });

    it('fetches pause state in parallel for consistency', async () => {
        const mockPendingHex = '0x0c000000020d70656e64696e672d70617573650910106566666563746976652d6865696768740100000000000000000000000000000000';
        const mockCurrentHex = '0704';
        
        const startTime = Date.now();
        
        global.fetch
            .mockImplementation(() => 
                new Promise(resolve => {
                    setTimeout(() => {
                        resolve({
                            ok: true,
                            json: () => Promise.resolve({ 
                                result: global.fetch.mock.calls.length === 1 ? mockPendingHex : mockCurrentHex 
                            })
                        });
                    }, 10);
                })
            );

        await fetchPauseState();
        
        const duration = Date.now() - startTime;
        
        expect(duration).toBeLessThan(50);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
});
