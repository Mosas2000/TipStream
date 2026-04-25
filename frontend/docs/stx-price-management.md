# STX Price Management Strategy

The TipStream frontend maintains an up-to-date STX/USD price to provide accurate conversion for users during the tipping process.

## 1. Fetching Mechanism
We use the CoinGecko Simple Price API to fetch the current Stacks price. To reduce unnecessary network traffic and respect API limits, we implement a multi-layered approach:

- **Initial Load**: Check local storage for a cached price.
- **TTL Caching**: A 120-second cache is used before attempting a new network fetch.
- **Polling**: Once the hook is mounted, it establishes a 120-second polling interval.

## 2. Resilience and Backoff
CoinGecko's free tier has strict rate limits. When a `429 Too Many Requests` error is encountered:
- The hook enters a backoff state.
- A 5-minute retry timer is established.
- The user is notified with a standardized error message.

## 3. Resource Management and Cleanup
To ensure the application remains performant and free of memory leaks, the `useStxPrice` hook implements strict lifecycle management:

- **AbortController**: All in-flight fetch requests are aborted when the hook unmounts or a new request is started.
- **Timer Clearing**: Polling intervals and backoff timeouts are reliably cleared on unmount.
- **isMounted Guard**: State updates are guarded by a mounted ref to prevent updates on destroyed components.

## 4. Manual Refresh
Users can manually trigger a price refresh. These manual actions are also cancellable and integrated into the overall cleanup logic.

Last updated: 2026-04-25

Note: Error messages now include explicit status codes (e.g., 429) to assist in troubleshooting.
