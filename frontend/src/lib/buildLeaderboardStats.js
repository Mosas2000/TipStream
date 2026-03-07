/**
 * Build per-address statistics from an array of parsed tip events.
 *
 * Each tip event contributes to both the sender's "sent" totals and the
 * recipient's "received" totals.  The result is a flat array of user stat
 * objects suitable for sorting and rendering in the Leaderboard component.
 *
 * @param {Array<Object>} tipEvents - Parsed tip-sent events (from parseTipEvent).
 * @returns {Array<Object>} Array of user stat objects with address, totals, and counts.
 */
export function buildLeaderboardStats(tipEvents) {
    const userStats = {};

    tipEvents.forEach(tip => {
        const sender = tip.sender;
        const recipient = tip.recipient;
        const amount = parseInt(tip.amount, 10);

        if (!userStats[sender]) {
            userStats[sender] = { address: sender, totalSent: 0, tipsSent: 0, totalReceived: 0, tipsReceived: 0 };
        }
        userStats[sender].totalSent += amount;
        userStats[sender].tipsSent += 1;

        if (!userStats[recipient]) {
            userStats[recipient] = { address: recipient, totalSent: 0, tipsSent: 0, totalReceived: 0, tipsReceived: 0 };
        }
        userStats[recipient].totalReceived += amount;
        userStats[recipient].tipsReceived += 1;
    });

    return Object.values(userStats);
}
