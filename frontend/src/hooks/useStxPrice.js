import { useState, useEffect, useCallback, useRef } from "react";

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=stacks&vs_currencies=usd";
const REFRESH_INTERVAL = 60_000;

export function useStxPrice() {
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch(COINGECKO_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const usd = data?.stacks?.usd;
      if (typeof usd !== "number") throw new Error("Invalid price data");
      setPrice(usd);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrice();
    intervalRef.current = setInterval(fetchPrice, REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchPrice]);

  const toUsd = useCallback(
    (stxAmount) => {
      if (price === null || stxAmount === null || stxAmount === undefined) return null;
      return (Number(stxAmount) * price).toFixed(2);
    },
    [price]
  );

  return { price, loading, error, toUsd, refetch: fetchPrice };
}
