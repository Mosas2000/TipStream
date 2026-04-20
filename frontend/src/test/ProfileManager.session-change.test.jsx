import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ProfileManager from '../components/ProfileManager';
import * as senderHook from '../hooks/useSenderAddress';
import * as transactions from '@stacks/transactions';

let currentSenderAddress = 'SP1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

vi.mock('../hooks/useSenderAddress', () => ({
    useSenderAddress: vi.fn(() => currentSenderAddress),
}));

vi.mock('@stacks/connect', () => ({
    openContractCall: vi.fn(),
}));

vi.mock('@stacks/transactions', () => ({
    fetchCallReadOnlyFunction: vi.fn(),
    cvToJSON: vi.fn(),
    principalCV: vi.fn((value) => value),
    stringUtf8CV: vi.fn((value) => value),
    PostConditionMode: { Deny: 'deny' },
}));

vi.mock('../utils/stacks', () => ({
    network: { id: 'testnet' },
    appDetails: { name: 'TipStream' },
}));

describe('ProfileManager session changes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        currentSenderAddress = 'SP1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    });

    it('refetches the profile for the active sender address', async () => {
        const profileBySender = new Map([
            [
                'SP1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                {
                    value: {
                        'display-name': { value: 'Alice' },
                        bio: { value: 'First profile' },
                        'avatar-url': { value: 'https://example.com/a.png' },
                    },
                },
            ],
            [
                'SP2BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
                {
                    value: {
                        'display-name': { value: 'Bob' },
                        bio: { value: 'Second profile' },
                        'avatar-url': { value: 'https://example.com/b.png' },
                    },
                },
            ],
        ]);

        vi.mocked(transactions.fetchCallReadOnlyFunction).mockImplementation(async ({ senderAddress }) => ({
            senderAddress,
        }));
        vi.mocked(transactions.cvToJSON).mockImplementation((result) => profileBySender.get(result.senderAddress) || { value: null });

        const { rerender } = render(<ProfileManager addToast={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByTestId('profile-name-input')).toHaveValue('Alice');
        });

        currentSenderAddress = 'SP2BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
        rerender(<ProfileManager addToast={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByTestId('profile-name-input')).toHaveValue('Bob');
        });
    });
});
