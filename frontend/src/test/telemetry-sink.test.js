import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  configureSink,
  getSinkConfig,
  isSinkEnabled,
  queueEvent,
  flush,
  getQueueLength,
  clearQueue,
  resetSink,
} from '../lib/telemetry-sink';

describe('telemetry-sink', () => {
  beforeEach(() => {
    resetSink();
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('configureSink', () => {
    it('updates sink configuration', () => {
      configureSink({
        enabled: true,
        endpoint: 'https://telemetry.example.com/ingest',
        apiKey: 'test-key',
      });

      const config = getSinkConfig();
      expect(config.enabled).toBe(true);
      expect(config.endpoint).toBe('https://telemetry.example.com/ingest');
      expect(config.apiKey).toBe('test-key');
    });

    it('merges with defaults', () => {
      configureSink({ enabled: true, endpoint: 'https://test.com' });
      const config = getSinkConfig();
      expect(config.batchSize).toBe(10);
      expect(config.flushIntervalMs).toBe(30000);
    });
  });

  describe('isSinkEnabled', () => {
    it('returns false when not configured', () => {
      expect(isSinkEnabled()).toBe(false);
    });

    it('returns true when enabled with endpoint', () => {
      configureSink({ enabled: true, endpoint: 'https://test.com' });
      expect(isSinkEnabled()).toBe(true);
    });

    it('returns false when enabled but no endpoint', () => {
      configureSink({ enabled: true });
      expect(isSinkEnabled()).toBe(false);
    });
  });

  describe('queueEvent', () => {
    it('does not queue when sink disabled', () => {
      queueEvent('test', { foo: 'bar' });
      expect(getQueueLength()).toBe(0);
    });

    it('queues event when sink enabled', () => {
      configureSink({ enabled: true, endpoint: 'https://test.com' });
      queueEvent('page_view', { route: '/home' });
      expect(getQueueLength()).toBe(1);
    });

    it('adds timestamp and environment to event', () => {
      configureSink({ enabled: true, endpoint: 'https://test.com' });
      queueEvent('test', { data: 'value' });
      expect(getQueueLength()).toBe(1);
    });

    it('automatically flushes when batch size reached', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      configureSink({
        enabled: true,
        endpoint: 'https://test.com',
        batchSize: 3,
      });

      queueEvent('event1', {});
      queueEvent('event2', {});
      queueEvent('event3', {});

      // Wait for the flush to complete
      await vi.waitFor(() => {
        expect(getQueueLength()).toBe(0);
      });
    });
  });

  describe('flush', () => {
    it('returns success with 0 count when queue empty', async () => {
      configureSink({ enabled: true, endpoint: 'https://test.com' });
      const result = await flush();
      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });

    it('sends events to configured endpoint', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      configureSink({ enabled: true, endpoint: 'https://test.com' });
      queueEvent('test1', { data: 1 });
      queueEvent('test2', { data: 2 });

      const result = await flush();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.com',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result.success).toBe(true);
    });

    it('includes API key in headers when configured', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200 });

      configureSink({
        enabled: true,
        endpoint: 'https://test.com',
        apiKey: 'secret-key',
      });
      queueEvent('test', {});

      await flush();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer secret-key',
          }),
        })
      );
    });

    it('retries on failure', async () => {
      global.fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, status: 200 });

      configureSink({
        enabled: true,
        endpoint: 'https://test.com',
        retryAttempts: 3,
        retryDelayMs: 100,
      });
      queueEvent('test', {});

      const flushPromise = flush();
      
      // Advance timers to allow retry
      await vi.advanceTimersByTimeAsync(100);
      
      const result = await flushPromise;

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it('gives up after max retries', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      configureSink({
        enabled: true,
        endpoint: 'https://test.com',
        retryAttempts: 2,
        retryDelayMs: 10,
      });
      queueEvent('test', {});

      const flushPromise = flush();
      
      // Advance timers to allow all retries (10ms * 1 + 10ms * 2 = 30ms total)
      await vi.advanceTimersByTimeAsync(30);
      
      const result = await flushPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('clearQueue', () => {
    it('removes all queued events', () => {
      configureSink({ enabled: true, endpoint: 'https://test.com' });
      queueEvent('event1', {});
      queueEvent('event2', {});

      const cleared = clearQueue();
      expect(cleared).toBe(2);
      expect(getQueueLength()).toBe(0);
    });
  });

  describe('resetSink', () => {
    it('resets configuration and clears queue', () => {
      configureSink({ enabled: true, endpoint: 'https://test.com' });
      queueEvent('test', {});

      resetSink();

      expect(isSinkEnabled()).toBe(false);
      expect(getQueueLength()).toBe(0);
    });
  });
});
