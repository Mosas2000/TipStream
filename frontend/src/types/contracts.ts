export interface TipEvent {
    event: string;
    sender: string;
    recipient: string;
    amount: string;
    fee: string;
    message: string;
    tipId: string;
}

export interface UserStats {
    totalSent: number;
    totalReceived: number;
    tipsSentCount: number;
    tipsReceivedCount: number;
}

export interface PlatformStats {
    totalTips: number;
    totalVolume: number;
    totalFees: number;
}

export interface UserProfile {
    displayName: string;
    bio: string;
}

export interface ContractCallArgs {
    contractAddress: string;
    contractName: string;
    functionName: string;
    functionArgs: unknown[];
}

export interface SendTipArgs {
    recipient: string;
    amount: number;
    message: string;
}

export interface PendingTransaction {
    txId: string;
    recipient: string;
    amount: number;
}

export type TransactionStatus = 'pending' | 'success' | 'abort_by_response' | 'abort_by_post_condition';

export interface TransactionResult {
    tx_id: string;
    tx_status: TransactionStatus;
    tx_type: string;
    block_height?: number;
}

export interface BalanceResponse {
    balance: string;
    total_sent: string;
    total_received: string;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
}
