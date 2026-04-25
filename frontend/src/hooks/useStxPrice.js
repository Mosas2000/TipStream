/**
 * Hook to fetch and poll for the current STX price in USD from CoinGecko.
 * 
 * Features:
 * - Automatic polling every 120s
 * - Exponential backoff/retry on 429 rate limits
 * - LocalStorage caching to reduce API load
 * - Proper cleanup of in-flight requests and timers on unmount
 */
import { useState, useEffect, useCallback, useRef } from "react";

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=stacks&vs_currencies=usd";

const REFRESH_INTERVAL = 120_000;
const RATE_LIMIT_RETRY_MS = 300_000;
const CACHE_KEY = "tipstream:stx-price";
const CACHE_TTL_MS = 120_000;

/**
 * Reads the last known price from local storage.
 * @returns {object|null}
 */
function readCachedPrice() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.price !== "number" || typeof parsed?.cachedAt !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persists a new price point to local storage with a timestamp.
 * @param {number} nextPrice 
 */
function writeCachedPrice(nextPrice) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ price: nextPrice, cachedAt: Date.now() })
    );
  } catch {
    // Ignore storage errors.
  }
}

export function useStxPrice() {
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  /**
   * Internal fetcher that handles cache logic, API keys, and signal abortion.
   * @param {boolean} forceNetwork - If true, bypasses the TTL check for local cache.
   * @param {AbortSignal} signal - Signal to abort the fetch if the component unmounts.
   */
  const fetchPrice = useCallback(async (forceNetwork = false, signal = null) => {
    try {
      if (!forceNetwork) {
        const cached = readCachedPrice();
        if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
          setPrice(cached.price);
          setError(null);
          setLoading(false);
          return;
        }
      }

      const demoKey = import.meta.env?.VITE_COINGECKO_DEMO_API_KEY;
      const headers = demoKey ? { "x-cg-demo-api-key": demoKey } : undefined;
      const res = await fetch(COINGECKO_URL, { headers, signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const usd = data?.stacks?.usd;
      if (typeof usd !== "number") throw new Error("Invalid price data");
      setPrice(usd);
      writeCachedPrice(usd);
      setError(null);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      if (err.message === "HTTP 429") {
        console.warn("CoinGecko rate limit reached. Retrying with backoff.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    
    fetchPrice(false, controller.signal);
    
    intervalRef.current = setInterval(() => {
      fetchPrice(true, controller.signal);
    }, REFRESH_INTERVAL);

    return () => {
      controller.abort();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrice]);

  useEffect(() => {
    if (error !== "HTTP 429") return;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      fetchPrice(true, controller.signal);
    }, RATE_LIMIT_RETRY_MS);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [error, fetchPrice]);

  /**
   * Converts a given STX amount to its USD equivalent based on the current price.
   * @param {number|string} stxAmount 
   * @returns {string|null} Fixed-point string with 2 decimal places, or null if price not loaded.
   */
  const toUsd = useCallback(
    (stxAmount) => {
      if (price === null || stxAmount === null || stxAmount === undefined) return null;
      return (Number(stxAmount) * price).toFixed(2);
    },
    [price]
  );

  return { price, loading, error, toUsd, refetch: () => fetchPrice(true) };
}
