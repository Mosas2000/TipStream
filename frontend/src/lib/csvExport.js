import { formatSTX } from './utils';

const CATEGORY_LABELS = {
    0: 'General',
    1: 'Content Creation',
    2: 'Open Source',
    3: 'Community Help',
    4: 'Appreciation',
    5: 'Education',
    6: 'Bug Bounty',
};

function escapeCSVField(field) {
    if (field === null || field === undefined) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toISOString();
}

export function generateTipHistoryCSV(tips) {
    const headers = [
        'Transaction ID',
        'Direction',
        'Sender',
        'Recipient',
        'Amount (STX)',
        'Amount (microSTX)',
        'Message',
        'Category',
        'Timestamp',
        'Date',
    ];

    const rows = tips.map(tip => [
        escapeCSVField(tip.txId),
        escapeCSVField(tip.direction),
        escapeCSVField(tip.sender),
        escapeCSVField(tip.recipient),
        escapeCSVField(formatSTX(tip.amount, 6)),
        escapeCSVField(tip.amount),
        escapeCSVField(tip.message || ''),
        escapeCSVField(tip.category !== null ? CATEGORY_LABELS[tip.category] || tip.category : ''),
        escapeCSVField(tip.timestamp || ''),
        escapeCSVField(formatTimestamp(tip.timestamp)),
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
    ].join('\n');

    return csvContent;
}

export function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function filterTipsByDateRange(tips, startDate, endDate) {
    if (!startDate && !endDate) return tips;

    return tips.filter(tip => {
        if (!tip.timestamp) return false;
        const tipDate = new Date(tip.timestamp * 1000);
        
        if (startDate && tipDate < startDate) return false;
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            if (tipDate > endOfDay) return false;
        }
        
        return true;
    });
}
