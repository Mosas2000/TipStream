/**
 * Example: Monitor Contract Pause State Changes
 * 
 * This example demonstrates how to monitor the pause state
 * and detect when it changes.
 */

import { queryPauseState } from './pause-state-query.js';

class PauseStateMonitor {
    constructor(pollIntervalMs = 10000) {
        this.pollIntervalMs = pollIntervalMs;
        this.currentState = null;
        this.listeners = [];
        this.intervalId = null;
    }

    /**
     * Register a callback to be notified of state changes
     * 
     * @param {Function} callback - Called with (newState, oldState)
     */
    onChange(callback) {
        this.listeners.push(callback);
    }

    /**
     * Start monitoring the pause state
     */
    async start() {
        // Get initial state
        this.currentState = await queryPauseState();
        console.log(`Initial pause state: ${this.currentState ? 'PAUSED' : 'RUNNING'}`);

        // Poll for changes
        this.intervalId = setInterval(async () => {
            try {
                const newState = await queryPauseState();
                
                if (newState !== this.currentState) {
                    const oldState = this.currentState;
                    this.currentState = newState;
                    
                    console.log(`Pause state changed: ${oldState ? 'PAUSED' : 'RUNNING'} → ${newState ? 'PAUSED' : 'RUNNING'}`);
                    
                    // Notify listeners
                    this.listeners.forEach(listener => {
                        try {
                            listener(newState, oldState);
                        } catch (error) {
                            console.error('Error in pause state listener:', error);
                        }
                    });
                }
            } catch (error) {
                console.error('Error polling pause state:', error.message);
            }
        }, this.pollIntervalMs);
    }

    /**
     * Stop monitoring
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('Stopped monitoring pause state');
        }
    }

    /**
     * Get the current known state
     * 
     * @returns {boolean|null} Current pause state or null if unknown
     */
    getState() {
        return this.currentState;
    }
}

// Example usage
async function main() {
    const monitor = new PauseStateMonitor(5000); // Poll every 5 seconds

    // Register a listener
    monitor.onChange((newState, oldState) => {
        if (newState) {
            console.log('⚠️  Contract has been PAUSED');
            console.log('   Action: Disable tip submission UI');
        } else {
            console.log('✅ Contract has been UNPAUSED');
            console.log('   Action: Re-enable tip submission UI');
        }
    });

    // Start monitoring
    await monitor.start();

    // Keep running (in a real app, you'd stop when appropriate)
    console.log('Monitoring pause state... Press Ctrl+C to stop');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        monitor.stop();
        process.exit(0);
    });
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { PauseStateMonitor };
