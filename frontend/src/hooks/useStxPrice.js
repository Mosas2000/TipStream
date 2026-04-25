import { useState, useEffect, useCallback, useRef } from "react";

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=stacks&vs_currencies=usd";
const REFRESH_INTERVAL = 120_000;
const RATE_LIMIT_RETRY_MS = 300_000;
const CACHE_KEY = "tipstream:stx-price";
const CACHE_TTL_MS = 120_000;

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
    fetchPrice();
    intervalRef.current = setInterval(() => {
      fetchPrice(true);
    }, REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchPrice]);

  useEffect(() => {
    if (error !== "HTTP 429") return;
    const timeoutId = setTimeout(() => {
      fetchPrice(true);
    }, RATE_LIMIT_RETRY_MS);
    return () => clearTimeout(timeoutId);
  }, [error, fetchPrice]);

  const toUsd = useCallback(
    (stxAmount) => {
      if (price === null || stxAmount === null || stxAmount === undefined) return null;
      return (Number(stxAmount) * price).toFixed(2);
    },
    [price]
  );

  return { price, loading, error, toUsd, refetch: () => fetchPrice(true) };
}
