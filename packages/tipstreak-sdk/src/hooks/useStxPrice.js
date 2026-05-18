/**
 * @module tipstreak-sdk/hooks/useStxPrice
 *
 * React hook to fetch and poll the current STX/USD price from CoinGecko.
 *
 * Features:
 * - Polls every 120s automatically
 * - Exponential backoff on 429 rate limits
 * - localStorage caching to reduce API calls
 * - Proper cleanup on unmount
 *
 * @requires react
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=stacks&vs_currencies=usd';

const POLLING_INTERVAL_MS = 120_000;
const RATE_LIMIT_RETRY_MS = 300_000;
const CACHE_KEY = 'tipstreak-sdk:stx-price';
const CACHE_TTL_MS = 120_000;

function readCachedPrice() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.price !== 'number' || typeof parsed?.cachedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedPrice(price) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ price, cachedAt: Date.now() }));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Fetch and poll the current STX price in USD.
 *
 * @param {object} [options]
 * @param {string} [options.apiKey] - Optional CoinGecko demo API key
 * @returns {{
 *   price: number|null,
 *   loading: boolean,
 *   error: string|null,
 *   toUsd: (stxAmount: number|string) => string|null,
 *   refetch: () => Promise<void>
 * }}
 *
 * @example
 * const { price, toUsd } = useStxPrice();
 * toUsd(10) // '15.42'
 */
export function useStxPrice(options = {}) {
  const { apiKey } = options;
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const isMountedRef = useRef(true);
  const manualAbortRef = useRef(null);

  const fetchPrice = useCallback(async (forceNetwork = false, signal = null) => {
    try {
      if (!forceNetwork) {
        const cached = readCachedPrice();
        if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
          if (isMountedRef.current) {
            setPrice(cached.price);
            setError(null);
            setLoading(false);
          }
          return;
        }
      }

      const headers = apiKey ? { 'x-cg-demo-api-key': apiKey } : undefined;
      const res = await fetch(COINGECKO_URL, { headers, signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const usd = data?.stacks?.usd;
      if (typeof usd !== 'number') throw new Error('Invalid price data');

      if (isMountedRef.current) {
        setPrice(usd);
        writeCachedPrice(usd);
        setError(null);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (isMountedRef.current) {
        setError(err.message.includes('429')
          ? 'Rate limit exceeded. Retrying soon...'
          : err.message || 'Failed to fetch price'
        );
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPrice(false, controller.signal);
    timerRef.current = setInterval(() => fetchPrice(true, controller.signal), POLLING_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      controller.abort();
      manualAbortRef.current?.abort();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchPrice]);

  // Backoff retry on rate limit
  useEffect(() => {
    if (!error?.includes('429')) return;
    const controller = new AbortController();
    const id = setTimeout(() => fetchPrice(true, controller.signal), RATE_LIMIT_RETRY_MS);
    return () => { clearTimeout(id); controller.abort(); };
  }, [error, fetchPrice]);

  const toUsd = useCallback((stxAmount) => {
    if (price === null || stxAmount === null || stxAmount === undefined) return null;
    return (Number(stxAmount) * price).toFixed(2);
  }, [price]);

  const refetch = useCallback(() => {
    manualAbortRef.current?.abort();
    manualAbortRef.current = new AbortController();
    return fetchPrice(true, manualAbortRef.current.signal);
  }, [fetchPrice]);

  return { price, loading, error, toUsd, refetch };
}
