import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SendTip from '../components/SendTip';
import TokenTip from '../components/TokenTip';
import BatchTip from '../components/BatchTip';
import * as blockCheckHook from '../hooks/useBlockCheck';
import * as balanceHook from '../hooks/useBalance';
import * as stxPriceHook from '../hooks/useStxPrice';
import * as demoModeHook from '../context/DemoContext';
import * as tipContextHook from '../context/TipContext';

const sessionState = vi.hoisted(() => ({
    currentSenderAddress: 'SP1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
}));

const mockOpenContractCall = vi.hoisted(() => vi.fn());
const mockNotifyTipSent = vi.hoisted(() => vi.fn());
const mockUseSendTipWithDemo = vi.hoisted(() => vi.fn());
const mockAnalytics = vi.hoisted(() => ({
    trackTipStarted: vi.fn(),
    trackTipSubmitted: vi.fn(),
    trackTipConfirmed: vi.fn(),
    trackTipCancelled: vi.fn(),
    trackTipFailed: vi.fn(),
    trackBatchTipStarted: vi.fn(),
    trackBatchTipSubmitted: vi.fn(),
    trackBatchSize: vi.fn(),
    trackBatchTipCancelled: vi.fn(),
    trackBatchTipFailed: vi.fn(),
    trackBatchTipConfirmed: vi.fn(),
}));

vi.mock('@stacks/connect', () => ({
    openContractCall: (...args) => mockOpenContractCall(...args),
}));

vi.mock('../hooks/useSenderAddress', () => ({
    useSenderAddress: vi.fn(() => sessionState.currentSenderAddress),
}));

vi.mock('../hooks/useBlockCheck', () => ({
    useBlockCheck: vi.fn(),
}));

vi.mock('../hooks/useBalance', () => ({
    useBalance: vi.fn(),
}));

vi.mock('../hooks/useSendTipWithDemo', () => ({
    useSendTipWithDemo: (...args) => mockUseSendTipWithDemo(...args),
}));

vi.mock('../hooks/useStxPrice', () => ({
    useStxPrice: vi.fn(),
}));

vi.mock('../context/DemoContext', () => ({
    useDemoMode: vi.fn(),
}));

vi.mock('../context/TipContext', () => ({
    useTipContext: vi.fn(),
}));

vi.mock('../lib/analytics', () => ({
    analytics: mockAnalytics,
}));

vi.mock('../utils/stacks', () => ({
    network: { id: 'testnet' },
    appDetails: { name: 'TipStream' },
}));

describe('wallet session refresh', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionState.currentSenderAddress = 'SP1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
        vi.mocked(blockCheckHook.useBlockCheck).mockReturnValue({
            blocked: false,
            checking: false,
            checkBlocked: vi.fn(),
            reset: vi.fn(),
        });
        vi.mocked(balanceHook.useBalance).mockReturnValue({
            balance: '1000000000',
            balanceStx: 1000,
            loading: false,
            refetch: vi.fn(),
        });
        vi.mocked(stxPriceHook.useStxPrice).mockReturnValue({
            toUsd: vi.fn().mockReturnValue('50.00'),
        });
        vi.mocked(demoModeHook.useDemoMode).mockReturnValue({
            demoEnabled: false,
            getDemoData: vi.fn(() => ({ mockWalletAddress: sessionState.currentSenderAddress })),
            toggleDemo: vi.fn(),
        });
        vi.mocked(tipContextHook.useTipContext).mockReturnValue({
            notifyTipSent: mockNotifyTipSent,
        });
        mockUseSendTipWithDemo.mockReturnValue({
            displayBalance: '1000000000',
            sendTipInDemo: vi.fn(),
            pendingTransaction: null,
        });
    });

    afterEach(() => {
        mockOpenContractCall.mockReset();
    });

    it('updates SendTip sender validation when the session changes', async () => {
        const { rerender } = render(<SendTip addToast={vi.fn()} />);

        fireEvent.change(screen.getByPlaceholderText('SP2...'), {
            target: { value: sessionState.currentSenderAddress },
        });
        await waitFor(() => {
            expect(screen.getByText('You cannot send a tip to yourself')).toBeInTheDocument();
        });

        sessionState.currentSenderAddress = 'SP2BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
        rerender(<SendTip addToast={vi.fn()} />);

        await waitFor(() => {
            expect(screen.queryByText('You cannot send a tip to yourself')).toBeNull();
        });
    });

    it('updates TokenTip sender validation when the session changes', async () => {
        const { rerender } = render(<TokenTip addToast={vi.fn()} />);

        fireEvent.change(screen.getByPlaceholderText('SP2...'), {
            target: { value: sessionState.currentSenderAddress },
        });
        await waitFor(() => {
            expect(screen.getByText('Cannot send a tip to yourself')).toBeInTheDocument();
        });

        sessionState.currentSenderAddress = 'SP3CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';
        rerender(<TokenTip addToast={vi.fn()} />);

        await waitFor(() => {
            expect(screen.queryByText('Cannot send a tip to yourself')).toBeNull();
        });
    });

    it('updates BatchTip sender validation when the session changes', async () => {
        const { rerender } = render(<BatchTip addToast={vi.fn()} />);

        fireEvent.change(screen.getByPlaceholderText('SP2... recipient address'), {
            target: { value: sessionState.currentSenderAddress },
        });
        await waitFor(() => {
            expect(screen.getByText('Cannot tip yourself')).toBeInTheDocument();
        });

        sessionState.currentSenderAddress = 'SP4DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD';
        rerender(<BatchTip addToast={vi.fn()} />);

        await waitFor(() => {
            expect(screen.queryByText('Cannot tip yourself')).toBeNull();
        });
    });
});
