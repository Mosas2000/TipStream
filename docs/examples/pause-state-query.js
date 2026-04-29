/**
 * Example: Query Contract Pause State
 * 
 * This example demonstrates how to query the pause state
 * of the TipStream contract using the get-is-paused function.
 */

import { CONTRACT_ADDRESS, CONTRACT_NAME, STACKS_API_BASE } from '../config/contracts';

/**
 * Query the current pause state of the contract
 * 
 * @returns {Promise<boolean>} true if paused, false if running
 */
async function queryPauseState() {
    const url = `${STACKS_API_BASE}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-is-paused`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sender: CONTRACT_ADDRESS,
            arguments: [],
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to query pause state: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Parse the Clarity response
    // 0x0703 = (ok true) - paused
    // 0x0704 = (ok false) - running
    const hex = data.result;
    
    if (hex === '0x0703') {
        return true;
    } else if (hex === '0x0704') {
        return false;
    }
    
    throw new Error(`Unexpected response format: ${hex}`);
}

// Example usage
async function main() {
    try {
        const isPaused = await queryPauseState();
        
        if (isPaused) {
            console.log('⚠️  Contract is currently PAUSED');
            console.log('   Tip operations are temporarily disabled');
        } else {
            console.log('✅ Contract is RUNNING');
            console.log('   All operations are available');
        }
    } catch (error) {
        console.error('Error querying pause state:', error.message);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { queryPauseState };
