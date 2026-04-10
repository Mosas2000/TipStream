/**
 * Graceful shutdown handler for the chainhook service.
 * 
 * Ensures pending operations complete before termination and provides
 * clean shutdown of HTTP server and resources.
 */

/**
 * Set up graceful shutdown handlers for SIGTERM and SIGINT signals.
 * Allows in-flight requests to complete before closing the server.
 * 
 * @param {import('node:http').Server} server - HTTP server instance
 * @param {Function} onShutdown - Optional callback when shutdown starts
 */
export function setupGracefulShutdown(server, onShutdown) {
  let isShuttingDown = false;

  const shutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\nReceived ${signal}, starting graceful shutdown...`);

    if (onShutdown) {
      try {
        await onShutdown();
      } catch (error) {
        console.error('Error during shutdown callback:', error);
      }
    }

    server.close(() => {
      console.log('Server closed, exiting process');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Forced shutdown after 30 seconds of waiting');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Check if the service is shutting down.
 * Useful for blocking new requests during shutdown.
 * 
 * @returns {boolean} True if shutdown is in progress
 */
export function isShuttingDown() {
  return process.exitCode !== undefined;
}
