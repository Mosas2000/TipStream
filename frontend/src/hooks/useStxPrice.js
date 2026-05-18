/**
 * @module hooks/useStxPrice
 *
 * App-level wrapper around tipstreak-sdk's useStxPrice.
 * Passes the optional CoinGecko demo API key from the environment.
 */
import { useStxPrice as useStxPriceSDK } from 'tipstreak-sdk/react';

/**
 * Fetch and poll the current STX/USD price.
 * Wraps tipstreak-sdk's useStxPrice with the app's CoinGecko API key.
 *
 * @returns {{
 *   price: number|null,
 *   loading: boolean,
 *   error: string|null,
 *   toUsd: (stxAmount: number|string) => string|null,
 *   refetch: () => Promise<void>
 * }}
 */
export function useStxPrice() {
    return useStxPriceSDK({
        apiKey: import.meta.env?.VITE_COINGECKO_DEMO_API_KEY,
    });
}
