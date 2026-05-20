import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock heavy Stacks dependencies to prevent slow cryptography execution in tests
vi.mock('@stacks/transactions', () => ({
    PostConditionMode: { Deny: 0x02 },
    uintCV: vi.fn((v) => ({ type: 'uint', value: v })),
    principalCV: vi.fn((v) => ({ type: 'principal', value: v })),
    stringUtf8CV: vi.fn((v) => ({ type: 'string-utf8', value: v })),
    makeContractCall: vi.fn().mockResolvedValue({
        serialize: () => new Uint8Array([0, 1, 2, 3])
    }),
}));

vi.mock('@stacks/network', () => ({
    STACKS_MAINNET: 'mainnet',
    STACKS_TESTNET: 'testnet',
    STACKS_DEVNET: 'devnet',
}));

vi.mock('../utils/stacks', () => ({
    network: 'mainnet',
    appDetails: { name: 'TipStream', icon: '/logo.svg' },
    userSession: { isUserSignedIn: () => false },
}));

vi.mock('../config/contracts', () => ({
    CONTRACT_ADDRESS: 'SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60',
    CONTRACT_NAME: 'tipstream',
    STACKS_API_BASE: 'https://api.hiro.so',
    FN_SEND_CATEGORIZED_TIP: 'send-categorized-tip',
}));

vi.mock('../context/DemoContext', () => ({
    useDemoMode: () => ({ demoEnabled: false }),
}));

vi.mock('./useStxPrice', () => ({
    useStxPrice: () => ({
        price: 2.5,
        loading: false,
        error: null,
        toUsd: (stx) => (Number(stx) * 2.5).toFixed(2),
    }),
}));

import { useTransactionFeeEstimate } from './useTransactionFeeEstimate';

describe('useTransactionFeeEstimate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('starts with fallback values when loading', () => {
        global.fetch.mockReturnValue(new Promise(() => {}));
        const { result } = renderHook(() => useTransactionFeeEstimate({ pollInterval: 0 }));
        
        expect(result.current.loading).toBe(true);
        expect(result.current.feeEstimateMicroSTX).toBe(5000);
        expect(result.current.feeEstimateSTX).toBe(0.005);
    });
});
