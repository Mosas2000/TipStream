const ALLOWED_NETWORKS = ['mainnet', 'testnet', 'devnet'];

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
