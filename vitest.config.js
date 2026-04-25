
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
      singleFork: true,
      isolate: false,
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

export default defineConfig({
  test: {
    ...POOL_CONFIG,
    ...TIMEOUT_CONFIG,
    include: ["tests/**/*.test.ts"],
      vitestSetupFilePath,
      // custom setup files can be added here
    ],
    environmentOptions: {
      clarinet: {
        ...getClarinetVitestsArgv(),
        // add or override options
      },
    },
    onConsoleLog(log) {
      // Suppress noisy Clarinet print events to reduce IPC overhead during contract simulations.
      // These events typically contain Clarity maps and function origins.
      if (/\{.*event: ".*" \}/.test(log) && log.includes(' (tipstream')) return false;
    },
  },
});
