/**
 * Parse a Clarity contract event `repr` string into a structured object.
 * Used by TipHistory, RecentTips, Leaderboard, and useNotifications.
 */
export function parseTipEvent(repr) {
    try {
        const eventMatch = repr.match(/event\s+u?"([^"]+)"/);
        if (!eventMatch) return null;

        const senderMatch = repr.match(/sender\s+'([A-Z0-9]+)/i);
        const recipientMatch = repr.match(/recipient\s+'([A-Z0-9]+)/i);
        const amountMatch = repr.match(/amount\s+u(\d+)/);
        const feeMatch = repr.match(/fee\s+u(\d+)/);
        const messageMatch = repr.match(/message\s+u"([^"]*)"/);
        const tipIdMatch = repr.match(/tip-id\s+u(\d+)/);
        const categoryMatch = repr.match(/category\s+u(\d+)/);

        return {
            event: eventMatch[1],
            sender: senderMatch ? senderMatch[1] : '',
            recipient: recipientMatch ? recipientMatch[1] : '',
            amount: amountMatch ? amountMatch[1] : '0',
            fee: feeMatch ? feeMatch[1] : '0',
            message: messageMatch ? messageMatch[1] : '',
            tipId: tipIdMatch ? tipIdMatch[1] : '0',
            category: categoryMatch ? categoryMatch[1] : null,
        };
    } catch {
        return null;
    }
}
