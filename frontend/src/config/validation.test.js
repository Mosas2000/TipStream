import { describe, it, expect } from 'vitest';
import {
  ConfigValidationError,
  validateNetwork,
  validateAppUrl,
  validateContractAddress,
  validateContractName,
  validateStacksApiUrl
} from './validation.js';

describe('ConfigValidationError', () => {
  it('should create error with field and value', () => {
    const error = new ConfigValidationError('test message', 'TEST_FIELD', 'test-value');
    expect(error.message).toBe('test message');
    expect(error.field).toBe('TEST_FIELD');
    expect(error.value).toBe('test-value');
    expect(error.name).toBe('ConfigValidationError');
  });
});

describe('validateNetwork', () => {
  it('should validate mainnet', () => {
    expect(validateNetwork('mainnet')).toBe('mainnet');
  });

  it('should validate testnet', () => {
    expect(validateNetwork('testnet')).toBe('testnet');
  });

  it('should validate devnet', () => {
    expect(validateNetwork('devnet')).toBe('devnet');
  });

  it('should throw on undefined network', () => {
    expect(() => validateNetwork(undefined)).toThrow(ConfigValidationError);
  });

  it('should throw on empty network', () => {
    expect(() => validateNetwork('')).toThrow(ConfigValidationError);
  });

  it('should throw on invalid network', () => {
    expect(() => validateNetwork('invalid')).toThrow(ConfigValidationError);
  });
});

describe('validateAppUrl', () => {
  it('should validate https URL', () => {
    const url = 'https://example.com';
    expect(validateAppUrl(url)).toBe(url);
  });

  it('should validate http URL', () => {
    const url = 'http://localhost:5173';
    expect(validateAppUrl(url)).toBe(url);
  });

  it('should throw on undefined URL', () => {
    expect(() => validateAppUrl(undefined)).toThrow(ConfigValidationError);
  });

  it('should throw on empty URL', () => {
    expect(() => validateAppUrl('')).toThrow(ConfigValidationError);
  });

  it('should throw on invalid URL', () => {
    expect(() => validateAppUrl('not-a-url')).toThrow(ConfigValidationError);
  });

  it('should throw on invalid protocol', () => {
    expect(() => validateAppUrl('ftp://example.com')).toThrow(ConfigValidationError);
  });
});

describe('validateContractAddress', () => {
  it('should validate mainnet address', () => {
    const address = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';
    expect(validateContractAddress(address)).toBe(address);
  });

  it('should validate testnet address', () => {
    const address = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    expect(validateContractAddress(address)).toBe(address);
  });

  it('should throw on undefined address', () => {
    expect(() => validateContractAddress(undefined)).toThrow(ConfigValidationError);
  });

  it('should throw on empty address', () => {
    expect(() => validateContractAddress('')).toThrow(ConfigValidationError);
  });

  it('should throw on invalid format', () => {
    expect(() => validateContractAddress('invalid-address')).toThrow(ConfigValidationError);
  });

  it('should throw on wrong prefix', () => {
    expect(() => validateContractAddress('XX1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM')).toThrow(ConfigValidationError);
  });
});

describe('validateContractName', () => {
  it('should validate lowercase name', () => {
    const name = 'tipstream';
    expect(validateContractName(name)).toBe(name);
  });

  it('should validate name with hyphens', () => {
    const name = 'tip-stream';
    expect(validateContractName(name)).toBe(name);
  });

  it('should validate name with numbers', () => {
    const name = 'tipstream2';
    expect(validateContractName(name)).toBe(name);
  });

  it('should throw on undefined name', () => {
    expect(() => validateContractName(undefined)).toThrow(ConfigValidationError);
  });

  it('should throw on empty name', () => {
    expect(() => validateContractName('')).toThrow(ConfigValidationError);
  });

  it('should throw on uppercase letters', () => {
    expect(() => validateContractName('TipStream')).toThrow(ConfigValidationError);
  });

  it('should throw on name starting with number', () => {
    expect(() => validateContractName('2tipstream')).toThrow(ConfigValidationError);
  });

  it('should throw on name starting with hyphen', () => {
    expect(() => validateContractName('-tipstream')).toThrow(ConfigValidationError);
  });
});

describe('validateStacksApiUrl', () => {
  it('should validate mainnet API URL', () => {
    const url = 'https://api.hiro.so';
    expect(validateStacksApiUrl(url, 'mainnet')).toBe(url);
  });

  it('should validate testnet API URL', () => {
    const url = 'https://api.testnet.hiro.so';
    expect(validateStacksApiUrl(url, 'testnet')).toBe(url);
  });

  it('should validate devnet API URL', () => {
    const url = 'http://localhost:3999';
    expect(validateStacksApiUrl(url, 'devnet')).toBe(url);
  });

  it('should throw on undefined URL', () => {
    expect(() => validateStacksApiUrl(undefined, 'mainnet')).toThrow(ConfigValidationError);
  });

  it('should throw on invalid URL', () => {
    expect(() => validateStacksApiUrl('not-a-url', 'mainnet')).toThrow(ConfigValidationError);
  });

  it('should throw on invalid protocol', () => {
    expect(() => validateStacksApiUrl('ftp://api.hiro.so', 'mainnet')).toThrow(ConfigValidationError);
  });
});
