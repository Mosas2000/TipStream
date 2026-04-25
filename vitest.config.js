
/// <reference types="vitest" />

import { defineConfig } from "vitest/config";
import { vitestSetupFilePath, getClarinetVitestsArgv } from "@hirosystems/clarinet-sdk/vitest";

/*
  In this file, Vitest is configured so that it works seamlessly with Clarinet and the Simnet.

  The `vitest-environment-clarinet` will initialise the clarinet-sdk
  and make the `simnet` object available globally in the test files.

  `vitestSetupFilePath` points to a file in the `@hirosystems/clarinet-sdk` package that does two things:
    - run `before` hooks to initialize the simnet and `after` hooks to collect costs and coverage reports.
    - load custom vitest matchers to work with Clarity values (such as `expect(...).toBeUint()`)

  The `getClarinetVitestsArgv()` will parse options passed to the command `vitest run --`
    - vitest run -- --manifest ./Clarinet.toml  # pass a custom path
    - vitest run -- --coverage --costs          # collect coverage and cost reports
*/

// Centralized pool configuration to maximize worker stability.
// Using 'forks' instead of 'threads' prevents native module isolation issues 
// that can lead to 'onTaskUpdate' timeouts during long-running contract tests.
const POOL_CONFIG = {
  pool: "forks",
  poolOptions: {
    forks: {
      singleFork: true, // Forces sequential execution to avoid simnet race conditions
      isolate: false,   // Prevents worker re-initialization overhead
    },
  },
  maxWorkers: 1,
  workerIdleTimeout: 60000,
};

// Generous timeout thresholds for heavy Clarity contract simulations.
const TIMEOUT_CONFIG = {
  teardownTimeout: 60000,
  testTimeout: 120000,
};

/**
 * Filters out high-volume contract print events from the console output.
 * Reducing stdout volume significantly improves IPC stability between 
 * the worker and the Vitest reporter.
 */
function isContractEvent(log) {
  if (!log) return false;
  const trimmedLog = log.trim();
  // Match Clarinet's standard print event output format
  return (
    trimmedLog.startsWith('{') && 
    trimmedLog.includes('event: "') && 
    trimmedLog.includes(' (tipstream')
  );
}

export default defineConfig({
  test: {
    ...POOL_CONFIG,
    ...TIMEOUT_CONFIG,
    include: ["tests/**/*.test.ts"],
    reporters: ['default'],
    passWithNoTests: true,
    globals: true,
    retry: 1, // Add resilience against transient worker communication failures
    diff: {
      truncateThreshold: 0, // Show full diffs for complex contract responses
    },
    sequence: {
      forceTracing: true, // Improves stack traces on worker hangs
      shuffle: false,    // Maintain consistent execution order
    },
    environment: "clarinet",
    setupFiles: [
      vitestSetupFilePath,
    ],
    environmentOptions: {
      clarinet: {
        ...getClarinetVitestsArgv(),
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.test.ts',
        'vitest.config.js',
      ],
    },
    onConsoleLog(log) {
      if (process.env.VERBOSE === 'true') return true;
      if (isContractEvent(log)) return false;
    },
  },
});
