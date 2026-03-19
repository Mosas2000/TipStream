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
