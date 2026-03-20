const ALLOWED_NETWORKS = ['mainnet', 'testnet', 'devnet'];

export const NETWORK_DOCS = {
  mainnet: 'Production Stacks network',
  testnet: 'Testing network for development',
  devnet: 'Local development network'
};

export class ConfigValidationError extends Error {
  constructor(message, field, value) {
    super(message);
    this.name = 'ConfigValidationError';
    this.field = field;
    this.value = value;
  }
}

export function validateNetwork(network) {
  if (!network) {
    throw new ConfigValidationError(
      'VITE_NETWORK is not defined. Set it to mainnet, testnet, or devnet.',
      'VITE_NETWORK',
      network
    );
  }

  if (!ALLOWED_NETWORKS.includes(network)) {
    throw new ConfigValidationError(
      `Invalid VITE_NETWORK: "${network}". Must be one of: ${ALLOWED_NETWORKS.join(', ')}`,
      'VITE_NETWORK',
      network
    );
  }

  return network;
}

export function validateAppUrl(url) {
  if (!url) {
    throw new ConfigValidationError(
      'VITE_APP_URL is not defined. Set it to your application URL.',
      'VITE_APP_URL',
      url
    );
  }

  try {
    const parsed = new URL(url);
    if (!parsed.protocol.match(/^https?:$/)) {
      throw new ConfigValidationError(
        `VITE_APP_URL must use http or https protocol. Got: ${parsed.protocol}`,
        'VITE_APP_URL',
        url
      );
    }
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      throw err;
    }
    throw new ConfigValidationError(
      `VITE_APP_URL is not a valid URL: "${url}"`,
      'VITE_APP_URL',
      url
    );
  }

  return url;
}

export function validateContractAddress(address) {
  if (!address) {
    throw new ConfigValidationError(
      'CONTRACT_ADDRESS is not defined in contracts.js',
      'CONTRACT_ADDRESS',
      address
    );
  }

  if (typeof address !== 'string' || address.length === 0) {
    throw new ConfigValidationError(
      'CONTRACT_ADDRESS must be a non-empty string',
      'CONTRACT_ADDRESS',
      address
    );
  }

  const stacksAddressPattern = /^S[TPMN][0-9A-Z]{38,40}$/;
  if (!stacksAddressPattern.test(address)) {
    throw new ConfigValidationError(
      `CONTRACT_ADDRESS does not match Stacks address format: "${address}"`,
      'CONTRACT_ADDRESS',
      address
    );
  }

  return address;
}

export function validateContractName(name) {
  if (!name) {
    throw new ConfigValidationError(
      'CONTRACT_NAME is not defined in contracts.js',
      'CONTRACT_NAME',
      name
    );
  }

  if (typeof name !== 'string' || name.length === 0) {
    throw new ConfigValidationError(
      'CONTRACT_NAME must be a non-empty string',
      'CONTRACT_NAME',
      name
    );
  }

  const namePattern = /^[a-z][a-z0-9-]*$/;
  if (!namePattern.test(name)) {
    throw new ConfigValidationError(
      `CONTRACT_NAME must start with lowercase letter and contain only lowercase letters, numbers, and hyphens: "${name}"`,
      'CONTRACT_NAME',
      name
    );
  }

  return name;
}

export function validateStacksApiUrl(url, network) {
  if (!url) {
    throw new ConfigValidationError(
      'STACKS_API_BASE is not defined',
      'STACKS_API_BASE',
      url
    );
  }

  try {
    const parsed = new URL(url);
    if (!parsed.protocol.match(/^https?:$/)) {
      throw new ConfigValidationError(
        `STACKS_API_BASE must use http or https protocol. Got: ${parsed.protocol}`,
        'STACKS_API_BASE',
        url
      );
    }
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      throw err;
    }
    throw new ConfigValidationError(
      `STACKS_API_BASE is not a valid URL: "${url}"`,
      'STACKS_API_BASE',
      url
    );
  }

  if (network === 'mainnet' && !url.includes('api.hiro.so')) {
    console.warn(`Warning: STACKS_API_BASE for mainnet is "${url}" but typically should be "https://api.hiro.so"`);
  }

  if (network === 'testnet' && !url.includes('api.testnet.hiro.so')) {
    console.warn(`Warning: STACKS_API_BASE for testnet is "${url}" but typically should be "https://api.testnet.hiro.so"`);
  }

  return url;
}

export function validateEnvironmentConfig() {
  const errors = [];
  const warnings = [];

  try {
    const network = import.meta.env.VITE_NETWORK || 'mainnet';
    validateNetwork(network);
  } catch (err) {
    errors.push(err);
  }

  try {
    const appUrl = import.meta.env.VITE_APP_URL;
    if (appUrl) {
      validateAppUrl(appUrl);
    } else {
      warnings.push('VITE_APP_URL is not set. Canonical URLs and social sharing may not work correctly.');
    }
  } catch (err) {
    errors.push(err);
  }

  return { errors, warnings };
}

export function getAllowedNetworks() {
  return [...ALLOWED_NETWORKS];
}
