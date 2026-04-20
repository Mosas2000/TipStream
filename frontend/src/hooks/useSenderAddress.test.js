import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSenderAddress } from './useSenderAddress';
import * as stacksUtils from '../utils/stacks';

vi.mock('../utils/stacks', () => ({
    getSenderAddress: vi.fn(),
    userSession: {
        isUserSignedIn: vi.fn(),
        loadUserData: vi.fn(),
    },
}));

describe('useSenderAddress', () => {
    let accountChangeCallback;

    beforeEach(() => {
        vi.clearAllMocks();
        accountChangeCallback = null;
        stacksUtils.userSession.isUserSignedIn.mockReturnValue(true);
        stacksUtils.userSession.loadUserData.mockReturnValue({
            profile: {
                stxAddress: { mainnet: 'SP1INITIAL' },
            },
        });
        stacksUtils.getSenderAddress.mockReturnValue('SP1INITIAL');
        window.StacksProvider = {
            on: vi.fn((event, cb) => {
                if (event === 'accountsChanged') {
                    accountChangeCallback = cb;
                }
            }),
            removeListener: vi.fn(),
        };
    });

    afterEach(() => {
        delete window.StacksProvider;
    });

    it('refreshes when the wallet session changes in storage', () => {
        const { result } = renderHook(() => useSenderAddress());

        expect(result.current).toBe('SP1INITIAL');

        stacksUtils.getSenderAddress.mockReturnValue('SP2UPDATED');

        act(() => {
            window.dispatchEvent(new StorageEvent('storage', { key: 'blockstack-session' }));
        });

        expect(result.current).toBe('SP2UPDATED');
    });

    it('refreshes when the wallet account changes', () => {
        const { result } = renderHook(() => useSenderAddress());

        expect(result.current).toBe('SP1INITIAL');

        stacksUtils.getSenderAddress.mockReturnValue('SP3ACCOUNT');

        act(() => {
            accountChangeCallback();
        });

        expect(result.current).toBe('SP3ACCOUNT');
    });
});
