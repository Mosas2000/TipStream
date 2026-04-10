import { parseContractEventLenient } from './eventParser';

/**
 * Parse a Clarity contract event `repr` string into a structured object.
 * Used by TipHistory, RecentTips, Leaderboard, and useNotifications.
 *
 * NOTE: The contract's `send-tip` print event does NOT include the `message`
 * field.  The `message` property returned here will always be an empty string
 * for tip-sent events.  To display tip messages in the UI, use the
 * `fetchTipMessages` helper from `lib/fetchTipDetails.js` which calls the
 * contract's read-only `get-tip` function.
 */
export function parseTipEvent(repr) {
    try {
        const parsed = parseContractEventLenient(repr);
        
        if (!parsed) {
            return null;
        }

        return {
            event: parsed.event,
            sender: parsed.sender || '',
            recipient: parsed.recipient || '',
            amount: parsed.amount || '0',
            fee: parsed.fee || '0',
            message: parsed.message || '',
            tipId: parsed['tip-id'] || '0',
            category: parsed.category || null,
        };
    } catch {
        return null;
    }
}
