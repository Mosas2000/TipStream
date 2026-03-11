import { describe, it, expect, vi } from 'vitest';

// Mock @stacks/connect before importing
vi.mock('@stacks/connect', () => ({
    openContractCall: vi.fn().mockResolvedValue(undefined),
    AppConfig: vi.fn(),
    UserSession: vi.fn(() => ({
        isUserSignedIn: () => false,
        loadUserData: () => null,
    })),
    showConnect: vi.fn(),
}));

// Mock @stacks/transactions
vi.mock('@stacks/transactions', () => ({
    PostConditionMode: { Deny: 0x02 },
    uintCV: vi.fn((v) => ({ type: 'uint', value: v })),
    boolCV: vi.fn((v) => ({ type: 'bool', value: v })),
    makeContractCall: vi.fn(),
}));

// Mock @stacks/network
vi.mock('@stacks/network', () => ({
    STACKS_MAINNET: 'mainnet',
    STACKS_TESTNET: 'testnet',
    STACKS_DEVNET: 'devnet',
}));

// Mock the stacks utility to avoid AppConfig/UserSession instantiation issues
vi.mock('../utils/stacks', () => ({
    network: 'mainnet',
    appDetails: { name: 'TipStream', icon: '/logo.svg' },
    userSession: { isUserSignedIn: () => false },
}));

import { openContractCall } from '@stacks/connect';
import { PostConditionMode, uintCV, boolCV } from '@stacks/transactions';
import {
    proposePauseChange,
    executePauseChange,
    proposeFeeChange,
    executeFeeChange,
    cancelFeeChange,
} from '../lib/admin-transactions';

describe('admin transaction builders', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('proposePauseChange', () => {
        it('calls openContractCall with propose-pause-change', async () => {
            await proposePauseChange(true);
            expect(openContractCall).toHaveBeenCalledTimes(1);
            const options = openContractCall.mock.calls[0][0];
            expect(options.functionName).toBe('propose-pause-change');
        });

        it('passes boolCV argument for pause state', async () => {
            await proposePauseChange(true);
            expect(boolCV).toHaveBeenCalledWith(true);

            await proposePauseChange(false);
            expect(boolCV).toHaveBeenCalledWith(false);
        });

        it('uses PostConditionMode.Deny', async () => {
            await proposePauseChange(true);
            const options = openContractCall.mock.calls[0][0];
            expect(options.postConditionMode).toBe(PostConditionMode.Deny);
        });

        it('passes empty post conditions array', async () => {
            await proposePauseChange(true);
            const options = openContractCall.mock.calls[0][0];
            expect(options.postConditions).toEqual([]);
        });

        it('includes onFinish and onCancel callbacks', async () => {
            const onFinish = vi.fn();
            const onCancel = vi.fn();
            await proposePauseChange(true, { onFinish, onCancel });
            const options = openContractCall.mock.calls[0][0];

            options.onFinish({ txId: 'test' });
            expect(onFinish).toHaveBeenCalledWith({ txId: 'test' });

            options.onCancel();
            expect(onCancel).toHaveBeenCalled();
        });
    });

    describe('executePauseChange', () => {
        it('calls openContractCall with execute-pause-change', async () => {
            await executePauseChange();
            const options = openContractCall.mock.calls[0][0];
            expect(options.functionName).toBe('execute-pause-change');
        });

        it('passes no function arguments', async () => {
            await executePauseChange();
            const options = openContractCall.mock.calls[0][0];
            expect(options.functionArgs).toEqual([]);
        });
    });

    describe('proposeFeeChange', () => {
        it('calls openContractCall with propose-fee-change', async () => {
            await proposeFeeChange(200);
            const options = openContractCall.mock.calls[0][0];
            expect(options.functionName).toBe('propose-fee-change');
        });

        it('passes uintCV argument for fee', async () => {
            await proposeFeeChange(200);
            expect(uintCV).toHaveBeenCalledWith(200);
        });

        it('throws for fee below 0', () => {
            expect(() => proposeFeeChange(-1)).toThrow('Fee must be between 0 and 1000 basis points');
        });

        it('throws for fee above 1000', () => {
            expect(() => proposeFeeChange(1001)).toThrow('Fee must be between 0 and 1000 basis points');
        });

        it('accepts fee of 0', async () => {
            await proposeFeeChange(0);
            expect(uintCV).toHaveBeenCalledWith(0);
        });

        it('accepts fee of 1000', async () => {
            await proposeFeeChange(1000);
            expect(uintCV).toHaveBeenCalledWith(1000);
        });
    });

    describe('executeFeeChange', () => {
        it('calls openContractCall with execute-fee-change', async () => {
            await executeFeeChange();
            const options = openContractCall.mock.calls[0][0];
            expect(options.functionName).toBe('execute-fee-change');
        });
    });

    describe('cancelFeeChange', () => {
        it('calls openContractCall with cancel-fee-change', async () => {
            await cancelFeeChange();
            const options = openContractCall.mock.calls[0][0];
            expect(options.functionName).toBe('cancel-fee-change');
        });

        it('uses PostConditionMode.Deny', async () => {
            await cancelFeeChange();
            const options = openContractCall.mock.calls[0][0];
            expect(options.postConditionMode).toBe(PostConditionMode.Deny);
        });
    });

    describe('security enforcement', () => {
        it('never calls set-paused (direct bypass)', async () => {
            // Verify none of our transaction builders use set-paused
            await proposePauseChange(true);
            await executePauseChange();
            await proposeFeeChange(100);
            await executeFeeChange();
            await cancelFeeChange();

            const allCalls = openContractCall.mock.calls;
            allCalls.forEach((call) => {
                expect(call[0].functionName).not.toBe('set-paused');
            });
        });

        it('never calls set-fee-basis-points (direct bypass)', async () => {
            await proposePauseChange(true);
            await executePauseChange();
            await proposeFeeChange(100);
            await executeFeeChange();
            await cancelFeeChange();

            const allCalls = openContractCall.mock.calls;
            allCalls.forEach((call) => {
                expect(call[0].functionName).not.toBe('set-fee-basis-points');
            });
        });

        it('all transaction builders use PostConditionMode.Deny', async () => {
            await proposePauseChange(true);
            await executePauseChange();
            await proposeFeeChange(100);
            await executeFeeChange();
            await cancelFeeChange();

            const allCalls = openContractCall.mock.calls;
            allCalls.forEach((call) => {
                expect(call[0].postConditionMode).toBe(PostConditionMode.Deny);
            });
        });
    });
});
