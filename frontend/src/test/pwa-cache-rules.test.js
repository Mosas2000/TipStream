import { describe, it, expect } from 'vitest';

const BALANCE_URL = 'https://api.hiro.so/extended/v1/address/SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T/stx';
const BALANCES_URL = 'https://api.hiro.so/extended/v1/address/SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T/balances';
const NONCES_URL = 'https://api.hiro.so/extended/v1/address/SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T/nonces';
const TX_STATUS_URL = 'https://api.hiro.so/extended/v1/tx/0xabc123';
const MEMPOOL_URL = 'https://api.hiro.so/extended/v1/tx/mempool';
const FEE_URL = 'https://api.hiro.so/v2/fees/transfer';
const CONTRACT_EVENTS_URL = 'https://api.hiro.so/extended/v1/contract/SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream/events?limit=50&offset=0';
const READ_ONLY_URL = 'https://api.hiro.so/v2/contracts/call-read/SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T/tipstream/get-tip';

const BALANCE_PATTERN = /^https:\/\/api\.(hiro\.so|testnet\.hiro\.so)\/extended\/v1\/address\/.+\/stx/i;
const BALANCES_PATTERN = /^https:\/\/api\.(hiro\.so|testnet\.hiro\.so)\/extended\/v1\/address\/.+\/balances/i;
const NONCES_PATTERN = /^https:\/\/api\.(hiro\.so|testnet\.hiro\.so)\/extended\/v1\/address\/.+\/nonces/i;
const TX_PATTERN = /^https:\/\/api\.(hiro\.so|testnet\.hiro\.so)\/extended\/v1\/tx\/.+/i;
const MEMPOOL_PATTERN = /^https:\/\/api\.(hiro\.so|testnet\.hiro\.so)\/extended\/v1\/tx\/mempool/i;
const FEE_PATTERN = /^https:\/\/api\.(hiro\.so|testnet\.hiro\.so)\/v2\/fees\/.*/i;
const GENERAL_PATTERN = /^https:\/\/api\.(hiro\.so|testnet\.hiro\.so)\/.*/i;
const COINGECKO_PATTERN = /^https:\/\/api\.coingecko\.com\/.*/i;
const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=stacks&vs_currencies=usd';

describe('PWA cache rule patterns', () => {
    describe('balance endpoint pattern', () => {
        it('matches mainnet balance URL', () => {
            expect(BALANCE_PATTERN.test(BALANCE_URL)).toBe(true);
        });

        it('matches testnet balance URL', () => {
            const testnetUrl = 'https://api.testnet.hiro.so/extended/v1/address/ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM/stx';
            expect(BALANCE_PATTERN.test(testnetUrl)).toBe(true);
        });

        it('does not match contract events URL', () => {
            expect(BALANCE_PATTERN.test(CONTRACT_EVENTS_URL)).toBe(false);
        });
    });

    describe('balances endpoint pattern', () => {
        it('matches mainnet balances URL', () => {
            expect(BALANCES_PATTERN.test(BALANCES_URL)).toBe(true);
        });

        it('does not match stx-only balance URL', () => {
            expect(BALANCES_PATTERN.test(BALANCE_URL)).toBe(false);
        });
    });

    describe('nonces endpoint pattern', () => {
        it('matches nonces URL', () => {
            expect(NONCES_PATTERN.test(NONCES_URL)).toBe(true);
        });

        it('does not match balance URL', () => {
            expect(NONCES_PATTERN.test(BALANCE_URL)).toBe(false);
        });
    });

    describe('transaction status pattern', () => {
        it('matches individual tx URL', () => {
            expect(TX_PATTERN.test(TX_STATUS_URL)).toBe(true);
        });

        it('matches mempool URL', () => {
            expect(TX_PATTERN.test(MEMPOOL_URL)).toBe(true);
        });

        it('does not match balance URL', () => {
            expect(TX_PATTERN.test(BALANCE_URL)).toBe(false);
        });
    });

    describe('mempool pattern', () => {
        it('matches mempool URL', () => {
            expect(MEMPOOL_PATTERN.test(MEMPOOL_URL)).toBe(true);
        });

        it('does not match individual tx URL', () => {
            expect(MEMPOOL_PATTERN.test(TX_STATUS_URL)).toBe(false);
        });
    });

    describe('fee estimation pattern', () => {
        it('matches fee transfer URL', () => {
            expect(FEE_PATTERN.test(FEE_URL)).toBe(true);
        });

        it('does not match balance URL', () => {
            expect(FEE_PATTERN.test(BALANCE_URL)).toBe(false);
        });
    });

    describe('general catch-all pattern', () => {
        it('matches contract events URL', () => {
            expect(GENERAL_PATTERN.test(CONTRACT_EVENTS_URL)).toBe(true);
        });

        it('matches read-only call URL', () => {
            expect(GENERAL_PATTERN.test(READ_ONLY_URL)).toBe(true);
        });

        it('matches balance URL', () => {
            expect(GENERAL_PATTERN.test(BALANCE_URL)).toBe(true);
        });

        it('does not match CoinGecko URL', () => {
            expect(GENERAL_PATTERN.test(COINGECKO_URL)).toBe(false);
        });
    });

    describe('CoinGecko pattern', () => {
        it('matches CoinGecko price URL', () => {
            expect(COINGECKO_PATTERN.test(COINGECKO_URL)).toBe(true);
        });

        it('does not match Hiro API URL', () => {
            expect(COINGECKO_PATTERN.test(BALANCE_URL)).toBe(false);
        });

        it('does not match non-CoinGecko URL', () => {
            expect(COINGECKO_PATTERN.test('https://example.com/api/v3/simple/price')).toBe(false);
        });
    });

    describe('case insensitivity', () => {
        it('balance pattern matches uppercase domain', () => {
            const url = 'HTTPS://API.HIRO.SO/extended/v1/address/SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T/stx';
            expect(BALANCE_PATTERN.test(url)).toBe(true);
        });

        it('tx pattern matches mixed case', () => {
            const url = 'https://API.Hiro.So/Extended/V1/TX/0xabc';
            expect(TX_PATTERN.test(url)).toBe(true);
        });

        it('fee pattern matches uppercase path', () => {
            const url = 'https://api.hiro.so/V2/FEES/transfer';
            expect(FEE_PATTERN.test(url)).toBe(true);
        });
    });

    describe('rule ordering', () => {
        const rules = [
            { pattern: BALANCE_PATTERN, handler: 'NetworkOnly' },
            { pattern: BALANCES_PATTERN, handler: 'NetworkOnly' },
            { pattern: NONCES_PATTERN, handler: 'NetworkOnly' },
            { pattern: MEMPOOL_PATTERN, handler: 'NetworkOnly' },
            { pattern: TX_PATTERN, handler: 'NetworkOnly' },
            { pattern: FEE_PATTERN, handler: 'NetworkOnly' },
            { pattern: GENERAL_PATTERN, handler: 'NetworkFirst' },
            { pattern: COINGECKO_PATTERN, handler: 'NetworkOnly' },
        ];

        function firstMatchingRule(url) {
            return rules.find(r => r.pattern.test(url));
        }

        it('routes balance URL to NetworkOnly before catch-all', () => {
            const match = firstMatchingRule(BALANCE_URL);
            expect(match.handler).toBe('NetworkOnly');
            expect(match.pattern).toBe(BALANCE_PATTERN);
        });

        it('routes tx URL to NetworkOnly before catch-all', () => {
            const match = firstMatchingRule(TX_STATUS_URL);
            expect(match.handler).toBe('NetworkOnly');
        });

        it('routes mempool URL to its own rule before generic tx rule', () => {
            const match = firstMatchingRule(MEMPOOL_URL);
            expect(match.pattern).toBe(MEMPOOL_PATTERN);
        });

        it('routes contract events to NetworkFirst catch-all', () => {
            const match = firstMatchingRule(CONTRACT_EVENTS_URL);
            expect(match.handler).toBe('NetworkFirst');
            expect(match.pattern).toBe(GENERAL_PATTERN);
        });

        it('routes read-only calls to NetworkFirst catch-all', () => {
            const match = firstMatchingRule(READ_ONLY_URL);
            expect(match.handler).toBe('NetworkFirst');
        });

        it('routes fee estimation to NetworkOnly', () => {
            const match = firstMatchingRule(FEE_URL);
            expect(match.handler).toBe('NetworkOnly');
            expect(match.pattern).toBe(FEE_PATTERN);
        });

        it('routes nonces to NetworkOnly', () => {
            const match = firstMatchingRule(NONCES_URL);
            expect(match.handler).toBe('NetworkOnly');
            expect(match.pattern).toBe(NONCES_PATTERN);
        });

        it('routes balances to NetworkOnly', () => {
            const match = firstMatchingRule(BALANCES_URL);
            expect(match.handler).toBe('NetworkOnly');
            expect(match.pattern).toBe(BALANCES_PATTERN);
        });

        it('routes CoinGecko to NetworkOnly', () => {
            const match = firstMatchingRule(COINGECKO_URL);
            expect(match.handler).toBe('NetworkOnly');
            expect(match.pattern).toBe(COINGECKO_PATTERN);
        });
    });

    describe('non-matching URLs', () => {
        it('does not match non-hiro API URL', () => {
            const url = 'https://api.example.com/extended/v1/address/SP31PKQ/stx';
            expect(BALANCE_PATTERN.test(url)).toBe(false);
            expect(GENERAL_PATTERN.test(url)).toBe(false);
        });

        it('does not match CoinGecko URL', () => {
            const url = 'https://api.coingecko.com/api/v3/simple/price?ids=stacks&vs_currencies=usd';
            expect(GENERAL_PATTERN.test(url)).toBe(false);
        });

        it('does not match localhost URL', () => {
            const url = 'http://localhost:3999/extended/v1/address/SP31PKQ/stx';
            expect(BALANCE_PATTERN.test(url)).toBe(false);
        });
    });

    describe('URLs with query parameters', () => {
        it('balance pattern matches URL with unanchored param', () => {
            const url = BALANCE_URL + '?unanchored=true';
            expect(BALANCE_PATTERN.test(url)).toBe(true);
        });

        it('tx pattern matches URL with event_offset', () => {
            const url = TX_STATUS_URL + '?event_offset=0&event_limit=50';
            expect(TX_PATTERN.test(url)).toBe(true);
        });

        it('fee pattern matches URL with trailing slash and param', () => {
            const url = FEE_URL + '?estimated_len=350';
            expect(FEE_PATTERN.test(url)).toBe(true);
        });
    });

    describe('testnet URL variants', () => {
        it('testnet balances URL matches balances pattern', () => {
            const url = 'https://api.testnet.hiro.so/extended/v1/address/ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM/balances';
            expect(BALANCES_PATTERN.test(url)).toBe(true);
        });

        it('testnet nonces URL matches nonces pattern', () => {
            const url = 'https://api.testnet.hiro.so/extended/v1/address/ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM/nonces';
            expect(NONCES_PATTERN.test(url)).toBe(true);
        });

        it('testnet tx URL matches tx pattern', () => {
            const url = 'https://api.testnet.hiro.so/extended/v1/tx/0xdef456';
            expect(TX_PATTERN.test(url)).toBe(true);
        });

        it('testnet mempool URL matches mempool pattern', () => {
            const url = 'https://api.testnet.hiro.so/extended/v1/tx/mempool';
            expect(MEMPOOL_PATTERN.test(url)).toBe(true);
        });

        it('testnet fee URL matches fee pattern', () => {
            const url = 'https://api.testnet.hiro.so/v2/fees/transfer';
            expect(FEE_PATTERN.test(url)).toBe(true);
        });

        it('testnet contract events fall through to general pattern', () => {
            const url = 'https://api.testnet.hiro.so/extended/v1/contract/ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.tipstream/events?limit=50&offset=0';
            expect(BALANCE_PATTERN.test(url)).toBe(false);
            expect(TX_PATTERN.test(url)).toBe(false);
            expect(GENERAL_PATTERN.test(url)).toBe(true);
        });
    });

    describe('address transactions endpoint', () => {
        it('falls through to general cached rule', () => {
            const url = 'https://api.hiro.so/extended/v1/address/SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T/transactions';
            expect(BALANCE_PATTERN.test(url)).toBe(false);
            expect(BALANCES_PATTERN.test(url)).toBe(false);
            expect(NONCES_PATTERN.test(url)).toBe(false);
            expect(GENERAL_PATTERN.test(url)).toBe(true);
        });
    });

    describe('v2 read-only contract calls', () => {
        it('contract map-entry calls fall through to general pattern', () => {
            const url = 'https://api.hiro.so/v2/map_entry/SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T/tipstream/tips';
            expect(BALANCE_PATTERN.test(url)).toBe(false);
            expect(TX_PATTERN.test(url)).toBe(false);
            expect(GENERAL_PATTERN.test(url)).toBe(true);
        });

        it('contract interface calls fall through to general pattern', () => {
            const url = 'https://api.hiro.so/v2/contracts/interface/SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T/tipstream';
            expect(GENERAL_PATTERN.test(url)).toBe(true);
            expect(FEE_PATTERN.test(url)).toBe(false);
        });
    });

    describe('tx hash formats', () => {
        it('matches full 66-char tx hash', () => {
            const url = 'https://api.hiro.so/extended/v1/tx/0x6a8c4daab2d34d41ddfe3f3d3fe95d2bbf4f91a4b4c5f1e2b3d4a5c6f7e8d9a0';
            expect(TX_PATTERN.test(url)).toBe(true);
        });

        it('matches tx hash without 0x prefix', () => {
            const url = 'https://api.hiro.so/extended/v1/tx/6a8c4daab2d34d41ddfe3f3d3fe95d2bbf4f91a4b4c5f1e2b3d4a5c6f7e8d9a0';
            expect(TX_PATTERN.test(url)).toBe(true);
        });
    });

    describe('pattern isolation', () => {
        const allPatterns = [
            { name: 'balance', pattern: BALANCE_PATTERN },
            { name: 'balances', pattern: BALANCES_PATTERN },
            { name: 'nonces', pattern: NONCES_PATTERN },
            { name: 'tx', pattern: TX_PATTERN },
            { name: 'mempool', pattern: MEMPOOL_PATTERN },
            { name: 'fee', pattern: FEE_PATTERN },
        ];

        it('balance URL only matches balance and general patterns', () => {
            const matching = allPatterns.filter(p => p.pattern.test(BALANCE_URL)).map(p => p.name);
            expect(matching).toEqual(['balance']);
        });

        it('fee URL only matches fee pattern', () => {
            const matching = allPatterns.filter(p => p.pattern.test(FEE_URL)).map(p => p.name);
            expect(matching).toEqual(['fee']);
        });

        it('nonces URL only matches nonces pattern', () => {
            const matching = allPatterns.filter(p => p.pattern.test(NONCES_URL)).map(p => p.name);
            expect(matching).toEqual(['nonces']);
        });

        it('balances URL only matches balances pattern', () => {
            const matching = allPatterns.filter(p => p.pattern.test(BALANCES_URL)).map(p => p.name);
            expect(matching).toEqual(['balances']);
        });

        it('mempool URL matches both mempool and tx patterns', () => {
            const matching = allPatterns.filter(p => p.pattern.test(MEMPOOL_URL)).map(p => p.name);
            expect(matching).toContain('mempool');
            expect(matching).toContain('tx');
        });

        it('contract events URL does not match any specific pattern', () => {
            const matching = allPatterns.filter(p => p.pattern.test(CONTRACT_EVENTS_URL)).map(p => p.name);
            expect(matching).toEqual([]);
        });

        it('read-only URL does not match any specific pattern', () => {
            const matching = allPatterns.filter(p => p.pattern.test(READ_ONLY_URL)).map(p => p.name);
            expect(matching).toEqual([]);
        });

        it('tx status URL only matches tx pattern', () => {
            const matching = allPatterns.filter(p => p.pattern.test(TX_STATUS_URL)).map(p => p.name);
            expect(matching).toEqual(['tx']);
        });
    });
});
