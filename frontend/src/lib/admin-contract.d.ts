/**
 * Type definitions for admin contract helpers
 */

/**
 * Pause state response from the contract
 */
export interface PauseState {
    /** Current pause state: true if paused, false if running */
    isPaused: boolean;
    /** Pending pause proposal value, or null if no proposal */
    pendingPause: boolean | null;
    /** Block height when pending proposal becomes executable */
    effectiveHeight: number;
}

/**
 * Fee state response from the contract
 */
export interface FeeState {
    /** Current fee in basis points (1 basis point = 0.01%) */
    currentFeeBasisPoints: number;
    /** Pending fee proposal value, or null if no proposal */
    pendingFee: number | null;
    /** Block height when pending proposal becomes executable */
    effectiveHeight: number;
}

/**
 * Fetch the current block height from the Stacks API
 */
export function fetchCurrentBlockHeight(): Promise<number>;

/**
 * Fetch the current contract pause state and any pending changes
 */
export function fetchPauseState(): Promise<PauseState>;

/**
 * Fetch the current fee basis points and any pending fee change
 */
export function fetchFeeState(): Promise<FeeState>;

/**
 * Fetch the contract owner address
 */
export function fetchContractOwner(): Promise<string>;

/**
 * Fetch the authorized multisig contract address
 */
export function fetchMultisig(): Promise<string | null>;

/**
 * Fetch the current fee basis points from the contract
 */
export function fetchCurrentFee(): Promise<number>;

/**
 * Parse a hex-encoded Clarity value into a JavaScript value
 */
export function parseClarityValue(hex: string): any;
