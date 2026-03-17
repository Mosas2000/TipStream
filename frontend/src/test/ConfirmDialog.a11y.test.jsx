import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { useState } from 'react';
import ConfirmDialog from '../components/ui/confirm-dialog';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

function Wrapper() {
    const [open, setOpen] = useState(false);

    return (
        <div>
            <button type="button" onClick={() => setOpen(true)}>
                Open dialog
            </button>
            <ConfirmDialog
                open={open}
                title="Confirm Action"
                onCancel={() => setOpen(false)}
                onConfirm={() => setOpen(false)}
                confirmLabel="Confirm"
                cancelLabel="Cancel"
            >
                Are you sure?
            </ConfirmDialog>
        </div>
    );
}

describe('ConfirmDialog accessibility', () => {
    it('moves focus into the dialog on open', async () => {
        render(<Wrapper />);

        fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

        const dialog = screen.getByRole('dialog', { name: 'Confirm Action' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title');
        expect(dialog).toHaveAttribute('aria-describedby', 'confirm-dialog-description');

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
        });
    });

    it('traps Tab focus inside the dialog', async () => {
        render(<Wrapper />);

        fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

        const cancel = await screen.findByRole('button', { name: 'Cancel' });
        const confirm = screen.getByRole('button', { name: 'Confirm' });

        confirm.focus();
        fireEvent.keyDown(confirm, { key: 'Tab' });

        await waitFor(() => {
            expect(cancel).toHaveFocus();
        });

        cancel.focus();
        fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true });

        await waitFor(() => {
            expect(confirm).toHaveFocus();
        });
    });

    it('restores focus to the trigger when closing', async () => {
        render(<Wrapper />);

        const trigger = screen.getByRole('button', { name: 'Open dialog' });
        trigger.focus();
        fireEvent.click(trigger);

        const cancel = await screen.findByRole('button', { name: 'Cancel' });
        fireEvent.click(cancel);

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        expect(trigger).toHaveFocus();
    });
});
