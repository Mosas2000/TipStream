import { useEffect, useRef, useCallback } from 'react';

export default function ConfirmDialog({ open, title, children, onConfirm, onCancel, confirmLabel = 'Confirm', cancelLabel = 'Cancel' }) {
    const dialogRef = useRef(null);
    const previousFocusRef = useRef(null);

    const getFocusableElements = useCallback(() => {
        const dialog = dialogRef.current;
        if (!dialog) return [];

        return Array.from(
            dialog.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            ),
        ).filter((el) => {
            if (!el || typeof el.focus !== 'function') return false;
            if (el.hasAttribute('disabled')) return false;
            if (el.getAttribute('aria-hidden') === 'true') return false;
            return true;
        });
    }, []);

    useEffect(() => {
        if (open) {
            previousFocusRef.current = document.activeElement;
            const timer = window.setTimeout(() => {
                const focusable = getFocusableElements();
                if (focusable.length > 0) {
                    focusable[0].focus();
                    return;
                }
                dialogRef.current?.focus();
            }, 0);

            return () => {
                window.clearTimeout(timer);
            };
        } else if (previousFocusRef.current) {
            previousFocusRef.current.focus();
            previousFocusRef.current = null;
        }
        return undefined;
    }, [getFocusableElements, open]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onCancel();
            return;
        }

        if (e.key === 'Tab') {
            const dialog = dialogRef.current;
            if (!dialog) return;

            const focusable = getFocusableElements();
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (!active || !dialog.contains(active)) {
                e.preventDefault();
                first.focus();
                return;
            }

            if (e.shiftKey) {
                if (active === first || active === dialog) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (active === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }
    }, [getFocusableElements, onCancel]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
            <div
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-description"
                onKeyDown={handleKeyDown}
                className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95"
            >
                <h3 id="confirm-dialog-title" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">{title}</h3>
                <div id="confirm-dialog-description" className="text-sm text-gray-600 dark:text-gray-400 mb-6">{children}</div>
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-amber-500 dark:text-black hover:bg-black dark:hover:bg-amber-400 rounded-lg transition-colors"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
