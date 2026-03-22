import { configureSink } from '../lib/telemetry-sink';
import { isProduction } from '../lib/telemetry-env';

export const TELEMETRY_CONFIG = {
  sinkEndpoint: import.meta.env.VITE_TELEMETRY_ENDPOINT || null,
  sinkApiKey: import.meta.env.VITE_TELEMETRY_API_KEY || null,
  sinkEnabled: import.meta.env.VITE_TELEMETRY_ENABLED === 'true',
  batchSize: 10,
  flushIntervalMs: 30000,
  retryAttempts: 3,
  retryDelayMs: 1000,
};

export function initializeTelemetrySink() {
  const { sinkEndpoint, sinkApiKey, sinkEnabled, ...rest } = TELEMETRY_CONFIG;

  if (sinkEnabled && sinkEndpoint) {
    configureSink({
      enabled: true,
      endpoint: sinkEndpoint,
      apiKey: sinkApiKey,
      ...rest,
    });

    if (!isProduction()) {
      console.log('[Telemetry] Sink configured:', sinkEndpoint);
    }

    return true;
  }

  return false;
}

export function getTelemetryConfig() {
  return {
    ...TELEMETRY_CONFIG,
    isProduction: isProduction(),
  };
}
