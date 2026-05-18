# tipstreak-sdk

Utilities, React hooks, and UI components for building on the [Stacks](https://stacks.co) blockchain — extracted from [TipStream](https://github.com/mosas2000/tipstream).

[![npm version](https://img.shields.io/npm/v/tipstreak-sdk)](https://www.npmjs.com/package/tipstreak-sdk)
[![license](https://img.shields.io/npm/l/tipstreak-sdk)](./LICENSE)

---

## Install

```bash
npm install tipstreak-sdk
```

For React hooks and components, also install peer dependencies:

```bash
npm install react react-dom lucide-react
```

For post-condition helpers:

```bash
npm install @stacks/transactions
```

---

## Two entry points

| Import path | Contents | React required? |
|---|---|---|
| `tipstreak-sdk` | Pure JS utilities | No |
| `tipstreak-sdk/react` | Hooks + components (includes core) | Yes (≥18) |

---

## Core utilities

```js
import {
  isValidStacksAddress,
  isContractPrincipal,
  isValidStacksPrincipal,
  formatAddress,
  validateAddressBookEntry,
  microToStx,
  stxToMicro,
  formatBalance,
  hasSufficientMicroStx,
  feeForTip,
  totalDeduction,
  recipientReceives,
  tipPostCondition,
} from 'tipstreak-sdk';
```

### Address validation

```js
isValidStacksAddress('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ') // true
isContractPrincipal('SP2J6Z...EJ.my-contract')                    // true
isValidStacksPrincipal(value)                                      // either

formatAddress('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ')
// 'SP2J6Z...V9EJ'
```

### micro-STX ↔ STX conversion

```js
microToStx(1_000_000)   // 1
stxToMicro(1.5)         // 1_500_000
formatBalance(1_500_000) // '1.50 STX'
formatBalance(null)      // '--'

hasSufficientMicroStx('5000000', 1000000) // true
```

### Fee & post-condition helpers

```js
feeForTip(1_000_000)          // 5000   (0.5% of 1 STX)
totalDeduction(1_000_000)     // 1_005_000
recipientReceives(1_000_000)  // 995_000

// Build a safe post condition for makeContractCall
const postCondition = tipPostCondition(senderAddress, 1_000_000);
```

---

## React hooks

```js
import { useBalance, useStxPrice, useOnlineStatus, useTransactionLockout } from 'tipstreak-sdk/react';
```

### `useBalance(address, options?)`

Fetches the STX balance for a Stacks address with automatic retry.

```jsx
const { balanceStx, loading, error, refetch } = useBalance('SP2J6Z...');
```

| Return | Type | Description |
|---|---|---|
| `balance` | `string \| null` | Raw micro-STX balance string |
| `balanceStx` | `number \| null` | Balance in STX |
| `loading` | `boolean` | Fetch in progress |
| `error` | `string \| null` | Error message if fetch failed |
| `lastFetched` | `number \| null` | Timestamp of last successful fetch |
| `refetch` | `() => Promise<void>` | Manually trigger a refresh |

Options: `{ apiBase?: string }` — defaults to `https://api.hiro.so`

### `useStxPrice(options?)`

Polls CoinGecko for the current STX/USD price every 2 minutes with localStorage caching.

```jsx
const { price, toUsd, loading, refetch } = useStxPrice();
toUsd(10) // '15.42'
```

Options: `{ apiKey?: string }` — optional CoinGecko demo API key

### `useOnlineStatus()`

Tracks browser network connectivity.

```jsx
const isOnline = useOnlineStatus();
```

### `useTransactionLockout(sources)`

Controls transaction availability based on data source health.

```jsx
const { isLocked, lockReason, severity } = useTransactionLockout({ primary: 'cache' });
// isLocked: true
// lockReason: 'Using cached data. Transactions are temporarily disabled...'
// severity: 'warning'
```

---

## React components

```js
import { TxStatus, CopyButton, ToastContainer, useToast, ConfirmDialog } from 'tipstreak-sdk/react';
```

### `<TxStatus txId={...} />`

Polls the Stacks API and shows pending / confirmed / failed status with an explorer link.

```jsx
<TxStatus
  txId="0xabc123..."
  onConfirmed={(data) => console.log('done', data)}
  onFailed={(reason) => console.error(reason)}
  network="mainnet"  // or 'testnet'
/>
```

### `<CopyButton text={...} />`

Copy-to-clipboard button with a checkmark confirmation state.

```jsx
<CopyButton text="SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ" />
```

### `useToast` + `<ToastContainer />`

```jsx
const { toasts, addToast, removeToast } = useToast();

addToast('Transaction confirmed!', 'success');
addToast('Something went wrong', 'error');

// Place once near your app root:
<ToastContainer toasts={toasts} removeToast={removeToast} />
```

Toast types: `'success' | 'error' | 'warning' | 'info'`

### `<ConfirmDialog />`

Accessible modal with focus trapping, Escape key support, and backdrop click to dismiss.

```jsx
<ConfirmDialog
  open={showDialog}
  title="Send tip?"
  onConfirm={handleSend}
  onCancel={() => setShowDialog(false)}
>
  Are you sure you want to send 1 STX to Alice?
</ConfirmDialog>
```

---

## Styling

Components use [Tailwind CSS](https://tailwindcss.com) utility classes. Make sure Tailwind is configured in your project, or override the classes via `className` props.

---

## License

MIT
