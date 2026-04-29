import { describe, it, expect } from 'vitest';
import {
    PauseStateError,
    PauseStateAPIError,
    PauseStateParseError,
    PauseStateFunctionNotFoundError,
    PauseStateNetworkError,
    classifyPauseStateError,
    formatPauseStateError
} from './pause-state-errors';

describe('Pause State Error Classes', () => {
    describe('PauseStateError', () => {
        it('creates base error with message and cause', () => {
            const cause = new Error('Original error');
            const error = new PauseStateError('Test error', cause);

            expect(error.message).toBe('Test error');
            expect(error.name).toBe('PauseStateError');
            expect(error.cause).toBe(cause);
        });
    });

    describe('PauseStateAPIError', () => {
        it('includes status code', () => {
            const error = new PauseStateAPIError('API failed', 500);

            expect(error.message).toBe('API failed');
            expect(error.name).toBe('PauseStateAPIError');
            expect(error.statusCode).toBe(500);
        });
    });

    describe('PauseStateParseError', () => {
        it('includes raw response', () => {
            const rawResponse = '0xINVALID';
            const error = new PauseStateParseError('Parse failed', rawResponse);

            expect(error.message).toBe('Parse failed');
            expect(error.name).toBe('PauseStateParseError');
            expect(error.rawResponse).toBe(rawResponse);
        });
    });

    describe('PauseStateFunctionNotFoundError', () => {
        it('includes function name in message', () => {
            const error = new PauseStateFunctionNotFoundError('get-is-paused');

            expect(error.message).toContain('get-is-paused');
            expect(error.name).toBe('PauseStateFunctionNotFoundError');
            expect(error.functionName).toBe('get-is-paused');
        });
    });

    describe('PauseStateNetworkError', () => {
        it('creates network error', () => {
            const error = new PauseStateNetworkError('Network failed');

            expect(error.message).toBe('Network failed');
            expect(error.name).toBe('PauseStateNetworkError');
        });
    });

    describe('classifyPauseStateError', () => {
        it('returns PauseStateError as-is', () => {
            const original = new PauseStateError('Test');
            const classified = classifyPauseStateError(original);

            expect(classified).toBe(original);
        });

        it('classifies TypeError as network error', () => {
            const error = new TypeError('fetch failed');
            const classified = classifyPauseStateError(error);

            expect(classified).toBeInstanceOf(PauseStateNetworkError);
        });

        it('classifies fetch errors as network error', () => {
            const error = new Error('Failed to fetch');
            const classified = classifyPauseStateError(error);

            expect(classified).toBeInstanceOf(PauseStateNetworkError);
        });

        it('classifies 404 as function not found', () => {
            const error = new Error('404 not found');
            const classified = classifyPauseStateError(error);

            expect(classified).toBeInstanceOf(PauseStateFunctionNotFoundError);
        });

        it('classifies parse errors', () => {
            const error = new Error('Failed to parse response');
            const classified = classifyPauseStateError(error);

            expect(classified).toBeInstanceOf(PauseStateParseError);
        });

        it('classifies unknown errors as API error', () => {
            const error = new Error('Unknown error');
            const classified = classifyPauseStateError(error);

            expect(classified).toBeInstanceOf(PauseStateAPIError);
        });
    });

    describe('formatPauseStateError', () => {
        it('formats network errors', () => {
            const error = new PauseStateNetworkError('Network failed');
            const message = formatPauseStateError(error);

            expect(message).toContain('internet connection');
        });

        it('formats function not found errors', () => {
            const error = new PauseStateFunctionNotFoundError('get-is-paused');
            const message = formatPauseStateError(error);

            expect(message).toContain('not available');
            expect(message).toContain('upgraded');
        });

        it('formats parse errors', () => {
            const error = new PauseStateParseError('Parse failed', '0xINVALID');
            const message = formatPauseStateError(error);

            expect(message).toContain('unexpected response');
        });

        it('formats 429 rate limit errors', () => {
            const error = new PauseStateAPIError('Rate limited', 429);
            const message = formatPauseStateError(error);

            expect(message).toContain('Too many requests');
        });

        it('formats 500 server errors', () => {
            const error = new PauseStateAPIError('Server error', 500);
            const message = formatPauseStateError(error);

            expect(message).toContain('temporarily unavailable');
        });

        it('formats generic API errors', () => {
            const error = new PauseStateAPIError('Generic error', 400);
            const message = formatPauseStateError(error);

            expect(message).toContain('Failed to fetch');
        });

        it('formats unknown errors', () => {
            const error = new Error('Unknown');
            const message = formatPauseStateError(error);

            expect(message).toContain('Failed to fetch');
        });
    });
});
