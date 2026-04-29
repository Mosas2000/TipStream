/**
 * Custom error classes for pause state operations
 */

/**
 * Base error class for pause state operations
 */
export class PauseStateError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = 'PauseStateError';
        this.cause = cause;
    }
}

/**
 * Error thrown when the API call fails
 */
export class PauseStateAPIError extends PauseStateError {
    constructor(message, statusCode, cause) {
        super(message, cause);
        this.name = 'PauseStateAPIError';
        this.statusCode = statusCode;
    }
}

/**
 * Error thrown when the response cannot be parsed
 */
export class PauseStateParseError extends PauseStateError {
    constructor(message, rawResponse, cause) {
        super(message, cause);
        this.name = 'PauseStateParseError';
        this.rawResponse = rawResponse;
    }
}

/**
 * Error thrown when the contract function is not found
 */
export class PauseStateFunctionNotFoundError extends PauseStateError {
    constructor(functionName, cause) {
        super(`Contract function '${functionName}' not found. Ensure the contract is deployed and the function exists.`, cause);
        this.name = 'PauseStateFunctionNotFoundError';
        this.functionName = functionName;
    }
}

/**
 * Error thrown when the network is unreachable
 */
export class PauseStateNetworkError extends PauseStateError {
    constructor(message, cause) {
        super(message, cause);
        this.name = 'PauseStateNetworkError';
    }
}

/**
 * Classify an error from pause state operations
 * 
 * @param {Error} error - The error to classify
 * @returns {PauseStateError} Classified error
 */
export function classifyPauseStateError(error) {
    if (error instanceof PauseStateError) {
        return error;
    }

    const message = error.message || String(error);

    // Network errors
    if (error.name === 'TypeError' || message.includes('fetch') || message.includes('network')) {
        return new PauseStateNetworkError('Network error while fetching pause state', error);
    }

    // Function not found
    if (message.includes('not found') || message.includes('404')) {
        return new PauseStateFunctionNotFoundError('get-is-paused', error);
    }

    // Parse errors
    if (message.includes('parse') || message.includes('invalid')) {
        return new PauseStateParseError('Failed to parse pause state response', null, error);
    }

    // Generic API error
    return new PauseStateAPIError('Failed to fetch pause state', null, error);
}

/**
 * Get a user-friendly error message
 * 
 * @param {Error} error - The error to format
 * @returns {string} User-friendly error message
 */
export function formatPauseStateError(error) {
    const classified = classifyPauseStateError(error);

    switch (classified.name) {
        case 'PauseStateNetworkError':
            return 'Unable to connect to the Stacks network. Please check your internet connection and try again.';
        
        case 'PauseStateFunctionNotFoundError':
            return 'The pause state function is not available on this contract. The contract may need to be upgraded.';
        
        case 'PauseStateParseError':
            return 'Received an unexpected response from the contract. Please try again or contact support.';
        
        case 'PauseStateAPIError':
            if (classified.statusCode === 429) {
                return 'Too many requests. Please wait a moment and try again.';
            }
            if (classified.statusCode >= 500) {
                return 'The Stacks API is temporarily unavailable. Please try again later.';
            }
            return 'Failed to fetch pause state. Please try again.';
        
        default:
            return 'An unexpected error occurred while checking pause state.';
    }
}
