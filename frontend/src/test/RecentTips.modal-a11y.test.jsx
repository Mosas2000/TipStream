import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RecentTips from '../components/RecentTips';
import { useTipContext } from '../context/TipContext';

const { isUserSignedIn } = vi.hoisted(() => ({
    isUserSignedIn: vi.fn(() => true),
}));

vi.mock('../context/TipContext', () => ({
    useTipContext: vi.fn(),
}));

vi.mock('../lib/fetchTipDetails', () => ({
    fetchTipMessages: vi.fn(() => Promise.resolve(new Map())),
    clearTipCache: vi.fn(),
}));

vi.mock('@stacks/connect', () => ({
    openContractCall: vi.fn(),
}));

vi.mock('../utils/stacks', () => ({
    network: {},
    appDetails: { name: 'TipStream', icon: 'http://localhost/logo.svg' },
    userSession: { isUserSignedIn, loadUserData: vi.fn(() => ({})) },
    getSenderAddress: vi.fn(() => 'SP1SENDER'),
}));

describe('RecentTips tip-back modal accessibility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isUserSignedIn.mockReturnValue(true);

        useTipContext.mockReturnValue({
            events: [
                {
                    event: 'tip-sent',
                    tipId: '1',
                    sender: 'SP1SENDER',
                    recipient: 'SP2RECIPIENT',
                    amount: '1000000',
                    fee: '50000',
                    timestamp: 1700000000,
                    txId: '0xabc',
                },
            ],
            eventsLoading: false,
            eventsError: null,
            eventsMeta: { total: 1, hasMore: false },
            lastEventRefresh: null,
            refreshEvents: vi.fn(),
            loadMoreEvents: vi.fn(),
        });
    });

    const openTipBackModal = async () => {
        render(<RecentTips addToast={vi.fn()} />);
        const trigger = await screen.findByRole('button', { name: 'Tip Back' });
        trigger.focus();
        fireEvent.click(trigger);

        await screen.findByTestId('tipback-modal');

        return trigger;
    };

    it('opens with dialog semantics and moves focus into the modal', async () => {
        await openTipBackModal();

        const dialog = screen.getByRole('dialog', { name: 'Tip Back' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'tipback-modal-title');

        await waitFor(() => {
            expect(screen.getByTestId('tipback-amount-input')).toHaveFocus();
        });
    });

    it('closes on Escape and restores focus to the trigger', async () => {
        const trigger = await openTipBackModal();

        const amountInput = screen.getByTestId('tipback-amount-input');
        fireEvent.keyDown(amountInput, { key: 'Escape' });

        await waitFor(() => {
            expect(screen.queryByTestId('tipback-modal')).not.toBeInTheDocument();
        });

        expect(trigger).toHaveFocus();
    });

    it('traps Tab focus inside the modal', async () => {
        await openTipBackModal();

        const amountInput = screen.getByTestId('tipback-amount-input');
        const sendButton = screen.getByTestId('tipback-send-btn');

        sendButton.focus();
        fireEvent.keyDown(sendButton, { key: 'Tab' });

        await waitFor(() => {
            expect(amountInput).toHaveFocus();
        });

        amountInput.focus();
        fireEvent.keyDown(amountInput, { key: 'Tab', shiftKey: true });

        await waitFor(() => {
            expect(sendButton).toHaveFocus();
        });
    });

    it('closes when clicking the backdrop', async () => {
        await openTipBackModal();

        fireEvent.click(screen.getByTestId('tipback-modal'));

        await waitFor(() => {
            expect(screen.queryByTestId('tipback-modal')).not.toBeInTheDocument();
        });
    });
});
