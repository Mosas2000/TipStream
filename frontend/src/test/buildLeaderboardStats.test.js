import { describe, it, expect } from 'vitest';
import { buildLeaderboardStats } from '../lib/buildLeaderboardStats';

describe('buildLeaderboardStats', () => {
    it('returns an empty array when given no events', () => {
        expect(buildLeaderboardStats([])).toEqual([]);
    });

    it('tracks sent totals for a single sender', () => {
        const events = [
            { sender: 'SP1', recipient: 'SP2', amount: '1000000' },
        ];
        const stats = buildLeaderboardStats(events);
        const sp1 = stats.find(s => s.address === 'SP1');
        expect(sp1.totalSent).toBe(1000000);
        expect(sp1.tipsSent).toBe(1);
    });

    it('tracks received totals for a single recipient', () => {
        const events = [
            { sender: 'SP1', recipient: 'SP2', amount: '1000000' },
        ];
        const stats = buildLeaderboardStats(events);
        const sp2 = stats.find(s => s.address === 'SP2');
        expect(sp2.totalReceived).toBe(1000000);
        expect(sp2.tipsReceived).toBe(1);
    });

    it('aggregates multiple tips from the same sender', () => {
        const events = [
            { sender: 'SP1', recipient: 'SP2', amount: '1000000' },
            { sender: 'SP1', recipient: 'SP3', amount: '2000000' },
        ];
        const stats = buildLeaderboardStats(events);
        const sp1 = stats.find(s => s.address === 'SP1');
        expect(sp1.totalSent).toBe(3000000);
        expect(sp1.tipsSent).toBe(2);
    });

    it('aggregates multiple tips to the same recipient', () => {
        const events = [
            { sender: 'SP1', recipient: 'SP3', amount: '500000' },
            { sender: 'SP2', recipient: 'SP3', amount: '700000' },
        ];
        const stats = buildLeaderboardStats(events);
        const sp3 = stats.find(s => s.address === 'SP3');
        expect(sp3.totalReceived).toBe(1200000);
        expect(sp3.tipsReceived).toBe(2);
    });

    it('creates entries for both sender and recipient', () => {
        const events = [
            { sender: 'SP1', recipient: 'SP2', amount: '100' },
        ];
        const stats = buildLeaderboardStats(events);
        expect(stats.length).toBe(2);
        expect(stats.map(s => s.address).sort()).toEqual(['SP1', 'SP2']);
    });

    it('initializes all counters to zero for new addresses', () => {
        const events = [
            { sender: 'SP1', recipient: 'SP2', amount: '100' },
        ];
        const stats = buildLeaderboardStats(events);
        const sp1 = stats.find(s => s.address === 'SP1');
        expect(sp1.totalReceived).toBe(0);
        expect(sp1.tipsReceived).toBe(0);
    });

    it('handles an address that both sends and receives', () => {
        const events = [
            { sender: 'SP1', recipient: 'SP2', amount: '1000000' },
            { sender: 'SP2', recipient: 'SP1', amount: '500000' },
        ];
        const stats = buildLeaderboardStats(events);
        const sp1 = stats.find(s => s.address === 'SP1');
        expect(sp1.totalSent).toBe(1000000);
        expect(sp1.totalReceived).toBe(500000);
        expect(sp1.tipsSent).toBe(1);
        expect(sp1.tipsReceived).toBe(1);
    });

    it('parses string amounts as integers', () => {
        const events = [
            { sender: 'SP1', recipient: 'SP2', amount: '999' },
        ];
        const stats = buildLeaderboardStats(events);
        const sp1 = stats.find(s => s.address === 'SP1');
        expect(sp1.totalSent).toBe(999);
    });

    it('handles a self-tip (sender equals recipient)', () => {
        const events = [
            { sender: 'SP1', recipient: 'SP1', amount: '1000' },
        ];
        const stats = buildLeaderboardStats(events);
        expect(stats.length).toBe(1);
        const sp1 = stats[0];
        expect(sp1.totalSent).toBe(1000);
        expect(sp1.totalReceived).toBe(1000);
        expect(sp1.tipsSent).toBe(1);
        expect(sp1.tipsReceived).toBe(1);
    });

    it('returns correct number of unique addresses', () => {
        const events = [
            { sender: 'SP1', recipient: 'SP2', amount: '100' },
            { sender: 'SP2', recipient: 'SP3', amount: '200' },
            { sender: 'SP3', recipient: 'SP1', amount: '300' },
        ];
        const stats = buildLeaderboardStats(events);
        expect(stats.length).toBe(3);
    });

    it('handles large amounts without overflow', () => {
        const events = [
            { sender: 'SP1', recipient: 'SP2', amount: '999999999999' },
        ];
        const stats = buildLeaderboardStats(events);
        expect(stats.find(s => s.address === 'SP1').totalSent).toBe(999999999999);
    });
});
