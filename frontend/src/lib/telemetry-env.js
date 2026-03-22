const ENV_KEY = 'tipstream_telemetry_env';

export const TelemetryEnvironment = {
  LOCAL: 'local',
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
};

function detectEnvironment() {
  if (typeof window === 'undefined') {
    return TelemetryEnvironment.LOCAL;
  }

  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return TelemetryEnvironment.LOCAL;
  }

  if (hostname.includes('staging') || hostname.includes('preview')) {
    return TelemetryEnvironment.STAGING;
  }

  if (import.meta.env.DEV) {
    return TelemetryEnvironment.DEVELOPMENT;
  }

  return TelemetryEnvironment.PRODUCTION;
}

let cachedEnvironment = null;

export function getEnvironment() {
  if (cachedEnvironment === null) {
    cachedEnvironment = detectEnvironment();
  }
  return cachedEnvironment;
}

export function isProduction() {
  return getEnvironment() === TelemetryEnvironment.PRODUCTION;
}

export function isLocal() {
  return getEnvironment() === TelemetryEnvironment.LOCAL;
}

export function isDevelopment() {
  const env = getEnvironment();
  return env === TelemetryEnvironment.DEVELOPMENT || env === TelemetryEnvironment.LOCAL;
}

export function getEnvironmentLabel() {
  const env = getEnvironment();
  switch (env) {
    case TelemetryEnvironment.PRODUCTION:
      return 'Production';
    case TelemetryEnvironment.STAGING:
      return 'Staging';
    case TelemetryEnvironment.DEVELOPMENT:
      return 'Development';
    case TelemetryEnvironment.LOCAL:
    default:
      return 'Local';
  }
}

export function getEnvironmentColor() {
  const env = getEnvironment();
  switch (env) {
    case TelemetryEnvironment.PRODUCTION:
      return 'green';
    case TelemetryEnvironment.STAGING:
      return 'amber';
    case TelemetryEnvironment.DEVELOPMENT:
      return 'blue';
    case TelemetryEnvironment.LOCAL:
    default:
      return 'gray';
  }
}

export function resetEnvironmentCache() {
  cachedEnvironment = null;
}
